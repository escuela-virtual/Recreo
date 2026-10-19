'use strict';

import { createClient } from '@supabase/supabase-js';

// Cuenta y copia en la nube (Supabase). La clave "publishable" es pública por diseño: la seguridad
// real la dan las políticas RLS de la tabla `actividades` (cada persona solo ve lo suyo).
const URL = import.meta.env.VITE_SUPABASE_URL;
const CLAVE = import.meta.env.VITE_SUPABASE_KEY;
export const hayNube = !!(URL && CLAVE);

// PKCE: devuelve un `?code=` en la URL (el flujo implícito usaría el #, que ya usa el router).
const supa = hayNube ? createClient(URL, CLAVE, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } }) : null;

let usuario = null;
const oyentes = new Set();
export const usuarioActual = () => usuario;
export const alCambiarUsuario = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };

const base = () => location.origin + location.pathname; // sin el #: es a donde vuelve Google/el correo

export async function iniciarNube() {
  if (!supa) return;
  supa.auth.onAuthStateChange((evento, sesion) => {
    usuario = (sesion && sesion.user) || null;
    // setTimeout: Supabase no admite llamadas a su cliente dentro de este callback
    setTimeout(() => oyentes.forEach((f) => f(usuario, evento)), 0);
  });
  const { data } = await supa.auth.getSession();
  usuario = (data.session && data.session.user) || null;
}

// Traduce los errores de Supabase a mensajes claros en español.
export function mensajeError(e) {
  const m = String((e && e.message) || e || '');
  if (/invalid login credentials/i.test(m)) return 'El correo o la contraseña no son correctos.';
  if (/email not confirmed/i.test(m)) return 'Tienes que confirmar tu correo. Revisa tu bandeja de entrada (y el spam).';
  if (/already registered|already been registered/i.test(m)) return 'Ya existe una cuenta con ese correo. Prueba a entrar.';
  if (/password should be at least|weak password/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera un momento y vuelve a probar.';
  if (/failed to fetch|network/i.test(m)) return 'No hay conexión con el servidor. Revisa tu internet.';
  if (/provider is not enabled|unsupported provider/i.test(m)) return 'El acceso con Google todavía no está activado en este sitio.';
  return m || 'Ocurrió un error. Inténtalo de nuevo.';
}

// Qué proveedores están activados en Supabase (endpoint público). Así la app solo ofrece lo que funciona.
let ajustes = null;
export async function ajustesAuth() {
  if (ajustes) return ajustes;
  try {
    const r = await fetch(`${URL}/auth/v1/settings`, { headers: { apikey: CLAVE } });
    const j = await r.json();
    ajustes = { google: !!(j.external && j.external.google), correo: !(j.external && j.external.email === false), confirmarCorreo: !j.mailer_autoconfirm };
  } catch (_) { ajustes = { google: true, correo: true, confirmarCorreo: true }; } // sin red: se deja intentar
  return ajustes;
}

export const entrarConCorreo = (correo, clave) => supa.auth.signInWithPassword({ email: correo, password: clave });
export const registrar = (correo, clave) => supa.auth.signUp({ email: correo, password: clave, options: { emailRedirectTo: base() } });
export const recuperarClave = (correo) => supa.auth.resetPasswordForEmail(correo, { redirectTo: base() });
export const salir = () => supa.auth.signOut();
export function entrarConGoogle(volverA = '/mis') {
  try { sessionStorage.setItem('recreo:volver', volverA); } catch (_) { /* sin sessionStorage: se queda en la portada */ }
  return supa.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: base() } });
}
export function rutaDeVuelta() {
  try { const r = sessionStorage.getItem('recreo:volver'); sessionStorage.removeItem('recreo:volver'); return r; } catch (_) { return null; }
}

// ---- Actividades en la nube ----
const sinHistorial = (a) => { const { versiones, ...resto } = a; return resto; }; // el historial se queda en el dispositivo (pesa mucho)
const fila = (a) => ({ user_id: usuario.id, id: a.id, titulo: a.titulo, datos: sinHistorial(a), modificado: a.modificado || Date.now(), papelera: a.papelera || null });

export async function traerActividades() {
  const { data, error } = await supa.from('actividades').select('id,datos,modificado,papelera');
  if (error) throw error;
  return data;
}
export async function subirActividades(lista) {
  for (let i = 0; i < lista.length; i += 10) { // lotes pequeños: una actividad con audio puede pesar varios MB
    const { error } = await supa.from('actividades').upsert(lista.slice(i, i + 10).map(fila), { onConflict: 'user_id,id' });
    if (error) throw error;
  }
}
export async function borrarActividadNube(id) {
  const { error } = await supa.from('actividades').delete().eq('id', id);
  if (error) throw error;
}
