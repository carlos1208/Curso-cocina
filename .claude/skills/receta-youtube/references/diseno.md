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

## Short vertical (1080×1920)

**Objetivo:** alcance. Instagram, TikTok y Shorts empujan lo que retiene y lo que la gente guarda o comparte. Un Short que solo "promete" retiene menos y lleva poca gente al largo. Por eso el Short por defecto es **autónomo**: enseña la receta resumida y deja los porqués y los trucos para el largo.

- **Estructura del autónomo (30–45 s, voz propia):**
  1. **0–2 s, el plato terminado y el título** (el gancho: la recompensa primero).
  2. **Ingredientes rápidos:** `list` con cantidades, uno por frase.
  3. **3–5 pasos clave** con los gráficos del largo (`timer`, `heat`, `measure`, `stack`…).
  4. **Recompensa**, el plato de nuevo.
  5. **Llamada:** "Guárdala / Receta con trucos / en el canal ▶", dicha por la voz.
  6. **Bucle:** el último medio segundo vuelve al primer cuadro, sin fundidos. El video se repite sin corte y la gente lo mira dos veces.
- **Recorte (sin voz propia, ≤ 30 s):** gancho del largo, uno o dos momentos de impacto, plato final y tarjeta "Receta completa en el canal". Cortes en las pausas reales (`voice_check.py --phrases`), frases completas.
- **Sonido:** con voz, música y efectos, pero legible en silencio gracias a los subtítulos quemados. `export.py` deja también la versión **sin música** (voz y cocina) para poner un audio en tendencia dentro de la app, bajito bajo la voz.
- **Pantalla completa:** el material es vertical, así que el plato se ve más grande que en el largo.
- **Subtítulos:** grandes, palabra por palabra (Grotesk 80 px, contorno oscuro, la palabra que suena en azafrán), centrados en x = 480, y = 1360.
- **Zona segura (Shorts, Reels, TikTok):** todo el texto en x 60–900 y por encima de y ≈ 1500. Abajo va el título/canal y a la derecha los botones.
- **Portada:** el título del gancho va dentro del recorte 3:4 central (y ≈ 240–1680), que es lo que muestra la cuadrícula del perfil de Instagram (`hook.vertical.title_y` ≥ 430). `export.py` saca la portada en `short.cover_t`.
- **Arriba:** barras de progreso por tramo (estilo historias) y el rótulo del tramo.
- **Transiciones:** entre tramos, destello + punch-in (0,35 s). En el gancho, pines con etiqueta sobre cada capa del plato mientras se nombra, o tres palabras (`words`) en cortes rápidos.
- **Callouts:** los del largo, al 120 %, arriba (el plato va al centro).
- **Al publicarlo:**
  - en Instagram y TikTok, texto con "guárdala" y "receta con trucos en YouTube (link en la bio)";
  - en YouTube Shorts, el largo como "Video relacionado".

## Miniatura (1280×720)

Plato grande en una tarjeta ladeada a la izquierda, sobre su versión desenfocada. A la derecha, el título en dos niveles (Grotesk mayúsculas + Fraunces cursiva en azafrán) y hasta tres etiquetas de sabor de colores. Debe leerse a 200 px de ancho.

## Tipografía y color

- **Tipografías:** Fraunces (titulares, cifras), Space Grotesk (texto, subtítulos) y JetBrains Mono (rótulos en mayúsculas espaciadas). Van en `fonts/` porque en el render no hay Google Fonts.
- **Colores base:** azafrán `#F2B544`, crema `#F6EFE3`, oscuro `#140E09`, brasa `#E0782F`.
