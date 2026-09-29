#!/usr/bin/env bash
# Mix the soundtrack and put it on the rendered picture. Re-run after dropping the narration in as voz.mp3 / voz.wav:
# the picture does not need rendering again.
#   ./exportar.sh  →  hamburguesa_costena_youtube.mp4 (upload this) + hamburguesa_costena_youtube_720p.mp4 (light copy)
set -euo pipefail
FF=${FFMPEG:-ffmpeg}
export FFMPEG=$FF
python3 audio_yt.py
if ls voz.* >/dev/null 2>&1; then AUD=mezcla.wav; else AUD=musica_fx.wav; rm -f mezcla.wav; fi
echo "audio: $AUD"
# master (render as is, ~600 MB) → upload file at 12 Mbps → a 1080p under GitHub's 100 MB → a 720p review copy
"$FF" -y -loglevel error -i video_sin_audio.mp4 -i "$AUD" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart -shortest master_crf16.mp4
"$FF" -y -loglevel error -i master_crf16.mp4 -c:v libx264 -preset slow -b:v 12M -maxrate 16M -bufsize 24M -pix_fmt yuv420p \
  -profile:v high -g 60 -c:a copy -movflags +faststart hamburguesa_costena_youtube.mp4
X264=(-c:v libx264 -preset slower -tune film -b:v 4600k -maxrate 7M -bufsize 10M -pix_fmt yuv420p -g 60)
( cd "$(mktemp -d)" && "$FF" -y -loglevel error -i "$OLDPWD/master_crf16.mp4" "${X264[@]}" -pass 1 -an -f null /dev/null &&
  "$FF" -y -loglevel error -i "$OLDPWD/master_crf16.mp4" "${X264[@]}" -pass 2 -c:a aac -b:a 192k -movflags +faststart \
  "$OLDPWD/hamburguesa_costena_youtube_1080p.mp4" )
"$FF" -y -loglevel error -i master_crf16.mp4 -vf scale=1280:-2:flags=lanczos -c:v libx264 -preset slow -crf 25 \
  -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart hamburguesa_costena_youtube_720p.mp4
ls -la hamburguesa_costena_youtube*.mp4
