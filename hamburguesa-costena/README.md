# Hamburguesa costeña: video y web de la receta

Receta 02 del Curso de Cocina: *Hamburguesa Costeña con Hogao Caramelizado y Queso Frito*. Hecha con la skill `receta-en-movimiento` a partir de los 6 clips de la carpeta "Hamburguesa costeña" de Drive.

**Video:** [`hamburguesa_costena_web.mp4`](hamburguesa_costena_web.mp4). Vertical 1080×1920, 25 s, 30 fps, música `latino` a 96 BPM (un compás de 2,5 s por escena).

| Tiempo | Escena | Clip (tramo) |
|---|---|---|
| 0–2,5 s | Portada | `06_hamburguesa` desde 0,4 s |
| 2,5–5 s | Ingredientes (15) | — |
| 5–7,5 s | 01 Mermelada de hogao · escala de color | `01_hogao` desde 1,8 s (la cuchara que chorrea) |
| 7,5–10 s | 02 Salsa de suero · chips | `02_suero` desde 2,8 s |
| 10–12,5 s | 03 Plátano y queso frito · temporizador 2 min | `03_platano_queso` desde 2,0 s (pantalla dividida) |
| 12,5–15 s | 04 Bolas de 150 g | `04_bolas` desde 1,0 s |
| 15–17,5 s | 05 ¡Smash! · temporizador 2 min | `05_smash` desde 1,9 s |
| 17,5–20 s | 05 Voltea: 1 min más (flash) | `05_smash` desde 5,3 s |
| 20–22,5 s | 06 Tostar y armar · chips de las capas | `06_hamburguesa` desde 2,9 s, cerrado sobre la hamburguesa |
| 22,5–25 s | Cierre "¡Buen provecho!" | `06_hamburguesa` desde 5,25 s |

**Web:** `web/` (se publica como Artifact). Los clips de colar la salsa, las bolas y el smash avanzan con el scroll; el hogao, el plátano con queso y la hamburguesa van en loop.

## Notas de producción

- La olla del hogao trae el logo "LE CREUSET" grabado en las dos asas. El clip se usa con zoom 2,3× (2,4× en la web) centrado en la cuchara para dejar ambos logos fuera de cuadro.
- Los clips `06_hamburguesa` y `04_bolas` traían audio tonal (música); están silenciados y llevan sonidos sintetizados. Los demás usan su sonido real.
- Los primeros ~1,3 s de `05_smash` son una pantalla dividida; la escena empieza después.
- El tiempo total (≈ 45 min) es una estimación; la receta no lo trae.

## Regenerar

```bash
pip install numpy scipy imageio-ffmpeg
export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") NODE_PATH=$(npm root -g)
# clips_raw/ no se versiona: descarga los clips de Drive y nómbralos como en recipe.json
./prep_clips.sh && python3 audio.py
NAME=hamburguesa_costena node render.cjs
python3 ../.claude/skills/receta-en-movimiento/scripts/build_web.py
```
