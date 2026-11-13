# Enchiladas rojas de pollo · video largo para YouTube y Short

Hecho con la skill `receta-youtube` a partir de la carpeta «Enchilada» de Drive: narración de ElevenLabs (`Guion_largo.mp3`, `Guion_corto.mp3`), receta, guiones, plan y hoja de tomas de la preproducción, y 13 imágenes y clips generados (HERO, N01–N12).

| Archivo | Qué es |
|---|---|
| `enchiladas_rojas_youtube.mp4` | **El video para subir a YouTube** (1920×1080, 30 fps, 3:00, −14 LUFS) |
| `enchiladas_rojas_revision.mp4` | Copia liviana de revisión (720p) |
| `enchiladas_rojas_short.mp4` | Short vertical 1080×1920, 0:47, con voz propia, música y sonido de cocina |
| `enchiladas_rojas_short_sin_musica.mp4` | El mismo Short solo con voz y cocina, para poner un audio en tendencia en Instagram o TikTok |
| `enchiladas_rojas_short_portada.jpg` | Portada del Short (el título cae dentro del recorte 3:4 del perfil de Instagram) |
| `miniatura.png` | Miniatura 1280×720 |
| `subtitulos.srt`, `subtitulos_short.srt` | Subtítulos corregidos (tildes, cifras, cantidades) |
| `descripcion_youtube.md` | Títulos, descripción con ingredientes y pasos, capítulos, etiquetas, pantalla final y textos del Short |
| `hoja_tomas.xlsx` | La hoja de tomas con los tiempos medidos en la voz real (Tomas, Subtítulos, Short, Subtítulos Short, Por generar) |
| `guion.json` | El diseño: qué muestra cada toma, encuadres, datos animados, pines, gancho, pantalla final, miniatura y Short |
| `voz.mp3`, `voz_short.mp3` | Las narraciones editadas que usa el montaje (`voz_original.mp3` y `voz_short_original.mp3` son las de ElevenLabs) |

## Cómo se rehace

```bash
pip install numpy scipy openpyxl pyloudnorm imageio-ffmpeg
export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") NODE_PATH=$(npm root -g)
SK=<ruta de la skill receta-youtube>
# los clips (raw/N*.mp4) no se versionan: bájalos de Drive a raw/ con su ID como nombre
python3 $SK/scripts/prep_media.py && python3 $SK/scripts/build_timeline.py
node render_yt.cjs && python3 $SK/scripts/export.py long
python3 $SK/scripts/build_short.py && TL=timeline_short.json node render_yt.cjs && python3 $SK/scripts/export.py short
```

## Material horizontal

Las imágenes llegaron en 4:3 (1200×896) y los clips en 16:9 (640×360), aunque los prompts pedían 9:16. Recortar eso a la tarjeta vertical habría ampliado los clips 2,5 veces en el largo y 5 veces en el Short, y habría cortado la estufa y la llama. El motor (`engine_yt.js`) ahora acepta `"footage": "landscape"` en `guion.json`:

- **Largo:** la tarjeta pasa a 16:9 (1000×562) y la columna de texto a 700 px. Los clips entran completos (×1,56) y las fotos pierden una franja arriba y abajo. La pantalla final usa una tarjeta horizontal al lado del recuadro «PRÓXIMO VIDEO».
- **Short:** la toma va en una franja 16:9 a todo el ancho (y 730–1338) sobre una copia desenfocada. El título y los datos animados quedan arriba y los subtítulos debajo, todo dentro de la zona segura.
- El gancho del largo conserva las tres tarjetas verticales, con fotos (nítidas) antes del volteo y clips después.

Otros cambios al motor: los temporizadores en segundos ya no se muestran como mm:ss, el tablero de ingredientes acepta fracciones («¾», «½»), los subtítulos se reparten en líneas parejas (sin una palabra sola en la segunda línea) y la tarjeta final del Short puede desaparecer antes del cierre (`cta.until`) para que la última frase suene sobre el plato.

## Tiempos: medidos en la voz

La hoja de Drive traía tiempos estimados y las hojas de subtítulos vacías (no había SRT de ElevenLabs). Se transcribió la narración con Parakeet TDT v3 (marcas de tiempo por palabra), se alineó con el texto del guion y se generó un SRT con el texto del guion en los tiempos reales. Con ese SRT, `receta_pre.py timing` (de la skill de preproducción) puso en la hoja el inicio real de cada toma y llenó «Subtítulos» y «Subtítulos Short».

- **La voz lee los títulos de sección** del guion: «Ingredientes», «Pollo», «Salsa roja», «Tortillas», «Armado», «Servicio». Se dejaron: cada cortinilla de capítulo cae sobre esa palabra. «Cierre» sonaba a etiqueta del guion y se cortó del audio (180,1 s en lugar de 181,2 s).
- **Short:** la voz empezaba con el título leído («Enchiladas rojas de pollo.») y decía «Ingredientes» antes de la lista. Se cortaron las dos cosas para que el gancho suene desde el primer segundo, y las pausas de más de 0,45 s se dejaron en 0,42 s. Quedó en 46,1 s de voz (52,5 s el original), más 0,5 s de bucle: 1,6 s por encima del objetivo de 45 s.
- Todos los cortes caen en silencio digital (−90 dB), sin clics.
- Para revisar al escuchar: en el Short, «enrolla y baña con más salsa» (0:31) el reconocedor oyó «baña salsa»; en el largo, «Pasa… cada tortilla» (2:11) tiene una pausa rara después de «Pasa».

## Decisiones sobre el material

- Todo coincide con su descripción en «Por generar»; sin logos, manos ni pantallas divididas. N10 tiene otra cocina de fondo (estufa más grande, ollas de barro).
- **N07 (licuadora):** el clip hace un acercamiento fuerte; se repartió en tres tomas (frasco con los ingredientes, giro de la salsa, salsa lisa).
- **N11 (salsa que cae):** S28 usa el final del clip (plato quieto) para «acomoda tres por plato» y S29 el chorro para «báñalas con más salsa».
- **Audio:** la auditoría marca el sonido de los siete clips como ambiente de cocina (hervor, chisporroteo, licuadora), sin música ni voz; ninguno se silenció. No lo escuché: revisa la mezcla.

## Capítulos

| | Inicio | Color |
|---|---|---|
| Gancho | 0:00 | — |
| 01 Ingredientes | 0:10 | azafrán |
| 02 Pollo deshebrado | 0:37 | carne |
| 03 Salsa de guajillo | 1:08 | chile |
| 04 Tortillas flexibles | 2:04 | maíz |
| 05 Rellenar y enrollar | 2:25 | armado |
| 06 Servir y decorar | 2:37 | verde |
| Pantalla final | 2:51 | — |
