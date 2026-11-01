#!/usr/bin/env bash
# Prepares video clips for the engine. For every clips_raw/<name>.mp4 (or .mov/.webm):
#   clips/<name>/f0000.jpg …  every frame at 1080x1920 (cover-cropped, lanczos + light sharpen)
#   clips/<name>.wav          its audio (44.1 kHz stereo), used by audio.py when the clip has sound
#   clips/index.json          {name: {frames, fps}} — the engine only uses clips listed here
# Run from the project folder (the one with recipe.json). FFMPEG=/path/to/ffmpeg to override.
set -euo pipefail
FF=${FFMPEG:-ffmpeg}
mkdir -p clips
echo "{" > clips/index.json.tmp
first=1
for f in clips_raw/*.mp4 clips_raw/*.mov clips_raw/*.MOV clips_raw/*.webm; do
  [ -e "$f" ] || continue
  n=$(basename "${f%.*}"); mkdir -p "clips/$n"
  info=$("$FF" -hide_banner -i "$f" 2>&1 || true)          # ffmpeg -i without output always exits 1
  fps=$(grep -oE '[0-9.]+ fps' <<<"$info" | head -1 | cut -d' ' -f1 || true)
  "$FF" -y -loglevel error -i "$f" -vf "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,unsharp=5:5:0.4" -q:v 3 -start_number 0 "clips/$n/f%04d.jpg"
  if grep -q "Audio:" <<<"$info"; then "$FF" -y -loglevel error -i "$f" -vn -ac 2 -ar 44100 "clips/$n.wav"; fi
  frames=$(ls "clips/$n" | wc -l)
  [ $first -eq 1 ] || echo "," >> clips/index.json.tmp; first=0
  printf '  "%s": {"frames": %d, "fps": %s}' "$n" "$frames" "${fps:-24}" >> clips/index.json.tmp
  echo "$n: $frames frames @ ${fps:-24} fps"
done
echo "" >> clips/index.json.tmp; echo "}" >> clips/index.json.tmp
mv clips/index.json.tmp clips/index.json
