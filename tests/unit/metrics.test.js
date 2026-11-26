const { crearMetricas } = require('../../src/metrics');

describe('métricas Prometheus', () => {
  test('cuenta las solicitudes por método, ruta y estado', () => {
    const metricas = crearMetricas();
    metricas.registrarSolicitud({ metodo: 'GET', ruta: '/api/tareas', estado: 200, segundos: 0.01 });
    metricas.registrarSolicitud({ metodo: 'GET', ruta: '/api/tareas', estado: 200, segundos: 0.02 });
    metricas.registrarSolicitud({ metodo: 'POST', ruta: '/api/tareas', estado: 400, segundos: 0.01 });

    const texto = metricas.exportar();
    expect(texto).toContain('http_requests_total{method="GET",route="/api/tareas",status="200"} 2');
    expect(texto).toContain('http_requests_total{method="POST",route="/api/tareas",status="400"} 1');
    expect(metricas.totalSolicitudes()).toBe(3);
  });

  test('el histograma de duración es acumulativo', () => {
    const metricas = crearMetricas();
    metricas.registrarSolicitud({ metodo: 'GET', ruta: '/health', estado: 200, segundos: 0.003 });
    metricas.registrarSolicitud({ metodo: 'GET', ruta: '/health', estado: 200, segundos: 0.3 });

    const texto = metricas.exportar();
    expect(texto).toContain('http_request_duration_seconds_bucket{method="GET",route="/health",le="0.005"} 1');
    expect(texto).toContain('http_request_duration_seconds_bucket{method="GET",route="/health",le="0.5"} 2');
    expect(texto).toContain('http_request_duration_seconds_bucket{method="GET",route="/health",le="+Inf"} 2');
    expect(texto).toContain('http_request_duration_seconds_count{method="GET",route="/health"} 2');
  });

  test('exporta tareas, versión y tiempo activo', () => {
    let reloj = 1000;
    const metricas = crearMetricas({ ahora: () => reloj });
    reloj += 5000;

    const texto = metricas.exportar({ version: 'abc123', tareas: { total: 4, completadas: 1 } });
    expect(texto).toContain('tareas_total 4');
    expect(texto).toContain('tareas_completadas 1');
    expect(texto).toContain('app_uptime_seconds 5');
    expect(texto).toContain('app_info{version="abc123"} 1');
    expect(texto).toContain('# TYPE http_requests_total counter');
  });

  test('escapa comillas en los valores de las etiquetas', () => {
    const metricas = crearMetricas();
    const texto = metricas.exportar({ version: 'v"1' });
    expect(texto).toContain('app_info{version="v\\"1"} 1');
  });
});
