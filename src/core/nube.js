'use strict';

import { diaCO } from './fecha.js';

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
// Derecho de supresión: una función de servidor elimina la cuenta y todo lo asociado (en cascada).
export async function eliminarMiCuenta() {
  const { error } = await supa.functions.invoke('eliminar-cuenta', { method: 'POST' });
  if (error) { let m = error.message; try { const j = await error.context.json(); if (j && j.error) m = j.error; } catch (_) { /* se usa el mensaje genérico */ } throw new Error(m); }
  await supa.auth.signOut().catch(() => {});
}
export function entrarConGoogle(volverA = '/mis') {
  try { sessionStorage.setItem('recreo:volver', volverA); } catch (_) { /* sin sessionStorage: se queda en la portada */ }
  return supa.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: base() } });
}
export function rutaDeVuelta() {
  try { const r = sessionStorage.getItem('recreo:volver'); sessionStorage.removeItem('recreo:volver'); return r; } catch (_) { return null; }
}

// ---- Apariencia guardada en la cuenta ----
export const aparienciaDeCuenta = () => (usuario && usuario.user_metadata && usuario.user_metadata.apariencia) || null;
export async function guardarApariencia(a) {
  if (!supa || !usuario) return;
  const { error } = await supa.auth.updateUser({ data: { apariencia: a } });
  if (error) throw error;
}

// ---- Panel de administración ----
// Solo responde a quien esté en la tabla `admins`; las funciones SQL lo comprueban en el servidor.
let admin = null;
export async function esAdmin() {
  if (!supa || !usuario) return false;
  if (admin && admin.id === usuario.id) return admin.si;
  const { data } = await supa.rpc('es_admin');
  admin = { id: usuario.id, si: data === true };
  return admin.si;
}
// Cuenta anónima de visitas: un navegador suma 1 por día, sin guardar nada de la persona.
export async function contarVisita() {
  if (!supa) return;
  const hoy = diaCO();
  try {
    if (localStorage.getItem('aj:visita') === hoy) return;
    const { error } = await supa.rpc('registrar_visita');
    if (!error) localStorage.setItem('aj:visita', hoy);
  } catch { /* sin almacenamiento o sin red: no se cuenta */ }
}
export async function visitasAdmin() {
  const { data, error } = await supa.rpc('admin_visitas');
  if (error) throw error;
  return data;
}
export async function resumenAdmin() {
  const { data, error } = await supa.rpc('admin_resumen');
  if (error) throw error;
  return data;
}

// Quién está conectado ahora: presencia en tiempo real (anónimos incluidos, solo se cuentan).
let canal = null;
const datosPresencia = () => ({ correo: usuario ? usuario.email : null, desde: Date.now() });
const oyentesPresencia = new Set();
export const conectadosAhora = () => (canal ? Object.values(canal.presenceState()).map((v) => v[0]) : []);
export const alCambiarPresencia = (fn) => { oyentesPresencia.add(fn); return () => oyentesPresencia.delete(fn); };
export function unirPresencia() {
  if (!supa || canal) return;
  canal = supa.channel('en-linea', { config: { presence: { key: crypto.randomUUID() } } });
  canal.on('presence', { event: 'sync' }, () => oyentesPresencia.forEach((f) => f(conectadosAhora())));
  canal.subscribe((estado) => { if (estado === 'SUBSCRIBED') canal.track(datosPresencia()); });
  alCambiarUsuario(() => canal.track(datosPresencia()));
}

// ---- Comunidad: actividades que sus autores decidieron compartir ----
const nombreAutor = () => {
  const m = usuario.user_metadata || {};
  return m.full_name || m.name || String(usuario.email || '').split('@')[0] || 'Anónimo'; // nunca el correo completo
};
const paraComunidad = (a) => { const { versiones, tarea, carpeta, papelera, jugado, ...resto } = a; return resto; };
export async function publicarComunidad(a) {
  const { error } = await supa.from('comunidad').upsert({ user_id: usuario.id, id: a.id, autor: nombreAutor(), titulo: a.titulo, plantilla: a.plantilla, datos: paraComunidad(a), etiquetas: a.etiquetas || [], publicado: a.modificado || Date.now() }, { onConflict: 'user_id,id' });
  if (error) throw error;
}
export async function quitarDeComunidad(id, autorId) {
  let q = supa.from('comunidad').delete().eq('id', id);
  q = q.eq('user_id', autorId || usuario.id);
  const { error } = await q;
  if (error) throw error;
}
export async function listarComunidad() {
  const { data, error } = await supa.from('comunidad').select('user_id,id,autor,titulo,plantilla,publicado,copias,etiquetas,votos,promedio,destacada').order('publicado', { ascending: false }).limit(200);
  if (error) throw error;
  return data;
}
export async function traerDeComunidad(autorId, id) {
  const { data, error } = await supa.from('comunidad').select('autor,datos,user_id,id,votos,promedio,destacada').eq('user_id', autorId).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
export const contarCopia = (autorId, id) => supa.rpc('comunidad_copiada', { p_user: autorId, p_id: id });
const orFallo = ({ data, error }) => { if (error) throw error; return data; };
export const valorarActividad = (autorId, id, estrellas) => supa.rpc('valorar', { p_autor: autorId, p_id: id, p_estrellas: estrellas }).then(orFallo);
export const miValoracion = (autorId, id) => supa.from('valoraciones').select('estrellas').eq('autor_id', autorId).eq('act_id', id).maybeSingle().then(orFallo).then((d) => (d ? d.estrellas : 0));
export const destacarActividad = (autorId, id, valor) => supa.rpc('destacar', { p_autor: autorId, p_id: id, p_valor: valor }).then(orFallo);
export const reportarActividad = (autorId, id, motivo) => supa.rpc('reportar', { p_autor: autorId, p_id: id, p_motivo: motivo }).then(orFallo);
export const listarReportes = () => supa.from('reportes').select('id,autor_id,act_id,motivo,creada').order('creada', { ascending: false }).limit(200).then(orFallo);
export const borrarReporte = (id) => supa.from('reportes').delete().eq('id', id).then(orFallo);

// ---- Clases, tareas y entregas ----
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para que se lean bien
const aleatorio = (n, alfabeto) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => alfabeto[b % alfabeto.length]).join('');
async function conReintento(fn) { // el código/id es aleatorio: si choca con otro (23505) se vuelve a intentar
  for (let i = 0; i < 5; i++) { const r = await fn(); if (!r.error || r.error.code !== '23505') return orFallo(r); }
  throw new Error('No se pudo generar un código único. Inténtalo de nuevo.');
}
export const listarClases = () => supa.from('clases').select('id,nombre,codigo,creada').order('creada', { ascending: false }).then(orFallo);
export const crearClase = (nombre) => conReintento(() => supa.from('clases').insert({ nombre: nombre.trim().slice(0, 80), codigo: aleatorio(6, ALFABETO) }).select('id,nombre,codigo,creada').single());
export const borrarClase = (id) => supa.from('clases').delete().eq('id', id).then(orFallo);
export const listarTareas = () => supa.from('tareas').select('id,titulo,plantilla,clase_id,limite,cerrada,creada').order('creada', { ascending: false }).then(orFallo);
export const crearTarea = (act, { claseId = null, limite = null } = {}) => conReintento(() => supa.from('tareas').insert({
  id: aleatorio(10, 'abcdefghijkmnpqrstuvwxyz23456789'), clase_id: claseId, titulo: act.titulo, plantilla: act.plantilla, limite, datos: paraComunidad(act)
}).select('id').single()).then((d) => d.id);
export const cambiarTarea = (id, cambios) => supa.from('tareas').update(cambios).eq('id', id).then(orFallo);
export const borrarTarea = (id) => supa.from('tareas').delete().eq('id', id).then(orFallo);
export const entregasDe = (tareaIds) => supa.from('entregas').select('id,tarea_id,nombre,puntos,aciertos,errores,segundos,creada').in('tarea_id', tareaIds).order('creada', { ascending: false }).limit(5000).then(orFallo);
export const borrarEntrega = (id) => supa.from('entregas').delete().eq('id', id).then(orFallo);
// Lado del alumno (sin cuenta): solo funciones públicas.
export const obtenerTarea = (id) => supa.rpc('obtener_tarea', { p_id: id }).then(orFallo);
export const entregarTarea = (id, r) => supa.rpc('entregar_tarea', { p_tarea: id, p_nombre: r.nombre, p_puntos: r.puntos, p_aciertos: r.aciertos, p_errores: r.errores, p_segundos: r.segundos }).then(orFallo);
export const tareasDeClase = (codigo) => supa.rpc('tareas_de_clase', { p_codigo: codigo }).then(orFallo);

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
