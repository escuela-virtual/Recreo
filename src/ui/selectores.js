'use strict';

import { el, limpiar, aviso } from '../core/util.js';
import { GRUPOS, opcionesIniciales } from '../juegos/ayudas.js';
import { ESTILOS, FUENTES, miniatura } from '../core/estilos.js';
import { PLANTILLAS } from '../plantillas.js';
import { tipoPara } from '../core/contenido.js';
import { pref } from '../core/almacen.js';
import { iconoPlantilla } from './crear.js';

export const estiloRecordado = () => pref.leer('estilo', 'clasico');
export const recordarEstilo = (id) => pref.guardar('estilo', id);

// ---- Cambiar plantilla ----
export function panelPlantillas(act, alElegir) {
  const compat = PLANTILLAS.filter((p) => tipoPara(p, act.tipo));
  const caja = el('div', { class: 'panel' }, [el('h3', { text: 'Cambiar plantilla' })]);
  // la plantilla actual va siempre primera (se recalcula en cada pintado)
  const ordenadas = () => [...compat.filter((p) => p.id === act.plantilla), ...compat.filter((p) => p.id !== act.plantilla)];
  const lista = el('div', { class: 'cambia-lista' });
  let todo = false;
  const pintar = () => {
    limpiar(lista);
    const vis = todo ? ordenadas() : ordenadas().slice(0, 5);
    vis.forEach((p) => lista.append(el('button', { class: 'cambia-it' + (p.id === act.plantilla ? ' act' : ''), on: { click: () => alElegir(p) } }, [iconoPlantilla(p), el('span', { text: p.nombre })])));
    if (compat.length > 5) lista.append(el('button', { class: 'enlace-btn cambia-mas', text: todo ? 'Mostrar menos' : 'Mostrar todo', on: { click: () => { todo = !todo; pintar(); } } }));
  };
  pintar();
  caja.append(lista);
  return caja;
}

// ---- Estilo visual + fuentes ----
export function panelEstilo(act, alCambiar) {
  const caja = el('div', { class: 'panel' }, [el('h3', { text: 'Estilo visual' })]);
  const grid = el('div', { class: 'estilos-grid' });
  const pintar = () => {
    limpiar(grid);
    ESTILOS.forEach((e) => grid.append(el('button', { class: 'estilo-op' + (e.id === act.estilo ? ' act' : ''), attrs: { title: e.nombre }, on: { click: () => { act.estilo = e.id; recordarEstilo(e.id); pintar(); alCambiar(); } } }, [
      miniatura(e.id), el('span', { text: e.nombre })])));
  };
  pintar();
  const sel = el('select', { on: { change: (e) => { act.fuente = e.target.value; alCambiar(); } } }, [
    el('option', { attrs: { value: 'auto', selected: !act.fuente || act.fuente === 'auto' }, text: 'Según el estilo' }),
    ...FUENTES.map((f) => el('option', { attrs: { value: f.id, selected: act.fuente === f.id }, text: f.nombre, style: { fontFamily: f.css } }))
  ]);
  caja.append(grid, el('h4', { class: 'panel-sub', text: 'Fuentes' }), sel);
  return caja;
}

// ---- Configuración de actividad (secciones como en el original) ----
export function panelConfig(plantilla, act, alAplicar) {
  const raiz = el('div', { class: 'config' });
  let borrador = { ...act.opciones };
  const specs = (plantilla.opciones || []).filter((s) => s.k !== 'tiempo');
  const btnAplicar = el('button', { class: 'btn', text: 'Aplicar a esta actividad', attrs: { disabled: true }, on: { click: () => { act.opciones = { ...borrador }; btnAplicar.disabled = true; alAplicar(); } } });
  const cambio = () => { btnAplicar.disabled = JSON.stringify(borrador) === JSON.stringify(act.opciones); };

  const control = (s) => {
    const v = borrador[s.k] ?? s.def;
    if (s.tipo === 'check') return el('label', { class: 'chk cfg-fila' }, [el('input', { attrs: { type: 'checkbox' }, checked: !!v, on: { change: (e) => { borrador[s.k] = e.target.checked; cambio(); } } }), ' ' + s.etiqueta]);
    if (s.tipo === 'rango') {
      const txt = (x) => (x === 0 && s.cero) ? s.cero : x + (s.sufijo || '');
      const val = el('b', { text: txt(v) });
      return el('div', { class: 'cfg-fila cfg-rango' }, [el('label', {}, [el('span', { text: s.etiqueta }), val]),
        el('input', { attrs: { type: 'range', min: s.min, max: s.max, step: s.paso, value: v }, on: { input: (e) => { val.textContent = txt(+e.target.value); }, change: (e) => { borrador[s.k] = +e.target.value; cambio(); } } })]);
    }
    return el('div', { class: 'cfg-fila cfg-sel' }, [el('label', { text: s.etiqueta }),
      el('select', { on: { change: (e) => { borrador[s.k] = e.target.value; cambio(); } } }, s.opciones.map((o) => el('option', { attrs: { value: o.v, selected: o.v === v }, text: o.t })))]);
  };
  const seccion = (titulo, hijos) => el('div', { class: 'cfg-seccion' }, [el('h4', { text: titulo }), ...hijos]);

  function pintar() {
    limpiar(raiz);
    // Cronómetro (común a todas las plantillas)
    const modo = borrador.cronometro || 'ninguno';
    const seg = borrador.tiempo || 0;
    const mm = el('input', { attrs: { type: 'number', min: 0, max: 180 }, value: Math.floor(seg / 60), on: { change: () => { borrador.tiempo = Math.max(1, (+mm.value || 0) * 60 + (+ss.value || 0)); cambio(); } } });
    const ss = el('input', { attrs: { type: 'number', min: 0, max: 59 }, value: seg % 60, on: { change: () => { borrador.tiempo = Math.max(1, (+mm.value || 0) * 60 + (+ss.value || 0)); cambio(); } } });
    raiz.append(seccion('Cronómetro', [
      el('div', { class: 'cfg-fila cfg-sel' }, [el('label', { text: 'Modo' }), el('select', { on: { change: (e) => { borrador.cronometro = e.target.value; if (e.target.value === 'atras' && !borrador.tiempo) borrador.tiempo = 60; cambio(); pintar(); } } },
        [['ninguno', 'Ninguno'], ['adelante', 'Cuenta hacia adelante'], ['atras', 'Cuenta atrás']].map(([v, t]) => el('option', { attrs: { value: v, selected: v === modo }, text: t })))]),
      modo === 'atras' ? el('div', { class: 'cfg-fila cfg-tiempo' }, [mm, el('span', { text: 'm' }), ss, el('span', { text: 's' })]) : null
    ]));
    GRUPOS.forEach(([g, titulo]) => {
      const lista = specs.filter((s) => (s.grupo || 'modo') === g).map(control);
      if (g === 'maestria' && plantilla.revision) lista.push(el('label', { class: 'chk cfg-fila' }, [el('input', { attrs: { type: 'checkbox' }, checked: !!borrador.mostrarRespuestas, on: { change: (e) => { borrador.mostrarRespuestas = e.target.checked; cambio(); } } }), ' Mostrar respuestas al final']));
      if (g === 'formato') lista.push(el('label', { class: 'chk cfg-fila' }, [el('input', { attrs: { type: 'checkbox' }, checked: !!borrador.voz, on: { change: (e) => { borrador.voz = e.target.checked; cambio(); } } }), ' Botón para leer el texto en voz alta (voz del dispositivo)']));
      if (g === 'anti') lista.push(el('label', { class: 'chk cfg-fila' }, [el('input', { attrs: { type: 'checkbox' }, checked: !!borrador.borroso, on: { change: (e) => { borrador.borroso = e.target.checked; cambio(); } } }), ' Pantalla borrosa cuando no hay actividad en curso']));
      if (lista.length) raiz.append(seccion(titulo, lista));
    });
    raiz.append(el('div', { class: 'cfg-botones' }, [
      btnAplicar,
      el('button', { class: 'btn btn-claro', text: 'Definir como predeterminado para la plantilla', on: { click: () => { pref.guardar('predet:' + plantilla.id, borrador); aviso('Guardado como predeterminado para ' + plantilla.nombre); } } }),
      el('button', { class: 'btn btn-claro', text: 'Volver al valor predeterminado', on: { click: () => { borrador = opcionesIniciales(plantilla); cambio(); pintar(); } } })
    ]));
  }
  pintar();
  return raiz;
}
