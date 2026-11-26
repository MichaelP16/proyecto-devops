// Frontend: consume la API REST de tareas. Usa textContent (no innerHTML) para evitar XSS.
const lista = document.getElementById('lista');
const formulario = document.getElementById('formulario');
const campoTitulo = document.getElementById('titulo');
const mensaje = document.getElementById('mensaje');
const resumen = document.getElementById('resumen');
const vacio = document.getElementById('vacio');

function mostrarError(texto) {
  mensaje.textContent = texto;
  mensaje.hidden = !texto;
}

async function api(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new Error(cuerpo.error || `Error ${respuesta.status}`);
  }
  return respuesta.status === 204 ? null : respuesta.json();
}

function crearElementoTarea(tarea) {
  const li = document.createElement('li');
  if (tarea.completada) li.className = 'hecha';

  const casilla = document.createElement('input');
  casilla.type = 'checkbox';
  casilla.id = `tarea-${tarea.id}`;
  casilla.checked = tarea.completada;
  casilla.addEventListener('change', () => ejecutar(() => api(`/api/tareas/${tarea.id}`, { method: 'PATCH' })));

  const etiqueta = document.createElement('label');
  etiqueta.htmlFor = casilla.id;
  etiqueta.textContent = tarea.titulo;

  const eliminar = document.createElement('button');
  eliminar.className = 'boton-eliminar';
  eliminar.textContent = 'Eliminar';
  eliminar.setAttribute('aria-label', `Eliminar ${tarea.titulo}`);
  eliminar.addEventListener('click', () => ejecutar(() => api(`/api/tareas/${tarea.id}`, { method: 'DELETE' })));

  li.append(casilla, etiqueta, eliminar);
  return li;
}

async function cargar() {
  const tareas = await api('/api/tareas');
  lista.replaceChildren(...tareas.map(crearElementoTarea));
  const hechas = tareas.filter((t) => t.completada).length;
  resumen.textContent = tareas.length ? `${hechas} de ${tareas.length} completadas` : '';
  vacio.hidden = tareas.length > 0;
}

async function ejecutar(accion) {
  try {
    mostrarError('');
    await accion();
    await cargar();
  } catch (error) {
    mostrarError(error.message);
  }
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  ejecutar(async () => {
    await api('/api/tareas', { method: 'POST', body: JSON.stringify({ titulo: campoTitulo.value }) });
    campoTitulo.value = '';
  });
});

async function comprobarSalud() {
  const estado = document.getElementById('estado');
  try {
    const salud = await api('/health');
    estado.textContent = 'Servidor en línea';
    estado.className = 'estado ok';
    document.getElementById('version').textContent = `versión ${String(salud.version).slice(0, 7)}`;
  } catch {
    estado.textContent = 'Servidor no disponible';
    estado.className = 'estado error';
  }
}

ejecutar(() => Promise.resolve());
comprobarSalud();
