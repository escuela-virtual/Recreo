'use strict';

import { el, aviso, sinAcentos } from '../core/util.js';
import { pagina } from './layout.js';
import { ir } from '../core/router.js';
import { plantillaPorId, PLANTILLAS } from '../plantillas.js';
import { iconoPlantilla } from './crear.js';
import {
  hayNube, usuarioActual, esAdmin, listarComunidad, quitarDeComunidad, valorarActividad, miValoracion, destacarActividad, reportarActividad
} from '../core/nube.js';

const estrellas = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const textoValoracion = (f) => (f.votos ? `${Number(f.promedio).toFixed(1)} ★ (${f.votos})` : 'Sin valoraciones');

// Barra bajo la actividad de la Comunidad: valorar, reportar y, para el administrador, destacar o quitar.
export function barraSocial(fila, admin) {
  const resumen = el('span', { class: 'sub', text: textoValoracion(fila) });
  const botones = [1, 2, 3, 4, 5].map((n) => el('button', { class: 'estrella', attrs: { type: 'button', title: `${n} de 5`, 'aria-label': `Valorar con ${n} estrellas` }, text: '★', on: { click: async () => {
    if (!usuarioActual()) { aviso('Inicia sesión para valorar'); ir('/entrar'); return; }
    try { await valorarActividad(fila.user_id, fila.id, n); pintar(n); aviso('¡Gracias por valorar!'); } catch (e) { aviso('No se pudo valorar: ' + (e.message || e)); }
  } } }));
  const pintar = (mia) => botones.forEach((b, i) => b.classList.toggle('on', i < mia));
  if (usuarioActual()) miValoracion(fila.user_id, fila.id).then(pintar).catch(() => {});

  const reportar = () => {
    const motivo = el('textarea', { attrs: { rows: 4, maxlength: 300, placeholder: 'Cuéntanos qué pasa (contenido inapropiado, errores, copia de otra obra…)' }, style: { width: '100%' } });
    const fondo = el('div', { class: 'modal-fondo', on: { click: (e) => { if (e.target === fondo) fondo.remove(); } } }, [el('div', { class: 'modal' }, [
      el('h2', { text: 'Reportar esta actividad' }), el('p', { class: 'sub', text: 'Un administrador la revisará. No se comparte tu identidad con el autor.' }), motivo,
      el('div', { class: 'acciones' }, [
        el('button', { class: 'btn btn-claro', text: 'Cancelar', on: { click: () => fondo.remove() } }),
        el('button', { class: 'btn', text: 'Enviar reporte', on: { click: async () => {
          if (!motivo.value.trim()) { motivo.focus(); return; }
          try { await reportarActividad(fila.user_id, fila.id, motivo.value.trim()); fondo.remove(); aviso('Reporte enviado. ¡Gracias!'); } catch (e) { aviso('No se pudo enviar: ' + (e.message || e)); }
        } } })
      ])
    ])]);
    document.body.appendChild(fondo); motivo.focus();
  };

  const adminBtns = admin ? [
    el('button', { class: 'btn btn-claro btn-mini', attrs: { type: 'button' }, text: fila.destacada ? 'Quitar destacado' : 'Destacar', on: { click: async (e) => {
      try { await destacarActividad(fila.user_id, fila.id, !fila.destacada); fila.destacada = !fila.destacada; e.target.textContent = fila.destacada ? 'Quitar destacado' : 'Destacar'; aviso(fila.destacada ? 'Marcada como destacada' : 'Ya no es destacada'); } catch (er) { aviso('No se pudo cambiar: ' + (er.message || er)); }
    } } }),
    el('button', { class: 'btn btn-peligro btn-mini', attrs: { type: 'button' }, text: 'Quitar de la Comunidad', on: { click: async () => {
      if (!confirm('¿Quitar esta actividad de la Comunidad?')) return;
      try { await quitarDeComunidad(fila.id, fila.user_id); aviso('Actividad retirada'); ir('/comunidad'); } catch (er) { aviso('No se pudo quitar: ' + (er.message || er)); }
    } } })
  ] : [];
  return el('div', { class: 'tarjeta barra-social' }, [
    el('div', { class: 'fila' }, [el('b', { text: 'Valórala:' }), el('span', { class: 'estrellas' }, botones), resumen, el('span', { class: 'esp' }),
      el('button', { class: 'enlace-btn', attrs: { type: 'button' }, text: '⚑ Reportar', on: { click: reportar } }), ...adminBtns])
  ]);
}

// Actividades que sus autores autorizaron compartir. Cualquiera puede verlas y jugarlas; copiar las guarda en su cuenta o dispositivo.
export async function vistaComunidad(raiz) {
  const main = pagina(raiz);
  if (!hayNube) { main.append(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Comunidad no disponible' }), el('p', { class: 'sub', text: 'Esta copia de la app no está conectada a un servidor.' })])); return; }
  main.append(el('h1', { text: 'Comunidad' }), el('p', { class: 'sub', text: 'Actividades creadas y compartidas por otras personas. Juega, valora y guarda una copia para adaptarla a tu clase.' }));
  const lista = el('div', { class: 'plantillas-grid' });
  const chips = el('div', { class: 'chips' });
  const q = el('input', { attrs: { type: 'search', placeholder: 'Buscar por título, autor o etiqueta' } });
  const tipo = el('select', {}, [el('option', { text: 'Todas las plantillas', attrs: { value: '' } }), ...PLANTILLAS.map((p) => el('option', { text: p.nombre, attrs: { value: p.id } }))]);
  const orden = el('select', {}, [['destacadas', 'Destacadas primero'], ['reciente', 'Más recientes'], ['valoradas', 'Mejor valoradas'], ['copias', 'Más copiadas']].map(([v, t]) => el('option', { text: t, attrs: { value: v } })));
  main.append(el('div', { class: 'fila', style: { margin: '14px 0 8px' } }, [q, tipo, orden]), chips, lista);

  let filas = [], etiqueta = '';
  const admin = await esAdmin();
  const pintarChips = () => {
    const cuenta = new Map();
    filas.forEach((f) => (f.etiquetas || []).forEach((t) => cuenta.set(t, (cuenta.get(t) || 0) + 1)));
    const top = [...cuenta].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, 14).map(([t]) => t);
    chips.replaceChildren(...(top.length ? [el('button', { class: 'etiqueta-btn' + (etiqueta ? '' : ' act'), attrs: { type: 'button' }, text: 'Todas', on: { click: () => { etiqueta = ''; pintarChips(); pintar(); } } }),
      ...top.map((t) => el('button', { class: 'etiqueta-btn' + (etiqueta === t ? ' act' : ''), attrs: { type: 'button' }, text: t, on: { click: () => { etiqueta = etiqueta === t ? '' : t; pintarChips(); pintar(); } } }))] : []));
  };
  const pintar = () => {
    const t = sinAcentos(q.value.trim().toLowerCase());
    const vis = filas.filter((f) => (!tipo.value || f.plantilla === tipo.value) && (!etiqueta || (f.etiquetas || []).includes(etiqueta)) && (!t || sinAcentos(`${f.titulo} ${f.autor} ${(f.etiquetas || []).join(' ')}`.toLowerCase()).includes(t)))
      .sort((a, b) => (orden.value === 'destacadas' ? Number(b.destacada) - Number(a.destacada) : 0)
        || (orden.value === 'valoradas' ? (b.promedio * Math.min(b.votos, 5)) - (a.promedio * Math.min(a.votos, 5)) : 0)
        || (orden.value === 'copias' ? b.copias - a.copias : 0) || b.publicado - a.publicado);
    lista.replaceChildren(...(vis.length ? vis.map((f) => {
      const p = plantillaPorId(f.plantilla);
      if (!p) return null;
      return el('div', { class: 'plt com-tarjeta' + (f.destacada ? ' destacada' : '') }, [
        el('a', { class: 'com-enlace', attrs: { href: `#/comunidad/${f.user_id}/${encodeURIComponent(f.id)}` } }, [iconoPlantilla(p), el('span', { class: 'plt-t' }, [
          el('b', { text: f.titulo }), el('small', { text: `${p.nombre} · por ${f.autor}` }),
          el('small', { class: 'com-meta' }, [f.destacada ? el('span', { class: 'insignia', text: '★ Destacada' }) : '', f.votos ? el('span', { class: 'com-estrellas', text: `${estrellas(f.promedio)} ${Number(f.promedio).toFixed(1)} (${f.votos})` }) : '', `${f.copias} ${f.copias === 1 ? 'copia' : 'copias'}`])
        ])]),
        admin ? el('button', { class: 'btn btn-peligro btn-mini', text: 'Quitar', attrs: { type: 'button' }, on: { click: async () => {
          if (!confirm(`¿Quitar "${f.titulo}" de la Comunidad?`)) return;
          try { await quitarDeComunidad(f.id, f.user_id); filas = filas.filter((x) => x !== f); pintarChips(); pintar(); } catch (e) { aviso('No se pudo quitar: ' + (e.message || e)); }
        } } }) : null
      ]);
    }).filter(Boolean) : [el('p', { class: 'sub', text: filas.length ? 'Nada coincide con tu búsqueda.' : 'Todavía nadie ha compartido actividades. ¡Sé la primera persona! Al crear una, elige "Sí, compartir".' })]));
  };
  [q, tipo, orden].forEach((c) => c.addEventListener(c === q ? 'input' : 'change', pintar));
  try { filas = await listarComunidad(); } catch (e) { lista.replaceChildren(el('p', { text: 'No se pudo cargar la Comunidad. Revisa tu conexión.' })); return; }
  pintarChips(); pintar();
}
