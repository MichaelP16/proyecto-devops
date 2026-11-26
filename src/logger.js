// Logger estructurado: una línea JSON por evento en stdout.
// Docker captura stdout, Grafana Alloy lo recoge y lo envía a Loki (logs centralizados).
// Se usa la clave "level" porque Grafana la reconoce para colorear los logs por nivel.

const NIVELES = { debug: 10, info: 20, warn: 30, error: 40 };

function crearLogger({ nivel = 'info', salida = process.stdout, silencioso = false, base = {} } = {}) {
  const minimo = NIVELES[nivel] ?? NIVELES.info;

  function escribir(level, mensaje, datos = {}) {
    if (silencioso || NIVELES[level] < minimo) return;
    const linea = { tiempo: new Date().toISOString(), level, mensaje, ...base, ...datos };
    salida.write(`${JSON.stringify(linea)}\n`);
  }

  return {
    debug: (mensaje, datos) => escribir('debug', mensaje, datos),
    info: (mensaje, datos) => escribir('info', mensaje, datos),
    warn: (mensaje, datos) => escribir('warn', mensaje, datos),
    error: (mensaje, datos) => escribir('error', mensaje, datos),
  };
}

module.exports = { crearLogger, NIVELES };
