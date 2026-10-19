# Recreatic

Creador de actividades interactivas e imprimibles para el aula, **en español, gratis y sin restricciones**.
Funciona en el navegador y no tiene límites de uso. La cuenta es opcional: sin ella todo se guarda en el dispositivo. El nombre se cambia en `src/nombre.js`.

## Qué incluye

- **35 plantillas**: Cuestionario, Rueda aleatoria, Abrecajas, Cartas al azar, Une las parejas, Parejas, Cada oveja con su pareja,
  ¿Pareja o no?, Tarjetas flash, Voltear fichas, Anagrama, Ahorcado, Sopa de letras, Crucigrama, Deletrea la palabra,
  Escribe la respuesta, Reordenar, Imanes de palabras, Completar la frase, Concurso, Ganar o perder, Cuestionario de imágenes,
  Verdadero o falso, Ordenar por grupo, Clasificación rápida, Ordenar por rango, Observa y memoriza, Diagrama etiquetado,
  Persecución en laberinto, Atrapa al topo, Avión, Explotar globos, Fruta voladora, Generador de matemáticas y Plano de asientos.
- **35 estilos visuales** y 6 fuentes (incluida una apta para dislexia) en cada actividad, cambiables en vivo.
- **Cambio de plantilla** con un clic: el contenido se adapta (p. ej. Parejas → Cuestionario → Sopa de letras).
- Editor de contenido por tipo, con imágenes, **audio por elemento** (grabado con el micrófono) e importación de texto pegado.
- **Configuración de actividad** como en el original: cronómetro (ninguno / hacia adelante / cuenta atrás), control del ritmo, maestría (incluye *Mostrar respuestas al final*), anti-trampas (barajar y pantalla borrosa), formato y modo, con *Aplicar*, *Definir como predeterminado para la plantilla* y *Volver al predeterminado*.
- **Mis actividades** con carpetas, papelera de reciclaje (30 días) y orden por nombre, modificadas o última vez jugada.
- **Tema claro (por defecto) y oscuro**, 6 colores de acento (Violeta, Océano, Bosque, Mandarina, Fresa, Turquesa) y favicon que sigue al color elegido.
- Editor con subir/bajar/duplicar/eliminar filas, límites mín./máx., **historial de versiones** y variante **Rueda con preguntas**.
- **Listas de reproducción**: juega varias actividades en secuencia (Anterior/Siguiente).
- Pantalla de inicio con **Avance** (vista previa del contenido) y **Juego**.
- **Imprimir** cualquier actividad (hoja limpia; crucigrama y sopa de letras con su propia hoja).
- **Compartir** por enlace (el contenido viaja comprimido dentro del enlace) o por archivo, **incrustar** con `<iframe>`.
- **Tareas**: enlace para alumnos → código de resultado → importación en *Mis resultados* (con exportación a CSV).
- Tabla de clasificación, opciones por plantilla (temporizador, vidas, orden aleatorio…), pantalla completa y modo táctil.
- 37 actividades de ejemplo para jugar, copiar y editar.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ (estático, base relativa)
```

Prueba de humo (en el navegador, con el servidor de desarrollo abierto), en la consola de la página:

```js
(await import('/src/dev/probar.js')).probarTodas()
```

Monta cada plantilla con cada tipo de contenido compatible y cada actividad de ejemplo, y reporta errores.

## Estructura

- `src/core/` — contenido y adaptadores, estilos de juego, tema, escenario (reproductor), almacenamiento (IndexedDB), router, codec de enlaces.
- `src/juegos/` — las plantillas, agrupadas por familia. Cada una declara `acepta` (tipos de contenido que juega de forma nativa),
  `opciones` y `montar(host)`.
- `src/ui/` — páginas (portada, crear, editor, actividad, mis actividades, listas, resultados, funciones).
- `src/datos/` — actividades de ejemplo.

## Límites conocidos

- Al no haber servidor, los datos viven en el navegador del dispositivo (IndexedDB): exporta tus actividades a archivo para respaldarlas o moverlas.
- Los resultados de las tareas llegan al profesor mediante un código que entrega el alumno, no de forma automática.

## Cuentas y copia en la nube (Supabase)

- Acceso con **correo y contraseña** y con **Google**. Con la sesión iniciada, cada actividad se guarda también en la tabla `actividades` de Supabase y se sincroniza entre dispositivos (gana la copia más reciente). El historial de versiones queda solo en el dispositivo.
- Seguridad: RLS activo; cada persona solo ve, crea, edita y borra sus propias filas (`user_id = auth.uid()`). El rol `anon` no tiene acceso. La clave `sb_publishable_…` de `.env` es pública por diseño.
- Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` (en `.env`). Sin ellas la app funciona igual, solo sin cuentas.
- **Google**: hay que activarlo en Supabase (*Authentication → Sign In / Providers → Google*) con un cliente OAuth de Google Cloud cuya URI de redirección sea `https://<proyecto>.supabase.co/auth/v1/callback`. Mientras no esté activo, la app muestra el botón desactivado.
- En *Authentication → URL Configuration* hay que poner la URL del sitio y las de desarrollo/preview como *Redirect URLs*.

## Despliegue

Vercel, conectado al repositorio de GitHub (cada push a `main` publica). Es un sitio estático: `npm run build` → `dist/`.
