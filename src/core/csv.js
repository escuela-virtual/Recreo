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
