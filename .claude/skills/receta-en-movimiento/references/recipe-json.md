# Formato de `recipe.json`

Un solo archivo alimenta el video (`engine.js`), la música (`audio.py`) y la web (`build_web.py`). El ejemplo completo y real está en `assets/example/recipe.json` (mujaddara, 12 escenas, 30 s).

## Campos generales

| Campo | Uso | Ejemplo |
|---|---|---|
| `title` | Nombre en mayúsculas para el video (portada, cierre, barra de progreso) | `"MUJADDARA"` |
| `webTitle` | Nombre para la web | `"Mujaddara"` |
| `subtitle` | Bajada de la portada del video | `"arroz con lentejas y cebolla crujiente"` |
| `lede` | Párrafo de la portada web | |
| `tag` | Rótulo sobre el título (video) | `"CURSO DE COCINA  ·  RECETA 01"` |
| `eyebrow` | Rótulo sobre el título (web) | `"Receta 01 · Cocina levantina"` |
| `course` | Nombre del curso (barra y pie de la web) | `"Curso de Cocina"` |
| `closing` | Frase del cierre | `"Buen provecho."` |
| `stats` | Línea de datos del cierre | `"≈ 40 MIN  ·  8 PASOS  ·  9 INGREDIENTES"` |
| `ingredientsNote` | Línea bajo la lista de ingredientes del video | `"≈ 40 MIN  ·  1 CAZUELA"` |
| `facts` | Datos de la portada web, pares `[etiqueta, valor]` | `[["Tiempo","≈ 40 min"], …]` |
| `bpm` | Tempo. Cada escena dura 240/bpm s (96 → 2,5 s) | `96` |
| `music` | `levante` \| `latino` \| `calido` | `"levante"` |
| `heroImage` | Foto del plato terminado (portada web, fondo de ingredientes, póster) | `"img/10.jpg"` |
| `palette` | Opcional; cambia los colores del video | `{"saffron":"#E9A23B","cream":"#F6EFE3","dark":"#140E09"}` |
| `cookIntro` | Opcional; párrafo de la sección "Cocina con el scroll" | |
| `servings` | Opcional; cambia el ×1/×2/×3 de la web por un selector de unidades sobre el rendimiento base. Úsalo cuando la receta rinde piezas contables (hamburguesas, galletas, porciones) | `{"base":4,"options":[1,2,4,6,8],"unit":"hamburguesa\|hamburguesas"}` |
| `webFit` | Opcional; encuadre de los clips en la web. `1` (por defecto) muestra el cuadro vertical completo sobre un fondo desenfocado; `0` llena el escenario y recorta arriba y abajo | `1` |
| `ingredients` | Lista (ver abajo) | |
| `scenes` | Lista de escenas en orden; define el video completo | |

## Ingredientes

```json
{ "qty": "2½ tazas", "name": "agua", "note": "Para cocer el arroz", "q": 2.5, "unit": "taza|tazas" }
```

- `qty` + `name` es lo que se ve. `note` solo aparece en la web. `nameOne` es el nombre en singular ("pan brioche") que la web muestra cuando el selector deja la cantidad en 1 o menos.
- `q`, `q2` (rango) y `unit` (`singular|plural`) permiten el multiplicador de la web. Con `g` o `ml` la cantidad escalada se redondea a enteros (de 5 en 5 por encima de 20); el resto usa fracciones ¼ ½ ¾. Sin `q` la cantidad queda fija ("al gusto"). Para unidades sin nombre usa `"unit": "|"`.
- En el video conviene no pasar de 10 a 12 ingredientes, porque las filas se achican.

## Escenas

`kind`: `intro`, `ingredients`, `step` o `final`. Cada escena dura un compás. Las transiciones son automáticas (dissolve, zoom, whip); puedes forzar una con `"transition": "zoom" | "whipL" | "whipUp" | "dissolve" | "flash"` (usa `flash` para un salto de tiempo).

### Campos de un `step`

| Campo | Qué hace |
|---|---|
| `n` | Número de paso. Repetir `n` en la escena siguiente crea una segunda toma del mismo paso (en la web se convierte en la "revelación" a mitad del scroll). |
| `title` | Título en el video (unos 22 caracteres como máximo). `webTitle` lo reemplaza en la web. |
| `kicker` | Rótulo corto sobre el título en la web ("Precocción", "Mientras tanto"). |
| `lines` | 1 o 2 líneas de detalle en el video (unos 38 caracteres cada una). |
| `chips` | En lugar de `lines`: pastillas que aparecen al ritmo (lo que se agrega junto). |
| `timer` | Minutos. Muestra un temporizador que corre (video) o se llena con el scroll (web). Añade tic-tac. |
| `gauge` | Escala de color de "punto justo": `{"label":"CAFÉ OSCURO","names":["Dorado","Ámbar","Café oscuro"],"colors":["#F3E6BD","#DDAA5E","#9A5A22","#4A2710"]}`. En la web además oscurece la imagen con el scroll. |
| `body` | Texto completo del paso para la web (redacción de la receta original). |
| `note` | Consejo destacado en la web. |
| `tags` | Etiquetas en la web ("Fuego alto", "10 min"). |
| `adds` | Lista que se marca sola con el scroll en la web ("agrega a la cazuela: …"). |
| `img` | Foto del paso (respaldo si no hay clip). |
| `mv` | Movimiento de cámara sobre la foto: `{"z":[zoomIni,zoomFin], "f":[[fxIni,fyIni],[fxFin,fyFin]], "r":[gradosIni,gradosFin]}`. `f` es el punto de la imagen (0..1) que queda centrado. |
| `steam` | Emisores de vapor procedural sobre la foto: `[{"x0":.2,"x1":.8,"y":.45,"n":16,"rise":150,"size":280,"alpha":.2}]` (coordenadas 0..1 de la imagen, donde nace el vapor). |
| `glints` | Destellos de aceite o agua: `{"x0":.1,"x1":.9,"y0":.45,"y1":.7,"n":90,"a":.9,"size":30}`. |
| `grow` | `"steam"` o `"glints"`: en la web se intensifican con el scroll. |
| `sfx` | Sonidos sintetizados si la escena no tiene clip con audio: `bubbles`, `bubbles_soft`, `simmer`, `pour`, `rattle`, `sizzle`, `sizzle_strong`, `crackle`, `clink`, `rustle`. |
| `clip` | Video del paso (ver abajo). Si existe y está preparado, reemplaza la foto y desactiva `steam`/`glints` (el clip ya trae vapor real; `"keepFx": true` los conserva). |
| `clipMv` | Movimiento de cámara cuando se usa el clip (por defecto un zoom leve de 1.03 a 1.09). Úsalo para dejar un logo fuera de cuadro. |
| `webFrame` | `{"z":[…],"f":[[…],[…]], "fit":0}` para reencuadrar el clip en el escenario de la web. Evítalo para esconder un logo: cierra mucho el plano (usa `web.blur`). |

### `clip`

```json
"clip": { "name": "02_colar", "in": 0.9, "audio": true, "web": { "scrub": [0.4, 5.8] } }
```

- `name`: nombre del archivo en `clips_raw/` sin extensión.
- `in`: segundo del clip donde empieza la escena. La escena usa `240/bpm` segundos a partir de ahí, más unos 0,35 s antes y después para las transiciones.
- `audio`: `false` si el clip trae música o voz (lo dice `media_audit.py`).
- `web.scrub [a,b]`: el scroll mueve el clip entre esos segundos. `web.loop [a,b]`: loop de ida y vuelta de ese tramo. Sin `web`, la web usa la foto.
- `web.blur [[x,y,w,h], …]`: zonas (0..1 del cuadro) que se desenfocan con borde suave en el clip de la web, para tapar un logo sin cerrar el plano. Verifica con un recorte ampliado que no se lea, y aplica lo mismo a la foto `img` de ese paso (se ve mientras carga el clip).

### `intro` y `final`

Usan `img`, `mv`, `steam`, `clip`, `clipMv` igual que un paso. El título, la bajada, el cierre y las cifras salen de los campos generales. En el `final`, sube el plato en cuadro (`fy` alto, por ejemplo `.6`) para que el título no lo tape.
