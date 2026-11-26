// Reglas de negocio puras (sin Express ni base de datos): fáciles de probar con pruebas unitarias.

const LONGITUD_MAXIMA_TITULO = 120;

function validarTitulo(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return { valido: false, error: 'El título es obligatorio' };
  }
  const titulo = valor.trim();
  if (titulo.length > LONGITUD_MAXIMA_TITULO) {
    return { valido: false, error: `El título no puede tener más de ${LONGITUD_MAXIMA_TITULO} caracteres` };
  }
  return { valido: true, titulo };
}

function parsearId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = { validarTitulo, parsearId, LONGITUD_MAXIMA_TITULO };
