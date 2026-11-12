# Fable 5.2 visto por un analista de datos

Explainer de 97 s, 1920×1080 a 30 fps, hecho entero en código (canvas + música sintetizada), igual que `reel/`.

**Ver:** [`fable_analista.mp4`](fable_analista.mp4)

Responde dos preguntas: dónde mejoró Claude con Fable 5.2 desde el trabajo de un analista de datos, y qué hay que tener en cuenta en la era agéntica para transformar una empresa.

## Guion

| Tiempo | Escena | Mensaje en pantalla |
|---|---|---|
| 0:00 | Intro | Dónde mejoró Claude con Fable 5.2, visto por un analista de datos |
| 0:04 | 01 · Lectura de gráficos | Chartography: 44,8 % → 73,4 % (+28,6 puntos frente a Fable 5.1) |
| 0:11 | 02 · Método | Mide, prueba y verifica: corre ablaciones y comprueba que cada cambio funcionó |
| 0:18 | 03 · Honestidad | Sabe decir «no lo sé»: prefiere medir antes que dar un número inventado |
| 0:24 | 04 · SQL y datos | En una prueba de Oracle, otros dos modelos inflaron el total 5–8 veces; el más fuerte en data-eng-bench de Snowflake |
| 0:31 | 05 · Agentes | AutomationBench 31,4 % → 51,4 %; Remote Labor Index 17,9 % → 41,3 %; coordina cientos de subagentes |
| 0:38 | 06 · Costo y velocidad | $10 / $50 → $8 / $40 por millón de tokens (−20 %); hasta 30 % más rápido |
| 0:44 | Puente | Pero un modelo mejor no transforma la empresa solo |
| 0:49 | 1 · Datos listos para agentes | Capa semántica, métricas con una sola definición y catálogo al día |
| 0:56 | 2 · Evalúa antes de confiar | Casos con respuesta conocida, resultados reproducibles, revisión por muestreo |
| 1:02 | 3 · Permisos y gobierno | Mínimo privilegio, solo lectura por defecto, trazabilidad y aprobación humana |
| 1:09 | 4 · El modelo justo para cada tarea | Opus 5.5 para el día a día, Fable 5.2 para lo ambiguo y largo; costo por tarea terminada |
| 1:16 | 5 · Rediseña el proceso | Un flujo completo con un KPI de negocio y un responsable |
| 1:22 | 6 · Tu rol cambia | De escribir consultas a definir la pregunta, fijar el criterio de éxito y validar |
| 1:29 | Cierre | La ventaja ya no es tener el mejor modelo: es tener datos, procesos y criterio listos para usarlo |

## De dónde sale cada dato

Las cifras de la parte 1 son las que publicó Anthropic el 9 de noviembre de 2026. Son datos del fabricante y de sus clientes de prueba, no mediciones propias.

- [Página de Claude Fable 5.2](https://www.anthropic.com/claude/fable): precios, casos de uso, tabla de benchmarks y retención de datos.
- [Anuncio de Claude Fable 5.2 y Mythos 5.2](https://www.anthropic.com/claude-fable-and-mythos-5-2): velocidad, esfuerzo y costo, testimonios (Oracle, Snowflake, Cognition, Balyasny) y cuándo usar cada modelo.

Tres matices que el video muestra en letra pequeña:

- Los benchmarks comparan con Fable 5.1. En AutomationBench, Gemini 4 Carbon queda por encima (53,9 % frente a 51,4 %).
- La auditoría de comportamiento se hizo sobre Mythos 5.2, que es el mismo modelo sin algunas salvaguardas.
- Las tablas, el gráfico de iteraciones y la conversación de la escena 03 son ilustraciones; la conversación recrea un caso que describe Cognition.

La parte 2 son recomendaciones propias. Solo dos puntos se apoyan en la fuente: la retención de datos de 30 días por defecto y la recomendación de empezar por Opus 5.5 y subir a Fable para lo más difícil.

## Archivos

- `index.html` + `video.js`: la animación. Cada fotograma es una función pura del tiempo.
  - Vista previa con sonido: genera antes la música con `python3 audio.py`, luego `npx serve .` y abre `/index.html` (`?t=27.5` muestra un solo instante).
- `audio.py`: sintetiza `soundtrack.wav` a 108 BPM con numpy y scipy. Cada escena dura 12 tiempos, así que los cambios caen en el compás. El `.wav` no se versiona (17 MB); el script lo regenera idéntico.
- `render.cjs`: renderiza los 2.912 fotogramas en Chromium headless con 4 procesos y codifica con ffmpeg.
- `fonts/`: Fraunces, Space Grotesk y JetBrains Mono (SIL Open Font License).

## Reconstruir

```bash
pip install numpy scipy
python3 audio.py
NODE_PATH=$(npm root -g) node render.cjs
```

`node render.cjs --stills 6.7,27.5` guarda fotogramas sueltos en `stills/` y `--scenes` lista el inicio de cada escena.
