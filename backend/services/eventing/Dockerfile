# AIOS — Eventing Relay Worker
FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY packages/domain-model/package.json packages/domain-model/
COPY backend/services/eventing/package.json backend/services/eventing/
RUN pnpm install

FROM deps AS build
COPY packages/domain-model packages/domain-model
COPY backend/services/eventing backend/services/eventing
COPY tsconfig.base.json ./
RUN pnpm --filter @aios/domain-model run generate
RUN pnpm --filter @aios/domain-model run build
RUN pnpm --filter @aios/eventing-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/backend/services/eventing/dist ./dist
COPY --from=build /repo/backend/services/eventing/node_modules ./node_modules
CMD ["node", "dist/relay.worker.js"]
