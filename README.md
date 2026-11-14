# Naciones Presentaciones Pro V5

Actualización del flujo de operación, canciones, imágenes fijas y configuración.

## Novedades de V5

### 1. Agregar canciones a una presentación
- Haz clic derecho en una canción desde la lista lateral o desde la pestaña superior Canciones.
- Aparece un menú **Agregar a** con las presentaciones existentes.
- Elige `Presentación principal`, `Equipo Plantación` u otra presentación.
- La canción se agrega como un grupo/carpeta dentro de esa presentación.
- También puedes elegir un destino en el selector “Agregar a presentación” del editor de canciones.
- El proceso guarda primero la presentación y después agrega las diapositivas para evitar perder los cambios.

### 2. Editor completo de letras
En la pestaña superior Canciones puedes editar:
- Nombre y autor.
- Letra, con una diapositiva por bloque de texto.
- Tipografía, tamaño y color.
- Alineación y posición vertical.
- Márgenes horizontales y verticales.
- Interlineado y sombra.
- Fondo por canción: imagen o video importado a la biblioteca local.

**Regla de separación:** una línea en blanco entre bloques produce una nueva diapositiva. Al guardar, si la canción ya está dentro de una o más presentaciones, se actualizan sus bloques, estilos y fondo en esas carpetas.

### 3. Imágenes fijas con atajos
- En Presentar, abre Medios en el panel izquierdo.
- Pulsa la estrella junto a una imagen para fijarla.
- Las imágenes fijadas aparecen en la bandeja “Imágenes fijas” debajo de la cuadrícula de diapositivas.
- Haz clic en una miniatura para agregarla a la presentación activa.
- Los tres primeros accesos usan F7, F8 y F9 de forma predeterminada; puedes cambiarlos en Configuración.

### 4. Configuración
La pestaña superior Configuración permite:
- Cambiar los atajos de siguiente/anterior, pantalla negra, limpiar, logotipo y modo prédica.
- Asignar atajos a las tres primeras imágenes fijas.
- Definir Fade o ninguna transición y su duración predeterminada.
- Activar/desactivar el envío automático al seleccionar una diapositiva.
- Pedir confirmación antes de limpiar la salida.
- Exportar e importar respaldos.

### 5. Identidad de Naciones
- El logotipo horizontal se muestra en la cabecera.
- El isotipo se usa para el favicon y el icono de accesos compatibles.
- Se eliminó el texto “PRESENTACIONES” debajo del logotipo.

## Instalación
1. Descomprime el ZIP.
2. Reemplaza en la raíz del repositorio los archivos incluidos: `index.html`, `styles.css`, `app.js`, `sw.js`, `README.md`, `INSTRUCCIONES.txt` y los archivos de identidad gráfica.
3. Conserva el `manifest.webmanifest` que ya existe en tu repositorio.
4. Espera a que GitHub Pages termine de publicar.
5. Recarga la aplicación con Ctrl+F5.
6. Para usar Audiencia y Escenario, permite ventanas emergentes.

## Datos locales y compatibilidad
- Se conserva IndexedDB `naciones-presentaciones`, versión 2.
- No se borran las tiendas de medios y canciones existentes.
- No borres los datos del sitio ni IndexedDB.
- Antes de actualizar, descarga un respaldo desde el botón Respaldo.
- Los archivos multimedia permanecen en el navegador y equipo donde se importan; no se sincronizan automáticamente entre computadoras.

## Prueba recomendada
Antes de usarlo en vivo:
1. Abre Canciones, elige una canción y guarda su letra con dos bloques separados por una línea en blanco.
2. Haz clic derecho en esa canción y usa Agregar a → Equipo Plantación.
3. Verifica que aparezcan dos diapositivas dentro de la carpeta de canción.
4. Arrastra una imagen PNG sobre el panel central de Equipo Plantación.
5. Fija una imagen desde Medios y verifica que aparezca en la bandeja inferior.
6. Abre Proyección y prueba Fade, pantalla negra y los atajos configurados.

## Alcance y límites
Esta versión implementa el flujo de operador en navegador y la salida independiente de audiencia/escenario. No incluye sincronización multiusuario ni audio profesional con enrutamiento de mezcladora. La validación de sintaxis no sustituye una prueba en el equipo real de proyección.
