#!/usr/bin/env bash
# Extracts every frame of clips_raw/*.mp4 into clips/<name>/f%03d.jpg (1080x1920, lanczos + light sharpen)
# and each clip's audio into clips/<name>.wav (44.1 kHz stereo) for audio.py.
set -euo pipefail
cd "$(dirname "$0")"
FF=${FFMPEG:-ffmpeg}
for f in clips_raw/*.mp4; do
  n=$(basename "$f" .mp4); mkdir -p "clips/$n"
  "$FF" -y -loglevel error -i "$f" -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.4" -q:v 3 -start_number 0 "clips/$n/f%03d.jpg"
  "$FF" -y -loglevel error -i "$f" -vn -ac 2 -ar 44100 "clips/$n.wav"
  echo "$n: $(ls clips/$n | wc -l) frames"
done
