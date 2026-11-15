#!/usr/bin/env python3
"""Clips → frames/<KEY>/f0000.jpg … at their native fps, frames/<KEY>.wav (44.1 kHz stereo) and frames/index.json.
engine_yt.js reads the frames; audio_yt.py reads the wavs for the kitchen sound.
    python3 tools/prep_media.py [guion.json]
"""
import json, os, re, subprocess, sys

FF = os.environ.get('FFMPEG', 'ffmpeg')
G = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'guion.json', encoding='utf-8'))
os.makedirs('frames', exist_ok=True)
idx = json.load(open('frames/index.json')) if os.path.exists('frames/index.json') else {}
for key, m in G['media'].items():
    if 'clip' not in m:
        continue
    src, d = m['clip'], os.path.join('frames', key)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate',
                            '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip()
    a, b = probe.split('/')
    fps = float(a) / float(b)
    if not (os.path.isdir(d) and key in idx and idx[key].get('src_mtime') == os.path.getmtime(src)):
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            os.remove(os.path.join(d, f))
        # 2x Lanczos upscale of the 360x640 Flow exports keeps the card sharp enough at 1080p
        scale = m.get('scale', 2)
        subprocess.run([FF, '-y', '-loglevel', 'error', '-i', src, '-vf', f'scale=iw*{scale}:ih*{scale}:flags=lanczos',
                        '-q:v', '3', '-start_number', '0', os.path.join(d, 'f%04d.jpg')], check=True)
        subprocess.run([FF, '-y', '-loglevel', 'error', '-i', src, '-vn', '-ac', '2', '-ar', '44100',
                        os.path.join('frames', f'{key}.wav')], check=False)
    n = len([f for f in os.listdir(d) if f.endswith('.jpg')])
    idx[key] = {'frames': n, 'fps': fps, 'src_mtime': os.path.getmtime(src)}
    print(f'{key}: {n} frames @ {fps:g} fps')
json.dump(idx, open('frames/index.json', 'w'), indent=1)
