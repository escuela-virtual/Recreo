'use strict';

import './css/temas.css';
import './css/sitio.css';
import './css/escenario.css';
import './css/paginas.css';
import { ruta, iniciarRouter } from './core/router.js';
import { aplicarTema } from './core/tema.js';
import { iniciarNube, alCambiarUsuario, rutaDeVuelta, unirPresencia } from './core/nube.js';
import { vistaAdmin } from './ui/admin.js';
import { sincronizar } from './core/almacen.js';
import { vistaEntrar } from './ui/entrar.js';
import { ir } from './core/router.js';
import { vistaInicio } from './ui/inicio.js';
import { vistaCrear } from './ui/crear.js';
import { vistaEditor } from './ui/editor.js';
import { vistaActividad, vistaEjemplo, vistaCompartida, vistaIncrustada } from './ui/actividad.js';
import { vistaResultados } from './ui/resultados.js';
import { vistaFunciones } from './ui/funciones.js';
import { vistaListas } from './ui/listas.js';
import { vistaMis } from './ui/mis.js';

aplicarTema(); // antes de pintar, para no parpadear
ruta('/', vistaInicio);
ruta('/crear', vistaCrear);
ruta('/crear/:plantilla', vistaEditor);
ruta('/editar/:id', vistaEditor);
ruta('/a/:id', vistaActividad);
ruta('/mis', vistaMis);
ruta('/e/:id', vistaEjemplo);
ruta('/c/:data', vistaCompartida);
ruta('/embed/:data', vistaIncrustada);
ruta('/resultados', vistaResultados);
ruta('/funciones', vistaFunciones);
ruta('/listas', vistaListas);
ruta('/entrar', vistaEntrar);
ruta('/admin', vistaAdmin);

// Sin top-level await (el objetivo de compilación de Vite no lo admite).
(async () => {
  try { await iniciarNube(); unirPresencia(); } catch (e) { console.warn('Nube no disponible:', e); }
  alCambiarUsuario((u, evento) => {
    if (u) sincronizar();
    if (evento === 'SIGNED_IN') { const r = rutaDeVuelta(); if (r) ir(r); } // tras volver de Google
  });
  sincronizar();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sincronizar(); });
  iniciarRouter(document.getElementById('app'));
})();
