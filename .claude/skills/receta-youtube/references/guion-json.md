# `guion.json`: la capa de diseño de cada receta

El archivo que escribes para cada video. La hoja de tomas pone los tiempos y `guion.json` pone todo lo demás. El ejemplo completo y real está en `assets/example/guion.json` (hamburguesa costeña: 29 tomas, 39 callouts, gancho, cierre, miniatura y Short).

**Tiempos.** En cualquier campo de tiempo puedes escribir `"@S07"` (inicio de la toma S07) o `"@S07$"` (su fin), además de segundos. Si el usuario mueve un corte en la hoja, todo lo atado a esa toma se mueve con él. Para lo que depende de una palabra de la voz (un ingrediente que aparece cuando se nombra), usa segundos sacados de `voice_check.py --phrases` o del subtítulo.

## Campos generales

| Campo | Uso |
|---|---|
| `slug` | Nombre base de los archivos (`hamburguesa_costena_youtube.mp4`) |
| `title` | Nombre de la receta |
| `tag` | Rótulo pequeño: `"CURSO DE COCINA  ·  RECETA 02"` |
| `sheet`, `voice` | `hoja_tomas.xlsx`, `voz.mp3` |
| `music` | `latino` (clave, mayor), `levante` (maqsum + laúd en hijaz) o `calido` (lo-fi suave) |
| `duration_limits` | `[150, 240]`: `build_timeline.py` avisa si el largo sale de 2,5–4 min |
| `palette` | Opcional; cambia `saffron`, `cream`, `dark`, `ember` |
| `media` | `{"C1": {"clip": "raw/C1.mp4", "audio": false}, "N01": {"img": "raw/N01.jpg"}}`. `audio: false` para clips con música, voz o silencio |
| `chapters` | Capítulos de cocina (ver abajo) |
| `shots` | Una entrada por toma de la hoja |
| `callouts`, `pins` | Gráficos de la columna y marcas sobre la foto |
| `subtitles` | `[[t0, t1, "texto con **resaltado**"], …]`, con los tiempos de la hoja "Subtítulos" y el texto corregido |
| `hook`, `end`, `thumb`, `short` | Gancho, pantalla final, miniatura y Short |

## `chapters`

```json
{"start": "S07", "id": "hogao", "title": "Hogao caramelizado", "h1": "Hogao", "h2": "caramelizado", "color": "#D9573B", "mark": "HOGAO"}
```

- **Posición:** el gancho va implícito antes del primer capítulo, y la pantalla final después del último, desde `end.start`. La tarjeta alterna de lado sola (derecha, izquierda…).
- **Textos:** `h1`/`h2` son las dos líneas del titular (la segunda en cursiva y en `color`). `mark` es la palabra gigante con contorno del fondo.
- **Paleta usada:** base `#F2B544`, hogao/tomate `#D9573B`, verde/lácteos `#A9C44E`, carne `#DB8B78`, fritura/plancha `#E0782F`, armado `#E9A23B`. Un color por capítulo, pensado para el ingrediente protagonista.

## `shots`

```json
"S12": {"src": "C1", "a": 0, "b": 3.5, "z": [2.3, 2.3], "f": [[0.5, 0.535], [0.5, 0.535]]}
```

- `src` (obligatorio). `a`/`b`: segundos del clip que se reparten a lo largo de la toma. Si el tramo es más corto que la toma hay cámara lenta; el motor mezcla fotogramas vecinos para que se vea suave.
- `z`: zoom inicial y final (1 = cubre la tarjeta). `f`: punto de la imagen (0..1) que queda centrado, al inicio y al final. Con eso se recorta un panel de una pantalla dividida (`z: 2`, `f: [.25, .6]`) o se saca un logo del cuadro.
- `tr`: se decide solo (`chapter` al abrir capítulo, `zoom` si repite la misma foto, `push` el resto). Fuérzalo con `"tr": "zoom"` para un acercamiento dentro del mismo clip.
- `shimmer: [x0, y0, x1, y1]`: ondas de calor sobre esa zona (una plancha muy caliente).

## `callouts` (columna de datos)

Todos llevan `kind` y `t`. Por defecto se quedan hasta el fin de su toma; `"until": "S12"` los alarga hasta el fin de otra toma. Los que comparten final se apilan en orden de aparición.

| `kind` | Campos | Para qué |
|---|---|---|
| `board` | `groups: [[id, "La base"], …]`, `items: [{g, t, v, unit, label}]` | Tablero de ingredientes que se llena cuando la voz nombra cada uno. Úsalo con `pins` |
| `list` | `rows: [[600, "g", "carne", t], ["½", "cdta", "ajo", t]]` | Lista de cantidades con contador |
| `timer` | `value`, `unit`, `label`, opcionales `approx` (≈25), `cold` (nevera), `sides: 2` ("2 lados"), `plus: 1` ("2 + 1 min") | Tiempos de cocción |
| `heat` | `level` 1–4, `label` | Fuego bajo, medio o muy alto |
| `gauge` | `stops: [["@S07", "Transparente"], …]`, `colors`, `at: [t0, t1]` | Escala de punto que avanza durante todo un capítulo (va fija abajo) |
| `tip` | `icon` (`x`, `check`, `drop`, `spark`, `hand`, `press`, `bread`, `fire`), `text` | La regla o el consejo del paso ("Que no se dore") |
| `chips` | `items: [["+ 300 g de tomate", t], …]` | Lo que se agrega junto |
| `note` | `text` | Una línea de apoyo (no repitas el subtítulo) |
| `big` | `text` (admite `\n`) | Una frase grande de remate ("En un smash,\nse nota.") |
| `balls` | `n`, `each` | Porcionar (4 × 150 g) |
| `measure` | `text` | Aplastar a un grosor ("1 cm") |
| `stack` | `layers: [[nombre, color, t], …]` | La receta armándose capa por capa cuando la voz la nombra. Formas especiales: `salsa…`, `carne`, `queso…`, `plátano…`, `hogao`; la primera capa es la base. Tapa automática al final |
| `trace` | `shot`, `path: [[x, y], …]` | Flecha dibujada sobre la tarjeta (el surco que no se cierra) |

## `pins`

`{"shot": "S03", "t": 13.9, "xy": [0.5, 0.29], "n": 1}`: punto numerado sobre la imagen de esa toma, en coordenadas 0..1 de la imagen, no de la tarjeta. Para encontrarlas, dibuja una cuadrícula sobre la foto con ffmpeg `drawgrid` y léela.

## `hook` (los primeros 10–13 s)

```json
"hook": {
  "title": ["Hamburguesa", "costeña"],
  "cards": [{"before": {"src": "N15", "a": 0, "rate": 0.6, "z": 1.04, "f": [0.5, 0.52]}},
            {"before": {"src": "C6", "a": 0, "rate": 0.89, "z": 1.02, "f": [0.5, 0.5]}, "after": {"src": "C3", "a": 2.2, "rate": 1, "z": 2.0, "f": [0.75, 0.6]}}],
  "rows": [["hogao caramelizado", 3.3, "#D9573B", 0]],
  "beat": 9.0,
  "words": [["Dulce", 9.1, "#F2B544", "plátano + hogao"]],
  "tagline": ["EN CADA MORDISCO", 11.2],
  "sizzle": "C3",
  "vertical": {"cuts": [[0, "C6", 0, 0.89, [1.16, 1.04], [0.44, 0.5]], [9.0, "N15", 2.0, 1, [1.12, 1.08], [0.5, 0.5]]],
               "pins": [["hogao caramelizado", 3.4, [0.36, 0.43], "#D9573B"]]}
}
```

- **Largo:** de 1 a 3 tarjetas repartidas a la derecha, con el título a la izquierda. `rows` aparecen con la voz y levantan la tarjeta `cardIdx`. En `beat` las tarjetas con `after` se voltean y aparecen `words` (tres palabras que venden el plato); `tagline` cierra. Todo es opcional salvo `title` y `cards`.
- **Short** (`vertical`): `cuts` son los cortes a pantalla completa, `[t, src, a, rate, [z0, z1], [fx, fy]]`. `pins` son etiquetas sobre las capas del plato mientras la voz las nombra.
- `sizzle`: clip cuyo sonido va bajo la música del gancho.

## `end` (pantalla final del largo)

`{"start": "S29", "title": "¡Buen provecho!", "next": "PRÓXIMO VIDEO", "bubble": ["¿Otra versión?", "Cuéntamelo en", "los comentarios"]}`. Deja el recuadro para el elemento de video de YouTube (x 760–1400, y 506–866) y la píldora de suscripción, que se "pulsa" y suena.

## `thumb`

`{"img": "raw/N16.jpg", "crop": [x, y, ancho], "title": ["Hamburguesa", "costeña"], "tags": [["hogao", "#D9573B", "#F6EFE3"], …]}`. Usa la foto más nítida del plato terminado (mejor una imagen que un fotograma de un clip de 360 px). Hasta tres etiquetas de sabor, legibles a tamaño de celular.

## `short` (el gancho vertical)

`{"edl": [{"from": 0, "to": 11.95, "title": "…"}, {"from": 124.5, "to": 129.5, "title": "Smash"}], "end_card": ["Receta completa", "en el canal  ▶"], "end_dur": 1.1, "max": 30}`. Los rangos son segundos del largo, cortados en pausas de la voz. El primero empieza en 0 (el gancho). Criterios en `diseno.md`.
