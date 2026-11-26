// Métricas en el formato de texto de Prometheus (https://prometheus.io/docs/instrumenting/exposition_formats/).
// Se implementa a mano (sin librerías) para que se entienda exactamente qué mide cada línea.

const BUCKETS_SEGUNDOS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

function escaparEtiqueta(valor) {
  return String(valor).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function etiquetas(objeto) {
  const pares = Object.entries(objeto).map(([clave, valor]) => `${clave}="${escaparEtiqueta(valor)}"`);
  return pares.length ? `{${pares.join(',')}}` : '';
}

function crearMetricas({ ahora = () => Date.now() } = {}) {
  const inicio = ahora();
  const solicitudes = new Map(); // "method|route|status" -> contador
  const duraciones = new Map(); // "method|route" -> { buckets, suma, cantidad }

  function registrarSolicitud({ metodo, ruta, estado, segundos }) {
    const claveSolicitud = `${metodo}|${ruta}|${estado}`;
    solicitudes.set(claveSolicitud, (solicitudes.get(claveSolicitud) || 0) + 1);

    const claveDuracion = `${metodo}|${ruta}`;
    if (!duraciones.has(claveDuracion)) {
      duraciones.set(claveDuracion, { buckets: BUCKETS_SEGUNDOS.map(() => 0), suma: 0, cantidad: 0 });
    }
    const histograma = duraciones.get(claveDuracion);
    BUCKETS_SEGUNDOS.forEach((limite, i) => {
      if (segundos <= limite) histograma.buckets[i]++;
    });
    histograma.suma += segundos;
    histograma.cantidad++;
  }

  function totalSolicitudes() {
    let total = 0;
    for (const valor of solicitudes.values()) total += valor;
    return total;
  }

  function exportar({ version = 'dev', tareas = { total: 0, completadas: 0 } } = {}) {
    const lineas = [];

    lineas.push('# HELP http_requests_total Total de solicitudes HTTP atendidas.');
    lineas.push('# TYPE http_requests_total counter');
    for (const [clave, valor] of solicitudes) {
      const [method, route, status] = clave.split('|');
      lineas.push(`http_requests_total${etiquetas({ method, route, status })} ${valor}`);
    }

    lineas.push('# HELP http_request_duration_seconds Duración de las solicitudes HTTP en segundos.');
    lineas.push('# TYPE http_request_duration_seconds histogram');
    for (const [clave, h] of duraciones) {
      const [method, route] = clave.split('|');
      BUCKETS_SEGUNDOS.forEach((limite, i) => {
        lineas.push(`http_request_duration_seconds_bucket${etiquetas({ method, route, le: limite })} ${h.buckets[i]}`);
      });
      lineas.push(`http_request_duration_seconds_bucket${etiquetas({ method, route, le: '+Inf' })} ${h.cantidad}`);
      lineas.push(`http_request_duration_seconds_sum${etiquetas({ method, route })} ${h.suma}`);
      lineas.push(`http_request_duration_seconds_count${etiquetas({ method, route })} ${h.cantidad}`);
    }

    const memoria = process.memoryUsage();
    const indicadores = [
      ['tareas_total', 'gauge', 'Cantidad de tareas guardadas.', tareas.total],
      ['tareas_completadas', 'gauge', 'Cantidad de tareas completadas.', tareas.completadas],
      ['app_uptime_seconds', 'gauge', 'Segundos desde que arrancó la aplicación.', Math.round((ahora() - inicio) / 1000)],
      ['process_resident_memory_bytes', 'gauge', 'Memoria residente del proceso en bytes.', memoria.rss],
      ['nodejs_heap_used_bytes', 'gauge', 'Memoria heap usada por Node.js en bytes.', memoria.heapUsed],
    ];
    for (const [nombre, tipo, ayuda, valor] of indicadores) {
      lineas.push(`# HELP ${nombre} ${ayuda}`, `# TYPE ${nombre} ${tipo}`, `${nombre} ${valor}`);
    }

    lineas.push('# HELP app_info Información de la versión desplegada.');
    lineas.push('# TYPE app_info gauge');
    lineas.push(`app_info${etiquetas({ version })} 1`);

    return `${lineas.join('\n')}\n`;
  }

  return { registrarSolicitud, totalSolicitudes, exportar };
}

module.exports = { crearMetricas, BUCKETS_SEGUNDOS };
