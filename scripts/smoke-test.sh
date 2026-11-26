#!/usr/bin/env bash
# Prueba de humo: verifica que una instancia desplegada de la app funciona de punta a punta.
# Uso: bash scripts/smoke-test.sh URL_BASE [VERSION_ESPERADA] [TIMEOUT_SEGUNDOS]
#   bash scripts/smoke-test.sh http://localhost:3000
#   bash scripts/smoke-test.sh https://mi-app.onrender.com 3f2a9c1... 900
set -euo pipefail

BASE_URL="${1:?Uso: smoke-test.sh URL_BASE [VERSION_ESPERADA] [TIMEOUT_SEGUNDOS]}"
BASE_URL="${BASE_URL%/}"
VERSION_ESPERADA="${2:-}"
TIMEOUT="${3:-60}"
salud=""

echo "Esperando a que ${BASE_URL}/health responda${VERSION_ESPERADA:+ con la versión ${VERSION_ESPERADA}}..."
fin=$((SECONDS + TIMEOUT))
until salud=$(curl -fsS --max-time 10 "${BASE_URL}/health" 2>/dev/null) \
  && { [ -z "$VERSION_ESPERADA" ] || grep -q "\"version\":\"${VERSION_ESPERADA}\"" <<<"$salud"; }; do
  if [ "$SECONDS" -ge "$fin" ]; then
    echo "ERROR: la aplicación no estuvo lista en ${TIMEOUT}s. Última respuesta: ${salud:-ninguna}"
    exit 1
  fi
  sleep 5
done
echo "OK  /health -> ${salud}"

respuesta=$(curl -fsS -X POST "${BASE_URL}/api/tareas" \
  -H 'Content-Type: application/json' -d '{"titulo":"Prueba de humo"}')
grep -q '"titulo":"Prueba de humo"' <<<"$respuesta" || { echo "ERROR: no se pudo crear la tarea: $respuesta"; exit 1; }
id=$(sed -E 's/.*"id":([0-9]+).*/\1/' <<<"$respuesta")
echo "OK  POST /api/tareas -> id ${id}"

curl -fsS "${BASE_URL}/api/tareas" | grep -q 'Prueba de humo' || { echo "ERROR: la tarea no aparece en la lista"; exit 1; }
echo "OK  GET /api/tareas"

curl -fsS -X DELETE "${BASE_URL}/api/tareas/${id}" -o /dev/null
echo "OK  DELETE /api/tareas/${id}"

curl -fsS "${BASE_URL}/metrics" | grep -q '^http_requests_total' || { echo "ERROR: /metrics no expone métricas"; exit 1; }
echo "OK  GET /metrics"

curl -fsS "${BASE_URL}/" | grep -q '<title>' || { echo "ERROR: el frontend no carga"; exit 1; }
echo "OK  GET / (frontend)"

echo "Prueba de humo superada."
