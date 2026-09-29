# Lecciones de la primera producción (hamburguesa costeña)

Cada punto costó tiempo o una vuelta. Léelos antes de empezar y cuando algo falle.

## Entrega y peso de archivos (el error más caro)

- El master a CRF 16 con grano pesó **598 MB** para 2:37 (30 Mb/s). No cabía en ninguna vía de entrega.
- Límites reales:

  | Vía | Límite |
  |---|---|
  | Enviar archivo en el chat (SendUserFile) | 30 MiB |
  | GitHub | 100 MB por archivo (avisa desde 50 MB, pero acepta) |
  | Subir a Drive con el conector | No sirve: el archivo va en base64 dentro de la llamada |
  | Descargar de Drive con el conector | Más de ~5 MB cierra la sesión ("session expired") |

- `export.py` resuelve esto: calcula el bitrate a partir de la duración para que el archivo de YouTube quede en ≤ 95 MB, la copia de revisión en ≤ 28 MB y el Short en ≤ 28 MB. El master queda local y nunca se versiona.
- El grano sintético se come el bitrate. Por debajo de ~4 Mb/s, `export.py` aplica un denoise suave antes de codificar. Con 4,6 Mb/s en dos pasadas, un recorte a tamaño real no mostró diferencia contra el master.
- Si una carpeta padre ignora `*.mp4`, el `.gitignore` del proyecto necesita las excepciones (`!*_youtube.mp4`, etc.). `new_project.sh` ya las pone.

## Material desde Drive

- **Narración:** pide solo el audio exportado de ElevenLabs en MP3 (2–3 MB). El video exportado (8 MB) nunca bajó.
- **Carpetas:** paginan de 5 en 5 aunque pidas más. Sigue `nextPageToken` hasta que no venga.
- **Descargas en paralelo:** si terminan en el mismo segundo, pueden guardarse con el mismo nombre en `tool-results/` y pisarse. Decodifica con `drive_decode.py` justo después de cada tanda y verifica que estén todos.
- **Nombres:** comprueba cada archivo contra la descripción de su ID en la hoja, no solo contra el nombre. Pasó que `N08.mp4` era el N07 (el surco) y otro `N08.mp4` era el N08 real. Mira la tira de `media_audit.py`.
- **Contenido distinto al pedido:** una foto puede llegar distinta (N16 debía ser la hamburguesa cortada y llegó entera). Adapta el diseño, úsala donde sirva y díselo al usuario.
- **Duplicados:** mismo tamaño = mismo archivo (`drive_decode.py` los descarta por md5).
- **Formato:** Flow entrega **9:16 aunque el prompt pida 16:9**. Escribe los prompts en vertical desde el principio. El formato editorial del largo y el Short a pantalla completa están pensados para material vertical.
- **Defectos de la IA:** los clips pueden empezar con segundos de pantalla dividida o parpadeo (C5), traer logos (LE CREUSET grabado en la olla) o manos al borde (N08). Revisa la tira a 1 fps y, en los primeros 2 s, a 4–8 fps.

## Voz y subtítulos

- La hoja de subtítulos de ElevenLabs viene en mayúsculas, sin tildes y con errores de reconocimiento ("HOGAOO", "OGAU", "CAS!", "Si" por "Sí"). Reescríbelos en `guion.json`: tildes, cifras ("600 g", "½ cucharadita"), `**resaltado**` en cantidades.
- Un número no debe quedar al final de un subtítulo con su unidad en el siguiente ("…80/20, 4" / "panes brioche…"). Mueve el corte.
- `voice_check.py` confirma la voz. En la primera producción salió limpia (−89 dB en las pausas) y la voz arrancaba ~80 ms antes que los subtítulos, que es aceptable.
- Mezcla: la voz a −16 LUFS y la música 14 LU por debajo mientras se habla (sube ~7 dB en las pausas). Sin esa relación fija, la música en las pausas quedó tan fuerte como la voz.

## Diseño

- Un callout aporta un dato (cantidad, tiempo, fuego, consejo). No repite el subtítulo: "El suero costeño ya es salado" como nota era redundante.
- Si tres callouts se apilan en una misma toma, revisa que no pisen el medidor ni los subtítulos. Hubo un temporizador encima del medidor del hogao.
- Viudas en textos grandes ("En un smash, se / nota."): corta a mano con `\n`.
- Logos:
  - En el video, recorta con zoom.
  - En la web, desenfoca con máscara de borde suave.
  - La máscara de lavfi en gris es de rango limitado (blanco = 235) y deja ver ~8 % del logo: estírala con `lut`.

## Render y herramientas

- `pkill -f render_yt` mata también la shell que lo ejecuta, porque el patrón aparece en su línea de comandos. Mata por PID leyendo `/proc/<pid>/cmdline`.
- Cada página del render carga la línea de tiempo al empezar. Si cambias `timeline.json` a mitad del render, reinícialo.
- Tiempos de render con 4 procesos: 2:37 → ~12 min (≈ 4,6× el tiempo real); Short de 30 s → ~1,5 min. Mientras renderiza, avanza con audio, miniatura y textos.
- `ffmpeg -i archivo` sin salida siempre termina con código 1: no lo encadenes con `set -o pipefail`.
- Antes de renderizar todo, revisa hojas de contacto de fotogramas sueltos (`render_yt.cjs --stills`). Cada ronda de fotogramas encontró algo.

## Publicación

- Cada capítulo de la descripción de YouTube debe durar ≥ 10 s y el primero va en 0:00. El cierre de 6,7 s se fusionó con el capítulo anterior.
- Pantalla final (≥ 5 s): el motor deja un recuadro punteado "PRÓXIMO VIDEO" y la píldora de suscripción. Dile al usuario dónde colocar los elementos de YouTube.
