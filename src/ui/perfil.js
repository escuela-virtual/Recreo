'use strict';

import { el } from '../core/util.js';
import { pagina } from './layout.js';
import { ir } from '../core/router.js';
import { usuarioActual, salir } from '../core/nube.js';
import { panelApariencia } from './apariencia.js';

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
    el('div', { class: 'tarjeta' }, [el('button', { class: 'btn btn-peligro', attrs: { type: 'button' }, text: 'Cerrar sesión', on: { click: async () => { await salir(); ir('/'); } } })])
  );
}
