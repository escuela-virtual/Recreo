'use strict';

import { el, limpiar, aviso, fmtTiempo } from '../core/util.js';
import { pagina } from './layout.js';
import { ir } from '../core/router.js';
import { urlBase } from '../core/codec.js';
import { descargarCSV } from '../core/csv.js';
import { plantillaPorId } from '../plantillas.js';
import { pref, resultados } from '../core/almacen.js';
import {
  usuarioActual, listarClases, crearClase, borrarClase, listarTareas, cambiarTarea, borrarTarea, entregasDe, borrarEntrega, tareasDeClase
} from '../core/nube.js';

const fechaHora = (t) => new Date(t).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
const estadoTarea = (t) => (t.cerrada ? 'Cerrada' : t.limite && Date.now() > t.limite ? 'Vencida' : t.limite ? 'Abierta · hasta ' + fechaHora(t.limite) : 'Abierta');
const nombrePlantilla = (id) => (plantillaPorId(id) || { nombre: id }).nombre;
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); aviso('Copiado al portapapeles'); } catch (_) { aviso('No se pudo copiar; selecciónalo y usa Ctrl+C'); }
}
const requiereSesion = () => { if (!usuarioActual()) { ir('/entrar'); return false; } return true; };
const tabla = (cabeceras, filas) => el('div', { class: 'tabla-scroll' }, [el('table', { class: 'tabla' }, [
  el('thead', {}, [el('tr', {}, cabeceras.map((t) => el('th', { text: t })))]),
  el('tbody', {}, filas)
])]);

// ---------------------------------------------------------------------------
// Profesor: lista de clases y tareas
// ---------------------------------------------------------------------------
export async function vistaClases(raiz) {
  if (!requiereSesion()) return;
  const main = pagina(raiz);
  const cuerpo = el('div');
  main.append(el('h1', { text: 'Clases y tareas' }), el('p', { class: 'sub', text: 'Crea una clase, pásale su código a tus alumnos y asígnale tareas. Los alumnos no necesitan cuenta.' }), cuerpo);

  async function pintar() {
    cuerpo.replaceChildren(el('p', { class: 'sub', text: 'Cargando…' }));
    let clases, tareas, entregas = [];
    try {
      [clases, tareas] = await Promise.all([listarClases(), listarTareas()]);
      if (tareas.length) entregas = await entregasDe(tareas.map((t) => t.id));
    } catch (e) { cuerpo.replaceChildren(el('div', { class: 'tarjeta' }, [el('p', { text: 'No se pudo cargar: ' + (e.message || e) })])); return; }
    const nEntregas = (id) => entregas.filter((e) => e.tarea_id === id).length;
    const campo = el('input', { attrs: { type: 'text', placeholder: 'Nombre de la clase (ej.: 5.º A)', maxlength: 80 }, style: { flex: '1 1 260px', width: 'auto' } });
    const crear = async () => {
      if (!campo.value.trim()) { campo.focus(); return; }
      try { await crearClase(campo.value); pintar(); } catch (e) { aviso('No se pudo crear: ' + (e.message || e)); }
    };
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') crear(); });

    const tarjetasClase = clases.map((c) => {
      const propias = tareas.filter((t) => t.clase_id === c.id);
      const enlace = `${urlBase()}#/clase/${c.codigo}`;
      return el('div', { class: 'tarjeta clase' }, [
        el('div', { class: 'fila entre' }, [el('h3', { text: c.nombre }), el('span', { class: 'clase-codigo', text: c.codigo, attrs: { title: 'Código de la clase' } })]),
        el('p', { class: 'sub', text: `${propias.length} tarea(s) · ${propias.reduce((n, t) => n + nEntregas(t.id), 0)} entrega(s)` }),
        el('p', { class: 'sub', html: 'Tus alumnos entran en <b>' + enlace.replace(/^https?:\/\//, '') + '</b> y ven sus tareas.' }),
        el('div', { class: 'fila' }, [
          el('button', { class: 'btn btn-mini', attrs: { type: 'button' }, text: 'Copiar enlace de la clase', on: { click: () => copiar(enlace) } }),
          el('a', { class: 'btn btn-claro btn-mini', text: 'Ver resultados', attrs: { href: '#/clases/' + c.id } }),
          el('button', { class: 'btn btn-peligro btn-mini', attrs: { type: 'button' }, text: 'Eliminar', on: { click: async () => {
            if (!confirm(`¿Eliminar la clase "${c.nombre}"? Sus tareas se conservan, pero dejan de estar en la clase.`)) return;
            try { await borrarClase(c.id); pintar(); } catch (e) { aviso('No se pudo eliminar: ' + (e.message || e)); }
          } } })
        ])
      ]);
    });

    const nombreClase = (id) => (clases.find((c) => c.id === id) || {}).nombre || '—';
    cuerpo.replaceChildren(
      el('div', { class: 'tarjeta' }, [el('h2', { text: 'Mis clases' }), el('div', { class: 'fila' }, [campo, el('button', { class: 'btn', attrs: { type: 'button' }, text: 'Crear clase', on: { click: crear } })])]),
      ...tarjetasClase,
      el('div', { class: 'tarjeta' }, [
        el('h2', { text: 'Mis tareas' }),
        tareas.length
          ? tabla(['Tarea', 'Plantilla', 'Clase', 'Estado', 'Entregas', ''], tareas.map((t) => el('tr', {}, [
            el('td', { text: t.titulo }), el('td', { text: nombrePlantilla(t.plantilla) }), el('td', { text: nombreClase(t.clase_id) }), el('td', { text: estadoTarea(t) }), el('td', { text: String(nEntregas(t.id)) }),
            el('td', {}, [el('a', { class: 'btn btn-claro btn-mini', text: 'Resultados', attrs: { href: '#/tarea/' + t.id } })])
          ])))
          : el('p', { class: 'sub', html: 'Todavía no tienes tareas. Abre una de tus actividades y pulsa <b>Definir tarea</b>.' })
      ])
    );
  }
  pintar();
}

// ---------------------------------------------------------------------------
// Profesor: resultados de una tarea
// ---------------------------------------------------------------------------
export async function vistaResultadosTarea(raiz, params) {
  if (!requiereSesion()) return;
  const main = pagina(raiz);
  const cuerpo = el('div');
  main.append(cuerpo);

  async function pintar() {
    cuerpo.replaceChildren(el('p', { class: 'sub', text: 'Cargando…' }));
    let t, lista;
    try {
      t = (await listarTareas()).find((x) => x.id === params.id);
      if (!t) { cuerpo.replaceChildren(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Tarea no encontrada' }), el('a', { class: 'btn', text: 'Volver', attrs: { href: '#/clases' } })])); return; }
      lista = await entregasDe([t.id]);
    } catch (e) { cuerpo.replaceChildren(el('div', { class: 'tarjeta' }, [el('p', { text: 'No se pudo cargar: ' + (e.message || e) })])); return; }
    const enlace = `${urlBase()}#/t/${t.id}`;
    const alumnos = new Set(lista.map((e) => e.nombre.trim().toLowerCase())).size;
    const prom = lista.length ? Math.round(lista.reduce((n, e) => n + e.puntos, 0) / lista.length) : 0;
    cuerpo.replaceChildren(
      el('div', { class: 'fila entre' }, [el('h1', { text: t.titulo }), el('a', { class: 'enlace-btn', text: '← Clases y tareas', attrs: { href: '#/clases' } })]),
      el('div', { class: 'tarjeta' }, [
        el('p', { class: 'sub', text: `${nombrePlantilla(t.plantilla)} · ${estadoTarea(t)}` }),
        el('div', { class: 'esc-resumen' }, [
          el('div', { class: 'adm-dato' }, [el('b', { text: String(alumnos) }), el('span', { text: 'Alumnos' })]),
          el('div', { class: 'adm-dato' }, [el('b', { text: String(lista.length) }), el('span', { text: 'Entregas' })]),
          el('div', { class: 'adm-dato' }, [el('b', { text: String(prom) }), el('span', { text: 'Puntos (promedio)' })])
        ]),
        el('div', { class: 'fila', style: { marginTop: '12px' } }, [
          el('button', { class: 'btn btn-mini', attrs: { type: 'button' }, text: 'Copiar enlace', on: { click: () => copiar(enlace) } }),
          el('button', { class: 'btn btn-claro btn-mini', attrs: { type: 'button' }, text: 'Actualizar', on: { click: pintar } }),
          el('button', { class: 'btn btn-claro btn-mini', attrs: { type: 'button' }, text: 'Descargar en Excel', on: { click: () => descargarCSV(`${t.titulo}.csv`, [['Nombre', 'Puntos', 'Aciertos', 'Errores', 'Segundos', 'Fecha'], ...lista.map((e) => [e.nombre, e.puntos, e.aciertos, e.errores, e.segundos, new Date(e.creada).toISOString()])]) } }),
          el('button', { class: 'btn btn-claro btn-mini', attrs: { type: 'button' }, text: t.cerrada ? 'Reabrir tarea' : 'Cerrar tarea', on: { click: async () => { try { await cambiarTarea(t.id, { cerrada: !t.cerrada }); pintar(); } catch (e) { aviso('No se pudo cambiar: ' + (e.message || e)); } } } }),
          el('button', { class: 'btn btn-peligro btn-mini', attrs: { type: 'button' }, text: 'Eliminar tarea', on: { click: async () => {
            if (!confirm('¿Eliminar la tarea y todos sus resultados?')) return;
            try { await borrarTarea(t.id); ir('/clases'); } catch (e) { aviso('No se pudo eliminar: ' + (e.message || e)); }
          } } })
        ])
      ]),
      el('div', { class: 'tarjeta' }, [
        el('h2', { text: 'Resultados' }),
        lista.length
          ? tabla(['Nombre', 'Puntos', 'Aciertos', 'Errores', 'Tiempo', 'Fecha', ''], lista.map((e) => el('tr', {}, [
            el('td', { text: e.nombre }), el('td', { text: String(e.puntos) }), el('td', { text: String(e.aciertos) }), el('td', { text: String(e.errores) }), el('td', { text: fmtTiempo(e.segundos) }), el('td', { text: fechaHora(e.creada) }),
            el('td', {}, [el('button', { class: 'ed-quitar', attrs: { type: 'button', title: 'Quitar esta entrega' }, text: '✕', on: { click: async () => { try { await borrarEntrega(e.id); pintar(); } catch (er) { aviso('No se pudo quitar: ' + (er.message || er)); } } } })])
          ])))
          : el('p', { class: 'sub', text: 'Todavía nadie ha entregado esta tarea. Comparte el enlace con tus alumnos y los resultados aparecerán aquí.' })
      ])
    );
  }
  pintar();
}

// ---------------------------------------------------------------------------
// Profesor: resultados de toda una clase (alumno × tarea)
// ---------------------------------------------------------------------------
export async function vistaClase(raiz, params) {
  if (!requiereSesion()) return;
  const main = pagina(raiz);
  const cuerpo = el('div', {}, [el('p', { class: 'sub', text: 'Cargando…' })]);
  main.append(cuerpo);
  try {
    const clase = (await listarClases()).find((c) => c.id === params.id);
    if (!clase) { cuerpo.replaceChildren(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Clase no encontrada' }), el('a', { class: 'btn', text: 'Volver', attrs: { href: '#/clases' } })])); return; }
    const tareas = (await listarTareas()).filter((t) => t.clase_id === clase.id).reverse();
    const entregas = tareas.length ? await entregasDe(tareas.map((t) => t.id)) : [];
    // mejor puntuación de cada alumno en cada tarea (se agrupa por nombre sin distinguir mayúsculas)
    const alumnos = new Map();
    for (const e of entregas) {
      const k = e.nombre.trim().toLowerCase();
      if (!alumnos.has(k)) alumnos.set(k, { nombre: e.nombre.trim(), por: {} });
      const a = alumnos.get(k); a.por[e.tarea_id] = Math.max(a.por[e.tarea_id] ?? -1, e.puntos);
    }
    const filas = [...alumnos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const total = (a) => Object.values(a.por).reduce((n, v) => n + v, 0);
    cuerpo.replaceChildren(
      el('div', { class: 'fila entre' }, [el('h1', { text: clase.nombre }), el('a', { class: 'enlace-btn', text: '← Clases y tareas', attrs: { href: '#/clases' } })]),
      el('div', { class: 'tarjeta' }, [
        el('p', { html: `Código de la clase: <b class="clase-codigo">${clase.codigo}</b> · Enlace para alumnos: <b>${urlBase().replace(/^https?:\/\//, '')}#/clase/${clase.codigo}</b>` }),
        el('div', { class: 'fila' }, [
          el('button', { class: 'btn btn-mini', attrs: { type: 'button' }, text: 'Copiar enlace', on: { click: () => copiar(`${urlBase()}#/clase/${clase.codigo}`) } }),
          el('button', { class: 'btn btn-claro btn-mini', attrs: { type: 'button' }, text: 'Descargar en Excel', on: { click: () => descargarCSV(`${clase.nombre}.csv`, [['Alumno', ...tareas.map((t) => t.titulo), 'Total'], ...filas.map((a) => [a.nombre, ...tareas.map((t) => a.por[t.id] ?? ''), total(a)])]) } })
        ])
      ]),
      el('div', { class: 'tarjeta' }, [
        el('h2', { text: 'Puntos por alumno' }),
        !tareas.length ? el('p', { class: 'sub', html: 'Esta clase aún no tiene tareas. Abre una actividad, pulsa <b>Definir tarea</b> y elige esta clase.' })
          : !filas.length ? el('p', { class: 'sub', text: 'Todavía no hay entregas. Muestra la mejor puntuación de cada alumno en cada tarea.' })
            : tabla(['Alumno', ...tareas.map((t) => t.titulo), 'Total'], filas.map((a) => el('tr', {}, [el('td', { text: a.nombre }), ...tareas.map((t) => el('td', { text: a.por[t.id] != null ? String(a.por[t.id]) : '—' })), el('td', { text: String(total(a)) })])))
      ]),
      el('div', { class: 'tarjeta' }, [el('h2', { text: 'Tareas de la clase' }), tareas.length ? tabla(['Tarea', 'Estado', ''], tareas.map((t) => el('tr', {}, [el('td', { text: t.titulo }), el('td', { text: estadoTarea(t) }), el('td', {}, [el('a', { class: 'btn btn-claro btn-mini', text: 'Resultados', attrs: { href: '#/tarea/' + t.id } })])]))) : el('p', { class: 'sub', text: 'Sin tareas.' })])
    );
  } catch (e) { cuerpo.replaceChildren(el('div', { class: 'tarjeta' }, [el('p', { text: 'No se pudo cargar: ' + (e.message || e) })])); }
}

// ---------------------------------------------------------------------------
// Alumno (sin cuenta): tareas de su clase con el código
// ---------------------------------------------------------------------------
export async function vistaClaseAlumno(raiz, params) {
  const main = pagina(raiz);
  const cuerpo = el('div', {}, [el('p', { class: 'sub', text: 'Cargando…' })]);
  main.append(cuerpo);
  let c = null;
  try { c = await tareasDeClase(params.codigo); } catch (_) { cuerpo.replaceChildren(el('div', { class: 'tarjeta' }, [el('h2', { text: 'No se pudo abrir la clase' }), el('p', { class: 'sub', text: 'Revisa tu conexión a internet e inténtalo de nuevo.' })])); return; }
  if (!c) { cuerpo.replaceChildren(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Clase no encontrada' }), el('p', { class: 'sub', text: 'Revisa que el código esté bien escrito.' })])); return; }
  const hechas = new Set((await resultados.todos()).map((r) => r.actId)); // las que este dispositivo ya jugó
  cuerpo.replaceChildren(
    el('h1', { text: c.nombre }), el('p', { class: 'sub', text: 'Elige una tarea para empezar. Tu resultado se envía solo a tu profesor al terminar.' }),
    ...(c.tareas.length ? c.tareas.map((t) => {
      const cerrada = t.cerrada || (t.limite && Date.now() > t.limite);
      return el(cerrada ? 'div' : 'a', { class: 'tarjeta tarea-alumno' + (cerrada ? ' cerrada' : ''), attrs: cerrada ? {} : { href: '#/t/' + t.id } }, [
        el('div', {}, [el('h3', { text: t.titulo }), el('small', { class: 'sub', text: nombrePlantilla(t.plantilla) + (t.limite ? ' · hasta ' + fechaHora(t.limite) : '') })]),
        el('span', { class: 'etiqueta', text: cerrada ? 'Cerrada' : hechas.has(t.id) ? '✔ Hecha' : 'Pendiente' })
      ]);
    }) : [el('div', { class: 'tarjeta' }, [el('p', { class: 'sub', text: 'Tu profesor todavía no ha puesto tareas en esta clase.' })])])
  );
}
