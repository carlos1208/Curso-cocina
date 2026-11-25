# Ejemplo: reel de tortilla de patatas con `video-director`

Ejemplo completo del pack **open-higgsfield-skills** (en `.claude/skills/`) aplicado al curso de cocina.
Es un reel vertical de 15 s en 4 planos, con narración en español, guitarra acústica, sonido de fritura y subtítulos incrustados.

| archivo | qué es |
|---|---|
| `tortilla-reel.manifest.json` | el "guion técnico": idea, guía de estilo, 4 planos con sus prompts, audio, límites de gasto |
| `dry-run.txt` | lo que haría el director, paso a paso (66 pasos), sin conectarse a nada |
| `qc-mujaddara.json` | resultado real de `shot-qc` sobre `mujaddara/mujaddara_web.mp4` (se puede usar ya, sin GPU) |

## Los 4 planos

| plano | tiempo | qué se ve | narración |
|---|---|---|---|
| s01 | 0-4 s | macro de patata y cebolla friendo en la sartén de hierro | "Patata, huevo y paciencia." |
| s02 | 4-8 s | se vierte el huevo, acercamiento lento de cámara | "Mezclamos y cuajamos a fuego lento." |
| s03 | 8-12 s | la vuelta de la tortilla con el plato | "El momento clave: darle la vuelta." |
| s04 | 12-15 s | tortilla servida, un trozo cortado, espacio para el título | "Tortilla de patatas. Aprende con nosotros." |

## Forma fácil: pedírselo a Claude

En una sesión de Claude Code en este repo:

> *Usa video-director con `ejemplo-video-director/tortilla-reel.manifest.json`. Tengo Google Colab.*

o empieza desde cero:

> *Usa video-director para hacer un reel de 15 s en 9:16 de una paella, para el curso de cocina.*

Claude te pregunta lo mínimo, te enseña la guía de estilo y la lista de planos para que los apruebes, y te dice cuánto va a costar antes de gastar.

## Forma manual: comandos

Desde la raíz del repo (`D=.claude/skills/video-director/scripts/direct.py`):

```bash
cd ejemplo-video-director
D=../.claude/skills/video-director/scripts/direct.py

# 1. Comprobar que el manifiesto está bien
python3 $D validate tortilla-reel.manifest.json

# 2. Ensayo: muestra todos los pasos y el coste estimado, sin conectarse a nada
python3 $D run tortilla-reel.manifest.json --dry-run
```

### 3a. Sin GPU: Google Colab (opción recomendada)

```bash
# Crea un notebook de Colab con todo lo necesario
python3 $D package --target google-colab tortilla-reel.manifest.json
```

- Genera `dist/tortilla-reel-google-colab/tortilla-reel.ipynb` y un zip `dist/tortilla-reel-google-colab-assets.zip` con tus archivos (la voz de referencia).
- Coste estimado: **unas 4,3 unidades de cómputo** (tier standard) o 1,5 (tier draft). La herramienta avisa de que son tarifas sin verificar.
- Abre el `.ipynb` en Colab y elige una GPU L4. Guarda tu token de Hugging Face en los *Secrets* de Colab como `HF_TOKEN`, sube el zip de assets y ejecuta las celdas.
- Al acabar, el notebook te deja un zip con las imágenes, los videos y el audio. Para montar el reel final aquí:
  ```bash
  python3 ../.claude/skills/google-colab-runner/scripts/colab.py ingest tortilla-reel.manifest.json resultados.zip
  ```

### 3b. Con GPU propia (16 GB o más) y ComfyUI

```bash
export COMFY_URL=http://127.0.0.1:8188
python3 ../.claude/skills/comfyui-preflight/scripts/preflight.py --url $COMFY_URL ...   # o pídeselo a Claude
python3 $D approve tortilla-reel.manifest.json bible    # apruebas la guía de estilo
python3 $D approve tortilla-reel.manifest.json plan     # apruebas los planos
python3 $D approve tortilla-reel.manifest.json spend    # apruebas el gasto
python3 $D run tortilla-reel.manifest.json --url $COMFY_URL
```

Si se corta, vuelve a lanzar el mismo `run`: retoma donde se quedó, porque todo se guarda en el manifiesto.

### Qué sale

En `tortilla-reel/` aparecen `stills/` (imágenes clave), `video/` (los 4 planos), `audio/` (voz, música y efectos), `tortilla-reel.srt`, el reel final `tortilla-reel.mp4` y `REPORT.md`, la autocrítica del director con puntuaciones y qué mejorar.

## Lo que ya puedes usar sin GPU

```bash
# Control de calidad de cualquier video: duración, formato, cortes, parpadeo, desenfoque...
python3 .claude/skills/shot-qc/scripts/shot_qc.py mujaddara/mujaddara_web.mp4 --json
```

Resultado real sobre tu reel de mujaddara: **95/100, aprobado**, 1080×1920, 30 s, con audio, sin congelados ni negros. Solo marca `clipping`: un 8 % de los píxeles están quemados, en blancos o en negros puros.

`film-assembly` y `subtitles-captions` (solo la parte de quemar los subtítulos) también funcionan solo con ffmpeg.

## Antes de usarlo de verdad

1. **Voz en español.** El director no pasa el idioma a la voz, y el workflow de voz viene en `"English (en)"`. Antes de generar, cambia `"language"` del nodo `1` en `.claude/skills/voiceover/workflows/voice_chatterbox_multilingual.api.json` (o en la copia dentro del bundle de Colab) a la etiqueta de español. Probablemente sea `"Spanish (es)"`, sin verificar: compruébalo en el desplegable del nodo de ComfyUI.
2. **Tu voz de referencia.** Graba 5-15 s limpios de tu voz y guárdalos como `ejemplo-video-director/voz-chef.mp3`. La narración imitará ese timbre.
3. **Un modelo sin URL.** `package` avisa de que no sabe de dónde descargar `t5-base.safetensors`. Si el notebook falla por ese archivo, descárgalo a mano de Hugging Face.
4. **Licencias.** `commercial_use` está en `true` porque el curso es un producto. Los videos usan LTX-2.5, con la *Lightricks LTX-2 Community License*, que no es una licencia open source estándar. Revísala antes de vender material generado.
5. **Proyecto en fase temprana.** El autor avisa de que la mayoría de los workflows no se han probado de principio a fin en una GPU. Espera tener que ajustar cosas en la primera ejecución.
