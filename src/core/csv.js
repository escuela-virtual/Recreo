'use strict';

// Descarga una tabla como CSV (con BOM y ";" para que Excel en español la abra bien).
export function descargarCSV(nombre, filas) {
  const txt = '﻿' + filas.map((f) => f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// Lee CSV/TSV (separador ; , o tabulación, con comillas) y devuelve filas de celdas.
export function leerCSV(texto) {
  const t = texto.replace(/^﻿/, '');
  const primera = t.split(/\r?\n/, 1)[0] || '';
  const sep = [';', '\t', ','].map((s) => [s, primera.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const filas = []; let fila = [], celda = '', comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) { if (c === '"') { if (t[i + 1] === '"') { celda += '"'; i++; } else comillas = false; } else celda += c; }
    else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(celda); celda = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; fila.push(celda); celda = ''; if (fila.some((x) => x.trim())) filas.push(fila); fila = []; }
    else celda += c;
  }
  fila.push(celda); if (fila.some((x) => x.trim())) filas.push(fila);
  return filas.map((f) => f.map((x) => x.trim()));
}

// ---- Excel (.xlsx) ----
// Un .xlsx es un ZIP con XML. Se lee con lo que trae el navegador (DecompressionStream), sin librerías.
async function leerZip(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let e = buf.byteLength - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('no es un archivo de Excel');
  const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  const archivos = {};
  for (let i = 0; i < n && v.getUint32(p, true) === 0x02014b50; i++) {
    const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true);
    archivos[dec.decode(u8.subarray(p + 46, p + 46 + nl))] = { metodo: v.getUint16(p + 10, true), tam: v.getUint32(p + 20, true), pos: v.getUint32(p + 42, true) };
    p += 46 + nl + xl + cl;
  }
  return async (nombre) => {
    const f = archivos[nombre]; if (!f) return null;
    const ini = f.pos + 30 + v.getUint16(f.pos + 26, true) + v.getUint16(f.pos + 28, true), datos = u8.subarray(ini, ini + f.tam);
    if (f.metodo === 0) return dec.decode(datos);
    const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter();
    w.write(datos); w.close();
    return dec.decode(await new Response(ds.readable).arrayBuffer());
  };
}

export async function leerXLSX(buf) {
  const leer = await leerZip(buf);
  const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
  const textos = [...xml((await leer('xl/sharedStrings.xml')) || '<sst/>').getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join(''));
  const hoja = await leer('xl/worksheets/sheet1.xml');
  if (!hoja) throw new Error('el archivo no tiene hojas');
  const filas = [];
  for (const fila of xml(hoja).getElementsByTagName('row')) {
    const celdas = [];
    for (const c of fila.getElementsByTagName('c')) {
      const col = [...(c.getAttribute('r') || '').replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const tipo = c.getAttribute('t'), v = c.getElementsByTagName('v')[0];
      celdas[col] = tipo === 's' && v ? textos[+v.textContent] : tipo === 'inlineStr' ? [...c.getElementsByTagName('t')].map((t) => t.textContent).join('') : v ? v.textContent : '';
    }
    const limpia = Array.from(celdas, (x) => (x == null ? '' : String(x).trim()));
    if (limpia.some(Boolean)) filas.push(limpia);
  }
  return filas;
}

// Lee la hoja de un archivo de Excel (.xlsx) o de texto (.csv, .txt) y devuelve filas de celdas.
export async function leerTabla(archivo) {
  return /\.xlsx$/i.test(archivo.name) ? leerXLSX(await archivo.arrayBuffer()) : leerCSV(await archivo.text());
}
