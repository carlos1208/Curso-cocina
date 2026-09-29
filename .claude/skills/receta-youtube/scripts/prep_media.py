#!/usr/bin/env python3
"""Extracts every frame (native size, JPEG q2) and the audio of each clip listed in guion.json "media".
The engine blends neighbouring frames, so slowed clips stay smooth. Stills are used straight from their path.
    python3 prep_media.py [guion.json]      → frames/<ID>/f0000.jpg …, frames/<ID>.wav, frames/index.json
Env: FFMPEG. Re-running skips clips that are already extracted.
"""
import json
import os
import re
import subprocess
import sys

G = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'guion.json', encoding='utf-8'))
FF = os.environ.get('FFMPEG', 'ffmpeg')
os.makedirs('frames', exist_ok=True)
idx_path = 'frames/index.json'
index = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
missing = []
for key, m in G['media'].items():
    if 'clip' not in m:
        if not os.path.exists(m['img']):
            missing.append(m['img'])
        continue
    src = m['clip']
    if not os.path.exists(src):
        missing.append(src); continue
    out = f'frames/{key}'
    if key in index and os.path.isdir(out) and len(os.listdir(out)) == index[key]['frames']:
        continue
    os.makedirs(out, exist_ok=True)
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', src, '-q:v', '2', '-start_number', '0', f'{out}/f%04d.jpg'], check=True)
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', src, '-vn', '-ac', '2', '-ar', '44100', f'frames/{key}.wav'])
    info = subprocess.run([FF, '-hide_banner', '-i', src], capture_output=True, text=True).stderr   # exits 1 by design
    fps = float((re.search(r'([\d.]+) fps', info) or [0, 24])[1])
    size = (re.search(r'(\d{3,4})x(\d{3,4})', info) or [0, '?', '?'])
    index[key] = {'frames': len(os.listdir(out)), 'fps': fps, 'size': f'{size[1]}x{size[2]}'}
    print(f'{key:<5} {index[key]["frames"]:4d} frames @ {fps:g} fps  {index[key]["size"]}')
json.dump(index, open(idx_path, 'w'), indent=1)
if missing:
    sys.exit('missing media (download them or fix the paths in guion.json): ' + ', '.join(missing))
print(f'{len(index)} clips ready in frames/')
