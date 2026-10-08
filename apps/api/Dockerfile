# syntax=docker/dockerfile:1
# Build context is the REPOSITORY ROOT (not apps/api):
#   docker build -f apps/api/Dockerfile -t graphql-api .
# The image contains only production dependencies of @app/api.

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

# Resolve the exact dependency graph first so source changes don't bust the cache.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
# apps/web is not installed (filter), but its manifest must exist for the
# frozen lockfile check to see every workspace project.
COPY apps/web/package.json apps/web/package.json
RUN pnpm fetch
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @app/api --prod

FROM node:24-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
# Production node_modules from the deps stage (relative symlinks survive the copy).
COPY --chown=node:node --from=deps /repo/node_modules ./node_modules
COPY --chown=node:node --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/api/package.json ./apps/api/package.json
COPY --chown=node:node apps/api/src ./apps/api/src
# Trusted documents: the API ships the persisted-documents manifest the web
# was built from (generated in phase 4; absent until DEVELOPER 1 merges it).
COPY --chown=node:node apps/web/src/gql/persisted-documents.json ./persisted-documents.json
ENV PERSISTED_DOCUMENTS_PATH=/app/persisted-documents.json
USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT ?? 4000) + '/health/live').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# Migrations run before the server on every container start. Single instance on
# Dokploy, so no migration race; multiple instances would need a separate
# release step instead.
CMD ["sh", "-c", "node src/migrate.ts && exec node --import ./src/instrumentation.ts src/server.ts"]
