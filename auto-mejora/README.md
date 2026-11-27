# Auto-mejora recursiva

Video explicativo de 3 min 15 s, 1920×1080 a 30 fps, en español, hecho por completo con código: sin plantillas ni editor de video.

**Ver:** [`auto-mejora-recursiva.mp4`](auto-mejora-recursiva.mp4)

| Tiempo | Capítulo | Qué cuenta |
|---|---|---|
| 0:00 | Intro | "¿Puede una IA mejorarse a sí misma?", tecleado sobre un túnel de cuadrados anidados |
| 0:10 | 01 · La idea | I. J. Good (1965) y la hipótesis de la "explosión de inteligencia": un bucle que gira cada vez más rápido |
| 0:25 | 02 · Desde el principio | Cómo se hace un modelo como Claude: datos, preentrenamiento, ajuste, evaluación. Los pesos no cambian mientras hablamos |
| 1:05 | 03 · El bucle real | El bucle no está dentro del modelo sino a su alrededor: código, retroalimentación, evaluaciones e investigación que ayudan a construir la siguiente generación, con personas en las puertas |
| 1:42 | 04 · Los frenos | Decisión humana, cómputo, tiempo y verificación. Teoría contra realidad |
| 2:07 | 05 · Por qué importa | Un error pequeño que se copia y crece. Por qué la seguridad tiene que avanzar al mismo ritmo |
| 2:35 | 06 · En resumen | Lo que el modelo no hace y lo que sí está pasando |
| 2:57 | Cierre | "Una IA que ayuda a construir la siguiente IA" |

## Archivos

- `index.html` + `video.js`: la animación en Canvas 2D. Cada fotograma es una función pura del tiempo. `video.js` también exporta los eventos de sonido, así que imagen y audio salen de la misma línea de tiempo.
  - Vista previa con sonido: sirve la carpeta (`npx serve .`) y abre `/index.html`; un clic reinicia con audio. `?t=42` muestra un solo fotograma.
- `audio.py`: sintetiza `soundtrack.wav` con numpy y scipy. Pad de sierras desafinadas, bajo, bombo, arpegios a 96 BPM en re menor, más teclas, golpes, clics y barridos colocados en el fotograma exacto que marca `events.json`.
- `render.cjs`: renderiza en Chromium headless con 4 workers. Cada uno pasa sus fotogramas por tubería a su propio ffmpeg, y los tramos se concatenan sin recodificar.
- `fonts/`: Space Grotesk, JetBrains Mono y Fraunces (SIL Open Font License).

## Reconstruir

```bash
pip install numpy scipy
export NODE_PATH=$(npm root -g)          # render.cjs usa el paquete playwright global
node render.cjs --events                 # events.json
python3 audio.py                         # soundtrack.wav
node render.cjs --stills 12,48,90        # fotogramas sueltos en stills/ para revisar
node render.cjs                          # auto-mejora-recursiva.mp4 (unos minutos)
```
