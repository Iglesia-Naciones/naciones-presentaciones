# Naciones Presentaciones Pro V1

Plataforma web local-first para operación de presentaciones y proyección, inspirada en el flujo de trabajo de ProPresenter.

## Incluye
- Interfaz de operador con biblioteca, playlist de presentación, cuadrícula de diapositivas y vista previa.
- Bibliotecas locales de presentaciones, canciones, medios y listas de servicio.
- Editor de diapositivas de texto, tipografía, tamaño, color, alineación, posición y sombra.
- Cancionero con estrofas separadas por bloques y fondos fijos de imagen/video.
- Importación de imágenes, videos y audio a IndexedDB.
- Pantallas independientes de audiencia y escenario.
- Envío en vivo mediante BroadcastChannel y postMessage.
- Acciones rápidas: pantalla negra, limpiar, logotipo y modo prédica.
- Temporizador.
- Módulo de pasajes bíblicos: permite pegar texto de la versión que la iglesia tenga autorización de usar.
- Respaldo JSON descargable e importable.

## Instalación
1. Descomprime el ZIP.
2. Sube todos los archivos a la raíz del repositorio GitHub Pages.
3. Espera a que Pages termine de publicar.
4. Abre la URL HTTPS, permite ventanas emergentes y pulsa Proyección / Escenario.
5. Usa dos pantallas: mueve la ventana de audiencia a la pantalla del proyector y déjala en pantalla completa.

## Datos existentes
La app actualiza IndexedDB `naciones-presentaciones` de versión 1 a versión 2. La actualización agrega almacenes `presentations` y `playlists` sin eliminar `media` ni `songs`. No borres los datos del sitio. Antes de actualizar, descarga un respaldo desde el botón Respaldo.

## Limitaciones honestas de esta entrega
- No incluye traducciones bíblicas; pega pasajes de una fuente cuyo uso esté autorizado.
- La salida de escenario es una ventana independiente básica; el contenido mostrado sigue el mismo estado en vivo.
- Los videos y audios se importan localmente; la reproducción de audio en vivo y el enrutamiento de audio del sistema requieren pruebas/configuración adicional del navegador y equipo.
- No tiene sincronización multiusuario ni almacenamiento en la nube. Los medios permanecen en el navegador de ese equipo.
- La compatibilidad de pantalla completa, autoplay y dos monitores debe probarse en el equipo real antes de un servicio.
