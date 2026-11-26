const { validarTitulo, parsearId, LONGITUD_MAXIMA_TITULO } = require('../../src/services/validacion');

describe('validarTitulo', () => {
  test('acepta un título normal y le quita los espacios', () => {
    expect(validarTitulo('  Configurar pipeline  ')).toEqual({ valido: true, titulo: 'Configurar pipeline' });
  });

  test('rechaza un título vacío o solo con espacios', () => {
    expect(validarTitulo('').valido).toBe(false);
    expect(validarTitulo('   ').valido).toBe(false);
  });

  test('rechaza valores que no son texto', () => {
    expect(validarTitulo(undefined).valido).toBe(false);
    expect(validarTitulo(123).valido).toBe(false);
    expect(validarTitulo(null).error).toBe('El título es obligatorio');
  });

  test('acepta exactamente la longitud máxima', () => {
    expect(validarTitulo('a'.repeat(LONGITUD_MAXIMA_TITULO)).valido).toBe(true);
  });

  test('rechaza títulos más largos que el máximo', () => {
    const resultado = validarTitulo('a'.repeat(LONGITUD_MAXIMA_TITULO + 1));
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toMatch(/más de 120 caracteres/);
  });
});

describe('parsearId', () => {
  test('convierte ids válidos a número', () => {
    expect(parsearId('7')).toBe(7);
  });

  test('devuelve null para ids inválidos', () => {
    expect(parsearId('abc')).toBeNull();
    expect(parsearId('0')).toBeNull();
    expect(parsearId('-3')).toBeNull();
    expect(parsearId('1.5')).toBeNull();
  });
});
