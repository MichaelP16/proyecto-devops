// Pruebas de integración de la API HTTP completa (Express + SQLite en memoria) con Supertest.
const request = require('supertest');
const { createApp } = require('../../src/app');

describe('API de tareas', () => {
  let app;
  beforeEach(() => {
    app = createApp({ version: 'test-1' });
  });

  test('GET /health responde ok con la versión', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ estado: 'ok', version: 'test-1', baseDeDatos: 'ok' });
  });

  test('POST /api/tareas crea una tarea', async () => {
    const r = await request(app).post('/api/tareas').send({ titulo: 'Configurar pipeline' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ id: 1, titulo: 'Configurar pipeline', completada: false });
  });

  test('GET /api/tareas lista las tareas creadas', async () => {
    await request(app).post('/api/tareas').send({ titulo: 'Uno' });
    await request(app).post('/api/tareas').send({ titulo: 'Dos' });
    const r = await request(app).get('/api/tareas');
    expect(r.status).toBe(200);
    expect(r.body.map((t) => t.titulo)).toEqual(['Uno', 'Dos']);
  });

  test('GET /api/tareas/:id devuelve una tarea o 404', async () => {
    await request(app).post('/api/tareas').send({ titulo: 'Buscar' });
    expect((await request(app).get('/api/tareas/1')).body.titulo).toBe('Buscar');
    expect((await request(app).get('/api/tareas/50')).status).toBe(404);
    expect((await request(app).get('/api/tareas/abc')).status).toBe(404);
  });

  test('POST /api/tareas sin título devuelve 400', async () => {
    const r = await request(app).post('/api/tareas').send({});
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('El título es obligatorio');
  });

  test('POST /api/tareas con título demasiado largo devuelve 400', async () => {
    const r = await request(app).post('/api/tareas').send({ titulo: 'x'.repeat(121) });
    expect(r.status).toBe(400);
  });

  test('POST /api/tareas con JSON mal formado devuelve 400', async () => {
    const r = await request(app)
      .post('/api/tareas')
      .set('Content-Type', 'application/json')
      .send('{"titulo": ');
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/JSON/);
  });

  test('PATCH /api/tareas/:id alterna completada', async () => {
    await request(app).post('/api/tareas').send({ titulo: 'Escribir pruebas' });
    const r = await request(app).patch('/api/tareas/1');
    expect(r.status).toBe(200);
    expect(r.body.completada).toBe(true);
  });

  test('PATCH de una tarea inexistente devuelve 404', async () => {
    const r = await request(app).patch('/api/tareas/99');
    expect(r.status).toBe(404);
  });

  test('DELETE /api/tareas/:id elimina la tarea', async () => {
    await request(app).post('/api/tareas').send({ titulo: 'Borrar' });
    const r = await request(app).delete('/api/tareas/1');
    expect(r.status).toBe(204);
    expect((await request(app).get('/api/tareas')).body).toHaveLength(0);
  });

  test('DELETE de una tarea inexistente devuelve 404', async () => {
    const r = await request(app).delete('/api/tareas/99');
    expect(r.status).toBe(404);
  });

  test('una ruta de API desconocida devuelve 404 en JSON', async () => {
    const r = await request(app).get('/api/no-existe');
    expect(r.status).toBe(404);
    expect(r.body.error).toBe('Ruta no encontrada');
  });

  test('GET /metrics expone métricas en formato Prometheus', async () => {
    await request(app).post('/api/tareas').send({ titulo: 'Medir' });
    const r = await request(app).get('/metrics');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/plain/);
    expect(r.text).toContain('tareas_total 1');
    expect(r.text).toContain('http_requests_total{method="POST",route="/api/tareas",status="201"} 1');
    expect(r.text).toContain('app_info{version="test-1"} 1');
  });
});

describe('simulación de errores (demo de alertas)', () => {
  test('está deshabilitada por defecto', async () => {
    const r = await request(createApp()).get('/api/simular-error');
    expect(r.status).toBe(404);
  });

  test('cuando se habilita responde 500 y se cuenta en las métricas', async () => {
    const app = createApp({ habilitarSimulacionErrores: true });
    const r = await request(app).get('/api/simular-error');
    expect(r.status).toBe(500);
    expect(r.body.error).toBe('Error interno del servidor');

    const metricas = await request(app).get('/metrics');
    expect(metricas.text).toContain('route="/api/simular-error",status="500"} 1');
  });
});
