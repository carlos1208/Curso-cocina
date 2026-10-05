# Pollo al barril en mariposa · video largo para YouTube y Short

Hecho con la skill `receta-youtube` a partir del material de la carpeta «Pollo entero al barril en mariposa» de Drive: narración de ElevenLabs (`voz.mp3`, 3:00,7), hoja de tomas, receta, plan y 13 imágenes y clips generados (HERO, N01–N12).

| Archivo | Qué es |
|---|---|
| `pollo_al_barril_youtube.mp4` | **El video para subir a YouTube** (1920×1080, 30 fps, 3:03, −14 LUFS, 3,8 Mb/s en dos pasadas, 92,6 MB) |
| `pollo_al_barril_revision.mp4` | Copia liviana de revisión (720p, 27,6 MB) |
| `pollo_al_barril_short.mp4` | Short vertical 1080×1920, 0:26, recortado del largo, con voz, música y sonido de cocina (25,7 MB, −14 LUFS) |
| `pollo_al_barril_short_sin_musica.mp4` | El mismo Short solo con voz y cocina, para poner un audio en tendencia en Instagram o TikTok (25,7 MB) |
| `pollo_al_barril_short_portada.jpg` | Portada del Short (el título cae dentro del recorte 3:4 del perfil de Instagram) |
| `miniatura.png` | Miniatura 1280×720 |
| `subtitulos.srt`, `subtitulos_short.srt` | Subtítulos corregidos (tildes, cifras, cantidades) |
| `descripcion_youtube.md` | Títulos, descripción con ingredientes y pasos, capítulos, etiquetas, pantalla final y textos del Short |
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

La hoja de Drive traía tiempos estimados (196,4 s; la voz real dura 180,7 s) y la hoja «Subtítulos» vacía. Se transcribió la narración con Parakeet TDT v3 (marcas de tiempo por palabra), las 40 tomas del guion se encontraron en la transcripción y cada corte se llevó al arranque real de la frase (las pausas de ElevenLabs son silencio digital, −90 dB). De ahí salieron los tiempos de las tomas, los subtítulos y el instante en que aparece cada dato animado (un ingrediente aparece cuando la voz lo nombra).

- **La voz dice «El pollo.»** antes de «Primero, abre el pollo en mariposa» (40,9 s): parece un título del guion que ElevenLabs leyó. La cortinilla del capítulo «Mariposa» cae justo ahí.
- **Palabras que el reconocedor oyó raro** (revisa al escuchar): «en la never» (nevera, 90,3 s), «el jug debe salir» (jugo, 136 s), «un corte a algo largo» (a lo largo, 142,5 s) y «hasta que el queso blande» (se ablande, 159,3 s). Los subtítulos van con el texto del guion; si la voz de verdad se comió esas sílabas, conviene regenerar esas frases en ElevenLabs.
- **S39 y S40 se unieron** en una sola toma de cierre y la pantalla final se alarga 2,5 s después de la voz (10,8 s en total), para que el motor arranque la pantalla final con «Si te gustó…» y YouTube tenga ≥ 5 s para sus elementos.
- `voice_check.py` avisa de un desfase de −0,48 s que es falso: mide desde 0,5 s antes de cada subtítulo y, cuando la frase anterior termina dentro de esa ventana, la toma por el arranque. Medido a mano, los subtítulos empiezan donde empieza la voz (±0,02 s).

## Decisiones sobre el material

- Todo el material coincide con su descripción en «Por generar»; sin logos, manos ni pantallas divididas.
- **Resolución:** los clips llegaron en 360×640 (N04–N12) y 720×1280 (N03); los acercamientos fuertes (×1,7–2,1) se hicieron sobre las fotos (1376 px de alto) y en los clips se mantuvieron moderados.
- **N06 y N07 duran 4 s** (no 8): S13 (8,5 s) y S24 van en cámara lenta mezclando fotogramas.
- **N03** (la cerveza cae al adobo desde 0,7 s): S15 («mezcla el ajo…») usa el bol antes del chorro con un acercamiento lento y S16 («agrega… la cerveza») el chorro.
- **Audio:** N11 y N12 vienen mudos (no aportan sonido). N04 y N05 los marca la auditoría como «tonal», pero es el crepitar del carbón y el chorro: se usan.
- **El Short es un recorte** del largo (26 s): en Drive no había `voz_short.mp3`. La hoja «Short» (V01–V11) queda con los tiempos estimados del plan; con esa voz se puede hacer el Short autónomo de 42 s.

## Cambios al motor (`engine_yt.js`)

- Temporizador: `unit: "h"` dice «horas» (el marinado de 4 h) y `main` reemplaza el texto principal para rangos («60–70 minutos», «faltando 30 min»).
- Audio (`audio_yt.py`): el chisporroteo del gancho acepta clips de menos de 8 s (N07 dura 4 s).
- Gancho vertical del Short: la palabra grande («Crocante») y el título se achican para no salir de la zona segura (x ≤ 900).

## Capítulos

| | Inicio | Color |
|---|---|---|
| Gancho | 0:00 | — |
| 01 Ingredientes | 0:09 | azafrán |
| 02 Mariposa | 0:40 | carne cruda |
| 03 Adobo costeño | 1:04 | achiote |
| 04 Barril (brasas con ceniza gris) | 1:34 | ceniza |
| 05 Cocción | 1:52 | brasa |
| 06 Plátano con queso crema | 2:18 | plátano |
| 07 Reposo y servicio | 2:40 | verde |
| Pantalla final | 2:52 | — |
