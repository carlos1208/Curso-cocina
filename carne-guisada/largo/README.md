# Carne guisada colombiana · video largo para YouTube y Short

Hecho con la skill `receta-youtube` a partir del material de la carpeta «Carne guisada» de Drive: narración de ElevenLabs (`voz.mp3`, 2:56), voz del Short (`voz_short.mp3`, 0:42), hoja de tomas y 14 imágenes y clips generados (HERO, N01–N05, N07–N14).

| Archivo | Qué es |
|---|---|
| `carne_guisada_youtube.mp4` | **El video para subir a YouTube**: 1920×1080, 30 fps, 2:59, −14 LUFS, 3,9 Mb/s en dos pasadas (92,7 MB) |
| `carne_guisada_revision.mp4` | Copia liviana de revisión (720p, 27,6 MB) |
| `carne_guisada_short.mp4` | Short vertical 1080×1920, 0:43, con voz, música y sonido de cocina; se repite sin corte (27,3 MB, −14 LUFS) |
| `carne_guisada_short_sin_musica.mp4` | El mismo Short solo con voz y cocina, para poner un audio en tendencia en Instagram o TikTok (27,2 MB) |
| `carne_guisada_short_portada.jpg` | Portada del Short (el título cae dentro del recorte 3:4 del perfil de Instagram) |
| `miniatura.png` | Miniatura 1280×720 |
| `subtitulos.srt`, `subtitulos_short.srt` | Subtítulos corregidos (tildes, cifras, cantidades) |
| `descripcion_youtube.md` | Títulos, descripción con ingredientes, tabla de cortes por país, capítulos, etiquetas, pantalla final y textos del Short |
| `hoja_tomas.xlsx` | La hoja de tomas con los tiempos medidos en la voz real (Tomas, Subtítulos, Short, Subtítulos Short, Por generar) |
| `guion.json` | El diseño: qué muestra cada toma, encuadres, datos animados, pines, gancho, pantalla final, miniatura y Short |

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

## Tiempos: medidos en la voz

La hoja de Drive traía tiempos estimados (la voz real dura 176,1 s, no 181,2) y las hojas «Subtítulos» vacías. Se transcribió la narración con un modelo de reconocimiento de voz (Parakeet TDT v3, marcas de tiempo por palabra), se alineó palabra por palabra con el guion (440 de 449 palabras coinciden) y cada corte se llevó a la pausa real más cercana. Así salieron los tiempos de las tomas, los subtítulos y el instante exacto en que aparece cada dato animado (un ingrediente aparece cuando la voz lo nombra).

- **La voz lee los títulos de sección** («Ingredientes», «Marinado», «Sellado», «Hogao», «Guiso», «Papas», «Servicio», «Cierre»): ElevenLabs leyó los encabezados del guion. Cada cortinilla de capítulo cae justo cuando la voz dice su título.
- **Falta la última frase del guion** («¿Cómo se llama este corte en tu país? Dímelo en los comentarios»): la voz termina en «…con técnica». La pregunta va escrita en la burbuja de la pantalla final, que se alarga 3 s después de la voz (8 s en total, lo que pide YouTube para sus elementos).

## Decisiones sobre el material

- **N06** (tomate rallado) no está en Drive: S17 («Ralla el tomate») usa N01 con un acercamiento a los tomates.
- **N03** (sellado): asoma una mano por el borde derecho entre 0,8 y 1,1 s; el clip se usa desde 1,3 s.
- **N05** (cebolla): una mano remueve con la cuchara entre 2,9 y 4,9 s. S15 va encuadrada sobre la cebolla (zoom 160 %), así que solo se ve la cuchara moviéndose; S16 usa el tramo sin mano (desde 5,0 s).
- **N09** (panela): el guiso trae zanahorias y papas que la receta no lleva en ese paso; va con acercamiento a la panela para que pesen poco.
- **N12** trae música en el audio y **N11**, **N13** vienen mudos: no aportan sonido. El resto aporta el sonido real de la cocina.
- Los clips de Flow llegaron en 360×640 (N07–N13) y 720×1280 (N03, N05): los acercamientos se mantuvieron moderados para que no se vean blandos.

## Capítulos

| | Inicio | Color |
|---|---|---|
| Gancho | 0:00 | — |
| 01 Ingredientes | 0:09 | azafrán |
| 02 Marinado | 0:50 | achiote |
| 03 Sellado | 1:07 | carne |
| 04 Hogao | 1:27 | tomate |
| 05 Guiso (cerveza negra y panela) | 1:53 | panela |
| 06 Papa criolla | 2:21 | papa criolla |
| 07 Servicio | 2:39 | aguacate |
| Pantalla final | 2:51 | — |

## Short

Autónomo, con su propia voz: abre con el plato terminado y el título en el primer segundo, pines sobre el plato (morrillo, papa criolla, arroz), ingredientes con cantidades que se cuentan solos, los pasos clave con sus gráficos (fuego, temporizadores) y la recompensa (la cuchara abriendo la carne). Cierra con «Guárdala / Receta con trucos / en el canal ▶» mientras la voz lo dice, y el último medio segundo vuelve al primer cuadro: el video se repite sin corte («…Así queda» → «La carne guisada que se deshace sola»).
