'use strict';

import { el, limpiar, uid, aviso, sinAcentos } from '../core/util.js';
import { pagina } from './layout.js';
import { actividades, pref } from '../core/almacen.js';
import { plantillaPorId } from '../plantillas.js';
import { iconoPlantilla } from './crear.js';
import { descargar } from './acciones.js';
import { cuenta } from '../core/contenido.js';

// Importa un archivo .ajuega.json (o JSON de actividad) como actividad nueva.
export async function importarArchivo() {
  return new Promise((ok) => {
    const i = el('input', { attrs: { type: 'file', accept: '.json,application/json' } });
    i.onchange = async () => {
      const f = i.files[0]; if (!f) return ok(null);
      try {
        const d = JSON.parse(await f.text());
        if (!plantillaPorId(d.plantilla) || !d.tipo || d.contenido == null) throw new Error('formato');
        const act = { ...d, id: uid(), creado: Date.now(), modificado: Date.now(), publica: false };
        await actividades.guardar(act); ok(act);
      } catch (_) { aviso('El archivo no es una actividad válida'); ok(null); }
    };
    i.oncancel = () => ok(null);
    i.click();
  });
}

export async function copiarActividad(base) {
  const act = { ...JSON.parse(JSON.stringify(base)), id: uid(), creado: Date.now(), modificado: Date.now(), titulo: base.titulo + ' (copia)' };
  delete act.tarea; delete act.papelera; delete act.carpeta;
  await actividades.guardar(act);
  return act;
}

const ORDENES = [['modificadas', 'Modificadas'], ['nombre', 'Nombre'], ['jugada', 'Última vez que se jugó']];
const DIAS_PAPELERA = 30;

export async function vistaMis(raiz) {
  const main = pagina(raiz);
  const grid = el('div', { class: 'mis-grid' });
  const lateral = el('div', { class: 'mis-carpetas' });
  let todas = [], q = '', orden = pref.leer('mis:orden', 'modificadas'), carpeta = '', papelera = false;
  const carpetasGuardadas = () => pref.leer('carpetas', []);

  async function cargar() {
    todas = await actividades.todos();
    // la papelera se vacía sola tras 30 días
    const limite = Date.now() - DIAS_PAPELERA * 864e5;
    for (const a of todas.filter((x) => x.papelera && x.papelera < limite)) await actividades.borrar(a.id);
    todas = todas.filter((a) => !a.papelera || a.papelera >= limite);
    pintar();
  }
  const guardar = async (a, cambios) => { Object.assign(a, cambios, { modificado: cambios.papelera !== undefined ? a.modificado : Date.now() }); await actividades.guardar(a); cargar(); };

  function pintarCarpetas() {
    limpiar(lateral);
    const nombres = [...new Set([...carpetasGuardadas(), ...todas.filter((a) => a.carpeta && !a.papelera).map((a) => a.carpeta)])].sort((a, b) => a.localeCompare(b, 'es'));
    const n = (c) => todas.filter((a) => !a.papelera && (c === '' ? true : a.carpeta === c)).length;
    const item = (txt, c, activo, cuentaN) => el('button', { class: 'carpeta' + (activo ? ' act' : ''), on: { click: () => { carpeta = c; papelera = false; pintar(); } } }, [el('span', { text: txt }), cuentaN != null ? el('small', { text: String(cuentaN) }) : null]);
    lateral.append(item('Todas mis actividades', '', !papelera && carpeta === '', n('')), ...nombres.map((c) => item(c, c, !papelera && carpeta === c, n(c))),
      el('button', { class: 'carpeta' + (papelera ? ' act' : ''), on: { click: () => { papelera = true; pintar(); } } }, [el('span', { text: 'Papelera de reciclaje' }), el('small', { text: String(todas.filter((a) => a.papelera).length) })]));
  }

  function pintar() {
    pintarCarpetas(); limpiar(grid);
    const f = sinAcentos(q).toLowerCase();
    let l = todas.filter((a) => !!a.papelera === papelera && (papelera || !carpeta || a.carpeta === carpeta) && (!f || sinAcentos(a.titulo + ' ' + (a.etiquetas || []).join(' ')).toLowerCase().includes(f)));
    const clave = { modificadas: (a) => -a.modificado, jugada: (a) => -(a.jugado || 0), nombre: (a) => a.titulo.toLowerCase() }[orden];
    l = l.sort((a, b) => (typeof clave(a) === 'string' ? clave(a).localeCompare(clave(b), 'es') : clave(a) - clave(b)));
    if (!todas.length) { grid.append(el('div', { class: 'vacio' }, [el('p', { text: 'Todavía no has creado ninguna actividad.' }), el('a', { class: 'btn btn-grande', text: 'Crear mi primera actividad', attrs: { href: '#/crear' } })])); return; }
    if (!l.length) grid.append(el('p', { class: 'sub', text: papelera ? 'La papelera está vacía.' : 'No hay actividades aquí.' }));
    const carpetas = [...new Set([...carpetasGuardadas(), ...todas.map((a) => a.carpeta).filter(Boolean)])];
    l.forEach((a) => {
      const p = plantillaPorId(a.plantilla); if (!p) return;
      const acciones = papelera ? [
        el('button', { class: 'btn btn-mini', text: 'Restaurar', on: { click: () => { delete a.papelera; guardar(a, {}); aviso('Actividad restaurada'); } } }),
        el('button', { class: 'btn btn-peligro btn-mini', text: 'Eliminar para siempre', on: { click: async () => { if (confirm(`¿Eliminar "${a.titulo}" para siempre? No se puede deshacer.`)) { await actividades.borrar(a.id); cargar(); } } } })
      ] : [
        el('a', { class: 'btn btn-mini', text: '▶ Jugar', attrs: { href: '#/a/' + a.id } }),
        el('a', { class: 'btn btn-claro btn-mini', text: 'Editar', attrs: { href: '#/editar/' + a.id } }),
        el('button', { class: 'btn btn-claro btn-mini', text: 'Cambiar nombre', on: { click: () => { const n = prompt('Nuevo nombre de la actividad:', a.titulo); if (n && n.trim()) guardar(a, { titulo: n.trim().slice(0, 80) }); } } }),
        el('select', { class: 'mover', attrs: { title: 'Mover a una carpeta' }, on: { change: (e) => { guardar(a, { carpeta: e.target.value || undefined }); } } },
          [el('option', { attrs: { value: '' }, text: 'Sin carpeta' }), ...carpetas.map((c) => el('option', { attrs: { value: c, selected: a.carpeta === c }, text: c }))]),
        el('button', { class: 'btn btn-claro btn-mini', text: 'Duplicar', on: { click: async () => { await copiarActividad(a); aviso('Actividad duplicada'); cargar(); } } }),
        el('button', { class: 'btn btn-claro btn-mini', text: '⬇', attrs: { title: 'Descargar archivo' }, on: { click: () => descargar(a) } }),
        el('button', { class: 'btn btn-peligro btn-mini', text: '🗑', attrs: { title: 'Mover a la papelera' }, on: { click: () => { guardar(a, { papelera: Date.now() }); aviso('Movida a la papelera (se conserva 30 días)'); } } })
      ];
      grid.append(el('div', { class: 'mis-card' }, [
        el('a', { class: 'mis-top', attrs: { href: papelera ? '#/mis' : '#/a/' + a.id } }, [iconoPlantilla(p), el('div', {}, [el('b', { text: a.titulo }), el('small', { text: `${p.nombre} · ${cuenta(a.tipo, a.contenido)} elementos` })])]),
        el('div', { class: 'mis-fecha sub', text: (a.carpeta ? '📁 ' + a.carpeta + ' · ' : '') + 'Modificada ' + new Date(a.modificado).toLocaleDateString('es') + (a.jugado ? ' · Jugada ' + new Date(a.jugado).toLocaleDateString('es') : '') }),
        el('div', { class: 'fila' }, acciones)
      ]));
    });
  }

  const selOrden = el('select', { on: { change: (e) => { orden = e.target.value; pref.guardar('mis:orden', orden); pintar(); } } }, ORDENES.map(([v, t]) => el('option', { attrs: { value: v, selected: v === orden }, text: t })));
  main.append(el('div', { class: 'tarjeta' }, [
    el('div', { class: 'fila entre' }, [el('h2', { text: 'Mis actividades' }), el('div', { class: 'fila' }, [
      el('button', { class: 'btn btn-claro', text: 'Nueva carpeta', on: { click: () => { const n = (prompt('Nombre de la carpeta:') || '').trim().slice(0, 40); if (!n) return; const l = carpetasGuardadas(); if (!l.includes(n)) pref.guardar('carpetas', [...l, n]); carpeta = n; papelera = false; pintar(); } } }),
      el('a', { class: 'btn btn-claro', text: 'Listas de reproducción', attrs: { href: '#/listas' } }),
      el('button', { class: 'btn btn-claro', text: 'Importar archivo', on: { click: async () => { if (await importarArchivo()) { aviso('Actividad importada'); cargar(); } } } }),
      el('a', { class: 'btn', text: '+ Crear actividad', attrs: { href: '#/crear' } })])]),
    el('div', { class: 'fila', style: { margin: '14px 0' } }, [el('div', { style: { flex: 1, minWidth: '200px' } }, [el('input', { attrs: { type: 'search', placeholder: 'Buscar en mis actividades…' }, on: { input: (e) => { q = e.target.value; pintar(); } } })]), el('label', { class: 'sub', text: 'Ordenar por:' }), selOrden]),
    el('div', { class: 'mis-layout' }, [lateral, grid])
  ]));
  cargar();
  const alSync = () => cargar();
  window.addEventListener('recreo-sync', alSync);
  return () => window.removeEventListener('recreo-sync', alSync);
}
