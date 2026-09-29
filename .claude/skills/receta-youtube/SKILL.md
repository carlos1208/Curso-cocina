---
name: receta-youtube
description: Produce el video largo de YouTube de una receta (16:9, 2,5–4 min) a partir de la narración de ElevenLabs, la hoja de tomas y clips/fotos verticales, con motion graphics editoriales (datos animados que siguen la voz, capítulos, subtítulos corregidos, música editada a los cortes, mezcla a −14 LUFS), y con el mismo material el Short vertical: autónomo (30–45 s, voz propia, receta resumida, cierre en bucle y versión sin música para Reels/TikTok/Shorts) o recortado del largo como gancho. Deja miniatura, portada, .srt y textos para publicar, con pesos entregables. Úsala siempre que se hable de video largo, YouTube, canal, narración o voz en off, ElevenLabs, hoja de tomas, capítulos, short o reel con voz, sacar el short del video, tráiler de una receta o contenido con narración para Instagram o TikTok, aunque no se nombre esta skill. Para un reel musical sin narración o la web interactiva del curso, usa receta-en-movimiento.
---

# Receta para YouTube: video largo primero, Short después

El **video largo** (2,5–4 min, 16:9) es la pieza principal. Se monta primero: define el material, los encuadres, los gráficos y el estilo. El **Short** (vertical) sale de ese trabajo ya hecho:

- **Autónomo** (lo recomendado, si el usuario grabó una voz para el Short): 30–45 s con la receta resumida que funciona sola en Reels, TikTok y Shorts. Busca que la guarden y la compartan, y deja los trucos y los porqués para el largo.
- **Recorte** (si no hay voz propia): ≤ 30 s cortados del largo como gancho: gancho + momento de impacto + plato final + "receta completa en el canal".

Todo es código y datos:

- **Datos:**
  - `hoja_tomas.xlsx`: los tiempos, cortados en las pausas de la voz.
  - `guion.json`: el diseño (qué muestra cada toma, callouts, subtítulos, gancho, cierre, Short).
- **Motor** (`assets/engine/`): `engine_yt.js` dibuja cada fotograma en Canvas a partir del tiempo; `render_yt.cjs` lo renderiza en Chromium con ffmpeg en paralelo; `audio_yt.py` hace música, sonido de cocina y mezcla con la voz.
- **Scripts** (`scripts/`): preparan, validan, recortan el Short y exportan con el peso justo.

El ejemplo real y aprobado es la hamburguesa costeña: `assets/example/guion.json` y su proyecto en `hamburguesa-costena/largo/` del repo.

## Sé claro sobre lo que esto es

- El realismo lo ponen los clips y fotos del usuario (generados con IA o grabados). La skill pone montaje, tipografía, datos animados, sonido y mezcla.
- Sin narración no hay video largo: si falta, ayuda a escribir el guion de voz primero (`references/material.md`).

## Preparar el entorno (una vez por sesión)

```bash
pip install numpy scipy openpyxl pyloudnorm imageio-ffmpeg
export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")   # o el ffmpeg del sistema
export NODE_PATH=$(npm root -g)          # render_yt.cjs usa el playwright global; Chromium ya está en /opt/pw-browsers
SK=<ruta de esta skill>
```

## Flujo

### 1. Material

Necesitas `voz.mp3` (y `voz_short.mp3` para el Short autónomo), solo audio de 2–3 MB; `hoja_tomas.xlsx` (hojas `Tomas`, `Subtítulos`, `Short`, `Subtítulos Short`, `Por generar`); y las fotos y clips nombrados por ID en una carpeta de Drive. Es el paquete que entrega la skill de preproducción del usuario (`references/contrato-preproduccion.md`). Cómo recibirlo sin que el conector se caiga: `references/material.md`. Resumen:

- **Descargas:** de a una o dos, con `drive_decode.py` después de cada tanda.
- **Carpetas:** paginan de 5 en 5.
- **Tamaño:** más de ~5 MB corta la sesión del conector; pide la narración como MP3, no el video exportado.

### 2. Proyecto y auditoría

```bash
bash $SK/scripts/new_project.sh <carpeta> [--example]   # motor + fuentes + .gitignore que deja fuera lo pesado
cd <carpeta>                                             # pon hoja_tomas.xlsx, voz.mp3 y raw/<ID>.mp4|jpg
python3 $SK/scripts/media_audit.py <scratch>/audit "raw/*.mp4" "raw/*.jpg"
```

Lee cada tira de la auditoría y compara el contenido con la descripción del ID en la hoja "Por generar". En la primera producción un archivo venía con el ID de otro. Anota también:

- logos, manos o texto en cuadro (se sacan con zoom o recorte en `shots`);
- pantallas divididas o parpadeos al inicio de un clip;
- clips con música o voz, o mudos (`audio: false`);
- lo que falte o haya llegado distinto: diséñalo con lo que hay y avisa.

### 3. `guion.json`: el diseño

Formato completo en `references/guion-json.md`; criterios visuales en `references/diseno.md`. Parte del ejemplo (`--example`) y reemplaza:

1. **`media`** con los IDs auditados, y **`chapters`** con las secciones de la hoja (un color por capítulo, pensado para el ingrediente).
2. **`shots`**: la columna "Clip / imagen" y "Tramo a usar" de la hoja → `src`, `a`/`b`, encuadre `z`/`f`.
3. **`callouts`** desde la columna "Nota" ("Texto: …") y la voz. Cada callout aporta un dato (cantidad, tiempo, fuego, consejo) y no repite el subtítulo. Usa `"@S07"`/`"@S07$"` para atarlo a una toma, o el segundo exacto de la palabra.
4. **`subtitles`**: los de la hoja "Subtítulos" reescritos con tildes, cifras y `**cantidades**` resaltadas. Corrige lo que la IA oyó mal y no dejes un número separado de su unidad.
5. **`hook`**, **`end`**, **`thumb`**, y **`short`** (este puede esperar al paso 7).

```bash
python3 $SK/scripts/prep_media.py          # fotogramas nativos de cada clip → frames/
python3 $SK/scripts/build_timeline.py      # → timeline.json + subtitulos.srt, con avisos de duración, huecos y tramos
python3 $SK/scripts/voice_check.py         # voz: duración, limpieza, sincronía con la hoja
node render_yt.cjs --stills 5,11,14,40,…   # fotogramas sueltos → stills/
```

Revisa hojas de contacto de los fotogramas (`$FFMPEG -pattern_type glob -i 'stills/*.png' -vf "scale=640:-1,tile=2x6:padding=4" …`) en estos momentos:

- el gancho y el volteo de tarjetas;
- una cortinilla a mitad de camino;
- cada capítulo cuando ya aparecieron todos sus callouts;
- el armado;
- la pantalla final.

Busca solapes en la columna, textos cortados, logos y encuadres que corten el plato. Corrige y repite solo esos fotogramas. Cada ronda encontró algo; no renderices todo sin este paso.

### 4. Render del largo

```bash
nohup node render_yt.cjs > render.log 2>&1 &    # ≈ 4,6× la duración (2:37 → 12 min); cada fotograma va por tubería a ffmpeg
```

Mientras renderiza, avanza con la miniatura (`node thumb.cjs` → `miniatura.png`), la descripción y el Short. Si cambias `timeline.json`, reinicia el render. Para detenerlo mata por PID: `pkill -f` mata también tu shell.

### 5. Audio

`audio_yt.py` (lo llama `export.py`) hace esto:

- **Música:** instrumentos sintetizados, con el tempo ajustado por capítulo para que cada cortinilla caiga en un compás.
- **Sonido de cocina:** el real de los clips.
- **Efectos:** los de los gráficos (barridos, clics, tic-tac, golpes de capa).
- **Mezcla:** la voz a −16 LUFS, la música 14 LU por debajo mientras se habla, y todo normalizado a −14 LUFS.

No puedes escuchar: mide y pide al usuario que revise la mezcla.

### 6. Exportar con el peso justo

```bash
python3 $SK/scripts/export.py long     # master local + <slug>_youtube.mp4 (≤ 95 MB) + <slug>_revision.mp4 (≤ 28 MB)
```

`export.py` calcula el bitrate a partir de la duración: el archivo de YouTube cabe en GitHub y la revisión y el Short se pueden enviar por el chat. Al final imprime una tabla con tamaño, vía de entrega y LUFS. El master (cientos de MB) nunca se entrega ni se versiona. Esto evita el error de la primera producción, un master de 598 MB que no cabía en ninguna vía.

### 7. El Short

**Autónomo** (`short.mode: "autonomo"`, recomendado). Lo que aporta el usuario:
- `voz_short.mp3`;
- la hoja `Short` en `hoja_tomas.xlsx` (filas V01…);
- los subtítulos del Short.

Configura `short` en `guion.json`: gancho vertical, capítulos, tomas V, callouts, llamada final y `loop`. Hay un ejemplo en `assets/example/short_autonomo.json` y los criterios están en `references/diseno.md`:

1. **Abre con el plato terminado** y el título, en el primer segundo.
2. **Ingredientes rápidos** (`list`) y los **pasos clave**, con los mismos gráficos del largo (`timer`, `measure`, `stack`…).
3. **Cierra** con "Guárdala / Receta con trucos / en el canal ▶" mientras la voz lo dice.
4. **Con `loop`**, el último medio segundo vuelve al primer cuadro: el video se repite sin corte.

**Recorte** (`short.edl`, si no hay voz propia): mira `voice_check.py --phrases` y elige, en segundos del largo:
1. del segundo 0 al fin del gancho;
2. uno o dos momentos de impacto, con su frase completa;
3. el plato terminado.

Total ≤ 30 s, con la tarjeta "Receta completa en el canal".

```bash
python3 $SK/scripts/build_short.py              # → timeline_short.json + voz_short.wav + subtitulos_short.srt (avisa si sale de 30–45 s)
TL=timeline_short.json node render_yt.cjs --stills 1.6,5,10,…   # revisa: zona segura, título dentro del recorte 3:4, subtítulos, bucle
TL=timeline_short.json node render_yt.cjs      # ≈ 2 min
python3 $SK/scripts/export.py short            # <slug>_short.mp4 + _short_sin_musica.mp4 (≤ 28 MB) + _short_portada.jpg
```

**Versión sin música:** lleva voz y sonido de cocina. Sirve para ponerle un audio en tendencia dentro de Instagram o TikTok, bajito bajo la voz. Esos audios no se pueden incluir en el archivo por licencia, pero ayudan al alcance.

**Portada:** el cuadro del gancho, con el título dentro del recorte 3:4 que muestra la cuadrícula del perfil de Instagram.

### 8. Entregar

- **Por el chat (SendUserFile):** `<slug>_revision.mp4`, `<slug>_short.mp4` y `<slug>_short_sin_musica.mp4` (render), además de `miniatura.png`, `<slug>_short_portada.jpg`, los `.srt` y la descripción (attach).
- **Por GitHub:** `<slug>_youtube.mp4`, el archivo para subir. Da el enlace de GitHub con "Download raw".
- **Descripción** (`descripcion_youtube.md`):
  - 2–3 títulos;
  - descripción con ingredientes;
  - capítulos (cada uno ≥ 10 s, el primero en 0:00; fusiona un cierre corto con el anterior);
  - etiquetas;
  - dónde poner los elementos de la pantalla final;
  - la sección del Short: texto para Instagram/TikTok con "guárdala" y el enlace o "link en la bio" al largo; en YouTube, "Video relacionado" → el largo.
- **Commit:** sin lo pesado (`.gitignore` de `new_project.sh`).

## Al terminar, cuéntale al usuario

- Qué hiciste con cada material que faltó o llegó distinto, y qué recortaste (logos, manos, pantallas divididas).
- Qué subtítulos corregiste y qué datos resolviste tú.
- Cómo quedó el Short (autónomo o recorte), su duración y por qué retiene en los primeros 2 s.
- Tamaños y dónde está cada archivo; que no pudiste escuchar la mezcla (revisar voz/música y los empalmes del Short).
- Frases de la narración que parezcan incompletas.

## Problemas conocidos

`references/lecciones.md`: pesos y vías de entrega, Drive, formatos de la IA, subtítulos, voz, render y publicación. Léelo antes de la primera producción y cuando algo falle.

El paquete que se espera de la preproducción: `references/contrato-preproduccion.md`. Si llega distinto, adáptalo y dile al usuario qué ajustar en esa skill.
