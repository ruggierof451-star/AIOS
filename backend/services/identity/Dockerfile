# AIOS — Identity Service
# Build multi-stage: dipendenze intero monorepo (serve per i package
# @aios/domain-model e @aios/api-contract via workspace) → build → runtime
# minimale.

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
COPY packages/domain-model/package.json packages/domain-model/
COPY packages/api-contract/package.json packages/api-contract/
COPY packages/eventing/package.json packages/eventing/
COPY backend/services/identity/package.json backend/services/identity/
RUN pnpm install

# ---------- Stage: build ----------
FROM deps AS build
COPY packages/domain-model packages/domain-model
COPY packages/api-contract packages/api-contract
COPY packages/eventing packages/eventing
COPY backend/services/identity backend/services/identity
COPY tsconfig.base.json ./
RUN pnpm --filter @aios/domain-model run generate
RUN pnpm --filter @aios/domain-model run build
RUN pnpm --filter @aios/api-contract run build
RUN pnpm --filter @aios/eventing run build
RUN pnpm --filter @aios/identity-service run build

# ---------- Stage: runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/backend/services/identity/dist ./dist
COPY --from=build /repo/backend/services/identity/node_modules ./node_modules
COPY --from=build /repo/packages/domain-model/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main.js"]
