# Mujaddara: video de receta

Video vertical para el Curso de Cocina: 30 s, 1080×1920 (Reels/TikTok/Shorts), 30 fps, con sonido.

**Ver:** [`mujaddara_clips_web.mp4`](mujaddara_clips_web.mp4) (con los clips de video) · [`mujaddara_web.mp4`](mujaddara_web.mp4) (versión con fotos)

| Tiempo | Escena |
|---|---|
| 0–2,5 s | Portada con el plato terminado y el título MUJADDARA |
| 2,5–5 s | Ingredientes, uno por uno |
| 5–27,5 s | 8 pasos (precocer, colar, caramelizar, integrar, fuego lento, cebolla crujiente, escurrir, montaje) con temporizadores, chips de ingredientes y escala de caramelizado |
| 27,5–30 s | Cierre: "Buen provecho." |

Las fotos están "vivas":
- movimientos de cámara lentos (*Ken Burns*)
- vapor procedural
- destellos en el aceite que chisporrotea
- *rack focus* en los cortes suaves
- transiciones con barrido y motion blur real
- corrección de color cálida y grano

**Música original (96 BPM, un compás por escena):**
- ritmo *maqsum* de darbuka
- laúd sintetizado en modo *hijaz*
- pad cálido y bajo

**Sonidos de cocina sintetizados:** hervor, lentejas en el colador, chisporroteo, la tapa, el tic-tac del temporizador y la cebolla crujiente.

## Archivos

- `img/`: las 10 fotos de la receta (reescaladas con lanczos).
- `recipe.js` + `index.html`: la animación. Cada frame depende solo del tiempo. Vista previa: `npx serve .` y abre `/index.html`.
- `audio.py`: genera `soundtrack.wav` con numpy/scipy.
- `render.cjs`: renderiza los 900 frames en Chromium headless y codifica con ffmpeg.

## Regenerar

```bash
pip install numpy scipy imageio-ffmpeg
python3 audio.py
NODE_PATH=$(npm root -g) FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") node render.cjs
```

Genera `mujaddara.mp4` (master, ignorado por git) y `mujaddara_web.mp4`.

## Versión con clips de video

Los clips originales están en la carpeta de Drive *Mujaddara clips*. Para regenerar, pon los clips en `clips_raw/` con estos nombres:
`02_colar`, `03_caramelizar`, `04_integrar`, `05_tapa`, `05b_destapar`, `06_freir`, `07_escurrir`, `08_montaje` y `10_plato` (todos `.mp4`). Luego ejecuta:

```bash
FFMPEG=... ./prep_clips.sh                 # frames 1080x1920 + audio de cada clip
CLIPS=1 python3 audio.py                   # música + sonido real de los clips → soundtrack_clips.wav
QUERY=clips NAME=mujaddara_clips AUDIO=soundtrack_clips.wav node render.cjs
```

- El tramo de cada clip se define en `CLIP_MAP`, dentro de `recipe.js`.
- El paso 01 no tiene clip, así que usa la foto animada.
- El audio del clip del plato final (`10_plato`) va silenciado porque trae música.
- El clip del montaje está encuadrado para dejar fuera el logo de la servilleta.
