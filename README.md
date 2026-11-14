# Naciones Presentaciones Pro V4

## Cambios de esta versión
- Se conserva el modelo de presentaciones independientes: “Presentación principal” y “Equipo Plantación” son proyectos distintos, cada uno con sus propias diapositivas.
- Las entradas vacías que tengan el mismo nombre que una canción guardada se ocultan del listado de Presentaciones para que canciones antiguas creadas por error no aparezcan como proyectos separados. Los registros no se borran.
- Se quitó la franja superior grande del panel central. Agregar diapositiva y Guardar se movieron a la barra compacta.
- Se puede arrastrar PNG, JPG, WebP, MP4 y WebM desde el escritorio directamente a cualquier zona del panel central. Los archivos se guardan y se agregan como diapositivas a la presentación actualmente seleccionada.
- También se puede arrastrar archivos directamente sobre una carpeta de presentación en el panel izquierdo: al soltarlos se abre esa presentación y se agregan ahí.
- Las canciones se agrupan como carpetas dentro de la presentación activa. Cada sección de letra aparece como una diapositiva hija.
- El editor de canciones separa por líneas en blanco reales: cada bloque de texto separado por una o más líneas vacías se convierte en una diapositiva independiente.
- Se puede cargar el logotipo real haciendo clic en la N de la esquina superior izquierda. Selecciona `Naciones logo.png`; se guarda en la biblioteca local de ese navegador y sustituye la N.
- Se conserva el efecto Fade y sus duraciones configurables.

## Cómo usar
1. Crea o selecciona `Equipo Plantación` en Presentaciones. Será independiente de `Presentación principal`.
2. Arrastra archivos de imagen/video al área grande central para agregarlos a la presentación seleccionada.
3. También puedes soltar archivos directamente sobre la carpeta `Equipo Plantación` en el panel izquierdo.
4. Para agregar canciones, abre Canciones y elige una canción. Sus bloques de letra aparecerán como una carpeta dentro de la presentación activa.
5. En la letra, deja una línea en blanco entre diapositivas.
6. Haz clic en la N superior izquierda para cargar el PNG del logo.

## Instalación
Reemplaza `index.html`, `styles.css`, `app.js`, `sw.js`, `README.md` e `INSTRUCCIONES.txt` con los incluidos en el ZIP. Espera al despliegue y recarga con Ctrl+F5.

## Datos
Se conserva IndexedDB `naciones-presentaciones` versión 2. No borres los datos del sitio. El PNG seleccionado como logo se guarda en la base local del navegador. Haz un respaldo antes de actualizar.
