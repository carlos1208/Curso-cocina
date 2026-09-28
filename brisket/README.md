# Brisket ahumado: animación de receta

Explicación animada de 30 s en vertical (1080×1920, 9:16) para Reels, TikTok y Shorts. Muestra el brisket ahumado clásico de Texas, sazonado solo con sal y pimienta y ahumado con leña de roble.

**Ver:** abre [`brisket_ahumado.html`](brisket_ahumado.html) en cualquier navegador moderno. Es un solo archivo: el código y las fuentes van incluidos, así que no necesita conexión ni servidor. También está [`brisket_web.mp4`](brisket_web.mp4), el video ya renderizado (sin sonido).

## La receta

| Ingrediente | Cantidad |
|---|---|
| Brisket entero (*packer*: punta + plano) | 6 kg |
| Sal kosher | ½ taza (unos 70 g) |
| Pimienta negra molida gruesa | ½ taza (unos 55 g) |
| Leña de roble | 4 troncos |
| Vinagre de manzana + agua (para rociar) | 125 + 125 ml |
| Papel de carnicero sin encerar | 1 m |
| Pepinillos · cebolla blanca · pan blanco | 8 rodajas · ½ pieza · 4 rebanadas |

Pasos: recortar la grasa a 6 mm, sazonar, ahumar a 120 °C con la grasa arriba durante unas 6 h (hasta 74 °C internos, rociando cuando la corteza se seque), envolver en papel, seguir ahumando unas 5 h más hasta 95 °C internos, reposar 1 h y rebanar en contra de la fibra en tajadas de 6 mm. En total son unas 12 h.

## Guion

| Tiempo | Escena |
|---|---|
| 0–3 s | Tabla vacía, título y datos clave (12 h · 120 °C · 10–12 porciones) |
| 3–11,8 s | El brisket entra en la tabla; recortar la grasa, sal, pimienta |
| 11,8–22,6 s | Ahumador: fogón de roble, corteza que se oscurece, rociado, envoltura en papel, sonda a 95 °C |
| 22,6–28 s | Reposo; se desenvuelve, se rebana en contra de la fibra y se sirve con la guarnición |
| 28–30 s | Plato terminado y el nombre de la receta |

Cada ingrediente muestra su **nombre y cantidad** justo cuando entra en escena. Durante la cocción, unos indicadores muestran la temperatura del ahumador, la temperatura interna (°C y °F) y el tiempo transcurrido. Abajo, una línea de tiempo marca los 30 s por fases.

## Controles

- Clic o toque en la imagen, o la barra espaciadora: pausa / reproducir.
- Clic o arrastre sobre la línea de tiempo: saltar a un momento.
- `←` / `→`: ±1 s · `R`: reiniciar.
- `?t=12.5`: abre congelado en ese segundo · `?loop`: reproduce en bucle.

## Archivos

- `brisket.js` + `index.html` + `fonts/`: el código fuente. Cada frame depende solo del tiempo `t` y todas las texturas (carne, corteza, madera, papel, humo) se generan con ruido de semilla fija, así que la animación es determinista.
- `build.cjs`: incrusta el JS y las fuentes en `brisket_ahumado.html`.
- `render.cjs`: renderiza los 900 frames en Chromium headless y los codifica con ffmpeg.

## Regenerar

```bash
node build.cjs
pip install imageio-ffmpeg
NODE_PATH=$(npm root -g) FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") node render.cjs
```

`node render.cjs --stills 3,12.5,29` guarda capturas sueltas en `stills/`.
