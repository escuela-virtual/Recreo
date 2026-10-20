'use strict';

import { el } from '../core/util.js';
import { pref } from '../core/almacen.js';
import { hablar, vozActiva } from '../core/voz.js';

// Reproduce un audio (data URL); uno a la vez.
let sonando = null;
export function reproducir(src) {
  if (sonando) sonando.pause();
  sonando = new Audio(src);
  sonando.play().catch(() => {});
}

// Celda con imagen y/o texto (lo que se muestra en tarjetas, botones, etc.) y, si hay, un botón de audio.
export function celda(t, img, clase = '', aud = null) {
  return el('div', { class: 'celda ' + clase }, [
    img ? el('img', { attrs: { src: img, alt: '', draggable: 'false' } }) : null,
    t ? el('span', { text: t }) : null,
    aud ? el('button', { class: 'celda-aud', attrs: { type: 'button', title: 'Escuchar' }, text: '\u{1F50A}', on: { click: (e) => { e.stopPropagation(); reproducir(aud); }, pointerdown: (e) => e.stopPropagation() } })
      : t && vozActiva() ? el('button', { class: 'celda-aud', attrs: { type: 'button', title: 'Leer en voz alta' }, text: '\u{1F50A}', on: { click: (e) => { e.stopPropagation(); hablar(t); }, pointerdown: (e) => e.stopPropagation() } }) : null
  ]);
}

// Secciones del panel "Configuración de actividad" (mismo orden que el original).
export const GRUPOS = [
  ['ritmo', 'Control del ritmo'], ['maestria', 'Maestría'], ['anti', 'Anti-trampas'],
  ['formato', 'Formato de maquetación'], ['modo', 'Modo actividad'], ['bonus', 'Bonificaciones']
];

// Ajustes reutilizables que declaran las plantillas. `grupo` decide en qué sección se muestran
// (por defecto 'modo'). El cronómetro y la pantalla borrosa son comunes a todas y no se declaran.
export const OPC = {
  tiempo: (def = 0) => ({ k: 'tiempo', etiqueta: 'Cronómetro', tipo: 'rango', def }), // marcador: lo pinta el cronómetro común
  vidas: (def = 0) => ({ k: 'vidas', grupo: 'modo', etiqueta: 'Vidas', tipo: 'rango', min: 0, max: 9, paso: 1, def, cero: 'Sin límite' }),
  alea: (def = true, etiqueta = 'Barajar el orden de los elementos') => ({ k: 'alea', grupo: 'anti', etiqueta, tipo: 'check', def }),
  aleaResp: (def = true) => ({ k: 'aleaResp', grupo: 'anti', etiqueta: 'Barajar el orden de las respuestas', tipo: 'check', def }),
  mostrarOk: (def = true) => ({ k: 'mostrarOk', grupo: 'maestria', etiqueta: 'Permite un solo intento tras una respuesta incorrecta', tipo: 'check', def }),
  velocidad: (def = 5) => ({ k: 'velocidad', grupo: 'modo', etiqueta: 'Velocidad', tipo: 'rango', min: 1, max: 10, paso: 1, def })
};

// Valores iniciales: los de la plantilla, sobre ellos lo que el usuario fijó como "predeterminado para la plantilla".
export function valoresPorDefecto(specs, guardados = {}) {
  const o = { borroso: false, cronometro: 'ninguno', tiempo: 0 };
  for (const s of specs || []) {
    if (s.k === 'tiempo') { o.tiempo = s.def || 0; o.cronometro = s.def > 0 ? 'atras' : 'ninguno'; }
    else o[s.k] = s.def;
  }
  return { ...o, ...guardados };
}

// Opciones al crear/cambiar de plantilla: las de la plantilla + lo que el usuario fijó como predeterminado.
export const opcionesIniciales = (p) => valoresPorDefecto(p && p.opciones, p ? pref.leer('predet:' + p.id, {}) : {});

// Pausa que se cancela si el juego se destruye (evita timers colgados).
export function temporizadores() {
  const ids = new Set();
  return {
    esperar(fn, ms) { const id = setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); return id; },
    cada(fn, ms) { const id = setInterval(fn, ms); ids.add(id); return id; },
    cancelar(id) { clearTimeout(id); clearInterval(id); ids.delete(id); },
    limpiar() { ids.forEach((id) => { clearTimeout(id); clearInterval(id); }); ids.clear(); }
  };
}
