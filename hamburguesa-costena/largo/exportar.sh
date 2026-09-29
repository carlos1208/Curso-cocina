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
"$FF" -y -loglevel error -i video_sin_audio.mp4 -i "$AUD" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart -shortest hamburguesa_costena_youtube.mp4
"$FF" -y -loglevel error -i hamburguesa_costena_youtube.mp4 -vf scale=1280:-2:flags=lanczos -c:v libx264 -preset slow -crf 25 \
  -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart hamburguesa_costena_youtube_720p.mp4
ls -la hamburguesa_costena_youtube*.mp4
