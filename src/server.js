// Punto de entrada: arma las dependencias reales y arranca el servidor HTTP.
const config = require('./config');
const { createApp } = require('./app');
const { abrirBaseDeDatos } = require('./db');
const { crearLogger } = require('./logger');

const logger = crearLogger({ nivel: config.nivelLog, base: { app: 'tareas-devops' } });
const db = abrirBaseDeDatos(config.dbFile);

const app = createApp({
  db,
  logger,
  version: config.version,
  habilitarSimulacionErrores: config.habilitarSimulacionErrores,
});

const servidor = app.listen(config.port, () => {
  logger.info('servidor_iniciado', { puerto: config.port, version: config.version, baseDeDatos: config.dbFile });
});

// Apagado ordenado: Docker envía SIGTERM al detener el contenedor.
function apagar(senal) {
  logger.info('servidor_apagando', { senal });
  servidor.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
