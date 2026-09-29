#!/usr/bin/env python3
"""Cuts the vertical Short (the teaser) out of the long cut: same voice, shots, callouts and subtitles, re-timed.

guion.json "short": {"edl": [{"from": s, "to": s, "title": "..."}, …], "end_card": [l1, l2], "end_dur": 1.1}
Ranges are in seconds of the long video, cut in the real pauses of the voice (see voice_check.py --phrases). The first
range should start at 0 (the long's hook, drawn full-screen). Everything inside a range is copied and shifted;
callouts that began earlier re-enter at the range start; slivers of shots under 0.2 s are absorbed by a neighbour.
    python3 build_short.py [guion.json]   → timeline_short.json + voz_short.wav + subtitulos_short.srt
"""
import copy
import json
import os
import subprocess
import sys
import wave

import numpy as np

G = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'guion.json', encoding='utf-8'))
L = json.load(open('timeline.json', encoding='utf-8'))
SH = G['short']
EDL = [(e['from'], e['to'], e.get('title', '')) for e in SH['edl']]
END = SH.get('end_dur', 1.1)
MAX = SH.get('max', 30)
SR = 44100


def long_chapter(t):
    ch = L['chapters'][0]
    for c in L['chapters']:
        if t >= c['t']:
            ch = c
    return ch


shots, callouts, pins, cues, chapters = [], [], [], [], []
d = 0.0
TIME_KEYS = {'chips': ('items', 1), 'list': ('rows', 3), 'stack': ('layers', 2)}
for i, (a, b, title) in enumerate(EDL):
    sh = lambda t: d + (t - a)
    lc = long_chapter(a + 0.5)
    side = 'hook' if i == 0 and a == 0 else 'V'
    chapters.append(dict(id=f'seg{i}', side=side, title=title or lc['title'], n=i, t=round(d, 3), color=lc['color']))
    seg = []
    for s in L['shots']:
        lo, hi = max(s['t0'], a), min(s['t1'], b)
        if hi - lo <= 0:
            continue
        rate = (s['b'] - s['a']) / (s['t1'] - s['t0'])
        seg.append(dict(s, t0=sh(lo), t1=sh(hi), a=max(0.0, s['a'] + (lo - s['t0']) * rate), b=s['a'] + (hi - s['t0']) * rate))
    for k in range(len(seg) - 1, -1, -1):
        p = seg[k]
        if p['t1'] - p['t0'] < 0.2 and len(seg) > 1:
            q = seg[k + 1] if k + 1 < len(seg) else seg[k - 1]
            rate = (q['b'] - q['a']) / max(1e-6, q['t1'] - q['t0'])
            if q['t0'] >= p['t1'] - 1e-6:
                q['a'] = max(0.0, q['a'] - (q['t0'] - p['t0']) * rate); q['t0'] = p['t0']
            else:
                q['b'] += (p['t1'] - q['t1']) * rate; q['t1'] = p['t1']
            seg.pop(k)
    seg[0]['tr'] = 'cut'
    shots += seg
    for o in L['callouts']:
        t1 = o['t1'] if o.get('t1') is not None else b
        lo, hi = max(o['t'], a + 0.1), min(t1, b)
        if hi - lo < 0.8 or o['kind'] in ('board', 'gauge', 'trace'):
            continue
        q = copy.deepcopy(o)
        q['t'], q['t1'] = sh(lo), sh(hi)
        if o['kind'] in TIME_KEYS:
            key, idx = TIME_KEYS[o['kind']]
            for it in q[key]:
                it[idx] = sh(max(it[idx], a + 0.1))
        callouts.append(q)
    pins += [dict(p, t=sh(p['t'])) for p in L['pins'] if a <= p['t'] < b]
    for c0, c1, txt in L['cues']:
        lo, hi = max(c0, a), min(c1, b)
        if hi - lo > 0.3:
            cues.append([sh(lo), sh(hi), txt])
    d += b - a

total = round(d + END, 3)
last = shots[-1]
shots.append(dict(last, id='END', t0=d, t1=total, z=[last['z'][1], last['z'][1] * 1.06], f=[last['f'][1], last['f'][1]], tr='none'))
chapters.append(dict(id='fin', side='endshort', title='fin', n=len(EDL), t=round(d, 3), color=chapters[-1]['color']))

# voice: slice with 15 ms fades; each cue gets the time its speech ends (drives the word-by-word captions)
ff = os.environ.get('FFMPEG', 'ffmpeg')
subprocess.run([ff, '-y', '-loglevel', 'error', '-i', G.get('voice', 'voz.mp3'), '-ac', '2', '-ar', str(SR), '_v.wav'], check=True)
with wave.open('_v.wav') as w:
    v = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768
os.remove('_v.wav')
fd = int(0.015 * SR); parts = []
for a, b, _ in EDL:
    p = v[int(a * SR):int(b * SR)].copy()
    p[:fd] *= np.linspace(0, 1, fd)[:, None]; p[-fd:] *= np.linspace(1, 0, fd)[:, None]
    parts.append(p)
vs = np.concatenate(parts + [np.zeros((int(END * SR), 2))])
with wave.open('voz_short.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((vs * 32767).astype('<i2').tobytes())
mono = np.abs(vs).mean(1); hop = int(0.01 * SR)
en = np.array([mono[i:i + hop].mean() for i in range(0, len(mono) - hop, hop)])
voiced = 20 * np.log10(en + 1e-9) > 20 * np.log10(np.percentile(en, 95) + 1e-9) - 30
for c in cues:
    idx = np.nonzero(voiced[int(c[0] * 100):int(c[1] * 100)])[0]
    c.append(round(c[0] + (idx[-1] + 1) / 100, 3) if len(idx) else c[1])


def srt_time(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


with open('subtitulos_short.srt', 'w', encoding='utf-8') as fh:
    for i, (t0, t1, s, _) in enumerate(cues, 1):
        fh.write(f'{i}\n{srt_time(t0)} --> {srt_time(t1)}\n{s.replace("**", "")}\n\n')

out = dict(L, size=[1080, 1920], layout='vertical', duration=total, chapters=chapters, shots=shots, callouts=callouts,
           pins=pins, cues=cues, edl=[[a, b] for a, b, _ in EDL], end_card=SH.get('end_card', ['Receta completa', 'en el canal  ▶']))
json.dump(out, open('timeline_short.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'timeline_short.json: {total:.2f} s · {len(shots)} shots · {len(callouts)} callouts · {len(cues)} cues')
for s in shots:
    print(f"  {s['id']:<4} {s['src']:<4} {s['t0']:6.2f}–{s['t1']:6.2f}  clip {s['a']:.2f}–{s['b']:.2f}")
if total > MAX:
    print(f'  ! the Short runs {total:.1f} s, over the {MAX} s target: shorten a range')
