'use strict';

// Todas las fechas y horas se muestran en hora de Colombia, sin importar la zona del dispositivo.
export const ZONA = 'America/Bogota';
const fmt = (opc) => new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, ...opc });
const formatos = { hora: fmt({ dateStyle: 'medium', timeStyle: 'short' }), dia: fmt({ dateStyle: 'medium' }) };

export const fechaHora = (t) => formatos.hora.format(new Date(t));
export const fechaDia = (t) => formatos.dia.format(new Date(t));
// Día calendario de Colombia como AAAA-MM-DD.
export const diaCO = (t = Date.now()) => new Date(t).toLocaleDateString('sv-SE', { timeZone: ZONA });
// Valor de un <input type="datetime-local"> (sin zona) interpretado como hora de Colombia -> milisegundos.
export const desdeCampoCO = (v) => new Date(v + ':00-05:00').getTime();
