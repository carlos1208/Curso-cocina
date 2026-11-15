# Velouté de tomate tatemado · video largo para YouTube y Short

Hecho con la skill `receta-youtube` (motor de `enchiladas/largo`) a partir de la carpeta «Sopa de tomate» de Drive: narración de ElevenLabs (`guion_largo.mp3`, `Guion_short.mp3`), receta, guiones, plan y hoja de tomas de la preproducción, y 17 imágenes y clips generados (HERO, N01–N16).

| Archivo | Qué es |
|---|---|
| `veloute_tomate_youtube.mp4` | **El video para subir a YouTube** (1920×1080, 30 fps, 3:27, −14 LUFS) |
| `veloute_tomate_revision.mp4` | Copia liviana de revisión (720p) |
| `veloute_tomate_short.mp4` | Short vertical 1080×1920, 0:46, con voz propia, música y sonido de cocina |
| `veloute_tomate_short_sin_musica.mp4` | El mismo Short con voz y cocina, para poner un audio en tendencia en Instagram o TikTok |
| `veloute_tomate_short_portada.jpg` | Portada del Short |
| `miniatura.png` | Miniatura 1280×720 |
| `subtitulos.srt`, `subtitulos_short.srt` | Subtítulos corregidos (tildes, cifras, cantidades) |
| `descripcion_youtube.md` | Títulos, descripción con ingredientes y pasos, capítulos, etiquetas, pantalla final y textos del Short |
| `hoja_tomas.xlsx` | Hoja de tomas con los tiempos medidos en la voz real |
| `guion.json` | El diseño (lo escribe `tools/make_guion.py`) |

## Cómo se rehace

```bash
pip install numpy scipy openpyxl pyloudnorm
export NODE_PATH=$(npm root -g)
# los clips (raw/N*.mp4) no se versionan: bájalos de Drive a raw/ con su ID como nombre
python3 tools/make_guion.py && python3 tools/prep_media.py && python3 tools/build_timeline.py
node render_yt.cjs && python3 audio_yt.py && python3 tools/export.py long
python3 tools/build_short.py && TL=timeline_short.json node render_yt.cjs && python3 tools/export.py short
```

`tools/prep_media.py` y `tools/export.py` reemplazan los scripts del paquete de la skill que no estaban en el repo: el primero saca los fotogramas de cada clip (con un escalado ×2 Lanczos, porque los clips de Flow llegaron en 360×640) y su sonido; el segundo junta video y mezcla y calcula el bitrate para que cada archivo quepa en su vía de entrega.

## Tiempos: medidos en la voz

No había SRT de ElevenLabs. Se transcribió la narración con whisper (modelo tiny, marcas por palabra), se alineó con el texto del guion y con las pausas reales (`ffmpeg silencedetect`), y con ese SRT `receta_pre.py timing` puso en la hoja el inicio real de cada toma.

- **Largo:** el audio no trae la primera frase del guion («Sopa de tomate como en un restaurante con estrella») ni la pregunta final para comentarios, y lee tres títulos de capítulo («Tomates tatemados», «Aceite de albahaca», «Brioche de gruyère»). El plan se ajustó a lo que se dice; cada cortinilla cae sobre su título leído. La pregunta va en la burbuja de la pantalla final. Se agregaron 5,5 s de silencio al final (`voz_original.mp3` es la de ElevenLabs) para que la pantalla final dure 10 s.
- **Short:** el gancho dice solo «Sopa de tomate» y la voz lee «Pasos» antes del primer paso. Quedó en 45,6 s de voz + 0,5 s de bucle.

## Decisiones sobre el material

- **N14 y N15** traen una olla roja y otras baldosas al fondo: se usan con zoom sobre el plato (×1,45–1,6) para que no se vean.
- **N07:** el colador sube y flota en la segunda mitad; S19 usa un acercamiento al chorro y la olla.
- **Clips en 360×640:** se ven más suaves que las fotos en la tarjeta; conviene descargarlos de Flow en 720p o 1080p en la próxima receta.
- No escuché la mezcla: revisa voz, música y sonido de los clips.
