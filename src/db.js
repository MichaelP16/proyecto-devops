// Conexión a SQLite usando el módulo nativo de Node.js (node:sqlite): sin dependencias que compilar.
const fs = require('fs');
const path = require('path');

// process.getBuiltinModule evita que Jest intente resolver 'node:sqlite' (módulo que solo existe con prefijo).
const { DatabaseSync } = typeof process.getBuiltinModule === 'function'
  ? process.getBuiltinModule('node:sqlite')
  : require('node:sqlite');

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS tareas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo     TEXT    NOT NULL,
    completada INTEGER NOT NULL DEFAULT 0,
    creada_en  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`;

/**
 * Abre (o crea) la base de datos y aplica el esquema.
 * @param {string} archivo Ruta del archivo .db o ':memory:' para pruebas.
 */
function abrirBaseDeDatos(archivo = ':memory:') {
  if (archivo !== ':memory:') {
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
  }
  const db = new DatabaseSync(archivo);
  db.exec(ESQUEMA);
  return db;
}

module.exports = { abrirBaseDeDatos };
