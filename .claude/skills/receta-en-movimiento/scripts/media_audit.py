#!/usr/bin/env python3
"""Looks at the media before planning the video.

    FFMPEG=... python3 media_audit.py <out_dir> [img/*.jpg clips_raw/*.mp4 ...]

For every clip it prints duration, size, fps and an audio verdict, and writes <out_dir>/<name>.png:
a strip with one frame per second, to decide which step it shows and which seconds have the action.
For photos it writes one contact sheet (<out_dir>/photos.png). Read the PNGs with the Read tool.

Audio verdict (spectral flatness of the soundtrack):
  ambient  noise-like (sizzle, bubbles, pouring) -> good to mix under the music
  tonal    music or voice (AI clips often carry a music bed) -> mute it ("audio": false)
  silent   nothing usable
"""
import glob
import os
import re
import subprocess
import sys

import numpy as np

FF = os.environ.get('FFMPEG', 'ffmpeg')
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
files = [f for p in sys.argv[2:] for f in sorted(glob.glob(p))]
photos = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
clips = [f for f in files if f.lower().endswith(('.mp4', '.mov', '.webm'))]


def probe(f):
    info = subprocess.run([FF, '-hide_banner', '-i', f], capture_output=True, text=True).stderr
    dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', info)
    secs = int(dur[1]) * 3600 + int(dur[2]) * 60 + float(dur[3]) if dur else 0
    size = re.search(r'Video:.*?(\d{3,5})x(\d{3,5})', info)
    fps = re.search(r'([\d.]+) fps', info)
    return secs, (size[1] + 'x' + size[2]) if size else '?', fps[1] if fps else '?', 'Audio:' in info


def audio_verdict(f):
    raw = subprocess.run([FF, '-loglevel', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(float) / 32768
    if len(x) < 4096:
        return 'silent', -99, 0
    rms_db = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
    fl = []
    for i in range(0, len(x) - 2048, 2048):
        s = np.abs(np.fft.rfft(x[i:i + 2048] * np.hanning(2048))) + 1e-9
        fl.append(np.exp(np.mean(np.log(s))) / np.mean(s))
    flat = float(np.median(fl))
    if rms_db < -55:
        return 'silent', rms_db, flat
    return ('ambient' if flat > 0.45 else 'tonal'), rms_db, flat


for f in clips:
    secs, size, fps, has_audio = probe(f)
    name = os.path.splitext(os.path.basename(f))[0]
    n = max(1, int(secs))
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', f, '-vf', f'fps=1,scale=200:-1,tile={n}x1:padding=4', '-frames:v', '1',
                    os.path.join(out, f'{name}.png')])
    verdict = audio_verdict(f) if has_audio else ('none', -99, 0)
    print(f'{name:28s} {secs:5.1f}s {size:>9s} {fps:>5s}fps  audio: {verdict[0]:7s} (rms {verdict[1]:.0f} dB, flatness {verdict[2]:.2f})  strip: {out}/{name}.png (1 frame/s)')

if photos:
    cols = min(5, len(photos))
    rows = (len(photos) + cols - 1) // cols
    args = []
    for p in photos:
        args += ['-i', p]
    fc = ''.join(f'[{i}]scale=240:427:force_original_aspect_ratio=increase,crop=240:427[p{i}];' for i in range(len(photos)))
    layout = '|'.join(f'{(i % cols) * 244}_{(i // cols) * 431}' for i in range(len(photos)))
    fc += ''.join(f'[p{i}]' for i in range(len(photos))) + (f'xstack=inputs={len(photos)}:layout={layout}:fill=black' if len(photos) > 1 else 'null')
    subprocess.run([FF, '-y', '-loglevel', 'error', *args, '-filter_complex', fc, '-frames:v', '1', os.path.join(out, 'photos.png')])
    for i, p in enumerate(photos):
        print(f'photo {i + 1}: {p}')
    print(f'contact sheet: {out}/photos.png (numbered left to right, top to bottom)')
