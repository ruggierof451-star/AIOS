# AIOS — Web (Next.js)
# Stessa struttura multi-stage dei servizi backend. Il contesto di build
# è la RADICE del repository: pnpm-workspace.yaml e il lockfile stanno lì,
# e senza di essi l'installazione non è riproducibile.

FROM node:20-alpine AS base

WORKDIR /repo

# ── OpenSSL: Prisma non parte senza ────────────────────────────────────
# Le immagini node:*-alpine recenti non includono più `openssl`. Senza,
# Prisma non riesce a rilevare la versione di libssl, ripiega su
# "openssl-1.1.x" (che su Alpine 3.17+ non esiste) e il motore risponde
# con testo d'errore invece che con JSON:
#     Prisma failed to detect the libssl/openssl version
#     Error: Could not parse schema engine response: SyntaxError...
# Serve in TUTTI gli stage che eseguono Prisma: in build per
# `prisma generate`, nel runtime per `prisma migrate deploy` — e devono
# concordare, altrimenti il client viene generato per un target e il
# deploy ne pretende un altro.
# libc6-compat colma le differenze fra musl e glibc su cui i motori
# precompilati contano.
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable

# ---------- Stage: dipendenze ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./

# Il `postinstall` della radice viene eseguito da `pnpm install`: il suo file
# deve esistere PRIMA, altrimenti l'installazione si interrompe con
# "Cannot find module '/repo/scripts/postinstall.js'".
# Si copia il solo file, non l'intera cartella scripts/: è piccolo e cambia
# di rado, quindi il livello di cache resta stabile.
COPY scripts/postinstall.js scripts/
# Dentro l'immagine il postinstall non deve fare nulla: non vogliamo un .env
# di sviluppo cotto dentro, e il client Prisma viene generato più sotto dallo
# stage di build, quando lo schema è davvero presente.
# `pnpm install` resta SENZA --ignore-scripts: bcrypt è un modulo nativo e ha
# bisogno del proprio script di installazione per compilare il binding.
ENV AIOS_SKIP_POSTINSTALL=1
COPY apps/web/package.json apps/web/
RUN pnpm install

# ---------- Stage: build ----------
FROM deps AS build
COPY apps/web apps/web
# AIOS_GATEWAY_URL viene letta da next.config.mjs al momento della build:
# se manca, il proxy ricade su localhost e in produzione ogni chiamata
# risponde 404. Railway la passa come variabile di build.
ARG AIOS_GATEWAY_URL
ENV AIOS_GATEWAY_URL=$AIOS_GATEWAY_URL
RUN pnpm --filter @aios/web run build

# ---------- Stage: runtime ----------
FROM node:20-alpine AS runtime

# ── OpenSSL: Prisma non parte senza ────────────────────────────────────
# Le immagini node:*-alpine recenti non includono più `openssl`. Senza,
# Prisma non riesce a rilevare la versione di libssl, ripiega su
# "openssl-1.1.x" (che su Alpine 3.17+ non esiste) e il motore risponde
# con testo d'errore invece che con JSON:
#     Prisma failed to detect the libssl/openssl version
#     Error: Could not parse schema engine response: SyntaxError...
# Serve in TUTTI gli stage che eseguono Prisma: in build per
# `prisma generate`, nel runtime per `prisma migrate deploy` — e devono
# concordare, altrimenti il client viene generato per un target e il
# deploy ne pretende un altro.
# libc6-compat colma le differenze fra musl e glibc su cui i motori
# precompilati contano.
RUN apk add --no-cache openssl libc6-compat

# La cartella di lavoro resta DENTRO il workspace: i symlink di pnpm sono
# relativi, quindi la posizione conta quanto il contenuto.
WORKDIR /repo/apps/web
ENV NODE_ENV=production

# ── Perché si conserva l'intero albero del workspace ──────────────────
# pnpm non mette una copia delle dipendenze dentro ogni package: crea
# symlink RELATIVI verso il negozio virtuale in /repo/node_modules/.pnpm.
# Copiando solo <servizio>/node_modules si portano via i symlink ma non
# ciò a cui puntano, e il processo muore al primo require:
#     Error: Cannot find module 'reflect-metadata'
# Lo stesso vale per il client Prisma generato, che vive nel negozio.
# Copiare /repo per intero conserva la disposizione esatta con cui la
# build è riuscita: ciò che funzionava nello stage precedente funziona
# qui, per costruzione.
# Costo accettato: l'immagine contiene anche le dipendenze di sviluppo.
# È una scelta di affidabilità sopra la dimensione — la potatura delle
# dev-dependencies è un'ottimizzazione successiva, da fare quando il
# deploy è verde e si può misurare l'effetto.
COPY --from=build /repo /repo

EXPOSE 3100
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0"]
