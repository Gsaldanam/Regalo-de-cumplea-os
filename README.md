# Regalo de cumpleaños para Kayra

Página estática de cumpleaños hecha con HTML, CSS y JavaScript puro.

## Editar el regalo

- Cambia el nombre en `index.html` si es necesario.
- Edita las seis cartas y `mensajeFinal` en `data/cartas.json`.
- Añade fotos o sonidos propios dentro de `assets/` y escribe sus rutas en el JSON si quieres usarlos.
- Para empezar el recorrido desde cero en el navegador, borra la clave `regalo-cumpleanos-desbloqueadas` del almacenamiento local.

## Publicar en GitHub Pages

1. Sube estos archivos a un repositorio de GitHub.
2. Abre `Settings` > `Pages`.
3. En `Build and deployment`, selecciona `Deploy from a branch`.
4. Elige la rama principal y la carpeta `/ (root)`; pulsa `Save`.
5. Espera a que termine el despliegue y abre la URL que GitHub muestre en esa misma sección.

Como el proyecto usa `fetch` para leer `data/cartas.json`, debe abrirse desde GitHub Pages o desde un servidor local, no haciendo doble clic directamente sobre `index.html`.
