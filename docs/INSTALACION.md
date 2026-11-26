# Guía de instalación

## Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Git | cualquiera reciente | Control de versiones |
| Node.js | 22.13 o superior | Ejecutar la app y las pruebas (incluye SQLite nativo) |
| Docker Desktop | 4.x o superior | Contenedores y monitoreo |

Verifica las versiones:

```bash
git --version
node -v
docker -v
docker compose version
```

## 1. Clonar el repositorio

```bash
git clone https://github.com/MichaelP16/node-cicd-pipeline.git
cd node-cicd-pipeline
```

## 2. Opción A — Ejecutar sin Docker

```bash
npm install          # instala dependencias (genera package-lock.json)
npm run lint         # análisis estático
npm test             # pruebas unitarias + integración con cobertura
npm start            # http://localhost:3000
```

Durante el desarrollo, `npm run dev` reinicia el servidor automáticamente al guardar cambios.

La base de datos se guarda en `data/tareas.db` (la carpeta está en `.gitignore`).

### Variables de entorno

Copia `.env.example` como `.env` si quieres cambiar algún valor. Variables disponibles:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP |
| `DB_FILE` | `./data/tareas.db` | Archivo de SQLite |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` o `error` |
| `ENABLE_ERROR_SIMULATION` | `false` | Habilita `GET /api/simular-error` (solo para la demo) |
| `APP_VERSION` | `dev` | Versión mostrada en `/health` (el pipeline pone el SHA del commit) |

En Windows (PowerShell) se definen así: `$env:LOG_LEVEL="debug"; npm start`.

## 3. Opción B — Ejecutar con Docker

Solo la aplicación:

```bash
docker build -t tareas-devops .
docker run -d -p 3000:3000 -v tareas-data:/app/data --name tareas tareas-devops
```

Aplicación + monitoreo completo:

```bash
docker compose up -d --build
docker compose ps        # todos los servicios deben estar "running"
```

| Servicio | URL | Credenciales |
|---|---|---|
| Aplicación | http://localhost:3000 | — |
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Alertmanager | http://localhost:9093 | — |
| Alloy (recolector de logs) | http://localhost:12345 | — |

Para detener todo: `docker compose down` (agrega `-v` para borrar también los datos).

## 4. Configurar el pipeline en GitHub

Ver [PIPELINE.md](PIPELINE.md#configuración-inicial).

## Problemas comunes

| Problema | Solución |
|---|---|
| `Cannot find module 'node:sqlite'` o `DatabaseSync is not a constructor` | Actualiza Node.js a 22.13 o superior. |
| `port is already allocated` al usar Docker | Otro programa usa ese puerto. Detenlo o cambia el puerto en `docker-compose.yml`. |
| Grafana no muestra logs | Revisa que `tareas-alloy` esté corriendo (`docker compose logs alloy`). En Windows, Docker Desktop debe estar en modo WSL 2. |
| Las pruebas fallan por cobertura | Agrega pruebas para el código nuevo: el umbral mínimo es 80 % de líneas. |
