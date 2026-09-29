# Sistema de diseño

## Video largo 16:9 (1920×1080)

El material es vertical, así que el formato es editorial. Una **tarjeta** 9:16 (506×900, esquinas de 26 px, sombra) muestra la toma. Detrás va la misma toma **desenfocada y oscurecida**, cubriendo el cuadro. Del otro lado, una **columna** de 880 px lleva:

- arriba, el rótulo del curso y una barra de progreso por capítulo;
- el titular del capítulo en dos líneas (Fraunces 96 px, la segunda en cursiva y en el color del capítulo);
- los callouts, desde y = 470;
- abajo, los subtítulos (Space Grotesk 38 px, máx. 2 líneas, cantidades resaltadas en azafrán, barra del color del capítulo).

- **Ritmo:** la tarjeta **cambia de lado en cada capítulo**. Cada capítulo abre con una **cortinilla de dos capas** (color del capítulo + oscuro con número y título) de ~1,4 s, que cae en un compás de la música. Dentro del capítulo, las tomas **empujan** hacia arriba dentro de la tarjeta; si se repite la misma foto, **zoom**.
- **Motion blur real** (sub-fotogramas) solo donde hay movimiento rápido: cortes, cortinillas, reparto de tarjetas. El resto va a 1 muestra por fotograma, por velocidad.
- **Acabado:** corrección cálida (soft-light), viñeta y grano leve.
- **Gancho (0–~12 s):** título grande a la izquierda y tarjetas repartidas a la derecha. Los ingredientes estrella aparecen con la voz y levantan su tarjeta. Luego las tarjetas se voltean y entran tres palabras que venden el plato.
- **Pantalla final:** la tarjeta se desliza a la izquierda. A la derecha van "¡Buen provecho!", la píldora de suscripción (se pulsa y la campana suena), el recuadro del próximo video y la burbuja de comentarios.

### Qué callout para qué frase de la voz

| La voz dice… | Callout |
|---|---|
| Ingredientes con cantidades | `board` + `pins` sobre la foto de mise en place |
| "X minutos" | `timer` (con `sides` si es por lado, `plus` si es "2 y 1 más", `cold` si es nevera) |
| "A fuego bajo / muy caliente" | `heat` |
| Una regla ("que no se dore", "sin apretar") | `tip` con `x` / `check` / `hand`… |
| "Agrega X e Y" | `chips` |
| Un punto de cocción que evoluciona | `gauge` para todo el capítulo |
| El armado | `stack`, capa por capa cuando se nombra |
| Una frase para recordar | `big` |

No más de 2–3 callouts vivos a la vez. Revisa alturas en la hoja de contactos.

## Short vertical (1080×1920): gancho del video largo

**Objetivo:** que la gente vaya al video largo. El Short **no enseña la receta**: sin lista de cantidades ni todos los pasos. Da ganas y promete.

- **Estructura recomendada (20–30 s):**
  1. **El gancho del largo** (0–~12 s): ya está diseñado como gancho.
  2. **Uno o dos momentos de mayor impacto visual**, con su frase: lo que chisporrotea, se aplasta, chorrea o se derrite.
  3. **El plato terminado** (la recompensa).
  4. **Tarjeta final** "Receta completa / en el canal ▶" (~1 s).
- **Cortes:** en las pausas reales (`voice_check.py --phrases`), frases completas. Nunca cortes una palabra.
- **Recomendación para el guion de voz:** grabar en ElevenLabs una frase extra para el Short ("La receta completa está en mi canal") y usarla al cierre en vez de la tarjeta muda.
- **Pantalla completa:** el material es vertical, así que el plato se ve más grande que en el largo.
- **Subtítulos:** grandes, palabra por palabra (Grotesk 80 px, contorno oscuro, la palabra que suena en azafrán), centrados en x = 480, y = 1360.
- **Zona segura de Shorts:** todo el texto en x 60–900 y por encima de y ≈ 1500. Abajo va el título/canal y a la derecha los botones.
- **Arriba:** barras de progreso por tramo (estilo historias) y el rótulo del tramo.
- **Transiciones:** entre tramos, destello + punch-in (0,35 s). En el gancho vertical, pines con etiqueta sobre cada capa del plato mientras se nombra.
- **Callouts:** los del largo, al 120 %, arriba (el plato va al centro).
- **Al publicarlo:** pon el largo como "Video relacionado"; aparece como botón sobre el Short.

## Miniatura (1280×720)

Plato grande en una tarjeta ladeada a la izquierda, sobre su versión desenfocada. A la derecha, el título en dos niveles (Grotesk mayúsculas + Fraunces cursiva en azafrán) y hasta tres etiquetas de sabor de colores. Debe leerse a 200 px de ancho.

## Tipografía y color

- **Tipografías:** Fraunces (titulares, cifras), Space Grotesk (texto, subtítulos) y JetBrains Mono (rótulos en mayúsculas espaciadas). Van en `fonts/` porque en el render no hay Google Fonts.
- **Colores base:** azafrán `#F2B544`, crema `#F6EFE3`, oscuro `#140E09`, brasa `#E0782F`.
