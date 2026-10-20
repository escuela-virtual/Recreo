'use strict';

import { el, limpiar, fmtTiempo } from './util.js';
import { aplicarEstilo } from './estilos.js';
import * as sonido from './audio.js';
import { codificar } from './codec.js';
import { fijarVoz } from './voz.js';

// ---------------------------------------------------------------------------
// Escenario: el "reproductor" que envuelve a cualquier plantilla. Pinta la
// pantalla de inicio, la barra (tiempo, vidas, puntos), el área de juego y la
// pantalla final. La plantilla recibe un `host` y devuelve {destruir?, alAgotarTiempo?}.
// ---------------------------------------------------------------------------
function listaContenido(tipo, d) {
  const li = (t, hijos) => el('li', {}, hijos ? [t, hijos] : [t]);
  const ul = (items, ord) => el(ord ? 'ol' : 'ul', { class: 'avance-lista' }, items);
  if (tipo === 'quiz') return ul(d.map((q) => li(q.q || '(imagen)', ul(q.resp.map((r) => li((r.ok ? '\u2714 ' : '\u2022 ') + r.t))))), true);
  if (tipo === 'pares') return ul(d.map((x) => li(`${x.a || '(imagen)'}  \u2192  ${x.b || '(imagen)'}`)));
  if (tipo === 'grupos') return ul(d.map((g) => li(g.nombre + ': ' + g.items.map((i) => i.t || '(imagen)').join(', '))));
  if (tipo === 'vf') return ul(d.map((x) => li(`[${x.ok ? 'Verdadero' : 'Falso'}] ${x.t}`)));
  if (tipo === 'oraciones') return ul(d.map((x) => li(x.t)), true);
  if (tipo === 'mates') return el('p', { text: `Operaciones ${d.ops.join(' ')} con números hasta ${d.max}; ${d.n} preguntas nuevas en cada partida.` });
  if (tipo === 'diagrama') return ul(d.pins.map((p, i) => li(`${i + 1}. ${p.t}`)));
  return ul(d.map((x) => li(x.t || '(imagen)')));
}

export function montarEscenario(cont, { plantilla, titulo, tipo, datos, opciones, estilo, fuente, alTerminar, alIniciar = null, tarea = null }) {
  const raiz = el('div', { class: 'escenario' });
  const barra = el('div', { class: 'esc-barra', attrs: { hidden: true } });
  const area = el('div', { class: 'esc-juego' });
  const ctl = el('div', { class: 'esc-ctl' });
  const capa = el('div', { class: 'esc-capa' });
  raiz.append(el('div', { class: 'esc-patron' }), barra, area, ctl, capa);
  cont.appendChild(raiz);
  aplicarEstilo(raiz, estilo, fuente);

  let opc = { ...opciones };
  let juego = null;
  let terminado = false;
  let puntos = 0, aciertos = 0, errores = 0, vidas = 0;
  let t0 = 0, relojId = null, restante = 0, nombreTarea = (tarea && tarea.nombre) || '', revisiones = [];

  const elTiempo = el('span', { class: 'esc-stat esc-tiempo', attrs: { hidden: true } });
  const elVidas = el('span', { class: 'esc-stat', attrs: { hidden: true } });
  const elPuntos = el('span', { class: 'esc-stat' });
  const elProgreso = el('span', { class: 'esc-progreso' });
  barra.append(elProgreso, el('span', { class: 'esp' }), elTiempo, elVidas, elPuntos);

  const btnSon = el('button', { class: 'esc-btn', attrs: { title: 'Sonido' }, on: { click: () => { sonido.silenciar(!sonido.estaSilenciado()); pintarSon(); } } });
  const pintarSon = () => { btnSon.textContent = sonido.estaSilenciado() ? '🔇' : '🔊'; };
  pintarSon();
  const btnPant = el('button', { class: 'esc-btn', text: '⛶', attrs: { title: 'Pantalla completa' }, on: { click: () => {
    if (document.fullscreenElement) document.exitFullscreen(); else raiz.requestFullscreen && raiz.requestFullscreen();
  } } });
  const btnRei = el('button', { class: 'esc-btn', text: '↻', attrs: { title: 'Reiniciar' }, on: { click: () => reiniciar() } });
  ctl.append(btnRei, btnSon, btnPant);

  const pintarStats = () => {
    elPuntos.textContent = '⭐ ' + puntos;
    elVidas.hidden = !(opc.vidas > 0);
    if (opc.vidas > 0) elVidas.textContent = '♥'.repeat(Math.max(0, vidas)) + '♡'.repeat(Math.max(0, opc.vidas - vidas));
  };

  const host = {
    raiz: area, escenario: raiz, datos, tipo, plantilla, titulo,
    get opciones() { return opc; },
    rnd: Math.random,
    sonido,
    confeti: sonido.confeti,
    acierto(p = 1, { sonar = true } = {}) { if (terminado) return; aciertos++; puntos += p; if (sonar) sonido.acierto(); pintarStats(); },
    fallo({ vida = true, sonar = true } = {}) {
      if (terminado) return false;
      errores++; if (sonar) sonido.error();
      if (vida && opc.vidas > 0) { vidas--; pintarStats(); if (vidas <= 0) { terminar({ motivo: 'vidas' }); return true; } }
      pintarStats(); return false;
    },
    puntuar(d) { puntos += d; pintarStats(); },
    fijarPuntos(n) { puntos = n; pintarStats(); },
    progreso(h, t) { elProgreso.textContent = t ? `${h} / ${t}` : ''; },
    // registra una respuesta para "Mostrar respuestas al final": {q, tu, ok, correcta?}
    revisar(e) { revisiones.push(e); },
    terminar
  };

  // Cronómetro: 'ninguno' | 'adelante' (cuenta lo transcurrido) | 'atras' (cuenta atrás desde opc.tiempo).
  // Compatibilidad: sin `cronometro`, un `tiempo` > 0 equivale a cuenta atrás.
  const modoCrono = () => opc.cronometro || (opc.tiempo > 0 ? 'atras' : 'ninguno');
  function reloj() {
    clearInterval(relojId);
    const modo = modoCrono();
    elTiempo.hidden = modo === 'ninguno';
    const pintar = () => {
      if (modo === 'ninguno') return;
      elTiempo.textContent = '⏱ ' + fmtTiempo(Math.max(0, restante));
      elTiempo.classList.toggle('urgente', modo === 'atras' && restante <= 10);
    };
    restante = modo === 'atras' ? (opc.tiempo || 60) : 0;
    pintar();
    relojId = setInterval(() => {
      if (terminado) return;
      if (modo === 'adelante') { restante++; pintar(); }
      else if (modo === 'atras') {
        restante--; pintar();
        if (restante <= 5 && restante > 0) sonido.aviso();
        if (restante <= 0) { clearInterval(relojId); (juego && juego.alAgotarTiempo) ? juego.alAgotarTiempo() : terminar({ motivo: 'tiempo' }); }
      }
    }, 1000);
  }

  // Anti-trampas: desenfoca el juego mientras la pestaña o la ventana no están activas.
  const desenfocar = (v) => area.classList.toggle('borroso', !!opc.borroso && v);
  const alPerder = () => desenfocar(true), alVolver = () => desenfocar(false);
  const alVisibilidad = () => desenfocar(document.hidden);
  window.addEventListener('blur', alPerder); window.addEventListener('focus', alVolver); document.addEventListener('visibilitychange', alVisibilidad);

  function inicio() {
    limpiar(capa); capa.hidden = false; capa.className = 'esc-capa esc-inicio';
    barra.hidden = true; limpiar(area);
    const campoNombre = tarea ? el('input', { class: 'esc-nombre', attrs: { placeholder: 'Escribe tu nombre', maxlength: 24 }, value: nombreTarea }) : null;
    const iniciar = () => {
      if (tarea) { nombreTarea = campoNombre.value.trim(); if (!nombreTarea) { campoNombre.focus(); campoNombre.classList.add('falta'); return; } }
      arrancar();
    };
    capa.append(...[
      el('div', { class: 'esc-inicio-pl', text: plantilla.nombre }),
      el('h2', { class: 'esc-inicio-ti', text: titulo }),
      campoNombre,
      el('div', { class: 'esc-inicio-bot' }, [
        el('button', { class: 'esc-iniciar esc-avance-b', on: { click: avance } }, [el('span', { class: 'tri', text: '\u{1F441}' }), el('b', { text: 'Avance' })]),
        el('button', { class: 'esc-iniciar', on: { click: iniciar } }, [el('span', { class: 'tri', text: '▶' }), el('b', { text: 'Juego' })])
      ]),
      el('p', { class: 'esc-inicio-de', text: plantilla.descripcion })
    ].filter(Boolean));
  }

  // Vista previa del contenido (sin jugar).
  function avance() {
    limpiar(capa); capa.className = 'esc-capa esc-avance';
    capa.append(el('h3', { text: 'Avance: ' + titulo }), listaContenido(tipo, datos), el('button', { class: 'esc-btn-grande', text: 'Volver', on: { click: inicio } }));
  }

  function arrancar() {
    sonido.desbloquear(); sonido.clic(); fijarVoz(opc.voz);
    capa.hidden = true; barra.hidden = false;
    terminado = false; puntos = aciertos = errores = 0; vidas = opc.vidas || 0;
    pintarStats(); elProgreso.textContent = '';
    limpiar(area);
    t0 = Date.now(); revisiones = [];
    if (alIniciar) alIniciar();
    try { juego = plantilla.montar(host) || {}; }
    catch (e) { console.error(e); area.append(el('p', { class: 'esc-error', text: 'No se pudo iniciar: ' + e.message })); juego = {}; }
    reloj();
  }

  function terminar(extra = {}) {
    if (terminado) return;
    terminado = true;
    clearInterval(relojId);
    if (juego && juego.destruir) { try { juego.destruir(); } catch (_) {} }
    const segs = Math.round((Date.now() - t0) / 1000);
    area.classList.remove('borroso');
    const res = { puntos, aciertos, errores, segundos: segs, ...extra };
    const buen = extra.motivo !== 'vidas' && extra.motivo !== 'tiempo' || puntos > 0;
    if (buen) { sonido.fin(); sonido.confeti(80); } else sonido.derrota();
    limpiar(capa); capa.hidden = false; capa.className = 'esc-capa esc-fin';
    const nombre = el('input', { class: 'esc-nombre', attrs: { placeholder: 'Tu nombre', maxlength: 24 } });
    const codigo = el('div', { class: 'esc-codigo', attrs: { hidden: true } });
    const guardar = el('button', { class: 'esc-btn-grande', text: 'Guardar en la tabla', on: { click: () => {
      if (alTerminar) alTerminar({ ...res, nombre: nombre.value.trim() || 'Anónimo' });
      guardar.disabled = true; guardar.textContent = '✓ Guardado'; nombre.disabled = true;
    } } });
    if (tarea && alTerminar) {
      Promise.resolve(alTerminar({ ...res, nombre: nombreTarea })).then(async (reg) => {
        codigo.hidden = false;
        if (reg && reg.enviado) { codigo.append(el('b', { text: '✔ Tu resultado se envió a tu profesor.' })); return; }
        const c = await codificar({ t: tarea.id, ti: titulo, n: nombreTarea, p: puntos, a: aciertos, e: errores, s: segs, f: Date.now() });
        codigo.append(el('b', { text: tarea.nube ? 'No se pudo enviar tu resultado. Entrega este código a tu profesor:' : 'Tu código de resultado (entrégaselo a tu profesor):' }), el('textarea', { attrs: { readonly: true, rows: 3 }, value: c, on: { focus: (ev) => ev.target.select() } }),
          el('button', { class: 'esc-btn-grande', text: 'Copiar código', on: { click: () => navigator.clipboard && navigator.clipboard.writeText(c) } }));
      });
    }
    capa.append(...[
      el('div', { class: 'esc-inicio-pl', text: extra.motivo === 'tiempo' ? '¡Se acabó el tiempo!' : extra.motivo === 'vidas' ? 'Sin vidas' : '¡Actividad terminada!' }),
      el('h2', { class: 'esc-inicio-ti', text: titulo }),
      el('div', { class: 'esc-cifras' }, [
        el('div', {}, [el('b', { text: String(puntos) }), el('span', { text: 'puntos' })]),
        el('div', {}, [el('b', { text: String(aciertos) }), el('span', { text: 'aciertos' })]),
        el('div', {}, [el('b', { text: String(errores) }), el('span', { text: 'errores' })]),
        el('div', {}, [el('b', { text: fmtTiempo(segs) }), el('span', { text: 'tiempo' })])
      ]),
      alTerminar && !tarea ? el('div', { class: 'esc-guardar' }, [nombre, guardar]) : null,
      codigo,
      opc.mostrarRespuestas && revisiones.length ? el('div', { class: 'esc-revision' }, [el('b', { text: 'Tus respuestas' }), el('ul', {}, revisiones.map((r) => el('li', { class: r.ok ? 'bien' : 'mal' }, [el('span', { text: (r.ok ? '✔ ' : '✘ ') + r.q }), el('small', { text: r.ok ? r.tu : `${r.tu || '(sin responder)'} → ${r.correcta}` })])))]) : null,
      el('button', { class: 'esc-btn-grande', text: '↻ Jugar de nuevo', on: { click: reiniciar } })
    ].filter(Boolean));
  }

  function reiniciar() {
    clearInterval(relojId);
    if (juego && juego.destruir) { try { juego.destruir(); } catch (_) {} }
    juego = null; terminado = false;
    inicio();
  }

  inicio();

  return {
    escenario: raiz,
    setEstilo(e, f) { aplicarEstilo(raiz, e, f); window.dispatchEvent(new Event('resize')); },
    setOpciones(o) { opc = { ...o }; },
    reiniciar,
    destruir() {
      window.removeEventListener('blur', alPerder); window.removeEventListener('focus', alVolver); document.removeEventListener('visibilitychange', alVisibilidad);
      clearInterval(relojId); fijarVoz(false);
      if (juego && juego.destruir) { try { juego.destruir(); } catch (_) {} }
      raiz.remove();
    }
  };
}
