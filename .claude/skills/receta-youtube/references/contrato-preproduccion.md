# Contrato con la skill de preproducción

La preproducción (otra skill, en otro chat) escribe los guiones, la hoja de tomas y los prompts. `receta-youtube` monta los videos. Este es el paquete que la primera debe entregar para que la segunda funcione sin retoques. Si llega distinto, adáptalo y avísale al usuario qué cambiar en su skill.

## Paquete por receta (carpeta de Drive con el nombre de la receta)

| Archivo | Contenido |
|---|---|
| `receta.md` | La receta canónica: porciones, ingredientes con cantidades, pasos, tiempos, fuego, notas. Es la fuente de verdad de los números de los callouts. |
| `guion_largo.md` | Narración del video largo, 2,5–4 min (350–600 palabras), por capítulos |
| `guion_short.md` | Narración del Short autónomo, 30–45 s (80–110 palabras) |
| `voz.mp3`, `voz_short.mp3` | Los audios de ElevenLabs, solo audio (MP3, 2–3 MB). Nunca el video exportado |
| `hoja_tomas.xlsx` | Hojas `Tomas`, `Subtítulos`, `Short`, `Subtítulos Short`, `Por generar` (columnas abajo) |
| `N01.jpg`, `N04.mp4`, `HERO.jpg`… | Imágenes y clips con **su ID como nombre de archivo**, 9:16, ≤ 5 MB cada uno |

## Guion del largo

- **Estructura:**
  1. **Gancho** (≤ 12 s): qué es y por qué es distinto, con tres palabras que lo vendan.
  2. **Ingredientes** con cantidades.
  3. **Un capítulo por preparación** (3–6 capítulos), con el tiempo, el fuego y un consejo por paso.
  4. **Armado o servicio.**
  5. **Cierre** (suscribirse y comentar).
- Frases cortas, con una pausa entre ideas: cada pausa es un corte posible.
- Los números como se dicen ("seiscientos gramos"); los subtítulos se reescriben con cifras en `receta-youtube`.

## Guion del Short autónomo (funciona solo en Reels, TikTok y Shorts)

1. **0–2 s, gancho:** una frase que prometa el resultado mientras se ve el plato terminado ("La hamburguesa más costeña que vas a probar").
2. **Ingredientes rápidos:** los 4–6 principales, con cantidad.
3. **Pasos clave:** 3–5, uno por frase.
4. **Recompensa:** el plato terminado.
5. **Llamada:** "Guárdala, y los trucos están en el canal". El Short da la receta; el largo da los porqués y los trucos.

El Short debe terminar sobre el mismo plano con el que empieza, para que el video se repita sin corte (bucle).

## `hoja_tomas.xlsx`

**Tomas** (video largo) y **Short** (video corto), una fila por toma:

| Columna | Ejemplo | Nota |
|---|---|---|
| `#` | S01…S29 en Tomas; V01…V09 en Short | Obligatoria |
| `Inicio (s)` | 34.3 | Obligatoria. Cada toma empieza cuando arranca su subtítulo (una pausa real de la voz) |
| `Fin (s)` | 43.5 | Obligatoria. Sin huecos: el fin de una es el inicio de la siguiente, y la última termina con la voz |
| `Dur. (s)` | 9.2 | |
| `Sección` | Hogao | El capítulo. En el Short: Gancho / Ingredientes / <paso> / Cierre |
| `Narración` | "Calienta una cucharada de aceite…" | El texto que suena en la toma |
| `Origen` | Reutilizar / Nueva animada / Nueva fija | |
| `Clip / imagen` | N04 | El ID del material |
| `Tramo a usar` | Primeros 6,4 s / Clip completo | |
| `Ajuste en el editor` | Zoom 120 % | |
| `Nota` | Texto: 3 min · fuego medio-bajo | **Los datos para los gráficos animados**: cantidades, tiempos, fuego, consejos |

- **Subtítulos** y **Subtítulos Short:** `Inicio (s)`, `Fin (s)`, `Texto`, con los tiempos de ElevenLabs. El texto puede venir en mayúsculas; se corrige al montar.
- **Por generar:** `ID`, `Tipo` (Nueva animada / Nueva fija), `Se usa en` (S07, S08, V05…), `Escena`, `Prompt de imagen`, `Prompt de animación`, `Imagen` (Pendiente / Lista), `Clip` (Pendiente / Listo / No aplica).

**Duraciones:** el largo entre 150 y 240 s; el Short entre 30 y 45 s.

## Prompts de imagen y animación

- **9:16 vertical** siempre. Todo el sistema está pensado para material vertical: la tarjeta del largo y la pantalla completa del Short.
- **Bloque base al final de cada prompt de imagen:**
  > Same kitchen set: dark wood countertop, white matte tile wall, cast-iron dutch oven and wooden utensils as recurring props, warm lateral light 3500K, soft shadows, shallow depth of field, 9:16 vertical, photorealistic food photography, no hands, no people, no text, no logos, no brand names on cookware or jars.
- **Prompt de animación:** "Subtle cinematic motion from the still image. Camera: <locked-off with a very slow push-in of about 5% | slow 15-degree orbit>. <una acción física concreta>. Warm light stays constant. Natural food physics, no cuts, no hands, no text, no people."
- **Una acción visible por clip:** chorrea, se aplasta, burbujea, se derrite, se voltea. Esos son los momentos que retienen en el Short.
- **`HERO`:** una **imagen fija en alta resolución del plato terminado**, en el ángulo más apetitoso. Sirve para el gancho, la portada del Short, la miniatura de YouTube y el cierre en bucle.
- **Mise en place:** una imagen cenital con todos los ingredientes separados y reconocibles, para marcar cada uno con pines.
- **Fijas o animadas:** las tomas de menos de 3 s pueden ser fijas (el montaje les da movimiento). Un mismo ID puede servir al largo y al Short.

## Nombres y entrega

- IDs: `N01…` nuevos, `C1…` reutilizados de un short anterior, `HERO` para el plato final.
- Un archivo por ID. Si se rehace una imagen, se reemplaza el archivo en vez de subir otro con el mismo nombre.
- Nada de más de 5 MB en Drive: el conector de descarga se corta.
