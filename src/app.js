// Aplicación Express: API de tareas con SQLite + endpoints de salud y métricas.
// createApp recibe sus dependencias (inyección) para poder probarla con una base en memoria.
const express = require('express');
const path = require('path');
const { abrirBaseDeDatos } = require('./db');
const { crearRepositorioTareas } = require('./repositories/tareasRepository');
const { validarTitulo, parsearId } = require('./services/validacion');
const { crearMetricas } = require('./metrics');
const { crearLogger } = require('./logger');

function createApp({
  db = abrirBaseDeDatos(':memory:'),
  logger = crearLogger({ silencioso: process.env.NODE_ENV === 'test' }),
  metricas = crearMetricas(),
  version = 'dev',
  habilitarSimulacionErrores = false,
} = {}) {
  const app = express();
  const tareas = crearRepositorioTareas(db);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  // Middleware de observabilidad: mide cada solicitud, la cuenta y la registra en el log.
  app.use((req, res, next) => {
    const inicio = process.hrtime.bigint();
    res.on('finish', () => {
      const segundos = Number(process.hrtime.bigint() - inicio) / 1e9;
      // Se usa la ruta "plantilla" (/api/tareas/:id) para no crear una serie por cada id.
      let ruta = 'estaticos';
      if (req.route) ruta = req.baseUrl + req.route.path;
      else if (res.statusCode === 404) ruta = 'no_encontrada';
      metricas.registrarSolicitud({ metodo: req.method, ruta, estado: res.statusCode, segundos });

      const nivel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger[nivel]('solicitud', {
        metodo: req.method,
        ruta: req.originalUrl,
        estado: res.statusCode,
        ms: Math.round(segundos * 1000),
      });
    });
    next();
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (req, res) => {
    const baseDeDatos = tareas.estaDisponible() ? 'ok' : 'error';
    const estado = baseDeDatos === 'ok' ? 'ok' : 'degradado';
    res.status(estado === 'ok' ? 200 : 503).json({ estado, version, baseDeDatos });
  });

  app.get('/metrics', (req, res) => {
    res.type('text/plain; version=0.0.4');
    res.send(metricas.exportar({ version, tareas: tareas.contar() }));
  });

  app.get('/api/tareas', (req, res) => res.json(tareas.listar()));

  app.get('/api/tareas/:id', (req, res) => {
    const id = parsearId(req.params.id);
    const tarea = id && tareas.obtener(id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(tarea);
  });

  app.post('/api/tareas', (req, res) => {
    const resultado = validarTitulo(req.body && req.body.titulo);
    if (!resultado.valido) return res.status(400).json({ error: resultado.error });
    const tarea = tareas.crear(resultado.titulo);
    logger.info('tarea_creada', { id: tarea.id });
    res.status(201).json(tarea);
  });

  app.patch('/api/tareas/:id', (req, res) => {
    const id = parsearId(req.params.id);
    const tarea = id && tareas.alternar(id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(tarea);
  });

  app.delete('/api/tareas/:id', (req, res) => {
    const id = parsearId(req.params.id);
    if (!id || !tareas.eliminar(id)) return res.status(404).json({ error: 'Tarea no encontrada' });
    logger.info('tarea_eliminada', { id });
    res.status(204).end();
  });

  if (habilitarSimulacionErrores) {
    // Genera un error 500 a propósito para demostrar las alertas en la presentación.
    app.get('/api/simular-error', () => {
      throw new Error('Error simulado para probar el monitoreo');
    });
  }

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Manejador central de errores: nunca expone detalles internos al cliente.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido' });
    }
    logger.error('error_no_controlado', { mensajeError: err.message, ruta: req.originalUrl });
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = { createApp };
