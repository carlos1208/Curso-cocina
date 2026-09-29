#!/usr/bin/env bash
# Extracts every frame of each clip at its native size (the engine blends neighbouring frames for slow motion)
# plus its audio, for the long YouTube cut. Clips from the short (C1–C6) come from ../clips_raw, new ones from raw/.
set -euo pipefail
FF=${FFMPEG:-ffmpeg}
declare -A SRC=([C1]=../clips_raw/01_hogao.mp4 [C2]=../clips_raw/02_suero.mp4 [C3]=../clips_raw/03_platano_queso.mp4
  [C4]=../clips_raw/04_bolas.mp4 [C5]=../clips_raw/05_smash.mp4 [C6]=../clips_raw/06_hamburguesa.mp4
  [N04]=raw/N04.mp4 [N05]=raw/N05.mp4 [N06]=raw/N06.mp4 [N07]=raw/N07.mp4 [N08]=raw/N08.mp4
  [N11]=raw/N11.mp4 [N14]=raw/N14.mp4 [N15]=raw/N15.mp4)
mkdir -p frames
echo "{" > frames/index.json.tmp; first=1
for k in $(printf '%s\n' "${!SRC[@]}" | sort); do
  f=${SRC[$k]}; mkdir -p "frames/$k"
  "$FF" -y -loglevel error -i "$f" -q:v 2 -start_number 0 "frames/$k/f%04d.jpg"
  "$FF" -y -loglevel error -i "$f" -vn -ac 2 -ar 44100 "frames/$k.wav" || true
  info=$("$FF" -hide_banner -i "$f" 2>&1 || true)
  fps=$(grep -oE '[0-9.]+ fps' <<<"$info" | head -1 | cut -d' ' -f1 || true)
  n=$(ls "frames/$k" | wc -l)
  [ $first -eq 1 ] || echo "," >> frames/index.json.tmp; first=0
  printf '  "%s": {"frames": %d, "fps": %s}' "$k" "$n" "${fps:-24}" >> frames/index.json.tmp
done
printf '\n}\n' >> frames/index.json.tmp; mv frames/index.json.tmp frames/index.json
cat frames/index.json
