"""Soundtrack for the long YouTube cut: music edited to picture, kitchen sound, motion-graphics foley and the voice.

- Music uses instruments.py (synth oud/nylon pluck, darbuka, clave, pads) in the timeline's style (music: latino by default). Each chapter gets a whole number of bars
  (the tempo flexes slightly per chapter), so every chapter wipe lands on a downbeat.
- The music ducks under the voice. With the narration file present (voz.wav|mp3|m4a) the ducking follows its
  envelope; without it, the subtitle cues stand in for the voice so the bed is already shaped for it.
- Clip sound (sizzle, simmer) comes from the clips themselves; the graphics get whooshes, pops, timer ticks, thuds.
Writes: musica_fx.wav (everything but the voice) and mezcla.wav (with the voice when available), normalised to
-14 LUFS integrated for YouTube with peaks kept under -1 dBFS.
The Short uses the same script: TL=timeline_short.json VOICE=voz_short.wav OUT=short_ python3 audio_yt.py
"""
import glob
import json
import os
import subprocess
import wave

import numpy as np
import pyloudnorm as pyln
from scipy import signal

TL = json.load(open(os.environ.get('TL', 'timeline.json'), encoding='utf-8'))
VERT = TL.get('layout') == 'vertical'
PREFIX = os.environ.get('OUT', '')
SR = 44100
DUR = TL['duration']
N = int(SR * (DUR + 0.5))
rng = np.random.default_rng(21)


import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import instruments as I                                          # noqa: E402
tt, filt, note = I.tt, I.filt, I.note
oud, doum, tek, shaker, pad, sub = I.oud, I.doum, I.tek, I.shaker, I.pad, I.sub
sizzle, whoosh, ding, clink, tick, rustle = I.sizzle, I.whoosh, I.ding, I.clink, I.tick, I.rustle
P = I.PRESETS.get(TL.get('music', 'latino'), I.PRESETS['latino'])
SCALE = P['scale']


class Bus:
    def __init__(self):
        self.L = np.zeros(N); self.R = np.zeros(N); self.SL = np.zeros(N); self.SR_ = np.zeros(N)

    def add(self, sig, start, gain=1.0, pan=0.0, send=0.0):
        i = int(round(start * SR))
        if i >= N or len(sig) == 0:
            return
        if i < 0:
            sig = sig[-i:]; i = 0
        n = min(len(sig), N - i)
        gl, gr = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2), gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        self.L[i:i + n] += sig[:n] * gl; self.R[i:i + n] += sig[:n] * gr
        if send:
            self.SL[i:i + n] += sig[:n] * gl * send; self.SR_[i:i + n] += sig[:n] * gr * send

    def add_st(self, st, start, gain=1.0):
        i = int(round(start * SR)); n = min(len(st), N - i)
        if n > 0 and i >= 0:
            self.L[i:i + n] += st[:n, 0] * gain; self.R[i:i + n] += st[:n, 1] * gain

    def stereo(self, rev=0.05):
        ir_t = tt(1.8)
        irL = filt(rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.5), 'low', 5000)
        irR = filt(rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.5), 'low', 5000)
        L = self.L + signal.fftconvolve(self.SL, irL)[:N] * rev
        R = self.R + signal.fftconvolve(self.SR_, irR)[:N] * rev
        return np.stack([L, R], 1)


MUS, FX = Bus(), Bus()


def deg(d): return SCALE[d % 7] + 12 * (d // 7)
def pluck(freq, dur, vel): return oud(freq, dur, vel, P['decay'])
def clave():
    t = tt(0.1)
    return np.sin(2 * np.pi * 2500 * t) * np.exp(-t * 60) * 0.35


# ───────── music: bars per chapter ─────────
CH = [c for c in TL['chapters'] if c['side'] != 'endshort']       # the Short's end card rides on the last bar
HAS_END = CH[-1]['side'] == 'end'
bounds = [c['t'] for c in CH] + [DUR]
BARS = []                                   # (start, length, chapter index, bar index within chapter, bars in chapter)
for k, c in enumerate(CH):
    d = bounds[k + 1] - bounds[k]
    nb = max(1, round(d / 2.5))
    for b in range(nb):
        BARS.append((bounds[k] + b * d / nb, d / nb, k, b, nb))

PHRASES = [[(4, 1), (5, 1), (4, 1), (3, 1), (2, 2), (3, 1), (4, 1)],
           [(2, 1), (3, 1), (4, 2), (5, 1), (4, 1), (3, 2)],
           [(7, 2), (6, 1), (5, 1), (4, 2), (3, 1), (2, 1)],
           [(1, 1), (2, 1), (3, 1), (4, 1), (0, 4)]]


def play(seq, t0, step, vel=0.8, pan=-0.15, octave=0, gain=0.5):
    t = t0
    for d, n in seq:
        if d is not None:
            MUS.add(pluck(note(deg(d) + 12 * octave), max(0.5, n * step + 0.4), vel), t, gain, pan=pan, send=0.35)
        t += n * step


last_ch = len(CH) - 1
for j, (t0, bar, k, b, nb) in enumerate(BARS):
    e8 = bar / 8
    final = k == last_ch and HAS_END
    chords = P['chords'][(b + 2 * k) % len(P['chords'])] if not final else (P['dominant'] if b == 0 and nb > 1 else P['tonic'])
    if k == last_ch and not HAS_END and b >= nb - 2:
        chords = P['dominant'] if b == nb - 2 else P['tonic']
    if k < last_ch and b == nb - 1 and CH[k + 1]['side'] == 'end':
        chords = P['dominant']
    MUS.add(pad([note(n) for n in chords], bar + 0.6, cutoff=650 + 60 * k), t0 - 0.3, 0.15, send=0.3)
    root = chords[0] - 12 if chords[0] > 47 else chords[0]
    if not final or b == 0:
        MUS.add(sub(note(root), bar * 0.95), t0, 0.45)
        MUS.add(sub(note(root + 7), e8 * 1.8), t0 + 4 * e8, 0.26)
    groove = not final or b == 0
    if groove:
        pattern = P['rhythm2'] if b % 2 else P['rhythm']
        for kind, pos in pattern:
            if kind == 'D':
                MUS.add(doum(1.0 if pos == 0 else 0.8), t0 + pos * e8, 0.5)
            elif kind == 'T':
                MUS.add(tek(0.9, P['bright']), t0 + pos * e8, 0.34, pan=0.25)
            elif kind == 'C':
                MUS.add(clave(), t0 + pos * e8, 0.42, pan=-0.2)
        for s16 in range(16):
            if s16 % 2:
                MUS.add(shaker(), t0 + s16 * e8 / 2, 0.8, pan=-0.35)
    # fill into the next chapter: a tek roll on the last half bar
    if b == nb - 1 and k < last_ch:
        for q in range(4):
            MUS.add(tek(0.5 + 0.12 * q, 0.7), t0 + (4 + q) * e8, 0.32, pan=(-0.3 if q % 2 else 0.3))
    # melody: lively in the hook, sparse and an octave up under the voice, an outro at the end
    if k == 0:
        play(PHRASES[b % 4], t0, e8, 0.85 if b % 2 else 0.9, gain=0.5)
    elif final:
        if b == 0:
            play([(4, 1), (2, 1), (1, 1), (0, 5)], t0, e8, 0.9, gain=0.5)
    elif b % 2 == 1:
        play(PHRASES[(b // 2 + k) % 4], t0, e8, 0.6, octave=1, gain=0.26)
    if b == 0 and k > 0:
        MUS.add(doum(1.2), t0, 0.6)                                       # downbeat under each chapter wipe
# intro flourish and ending ring
for q in range(8):
    MUS.add(pluck(note(deg(0)), 0.25, 0.35 + 0.05 * q), 0.05 + q * 0.156, 0.5, pan=-0.1, send=0.3)
end_t = CH[-1]['t']
ring_t = end_t + 2.2 if HAS_END else DUR - 1.2
for n in (deg(-7), deg(-3), deg(0), deg(2)):
    MUS.add(pluck(note(n), 3.0, 0.5), ring_t, 0.35, send=0.5)
MUS.add(ding(), ring_t - 0.2, 0.14, send=0.6)

# ───────── clip sound ─────────
FR = 'frames'
NOISY = {k for k, m in TL['media'].items() if m.get('audio') is False}   # clips with music/voice or silent (media_audit.py)
def clip_audio(key):
    p = os.path.join(FR, f'{key}.wav')
    if key in NOISY or not os.path.exists(p):
        return None
    with wave.open(p) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768
    a = filt(a.T, 'high', 150).T
    return a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.05


for s in TL['shots']:
    if s['src'] not in TL['media'] or 'clip' not in TL['media'][s['src']]:
        continue
    a = clip_audio(s['src'])
    if a is None:
        continue
    d = s['t1'] - s['t0'] + 0.6
    start = max(0.0, min(s['a'], len(a) / SR - d))
    seg = a[int(start * SR):int((start + d) * SR)].copy()
    if len(seg) < SR // 5:
        continue
    f = min(int(0.3 * SR), len(seg) // 2); env = np.ones(len(seg)); env[:f] = np.linspace(0, 1, f); env[-f:] = np.linspace(1, 0, f)
    FX.add_st(seg * env[:, None], s['t0'] - 0.3, 1.0)
HK = TL.get('hook', {})
hs = clip_audio(HK['sizzle']) if HK.get('sizzle') else None      # the hook: a clip's sizzle under the music
if hs is not None:
    seg = hs[:int(8 * SR)] * np.linspace(0, 1, int(8 * SR))[:, None] ** .5
    FX.add_st(seg, 0.4, 0.6)

# ───────── motion-graphics foley ─────────
def pop(g=0.08, f=1900): return clink(f, g)
for s in TL['shots']:
    if s['tr'] in ('push', 'zoom'):
        FX.add(whoosh(0.32, 0.16), s['t0'] - 0.2, 1.0, pan=0.3)
for c in CH:
    if c['side'] in ('L', 'R') and not VERT:
        FX.add(whoosh(0.9, 0.3), c['t'] - 0.55, 1.0, pan=-0.2)
        FX.add(whoosh(0.7, 0.22), c['t'] + 0.3, 1.0, pan=0.25)
    if c['side'] == 'V' and VERT:                     # the Short cuts with a flash and a punch-in
        FX.add(whoosh(0.4, 0.22), c['t'] - 0.28, 1.0); FX.add(doum(0.8), c['t'], 0.35)
if VERT:
    V = HK.get('vertical', {})
    for cut in V.get('cuts', [])[1:]:                 # the hook's quick cuts
        FX.add(whoosh(0.3, 0.16), cut[0] - 0.2, 1.0, pan=0.2); FX.add(doum(0.7), cut[0], 0.3)
    for pin in V.get('pins', []):                     # anatomy pins
        FX.add(clink(2300, 0.06), pin[1], 1.0, pan=0.3)
else:
    for k in range(len(HK.get('cards', []))):         # hook: cards dealt, then flipped on the beat
        FX.add(whoosh(0.3, 0.14), 0.12 + k * 0.14, 1.0, pan=0.2 + 0.2 * k)
    if HK.get('beat') is not None:
        FX.add(whoosh(0.35, 0.14), HK['beat'] - 0.2, 1.0); FX.add(whoosh(0.35, 0.12), HK['beat'] - 0.1, 1.0, pan=0.3)
for o in TL['callouts']:
    t0 = o['t']
    kind = o['kind']
    if kind in ('tip', 'note', 'heat', 'big'):
        FX.add(pop(0.07, 1500), t0, 1.0, pan=-0.2)
    if kind == 'chips':
        for _, ti in o['items']:
            FX.add(pop(0.06, 2100), ti, 1.0, pan=-0.25)
    if kind == 'list':
        for r in o['rows']:
            FX.add(pop(0.05, 1800), r[3], 1.0, pan=-0.25)
    if kind == 'board':
        for it in o['items']:
            FX.add(pop(0.06, 1700), it['t'], 1.0, pan=-0.3)
    if kind == 'timer':
        for q in range(12):
            FX.add(tick(), t0 + 0.2 + q * 0.125, 0.9, pan=-0.3)
        FX.add(ding(0.08), t0 + 1.75, 1.0, send=0.4)
    if kind == 'balls':
        for q in range(o['n']):
            FX.add(pop(0.06, 1300 + 120 * q), t0 + q * 0.28, 1.0)
    if kind == 'stack':
        for _, _, ti in o['layers']:
            FX.add(doum(0.5), ti + 0.3, 0.22); FX.add(rustle(0.25, 0.12), ti + 0.3, 0.6)
        FX.add(doum(0.6), o['layers'][-1][2] + 1.5, 0.25)
    if kind == 'measure':
        FX.add(sizzle(0.8, 380, 0.2), t0 + 0.2, 0.35)
for p in TL['pins']:
    FX.add(pop(0.05, 2400), p['t'], 1.0, pan=0.3)
if HAS_END:
    FX.add(clink(2600, 0.25), end_t + 1.55, 0.6)                  # subscribe click
    for q in range(6):
        FX.add(ding(0.05), end_t + 1.6 + q * 0.07, 1.0, pan=0.2)      # bell shake

# ───────── voice + ducking ─────────
voice = None
cand = [os.environ['VOICE']] if os.environ.get('VOICE') else sorted(glob.glob('voz.*'))
if cand:
    tmp = '_voz_tmp.wav'
    ff = os.environ.get('FFMPEG', 'ffmpeg')
    subprocess.run([ff, '-y', '-loglevel', 'error', '-i', cand[0], '-vn', '-ac', '2', '-ar', str(SR), tmp], check=True)
    with wave.open(tmp) as w:
        voice = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768
    os.remove(tmp)
    voice = voice[:N] if len(voice) >= N else np.pad(voice, ((0, N - len(voice)), (0, 0)))
    print(f'voice: {cand[0]} ({len(voice) / SR:.2f} s)')
    act = np.abs(voice).mean(1)
    act = signal.lfilter([1], [1, -np.exp(-1 / (0.05 * SR))], act) * (1 - np.exp(-1 / (0.05 * SR)))
    act = np.clip(act / (np.percentile(act, 90) + 1e-9), 0, 1)
else:
    print('no voice file (voz.wav / voz.mp3): ducking follows the subtitle cues')
    act = np.zeros(N)
    for t0, t1, _ in TL['cues']:
        act[int(t0 * SR):int(t1 * SR)] = 1.0
# smooth: fast attack, slow release
env = np.zeros(N); a_att, a_rel = np.exp(-1 / (0.08 * SR)), np.exp(-1 / (0.45 * SR))
# vectorised one-pole smoothing in two passes (attack on the rise, release on the fall) is close enough here
env = signal.lfilter([1 - a_rel], [1, -a_rel], act)
env = np.maximum(env, signal.lfilter([1 - a_att], [1, -a_att], act))
env = np.clip(env, 0, 1)
duck = 1 - 0.58 * env                           # ≈ -7.5 dB under the voice

music = MUS.stereo(0.06)
music = filt(music.T, 'high', 35).T * duck[:, None]
fx = FX.stereo(0.04) * (1 - 0.3 * env)[:, None]      # clip sound dips a little under the voice too
bed = music * 0.9 + fx
meter = pyln.Meter(SR)
if voice is not None:
    # levels set against each other: voice at -16 LUFS, the bed 14 LU under it while she speaks
    # (it comes back up ~7 dB in the pauses through the ducking)
    voice = filt(voice.T, 'high', 80).T
    voice *= 10 ** ((-16 - meter.integrated_loudness(voice)) / 20)
    speaking = env[:N] > 0.5
    g_bed = 10 ** ((-30 - meter.integrated_loudness(bed[speaking])) / 20)
    bed *= g_bed
    mix = bed + voice
else:
    mix = bed


def master(x, target):
    x = x[:int(DUR * SR)].copy()
    fo = int(0.8 * SR); x[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    fi = int(0.03 * SR); x[:fi] *= np.linspace(0, 1, fi)[:, None]
    x *= 10 ** ((target - meter.integrated_loudness(x)) / 20)
    # soft limiter keeps peaks under -1 dBFS
    ceil = 10 ** (-1.2 / 20)
    x = np.where(np.abs(x) > ceil * 0.8, np.sign(x) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(x) - ceil * 0.8) / (ceil * 0.2))), x)
    return x, meter.integrated_loudness(x), 20 * np.log10(np.max(np.abs(x)) + 1e-12)


def write(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


bed_m, lb, pb = master(bed, -20.0)       # bed alone sits lower: it is meant to go under a voice
write(f'{PREFIX}musica_fx.wav', bed_m)
print(f'{PREFIX}musica_fx.wav  {lb:.1f} LUFS  peak {pb:.1f} dBFS')
if voice is not None:
    mix_m, lm, pm = master(mix, -14.0)
    write(f'{PREFIX}mezcla.wav', mix_m)
    print(f'{PREFIX}mezcla.wav     {lm:.1f} LUFS  peak {pm:.1f} dBFS')
    if VERT:     # voice + kitchen sound, no music: to lay a trending track over it inside Instagram/TikTok
        fx_only = fx * g_bed + voice
        nm, ln, pn = master(fx_only, -14.0)
        write(f'{PREFIX}sin_musica.wav', nm)
        print(f'{PREFIX}sin_musica.wav {ln:.1f} LUFS  peak {pn:.1f} dBFS')
