'use strict';

import { el } from '../core/util.js';
import { pagina } from './layout.js';
import { ir } from '../core/router.js';
import { hayNube, ajustesAuth, usuarioActual, entrarConCorreo, registrar, recuperarClave, entrarConGoogle, mensajeError } from '../core/nube.js';

// Logotipo "G" de Google (para el botón de acceso con Google).
const G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"/></svg>';

export async function vistaEntrar(raiz) {
  const main = pagina(raiz);
  if (!hayNube) { main.append(el('div', { class: 'tarjeta' }, [el('h2', { text: 'Cuentas no disponibles' }), el('p', { class: 'sub', text: 'Esta copia de la app no está conectada a un servidor, así que no se puede iniciar sesión.' })])); return; }
  if (usuarioActual()) { ir('/mis'); return; }

  let modo = 'entrar';
  const ajustes = await ajustesAuth();
  const caja = el('div', { class: 'tarjeta acceso' });
  main.append(caja);

  function pintar() {
    caja.replaceChildren();
    const correo = el('input', { attrs: { type: 'text', inputmode: 'email', autocomplete: 'email', placeholder: 'tucorreo@ejemplo.com' } });
    const clave = el('input', { attrs: { type: 'password', autocomplete: modo === 'entrar' ? 'current-password' : 'new-password', placeholder: modo === 'entrar' ? 'Tu contraseña' : 'Mínimo 6 caracteres' } });
    const msg = el('p', { class: 'acceso-msg', attrs: { role: 'alert' } });
    const ocupado = (v) => { boton.disabled = v; google.disabled = v; };
    const decir = (t, ok = false) => { msg.textContent = t; msg.className = 'acceso-msg' + (ok ? ' ok' : ''); };

    async function enviar(e) {
      e.preventDefault(); decir('');
      const c = correo.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(c)) return decir('Escribe un correo válido.');
      if (clave.value.length < 6) return decir('La contraseña debe tener al menos 6 caracteres.');
      ocupado(true);
      try {
        if (modo === 'entrar') {
          const { error } = await entrarConCorreo(c, clave.value);
          if (error) throw error;
          ir('/mis');
        } else {
          const { data, error } = await registrar(c, clave.value);
          if (error) throw error;
          if (data.session) ir('/mis');
          else decir('Te enviamos un correo para confirmar la cuenta. Ábrelo y vuelve aquí para entrar.', true);
        }
      } catch (err) { decir(mensajeError(err)); }
      ocupado(false);
    }

    const boton = el('button', { class: 'btn btn-grande', attrs: { type: 'submit' }, text: modo === 'entrar' ? 'Entrar' : 'Crear cuenta' });
    const google = el('button', { class: 'btn-google', attrs: { type: 'button', disabled: !ajustes.google, title: ajustes.google ? '' : 'Todavía no está activado en este sitio' }, html: G + '<span>Continuar con Google</span>', on: { click: async () => {
      decir(''); ocupado(true);
      const { error } = await entrarConGoogle('/mis');
      if (error) { decir(mensajeError(error)); ocupado(false); }
    } } });

    caja.append(
      el('div', { class: 'acceso-tabs' }, [['entrar', 'Entrar'], ['crear', 'Crear cuenta']].map(([id, t]) =>
        el('button', { class: id === modo ? 'act' : '', attrs: { type: 'button' }, text: t, on: { click: () => { modo = id; pintar(); } } }))),
      el('h2', { text: modo === 'entrar' ? 'Bienvenido de nuevo' : 'Crea tu cuenta' }),
      el('p', { class: 'sub', text: 'Con una cuenta tus actividades se guardan en la nube y las tienes en cualquier dispositivo.' }),
      google,
      ajustes.google ? null : el('small', { class: 'sub', text: 'El acceso con Google todavía no está activado en este sitio.' }),
      el('div', { class: 'acceso-o' }, [el('span', { text: 'o con tu correo' })]),
      el('form', { class: 'acceso-form', attrs: { novalidate: true }, on: { submit: enviar } }, [
        el('label', { class: 'campo', text: 'Correo' }), correo,
        el('label', { class: 'campo', text: 'Contraseña' }), clave,
        msg, boton,
        modo === 'entrar' ? el('button', { class: 'enlace-btn', attrs: { type: 'button' }, text: '¿Olvidaste tu contraseña?', on: { click: async () => {
          const c = correo.value.trim();
          if (!/^\S+@\S+\.\S+$/.test(c)) return decir('Escribe tu correo arriba y vuelve a pulsar.');
          const { error } = await recuperarClave(c);
          error ? decir(mensajeError(error)) : decir('Si el correo existe, te enviamos un enlace para cambiar la contraseña.', true);
        } } }) : null
      ])
    );
  }
  pintar();
}
