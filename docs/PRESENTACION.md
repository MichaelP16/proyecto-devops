# Guía de presentación

Duración sugerida: 15 minutos + preguntas. Dos integrantes: **A** (aplicación y pruebas) y **B** (pipeline y monitoreo).

## Estructura

| Min | Quién | Tema |
|---|---|---|
| 0–2 | A | Problema y objetivo: qué hace la app y qué buscamos automatizar |
| 2–4 | A | Arquitectura (diagrama del README) y stack |
| 4–6 | A | Calidad: ESLint, pruebas unitarias vs. integración, cobertura |
| 6–8 | B | Pipeline: las 3 etapas y por qué ese orden |
| 8–13 | A+B | **Demo en vivo** |
| 13–15 | B | Lecciones aprendidas, desafíos y mejoras futuras |

## Guion de la demo

**Antes de empezar:** tener abiertos GitHub (pestaña Actions), la app en Render, Grafana (http://localhost:3001) y Prometheus/alerts (http://localhost:9090/alerts). Levantar `docker compose up -d` al menos 5 minutos antes para que haya datos.

1. **La app funcionando** — crear, completar y eliminar tareas. Mostrar la versión en el pie de página (es el SHA del commit).
2. **Cambio visible** — en una rama, cambiar el subtítulo de `public/index.html`, hacer push y abrir un PR. Mostrar los jobs corriendo.
3. **El pipeline bloquea errores** — mostrar un PR preparado con una prueba rota: queda en rojo y no se puede hacer merge.
4. **Despliegue automático** — hacer merge del PR bueno. Mostrar el Job 3 esperando la versión nueva y luego el cambio en Render. Abrir *Packages* para mostrar la imagen en GHCR.
5. **Monitoreo** — en Grafana, mostrar el dashboard: solicitudes, latencia y logs en vivo mientras se usa la app.
6. **Alertas** — llamar 5 veces a `/api/simular-error`: subir el contador de errores, ver los logs de error y la alerta `ErroresDelServidor` en Prometheus. Luego `docker compose stop app` → panel "Estado" en CAÍDA y alerta `AplicacionCaida`. Levantarla de nuevo.

**Plan B:** grabar un video de la demo completa el día antes, por si falla internet o Render tarda en arrancar (en el plan gratuito, el primer acceso puede tardar 30–60 segundos).

## Lecciones aprendidas

- **Automatizar pronto ahorra tiempo:** cada error detectado por el pipeline en un PR es un error que no llegó a producción.
- **Separar `app.js` de `server.js`** permitió probar la API completa sin abrir puertos, con una base SQLite en memoria.
- **Inyección de dependencias** (pasar la base de datos y el logger a `createApp`) hizo el código fácil de probar.
- **"Funciona en mi máquina" desaparece con Docker:** el mismo contenedor corre en local, en el pipeline y en producción.
- **Observabilidad desde el inicio:** logs JSON y métricas desde el día 1 hacen que el monitoreo sea solo conectar herramientas.
- **Versionar el lockfile** (`package-lock.json`) y usar `npm ci` da builds reproducibles.

## Desafíos y soluciones

| Desafío | Solución |
|---|---|
| GitHub Pages solo publica archivos estáticos: la API no funcionaba en el despliegue de la plantilla | Desplegar el contenedor completo en Render |
| Avisos de Node.js 20 obsoleto en las acciones de GitHub | Actualizar a Node 22 y a las versiones de las acciones que usan Node 24 |
| Saber si producción ya tiene la versión nueva tras el deploy | `/health` devuelve el SHA del commit y la prueba de humo espera hasta que coincida |
| Promtail (recolector de logs clásico) llegó a fin de vida en 2026 | Usar Grafana Alloy, su reemplazo oficial |
| SQLite en Render gratis pierde los datos en cada despliegue | Documentado como limitación; en producción real: disco persistente o BD administrada |
| Jest no resolvía el módulo `node:sqlite` | Cargarlo con `process.getBuiltinModule` |
| Muchas series de métricas si se usa la URL con el id (`/api/tareas/1`, `/2`…) | Etiquetar con la ruta plantilla (`/api/tareas/:id`) |

## Mejoras futuras

- Base de datos administrada (PostgreSQL) y migraciones versionadas.
- Ambiente de *staging* antes de producción.
- Escaneo de vulnerabilidades de la imagen (Trivy) y análisis con SonarCloud.
- Notificaciones de alertas a Discord o Slack.
- Infraestructura como código (Terraform) y Kubernetes.

## Posibles preguntas

- **¿Diferencia entre prueba unitaria e integración?** La unitaria prueba una función aislada (por ejemplo `validarTitulo`); la de integración prueba varias piezas juntas (HTTP + Express + SQLite).
- **¿Qué pasa si una prueba falla en `main`?** No se construye ni se despliega nada; producción sigue con la versión anterior.
- **¿Cómo se hace rollback?** `git revert` + push (el pipeline redespliega), o rollback desde Render, o correr una imagen anterior de GHCR por su SHA.
- **¿Por qué GitHub Actions y no Jenkins?** Está integrado en GitHub, es gratis para repos públicos y no requiere mantener un servidor.
- **¿Qué es la prueba de humo?** Una verificación rápida, después de desplegar, de que lo esencial funciona (salud, crear, listar y eliminar).
- **¿Por qué el usuario `node` en el Dockerfile?** Para no ejecutar como root: si alguien compromete la app, tiene menos permisos.
