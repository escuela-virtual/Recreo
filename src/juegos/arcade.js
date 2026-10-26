'use strict';

import { el, limpiar, barajar } from '../core/util.js';
import { celda, OPC, temporizadores } from './ayudas.js';
import { adaptar } from '../core/contenido.js';
import azar from './azar.js';

// Bucle de animación que se detiene al destruir el juego.
function bucle(fn) {
  let id = 0, t0 = performance.now(), vivo = true;
  const paso = (t) => { if (!vivo) return; const dt = Math.min(0.05, (t - t0) / 1000); t0 = t; fn(dt); id = requestAnimationFrame(paso); };
  id = requestAnimationFrame(paso);
  return () => { vivo = false; cancelAnimationFrame(id); };
};
const preparar = (h) => {
  let qs = barajar(h.datos).map((q) => ({ ...q, resp: barajar(q.resp) }));
  return qs;
};
const caja = (h, clase) => { const c = el('div', { class: clase }); h.raiz.appendChild(c); return c; };

// ---------- Atrapa al topo ----------
const topo = {
  id: 'topo', nombre: 'Atrapa al topo', icono: '🔨', color: '#8d5a2b',
  descripcion: 'Los topos aparecen de uno en uno. Golpea solo el que tiene la respuesta correcta.',
  acepta: ['quiz'], minimo: 2, imprimible: false,
  opciones: [OPC.velocidad(5), OPC.vidas(3), OPC.tiempo(0)],
  montar(h) {
    const T = temporizadores();
    const qs = preparar(h); let i = 0, activo = null, ocupado = false, intentos = 0;
    const cont = caja(h, 'topo');
    const preg = el('div', { class: 'e-card topo-q' });
    const campo = el('div', { class: 'topo-campo' });
    const hoyos = Array.from({ length: matchMedia('(max-width: 700px) and (orientation: portrait)').matches ? 8 : 9 }, () => { const b = el('button', { class: 'topo-hoyo' }, [el('div', { class: 'topo-bicho' })]); campo.append(b); return b; });
    cont.append(preg, campo);
    const dur = () => Math.max(900, 2800 - (h.opciones.velocidad || 5) * 200);

    function pintarQ() { limpiar(preg); preg.append(celda(qs[i].q, qs[i].img)); h.progreso(i, qs.length); intentos = 0; }
    function aparece() {
      if (ocupado) return;
      const q = qs[i]; const libres = hoyos.filter((x) => !x.classList.contains('arriba'));
      const hoyo = libres[(Math.random() * libres.length) | 0];
      const bien = intentos >= 2 || Math.random() < 0.45; intentos = bien ? 0 : intentos + 1;
      const r = bien ? q.resp.find((x) => x.ok) : barajar(q.resp.filter((x) => !x.ok))[0];
      const bicho = hoyo.firstChild; bicho.textContent = ''; bicho.append(el('span', { class: 'topo-ico', text: '🐹' }), el('span', { class: 'topo-txt', text: r.t }));
      hoyo.classList.add('arriba'); hoyo.dataset.ok = r.ok ? '1' : '0';
      const sale = T.esperar(() => { hoyo.classList.remove('arriba'); }, dur());
      hoyo.onclick = () => {
        if (!hoyo.classList.contains('arriba') || ocupado) return;
        T.cancelar(sale); hoyo.classList.remove('arriba');
        if (r.ok) { ocupado = true; h.acierto(1); h.confeti(20); T.esperar(() => { i++; if (i >= qs.length) return h.terminar(); pintarQ(); ocupado = false; }, 500); }
        else { hoyo.classList.add('golpe'); T.esperar(() => hoyo.classList.remove('golpe'), 400); h.fallo(); }
      };
    }
    pintarQ();
    const id = T.cada(aparece, Math.max(550, 1500 - (h.opciones.velocidad || 5) * 80));
    return { destruir: () => T.limpiar() };
  }
};

// ---------- Avión ----------
const avion = {
  id: 'avion', nombre: 'Avión', icono: '✈️', color: '#00b4d8',
  descripcion: 'Mueve el avión con el ratón, el dedo o las flechas. Vuela hasta la respuesta correcta y evita las demás.',
  acepta: ['quiz'], minimo: 2, imprimible: false,
  opciones: [OPC.velocidad(4), OPC.vidas(3), OPC.tiempo(0)],
  montar(h) {
    const qs = preparar(h); let i = 0, nubes = [], py = 0.5, objetivo = 0.5, bloqueo = 0, perdidas = 0;
    const cont = caja(h, 'avi');
    const preg = el('div', { class: 'e-card avi-q' });
    const cielo = el('div', { class: 'avi-cielo' });
    const plano = el('div', { class: 'avi-avion', text: '✈️' });
    cielo.append(plano); cont.append(preg, cielo);
    const mover = (ev) => { const r = cielo.getBoundingClientRect(); objetivo = Math.max(0.06, Math.min(0.94, (ev.clientY - r.top) / r.height)); };
    cielo.addEventListener('pointermove', mover); cielo.addEventListener('pointerdown', mover);
    const teclas = {};
    const kd = (e) => { teclas[e.key] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); }; const ku = (e) => { teclas[e.key] = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    function lanzar() {
      nubes.forEach((n) => n.el.remove()); nubes = [];
      const q = qs[i]; limpiar(preg); preg.append(celda(q.q, q.img)); h.progreso(i, qs.length); perdidas = 0;
      const n = q.resp.length; const carriles = barajar(Array.from({ length: n }, (_, k) => (k + 0.5) / n));
      q.resp.forEach((r, k) => { const e = el('div', { class: 'avi-nube', text: r.t }); cielo.append(e); nubes.push({ el: e, r, x: 1.05 + k * 0.1, y: carriles[k] }); });
    }
    lanzar();
    const parar = bucle((dt) => {
      if (teclas.ArrowUp || teclas.w) objetivo = Math.max(0.06, objetivo - dt * 0.9); if (teclas.ArrowDown || teclas.s) objetivo = Math.min(0.94, objetivo + dt * 0.9);
      py += (objetivo - py) * Math.min(1, dt * 8); plano.style.top = py * 100 + '%';
      const v = 0.09 + (h.opciones.velocidad || 4) * 0.025; bloqueo = Math.max(0, bloqueo - dt);
      const pr = plano.getBoundingClientRect();
      for (const n of [...nubes]) {
        n.x -= v * dt; n.el.style.left = n.x * 100 + '%'; n.el.style.top = n.y * 100 + '%';
        if (n.x < -0.2) { n.el.remove(); nubes = nubes.filter((q) => q !== n); if (n.r.ok) { h.fallo(); lanzar(); return; } continue; }
        const r = n.el.getBoundingClientRect();
        if (bloqueo <= 0 && pr.right > r.left + 6 && pr.left < r.right - 6 && pr.bottom > r.top + 4 && pr.top < r.bottom - 4) {
          if (n.r.ok) { h.acierto(1); i++; if (i >= qs.length) { h.terminar(); return; } lanzar(); return; }
          n.el.classList.add('mal'); nubes = nubes.filter((q) => q !== n); setTimeout(() => n.el.remove(), 300); bloqueo = 0.4; if (h.fallo()) return;
        }
      }
    });
    return { destruir: () => { parar(); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); } };
  }
};

// ---------- Explotar globos ----------
const globos = {
  id: 'globos', nombre: 'Explotar globos', icono: '🎈', color: '#ff006e',
  descripcion: 'Explota el globo con la respuesta correcta antes de que se escape.',
  acepta: ['quiz'], minimo: 2, imprimible: false,
  opciones: [OPC.velocidad(4), OPC.vidas(3), OPC.tiempo(0)],
  montar(h) {
    const qs = preparar(h); let i = 0, lista = [];
    const cont = caja(h, 'glo');
    const preg = el('div', { class: 'e-card glo-q' });
    const cielo = el('div', { class: 'glo-cielo' });
    cont.append(preg, cielo);
    const COL = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c'];
    function lanzar() {
      lista.forEach((g) => g.el.remove()); lista = [];
      const q = qs[i]; limpiar(preg); preg.append(celda(q.q, q.img)); h.progreso(i, qs.length);
      const n = q.resp.length; const xs = barajar(Array.from({ length: n }, (_, k) => (k + 0.5) / n));
      q.resp.forEach((r, k) => {
        const e = el('button', { class: 'glo-g', style: { '--c': COL[k % COL.length] } }, [el('span', { text: r.t })]);
        const g = { el: e, r, x: xs[k], y: 1.05 + k * 0.12, d: Math.random() * 6 };
        e.onclick = () => {
          if (g.muerto) return; g.muerto = true; e.classList.add('pop'); setTimeout(() => e.remove(), 250); lista = lista.filter((z) => z !== g);
          if (r.ok) { h.acierto(1); i++; if (i >= qs.length) { h.terminar(); return; } setTimeout(lanzar, 350); } else h.fallo();
        };
        cielo.append(e); lista.push(g);
      });
    }
    lanzar();
    const parar = bucle((dt) => {
      const v = 0.06 + (h.opciones.velocidad || 4) * 0.02;
      for (const g of [...lista]) {
        g.y -= v * dt; g.d += dt * 2; g.el.style.left = (g.x * 100 + Math.sin(g.d) * 2) + '%'; g.el.style.top = g.y * 100 + '%';
        if (g.y < -0.25) { g.el.remove(); lista = lista.filter((z) => z !== g); if (g.r.ok) { if (h.fallo()) return; lanzar(); return; } }
      }
    });
    return { destruir: parar };
  }
};

// ---------- Fruta voladora ----------
const FRUTAS = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍍', '🍑'];
const fruta = {
  id: 'fruta', nombre: 'Fruta voladora', icono: '🍉', color: '#fb8500',
  descripcion: 'Las respuestas cruzan la pantalla. Toca la correcta cuando la veas.',
  acepta: ['quiz'], minimo: 2, imprimible: false,
  opciones: [OPC.velocidad(4), OPC.vidas(3), OPC.tiempo(0)],
  montar(h) {
    const qs = preparar(h); let i = 0, lista = [], espera = 0;
    const cont = caja(h, 'fru');
    const preg = el('div', { class: 'e-card glo-q' });
    const cielo = el('div', { class: 'fru-cielo' });
    cont.append(preg, cielo);
    function nueva() {
      lista.forEach((g) => g.el.remove()); lista = [];
      const q = qs[i]; limpiar(preg); preg.append(celda(q.q, q.img)); h.progreso(i, qs.length);
      const n = q.resp.length; const carriles = barajar(Array.from({ length: n }, (_, k) => (k + 0.5) / n));
      barajar(q.resp).forEach((r, k) => {
        const e = el('button', { class: 'fru-f' }, [el('span', { class: 'fru-i', text: FRUTAS[(Math.random() * FRUTAS.length) | 0] }), el('span', { class: 'fru-t', text: r.t })]);
        const g = { el: e, r, x: 1.05 + k * 0.28, y: carriles[k], v: 0.8 + Math.random() * 0.4 };
        e.onclick = () => {
          if (g.muerto) return; g.muerto = true; e.classList.add('pop'); setTimeout(() => e.remove(), 250); lista = lista.filter((z) => z !== g);
          if (r.ok) { h.acierto(1); i++; if (i >= qs.length) { h.terminar(); return; } espera = 0.5; lista.forEach((z) => z.el.remove()); lista = []; } else h.fallo();
        };
        cielo.append(e); lista.push(g);
      });
    }
    nueva();
    const parar = bucle((dt) => {
      if (espera > 0) { espera -= dt; if (espera <= 0) nueva(); return; }
      const v = 0.07 + (h.opciones.velocidad || 4) * 0.025;
      for (const g of [...lista]) {
        g.x -= v * g.v * dt; g.el.style.left = g.x * 100 + '%'; g.el.style.top = g.y * 100 + '%';
        if (g.x < -0.3) { g.el.remove(); lista = lista.filter((z) => z !== g); if (g.r.ok) { if (h.fallo()) return; nueva(); return; } }
      }
    });
    return { destruir: parar };
  }
};

// ---------- Persecución en laberinto ----------
const MAPA = [
  '###############',
  '#.............#',
  '#.###.###.###.#',
  '#.............#',
  '#.#.#######.#.#',
  '#.............#',
  '#.###.###.###.#',
  '#.............#',
  '###############'
];
const ZONAS = [[1, 1, '#ef476f'], [13, 1, '#118ab2'], [1, 7, '#06d6a0'], [13, 7, '#ffd166']];
const laberinto = {
  id: 'laberinto', nombre: 'Persecución en laberinto', icono: '👾', color: '#6a4c93',
  descripcion: 'Corre hasta la zona con la respuesta correcta y escapa de los enemigos.',
  acepta: ['quiz'], minimo: 2, imprimible: false,
  opciones: [{ k: 'dificultad', grupo: 'modo', etiqueta: 'Dificultad', tipo: 'rango', min: 1, max: 5, paso: 1, def: 3 }, OPC.vidas(3)],
  montar(h) {
    const qs = preparar(h).map((q) => ({ ...q, resp: q.resp.slice(0, 4) })); let i = 0;
    const W = MAPA[0].length, H = MAPA.length;
    const cont = caja(h, 'lab');
    const preg = el('div', { class: 'e-card lab-q' });
    const leyenda = el('div', { class: 'lab-ley' });
    const canvas = el('canvas', { class: 'lab-canvas' });
    const dpad = el('div', { class: 'lab-dpad' }, [['↑', 0, -1], ['←', -1, 0], ['↓', 0, 1], ['→', 1, 0]].map(([t, dx, dy]) => el('button', { class: 'e-btn', text: t, on: { pointerdown: (e) => { e.preventDefault(); intentar(dx, dy); } } })));
    cont.append(preg, leyenda, canvas, dpad);
    const libre = (x, y) => y >= 0 && y < H && x >= 0 && x < W && MAPA[y][x] !== '#';
    let jug, enemigos, zonas, tPaso = 0, inmune = 0;
    const inicio = () => { jug = { x: 7, y: 5 }; enemigos = [{ x: 7, y: 1 }, { x: 1, y: 3 }, { x: 13, y: 3 }].slice(0, 1 + Math.ceil((h.opciones.dificultad || 3) / 2)); inmune = 1.2; };
    function pregunta() {
      const q = qs[i]; limpiar(preg); preg.append(celda(q.q, q.img)); h.progreso(i, qs.length);
      zonas = q.resp.map((r, k) => ({ x: ZONAS[k][0], y: ZONAS[k][1], c: ZONAS[k][2], r }));
      limpiar(leyenda); zonas.forEach((z) => leyenda.append(el('span', { class: 'lab-op' }, [el('i', { style: { background: z.c } }), z.r.t])));
      inicio();
    }
    function intentar(dx, dy) { const nx = jug.x + dx, ny = jug.y + dy; if (!libre(nx, ny)) return; jug.x = nx; jug.y = ny; revisar(); }
    function revisar() {
      const z = zonas.find((q) => q.x === jug.x && q.y === jug.y);
      if (z) {
        if (z.r.ok) { h.acierto(1); i++; if (i >= qs.length) { h.terminar(); return; } pregunta(); }
        else { z.usada = true; if (h.fallo()) return; inicio(); }
      }
      if (inmune <= 0 && enemigos.some((e) => e.x === jug.x && e.y === jug.y)) { if (h.fallo()) return; inicio(); }
    }
    const teclas = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
    let dir = null, tJug = 0;
    const kd = (e) => { if (teclas[e.key]) { dir = teclas[e.key]; e.preventDefault(); intentar(...dir); tJug = 0; } };
    const ku = (e) => { if (teclas[e.key] && dir === teclas[e.key]) dir = null; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    const ctx = canvas.getContext('2d');
    function dibujar() {
      const r = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(r.width * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); }
      const c = Math.min(canvas.width / W, canvas.height / H); const ox = (canvas.width - c * W) / 2, oy = (canvas.height - c * H) / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(ox, oy);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (MAPA[y][x] === '#') { ctx.fillStyle = '#1b1464'; ctx.fillRect(x * c, y * c, c, c); ctx.strokeStyle = '#4b5bd6'; ctx.lineWidth = 2; ctx.strokeRect(x * c + 2, y * c + 2, c - 4, c - 4); }
      zonas.forEach((z) => { ctx.globalAlpha = z.usada ? 0.3 : 1; ctx.fillStyle = z.c; ctx.fillRect(z.x * c + 3, z.y * c + 3, c - 6, c - 6); ctx.globalAlpha = 1; });
      ctx.font = `${c * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      enemigos.forEach((e) => ctx.fillText('👻', (e.x + 0.5) * c, (e.y + 0.55) * c));
      if (inmune <= 0 || Math.floor(inmune * 8) % 2 === 0) ctx.fillText('🧑', (jug.x + 0.5) * c, (jug.y + 0.55) * c);
      ctx.restore();
    }
    function moverEnemigos() {
      enemigos.forEach((e) => {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => libre(e.x + dx, e.y + dy));
        dirs.sort((a, b) => (Math.abs(jug.x - e.x - a[0]) + Math.abs(jug.y - e.y - a[1])) - (Math.abs(jug.x - e.x - b[0]) + Math.abs(jug.y - e.y - b[1])));
        const [dx, dy] = Math.random() < 0.65 ? dirs[0] : dirs[(Math.random() * dirs.length) | 0]; e.x += dx; e.y += dy;
      });
    }
    pregunta();
    const parar = bucle((dt) => {
      inmune = Math.max(0, inmune - dt); tPaso += dt; tJug += dt;
      if (dir && tJug > 0.16) { tJug = 0; intentar(...dir); }
      if (tPaso > Math.max(0.25, 0.95 - (h.opciones.dificultad || 3) * 0.12)) { tPaso = 0; moverEnemigos(); revisar(); }
      dibujar();
    });
    return { destruir: () => { parar(); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); } };
  }
};

// ---------- Generador de matemáticas ----------
const cuestionario = azar[0];
const mates = {
  id: 'generador-mates', nombre: 'Generador de matemáticas', icono: '➗', color: '#2a9d8f',
  descripcion: 'Elige las operaciones y el generador crea una tanda de preguntas de matemáticas.',
  acepta: ['mates'], soloNativa: true, minimo: 1, imprimible: true,
  opciones: [OPC.aleaResp(), OPC.mostrarOk(true), OPC.tiempo(0), OPC.vidas(0)],
  montar(h) {
    const quiz = adaptar('mates', h.datos, 'quiz');
    return cuestionario.montar(Object.create(h, { datos: { value: quiz }, tipo: { value: 'quiz' } }));
  },
  imprimir(c) {
    const qs = adaptar('mates', c, 'quiz');
    return `<ol style="columns:2;font-size:20px;line-height:2.4">${qs.map((q) => `<li>${q.q.replace('?', '<span class="lin corta">&nbsp;</span>')}</li>`).join('')}</ol>`;
  }
};

export default [laberinto, topo, avion, globos, fruta, mates];
