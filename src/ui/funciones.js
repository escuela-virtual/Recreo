'use strict';

import { el } from '../core/util.js';
import { pagina } from './layout.js';
import { PLANTILLAS } from '../plantillas.js';
import { ESTILOS } from '../core/estilos.js';

const SECCIONES = () => [
  ['🖨️', 'Interactivas e imprimibles', 'Puedes crear actividades interactivas e imprimibles con el mismo contenido.',
    ['Las interactivas se juegan en cualquier dispositivo con navegador: ordenador, tableta, móvil o pizarra digital. Los alumnos juegan solos o por turnos frente a la clase.',
     'Las imprimibles se imprimen directamente o se guardan como PDF desde el diálogo de impresión. Sirven de complemento o como actividad independiente.']],
  ['🧩', 'Crear mediante plantillas', `Elige entre ${PLANTILLAS.length} plantillas, todas incluidas.`,
    ['Hay clásicos como el Cuestionario y el Crucigrama, juegos de arcade como Persecución en laberinto o Avión, y herramientas de aula como la Rueda aleatoria.',
     'Eliges la plantilla, escribes el contenido y ya está: una actividad completa en un par de minutos.']],
  ['🔄', 'Cambio de plantilla', 'Cambia de plantilla con un solo clic, sin volver a escribir nada.',
    ['Si creaste unas Parejas con nombres de formas, conviértelas en Tarjetas flash, un Cuestionario o una Sopa de letras con exactamente el mismo contenido.',
     'Es ideal para diferenciar y reforzar: el mismo contenido en formatos distintos según el grupo.']],
  ['✎', 'Editar cualquier actividad', 'Adapta el contenido a tu clase y a tu forma de enseñar.',
    ['Copia cualquiera de los ejemplos y modifícala a tu gusto. Tus actividades se guardan solas; con una cuenta las tienes en cualquier dispositivo, y puedes descargarlas en Word o PDF.']],
  ['🎨', 'Estilos y opciones visuales', `${ESTILOS.length} estilos visuales, fuentes y opciones de juego.`,
    ['Cada estilo cambia colores, fondos y tipografía. También puedes configurar un temporizador, las vidas o el orden aleatorio.',
     'Hay fuentes pensadas para la lectura, incluida una apta para dislexia, y un estilo de alta legibilidad.']],
  ['🌐', 'Compartir con otros profesores', 'Comparte por enlace o por archivo, sin cuentas ni servidores.',
    ['El enlace lleva el contenido dentro: quien lo abra puede jugar y guardar una copia para editarla. También puedes descargar la actividad en Word o en PDF.']],
  ['</>', 'Incrustar en un sitio web', 'Pega un fragmento de código y juega dentro de tu blog o aula virtual.',
    ['Funciona como incrustar un vídeo: copias el código HTML (iframe) y lo pegas en tu página.']],
  ['✔', 'Tareas para alumnos', 'Envía un enlace y recoge los resultados de cada alumno.',
    ['El alumno escribe su nombre, juega y recibe un código de resultado. Lo pegas en "Mis resultados" y ves la tabla con puntos, errores y tiempo; también la puedes descargar para abrirla en Excel.']]
];

export function vistaFunciones(raiz) {
  const main = pagina(raiz);
  main.append(el('div', { class: 'tarjeta' }, [el('h1', { text: 'Funciones' }), el('p', { class: 'sub', text: 'Todo lo que puedes hacer, gratis y sin restricciones.' })]));
  SECCIONES().forEach(([ico, t, lema, parrafos], i) => main.append(el('section', { class: 'tarjeta funcion' }, [
    el('div', { class: 'funcion-ico', text: ico }),
    el('div', {}, [el('h2', { text: t }), el('p', { style: { fontWeight: 700, margin: '4px 0 10px' }, text: lema }), ...parrafos.map((p) => el('p', { class: 'sub', style: { marginBottom: '8px' }, text: p }))])
  ])));
  main.append(el('p', { class: 'centro' }, [el('a', { class: 'btn btn-grande', text: 'Empieza a crear', attrs: { href: '#/crear' } })]));
}
