const { crearLogger } = require('../../src/logger');

function salidaFalsa() {
  const lineas = [];
  return { lineas, write: (texto) => lineas.push(JSON.parse(texto)) };
}

describe('logger JSON', () => {
  test('escribe una línea JSON con nivel, mensaje y datos', () => {
    const salida = salidaFalsa();
    const logger = crearLogger({ salida, base: { app: 'prueba' } });
    logger.info('tarea_creada', { id: 1 });

    expect(salida.lineas).toHaveLength(1);
    expect(salida.lineas[0]).toMatchObject({ level: 'info', mensaje: 'tarea_creada', app: 'prueba', id: 1 });
    expect(typeof salida.lineas[0].tiempo).toBe('string');
  });

  test('respeta el nivel mínimo configurado', () => {
    const salida = salidaFalsa();
    const logger = crearLogger({ salida, nivel: 'warn' });
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');

    expect(salida.lineas.map((l) => l.level)).toEqual(['warn', 'error']);
  });

  test('en modo silencioso no escribe nada', () => {
    const salida = salidaFalsa();
    crearLogger({ salida, silencioso: true }).error('nada');
    expect(salida.lineas).toHaveLength(0);
  });
});
