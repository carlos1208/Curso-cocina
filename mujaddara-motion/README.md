# Mujaddara: explainer en motion graphics

Animación vertical (9:16) de 40 s que explica la receta completa de la mujaddara, dibujada en canvas y sin fotos.
Es un único archivo, [`index.html`](index.html), con las fuentes embebidas. No depende de ningún framework ni de la red.

**Ver:** abre `index.html` en un navegador moderno.

**Lista de ingredientes como imagen:** [`ingredientes.png`](ingredientes.png) (1080×1920). Es la misma escena del video, sin la barra de tiempo, lista para publicar como historia o diapositiva.

| Tiempo | Escena |
|---|---|
| 0–3 s | Título y olla vacía. Datos: 4 porciones, 1 h, 9 ingredientes |
| 3–8 s | **Lista de ingredientes:** los 9 ingredientes con ilustración, cantidad y nota |
| 8–13 s | **Paso 1.** Lentejas + agua, hervir 10 min a fuego alto, colar y reservar |
| 13–19,5 s | **Paso 2.** Aceite, cortar la cebolla en juliana, caramelizar 25 min a fuego medio y reservar la mitad |
| 19,5–25 s | **Paso 3.** Arroz, comino y sal. Se reincorporan las lentejas y se añade el agua |
| 25–29,5 s | **Paso 4.** Tapar y cocer 20 min a fuego bajo. Se destapa cuando el agua se ha absorbido |
| 29,5–32,8 s | **Paso 5.** Reposar 5 min y esponjar con tenedor |
| 32,8–37,2 s | **Paso 6.** Emplatar, coronar con la cebolla crujiente, perejil y yogur |
| 37,2–40 s | Plato terminado con el nombre de la receta |

## Receta (versión clásica levantina, 4 porciones)

| Ingrediente | Cantidad |
|---|---|
| Lentejas pardas o verdes | 1 taza (200 g) |
| Agua | 1 litro para precocer + 2½ tazas (600 ml) para el arroz |
| Aceite de oliva virgen extra | ½ taza (120 ml) |
| Cebolla, en juliana | 3 grandes |
| Arroz de grano largo, lavado | 1 taza (200 g) |
| Comino molido | 1 cdta |
| Sal fina | 1½ cdtas |
| Perejil fresco picado | 2 cdas |
| Yogur, para acompañar | al gusto |

## Controles

- **Tocar o hacer clic:** pausa y continúa. Al final, vuelve a empezar.
- **Arrastrar sobre la línea de tiempo:** salta a cualquier momento.
- **Teclado:** `Espacio` pausa, `←` `→` mueven ±1 s y `R` reinicia.

## Parámetros de URL

- `?lang=en`: textos en inglés.
- `?t=12.5`: congela ese instante, en segundos del video (0–40). Útil para capturas.
- `?loop=1`: reproduce en bucle.

## Cómo está hecho

La cocina está escrita en "tiempo de receta" (0–30 s). La tabla `STORY` lo reparte en los 40 s del video: congela la receta durante la lista de ingredientes y da el tiempo extra a los pasos con más texto.
Para cambiar el ritmo basta con mover esos puntos.

## Exportar

Cada frame es una función pura del tiempo, así que el resultado es determinista.

- `window.renderFrame(T)` dibuja el segundo `T` en el canvas de 1080×1920.
- `window.renderFrame(T, true)` lo dibuja sin la línea de tiempo. Así se generó `ingredientes.png`, con `T = 6.5`.

Para un video, recorre `T = i / 30` con `i` de 0 a 1200 en Chromium headless, captura el `<canvas>` y codifica con ffmpeg (igual que `../mujaddara/render.cjs`).
