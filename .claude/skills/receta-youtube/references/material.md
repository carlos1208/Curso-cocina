# Material: lo que prepara el usuario y cómo recibirlo

El flujo que funcionó: **receta → guion de voz → ElevenLabs → hoja de tomas → imágenes y clips (Flow) → Drive → Claude**. Si el usuario llega con menos, ayúdalo a completar el paso que falta antes de montar.

## 1. Guion de voz (2,5–4 min)

- **Extensión:** unas 350–600 palabras (~150 palabras por minuto).
- **Estructura:**
  1. **Gancho** (≤ 12 s): qué es y por qué es distinto.
  2. **Ingredientes** con cantidades.
  3. **Pasos por capítulos**, con el tiempo, el fuego y un consejo por paso.
  4. **Armado o servicio.**
  5. **Cierre y llamada** (suscribirse, comentar).
- Frases cortas y con pausas: cada pausa es un posible corte, tanto en el largo como en el Short.
- **Frase extra para el Short:** "La receta completa está en mi canal".
- **Exportar de ElevenLabs:**
  - el **audio en MP3** (2–3 MB) → `voz.mp3`;
  - los subtítulos (vienen sin tildes: se corrigen en `guion.json`).

  No hace falta el video exportado: pesa demasiado para el conector y no se usa.

## 2. Hoja de tomas (`hoja_tomas.xlsx`)

Tres hojas, como en `hamburguesa-costena/largo/hoja_tomas.xlsx`:

- **Tomas** (obligatoria). Columnas `#` (S01…), `Inicio (s)`, `Fin (s)`, `Dur. (s)`, `Sección`, `Narración`, `Origen` (Reutilizar / Nueva animada / Nueva fija), `Clip / imagen` (ID), `Tramo a usar`, `Ajuste en el editor`, `Estado` y `Nota` ("Texto: …" = los datos para los callouts).
  - Cada toma empieza cuando arranca su subtítulo, o sea en una pausa real.
  - Las tomas cubren la voz entera sin huecos.
  - `build_timeline.py` lee `#`, `Inicio` y `Fin` buscando las columnas por nombre.
- **Subtítulos:** inicio, fin y texto de ElevenLabs.
- **Por generar:** ID, en qué tomas se usa, prompt de imagen y prompt de animación.

Tomas de 2,5–9 s; una frase larga puede partirse en dos tomas del mismo clip (la segunda con zoom).

## 3. Imágenes y clips (Flow u otro generador)

- **9:16 vertical** desde el prompt: el generador lo entrega así de todos modos y los dos formatos están pensados para vertical.
- **Bloque base al final de cada prompt de imagen** (misma cocina en todas las tomas):
  > Same kitchen set: dark wood countertop, white matte tile wall, cast-iron dutch oven and wooden utensils as recurring props, warm lateral light 3500K, soft shadows, shallow depth of field, **9:16 vertical**, photorealistic food photography, no hands, no people, **no text, no logos, no brand names on cookware**.
- **Prompt de animación:** "Subtle cinematic motion from the still image. Camera: locked-off with a very slow push-in of about 5%. <acción>. Warm light stays constant. Natural food physics, no cuts, no hands, no text, no people."
- **Fijas o animadas:** las tomas cortas (< 3 s) o de mise en place pueden quedar como imagen fija; el motor les da movimiento de cámara. Ahorra créditos.
- **Clips del short anterior:** si hay un short previo de la misma receta (C1–C6), sus clips se reutilizan.

## 4. Drive

- Una carpeta por receta. **Cada archivo nombrado con su ID** (`N04.mp4`, `N10.jpg`, `C3.mp4`), sin versiones duplicadas.
- Archivos de **≤ 5 MB** (los clips de 8 s de Flow pesan 1–2 MB; las fotos, 0,1–0,3 MB). Nada más grande: el conector corta la sesión.
- Si una foto o clip se rehace, se borra el anterior para que no queden dos con el mismo nombre.

## 5. Recibir el material (Claude)

1. `search_files` de la carpeta (`title contains '<receta>' and mimeType = 'application/vnd.google-apps.folder'`), luego `parentId = '<id>'` y seguir `nextPageToken` hasta el final.
2. `download_file_content` de a uno o dos, y `python3 <skill>/scripts/drive_decode.py raw <rutas>` justo después (las descargas simultáneas pueden pisarse en `tool-results/`).
3. Renombra a `raw/<ID>.<ext>`. Si vienen clips de un short anterior, enlázalos como `raw/C1.mp4`…
4. `python3 <skill>/scripts/media_audit.py <scratch>/audit "raw/*.mp4" "raw/*.jpg"` y **mira cada tira**:
   - ¿el contenido corresponde a la descripción del ID en "Por generar"?
   - ¿es vertical?
   - ¿hay logos, manos, texto, o pantalla dividida al inicio?
   - ¿el audio es `ambient` (sirve), `tonal` (música → `audio: false`) o `silent`?
5. Lo que falte o haya llegado distinto: diséñalo con lo que hay (tipografía cinética, otro encuadre de un clip existente) y díselo al usuario.
