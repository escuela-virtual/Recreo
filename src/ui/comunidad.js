'use strict';

import { el, aviso, sinAcentos } from '../core/util.js';
import { pagina } from './layout.js';
import { plantillaPorId, PLANTILLAS } from '../plantillas.js';
import { iconoPlantilla } from './crear.js';
import { hayNube, esAdmin, listarComunidad, quitarDeComunidad } from '../core/nube.js';

// Actividades que sus autores autorizaron compartir. Cualquiera puede verlas y jugarlas; copiar las guarda en su cuenta o dispositivo.
export async function vistaComunidad(raiz) {
  const main = pagina(raiz);
  if (!hayNube) { main.append(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Comunidad no disponible' }), el('p', { class: 'sub', text: 'Esta copia de la app no está conectada a un servidor.' })])); return; }
  main.append(el('h1', { text: 'Comunidad' }), el('p', { class: 'sub', text: 'Actividades creadas y compartidas por otras personas. Juega, y guarda una copia para adaptarla a tu clase.' }));
  const lista = el('div', { class: 'plantillas-grid' });
  const q = el('input', { attrs: { type: 'search', placeholder: 'Buscar por título o autor' } });
  const tipo = el('select', {}, [el('option', { text: 'Todas las plantillas', attrs: { value: '' } }), ...PLANTILLAS.map((p) => el('option', { text: p.nombre, attrs: { value: p.id } }))]);
  const orden = el('select', {}, [['reciente', 'Más recientes'], ['copias', 'Más copiadas']].map(([v, t]) => el('option', { text: t, attrs: { value: v } })));
  main.append(el('div', { class: 'fila', style: { margin: '14px 0' } }, [q, tipo, orden]), lista);

  let filas = [];
  const admin = await esAdmin();
  const pintar = () => {
    const t = sinAcentos(q.value.trim().toLowerCase());
    const vis = filas.filter((f) => (!tipo.value || f.plantilla === tipo.value) && (!t || sinAcentos(`${f.titulo} ${f.autor}`.toLowerCase()).includes(t)))
      .sort((a, b) => (orden.value === 'copias' ? b.copias - a.copias : 0) || b.publicado - a.publicado);
    lista.replaceChildren(...(vis.length ? vis.map((f) => {
      const p = plantillaPorId(f.plantilla);
      return el('div', { class: 'plt com-tarjeta' }, [
        el('a', { class: 'com-enlace', attrs: { href: `#/comunidad/${f.user_id}/${encodeURIComponent(f.id)}` } }, [iconoPlantilla(p), el('span', { class: 'plt-t' }, [el('b', { text: f.titulo }), el('small', { text: `${p.nombre} · por ${f.autor}` }), el('small', { text: `${f.copias} ${f.copias === 1 ? 'copia' : 'copias'}` })])]),
        admin ? el('button', { class: 'btn btn-peligro btn-mini', text: 'Quitar', attrs: { type: 'button' }, on: { click: async () => {
          if (!confirm(`¿Quitar "${f.titulo}" de la Comunidad?`)) return;
          try { await quitarDeComunidad(f.id, f.user_id); filas = filas.filter((x) => x !== f); pintar(); } catch (e) { aviso('No se pudo quitar: ' + (e.message || e)); }
        } } }) : null
      ]);
    }) : [el('p', { class: 'sub', text: filas.length ? 'Nada coincide con tu búsqueda.' : 'Todavía nadie ha compartido actividades. ¡Sé la primera persona! Al crear una, elige "Sí, compartir".' })]));
  };
  [q, tipo, orden].forEach((c) => c.addEventListener(c === q ? 'input' : 'change', pintar));
  try { filas = await listarComunidad(); } catch (e) { lista.replaceChildren(el('p', { text: 'No se pudo cargar la Comunidad. Revisa tu conexión.' })); return; }
  pintar();
}
