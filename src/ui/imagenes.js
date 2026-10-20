'use strict';

import { el } from '../core/util.js';

// Biblioteca de imágenes del editor: subir un archivo, elegir un emoji o buscar en Wikimedia Commons.
const EMOJIS = {
  Animales: '🐶🐱🐭🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🦆🦅🦉🦇🐺🐴🦄🐝🐛🦋🐌🐞🐢🐍🦎🐙🦑🦀🐠🐟🐬🐳🦈🐘🦒🦓🐪🐄🐑🐐🦌',
  Comida: '🍎🍐🍊🍋🍌🍉🍇🍓🍒🍑🥭🍍🥥🥝🍅🥑🥕🌽🥔🍞🧀🥚🍗🍔🍕🌭🍟🍦🍰🍪🍫🥛☕🍯',
  Naturaleza: '☀️🌙⭐☁️🌧️❄️🌈🔥💧🌍🌋🏔️🌳🌲🌴🌵🌻🌹🍄🌾🍁',
  Objetos: '📚📖✏️🖊️📏📐✂️📎🎒🖥️💻📱⌚💡🔑🎁⚽🏀🎨🎵🎸🧪🔬🔭🧲💰',
  Lugares: '🚗🚌🚓🚑🚒🚲🛵✈️🚀🚁⛵🚢🚂🚜🏠🏫🏥🏰⛪🌉',
  Cuerpo: '👀👂👃👄🦷🧠🦴✋🦵👣😀😢😡😴🤒',
  Símbolos: '✅❌❓❗➕➖✖️➗⬆️⬇️⬅️➡️❤️💙💚💛🔴🟢🔵🟡⭕🔺🔷'
};
const trozos = (txt) => (typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(txt)].map((x) => x.segment) : [...txt]);

// Reduce una imagen (archivo o blob) a 640 px como máximo para no inflar el almacenamiento.
function reducir(blob) {
  return new Promise((ok) => {
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 640 / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL(/png|gif|webp/.test(blob.type) ? 'image/png' : 'image/jpeg', 0.82));
    };
    im.onerror = () => { URL.revokeObjectURL(url); ok(null); };
    im.src = url;
  });
}

// Dibuja el emoji en un lienzo: así la imagen queda fija y se ve igual en cualquier dispositivo.
function emojiAImagen(e) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.font = '200px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(e, 128, 142);
  return c.toDataURL('image/png');
}

async function buscarCommons(q) {
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=24&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap') + '&prop=imageinfo&iiprop=url|mime&iiurlwidth=320&format=json&origin=*';
  const j = await (await fetch(u)).json();
  return Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index).map((p) => p.imageinfo && p.imageinfo[0]).filter((i) => i && /^image\/(jpeg|png|webp)$/.test(i.mime) && i.thumburl);
}

export function elegirImagen() {
  return new Promise((ok) => {
    const cerrar = (v) => { fondo.remove(); ok(v); };
    const cuerpo = el('div', { class: 'img-cuerpo' });
    let tab = 'subir';

    const subir = () => {
      const i = el('input', { attrs: { type: 'file', accept: 'image/*' } });
      i.onchange = async () => { const f = i.files[0]; if (f) cerrar(await reducir(f)); };
      cuerpo.replaceChildren(el('p', { class: 'sub', text: 'Elige una imagen de tu dispositivo (se reduce automáticamente).' }), el('button', { class: 'btn btn-grande', attrs: { type: 'button' }, text: 'Elegir archivo…', on: { click: () => i.click() } }));
    };

    const emojis = () => {
      cuerpo.replaceChildren(...Object.entries(EMOJIS).flatMap(([cat, txt]) => [
        el('h4', { text: cat }),
        el('div', { class: 'img-emojis' }, trozos(txt).map((e) => el('button', { attrs: { type: 'button', 'aria-label': e }, text: e, on: { click: () => cerrar(emojiAImagen(e)) } })))
      ]));
    };

    const internet = () => {
      const campo = el('input', { attrs: { type: 'search', placeholder: 'Busca una imagen (ej.: volcán, mariposa, mapa de Colombia)' } });
      const rejilla = el('div', { class: 'img-rejilla' });
      const estado = el('p', { class: 'sub', text: 'Imágenes de Wikimedia Commons. Casi todas tienen licencia libre; revisa la licencia si vas a publicarlas.' });
      const buscar = async () => {
        const q = campo.value.trim(); if (!q) return;
        estado.textContent = 'Buscando…'; rejilla.replaceChildren();
        try {
          const lista = await buscarCommons(q);
          estado.textContent = lista.length ? 'Toca una imagen para usarla.' : 'No se encontró nada. Prueba con otra palabra.';
          rejilla.replaceChildren(...lista.map((i) => el('button', { class: 'img-res', attrs: { type: 'button' }, on: { click: async () => {
            estado.textContent = 'Descargando…';
            try { const b = await (await fetch(i.thumburl)).blob(); cerrar(await reducir(b)); } catch (_) { estado.textContent = 'No se pudo descargar esa imagen.'; }
          } } }, [el('img', { attrs: { src: i.thumburl, alt: '', loading: 'lazy' } })])));
        } catch (_) { estado.textContent = 'No se pudo buscar. Revisa tu conexión a internet.'; }
      };
      campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') buscar(); });
      cuerpo.replaceChildren(el('div', { class: 'fila' }, [campo, el('button', { class: 'btn', attrs: { type: 'button' }, text: 'Buscar', on: { click: buscar } })]), estado, rejilla);
      campo.focus();
    };

    const TABS = [['subir', 'Subir', subir], ['emojis', 'Emojis', emojis], ['internet', 'Buscar en internet', internet]];
    const botones = TABS.map(([id, t, fn]) => el('button', { class: id === tab ? 'act' : '', attrs: { type: 'button' }, text: t, on: { click: () => { tab = id; botones.forEach((b, k) => b.classList.toggle('act', TABS[k][0] === id)); fn(); } } }));
    const fondo = el('div', { class: 'modal-fondo', on: { click: (e) => { if (e.target === fondo) cerrar(null); } } }, [el('div', { class: 'modal modal-img' }, [
      el('h2', { text: 'Añadir imagen' }),
      el('div', { class: 'acceso-tabs' }, botones),
      cuerpo,
      el('div', { class: 'acciones' }, [el('button', { class: 'btn btn-claro', attrs: { type: 'button' }, text: 'Cancelar', on: { click: () => cerrar(null) } })])
    ])]);
    document.body.appendChild(fondo);
    subir();
  });
}
