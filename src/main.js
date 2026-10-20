'use strict';

import './css/temas.css';
import './css/sitio.css';
import './css/escenario.css';
import './css/paginas.css';
import { ruta, iniciarRouter } from './core/router.js';
import { aplicarTema, aplicarAparienciaDeCuenta, yaEligioApariencia, marcarAparienciaElegida } from './core/tema.js';
import { ventanaBienvenida } from './ui/apariencia.js';
import { vistaPerfil } from './ui/perfil.js';
import { registrarServiceWorker } from './core/instalar.js';
import { vistaTerminos, vistaPrivacidad, vistaCookies, avisoAlmacenamiento } from './ui/legal.js';
import { iniciarNube, alCambiarUsuario, rutaDeVuelta, unirPresencia, usuarioActual } from './core/nube.js';
import { vistaAdmin } from './ui/admin.js';
import { vistaComunidad } from './ui/comunidad.js';
import { sincronizar } from './core/almacen.js';
import { vistaEntrar } from './ui/entrar.js';
import { ir } from './core/router.js';
import { vistaInicio } from './ui/inicio.js';
import { vistaCrear } from './ui/crear.js';
import { vistaEditor } from './ui/editor.js';
import { vistaClases, vistaClase, vistaResultadosTarea, vistaClaseAlumno } from './ui/clases.js';
import { vistaActividad, vistaTarea, vistaComunidadActividad, vistaEjemplo, vistaCompartida, vistaIncrustada } from './ui/actividad.js';
import { vistaResultados } from './ui/resultados.js';
import { vistaFunciones } from './ui/funciones.js';
import { vistaListas } from './ui/listas.js';
import { vistaMis } from './ui/mis.js';

aplicarTema(); // antes de pintar, para no parpadear
registrarServiceWorker();
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
ruta('/perfil', vistaPerfil);
ruta('/terminos', vistaTerminos);
ruta('/privacidad', vistaPrivacidad);
ruta('/cookies', vistaCookies);
ruta('/clases', vistaClases);
ruta('/clases/:id', vistaClase);
ruta('/tarea/:id', vistaResultadosTarea);
ruta('/clase/:codigo', vistaClaseAlumno);
ruta('/t/:id', vistaTarea);
ruta('/comunidad', vistaComunidad);
ruta('/comunidad/:autor/:id', vistaComunidadActividad);

// Sin top-level await (el objetivo de compilación de Vite no lo admite).
(async () => {
  try { await iniciarNube(); unirPresencia(); } catch (e) { console.warn('Nube no disponible:', e); }
  if (usuarioActual() && !aplicarAparienciaDeCuenta() && yaEligioApariencia()) marcarAparienciaElegida(); // sube a la cuenta lo elegido antes de entrar
  alCambiarUsuario((u, evento) => {
    if (u) { sincronizar(); if (!aplicarAparienciaDeCuenta() && yaEligioApariencia()) marcarAparienciaElegida(); }
    if (evento === 'SIGNED_IN') { const r = rutaDeVuelta(); if (r) ir(r); } // tras volver de Google
  });
  sincronizar();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sincronizar(); });
  iniciarRouter(document.getElementById('app'));
  if (!location.hash.startsWith('#/embed/')) avisoAlmacenamiento();
  if (!yaEligioApariencia() && !/^#\/(embed|c)\//.test(location.hash)) ventanaBienvenida(); // primera visita (no en actividades incrustadas ni enlaces compartidos)
})();
