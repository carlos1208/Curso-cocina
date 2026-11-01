# Sobrebarriga braseada en cerveza negra y panela: video de receta

Video vertical para el Curso de Cocina: 30 s, 1080×1920 (Reels/TikTok/Shorts), 30 fps, con sonido.

**Ver:** [`sobrebarriga_web.mp4`](sobrebarriga_web.mp4)

| Tiempo | Escena |
|---|---|
| 0–2,5 s | Portada con el plato terminado y el título SOBREBARRIGA |
| 2,5–5 s | Ingredientes (lista resumida de 12) |
| 5–27,5 s | 8 pasos: sazonar, sellar, sofrito, cerveza negra, braseado lento (+ "3 horas después"), reducir la salsa, mantequilla fría, glasear. Incluye temporizadores, chips de ingredientes y escalas de dorado y espesor |
| 27,5–30 s | Cierre: "¡Buen provecho!" |

## Imágenes

No había fotos ni clips, así que las 10 imágenes son **ilustraciones cenitales hechas con código** (SVG renderizado en Chromium), en `illus/`:

- `lib.cjs`: utilidades de dibujo (formas orgánicas, texturas de madera y carne, brillo de salsas, sombras), utensilios (olla de hierro, tapa, cacerola, sartén, plato, tenedor, cuchara de palo) e ingredientes (carne cruda, sellada, braseada y en tajadas glaseadas, cebolla, pimentón, tomate, ajo, laurel, tomillo, puré de papa criolla, cebolla encurtida, cilantro, ralladura de limón, panela, mantequilla).
- `scenes.cjs`: una composición por escena (`hero`, `s1`…`s8`, `s5b`).
- `render.cjs`: las renderiza a `img/<nombre>.jpg`.

El motor les da vida con movimientos de cámara, vapor procedural y brillos de aceite.

**Para cambiarlas por fotos o clips reales**, pon las fotos en `img/` (o los clips en `clips_raw/`) y apunta `img` o `clip` de cada escena en `recipe.json` (ver la skill `receta-en-movimiento`).

## Música y sonido

Música original `latino` a 96 BPM (clave de son, pulsado de cuerda y bajo), un compás por escena. Los sonidos de cocina son sintetizados: especias, chisporroteo del sellado y del sofrito, cerveza vertida y hervor, tapa y fuego lento, burbujeo de la reducción, cuchara y el tic-tac de los temporizadores.

## Cambios en el motor (solo en este proyecto)

- `videoIngredients` en `recipe.json`: lista resumida para el video. `ingredients` conserva la lista completa (con cantidades para el multiplicador de la web).
- Los temporizadores de 60 minutos o más se muestran en horas (`H:MM`, "HORAS").

## Regenerar

```bash
pip install numpy scipy imageio-ffmpeg
export NODE_PATH=$(npm root -g) FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
node illus/render.cjs            # ilustraciones → img/
python3 audio.py                 # soundtrack.wav
NAME=sobrebarriga node render.cjs   # sobrebarriga.mp4 (master, ignorado por git) + sobrebarriga_web.mp4
```
