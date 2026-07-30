FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY packages/domain-model/package.json packages/domain-model/
COPY packages/api-contract/package.json packages/api-contract/
COPY packages/rbac/package.json packages/rbac/
COPY packages/eventing/package.json packages/eventing/
COPY backend/services/workspace/package.json backend/services/workspace/
RUN pnpm install

FROM deps AS build
COPY packages/domain-model packages/domain-model
COPY packages/api-contract packages/api-contract
COPY packages/rbac packages/rbac
COPY packages/eventing packages/eventing
COPY backend/services/workspace backend/services/workspace
COPY tsconfig.base.json ./
RUN pnpm --filter @aios/domain-model run generate
RUN pnpm --filter @aios/domain-model run build
RUN pnpm --filter @aios/api-contract run build
RUN pnpm --filter @aios/rbac run build
RUN pnpm --filter @aios/eventing run build
RUN pnpm --filter @aios/workspace-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/backend/services/workspace/dist ./dist
COPY --from=build /repo/backend/services/workspace/node_modules ./node_modules
EXPOSE 3004
CMD ["node", "dist/main.js"]
