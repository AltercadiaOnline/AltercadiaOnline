# syntax=docker/dockerfile:1
# Altercadia V2 — produção (Railway / Render / Fly.io).
# WebSocket persistente em /ws — requer container long-running.

# --- stage 1: compilar TypeScript + sync public/ ---
FROM node:22-alpine AS builder

WORKDIR /app

# Railway define NODE_ENV=production no build → sem isso, `tsc` não é instalado
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false

COPY package.json package-lock.json ./

RUN npm ci --include=dev

COPY tsconfig.json ./
COPY vercel.json ./vercel.json
COPY scripts ./scripts
COPY src ./src
COPY public ./public

# Railway/Vercel backend: só build:core — verify-vercel-static-routing exige vercel.json (só na Vercel).
RUN npm run build:core

# --- stage 2: runtime enxuto ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# Railway: não usar memory em produção — volume em /app/data (anexar no painel).
ENV PERSISTENCE_MODE=file
ENV DATA_DIR=/app/data

RUN addgroup -S app && adduser -S app -G app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

RUN mkdir -p /app/data && chown -R app:app /app/data

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server/index.js"]
