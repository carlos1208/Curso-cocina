#!/usr/bin/env bash
# The vertical Short cut from the long video: re-time (build_short.py), mix, and join audio and picture.
#   python3 build_short.py && TL=timeline_short.json node render_yt.cjs && ./exportar_short.sh
#   → hamburguesa_costena_short.mp4 (1080x1920, 30 fps, ≈ 7 Mb/s, -14 LUFS)
set -euo pipefail
FF=${FFMPEG:-ffmpeg}
export FFMPEG=$FF
TL=timeline_short.json VOICE=voz_short.wav OUT=short_ python3 audio_yt.py
X264=(-c:v libx264 -preset slower -tune film -b:v 7M -maxrate 10M -bufsize 14M -pix_fmt yuv420p -g 60)
( cd "$(mktemp -d)" && "$FF" -y -loglevel error -i "$OLDPWD/short_sin_audio.mp4" "${X264[@]}" -pass 1 -an -f null /dev/null &&
  "$FF" -y -loglevel error -i "$OLDPWD/short_sin_audio.mp4" -i "$OLDPWD/short_mezcla.wav" -map 0:v -map 1:a "${X264[@]}" -pass 2 \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OLDPWD/hamburguesa_costena_short.mp4" )
ls -la hamburguesa_costena_short.mp4
