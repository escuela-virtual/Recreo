'use strict';

import { el } from '../core/util.js';
import { pagina } from './layout.js';
import { pref } from '../core/almacen.js';
import { DOCS, ACTUALIZADO } from '../datos/legal.js';

const OTROS = [['/terminos', 'Términos de uso'], ['/privacidad', 'Política de privacidad'], ['/cookies', 'Política de cookies']];

function documento(id) {
  return (raiz) => {
    const d = DOCS[id];
    const main = pagina(raiz);
    main.append(el('article', { class: 'tarjeta legal' }, [
      el('h1', { text: d.titulo }),
      el('p', { class: 'sub', text: `Última actualización: ${ACTUALIZADO}` }),
      el('p', { text: d.intro }),
      ...d.secciones.flatMap((s) => [
        el('h2', { text: s.h }),
        ...(s.p || []).map((t) => el('p', { text: t })),
        s.li ? el('ul', {}, s.li.map((t) => el('li', { text: t }))) : null,
        ...(s.p2 || []).map((t) => el('p', { text: t })),
        s.tabla ? el('div', { class: 'tabla-scroll' }, [el('table', { class: 'tabla' }, [el('thead', {}, [el('tr', {}, s.cab.map((c) => el('th', { text: c })))]), el('tbody', {}, s.tabla.map((f) => el('tr', {}, f.map((c) => el('td', { text: c })))))])]) : null
      ].filter(Boolean)),
      el('hr'),
      el('p', { class: 'legal-otros' }, OTROS.filter(([r]) => r !== '/' + id).flatMap(([r, t]) => [el('a', { text: t, attrs: { href: '#' + r } })]))
    ]));
  };
}
export const vistaTerminos = documento('terminos');
export const vistaPrivacidad = documento('privacidad');
export const vistaCookies = documento('cookies');

// Aviso de almacenamiento local: solo informa (no hay cookies de seguimiento que aceptar).
export function avisoAlmacenamiento() {
  if (pref.leer('aviso-almacenamiento', false)) return;
  const cerrar = () => { pref.guardar('aviso-almacenamiento', true); b.remove(); };
  const b = el('div', { class: 'aviso-cookies', attrs: { role: 'dialog', 'aria-label': 'Aviso de almacenamiento local' } }, [
    el('p', {}, ['Recreatic guarda en tu dispositivo solo lo necesario para funcionar (tus actividades, tu sesión y tus preferencias). No usamos cookies de publicidad ni de seguimiento. ', el('a', { text: 'Más información', attrs: { href: '#/cookies' } }), '.']),
    el('button', { class: 'btn btn-mini', attrs: { type: 'button' }, text: 'Entendido', on: { click: cerrar } })
  ]);
  document.body.appendChild(b);
}
