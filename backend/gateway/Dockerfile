FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY packages/domain-model/package.json packages/domain-model/
COPY backend/gateway/package.json backend/gateway/
RUN pnpm install

FROM deps AS build
COPY packages/domain-model packages/domain-model
COPY backend/gateway backend/gateway
COPY tsconfig.base.json ./
RUN pnpm --filter @aios/domain-model run generate
RUN pnpm --filter @aios/domain-model run build
RUN pnpm --filter @aios/gateway run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/backend/gateway/dist ./dist
COPY --from=build /repo/backend/gateway/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
