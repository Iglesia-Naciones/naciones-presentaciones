# Naciones Presentaciones Pro V6 — Corrección de vista previa y biblioteca

## Correcciones de esta entrega

### 1. Vista previa de letra
Antes la vista previa de la derecha utilizaba el tamaño de tipografía de la proyección completa (por ejemplo 5vw) dentro de un recuadro pequeño. Eso hacía que las palabras aparecieran gigantes y recortadas.
- La vista previa del operador ahora escala el tamaño de letra proporcionalmente al ancho del recuadro.
- El tamaño elegido para la proyección completa se conserva en las ventanas de Audiencia y Escenario.
- Las miniaturas de diapositivas ahora reflejan el color, la tipografía, el interlineado y los márgenes guardados.
- La posición vertical se aplica mediante alineación real del contenido.

### 2. Canciones debajo de Presentaciones
- El panel izquierdo separa la lista de proyectos (Presentación principal, Equipo Plantación, etc.) de una sección **Canciones agregadas**.
- Al agregar una canción, aparece ahí como carpeta independiente, con cada bloque de letra como diapositiva hija.
- La sección indica a qué presentación pertenecen las canciones. Al cambiar de presentación, cambia la lista de canciones agregadas mostrada.
- Ya no se mezclan los folders de canciones dentro de la tarjeta de presentación.

### 3. Agregar canción y guardar formato
- El menú contextual “Agregar a” permanece disponible mediante clic derecho y el botón de tres puntos en la pestaña Canciones.
- Al agregar desde el menú, si esa canción es la que se está editando, se guardan primero letra, estilo y fondo antes de crear las diapositivas.
- Al guardar una canción que ya está insertada en una o varias presentaciones, sus diapositivas existentes se sincronizan con la nueva letra, color, tipografía, márgenes, interlineado y fondo.
- Si el usuario no ha escrito ninguna sección, se avisa y no se crea un grupo vacío.

### 4. Fade, imágenes fijas y configuración
Se conservan el Fade, la bandeja inferior de imágenes fijas, los atajos configurables, el logo y el isotipo.

## Instalación
1. Descomprime el ZIP.
2. Reemplaza en GitHub los 11 archivos incluidos.
3. Conserva el archivo `manifest.webmanifest` existente en tu repositorio.
4. Espera a que GitHub Pages publique y recarga con Ctrl+F5.
5. No borres los datos del sitio ni IndexedDB.

## Datos
Se conserva IndexedDB `naciones-presentaciones`, versión 2, con las tiendas de canciones y medios existentes y la información de presentaciones. Se recomienda exportar un respaldo antes de actualizar.

## Prueba sugerida
1. Abre una canción guardada y confirma que sus bloques estén separados por una línea en blanco.
2. Selecciona un color café y un tamaño cómodo; pulsa Guardar canción.
3. Haz clic derecho en la canción y elige Agregar a → Presentación principal.
4. Comprueba que aparezca debajo de “Canciones agregadas” como carpeta y que cada bloque tenga su propia diapositiva.
5. Revisa que la vista previa de la derecha ya no recorte el texto.
6. Abre la ventana de Proyección y verifica que el tamaño real de letra siga siendo correcto.

## Alcance de la validación
Se comprobó la sintaxis JavaScript, que los IDs HTML sean únicos, que las referencias JS a elementos HTML existan y que los elementos principales de las funciones corregidas estén incluidos. No se ejecutó una prueba de navegador con hardware de proyección.


## V7 — Renombrar presentaciones y scroll de diapositivas

### Cambiar el nombre de una presentación
- En el panel izquierdo, cada presentación tiene un botón de lápiz a la derecha.
- Haz clic en el lápiz para escribir el nuevo nombre.
- También puedes hacer clic derecho sobre el nombre de una presentación para abrir el mismo cambio de nombre.
- El nombre nuevo se guarda en IndexedDB y se refleja en la biblioteca y en el selector de destino de canciones.
- No se modifica el contenido ni se crea una presentación adicional.
- No se permiten nombres vacíos ni nombres duplicados.

### Scroll de la cuadrícula de diapositivas
- El contenedor central de diapositivas ahora tiene altura limitada al espacio visible.
- Cuando hay más diapositivas de las que caben, se desplaza la cuadrícula internamente con su propia barra de scroll.
- La barra superior, el panel lateral, la bandeja de imágenes fijas y los controles inferiores permanecen en su lugar.
- El panel de vista previa derecho tiene su propio desplazamiento si su contenido excede la altura disponible.
- En pantallas pequeñas se conserva el diseño adaptable y se limita el alto del contenedor de diapositivas.

## V7 — Instalación
Reemplaza los archivos incluidos en este paquete, incluido `sw.js`, y conserva el `manifest.webmanifest` de tu repositorio. La clave de caché se actualizó para que el navegador detecte esta entrega. Después de publicar, recarga con Ctrl+F5.


## V8 — Imágenes fijas globales y audio de video

### Imágenes fijas: recursos globales
- Las imágenes de la bandeja inferior **no se agregan a ninguna presentación ni modifican el número/orden de diapositivas**.
- Al pulsar una imagen fija, se muestra como una capa independiente en la vista previa y en las salidas de Audiencia/Escenario.
- La imagen permanece visible mientras se avanza o cambia de presentación; así funciona como recurso extra global.
- Pulsa de nuevo la misma miniatura para retirarla.
- “Limpiar salida” también retira la imagen global.
- Los atajos F7, F8 y F9 muestran/ocultan las tres primeras imágenes fijas; tampoco crean diapositivas.
- Al quitar la estrella de una imagen activa, se retira de la salida global.

### Audio de videos
- Los videos de las diapositivas y los videos asignados como fondo pueden reproducir su pista de audio en la ventana de **Audiencia**.
- Por seguridad, el navegador inicia los videos silenciados hasta que el operador/usuario pulse **“Activar audio de videos”** en la ventana de Audiencia. También se puede hacer clic en la propia ventana de Audiencia para habilitarlo.
- Después de habilitarlo una vez en esa ventana, los siguientes videos de esa sesión pueden reproducir audio.
- La ventana de Escenario permanece silenciada para evitar duplicar el sonido.
- El audio sale por la salida de audio predeterminada del equipo (bocinas, interfaz de audio o dispositivo seleccionado en el sistema). La aplicación no sustituye una consola de mezcla ni enruta canales de audio profesionales.
- El navegador o el sistema operativo pueden bloquear la reproducción; si sucede, el control muestra un aviso y permite reintentar.

## Prueba recomendada V8
1. Anota el número de diapositivas de una presentación.
2. Pulsa una miniatura en “Imágenes fijas”: debe aparecer en la salida sin cambiar el número de diapositivas.
3. Avanza una diapositiva: la imagen global debe permanecer visible.
4. Pulsa de nuevo la miniatura o “Limpiar salida”: la imagen global desaparece.
5. Abre Audiencia, pulsa “Activar audio de videos” y envía una diapositiva con un MP4 que tenga audio.
6. Confirma que se escucha por la salida seleccionada del equipo y que Escenario sigue silenciado.
