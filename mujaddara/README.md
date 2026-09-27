# Mujaddara: video de receta

Video vertical para el Curso de Cocina: 30 s, 1080×1920 (Reels/TikTok/Shorts), 30 fps, con sonido.

**Ver:** [`mujaddara_web.mp4`](mujaddara_web.mp4)

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
