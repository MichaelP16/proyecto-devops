# syntax=docker/dockerfile:1

# ---------- Etapa 1: dependencias de producción ----------
FROM node:26-alpine AS dependencias
WORKDIR /app
COPY package*.json ./
# npm ci usa package-lock.json para instalar versiones exactas (builds reproducibles).
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
    && npm cache clean --force

# ---------- Etapa 2: imagen final ligera ----------
FROM node:26-alpine AS produccion

# El pipeline pasa el SHA del commit para saber qué versión está corriendo (/health y /metrics).
ARG APP_VERSION=""
ENV NODE_ENV=production \
    PORT=3000 \
    DB_FILE=/app/data/tareas.db \
    APP_VERSION=${APP_VERSION}

LABEL org.opencontainers.image.title="tareas-devops" \
      org.opencontainers.image.description="App de tareas — Proyecto Final DevOps ITLA"

WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

# Carpeta de datos de SQLite con permisos para el usuario sin privilegios.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT}/health" || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
