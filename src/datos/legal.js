'use strict';

// Textos legales de Recreatic (derecho colombiano: Ley 1581 de 2012 y Decreto 1377 de 2013 sobre protección de datos).
// Son un texto base y deben ser revisados por quien responda legalmente por el servicio.
export const ACTUALIZADO = '19 de octubre de 2026';
export const RESPONSABLE = 'el equipo de Escuela Virtual del Área de Educación del Comité de Cafeteros';
export const CONTACTO = ''; // correo de contacto para solicitudes sobre datos personales; si se deja vacío, el texto remite al perfil

const contacto = CONTACTO ? ` o escribiendo a ${CONTACTO}` : '';

export const DOCS = {
  terminos: {
    titulo: 'Términos y condiciones de uso',
    intro: 'Al usar Recreatic aceptas estos términos. Léelos con calma: explican cómo funciona el servicio y qué esperamos de quienes lo usan.',
    secciones: [
      { h: '1. Qué es Recreatic', p: ['Recreatic es una plataforma gratuita para crear, jugar, compartir e imprimir actividades educativas interactivas (cuestionarios, parejas, ruletas, sopas de letras y otras). Puede usarse sin cuenta; con cuenta se guardan las actividades en la nube y se habilitan la Comunidad, las clases y las tareas.'] },
      { h: '2. Quién puede usarla', p: ['Puedes usar Recreatic sin registrarte. Para crear una cuenta debes tener al menos 14 años; si eres menor de edad, necesitas la autorización de tu madre, padre, acudiente o docente responsable.', 'Los alumnos que juegan una tarea con el enlace de su profesor no necesitan cuenta: solo escriben un nombre.'] },
      { h: '3. Tu cuenta', p: ['Eres responsable de mantener segura tu contraseña y de lo que ocurra desde tu cuenta. Si crees que alguien accedió sin permiso, cambia tu contraseña y avísanos.', 'Puedes eliminar tu cuenta cuando quieras desde "Mi perfil". Al hacerlo se borran tus actividades, clases, tareas y resultados guardados en la nube.'] },
      { h: '4. Contenido que creas', p: ['Tus actividades son tuyas. Nos das el permiso necesario para almacenarlas, mostrarlas y procesarlas con el único fin de prestarte el servicio.', 'Eres responsable de que tu contenido sea lícito y de contar con los derechos sobre los textos, imágenes y audios que subes.'] },
      { h: '5. Comunidad', p: ['Cuando crees una actividad con sesión iniciada te preguntaremos si quieres compartirla en la Comunidad. Compartir es voluntario y puedes cambiarlo cuando quieras; al borrar la actividad, o al desmarcar la casilla, se retira de la Comunidad.', 'Al compartirla autorizas a otras personas a verla, jugarla, valorarla y guardar una copia para uso educativo, mostrando tu nombre como autor. Las copias que ya se hayan guardado no se eliminan.', 'Los administradores pueden retirar actividades que incumplan estos términos, por ejemplo tras un reporte.'] },
      { h: '6. Clases, tareas y alumnos', p: ['Los docentes pueden crear clases y tareas. El docente es responsable de informar a sus estudiantes (y a sus acudientes, si son menores) de que se recogerán su nombre y sus resultados, y de tener la autorización que corresponda en su institución.', 'Recomendamos que los alumnos usen solo su nombre de pila o un apodo, nunca datos sensibles. Recreatic no pide ni necesita apellidos, documentos, correos ni teléfonos de los alumnos.'] },
      { h: '7. Uso aceptable', p: ['No está permitido:'], li: ['Publicar contenido ilegal, violento, discriminatorio, sexual, que acose o que vulnere derechos de terceros.', 'Subir datos personales de otras personas, en especial de menores, sin su autorización.', 'Intentar acceder sin permiso a cuentas, datos o sistemas, ni interferir con el funcionamiento del servicio.', 'Usar el servicio para enviar spam o publicidad no solicitada.'] },
      { h: '8. Propiedad intelectual', p: ['El diseño, el código y la marca de Recreatic pertenecen a sus creadores. Las imágenes que busques en Wikimedia Commons conservan sus propias licencias y su atribución: revísalas antes de publicarlas fuera de la aplicación.'] },
      { h: '9. Disponibilidad y garantías', p: ['Recreatic se ofrece "tal cual" y sin costo. Hacemos lo posible por que funcione bien, pero no garantizamos que esté disponible sin interrupciones ni libre de errores, ni que los resultados sean exactos para fines de calificación oficial.', 'Te recomendamos conservar copias de tu contenido importante; puedes descargarlo desde "Mi perfil".'] },
      { h: '10. Limitación de responsabilidad', p: ['En la medida permitida por la ley, no respondemos por daños indirectos derivados del uso del servicio, por contenido creado por otros usuarios ni por la pérdida de datos causada por circunstancias fuera de nuestro control.'] },
      { h: '11. Suspensión', p: ['Podemos suspender o eliminar cuentas y contenidos que incumplan estos términos o que pongan en riesgo a otras personas o al servicio.'] },
      { h: '12. Cambios', p: ['Podemos actualizar estos términos. Publicaremos la nueva versión en esta página con su fecha. Si sigues usando Recreatic después, entendemos que la aceptas.'] },
      { h: '13. Ley aplicable', p: ['Estos términos se rigen por las leyes de la República de Colombia.'] },
      { h: '14. Contacto', p: [`Si tienes preguntas sobre estos términos, comunícate con ${RESPONSABLE}.`] }
    ]
  },

  privacidad: {
    titulo: 'Política de privacidad y tratamiento de datos personales',
    intro: 'Esta política explica qué datos recoge Recreatic, para qué los usa y cómo puedes ejercer tus derechos, de acuerdo con la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia.',
    secciones: [
      { h: '1. Responsable del tratamiento', p: [`El responsable del tratamiento de los datos es ${RESPONSABLE}.`] },
      { h: '2. Qué datos tratamos', p: ['Tratamos solo los datos necesarios para que el servicio funcione:'], li: [
        'Cuenta: tu correo electrónico y, si entras con Google, tu nombre y tu foto de perfil. Si usas contraseña, la gestiona nuestro proveedor de autenticación y no podemos verla.',
        'Contenido: las actividades que creas (textos, imágenes y audios), carpetas, listas y tus preferencias de apariencia.',
        'Clases y tareas: nombres de clases, tareas y, de los alumnos que las juegan, el nombre que escriben y su puntuación, aciertos, errores y tiempo.',
        'Comunidad: las actividades que decides compartir, tu nombre público de autor, las valoraciones que das y los reportes que envías.',
        'Datos técnicos: un contador anónimo de personas conectadas y los registros técnicos básicos de nuestros proveedores de alojamiento.'
      ] },
      { h: '3. Para qué los usamos', p: ['Prestar el servicio (iniciar sesión, guardar y sincronizar tus actividades, mostrar tus clases y resultados), mantener la seguridad, moderar la Comunidad y mejorar la aplicación. No usamos tus datos para publicidad ni los vendemos.'] },
      { h: '4. Autorización', p: ['Al crear una cuenta, iniciar sesión o compartir una actividad nos autorizas a tratar tus datos para estas finalidades. Puedes revocar la autorización eliminando tu cuenta.', 'Para los alumnos, la autorización corresponde al docente o a la institución, que debe informar a los estudiantes y a sus acudientes.'] },
      { h: '5. Menores de edad', p: ['Recreatic no está dirigido a menores de 14 años para crear cuentas. Los menores pueden jugar tareas asignadas por su docente, escribiendo solo un nombre. No pedimos datos sensibles de menores y recomendamos usar únicamente el nombre de pila o un apodo.'] },
      { h: '6. Con quién compartimos datos', p: ['Usamos proveedores que tratan datos en nuestro nombre, bajo sus propias garantías de seguridad:'], li: [
        'Supabase: base de datos, autenticación y almacenamiento de tus actividades, clases y resultados.',
        'Vercel: alojamiento de la aplicación web.',
        'Google: solo si eliges iniciar sesión con tu cuenta de Google.',
        'Wikimedia Commons: cuando buscas imágenes en el editor, tu búsqueda se envía a Wikimedia.'
      ], p2: ['Estos proveedores pueden almacenar información en servidores fuera de Colombia, lo que implica una transferencia internacional de datos con las garantías que ofrecen. Fuera de esto, solo compartimos datos si una autoridad competente lo exige legalmente.'] },
      { h: '7. Cuánto tiempo conservamos los datos', p: ['Conservamos tus datos mientras tengas la cuenta. Al eliminarla, borramos tus actividades, clases, tareas, resultados y valoraciones. Las copias de actividades que otras personas guardaron de la Comunidad permanecen en las cuentas de esas personas.'] },
      { h: '8. Tus derechos', p: ['Como titular de los datos puedes:'], li: ['Conocer, actualizar y rectificar tus datos.', 'Solicitar prueba de la autorización otorgada.', 'Ser informado del uso que se da a tus datos.', 'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).', 'Revocar la autorización y solicitar la supresión de tus datos.', 'Acceder gratuitamente a tus datos.'],
        p2: [`Puedes descargar tus actividades y eliminar tu cuenta directamente desde "Mi perfil". Para cualquier otra solicitud, comunícate con ${RESPONSABLE}${contacto}. Responderemos en los plazos que fija la ley.`] },
      { h: '9. Seguridad', p: ['Aplicamos medidas técnicas razonables: conexiones cifradas, control de acceso por usuario en la base de datos (cada persona solo accede a lo suyo) y funciones limitadas para los alumnos, que no pueden leer datos de otros. Ningún sistema es infalible, por lo que te pedimos cuidar tu contraseña.'] },
      { h: '10. Cambios en esta política', p: ['Si cambiamos esta política publicaremos la nueva versión aquí con su fecha de actualización.'] }
    ]
  },

  cookies: {
    titulo: 'Política de cookies y almacenamiento local',
    intro: 'Recreatic no usa cookies de publicidad ni de seguimiento. Solo guarda en tu navegador lo imprescindible para que la aplicación funcione y recuerde tus preferencias.',
    secciones: [
      { h: '1. Qué es el almacenamiento local', p: ['Además de las cookies, los navegadores permiten guardar pequeños datos en tu dispositivo (almacenamiento local, IndexedDB y caché). Recreatic usa esas tecnologías en lugar de cookies tradicionales.'] },
      { h: '2. Qué guardamos y para qué', tabla: [
        ['Actividades y resultados', 'IndexedDB', 'Guardar tus actividades y los resultados en tu dispositivo para que funcionen sin conexión.', 'Necesario'],
        ['Sesión', 'Almacenamiento local', 'Mantener tu sesión iniciada (lo gestiona nuestro proveedor de autenticación).', 'Necesario'],
        ['Preferencias', 'Almacenamiento local', 'Recordar tu modo claro u oscuro, tu color, carpetas, orden de las listas y el nombre que usas en las tareas.', 'Funcional'],
        ['Redirección tras el acceso', 'Almacenamiento de sesión', 'Volver a la página correcta después de iniciar sesión con Google.', 'Necesario'],
        ['Copia para uso sin conexión', 'Caché del navegador', 'Abrir la aplicación instalada aunque no haya internet.', 'Necesario']
      ], cab: ['Qué', 'Dónde', 'Para qué', 'Tipo'] },
      { h: '3. Terceros', p: ['Si eliges iniciar sesión con Google, Google puede establecer sus propias cookies en sus páginas según su política. Recreatic no incorpora analítica, redes publicitarias ni botones de redes sociales que instalen cookies de seguimiento.'] },
      { h: '4. Cómo controlarlo', p: ['Puedes borrar estos datos en cualquier momento desde la configuración de tu navegador (borrar datos del sitio). Si lo haces se perderán las actividades que solo estén guardadas en ese dispositivo y, si tenías sesión, tendrás que volver a entrar; las actividades de tu cuenta siguen en la nube.', 'Al ser tecnologías necesarias para el funcionamiento, no ofrecemos desactivarlas dentro de la aplicación.'] },
      { h: '5. Cambios', p: ['Si en el futuro añadimos otras tecnologías, actualizaremos esta página y te lo pediremos cuando corresponda.'] }
    ]
  }
};
