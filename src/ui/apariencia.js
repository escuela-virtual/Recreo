'use strict';

import { el } from '../core/util.js';
import { COLORES, colorActual, temaActual, fijarColor, fijarTema, marcarAparienciaElegida } from '../core/tema.js';

// Selector de modo (claro/oscuro) y color. Lo usan la ventana de bienvenida y el perfil.
export function panelApariencia() {
  const caja = el('div', { class: 'apar' });
  const pintar = () => caja.replaceChildren(
    el('h3', { text: 'Modo' }),
    el('div', { class: 'apar-modos' }, [['claro', '☀', 'Claro'], ['oscuro', '☾', 'Oscuro']].map(([id, ico, t]) =>
      el('button', { class: 'apar-modo apar-' + id + (temaActual() === id ? ' act' : ''), attrs: { type: 'button', 'aria-pressed': String(temaActual() === id) }, on: { click: () => { fijarTema(id); pintar(); } } }, [el('span', { text: ico }), t]))),
    el('h3', { text: 'Color' }),
    el('div', { class: 'apar-colores' }, COLORES.map((c) =>
      el('button', { class: c.id === colorActual() ? 'act' : '', style: { '--c': c.c }, attrs: { type: 'button', 'aria-pressed': String(c.id === colorActual()) }, on: { click: () => { fijarColor(c.id); pintar(); } } }, [el('i'), c.nombre])))
  );
  pintar();
  return caja;
}

// Primera visita: pregunta el modo y el color. Cerrarla sin elegir deja los valores por defecto.
export function ventanaBienvenida() {
  const cerrar = () => { marcarAparienciaElegida(); fondo.remove(); };
  const fondo = el('div', { class: 'modal-fondo', on: { click: (e) => { if (e.target === fondo) cerrar(); } } }, [el('div', { class: 'modal', attrs: { role: 'dialog', 'aria-label': 'Elige tu apariencia' } }, [
    el('h2', { text: 'Elige cómo quieres verla' }),
    el('p', { class: 'sub', text: 'Escoge el modo y el color que más te gusten. Podrás cambiarlos cuando quieras desde tu perfil.' }),
    panelApariencia(),
    el('div', { class: 'acciones' }, [el('button', { class: 'btn', text: 'Listo', on: { click: cerrar } })])
  ])]);
  document.body.appendChild(fondo);
}
