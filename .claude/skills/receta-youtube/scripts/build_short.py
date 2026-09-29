#!/usr/bin/env python3
"""Builds the vertical Short (1080x1920) from the long project. Two modes, chosen by guion.json "short.mode":

- "autonomo" (default when the Short has its own voice): a recipe that works on its own (Reels, TikTok, Shorts).
  Own narration (voz_short.mp3, 30–45 s), own sheet "Short" in hoja_tomas.xlsx (rows V01…), own subtitles, callouts
  and hook; same media and look as the long. Ends on a call to action and, with "loop": true, returns to its first
  frame so the video repeats seamlessly.
- "recorte": a teaser cut out of the long cut (ranges "edl" in seconds of the long, cut in the voice's pauses).

    python3 build_short.py [guion.json]   → timeline_short.json + voz_short.wav + subtitulos_short.srt
Times in the autonomous short can be written "@V03" / "@V03$" (start / end of a Short shot).
"""
import copy
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np
import openpyxl

G = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'guion.json', encoding='utf-8'))
L = json.load(open('timeline.json', encoding='utf-8'))
SH = G['short']
MODE = SH.get('mode', 'autonomo' if SH.get('voice') else 'recorte')
SR = 44100
FF = os.environ.get('FFMPEG', 'ffmpeg')


def load_voice(path):
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '_v.wav'], check=True)
    with wave.open('_v.wav') as w:
        v = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768
    os.remove('_v.wav')
    return v


def speech_ends(vs, cues):
    """Appends to each cue the time its speech ends (drives the word-by-word captions)."""
    mono = np.abs(vs).mean(1); hop = int(0.01 * SR)
    en = np.array([mono[i:i + hop].mean() for i in range(0, len(mono) - hop, hop)])
    voiced = 20 * np.log10(en + 1e-9) > 20 * np.log10(np.percentile(en, 95) + 1e-9) - 30
    for c in cues:
        idx = np.nonzero(voiced[int(c[0] * 100):int(c[1] * 100)])[0]
        c.append(round(c[0] + (idx[-1] + 1) / 100, 3) if len(idx) else c[1])


def cues_from(subs, max_chars=92, gap=0.35):
    out = []
    plain = lambda x: x.replace('**', '')
    for t0, t1, s in subs:
        if out and t0 - out[-1][1] < gap and not plain(out[-1][2]).rstrip().endswith(('.', '?', '!', '…')) \
                and len(plain(out[-1][2] + ' ' + s)) <= max_chars:
            out[-1][1], out[-1][2] = t1, out[-1][2] + ' ' + s
            continue
        out.append([t0, t1, s])
    return out


def write_voice(vs):
    with wave.open('voz_short.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(vs, -1, 1) * 32767).astype('<i2').tobytes())


# ═════════════════════════════ autonomous Short ═════════════════════════════
def autonomo():
    wb = openpyxl.load_workbook(G.get('sheet', 'hoja_tomas.xlsx'), data_only=True)
    ws = wb[SH.get('sheet', 'Short')]
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h or '').strip().lower() for h in rows[0]]
    col = lambda *names: next(i for i, h in enumerate(head) if any(n in h for n in names))
    c0, c1 = col('inicio (s)', 'inicio'), col('fin (s)', 'fin')
    T = {str(r[0]): (float(r[c0]), float(r[c1])) for r in rows[1:] if r[0] and re.match(r'^V\d+', str(r[0]))}
    order = sorted(T, key=lambda k: T[k][0])
    end_voice = max(t1 for _, t1 in T.values())

    def resolve(x):
        if isinstance(x, str):
            m = re.fullmatch(r'@(V\d+)(\$?)', x)
            return T[m.group(1)][1 if m.group(2) else 0] if m else x
        if isinstance(x, list):
            return [resolve(v) for v in x]
        if isinstance(x, dict):
            return {k: resolve(v) for k, v in x.items()}
        return x

    S = resolve(SH)
    hook = S['hook']
    cuts = hook['vertical']['cuts']
    chapters = [dict(id='gancho', side='hook', title=G['title'], n=0, t=0.0, color=L['chapters'][1]['color'])]
    for i, c in enumerate(S.get('chapters', [])):
        chapters.append(dict(id=c.get('id', f'v{i + 1}'), side='V', title=c['title'], n=i + 1, t=T[c['start']][0], color=c['color']))
    cta = S.get('cta', {})
    cta_t = T[cta['start']][0] if cta.get('start') in T else end_voice
    chapters.append(dict(id='cta', side='endshort', title='fin', n=len(chapters), t=cta_t, color=chapters[-1]['color']))

    shots, starts = [], {c['t'] for c in chapters[1:]}
    for sid in order:
        t0, t1 = T[sid]
        sp = S['shots'].get(sid)
        if not sp:
            if t1 <= chapters[1]['t'] + 1e-6:
                continue                      # hook rows are drawn by hook.vertical.cuts
            sys.exit(f'{sid} has no entry in short.shots')
        a = sp.get('a', 0.0)
        shots.append(dict(id=sid, t0=t0, t1=t1, src=sp['src'], a=a, b=sp.get('b', a + (t1 - t0)), z=sp.get('z', [1.04, 1.1]),
                          f=sp.get('f', [[.5, .5], [.5, .5]]), tr=sp.get('tr', 'cut' if t0 in starts else 'push'),
                          **({'shimmer': sp['shimmer']} if sp.get('shimmer') else {})))
    if not shots:
        sys.exit('short.shots is empty')
    total = end_voice
    if S.get('loop', True):
        # hold the hook's first frame at the end: when the video restarts, the cut is invisible
        c = cuts[0]
        shots.append(dict(id='LOOP', t0=end_voice, t1=end_voice + 0.5, src=c[1], a=c[2], b=c[2],
                          z=[c[4][0] * 1.04, c[4][0]], f=[c[5], c[5]], tr='zoom'))
        total = end_voice + 0.5
    lims = S.get('limits', [30, 45])
    CO = []
    for o in S.get('callouts', []):
        o = dict(o)
        if 'until' in o:
            o['t1'] = T[o.pop('until')][1]
        o.setdefault('t1', next((s['t1'] for s in shots if s['t0'] - 1e-6 <= o['t'] < s['t1']), total))
        CO.append(o)
    cues = cues_from(S['subtitles'])
    vs = load_voice(S['voice'])
    vs = vs[:int(total * SR)] if len(vs) >= int(total * SR) else np.pad(vs, ((0, int(total * SR) - len(vs)), (0, 0)))
    write_voice(vs); speech_ends(vs, cues)
    out = dict(L, size=[1080, 1920], layout='vertical', duration=round(total, 3), chapters=chapters, shots=shots,
               callouts=CO, pins=S.get('pins', []), cues=cues, hook=dict(hook, title=hook.get('title', L['hook'].get('title'))),
               end_card=cta.get('card', ['Guárdala', 'Receta con trucos', 'en el canal  ▶']), loop=S.get('loop', True))
    warn = [] if lims[0] <= total <= lims[1] else [f'the Short runs {total:.1f} s, outside {lims[0]}–{lims[1]} s']
    return out, cues, warn


# ═════════════════════════════ teaser cut from the long ═════════════════════════════
def recorte():
    EDL = [(e['from'], e['to'], e.get('title', '')) for e in SH['edl']]
    END = SH.get('end_dur', 1.1)

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
        chapters.append(dict(id=f'seg{i}', side='hook' if i == 0 and a == 0 else 'V', title=title or lc['title'], n=i, t=round(d, 3), color=lc['color']))
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
    v = load_voice(G.get('voice', 'voz.mp3'))
    fd = int(0.015 * SR); parts = []
    for a, b, _ in EDL:
        p = v[int(a * SR):int(b * SR)].copy()
        p[:fd] *= np.linspace(0, 1, fd)[:, None]; p[-fd:] *= np.linspace(1, 0, fd)[:, None]
        parts.append(p)
    vs = np.concatenate(parts + [np.zeros((int(END * SR), 2))])
    write_voice(vs); speech_ends(vs, cues)
    out = dict(L, size=[1080, 1920], layout='vertical', duration=total, chapters=chapters, shots=shots, callouts=callouts,
               pins=pins, cues=cues, edl=[[a, b] for a, b, _ in EDL], end_card=SH.get('end_card', ['Receta completa', 'en el canal  ▶']))
    mx = SH.get('max', 30)
    return out, cues, ([f'the Short runs {total:.1f} s, over the {mx} s target'] if total > mx else [])


out, cues, warn = autonomo() if MODE == 'autonomo' else recorte()


def srt_time(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


with open('subtitulos_short.srt', 'w', encoding='utf-8') as fh:
    for i, (t0, t1, s, *_) in enumerate(cues, 1):
        fh.write(f'{i}\n{srt_time(t0)} --> {srt_time(t1)}\n{s.replace("**", "")}\n\n')
json.dump(out, open('timeline_short.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'timeline_short.json ({MODE}): {out["duration"]:.2f} s · {len(out["shots"])} shots · {len(out["callouts"])} callouts · {len(cues)} cues')
for s in out['shots']:
    print(f"  {s['id']:<5} {s['src']:<5} {s['t0']:6.2f}–{s['t1']:6.2f}  clip {s['a']:.2f}–{s['b']:.2f}  {s['tr']}")
for w in warn:
    print('  ! ' + w)
