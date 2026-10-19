'use strict';

import { el, limpiar, aviso, uid, fmtTiempo } from '../core/util.js';
import { pagina } from './layout.js';
import { plantillaPorId } from '../plantillas.js';
import { montarEscenario } from '../core/escenario.js';
import { contenidoParaJugar, cuenta } from '../core/contenido.js';
import { actividades, resultados } from '../core/almacen.js';
import { opcionesIniciales } from '../juegos/ayudas.js';
import { panelPlantillas, panelEstilo, panelConfig } from './selectores.js';
import { ir } from '../core/router.js';
import { compartir, incrustar, imprimir, definirTarea } from './acciones.js';
import { decodificar, paquete } from '../core/codec.js';
import { EJEMPLOS } from '../datos/ejemplos.js';
import { copiarActividad } from './mis.js';
import { traerDeComunidad, contarCopia } from '../core/nube.js';
import { leerListas, urlItem, titulosDe, tarjetaLista } from './listas.js';

const conDefectos = (a) => {
  const p = plantillaPorId(a.plantilla);
  return { etiquetas: [], fuente: 'auto', estilo: 'clasico', ...a, opciones: { ...opcionesIniciales(p), ...(a.opciones || {}) } };
};

// Construye la página de una actividad. modo: 'propia' | 'ajena' (ejemplo o recibida por enlace)
function construir(raiz, act, { modo, consulta = null, origen = null }) {
  const main = pagina(raiz);
  const propia = modo === 'propia';
  let plantilla = plantillaPorId(act.plantilla);
  let ctl = null;
  const zonaJuego = el('div', { class: 'juego-zona' });
  const lateral = el('aside', { class: 'lateral' });
  const tabla = el('div', { class: 'tabla-caja' });
  const guardar = () => { if (propia) { act.modificado = Date.now(); return actividades.guardar(act); } };

  function montar() {
    if (ctl) ctl.destruir();
    limpiar(zonaJuego);
    const { tipo, datos } = contenidoParaJugar(plantilla, act);
    if (!tipo || !datos || cuenta(tipo, datos) < (plantilla.minimo || 1)) {
      zonaJuego.append(el('div', { class: 'juego-vacio' }, [el('p', { text: `Esta plantilla necesita al menos ${plantilla.minimo || 1} elemento(s) y el contenido actual no alcanza.` }), propia ? el('a', { class: 'btn', text: 'Editar contenido', attrs: { href: '#/editar/' + act.id } }) : null]));
      ctl = null; return;
    }
    ctl = montarEscenario(zonaJuego, {
      plantilla, titulo: act.titulo, tipo, datos, opciones: act.opciones, estilo: act.estilo, fuente: act.fuente, tarea: act.tarea || null,
      alIniciar: () => { if (propia) { act.jugado = Date.now(); actividades.guardar(act); } },
      alTerminar: async (r) => {
        const reg = { id: uid(), actId: act.tarea ? act.tarea.id : act.id, titulo: act.titulo, plantilla: plantilla.id, fecha: Date.now(), ...r };
        await resultados.guardar(reg); pintarTabla();
        return reg;
      }
    });
  }

  function cambiarPlantilla(p) {
    plantilla = p; act.plantilla = p.id;
    const comunes = ['cronometro', 'tiempo', 'borroso'];
    act.opciones = { ...opcionesIniciales(p), ...Object.fromEntries(Object.entries(act.opciones || {}).filter(([k]) => comunes.includes(k) || (p.opciones || []).some((o) => o.k === k))) };
    guardar(); montar(); pintarLateral(); pintarPestanas();
  }
  function pintarLateral() {
    limpiar(lateral);
    lateral.append(
      ...(propia || String(act.id).startsWith('ej-') ? [tarjetaLista(act, !propia)] : []),
      panelPlantillas(act, cambiarPlantilla),
      panelEstilo(act, () => { guardar(); if (ctl) ctl.setEstilo(act.estilo, act.fuente); })
    );
  }

  // Pestañas bajo el juego, como en el original.
  const cuerpoPestana = el('div', { class: 'pestana-cuerpo' });
  let pestana = 'config';
  function pintarPestanas() {
    limpiar(cuerpoPestana);
    if (pestana === 'config') cuerpoPestana.append(panelConfig(plantilla, act, () => { guardar(); if (ctl) { ctl.setOpciones(act.opciones); ctl.reiniciar(); } }));
    else if (pestana === 'tabla') { cuerpoPestana.append(tabla); pintarTabla(); }
    else cuerpoPestana.append(
      el('p', { text: 'Envía a tus alumnos un enlace para que jueguen esta actividad como tarea. Cada alumno escribe su nombre y, al terminar, recibe un código de resultado que te entrega.' }),
      el('div', { class: 'fila' }, [el('button', { class: 'btn', text: 'Crear enlace de tarea', on: { click: () => definirTarea(act) } }), el('a', { class: 'btn btn-claro', text: 'Ver resultados importados', attrs: { href: '#/resultados' } })])
    );
  }
  const pestanas = el('div', { class: 'tarjeta pestanas' }, [
    el('div', { class: 'pestana-lista' }, [['config', 'Configuración de actividad'], ['tabla', 'Tabla de clasificación'], ['tareas', 'Tareas']].map(([id, t]) =>
      el('button', { class: 'pestana' + (id === pestana ? ' act' : ''), text: t, on: { click: (e) => { pestana = id; pestanas.querySelectorAll('.pestana').forEach((b) => b.classList.toggle('act', b === e.currentTarget)); pintarPestanas(); } } }))),
    cuerpoPestana
  ]);
  async function pintarTabla() {
    limpiar(tabla);
    const idRes = act.tarea ? act.tarea.id : act.id;
    const todos = (await resultados.todos()).filter((r) => r.actId === idRes).sort((a, b) => b.puntos - a.puntos || a.segundos - b.segundos).slice(0, 10);
    tabla.append(el('h3', { text: 'Tabla de clasificación' }));
    if (!todos.length) { tabla.append(el('p', { class: 'sub', text: 'Todavía no hay resultados en este dispositivo. ¡Juega y guarda el tuyo!' })); return; }
    tabla.append(el('table', { class: 'tabla' }, [
      el('thead', {}, [el('tr', {}, ['Puesto', 'Nombre', 'Puntuación', 'Tiempo'].map((t) => el('th', { text: t })))]),
      el('tbody', {}, todos.map((r, i) => el('tr', {}, [el('td', { text: String(i + 1) }), el('td', { text: r.nombre }), el('td', { text: String(r.puntos) }), el('td', { text: fmtTiempo(r.segundos) })])))
    ]));
  }

  const aviso_ajena = !propia ? el('div', { class: 'aviso-ajena' }, [
    el('span', { text: act.tarea ? 'Esta es una tarea. Escribe tu nombre y pulsa INICIAR.' : origen ? `Actividad de la comunidad, creada por ${origen.autor}.` : 'Esta actividad es un ejemplo o te la han compartido.' }),
    el('button', { class: 'btn btn-mini', text: 'Guardar una copia para editarla', on: { click: async () => { const c = await copiarActividad(conDefectos({ ...paquete(act), id: uid() })); if (origen) origen.alCopiar(); aviso('Copia guardada en Mis actividades'); ir('/editar/' + c.id); } } })
  ]) : null;

  // Si se llegó desde una lista de reproducción, barra para pasar a la anterior / siguiente actividad.
  const lista = consulta && consulta.get('lista') ? leerListas().find((l) => l.id === consulta.get('lista')) : null;
  const posLista = lista ? +consulta.get('n') || 0 : 0;
  const barraLista = lista ? el('div', { class: 'barra-lista' }, [
    el('b', { text: `Lista "${lista.nombre}" · ${posLista + 1} de ${lista.items.length}` }), el('span', { class: 'esp' }),
    posLista > 0 ? el('a', { class: 'btn btn-claro btn-mini', text: '◀ Anterior', attrs: { href: urlItem(lista.items[posLista - 1], lista, posLista - 1) } }) : null,
    posLista < lista.items.length - 1 ? el('a', { class: 'btn btn-mini', text: 'Siguiente ▶', attrs: { href: urlItem(lista.items[posLista + 1], lista, posLista + 1) } }) : el('a', { class: 'btn btn-claro btn-mini', text: 'Fin de la lista', attrs: { href: '#/listas' } })
  ]) : null;

  main.append(el('div', { class: 'actividad' }, [
    el('div', { class: 'col-juego' }, [
      barraLista,
      aviso_ajena,
      el('div', { class: 'tarjeta tarjeta-juego' }, [
        zonaJuego,
        el('div', { class: 'info' }, [
          el('div', { class: 'fila entre' }, [
            el('h1', { text: act.titulo }),
            act.tarea ? null : el('div', { class: 'fila' }, [
              el('button', { class: 'btn btn-claro', text: '✔ Definir tarea', on: { click: () => definirTarea(act) } }),
              el('button', { class: 'btn btn-claro', text: '🌐 Compartir', on: { click: () => compartir(act) } })
            ])
          ]),
          el('div', { class: 'fila entre' }, [
            el('div', {}, [el('p', { class: 'sub', text: modo === 'propia' ? 'por Yo' : act.tarea ? 'Tarea' : origen ? 'por ' + origen.autor : 'Actividad de ejemplo' }), el('div', {}, (act.etiquetas || []).map((t) => el('span', { class: 'etiqueta', text: t })))]),
            el('div', { class: 'fila acc' }, [
              propia ? el('a', { class: 'enlace-btn', text: '✎ Editar contenido…', attrs: { href: '#/editar/' + act.id } }) : null,
              el('button', { class: 'enlace-btn', text: '🖨 Imprimir', on: { click: () => imprimir(act, plantilla) } }),
              act.tarea ? null : el('button', { class: 'enlace-btn', text: '</> Incrustar', on: { click: () => incrustar(act) } })
            ])
          ])
        ])
      ]),
      pestanas
    ]),
    lateral
  ]));
  montar(); pintarLateral(); pintarPestanas();
  return () => { if (ctl) ctl.destruir(); };
}

export async function vistaActividad(raiz, params, consulta) {
  const act = await actividades.uno(params.id);
  if (!act) {
    const main = pagina(raiz);
    main.append(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Actividad no encontrada' }), el('p', { class: 'sub', text: 'Puede que se haya eliminado o que sea de otro dispositivo.' }), el('a', { class: 'btn', text: 'Ir a mis actividades', attrs: { href: '#/mis' } })]));
    return;
  }
  return construir(raiz, conDefectos(act), { modo: 'propia', consulta });
}

export function vistaEjemplo(raiz, params, consulta) {
  const e = EJEMPLOS.find((x) => x.id === params.id);
  if (!e) { ir('/'); return; }
  return construir(raiz, conDefectos(JSON.parse(JSON.stringify(e))), { modo: 'ajena', consulta });
}

export async function vistaComunidadActividad(raiz, params) {
  let fila = null;
  try { fila = await traerDeComunidad(params.autor, params.id); } catch (_) { /* se muestra como no encontrada */ }
  if (!fila || !plantillaPorId(fila.datos.plantilla)) {
    const m = pagina(raiz);
    m.append(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Actividad no disponible' }), el('p', { class: 'sub', text: 'Su autor la retiró de la comunidad o el enlace no es correcto.' }), el('a', { class: 'btn', text: 'Volver a la Comunidad', attrs: { href: '#/comunidad' } })]));
    return;
  }
  const act = conDefectos({ ...fila.datos, id: 'com-' + fila.id, publica: false, enComunidad: false });
  return construir(raiz, act, { modo: 'ajena', origen: { autor: fila.autor, alCopiar: () => contarCopia(fila.user_id, fila.id) } });
}

async function leer(data) {
  try { const d = await decodificar(data); if (!plantillaPorId(d.plantilla)) throw 0; return conDefectos({ id: d.tarea ? d.tarea.id : 'rec-' + data.slice(0, 12), ...d }); }
  catch (_) { return null; }
}

export async function vistaCompartida(raiz, params) {
  const act = await leer(params.data);
  if (!act) { const m = pagina(raiz); m.append(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Enlace no válido' }), el('p', { class: 'sub', text: 'El enlace está incompleto o dañado. Pide que te lo envíen de nuevo.' })])); return; }
  return construir(raiz, act, { modo: 'ajena' });
}

// Incrustada: solo el escenario, sin cabecera ni pie.
export async function vistaIncrustada(raiz, params) {
  const act = await leer(params.data);
  raiz.classList.add('embebida');
  if (!act) { raiz.textContent = 'Enlace no válido'; return; }
  const p = plantillaPorId(act.plantilla);
  const { tipo, datos } = contenidoParaJugar(p, act);
  const ctl = montarEscenario(raiz, { plantilla: p, titulo: act.titulo, tipo, datos, opciones: act.opciones, estilo: act.estilo, fuente: act.fuente, alTerminar: null });
  return () => ctl.destruir();
}
