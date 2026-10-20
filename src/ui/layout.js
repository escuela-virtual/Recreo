'use strict';

import { el, aviso } from '../core/util.js';
import { actual } from '../core/router.js';
import { NOMBRE } from '../nombre.js';
import { COLORES, colorActual, temaActual, alternarTema, fijarColor, marcaSvg } from '../core/tema.js';
import { hayNube, usuarioActual, alCambiarUsuario, salir, esAdmin } from '../core/nube.js';
import { ir } from '../core/router.js';
import { puedeInstalar, instalar, esIPhone } from '../core/instalar.js';

// El tercer valor marca las pestañas que solo se ven con sesión iniciada (si la app no tiene cuentas, se ven todas).
const NAV = [['/', 'Inicio'], ['/funciones', 'Funciones'], ['/comunidad', 'Comunidad'], ['/mis', 'Mis actividades', true], ['/clases', 'Clases', true], ['/listas', 'Listas', true], ['/resultados', 'Mis resultados', true]];

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
  // si el tema cambia desde otro sitio (ventana de bienvenida, perfil), se actualizan el icono y la paleta
  const alTema = () => { if (!caja.isConnected) window.removeEventListener('recreo-tema', alTema); else { pintarIcono(); pintarPaleta(); } };
  window.addEventListener('recreo-tema', alTema);
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
      el('a', { class: 'btn btn-claro btn-mini', text: 'Mi perfil', attrs: { href: '#/perfil' } }),
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
    el('nav', {}, enlaces),
    el('div', { class: 'cab-acc' }, [controlTema(), controlCuenta()]),
    el('a', { class: 'btn cab-crear', text: 'Crear actividad', attrs: { href: '#/crear' } })
  ]);
}

// Barra inferior (solo móvil, el CSS la oculta en pantallas grandes): accesos principales y "+" para crear.
const ico = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICO = {
  inicio: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  comunidad: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.8 0 5 2.2 5 5"/>',
  mis: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>',
  funciones: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5l-5.4 3 1.2-6L3.3 9.3l6.1-.7z"/>',
  entrar: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10"/>',
  mas: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  crear: '<path d="M12 5v14M5 12h14"/>'
};
function barraInferior() {
  const { ruta } = actual();
  const con = !hayNube || usuarioActual();
  const item = (r, t, i) => el('a', { class: 'bi-item' + (ruta === r ? ' act' : ''), attrs: { href: '#' + r }, html: ico(ICO[i]) + `<span>${t}</span>` });
  const extra = [['/funciones', 'Funciones'], ['/clases', 'Clases'], ['/listas', 'Listas'], ['/resultados', 'Mis resultados'], ['/perfil', 'Mi perfil']];
  const hoja = el('div', { class: 'bi-hoja', attrs: { hidden: true } }, extra.map(([r, t]) => el('a', { class: ruta === r ? 'act' : '', text: t, attrs: { href: '#' + r } })));
  const mas = el('button', { class: 'bi-item' + (extra.some(([r]) => r === ruta) ? ' act' : ''), attrs: { type: 'button', 'aria-label': 'Más opciones' }, html: ico(ICO.mas) + '<span>Más</span>', on: { click: (e) => { e.stopPropagation(); hoja.hidden = !hoja.hidden; } } });
  const cerrar = () => { if (!hoja.isConnected) document.removeEventListener('click', cerrar); else hoja.hidden = true; };
  document.addEventListener('click', cerrar);
  return el('nav', { class: 'bi', attrs: { 'aria-label': 'Navegación principal' } }, [
    item('/', 'Inicio', 'inicio'), item('/comunidad', 'Comunidad', 'comunidad'),
    el('a', { class: 'bi-crear', attrs: { href: '#/crear', 'aria-label': 'Crear actividad' }, html: ico(ICO.crear) }),
    con ? item('/mis', 'Actividades', 'mis') : item('/funciones', 'Funciones', 'funciones'),
    con ? mas : item('/entrar', 'Entrar', 'entrar'), hoja
  ]);
}

// Botón "Instalar app": aparece solo si el navegador lo permite (o en iPhone, con instrucciones).
function botonInstalar() {
  const b = el('button', { class: 'enlace-btn pie-instalar', attrs: { type: 'button' }, text: '⬇ Instalar app', on: { click: async () => {
    if (esIPhone()) { aviso('En Safari pulsa Compartir y luego "Añadir a pantalla de inicio".', 7000); return; }
    await instalar();
  } } });
  const act = () => { if (!b.isConnected) window.removeEventListener('recreo-instalable', act); else b.hidden = !puedeInstalar(); };
  b.hidden = !puedeInstalar();
  window.addEventListener('recreo-instalable', act);
  return b;
}

export function pie() {
  return el('footer', { class: 'pie' }, [
    marca(), el('span', { text: 'Actividades interactivas e imprimibles para el aula' }),
    el('a', { text: 'Funciones', attrs: { href: '#/funciones' } }),
    el('a', { text: 'Crear', attrs: { href: '#/crear' } }),
    botonInstalar(),
    el('nav', { class: 'pie-legal', attrs: { 'aria-label': 'Legal' } }, [['/terminos', 'Términos'], ['/privacidad', 'Privacidad'], ['/cookies', 'Cookies']].map(([r, t]) => el('a', { text: t, attrs: { href: '#' + r } }))),
    el('div', { class: 'pie-credito' }, [
      el('span', { text: 'Creado por el equipo de Escuela Virtual del Área de Educación del Comité de Cafeteros' }),
      el('small', { text: 'Alejandro Osorio Loaiza' })
    ])
  ]);
}

// Envuelve una vista con cabecera y pie; devuelve el contenedor de contenido.
export function pagina(raiz, { ancho = true } = {}) {
  const main = el('main', { class: ancho ? 'contenedor' : '' });
  raiz.append(cabecera(), main, pie(), barraInferior());
  return main;
}
