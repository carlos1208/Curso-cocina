#!/usr/bin/env bash
# Scaffolds a long-video project: engine, renderer, audio, thumbnail and fonts, plus a .gitignore that keeps heavy files out.
#   bash new_project.sh <folder> [--example]    (--example copies the hamburguesa costeña guion.json as a reference)
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:?usage: new_project.sh <folder> [--example]}"
mkdir -p "$DIR/raw"
cp -r "$SKILL/assets/engine/." "$DIR/"
rm -rf "$DIR/__pycache__"
if [ "${2:-}" = "--example" ] && [ ! -e "$DIR/guion.json" ]; then cp "$SKILL/assets/example/guion.json" "$DIR/"; fi
cat > "$DIR/.gitignore" <<'IGN'
# heavy or rebuildable: clips are in Drive, frames/segments/wavs are regenerated
frames/
segments/
segments_short/
stills/
stills_short/
raw/*.mp4
*.wav
video_sin_audio.mp4
short_sin_audio.mp4
*_master.mp4
short_master*.mp4
preview_*.mp4
*.log
# deliverables stay versioned even if a parent folder ignores *.mp4 (export.py keeps them under 100 MB)
!*_youtube.mp4
!*_revision.mp4
!*_short.mp4
IGN
echo "project ready in $DIR — put the sheet (hoja_tomas.xlsx), the narration (voz.mp3) and media (raw/<ID>.mp4|jpg) there, then write guion.json"
