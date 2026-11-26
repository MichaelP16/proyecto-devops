// Integración entre el repositorio y una base SQLite real (archivo en disco y en memoria).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { abrirBaseDeDatos } = require('../../src/db');
const { crearRepositorioTareas } = require('../../src/repositories/tareasRepository');

describe('repositorio de tareas con SQLite', () => {
  let db;
  let repo;

  beforeEach(() => {
    db = abrirBaseDeDatos(':memory:');
    repo = crearRepositorioTareas(db);
  });

  afterEach(() => db.close());

  test('crea, lista, alterna y elimina tareas', () => {
    const tarea = repo.crear('Escribir pruebas');
    expect(tarea).toMatchObject({ id: 1, titulo: 'Escribir pruebas', completada: false });

    expect(repo.alternar(1).completada).toBe(true);
    expect(repo.listar()).toHaveLength(1);
    expect(repo.contar()).toEqual({ total: 1, completadas: 1 });

    expect(repo.eliminar(1)).toBe(true);
    expect(repo.listar()).toHaveLength(0);
  });

  test('devuelve null o false cuando la tarea no existe', () => {
    expect(repo.obtener(99)).toBeNull();
    expect(repo.alternar(99)).toBeNull();
    expect(repo.eliminar(99)).toBe(false);
  });

  test('informa si la base de datos está disponible', () => {
    expect(repo.estaDisponible()).toBe(true);
    db.close();
    expect(repo.estaDisponible()).toBe(false);
    db = abrirBaseDeDatos(':memory:'); // para que afterEach pueda cerrar sin error
  });
});

describe('persistencia en archivo', () => {
  test('los datos sobreviven a un reinicio de la aplicación', () => {
    const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'tareas-'));
    const archivo = path.join(carpeta, 'sub', 'tareas.db');

    const db1 = abrirBaseDeDatos(archivo);
    crearRepositorioTareas(db1).crear('Persistir datos');
    db1.close();

    const db2 = abrirBaseDeDatos(archivo);
    const tareas = crearRepositorioTareas(db2).listar();
    db2.close();
    fs.rmSync(carpeta, { recursive: true, force: true });

    expect(tareas).toHaveLength(1);
    expect(tareas[0].titulo).toBe('Persistir datos');
  });
});
