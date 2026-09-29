# Hamburguesa costeña · video largo para YouTube

Video 16:9 de 2:37 (1920×1080, 30 fps) montado sobre la narración de ElevenLabs y la hoja de tomas `hoja_tomas.xlsx`.
Todo el material es vertical, así que el formato es editorial: una tarjeta 9:16 con la toma, el fondo con la misma
toma desenfocada y una columna con los datos animados (cantidades, temporizadores, fuego, consejos) y los subtítulos.
La tarjeta cambia de lado en cada capítulo y cada capítulo abre con una cortinilla de dos capas.

| | |
|---|---|
| `hamburguesa_costena_youtube_720p.mp4` | Copia liviana para revisar (el master de 1080p no se versiona: pasa de 100 MB) |
| `miniatura.png` | Miniatura 1280×720 |
| `subtitulos.srt` | Subtítulos corregidos (tildes, números, "hogao") |
| `descripcion_youtube.md` | Títulos, descripción con ingredientes y capítulos, etiquetas y dónde van los elementos de la pantalla final |

## Cómo está hecho

- `build_timeline.py` lee los tiempos de la hoja "Tomas" y agrega el diseño: qué parte de cada clip se ve, el encuadre, los callouts sincronizados con la voz y los subtítulos → `timeline.json` + `subtitulos.srt`.
- `engine_yt.js` + `index.html`: el motor (Canvas 2D). Cada fotograma depende solo del tiempo; motion blur real en cortes, cortinillas y en el reparto de cartas del gancho.
- `render_yt.cjs`: Chromium headless, 4 procesos en paralelo que mandan los fotogramas por tubería a ffmpeg → `video_sin_audio.mp4` (≈ 11 min). `--stills 12,40` para fotogramas sueltos, `--range 30:45` para un tramo.
- `audio_yt.py`: música con los instrumentos del short, con el tempo ajustado por capítulo para que cada cortinilla caiga en el compás; baja bajo la voz; sonido real de los clips y efectos para los gráficos. Normaliza a −14 LUFS.
- `exportar.sh`: mezcla y une audio y video. **Con la narración:** guárdala como `voz.mp3` (o `.wav`) en esta carpeta y corre `./exportar.sh`; no hace falta volver a renderizar la imagen.
- `prep_media.sh`: extrae los fotogramas de los clips (C1–C6 del short en `../clips_raw`, los nuevos en `raw/`).

```bash
pip install numpy scipy openpyxl pyloudnorm imageio-ffmpeg
export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") NODE_PATH=$(npm root -g)
./prep_media.sh && python3 build_timeline.py && node render_yt.cjs && ./exportar.sh
```

## Decisiones sobre el material

- `N08.mp4` de Drive era el N07 (el surco en el hogao) y el segundo `N08.mp4` era el N08 (la salsa); se renombraron así en `raw/`.
- N16 llegó como foto de la hamburguesa entera, no cortada: se usa en S28 (acercamiento al queso con costra). S02 quedó como tipografía cinética "Dulce · Salado · Ácido" sobre tres tarjetas.
- S17 usa el final del smash (la costra) en cámara lenta; S24, el aplaste. El inicio de C5 alterna dos tomas y no se usa.
- S12 (C1) va con zoom para dejar fuera el logo de la olla, igual que en el short. S13 (N08) va recortado arriba: asoma una mano.
- C4 y C6 traen música en el audio y N07/N08 vienen mudos: no aportan sonido.
