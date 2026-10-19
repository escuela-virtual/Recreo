'use strict';

import { el } from '../core/util.js';
import { pagina } from './layout.js';
import { PLANTILLAS, plantillaPorId } from '../plantillas.js';
import { tarjetaPlantilla, iconoPlantilla } from './crear.js';
import { ESTILOS } from '../core/estilos.js';
import { EJEMPLOS } from '../datos/ejemplos.js';

const VENTAJAS = [
  ['⏱️', 'Listo en un minuto', 'Escribe tu contenido, pulsa jugar y ya está. Sin límites y sin obligación de crear cuenta.'],
  ['🧩', 'Un contenido, muchos juegos', 'Cambia de plantilla con un clic: del cuestionario a las parejas, la sopa de letras o la ruleta.'],
  ['🖨️', 'También en papel', 'Cada actividad se imprime como una hoja limpia, lista para clase o para deberes.'],
  ['🎤', 'Con tu propia voz', 'Graba audio en cada elemento para que el juego hable como tú.'],
  ['🎨', 'Tu estilo', 'Estilos visuales, fuentes y tema claro u oscuro. Que se vea como a ti te guste.'],
  ['🎓', 'Del aula a casa', 'Juega en la pantalla de clase o envía un enlace como tarea y revisa los resultados.']
];

export function vistaInicio(raiz) {
  const main = pagina(raiz, { ancho: false });
  const n = PLANTILLAS.length;
  const ejemplos = ['ej-capitales', 'ej-celula', 'ej-ruleta', 'ej-sopa', 'ej-crucigrama', 'ej-historia', 'ej-laberinto', 'ej-planta']
    .map((id) => EJEMPLOS.find((e) => e.id === id)).filter(Boolean);

  main.append(
    el('section', { class: 'bloque hero' }, [
      el('div', { class: 'hero-txt' }, [
        el('span', { class: 'hero-etq', text: 'Gratis · en español · cuenta opcional' }),
        el('h1', { text: 'Convierte cualquier tema en un juego.' }),
        el('ul', { class: 'checks' }, [
          el('li', { html: `<b>${n}</b> tipos de actividad listos para usar` }),
          el('li', { html: `<b>${ESTILOS.length}</b> estilos visuales, audio, impresión y modo oscuro` }),
          el('li', { html: 'Tus actividades <b>se guardan solas</b>, en tu dispositivo y en tu cuenta si entras' })
        ]),
        el('div', { class: 'fila' }, [
          el('a', { class: 'btn btn-grande', text: 'Crear mi primera actividad', attrs: { href: '#/crear' } }),
          el('a', { class: 'btn btn-claro btn-grande', text: 'Probar un ejemplo', attrs: { href: '#/e/ej-capitales' } })
        ])
      ]),
      el('div', { class: 'hero-demo' }, [
        el('div', { class: 'hero-pantalla' }, [el('div', { class: 'hero-rueda' }), el('div', { class: 'hero-flecha' })]),
        el('div', { class: 'hero-bola' })
      ])
    ]),

    el('section', { class: 'bloque' }, [
      el('h2', { class: 'centro', text: 'Tres pasos y a jugar' }),
      el('div', { class: 'pasos' }, [
        ['1', 'Elige una plantilla', 'Entre decenas de juegos y herramientas de aula.'], ['2', 'Escribe tu contenido', 'Textos, imágenes y audio. También puedes pegar una lista.'], ['3', 'Juega o imprime', 'En cualquier dispositivo, en pantalla grande o en papel.']
      ].map(([num, t, d]) => el('div', { class: 'paso' }, [el('b', { text: num }), el('h3', { text: t }), el('p', { class: 'sub', text: d })])))
    ]),

    el('section', { class: 'bloque' }, [
      el('h2', { class: 'centro', text: 'Pensado para el aula' }),
      el('div', { class: 'ventajas' }, VENTAJAS.map(([ico, t, d]) => el('div', { class: 'ventaja' }, [
        el('div', { class: 'ventaja-ico', text: ico }), el('h3', { text: t }), el('p', { class: 'sub', text: d })
      ])))
    ]),

    el('section', { class: 'bloque' }, [
      el('h2', { class: 'centro', text: 'Pruébalo con un ejemplo' }),
      el('p', { class: 'centro sub', text: 'Juega, mira cómo está hecho y copia el que quieras para adaptarlo.' }),
      el('div', { class: 'plantillas-grid' }, ejemplos.map((e) => {
        const p = plantillaPorId(e.plantilla);
        return el('a', { class: 'plt', attrs: { href: '#/e/' + e.id } }, [iconoPlantilla(p), el('span', { class: 'plt-t' }, [el('b', { text: e.titulo }), el('small', { text: p.nombre })])]);
      }))
    ]),

    el('section', { class: 'bloque' }, [
      el('h2', { class: 'centro', text: `Las ${n} plantillas` }),
      el('p', { class: 'centro sub', text: 'Selecciona una para empezar.' }),
      el('div', { class: 'plantillas-grid' }, PLANTILLAS.map((p) => tarjetaPlantilla(p))),
      el('p', { class: 'centro', style: { marginTop: '22px' } }, [el('a', { class: 'btn btn-grande', text: 'Empieza a crear', attrs: { href: '#/crear' } })])
    ])
  );
}
