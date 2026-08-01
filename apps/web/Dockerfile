# AIOS — Web (Next.js)
# Stessa struttura multi-stage dei servizi backend. Il contesto di build
# è la RADICE del repository: pnpm-workspace.yaml e il lockfile stanno lì,
# e senza di essi l'installazione non è riproducibile.

FROM node:20-alpine AS base
WORKDIR /repo
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
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /repo/apps/web/.next ./.next
COPY --from=build /repo/apps/web/public ./public
COPY --from=build /repo/apps/web/package.json ./package.json
COPY --from=build /repo/apps/web/next.config.mjs ./next.config.mjs
COPY --from=build /repo/apps/web/node_modules ./node_modules

EXPOSE 3100
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0"]
