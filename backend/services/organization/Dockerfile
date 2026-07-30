FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY packages/domain-model/package.json packages/domain-model/
COPY packages/api-contract/package.json packages/api-contract/
COPY packages/rbac/package.json packages/rbac/
COPY packages/eventing/package.json packages/eventing/
COPY backend/services/organization/package.json backend/services/organization/
RUN pnpm install

FROM deps AS build
COPY packages/domain-model packages/domain-model
COPY packages/api-contract packages/api-contract
COPY packages/rbac packages/rbac
COPY packages/eventing packages/eventing
COPY backend/services/organization backend/services/organization
COPY tsconfig.base.json ./
RUN pnpm --filter @aios/domain-model run generate
RUN pnpm --filter @aios/domain-model run build
RUN pnpm --filter @aios/api-contract run build
RUN pnpm --filter @aios/rbac run build
RUN pnpm --filter @aios/eventing run build
RUN pnpm --filter @aios/organization-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/backend/services/organization/dist ./dist
COPY --from=build /repo/backend/services/organization/node_modules ./node_modules
EXPOSE 3003
CMD ["node", "dist/main.js"]
