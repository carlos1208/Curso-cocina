#!/usr/bin/env python3
"""Checks the narration before mixing, and lists its phrases for cutting the Short.

- duration vs the sheet (they must match within ~0.3 s)
- is it clean? level in the pauses (music baked into the export shows up as a high floor)
- sync: speech onsets vs subtitle starts (a constant offset means the export was trimmed)
- --phrases: every phrase with its start/end (cut the Short at these pauses) and the subtitle text it carries
    python3 voice_check.py [--phrases]            (reads guion.json → voice, timeline.json → cues)
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

G = json.load(open('guion.json', encoding='utf-8'))
TL = json.load(open('timeline.json', encoding='utf-8'))
FF = os.environ.get('FFMPEG', 'ffmpeg')
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', G.get('voice', 'voz.mp3'), '-ac', '1', '-ar', '16000', '_vc.wav'], check=True)
with wave.open('_vc.wav') as w:
    sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
os.remove('_vc.wav')
hop = int(0.01 * sr)
db = 20 * np.log10(np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)]) + 1e-9)
dur = len(x) / sr
speech = np.percentile(db, 90)
print(f'voice: {dur:.2f} s (timeline {TL["duration"]:.2f} s){"  ! lengths differ" if abs(dur - TL["duration"]) > 0.3 else ""}')

cues = TL['cues']
gaps = [db[int((b + .1) * 100):int((c - .1) * 100)].mean() for (_, b, *_), (c, *_) in zip(cues, cues[1:]) if c - b > 0.4]
floor = float(np.mean(gaps)) if gaps else float('nan')
print(f'pauses: {floor:.1f} dB (speech {speech:.1f} dB)' + ('  ! something plays under the pauses: music in the export?' if floor > speech - 35 else '  clean'))

thr = speech - 25
offs = []
for c in cues:
    i0 = int(c[0] * 100); win = db[max(0, i0 - 50):i0 + 50]
    on = np.argmax(win > thr) if (win > thr).any() else 50
    offs.append((max(0, i0 - 50) + on) / 100 - c[0])
offs = np.array(offs)
print(f'sync: speech starts {np.median(offs):+.2f} s from the subtitles (min {offs.min():+.2f}, max {offs.max():+.2f})'
      + ('  ! consistent offset: was the audio trimmed?' if abs(np.median(offs)) > 0.25 else '  ok'))

if '--phrases' in sys.argv:
    sp = db > speech - 25
    segs, i, n = [], 0, len(sp)
    while i < n:
        if sp[i]:
            j = i
            while j < n and (sp[j] or sp[j:j + 12].any()):
                j += 1
            segs.append((i / 100, j / 100)); i = j
        else:
            i += 1
    print('\nphrases (cut the Short in the gaps between them):')
    for a, b in segs:
        txt = ' | '.join(c[2].replace('**', '') for c in cues if c[0] < b and c[1] > a)
        print(f'  {a:7.2f} {b:7.2f}  {txt[:100]}')
