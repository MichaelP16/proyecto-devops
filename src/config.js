// Configuración centralizada: todo se lee de variables de entorno (12-factor app).
const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  dbFile: process.env.DB_FILE || path.join(__dirname, '..', 'data', 'tareas.db'),
  // APP_VERSION la inyecta el pipeline al construir la imagen; Render expone RENDER_GIT_COMMIT.
  version: process.env.APP_VERSION || process.env.RENDER_GIT_COMMIT || 'dev',
  nivelLog: process.env.LOG_LEVEL || 'info',
  // Solo para la demo de alertas: habilita GET /api/simular-error (nunca en producción).
  habilitarSimulacionErrores: process.env.ENABLE_ERROR_SIMULATION === 'true',
};
