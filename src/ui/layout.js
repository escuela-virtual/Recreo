'use strict';

import { el } from '../core/util.js';
import { actual } from '../core/router.js';
import { NOMBRE } from '../nombre.js';
import { COLORES, colorActual, temaActual, alternarTema, fijarColor, marcaSvg } from '../core/tema.js';
import { hayNube, usuarioActual, alCambiarUsuario, salir, esAdmin } from '../core/nube.js';
import { ir } from '../core/router.js';

// El tercer valor marca las pestañas que solo se ven con sesión iniciada (si la app no tiene cuentas, se ven todas).
const NAV = [['/', 'Inicio'], ['/funciones', 'Funciones'], ['/comunidad', 'Comunidad'], ['/mis', 'Mis actividades', true], ['/listas', 'Listas', true], ['/resultados', 'Mis resultados', true]];

const marca = () => el('a', { class: 'logo', attrs: { href: '#/' }, html: marcaSvg() + `<span>${NOMBRE}</span>` });

// Botón de tema (claro/oscuro) y paleta de colores.
function controlTema() {
  const caja = el('div', { class: 'tema-ctl' });
  const boton = el('button', { class: 'ico-btn', attrs: { type: 'button', title: 'Cambiar entre tema claro y oscuro' }, on: { click: () => { alternarTema(); pintarIcono(); } } });
  const pintarIcono = () => { boton.textContent = temaActual() === 'oscuro' ? '☀' : '☾'; boton.title = temaActual() === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'; };
  pintarIcono();
  const paleta = el('div', { class: 'paleta', attrs: { hidden: true } });
  const pintarPaleta = () => {
    paleta.replaceChildren(...COLORES.map((c) => el('button', { class: c.id === colorActual() ? 'act' : '', style: { '--c': c.c }, attrs: { type: 'button' }, on: { click: () => { fijarColor(c.id); pintarPaleta(); } } }, [el('i'), c.nombre])));
  };
  pintarPaleta();
  const color = el('button', { class: 'ico-btn', attrs: { type: 'button', title: 'Elegir color del tema' }, text: '◑', on: { click: (e) => { e.stopPropagation(); paleta.hidden = !paleta.hidden; } } });
  document.addEventListener('click', (e) => { if (!caja.contains(e.target)) paleta.hidden = true; });
  caja.append(boton, color, paleta);
  return caja;
}

// Entrar / cuenta: sin sesión muestra "Entrar"; con sesión, la inicial y un menú para salir.
function controlCuenta() {
  if (!hayNube) return null;
  const caja = el('div', { class: 'tema-ctl cuenta' });
  const pintar = () => {
    caja.replaceChildren();
    const u = usuarioActual();
    if (!u) { caja.append(el('a', { class: 'btn btn-claro btn-mini', text: 'Entrar', attrs: { href: '#/entrar' } })); return; }
    const nombre = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email;
    const foto = u.user_metadata && (u.user_metadata.avatar_url || u.user_metadata.picture);
    const enlaceAdmin = el('a', { class: 'btn btn-mini', text: 'Panel de administración', attrs: { href: '#/admin', hidden: true } });
    esAdmin().then((si) => { enlaceAdmin.hidden = !si; });
    const menu = el('div', { class: 'paleta cuenta-menu', attrs: { hidden: true } }, [
      el('div', { class: 'cuenta-dato' }, [el('b', { text: nombre }), el('small', { text: u.email })]),
      enlaceAdmin,
      el('button', { class: 'btn btn-claro btn-mini', attrs: { type: 'button' }, text: 'Cerrar sesión', on: { click: async () => { await salir(); ir('/'); } } })
    ]);
    const bot = el('button', { class: 'ico-btn avatar', attrs: { type: 'button', title: nombre, 'aria-label': 'Mi cuenta' }, on: { click: (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; } } },
      [foto ? el('img', { attrs: { src: foto, alt: '', referrerpolicy: 'no-referrer' } }) : (nombre || '?').charAt(0).toUpperCase()]);
    document.addEventListener('click', (e) => { if (!caja.contains(e.target)) menu.hidden = true; });
    caja.append(bot, menu);
  };
  pintar();
  const quitar = alCambiarUsuario(() => { if (!caja.isConnected) quitar(); else pintar(); }); // se limpia solo si la cabecera ya no está
  return caja;
}

export function cabecera() {
  const { ruta } = actual();
  const enlaces = NAV.filter(([, , privada]) => !privada || !hayNube || usuarioActual()).map(([r, t]) => el('a', { class: ruta === r ? 'act' : '', text: t, attrs: { href: '#' + r } }));
  return el('header', { class: 'cab' }, [
    marca(),
    el('span', { class: 'lema', text: 'Juega, aprende y repite' }),
    el('span', { class: 'esp' }),
    el('nav', {}, [...enlaces, controlTema(), controlCuenta(), el('a', { class: 'btn', text: 'Crear actividad', attrs: { href: '#/crear' } })])
  ]);
}

export function pie() {
  return el('footer', { class: 'pie' }, [
    marca(), el('span', { text: 'Actividades interactivas e imprimibles para el aula' }),
    el('a', { text: 'Funciones', attrs: { href: '#/funciones' } }),
    el('a', { text: 'Crear', attrs: { href: '#/crear' } })
  ]);
}

// Envuelve una vista con cabecera y pie; devuelve el contenedor de contenido.
export function pagina(raiz, { ancho = true } = {}) {
  const main = el('main', { class: ancho ? 'contenedor' : '' });
  raiz.append(cabecera(), main, pie());
  return main;
}
