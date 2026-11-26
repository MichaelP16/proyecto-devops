// Capa de acceso a datos: único lugar del código que conoce SQL.

function aTarea(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    titulo: fila.titulo,
    completada: Number(fila.completada) === 1,
    creadaEn: fila.creada_en,
  };
}

function crearRepositorioTareas(db) {
  const sql = {
    listar: db.prepare('SELECT id, titulo, completada, creada_en FROM tareas ORDER BY id'),
    obtener: db.prepare('SELECT id, titulo, completada, creada_en FROM tareas WHERE id = ?'),
    insertar: db.prepare('INSERT INTO tareas (titulo) VALUES (?)'),
    alternar: db.prepare('UPDATE tareas SET completada = 1 - completada WHERE id = ?'),
    eliminar: db.prepare('DELETE FROM tareas WHERE id = ?'),
    contar: db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(completada), 0) AS completadas FROM tareas'),
    ping: db.prepare('SELECT 1 AS ok'),
  };

  function obtener(id) {
    return aTarea(sql.obtener.get(id));
  }

  return {
    listar: () => sql.listar.all().map(aTarea),
    obtener,
    crear(titulo) {
      const resultado = sql.insertar.run(titulo);
      return obtener(Number(resultado.lastInsertRowid));
    },
    alternar(id) {
      const resultado = sql.alternar.run(id);
      return resultado.changes > 0 ? obtener(id) : null;
    },
    eliminar: (id) => sql.eliminar.run(id).changes > 0,
    contar() {
      const fila = sql.contar.get();
      return { total: Number(fila.total), completadas: Number(fila.completadas) };
    },
    estaDisponible() {
      try {
        return sql.ping.get().ok === 1;
      } catch {
        return false;
      }
    },
  };
}

module.exports = { crearRepositorioTareas };
