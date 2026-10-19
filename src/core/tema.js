'use strict';

import { pref } from './almacen.js';
import { usuarioActual, guardarApariencia, aparienciaDeCuenta } from './nube.js';

// Tema claro/oscuro (claro por defecto) y color de acento. Se guardan por dispositivo.
export const COLORES = [
  { id: 'violeta', nombre: 'Violeta', c: '#6c4ef2' }, { id: 'oceano', nombre: 'Océano', c: '#1e88e5' }, { id: 'bosque', nombre: 'Bosque', c: '#2e9e5b' },
  { id: 'mandarina', nombre: 'Mandarina', c: '#f07a1a' }, { id: 'fresa', nombre: 'Fresa', c: '#e8437a' }, { id: 'turquesa', nombre: 'Turquesa', c: '#0fa3a3' }
];

export const temaActual = () => (pref.leer('tema', 'claro') === 'oscuro' ? 'oscuro' : 'claro');
export const colorActual = () => (COLORES.some((c) => c.id === pref.leer('color', 'violeta')) ? pref.leer('color', 'violeta') : 'violeta');
const acentoDe = (id) => (COLORES.find((c) => c.id === id) || COLORES[0]).c;

// Logo: una pelota que rebota (por "recreo"), del color de acento.
export const marcaSvg = () => `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M3 33 Q20 -8 37 33" fill="none" stroke="var(--acento)" stroke-width="3" stroke-dasharray="0.1 5.2" stroke-linecap="round" opacity=".55"/>
  <ellipse cx="20" cy="35" rx="9" ry="2.4" fill="var(--acento)" opacity=".28"/>
  <circle cx="20" cy="17" r="9.5" fill="var(--acento)"/><circle cx="16.8" cy="13.6" r="3" fill="#fff" opacity=".65"/></svg>`;

const faviconSvg = (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${c}"/>
  <path d="M9 52 Q32 -8 55 52" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-dasharray="0.1 8" stroke-linecap="round"/>
  <ellipse cx="32" cy="54" rx="15" ry="3.5" fill="#000" opacity=".2"/><circle cx="32" cy="30" r="15" fill="#fff"/><circle cx="26.5" cy="24.5" r="4.5" fill="${c}" opacity=".35"/></svg>`;

function poner(rel, atributos) {
  let n = document.head.querySelector(rel);
  if (!n) { n = document.createElement(rel.startsWith('meta') ? 'meta' : 'link'); document.head.appendChild(n); }
  Object.entries(atributos).forEach(([k, v]) => n.setAttribute(k, v));
}

export function aplicarTema() {
  const raiz = document.documentElement, color = colorActual(), acento = acentoDe(color);
  raiz.dataset.tema = temaActual(); raiz.dataset.color = color;
  poner('link[rel="icon"]', { rel: 'icon', type: 'image/svg+xml', href: 'data:image/svg+xml,' + encodeURIComponent(faviconSvg(acento)) }); // el favicon sigue al color elegido
  poner('meta[name="theme-color"]', { name: 'theme-color', content: temaActual() === 'oscuro' ? '#14122a' : acento });
  window.dispatchEvent(new Event('recreo-tema')); // para que los botones de la cabecera se pongan al día
}

// Con sesión iniciada, la apariencia viaja con la cuenta (metadatos del usuario en Supabase).
let espera = null;
const subir = () => {
  if (!usuarioActual()) return;
  clearTimeout(espera);
  espera = setTimeout(() => guardarApariencia({ tema: temaActual(), color: colorActual() }).catch((e) => console.warn('Apariencia:', e)), 600);
};
export const yaEligioApariencia = () => pref.leer('apariencia-elegida', false) === true;
export const marcarAparienciaElegida = () => { pref.guardar('apariencia-elegida', true); subir(); };
// Aplica lo guardado en la cuenta; devuelve false si la cuenta aún no tiene preferencias.
export function aplicarAparienciaDeCuenta() {
  const a = aparienciaDeCuenta();
  if (!a) return false;
  pref.guardar('tema', a.tema === 'oscuro' ? 'oscuro' : 'claro');
  if (COLORES.some((c) => c.id === a.color)) pref.guardar('color', a.color);
  pref.guardar('apariencia-elegida', true);
  aplicarTema();
  return true;
}
export const fijarTema = (modo) => { pref.guardar('tema', modo === 'oscuro' ? 'oscuro' : 'claro'); aplicarTema(); subir(); };
export const alternarTema = () => fijarTema(temaActual() === 'oscuro' ? 'claro' : 'oscuro');
export const fijarColor = (id) => { pref.guardar('color', id); aplicarTema(); subir(); };
