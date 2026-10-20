'use strict';

import { el, limpiar, aviso, fmtTiempo } from '../core/util.js';
import { pagina } from './layout.js';
import { resultados } from '../core/almacen.js';
import { decodificar } from '../core/codec.js';

// Huella corta del código: importar dos veces el mismo código no duplica el resultado.
const huella = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + t.length; };

export async function vistaResultados(raiz) {
  const main = pagina(raiz);
  const cuerpo = el('div');
  const campo = el('textarea', { attrs: { rows: 3, placeholder: 'Pega aquí el código de resultado que te entregó un alumno' }, style: { width: '100%' } });

  async function importar() {
    const lineas = campo.value.split(/\s+/).filter(Boolean);
    let n = 0;
    for (const l of lineas) {
      try {
        const d = await decodificar(l);
        if (!d.t || d.n == null) throw 0;
        await resultados.guardar({ id: 'imp-' + huella(l), actId: d.t, titulo: d.ti || 'Tarea', nombre: d.n, puntos: d.p, aciertos: d.a, errores: d.e, segundos: d.s, fecha: d.f || Date.now(), remoto: true });
        n++;
      } catch (_) { /* código inválido: se ignora */ }
    }
    if (n) { aviso(`${n} resultado(s) importado(s)`); campo.value = ''; pintar(); } else aviso('No se reconoció ningún código válido');
  }

  async function pintar() {
    limpiar(cuerpo);
    const todos = (await resultados.todos()).sort((a, b) => b.fecha - a.fecha);
    if (!todos.length) { cuerpo.append(el('p', { class: 'sub', text: 'Todavía no hay resultados guardados en este dispositivo.' })); return; }
    const porAct = new Map();
    todos.forEach((r) => { if (!porAct.has(r.actId)) porAct.set(r.actId, []); porAct.get(r.actId).push(r); });
    porAct.forEach((lista, id) => {
      cuerpo.append(el('div', { class: 'tarjeta' }, [
        el('div', { class: 'fila entre' }, [el('h3', { text: lista[0].titulo }), el('div', { class: 'fila' }, [
          el('button', { class: 'btn btn-claro btn-mini', text: 'Descargar en Excel', on: { click: () => csv(lista) } }),
          el('button', { class: 'btn btn-peligro btn-mini', text: 'Borrar', on: { click: async () => { if (confirm('¿Borrar estos resultados?')) { for (const r of lista) await resultados.borrar(r.id); pintar(); } } } })
        ])]),
        el('div', { class: 'tabla-scroll' }, [el('table', { class: 'tabla' }, [
          el('thead', {}, [el('tr', {}, ['Nombre', 'Puntos', 'Aciertos', 'Errores', 'Tiempo', 'Fecha', 'Origen'].map((t) => el('th', { text: t })))]),
          el('tbody', {}, lista.map((r) => el('tr', {}, [r.nombre, r.puntos, r.aciertos, r.errores, fmtTiempo(r.segundos), new Date(r.fecha).toLocaleString('es'), r.remoto ? 'Código de alumno' : 'Este dispositivo'].map((v) => el('td', { text: String(v) })))))
        ])])
      ]));
    });
  }

  function csv(lista) {
    const filas = [['Nombre', 'Puntos', 'Aciertos', 'Errores', 'Segundos', 'Fecha'], ...lista.map((r) => [r.nombre, r.puntos, r.aciertos, r.errores, r.segundos, new Date(r.fecha).toISOString()])];
    const txt = '﻿' + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = el('a', { attrs: { href: URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })), download: 'resultados.csv' } });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  main.append(
    el('div', { class: 'tarjeta' }, [
      el('h1', { text: 'Mis resultados' }),
      el('p', { class: 'sub', text: 'Aquí aparecen los resultados guardados en este dispositivo y los que importes de tus alumnos.' }),
      el('h3', { text: 'Importar resultados de tareas', style: { margin: '16px 0 6px' } }), campo,
      el('div', { style: { marginTop: '10px' } }, [el('button', { class: 'btn', text: 'Importar códigos', on: { click: importar } })])
    ]),
    cuerpo
  );
  pintar();
}
