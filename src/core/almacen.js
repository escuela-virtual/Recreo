'use strict';

import { usuarioActual, traerActividades, subirActividades, borrarActividadNube, publicarComunidad, quitarDeComunidad } from './nube.js';
import { aviso } from './util.js';

// Persistencia en IndexedDB: un único almacén de actividades y otro de resultados.
const abrir = () => new Promise((ok, mal) => {
  const r = indexedDB.open('recreo-datos', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('actividades', { keyPath: 'id' }); r.result.createObjectStore('resultados', { keyPath: 'id' }); };
  r.onsuccess = () => ok(r.result);
  r.onerror = () => mal(r.error);
});
const op = async (almacen, modo, fn) => {
  const db = await abrir();
  return new Promise((ok, mal) => {
    const t = db.transaction(almacen, modo);
    const req = fn(t.objectStore(almacen));
    t.oncomplete = () => ok(req && req.result);
    t.onerror = () => mal(t.error);
  });
};
const API = (almacen) => ({
  todos: () => op(almacen, 'readonly', (s) => s.getAll()),
  uno: (id) => op(almacen, 'readonly', (s) => s.get(id)),
  guardar: (o) => op(almacen, 'readwrite', (s) => s.put(o)),
  borrar: (id) => op(almacen, 'readwrite', (s) => s.delete(id))
});
const crudo = API('actividades');

// Local primero: IndexedDB manda (funciona sin conexión ni cuenta). Con sesión iniciada, cada cambio
// se refleja también en la nube y `sincronizar()` junta ambas copias (gana la más reciente).
let sincronizando = null, ultimoAviso = 0;
const falloNube = (e) => { console.warn('Nube:', e); if (Date.now() - ultimoAviso > 20000) { ultimoAviso = Date.now(); aviso('No se pudo guardar en la nube; queda en este dispositivo.'); } };

export function sincronizar() {
  if (!usuarioActual()) return Promise.resolve();
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    try {
      const [locales, remotas] = await Promise.all([crudo.todos(), traerActividades()]);
      const rem = new Map(remotas.map((r) => [r.id, r])), loc = new Map(locales.map((a) => [a.id, a]));
      const aSubir = locales.filter((a) => { const r = rem.get(a.id); return !r || (a.modificado || 0) > r.modificado; });
      let bajadas = 0;
      for (const r of remotas) {
        const a = loc.get(r.id);
        if (!a || r.modificado > (a.modificado || 0)) { await crudo.guardar({ ...(a && a.versiones ? { versiones: a.versiones } : {}), ...r.datos, id: r.id }); bajadas++; }
      }
      await subirActividades(aSubir);
      if (bajadas || aSubir.length) window.dispatchEvent(new Event('recreo-sync'));
    } catch (e) { falloNube(e); } finally { sincronizando = null; }
  })();
  return sincronizando;
}

export const actividades = {
  todos: async () => { await sincronizando; return crudo.todos(); },
  uno: (id) => crudo.uno(id),
  guardar: async (a) => {
    const nube = !!usuarioActual();
    // Comunidad: se publica solo si la persona lo autorizó (`publica`); `pubMod` evita republicar cuando solo cambia "jugado".
    if (nube && a.publica && !a.papelera && a.pubMod !== a.modificado) { a.pubMod = a.modificado; a.enComunidad = true; publicarComunidad(a).catch(falloNube); }
    else if (nube && a.enComunidad && (!a.publica || a.papelera)) { a.enComunidad = false; a.pubMod = null; quitarDeComunidad(a.id).catch(falloNube); }
    await crudo.guardar(a);
    if (nube) subirActividades([a]).catch(falloNube);
  },
  borrar: async (id) => {
    const a = await crudo.uno(id);
    await crudo.borrar(id);
    if (usuarioActual()) { borrarActividadNube(id).catch(falloNube); if (a && a.enComunidad) quitarDeComunidad(id).catch(falloNube); }
  }
};
export const resultados = API('resultados');

// Preferencias por dispositivo (si el almacenamiento falla, se usan los valores por defecto).
export const pref = {
  leer(k, def) { try { const v = localStorage.getItem('aj:' + k); return v == null ? def : JSON.parse(v); } catch (_) { return def; } },
  guardar(k, v) { try { localStorage.setItem('aj:' + k, JSON.stringify(v)); } catch (_) {} }
};
