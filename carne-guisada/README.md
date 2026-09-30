# Carne guisada colombiana: web del curso

Receta 03 del Curso de Cocina. El video largo de YouTube y el Short están en [`largo/`](largo/); aquí está la web del curso, hecha con la skill `receta-en-movimiento` y el mismo material de Drive.

**Web:** `web/`, publicada como Artifact (privada hasta que la compartas): https://claude.ai/artifact/CoHxtqXin3QmvGXgJmWkc9

- **Portada:** el plato (HERO) con vapor que se sopla con el cursor; el clic remueve.
- **Ingredientes:** 19 ingredientes para marcar a medida que se preparan, con un selector de 2, 4, 6 u 8 porciones (la receta base rinde 4). Los gramos y mililitros se redondean y los nombres pasan a singular o plural.
- **Cocina con el scroll:** 8 pasos. El escenario muestra el cuadro vertical completo de cada clip; los temporizadores y la escala de color del hogao avanzan con el scroll, y las listas de "agrega" se marcan solas. En tres pasos, a mitad del scroll, un destello revela el momento siguiente.
- **Video:** el Short narrado de 43 s (`largo/carne_guisada_short.mp4`, recodificado a 720p).
- **Sonido:** el botón de la barra enciende la música de la receta (`latino`, 30 s en bucle) y el chisporroteo al hacer clic.

| Paso | Material | En la web |
|---|---|---|
| 01 Secar y sazonar la carne | foto N02 | temporizador 30 min |
| 02 Sellar en dos tandas | clip N03 (`02_sellar`) | loop 1,4–7,6 s · temporizador 6 min |
| 02 → "Ese fondo es sabor" | foto N04 | revelación |
| 03 Cebolla, ajo y pimentón | clip N05 (`03_sofrito`) | loop 5,0–8,0 s · temporizador 7 min |
| 04 Hogao sobre el fondo | clip N07 (`04_hogao`) | loop 3,0–8,0 s · escala Rojo vivo → Oscuro |
| 05 Desglasar con cerveza negra | clip N08 (`05_cerveza`) | la espuma baja con el scroll (0–6,5 s) · 3 min |
| 06 Caldo, panela y a guisar | clip N09 (`06_panela`) | loop 1–7 s · temporizador 90 min |
| 06 → "1 h 30, tapado" | clip N10 (`06b_tapado`) | revelación, con el scroll (0,5–7,5 s) |
| 07 Papa criolla, destapado | clip N11 (`07_papas`) | loop 0,5–7,5 s · temporizador 30 min |
| 07 → "30 minutos después" | foto N14 | revelación |
| 08 Servir | clip N13 (`08_servir`) | loop 0,5–7,5 s |
| 08 → "Se deshace sola" | clip N12 (`08b_cuchara`) | revelación: la cuchara abre la carne con el scroll (2,0–6,5 s) |

## Notas

- **Manos:** N03 trae una mano al borde entre 0,8 y 1,1 s y N05 una mano que remueve entre 2,9 y 4,9 s. Los tramos de la web las dejan fuera.
- **N09** (panela) trae zanahorias y papas que la receta no lleva en ese paso; en el video largo se disimulan con un acercamiento, pero la web muestra el cuadro completo.
- El tiempo total (≈ 2 h 50 min) sale de `receta.md`, donde está marcado como sugerido.
- En la prueba local se usaron los clips VP9 (el Chromium de prueba no reproduce H.264). Revisa la página en Safari o en el iPhone, que usan los H.264.
- `recipe.json` ya describe también el reel musical de 30 s (15 escenas a 120 BPM); no se renderizó porque la web usa el Short narrado.

## Regenerar

```bash
pip install numpy scipy imageio-ffmpeg
export FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") NODE_PATH=$(npm root -g)
# clips_raw/ no se versiona: son los clips de Drive con el nombre de su paso (02_sellar.mp4 = N03, etc., ver la tabla)
python3 audio.py
python3 ../.claude/skills/receta-en-movimiento/scripts/build_web.py --video largo/carne_guisada_short.mp4
# el reel de 30 s, si lo quieres: ./prep_clips.sh && NAME=carne_guisada node render.cjs
```
