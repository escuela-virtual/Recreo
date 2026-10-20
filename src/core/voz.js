'use strict';

// Lectura en voz alta con la voz del dispositivo (Web Speech API): gratis y sin servidor.
export const hayVoz = typeof window !== 'undefined' && 'speechSynthesis' in window;
let activa = false;
export const fijarVoz = (v) => { activa = !!v && hayVoz; if (!activa && hayVoz) speechSynthesis.cancel(); };
export const vozActiva = () => activa;

export function hablar(texto) {
  if (!hayVoz || !texto) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(texto));
  const voces = speechSynthesis.getVoices();
  const v = voces.find((x) => /^es(-|_)?(CO|419|MX|US)/i.test(x.lang)) || voces.find((x) => /^es/i.test(x.lang));
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-ES';
  u.rate = 0.95;
  speechSynthesis.speak(u);
}
