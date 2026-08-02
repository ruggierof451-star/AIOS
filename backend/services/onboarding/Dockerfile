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
COPY packages/domain-model/package.json packages/domain-model/
COPY packages/api-contract/package.json packages/api-contract/
COPY packages/rbac/package.json packages/rbac/
COPY packages/eventing/package.json packages/eventing/
COPY backend/services/onboarding/package.json backend/services/onboarding/
RUN pnpm install

FROM deps AS build
COPY packages/domain-model packages/domain-model
COPY packages/api-contract packages/api-contract
COPY packages/rbac packages/rbac
COPY packages/eventing packages/eventing
COPY backend/services/onboarding backend/services/onboarding
COPY tsconfig.base.json ./
RUN pnpm --filter @aios/domain-model run generate
RUN pnpm --filter @aios/domain-model run build
RUN pnpm --filter @aios/api-contract run build
RUN pnpm --filter @aios/rbac run build
RUN pnpm --filter @aios/eventing run build
RUN pnpm --filter @aios/onboarding-service run build

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
WORKDIR /repo/backend/services/onboarding
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

EXPOSE 3005
CMD ["node", "dist/main.js"]
