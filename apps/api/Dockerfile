FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# Build stage
FROM base AS builder
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

RUN pnpm --filter @discord-stream/shared build
RUN pnpm --filter @discord-stream/api build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@9

COPY . .
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/app/server.js"]
