# AIOS — Administration Service

FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY packages/domain-model/package.json packages/domain-model/
COPY packages/api-contract/package.json packages/api-contract/
COPY packages/rbac/package.json packages/rbac/
COPY backend/services/administration/package.json backend/services/administration/
# Nessun pnpm-lock.yaml è ancora stato committato in questa fase del
# progetto (verrà generato dal primo `pnpm install` in locale) — un
# install regolare qui è quindi corretto, non un compromesso: una volta
# che un lockfile reale esiste, questa riga può tornare a
# `pnpm install --frozen-lockfile` per build riproducibili.
RUN pnpm install

FROM deps AS build
COPY packages/domain-model packages/domain-model
COPY packages/api-contract packages/api-contract
COPY packages/rbac packages/rbac
COPY backend/services/administration backend/services/administration
COPY tsconfig.base.json ./
RUN pnpm --filter @aios/domain-model run generate
RUN pnpm --filter @aios/domain-model run build
RUN pnpm --filter @aios/api-contract run build
RUN pnpm --filter @aios/rbac run build
RUN pnpm --filter @aios/administration-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/backend/services/administration/dist ./dist
COPY --from=build /repo/backend/services/administration/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/main.js"]
