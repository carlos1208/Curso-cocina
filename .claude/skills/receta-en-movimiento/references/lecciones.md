# Lecciones de la primera producción (mujaddara)

Cada punto costó una vuelta; léelos antes de improvisar.

## Material

- **Los clips no se pueden adjuntar en el chat.** Usa Drive con el conector (ver SKILL.md). `drive.google.com` no es accesible por red desde el contenedor, así que la única vía es `download_file_content`. El resultado grande se guarda en `tool-results/…txt` y `drive_decode.py` lo convierte en el archivo original.
- **Las carpetas de Drive paginan.** Siempre sigue el `nextPageToken` (en la primera producción, 5 de 10 clips estaban en la página 2).
- **Hubo un clip duplicado** (mismo tamaño y md5). `drive_decode.py` lo descarta.
- **Las imágenes y clips generados con IA inventan logos** (una servilleta con "HALIAN RESTAURANT"). Busca texto en servilletas, delantales, frascos y paquetes. Recorta con zoom y foco y verifica ampliando la esquina del fotograma. Nunca publiques una marca real inventada.
- **Los clips de IA a veces traen música.** La planitud espectral menor a 0,45 lo delata (el plato final dio 0,12, frente a 0,5–0,8 de los sonidos de cocina). Silencia ese audio.

## Video

- Texto sobre comida: en el cierre, el título tapaba el plato. Sube el encuadre (`fy` ≈ .6) y baja el bloque de texto.
- Los números que cambian (contadores) con motion blur generan fantasmas: calcula su valor con el tiempo del fotograma (`Math.floor(t*FPS)/FPS`), no el del subframe.
- Las transiciones rápidas necesitan más subframes (el motor usa 14 en whips y zooms). Con pocos se ven copias escalonadas.
- Si un paso trae mucho texto, el título salta a dos líneas y empuja todo; mantén los títulos cortos.
- Cada clip usa como máximo un compás más márgenes. Elige `in` mirando la tira de 1 fotograma por segundo, en el momento de la acción, no al azar.

## Herramientas

- `ffmpeg -i archivo` sin salida siempre termina con código 1. Con `set -o pipefail`, `ffmpeg -i f | grep …` falla aunque grep encuentre algo. Guarda la salida primero (`info=$(ffmpeg -i f 2>&1 || true)`).
- El Chromium de Playwright no reproduce H.264 (`canPlayType` vacío). El video no se ve afectado, porque usa JPEGs. La web debe llevar cada clip en H.264 (Safari) y VP9 (resto) y elegir con `canPlayType`. La prueba local usará VP9. Díselo al usuario para que pruebe Safari o el iPhone.
- Las Google Fonts fallan en el headless local (certificado del proxy). Las capturas usan fuentes de respaldo, y en el Artifact publicado cargan bien.
- `rm -f $VAR/*` es bloqueado por una verificación de seguridad. Usa rutas literales o `"${VAR:?}"/*`.
- Un render de 900 frames con 4 workers tarda unos 6 min. La codificación de clips para la web, unos 2 min. `audio.py`, unos 5 s.
- No puedes escuchar: mide con `-af volumedetect` (apunta a un pico de −1 dB y una media de −16 dB) y pide al usuario que revise la mezcla.

## Artifacts (web)

- El escenario de la web es casi cuadrado en escritorio. Si un clip vertical lo llena (cover), se pierde casi la mitad del cuadro y el usuario lo notó como "planos muy cerrados". Por defecto la web muestra el cuadro completo sobre un fondo desenfocado (`webFit: 1`).
- Para esconder un logo en la web no reencuadres con zoom (vuelve a cerrar el plano): usa `web.blur`. Una caja con `boxblur` se ve como un parche; una máscara con borde suave parece desenfoque de cámara. La máscara hecha con `color=…,format=gray` es de rango limitado (blanco = 235) y deja ver ~8 % del logo: estírala con `lut=y='clip(val*1.3,0,255)'`.
- Un multiplicador ×2/×3 sobre una receta que rinde 4 hamburguesas se lee como "para 2 o 3 hamburguesas" (1800 g de carne para 3). Si la receta rinde piezas contables, usa `servings` para elegir la cantidad de piezas.

- `.m4a` no se sirve: usa `.mp3`. Tipos servidos: mp4, webm, mp3, wav, ogg, jpg, png, webp, json, js y css, entre otros.
- Los límites son 15 MB por archivo binario y 64 MB por publicación (si hace falta, publica en dos tandas a la misma URL). Cada visitante descarga solo lo que ve: los clips se crean al acercarse a su paso.
- Si el CSS le da `display` a un elemento, pisa al atributo `hidden`. La plantilla ya trae `[hidden]{display:none!important}`.
- En local las tildes se ven rotas porque la plantilla no declara charset (el Artifact lo agrega). Si se hospeda fuera de claude.ai, envuelve el archivo en `<!doctype html><meta charset="utf-8">…`.
- Los clips que avanzan con el scroll necesitan GOP corto (`-g 8`) para buscar sin tirones. Los loops se codifican de ida y vuelta para que no se note el corte.
- En iPhone, un video en pausa no carga datos. La plantilla hace `play().then(pause)` al crear los clips que avanzan con el scroll.

## Git

- Un master de 30 s pasa de 100 MB y GitHub lo rechaza. Versiona solo `*_web.mp4` y deja fuera `clips_raw/` (ya están en Drive), `clips/` y `frames/`.
