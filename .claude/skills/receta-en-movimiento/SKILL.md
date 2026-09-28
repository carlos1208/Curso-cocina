---
name: receta-en-movimiento
description: Convierte una receta (texto + fotos y/o clips de video) en un video vertical de hasta 30 s para Reels/TikTok/Shorts con pasos animados, temporizadores, música original a ritmo y sonidos de cocina, y además en una web de curso donde el scroll "cocina" la receta (los clips avanzan con el scroll, el cursor sopla el vapor, el clic remueve). Úsala siempre que alguien quiera un video de receta, un reel o short de cocina, un video paso a paso de un plato, unir clips de cocina con títulos y efectos, una landing o web interactiva para un curso de cocina, o "hacer un video/una web con esta receta", aunque no mencione motion graphics, scroll ni esta skill. También sirve para recetas de repostería, bebidas o cualquier preparación con pasos.
---

# Receta en movimiento

Produce dos piezas a partir de una receta:

1. **Video vertical** 1080×1920, 30 fps, de 20 a 30 s. Incluye portada, ingredientes, un bloque por paso (número, título, detalle, temporizador, escala de color, chips de ingredientes), cierre, transiciones a ritmo con motion blur real, corrección de color cálida, música original y sonidos de cocina (o el sonido real de los clips).
2. **Web del curso** publicada como Artifact. Un escenario fijo muestra el paso activo mientras el texto se desliza. Los clips con acción avanzan con el scroll y los ambientales van en loop. El cursor sopla el vapor, el clic remueve con chispas y chisporroteo, y hay una lista de ingredientes con multiplicador ×1/×2/×3 y el video embebido.

Todo es código: `engine.js` (Canvas 2D, cada fotograma depende solo del tiempo), `audio.py` (numpy/scipy), `render.cjs` (Chromium headless → ffmpeg) y `build_web.py`. Un único **`recipe.json`** describe la receta, y de ahí salen el video, la música y la web.

## Sé honesto sobre lo que esto es

Con código no se genera video fotorrealista de manos cocinando. El realismo lo ponen las fotos o clips del usuario, y la skill pone el movimiento, la tipografía y el sonido. Si el usuario pide algo "hiperrealista" sin material, dilo antes de empezar. Ofrécele grabar clips con el celular (lo mejor) o usar fotos, propias o generadas con IA, animadas.

## Preparar el entorno (una vez por sesión)

```bash
pip install numpy scipy imageio-ffmpeg
export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")   # o el ffmpeg del sistema
export NODE_PATH=$(npm root -g)          # render.cjs usa el paquete playwright global
```

Playwright necesita Chromium. En entornos con `/opt/pw-browsers` ya está instalado, así que no ejecutes `playwright install`.

## Flujo

### 1. Reunir la receta y el material

- **Texto de la receta:** ingredientes con cantidades y pasos. No inventes datos. Si calculas un tiempo total, un número de porciones u otra cifra que la receta no trae, márcalo como estimado y díselo al usuario.
- **Fotos:** las adjuntas en el chat quedan en disco en la ruta que indica el mensaje. Cópialas a `img/`.
- **Clips de video:** el chat no acepta adjuntar video. Pide al usuario que los suba a una carpeta de **Google Drive** y descárgalos con el conector:
  1. `search_files` con `title contains '<carpeta>' and mimeType = 'application/vnd.google-apps.folder'`.
  2. `search_files` con `parentId = '<id>'`. Pagina con `pageToken`, porque la primera página no trae todos los archivos.
  3. `download_file_content` por archivo. El resultado es demasiado grande y el sistema lo guarda en un archivo de `tool-results/`. **Nunca leas ese base64 en el contexto**: decodifícalo con `python3 <skill>/scripts/drive_decode.py clips_raw <ruta1> <ruta2> …`, que además descarta duplicados.

  Como alternativa, pueden subirlos a GitHub (Add file → Upload files, máximo 25 MB por archivo en el navegador).

### 2. Crear el proyecto

```bash
bash <skill>/scripts/new_project.sh <carpeta> [--example]
```

Copia el motor, el renderizador, el audio y las fuentes. `--example` agrega el `recipe.json` de la mujaddara como punto de partida y referencia de estilo.

### 3. Auditar el material antes de planificar

```bash
python3 <skill>/scripts/media_audit.py <scratch>/audit "clips_raw/*.mp4" "img/*.jpg"
```

Lee con Read los PNG que genera: una tira de 1 fotograma por segundo por clip y una hoja de contacto de las fotos. Con eso decide:

- **Qué muestra cada clip o foto y a qué paso pertenece.** Los nombres de archivo de Drive suelen ser números. Renombra los clips por paso (`02_colar.mp4`), porque el nombre es la clave que usan `recipe.json`, `clips/` y la web.
- **El segundo donde ocurre la acción (`in`).** Cada escena usa un compás de clip (2,5 s a 96 BPM), así que elige el tramo con más movimiento: lo que cae, se levanta o se espolvorea.
- **Logos, marcas o texto en cuadro.** Las imágenes de IA suelen inventar marcas de restaurante en servilletas o delantales. Recórtalas con `mv`/`clipMv` (zoom y foco) y verifica con un recorte ampliado de ese fotograma. Avísale al usuario.
- **El audio de cada clip.** `ambient` se mezcla bajo la música. `tonal` suele ser música o voz: ponle `"audio": false`. `silent` no aporta nada.
- **Qué paso no tiene material.** Si falta, esa escena usa la foto animada o se le pide un clip al usuario.

### 4. Escribir `recipe.json`

El formato completo está en `references/recipe-json.md` y el ejemplo real en `assets/example/recipe.json`. Lo esencial:

- `scenes` define el video: `intro`, `ingredients`, un `step` por paso (se puede repetir `n` para una segunda toma del mismo paso, como "20 minutos después") y `final`.
- **Duración = escenas × 240/bpm.** A 96 BPM cada escena dura 2,5 s, así que 12 escenas dan 30 s. Si hay más pasos, sube el `bpm` (120 → 2 s por escena, hasta 15 escenas en 30 s) o agrupa pasos. Nunca pases el límite que pidió el usuario.
- **Textos cortos, para que entren y se lean en 2 s.** El título de un paso debe tener como mucho unos 22 caracteres (salta de línea solo, pero dos líneas empujan todo hacia abajo). Cada línea de detalle, como mucho unos 38. Deja la redacción completa para `body`, que solo usa la web.
- Aprovecha los recursos que dan vida a los pasos:
  - `timer` en minutos, para hervores y cocciones.
  - `gauge`, una escala de color de "punto justo" (cebolla, caramelo, tostado).
  - `chips` para lo que se agrega junto.
  - `adds`, una lista que se marca sola con el scroll en la web.
  - `sfx` para escenas con foto.
  - `transition: "flash"` para un salto de tiempo.
- `music`: `levante` (maqsum + laúd en hijaz, cocina árabe o mediterránea oriental), `latino` (clave, mayor) o `calido` (lo-fi suave, cualquier cocina).

### 5. Video: preparar, probar con fotogramas, renderizar

```bash
cd <carpeta>
./prep_clips.sh                          # solo si hay clips: frames 1080x1920 + audio + clips/index.json
python3 audio.py                         # soundtrack.wav (usa el audio real de los clips si existe)
node render.cjs --stills 1.5,4,6.5,9,…   # fotogramas sueltos → stills/
```

Arma una hoja de contacto con los fotogramas y mírala:

```bash
$FFMPEG -y -loglevel error -pattern_type glob -i 'stills/*.png' -vf "scale=240:-1,tile=6x2:padding=3" -frames:v 1 hoja.png
```

Revisa que el texto no tape lo importante del plato, que ningún logo quede en cuadro y que los recortes estén bien. Corrige `mv`/`clipMv`/`in` y repite solo los fotogramas que cambiaste. Luego renderiza todo:

```bash
NAME=<receta> node render.cjs            # ~6 min para 900 frames con 4 workers → <receta>.mp4 (master) + <receta>_web.mp4
```

Haz una hoja de contacto del `_web.mp4` con `fps=1/1.25` y mide el volumen con `-af volumedetect`. No puedes escuchar, así que di al usuario que revise la mezcla de música y sonidos. Entrega `<receta>_web.mp4` con SendUserFile (`display: render`).

`?photos` o `QUERY=photos` renderiza la versión solo con fotos, aunque haya clips.

### 6. Web del curso

```bash
python3 <skill>/scripts/build_web.py     # web/index.html + img, clips (H.264 y VP9), video y mp3
```

Tarda unos 2 minutos codificando clips. Los clips se controlan con `clip.web` en `recipe.json`:
- `{"scrub": [a, b]}`: el scroll mueve el clip de a a b segundos. Úsalo para acciones como colar, verter, destapar o espolvorear.
- `{"loop": [a, b]}`: loop de ida y vuelta sin corte. Úsalo para lo ambiental, como remover, freír, hervir tapado o el plato de portada.

Para comprobarla, sirve `web/` en local (`python3 -m http.server`) y toma **una** captura con Playwright en dos o tres puntos del scroll. El Chromium de prueba no tiene H.264 y usará el VP9, que es lo esperado. Las tildes se verán rotas en local porque falta el charset, que el Artifact agrega al publicar.

Después publica con la herramienta Artifact:
- `file_path`: `web/index.html`.
- `files`: el mapa de `web/artifact_files.json` (clave = ruta publicada, valor = ruta local).
- `icon`: `recipe`.
- Una `description`.

Para actualizar, vuelve a publicar la misma ruta. Da el enlace y aclara que es privado hasta que el usuario lo comparta.

### 7. Guardar

Si trabajas en un repo, haz commit del proyecto sin los pesados. `new_project.sh` ya crea un `.gitignore` que excluye `clips_raw/`, `clips/`, `frames/` y los masters, porque un master de 30 s pasa de 100 MB (el límite de GitHub). Guarda solo `*_web.mp4` (unos 15 MB) y la web.

## Al terminar, cuéntale al usuario

- Qué tramo usaste de cada clip y qué pasos quedaron con foto por falta de material.
- Qué recortaste y por qué (logos, marcas).
- Qué audios silenciaste (clips con música o voz).
- Qué datos estimaste tú (tiempo total, etc.).
- Que no pudiste escuchar la mezcla ni probar H.264, y qué debe revisar (Safari o el celular para la web).

## Problemas conocidos

Lee `references/lecciones.md` cuando algo falle o antes de tocar el motor. Recoge los tropiezos reales de la primera producción: códecs, límites de los Artifacts, pipefail con ffmpeg, ghosting en contadores, la tapa del texto sobre el plato, y más.
