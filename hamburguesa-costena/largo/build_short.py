"""Cuts the vertical Short (≤ 30 s) out of the long cut: same narration, shots, callouts and subtitles, re-timed.

EDL = ranges of the long video (seconds), cut in the real pauses of the voice (measured on voz.mp3). Everything that
falls inside a range is copied and shifted; callouts that started before a range re-enter at its start; pieces of
shots shorter than 0.2 s are absorbed by their neighbour. The voice is cut from voz.mp3 with 15 ms fades.
    python3 build_short.py   → timeline_short.json + voz_short.wav + subtitulos_short.srt
"""
import copy
import json
import os
import subprocess
import wave

import numpy as np

EDL = [  # (long start, long end, chapter shown in the short)
    (0.00, 11.95, dict(id='gancho', side='hook', title='Hamburguesa costeña', n=0)),
    (124.50, 129.50, dict(id='smash', side='V', title='Smash', n=5)),
    (138.45, 150.35, dict(id='armado', side='V', title='A armar', n=6)),
]
END_CARD = 1.1                    # "receta completa en el canal"
L = json.load(open('timeline.json', encoding='utf-8'))
SR = 44100


def long_color(t):
    col = L['chapters'][0]['color']
    for c in L['chapters']:
        if t >= c['t']:
            col = c['color']
    return col


shots, callouts, pins, cues, chapters = [], [], [], [], []
d = 0.0
TIME_KEYS = {'chips': 'items', 'list': 'rows', 'stack': 'layers'}
for a, b, ch in EDL:
    sh = lambda t: d + (t - a)                                   # long time → short time
    chapters.append(dict(ch, t=round(d, 3), color=long_color(a + 0.5)))
    # shots
    seg = []
    for s in L['shots']:
        lo, hi = max(s['t0'], a), min(s['t1'], b)
        if hi - lo <= 0:
            continue
        rate = (s['b'] - s['a']) / (s['t1'] - s['t0'])
        p = dict(s, t0=sh(lo), t1=sh(hi), a=s['a'] + (lo - s['t0']) * rate, b=s['a'] + (hi - s['t0']) * rate)
        seg.append(p)
    for k in range(len(seg) - 1, -1, -1):                        # absorb slivers into a neighbour
        p = seg[k]
        if p['t1'] - p['t0'] < 0.2 and len(seg) > 1:
            q = seg[k + 1] if k + 1 < len(seg) else seg[k - 1]
            rate = (q['b'] - q['a']) / (q['t1'] - q['t0'])
            if q['t0'] >= p['t1'] - 1e-6:
                q['a'] -= (q['t0'] - p['t0']) * rate; q['t0'] = p['t0']
            else:
                q['b'] += (p['t1'] - q['t1']) * rate; q['t1'] = p['t1']
            seg.pop(k)
    seg[0]['tr'] = 'cut'
    shots += seg
    # callouts: shift every time they carry; skip the ones that would only flash by
    for o in L['callouts']:
        t1 = o['t1'] if o['t1'] is not None else b
        lo, hi = max(o['t'], a + 0.1), min(t1, b)
        if hi - lo < 0.8 or o['kind'] in ('board', 'gauge', 'trace'):
            continue
        q = copy.deepcopy(o)
        q['t'], q['t1'] = sh(lo), sh(hi)
        key = TIME_KEYS.get(o['kind'])
        if key:
            idx = {'items': 1, 'rows': 3, 'layers': 2}[key]
            for it in q[key]:
                it[idx] = sh(max(it[idx], a + 0.1))
        callouts.append(q)
    for p in L['pins']:
        if a <= p['t'] < b:
            pins.append(dict(p, t=sh(p['t'])))
    for c0, c1, txt in L['cues']:
        lo, hi = max(c0, a), min(c1, b)
        if hi - lo > 0.3:
            cues.append([sh(lo), sh(hi), txt])
    d += b - a

total = d + END_CARD
last = shots[-1]
shots.append(dict(last, id='END', t0=d, t1=total, z=[last['z'][1], last['z'][1] * 1.06], f=[last['f'][1], last['f'][1]], tr='none'))
chapters.append(dict(id='fin', side='endshort', title='Receta completa', n=7, t=round(d, 3), color=L['colors']['saffron']))

# ── voice: cut, 15 ms fades at every joint; per-cue end of speech for the word-by-word captions ──
ff = os.environ.get('FFMPEG', 'ffmpeg')
subprocess.run([ff, '-y', '-loglevel', 'error', '-i', 'voz.mp3', '-ac', '2', '-ar', str(SR), '_v.wav'], check=True)
with wave.open('_v.wav') as w:
    v = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768
os.remove('_v.wav')
parts = []
fd = int(0.015 * SR)
for a, b, _ in EDL:
    p = v[int(a * SR):int(b * SR)].copy()
    p[:fd] *= np.linspace(0, 1, fd)[:, None]; p[-fd:] *= np.linspace(1, 0, fd)[:, None]
    parts.append(p)
vs = np.concatenate(parts + [np.zeros((int(END_CARD * SR), 2))])
with wave.open('voz_short.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((vs * 32767).astype('<i2').tobytes())
mono = np.abs(vs).mean(1); hop = int(0.01 * SR)
en = np.array([mono[i:i + hop].mean() for i in range(0, len(mono) - hop, hop)])
voiced = 20 * np.log10(en + 1e-9) > 20 * np.log10(np.percentile(en, 95) + 1e-9) - 30
for c in cues:
    idx = np.nonzero(voiced[int(c[0] * 100):int(c[1] * 100)])[0]
    c.append(round(c[0] + (idx[-1] + 1) / 100, 3) if len(idx) else c[1])   # [t0, t1, text, end of speech]


def srt_time(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


with open('subtitulos_short.srt', 'w', encoding='utf-8') as fh:
    for i, (t0, t1, s, _) in enumerate(cues, 1):
        fh.write(f'{i}\n{srt_time(t0)} --> {srt_time(t1)}\n{s.replace("**", "")}\n\n')

out = dict(L, size=[1080, 1920], layout='vertical', duration=round(total, 3), chapters=chapters, shots=shots,
           callouts=callouts, pins=pins, cues=cues, edl=[[a, b] for a, b, _ in EDL])
json.dump(out, open('timeline_short.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'timeline_short.json: {total:.2f} s · {len(shots)} shots · {len(callouts)} callouts · {len(cues)} cues')
for s in shots:
    print(f"  {s['id']:<4} {s['src']:<4} {s['t0']:6.2f}–{s['t1']:6.2f}  clip {s['a']:.2f}–{s['b']:.2f}  {s['tr']}")
