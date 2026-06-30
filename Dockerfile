# ==========================================================
# PesaNet WiFi Billing System — Dockerfile
# Multi-stage: builder → production (Next.js standalone)
# ==========================================================

# ---- Stage 1: Build ----
FROM oven/bun:1 AS builder

WORKDIR /app

# Install dependencies (layer cached until lock/schema changes)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Prisma schema + generate client
COPY prisma/ ./prisma/
RUN bunx prisma generate

# Copy source
COPY . .

# Build Next.js standalone (outputs to .next/standalone/)
RUN bun run build

# ---- Stage 2: Production ----
FROM oven/bun:1-slim

WORKDIR /app

# Install required system deps for Prisma + SQLite
RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends \
      ca-certificates \
      curl \
      && rm -rf /var/lib/apt/lists/*

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone /app
COPY --from=builder /app/.next/static /app/.next/static
COPY --from=builder /app/public /app/public

# Copy Prisma CLI + client + schema for runtime db:push
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=builder /app/node_modules/prisma /app/node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma /app/node_modules/.bin/prisma
COPY --from=builder /app/prisma ./prisma

# Copy seed scripts for first-run seeding
COPY --from=builder /app/prisma/seed*.ts ./prisma/
COPY --from=builder /app/tsconfig.json /app/
COPY --from=builder /app/node_modules/.cache /app/node_modules/.cache

# Entrypoint: push schema + seed if empty + start server
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "/app/server.js"]
