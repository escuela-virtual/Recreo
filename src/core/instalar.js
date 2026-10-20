'use strict';

// Instalar la app desde el navegador (PWA). Chrome/Edge/Android avisan con `beforeinstallprompt`; en iPhone hay que hacerlo a mano.
let evento = null;
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
export const yaInstalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const puedeInstalar = () => !yaInstalada() && (!!evento || esIOS);
export const esIPhone = () => esIOS;

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evento = e; window.dispatchEvent(new Event('recreo-instalable')); });
window.addEventListener('appinstalled', () => { evento = null; window.dispatchEvent(new Event('recreo-instalable')); });

export async function instalar() {
  if (!evento) return false;
  evento.prompt();
  const { outcome } = await evento.userChoice;
  evento = null;
  window.dispatchEvent(new Event('recreo-instalable'));
  return outcome === 'accepted';
}

export function registrarServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker:', e)));
}
