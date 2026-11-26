# Manual de operaciones

## Componentes en ejecución

| Contenedor | Puerto | Función |
|---|---|---|
| `tareas-app` | 3000 | Aplicación (API + frontend) |
| `tareas-prometheus` | 9090 | Recolecta métricas y evalúa alertas |
| `tareas-alertmanager` | 9093 | Agrupa y notifica alertas |
| `tareas-loki` | 3100 | Almacena logs centralizados |
| `tareas-alloy` | 12345 | Lee los logs de Docker y los envía a Loki |
| `tareas-grafana` | 3001 | Dashboards de métricas y logs |

## Comandos frecuentes

```bash
docker compose up -d --build       # levantar / actualizar todo
docker compose ps                  # estado de los servicios
docker compose logs -f app         # logs de la app en vivo
docker compose restart app         # reiniciar solo la app
docker compose stop app            # detener la app (dispara la alerta AplicacionCaida)
docker compose down                # detener todo (conserva datos)
docker compose down -v             # detener todo y borrar datos
```

## Verificar la salud del sistema

```bash
curl http://localhost:3000/health
# {"estado":"ok","version":"local","baseDeDatos":"ok"}
```

- `estado: ok` → todo funciona.
- `estado: degradado` (HTTP 503) → la base de datos no responde.

En Prometheus, *Status → Targets* debe mostrar `tareas-app` en estado **UP**.

## Métricas disponibles

| Métrica | Tipo | Significado |
|---|---|---|
| `http_requests_total{method,route,status}` | counter | Solicitudes atendidas |
| `http_request_duration_seconds` | histogram | Tiempo de respuesta |
| `tareas_total` / `tareas_completadas` | gauge | Datos del negocio |
| `app_uptime_seconds` | gauge | Tiempo desde el último arranque |
| `process_resident_memory_bytes` | gauge | Memoria usada |
| `app_info{version}` | gauge | Versión desplegada |
| `up{job="tareas-app"}` | (Prometheus) | 1 si Prometheus puede leer la app, 0 si no |

Consultas útiles en Prometheus (*Graph*):

```promql
sum by (route) (rate(http_requests_total[1m]))                       # solicitudes por segundo
sum(rate(http_requests_total{status=~"5.."}[5m]))                     # errores por segundo
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))  # latencia p95
```

## Dashboard de Grafana

Abrir http://localhost:3001 (admin / admin). El dashboard **Tareas DevOps — Monitoreo** es la página de inicio y se actualiza cada 10 segundos. Contiene: estado, tareas, errores 5xx, tiempo activo, solicitudes por ruta y por código, latencia, memoria, logs y solo errores.

## Logs centralizados

Cada solicitud genera una línea JSON:

```json
{"tiempo":"2026-11-26T14:03:11.402Z","level":"info","mensaje":"solicitud","app":"tareas-devops","metodo":"POST","ruta":"/api/tareas","estado":201,"ms":3}
```

Buscar logs en Grafana → *Explore* → fuente **Loki**:

```logql
{container="tareas-app"}                                 # todos los logs de la app
{container="tareas-app", level="error"}                  # solo errores
{container="tareas-app"} | json | estado >= 400          # respuestas con error
{container="tareas-app"} | json | ms > 100               # solicitudes lentas
```

## Alertas y qué hacer (runbook)

Las alertas se ven en http://localhost:9090/alerts y en http://localhost:9093.

### AplicacionCaida (crítica)
**Significa:** Prometheus no puede leer `/metrics` hace más de 30 s.
1. `docker compose ps` → ¿el contenedor `tareas-app` está corriendo?
2. `docker compose logs --tail 50 app` → buscar el error de arranque.
3. `docker compose up -d app` para levantarla de nuevo.
4. Si el error vino de un despliegue, hacer rollback (ver [PIPELINE.md](PIPELINE.md#rollback-volver-a-una-versión-anterior)).

### ErroresDelServidor (advertencia)
**Significa:** la app devolvió respuestas 5xx en los últimos 2 minutos.
1. En Grafana, panel **Solo errores** o `{container="tareas-app", level="error"}` en Explore.
2. Identificar la ruta y el mensaje del error (`mensajeError`).
3. Corregir en una rama, abrir PR y dejar que el pipeline despliegue el arreglo.

### LatenciaAlta (advertencia)
**Significa:** el p95 de tiempo de respuesta supera 500 ms durante 2 minutos.
1. Panel **Latencia** → ¿afecta a todas las rutas o a una sola?
2. Revisar uso de memoria/CPU: `docker stats tareas-app`.
3. Buscar solicitudes lentas: `{container="tareas-app"} | json | ms > 500`.

### MemoriaAlta (advertencia)
**Significa:** la app usa más de 200 MB durante 5 minutos.
1. `docker stats tareas-app` para confirmar.
2. Reiniciar como mitigación: `docker compose restart app`.
3. Si se repite, investigar una posible fuga de memoria.

### Recibir notificaciones reales
Editar `monitoring/alertmanager/alertmanager.yml`, descomentar `webhook_configs` con la URL de un webhook (Discord, Slack, Teams) y ejecutar `docker compose restart alertmanager`.

## Probar las alertas (demo)

```bash
# Errores 5xx: llamar varias veces al endpoint de simulación (habilitado en docker compose)
for i in 1 2 3 4 5; do curl -s http://localhost:3000/api/simular-error; sleep 3; done

# Aplicación caída: detenerla ~1 minuto y luego levantarla
docker compose stop app
docker compose start app
```

En PowerShell: `1..5 | % { curl.exe -s http://localhost:3000/api/simular-error; Start-Sleep 3 }`.

> La alerta de errores necesita al menos dos errores separados unos segundos, porque Prometheus calcula el *aumento* del contador entre lecturas.

## Respaldo y restauración de la base de datos

```bash
# Respaldo
docker compose stop app
docker run --rm -v tareas-devops_app-data:/datos -v "$(pwd)":/respaldo alpine \
  cp /datos/tareas.db /respaldo/tareas-$(date +%F).db
docker compose start app

# Restauración
docker compose stop app
docker run --rm -v tareas-devops_app-data:/datos -v "$(pwd)":/respaldo alpine \
  cp /respaldo/tareas-AAAA-MM-DD.db /datos/tareas.db
docker compose start app
```

> En Render (plan gratuito) el disco es temporal: los datos se reinician en cada despliegue. Para producción real se usaría un disco persistente o una base de datos administrada.
