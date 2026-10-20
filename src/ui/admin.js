'use strict';

import { el } from '../core/util.js';
import { pagina } from './layout.js';
import { ir } from '../core/router.js';
import { plantillaPorId } from '../plantillas.js';
import { usuarioActual, esAdmin, resumenAdmin, conectadosAhora, alCambiarPresencia, listarReportes, borrarReporte, quitarDeComunidad } from '../core/nube.js';
import { aviso } from '../core/util.js';

const fecha = (t) => (t ? new Date(t).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const hace = (t) => {
  if (!t) return 'nunca';
  const s = Math.max(0, (Date.now() - new Date(t)) / 1000);
  if (s < 90) return 'ahora mismo';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
};
const NS = 'http://www.w3.org/2000/svg';

// Barras por día (SVG sin dependencias).
function barras(datos, titulo) {
  const W = 600, H = 150, max = Math.max(1, ...datos.map((d) => d.n)), w = W / datos.length;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H + 22}`); svg.setAttribute('class', 'adm-graf'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', titulo);
  datos.forEach((d, i) => {
    const h = (d.n / max) * H;
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', i * w + 2); r.setAttribute('y', H - h); r.setAttribute('width', w - 4); r.setAttribute('height', Math.max(h, d.n ? 2 : 0)); r.setAttribute('rx', 3);
    r.setAttribute('fill', 'var(--acento)');
    const t = document.createElementNS(NS, 'title'); t.textContent = `${d.dia}: ${d.n}`; r.append(t);
    svg.append(r);
  });
  [[0, datos[0]], [datos.length - 1, datos[datos.length - 1]]].forEach(([i, d], k) => {
    const x = document.createElementNS(NS, 'text');
    x.setAttribute('x', k ? W : 0); x.setAttribute('y', H + 16); x.setAttribute('text-anchor', k ? 'end' : 'start'); x.setAttribute('fill', 'var(--gris)'); x.setAttribute('font-size', 12);
    x.textContent = d.dia.slice(5); svg.append(x);
  });
  return el('div', { class: 'tarjeta' }, [el('h3', { text: titulo }), el('small', { class: 'sub', text: `Máximo en un día: ${max}` }), svg]);
}

// Barras horizontales (ranking).
function ranking(datos, titulo, nombre = (x) => x) {
  const max = Math.max(1, ...datos.map((d) => d.n));
  return el('div', { class: 'tarjeta' }, [el('h3', { text: titulo }),
    ...(datos.length ? datos.map((d) => el('div', { class: 'adm-fila' }, [
      el('span', { text: nombre(d.nombre) }),
      el('div', { class: 'adm-barra' }, [el('i', { style: { width: (d.n / max) * 100 + '%' } })]),
      el('b', { text: d.n })])) : [el('p', { class: 'sub', text: 'Sin datos todavía.' })])]);
}

const dato = (n, t, extra) => el('div', { class: 'adm-dato' }, [el('b', { text: n }), el('span', { text: t }), extra ? el('small', { text: extra }) : '']);

export async function vistaAdmin(raiz) {
  const main = pagina(raiz);
  if (!usuarioActual()) { ir('/entrar'); return; }
  main.append(el('p', { class: 'sub', text: 'Cargando…' }));
  if (!(await esAdmin())) { main.replaceChildren(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Sin acceso' }), el('p', { class: 'sub', text: 'Esta sección es solo para administradores.' })])); return; }

  let r;
  try { r = await resumenAdmin(); } catch (e) { main.replaceChildren(el('div', { class: 'tarjeta' }, [el('p', { text: 'No se pudo cargar: ' + (e.message || e) })])); return; }

  const nombrePlantilla = (id) => { const p = id && plantillaPorId(id); return p ? p.nombre : id || 'Sin plantilla'; };
  const conectados = el('div');
  const pintarConectados = (lista) => {
    const reg = lista.filter((c) => c.correo), anon = lista.length - reg.length;
    conectados.replaceChildren(el('div', { class: 'tarjeta' }, [
      el('h3', { text: `Conectados ahora: ${lista.length}` }),
      el('p', { class: 'sub', text: `${reg.length} con sesión y ${anon} visitantes sin cuenta. Se actualiza solo.` }),
      ...reg.map((c) => el('div', { class: 'adm-fila' }, [el('span', { class: 'adm-punto' }), el('span', { text: c.correo }), el('small', { class: 'sub', text: 'desde ' + hace(c.desde) })]))]));
  };
  pintarConectados(conectadosAhora());
  const quitar = alCambiarPresencia((l) => { if (!conectados.isConnected) quitar(); else pintarConectados(l); });

  const filtro = el('input', { attrs: { type: 'search', placeholder: 'Buscar por correo o nombre' } });
  const cuerpo = el('tbody');
  const pintarTabla = () => {
    const q = filtro.value.trim().toLowerCase();
    cuerpo.replaceChildren(...r.usuarios.filter((u) => !q || `${u.email} ${u.nombre || ''}`.toLowerCase().includes(q)).map((u) => el('tr', {}, [
      el('td', {}, [el('b', { text: u.nombre || u.email }), el('br'), el('small', { class: 'sub', text: u.nombre ? u.email : '' }), u.admin ? el('span', { class: 'etiqueta', text: 'admin' }) : '']),
      el('td', { text: u.proveedor === 'google' ? 'Google' : 'Correo' }),
      el('td', { text: fecha(u.creado) }),
      el('td', { attrs: { title: fecha(u.ultimo_acceso) }, text: hace(u.ultimo_acceso) }),
      el('td', { text: u.actividades }),
      el('td', { text: hace(u.ultima_edicion) })
    ])));
  };
  filtro.addEventListener('input', pintarTabla); pintarTabla();

  // Reportes de la Comunidad
  const reportes = el('div', { class: 'tarjeta' }, [el('h3', { text: 'Reportes de la Comunidad' }), el('p', { class: 'sub', text: 'Cargando…' })]);
  const pintarReportes = async () => {
    let lista = [];
    try { lista = await listarReportes(); } catch (e) { reportes.replaceChildren(el('h3', { text: 'Reportes de la Comunidad' }), el('p', { text: 'No se pudieron cargar: ' + (e.message || e) })); return; }
    reportes.replaceChildren(el('h3', { text: `Reportes de la Comunidad (${lista.length})` }), ...(lista.length ? lista.map((x) => el('div', { class: 'adm-reporte' }, [
      el('div', {}, [el('a', { text: 'Ver actividad', attrs: { href: `#/comunidad/${x.autor_id}/${encodeURIComponent(x.act_id)}` } }), el('small', { class: 'sub', text: ' · ' + fecha(x.creada) }), el('p', { text: x.motivo })]),
      el('div', { class: 'fila' }, [
        el('button', { class: 'btn btn-claro btn-mini', attrs: { type: 'button' }, text: 'Descartar', on: { click: async () => { try { await borrarReporte(x.id); pintarReportes(); } catch (e) { aviso('No se pudo: ' + (e.message || e)); } } } }),
        el('button', { class: 'btn btn-peligro btn-mini', attrs: { type: 'button' }, text: 'Quitar actividad', on: { click: async () => {
          if (!confirm('¿Quitar la actividad de la Comunidad?')) return;
          try { await quitarDeComunidad(x.act_id, x.autor_id); await borrarReporte(x.id); pintarReportes(); } catch (e) { aviso('No se pudo: ' + (e.message || e)); }
        } } })
      ])
    ])) : [el('p', { class: 'sub', text: 'No hay reportes pendientes.' })]));
  };
  pintarReportes();

  const t = r.totales;
  main.replaceChildren(
    el('div', { class: 'fila entre' }, [el('h1', { text: 'Panel de administración' }), el('small', { class: 'sub', text: 'Datos de ' + fecha(r.generado) })]),
    el('div', { class: 'adm-datos' }, [
      dato(t.usuarios, 'Usuarios'), dato(t.nuevos_7d, 'Nuevos (7 días)'), dato(t.activos_24h, 'Entraron (24 h)'), dato(t.activos_7d, 'Entraron (7 días)'),
      dato(t.actividades, 'Actividades', t.en_papelera + ' en papelera')
    ]),
    conectados,
    reportes,
    el('div', { class: 'adm-rejilla' }, [
      barras(r.registros_dia, 'Cuentas nuevas por día (30 días)'),
      barras(r.accesos_dia, 'Usuarios que iniciaron sesión por día (30 días)'),
      ranking(r.plantillas, 'Plantillas más usadas', nombrePlantilla),
      ranking(r.proveedores, 'Cómo entran', (p) => (p === 'google' ? 'Google' : 'Correo'))
    ]),
    el('div', { class: 'tarjeta' }, [
      el('h3', { text: `Usuarios (${r.usuarios.length})` }), filtro,
      el('div', { class: 'adm-tabla' }, [el('table', {}, [
        el('thead', {}, [el('tr', {}, ['Usuario', 'Acceso', 'Registro', 'Última conexión', 'Actividades', 'Última edición'].map((h) => el('th', { text: h })))]), cuerpo])]),
      el('small', { class: 'sub', text: 'La última conexión es el último inicio de sesión; si alguien mantiene la sesión abierta, aparece en "Conectados ahora".' })
    ])
  );
}
