# Mujaddara: explainer en motion graphics

Animación vertical (9:16) de 30 s que explica la receta completa de la mujaddara, dibujada en canvas y sin fotos.
Es un único archivo, [`index.html`](index.html), con las fuentes embebidas. No depende de ningún framework ni de la red.

**Ver:** abre `index.html` en un navegador moderno.

| Tiempo | Escena |
|---|---|
| 0–3 s | Título y olla vacía. Datos: 4 porciones, 1 h, 9 ingredientes |
| 3–7,2 s | **Paso 1.** Lentejas + agua, hervir 10 min a fuego alto, colar y reservar |
| 7,2–13 s | **Paso 2.** Aceite, cortar la cebolla en juliana, caramelizar 25 min a fuego medio y reservar la mitad |
| 13–17,2 s | **Paso 3.** Arroz, comino y sal. Se reincorporan las lentejas y se añade el agua |
| 17,2–21 s | **Paso 4.** Tapar y cocer 20 min a fuego bajo. Se destapa cuando el agua se ha absorbido |
| 21–24 s | **Paso 5.** Reposar 5 min y esponjar con tenedor |
| 24–28 s | **Paso 6.** Emplatar, coronar con la cebolla crujiente, perejil y yogur |
| 28–30 s | Plato terminado con el nombre de la receta |

## Receta (versión clásica levantina, 4 porciones)

| Ingrediente | Cantidad |
|---|---|
| Lentejas pardas o verdes | 1 taza (200 g) |
| Agua para precocer | 1 litro |
| Aceite de oliva virgen extra | ½ taza (120 ml) |
| Cebolla, en juliana | 3 grandes |
| Arroz de grano largo, lavado | 1 taza (200 g) |
| Comino molido | 1 cdta |
| Sal fina | 1½ cdtas |
| Agua para el arroz | 2½ tazas (600 ml) |
| Perejil fresco picado | 2 cdas |
| Yogur, para acompañar | al gusto |

## Controles

- **Tocar o hacer clic:** pausa y continúa. Al final, vuelve a empezar.
- **Arrastrar sobre la línea de tiempo:** salta a cualquier momento.
- **Teclado:** `Espacio` pausa, `←` `→` mueven ±1 s y `R` reinicia.

## Parámetros de URL

- `?lang=en`: textos en inglés.
- `?t=12.5`: congela ese instante (útil para capturas).
- `?loop=1`: reproduce en bucle.

## Exportar a video

Cada frame es una función pura del tiempo, así que el resultado es determinista. `window.renderFrame(t)` dibuja el instante `t` en el canvas de 1080×1920. Para exportar, recorre `t = i / 30` con `i` de 0 a 900 en Chromium headless, captura el `<canvas>` y codifica con ffmpeg (igual que `../mujaddara/render.cjs`).
