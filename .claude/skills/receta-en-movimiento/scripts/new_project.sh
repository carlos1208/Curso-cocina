#!/usr/bin/env bash
# Scaffolds a recipe-video project: copies the engine, renderer, audio and fonts into <dir>.
#   bash new_project.sh <dir> [--example]   (--example also copies the mujaddara recipe.json as a starting point)
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:?usage: new_project.sh <dir> [--example]}"
mkdir -p "$DIR/img" "$DIR/clips_raw"
cp -r "$SKILL/assets/video/." "$DIR/"
if [ "${2:-}" = "--example" ] && [ ! -e "$DIR/recipe.json" ]; then cp "$SKILL/assets/example/recipe.json" "$DIR/"; fi
printf 'frames/\nstills/\nclips/\nclips_raw/\n*.mp4\n!*_web.mp4\nweb/clips/\n' > "$DIR/.gitignore"
echo "project ready in $DIR — put photos in $DIR/img, clips in $DIR/clips_raw, then write $DIR/recipe.json"
