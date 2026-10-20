'use strict';

import { el, aviso } from '../core/util.js';
import { pagina } from './layout.js';
import { ir } from '../core/router.js';
import { usuarioActual, salir, eliminarMiCuenta } from '../core/nube.js';
import { actividades, resultados } from '../core/almacen.js';
import { panelApariencia } from './apariencia.js';

// Derecho de acceso: una copia de lo que la persona ha creado.
async function descargarDatos() {
  const u = usuarioActual();
  const datos = { exportado: new Date().toISOString(), cuenta: { correo: u.email }, actividades: (await actividades.todos()).map(({ versiones, ...a }) => a), resultados: await resultados.todos() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' }));
  a.download = 'mis-datos-recreatic.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// Derecho de supresión: elimina la cuenta y todo lo que guardó en la nube.
async function eliminar() {
  const t = prompt('Vas a eliminar tu cuenta y todo lo que guardaste en la nube (actividades, clases, tareas, resultados y publicaciones de la Comunidad). Esto no se puede deshacer.\n\nPara confirmar, escribe ELIMINAR:');
  if (t === null) return;
  if (t.trim().toUpperCase() !== 'ELIMINAR') { aviso('No se eliminó nada: la palabra no coincide.'); return; }
  try { await eliminarMiCuenta(); aviso('Tu cuenta se eliminó.'); ir('/'); } catch (e) { aviso('No se pudo eliminar: ' + (e.message || e)); }
}

export function vistaPerfil(raiz) {
  const u = usuarioActual();
  if (!u) { ir('/entrar'); return; }
  const main = pagina(raiz);
  const m = u.user_metadata || {};
  const nombre = m.full_name || m.name || String(u.email).split('@')[0];
  const foto = m.avatar_url || m.picture;
  const google = u.app_metadata && u.app_metadata.provider === 'google';
  main.append(
    el('h1', { text: 'Mi perfil' }),
    el('div', { class: 'tarjeta perfil-cab' }, [
      el('div', { class: 'perfil-avatar' }, [foto ? el('img', { attrs: { src: foto, alt: '', referrerpolicy: 'no-referrer' } }) : nombre.charAt(0).toUpperCase()]),
      el('div', {}, [el('h2', { text: nombre }), el('p', { class: 'sub', text: u.email }), el('small', { class: 'sub', text: google ? 'Cuenta de Google' : 'Cuenta con correo' })])
    ]),
    el('div', { class: 'tarjeta' }, [
      el('h2', { text: 'Apariencia' }),
      el('p', { class: 'sub', text: 'Se guarda en tu cuenta y te acompaña en cada dispositivo.' }),
      panelApariencia()
    ]),
    el('div', { class: 'tarjeta' }, [
      el('h2', { text: 'Tus datos' }),
      el('p', { class: 'sub', html: 'Tienes derecho a llevarte una copia de lo que has creado y a eliminar tu cuenta. Más detalles en la <a href="#/privacidad">Política de privacidad</a>.' }),
      el('div', { class: 'fila' }, [
        el('button', { class: 'btn btn-claro', attrs: { type: 'button' }, text: 'Descargar mis datos', on: { click: descargarDatos } }),
        el('button', { class: 'btn btn-peligro', attrs: { type: 'button' }, text: 'Eliminar mi cuenta', on: { click: eliminar } })
      ])
    ]),
    el('div', { class: 'tarjeta' }, [el('button', { class: 'btn btn-claro', attrs: { type: 'button' }, text: 'Cerrar sesión', on: { click: async () => { await salir(); ir('/'); } } })])
  );
}
