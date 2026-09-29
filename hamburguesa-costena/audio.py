"""Soundtrack + kitchen foley for a recipe video, driven by recipe.json.

One bar per scene (bar = 240 / bpm seconds), so every cut lands on a downbeat.
music presets: "levante" (maqsum darbuka + oud in hijaz), "latino" (son clave + nylon pluck, major),
"calido" (soft lo-fi groove, major). Kitchen foley per scene comes from each scene's "sfx" list;
when a scene uses a video clip with sound (clips/<name>.wav), the clip's real sound replaces the foley.
Env: PHOTOS=1 ignores clips, OUT=file.wav changes the output name.
Writes soundtrack.wav next to recipe.json (the current directory).
"""
import json
import os
import wave

import numpy as np
from scipy import signal

CFG = json.load(open('recipe.json', encoding='utf-8'))
SCENES = CFG['scenes']
SR = 44100
BAR = 240 / CFG.get('bpm', 96)
E8 = BAR / 8          # eighth note
NB = len(SCENES)      # one bar per scene
DUR = NB * BAR
N = int(SR * DUR)
rng = np.random.default_rng(11)

L = np.zeros(N); R = np.zeros(N)
SL = np.zeros(N); SRV = np.zeros(N)   # reverb send


def add(sig, start, gain=1.0, pan=0.0, send=0.0):
    i = int(round(start * SR))
    if i >= N or len(sig) == 0:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    n = min(len(sig), N - i)
    gl = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
    gr = gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    L[i:i + n] += sig[:n] * gl; R[i:i + n] += sig[:n] * gr
    if send:
        SL[i:i + n] += sig[:n] * gl * send; SRV[i:i + n] += sig[:n] * gr * send


def tt(d): return np.arange(int(d * SR)) / SR
def filt(x, kind, f, order=2):
    wn = np.array(f) / (SR / 2)
    b, a = signal.butter(order, wn, kind)
    return signal.lfilter(b, a, x)
def note(m): return 440.0 * 2 ** ((m - 69) / 12)


# ───────── instruments ─────────
def oud(freq, dur=0.9, vel=1.0, decay=0.994):
    """Karplus-Strong plucked string, vectorised one period at a time."""
    n = int(dur * SR); P = max(2, int(round(SR / freq)))
    buf = rng.uniform(-1, 1, P)
    buf = filt(np.tile(buf, 3), 'low', 3500)[-P:]      # soften the pick
    out = np.empty(n + P)
    for s in range(0, n + P, P):
        out[s:s + P] = buf[:min(P, n + P - s)]
        buf = decay * 0.5 * (buf + np.roll(buf, -1))
    out = out[:n]
    body = filt(out, 'band', [180, 2400])               # wooden body
    env = np.minimum(1, np.arange(n) / (0.002 * SR))
    return (0.6 * out + 0.7 * body) * env * vel * 0.5


def doum(vel=1.0):
    t = tt(0.5)
    f = 58 + 70 * np.exp(-t * 30)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 1.6) * vel * 0.8


def tek(vel=1.0, bright=1.0):
    t = tt(0.12)
    n = filt(rng.standard_normal(len(t)), 'band', [1800, 7000]) * np.exp(-t * 90)
    tone = np.sin(2 * np.pi * 620 * t) * np.exp(-t * 60) * 0.5
    return (n * bright + tone) * vel * 0.45


def shaker():
    t = tt(0.06)
    return filt(rng.standard_normal(len(t)), 'high', 6000, 3) * np.exp(-t * 80) * 0.12


def pad(freqs, dur, cutoff=900):
    t = tt(dur); x = np.zeros(len(t))
    for f in freqs:
        for d in (-0.004, 0, 0.004):
            ph = (f * (1 + d) * t + rng.random()) % 1
            x += 2 * ph - 1
    x /= len(freqs) * 3
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.6).clip(0)
    return filt(x, 'low', cutoff) * env


def sub(freq, dur):
    t = tt(dur)
    env = np.minimum(1, t / 0.01) * np.exp(-t * 1.2) * np.minimum(1, (dur - t) / 0.05).clip(0)
    return np.sin(2 * np.pi * freq * t) * env * 0.55


# ───────── foley ─────────
def bubbles(dur, density=40, lo=350, hi=1100, gain=0.25):
    t = tt(dur); out = np.zeros(len(t))
    k = rng.poisson(density * dur)
    for _ in range(k):
        s = rng.uniform(0, dur); f0 = rng.uniform(lo, hi); ln = rng.uniform(0.02, 0.06)
        bt = tt(ln); f = f0 * (1 + 1.2 * bt / ln)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-bt * 60) * rng.uniform(0.3, 1)
        i = int(s * SR); out[i:i + len(b)] += b[:len(out) - i]
    rumble = filt(rng.standard_normal(len(t)), 'low', 300) * 0.4
    fade = np.minimum(1, np.minimum(t, dur - t) / 0.3)
    return (out + rumble) * fade * gain


def sizzle(dur, crackle=250, hiss=0.25, gain=0.3):
    t = tt(dur)
    h = filt(rng.standard_normal(len(t)), 'band', [3000, 11000]) * hiss
    h *= 0.6 + 0.4 * filt(rng.standard_normal(len(t)), 'low', 8) * 6
    imp = np.zeros(len(t))
    idx = rng.integers(0, len(t), int(crackle * dur)); imp[idx] = rng.uniform(-1, 1, len(idx))
    c = filt(imp, 'band', [1500, 9000]) * 3
    fade = np.minimum(1, np.minimum(t, dur - t) / 0.25)
    return (h + c) * fade * gain


def pour(dur, gain=0.25):
    t = tt(dur)
    n = filt(rng.standard_normal(len(t)), 'band', [350, 2200])
    wob = 0.6 + 0.4 * np.sin(2 * np.pi * 7 * t + np.sin(2 * np.pi * 1.3 * t) * 2)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6
    return (n * wob * env + bubbles(dur, 60, 500, 1500, 0.6)) * gain


def rattle(dur, gain=0.3):
    t = tt(dur); out = np.zeros(len(t))
    for _ in range(int(900 * dur)):
        s = dur * rng.random() ** 1.6          # dense at the start
        g = tt(0.004); b = rng.standard_normal(len(g)) * np.exp(-g * 900)
        i = int(s * SR); out[i:i + len(b)] += b[:len(out) - i] * rng.uniform(0.2, 1)
    return filt(out, 'band', [2500, 8000]) * gain


def clink(f0=1350, gain=0.35):
    t = tt(1.2)
    x = sum(a * np.sin(2 * np.pi * f0 * m * t) * np.exp(-t * d)
            for m, a, d in ((1, 1, 5), (2.76, .6, 8), (5.4, .4, 12), (8.93, .25, 18)))
    thud = filt(rng.standard_normal(len(t)), 'low', 500) * np.exp(-t * 40) * 0.6
    return (x * 0.5 + thud) * gain


def tick(gain=0.12):
    t = tt(0.02)
    return filt(rng.standard_normal(len(t)), 'band', [3000, 7000]) * np.exp(-t * 400) * gain


def rustle(dur, gain=0.2):
    t = tt(dur); out = np.zeros(len(t))
    for _ in range(int(120 * dur)):
        g = tt(rng.uniform(0.01, 0.04)); b = rng.standard_normal(len(g)) * np.hanning(len(g))
        i = int(rng.uniform(0, dur) * SR); out[i:i + len(b)] += b[:len(out) - i]
    return filt(out, 'band', [1200, 6000]) * gain


def whoosh(dur=0.35, gain=0.18):
    t = tt(dur); n = rng.standard_normal(len(t)); y = np.zeros_like(n)
    for s in range(0, len(n), 512):
        fc = 400 * (12 ** np.sin(np.pi * s / len(n)))
        y[s:s + 512] = filt(n[s:s + 512], 'band', [fc * 0.7, min(fc * 1.4, 20000)], 1)
    return y * np.sin(np.pi * t / dur) ** 2 * gain


def ding(gain=0.3):
    t = tt(2.5)
    x = sum(a * np.sin(2 * np.pi * 1568 * m * t) * np.exp(-t * d) for m, a, d in ((1, 1, 1.5), (2.0, .3, 3), (3.01, .15, 5)))
    return x * gain


# ───────── music ─────────
PRESETS = {
    'levante': dict(scale=[62, 63, 66, 67, 69, 70, 72],                     # D hijaz
                    chords=[[50, 57, 62], [43, 55, 58, 62], [50, 57, 62], [48, 55, 60, 63], [50, 57, 66], [43, 55, 58, 62]],
                    dominant=[45, 57, 61, 64], tonic=[50, 57, 62, 66],
                    rhythm=[('D', 0), ('T', 1), ('T', 3), ('D', 4), ('T', 6)], bright=1.0, decay=0.994),
    'latino':  dict(scale=[67, 69, 71, 72, 74, 76, 78],                     # G major
                    chords=[[43, 55, 59, 62], [48, 55, 60, 64], [50, 57, 62, 66], [43, 55, 59, 62], [40, 55, 59, 64], [48, 55, 60, 64]],
                    dominant=[50, 57, 60, 66], tonic=[43, 55, 59, 62, 67],
                    rhythm=[('D', 0), ('C', 0), ('C', 3), ('C', 6), ('D', 4), ('T', 5)], rhythm2=[('D', 0), ('C', 2), ('C', 4), ('D', 4), ('T', 5)],
                    bright=0.7, decay=0.992),
    'calido':  dict(scale=[60, 62, 64, 65, 67, 69, 71],                     # C major
                    chords=[[48, 55, 60, 64], [45, 57, 60, 64], [41, 53, 57, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [41, 53, 57, 60]],
                    dominant=[43, 55, 59, 62, 65], tonic=[48, 55, 60, 64, 67],
                    rhythm=[('D', 0), ('T', 2), ('D', 5), ('T', 6)], bright=0.5, decay=0.995),
}
P = PRESETS.get(CFG.get('music', 'levante'), PRESETS['levante'])
SCALE = P['scale']
def deg(d):  # scale degree (0 = tonic, can be negative / > 6) -> MIDI
    return SCALE[d % 7] + 12 * (d // 7)

def clave():
    t = tt(0.1)
    return np.sin(2 * np.pi * 2500 * t) * np.exp(-t * 60) * 0.35

for b in range(NB):
    t0 = b * BAR
    if b == NB - 1:
        notes = P['tonic']
    elif b == NB - 2:
        notes = P['dominant']
    else:
        notes = P['chords'][b % len(P['chords'])]
    add(pad([note(n) for n in notes], BAR + 0.6, cutoff=700 + 400 * b / max(1, NB)), t0 - 0.3, 0.16, send=0.3)
    if 1 <= b < NB - 1:
        add(sub(note(notes[0] - 12 if notes[0] > 47 else notes[0]), BAR * 0.95), t0, 0.5)
        add(sub(note((notes[0] - 12 if notes[0] > 47 else notes[0]) + 7), E8 * 1.8), t0 + 4 * E8, 0.3)
    if 1 <= b < NB - 1:
        pattern = P['rhythm2'] if ('rhythm2' in P and b % 2) else P['rhythm']
        for kind, pos in pattern:
            if kind == 'D':
                add(doum(1.0 if pos == 0 else 0.8), t0 + pos * E8, 0.55)
            elif kind == 'T':
                add(tek(0.9, P['bright']), t0 + pos * E8, 0.4, pan=0.25)
            elif kind == 'C':
                add(clave(), t0 + pos * E8, 0.5, pan=-0.2)
        for s16 in range(16):
            if s16 % 2:
                add(shaker(), t0 + s16 * E8 / 2, 1.0, pan=-0.35)
        if b % 4 == 0 and b > 1:
            add(tek(0.5, 0.6), t0 + 7 * E8, 0.35, pan=-0.2); add(tek(0.6, 0.6), t0 + 7.5 * E8, 0.35, pan=0.2)
add(doum(0.7), 0.0, 0.5)
add(doum(1.2), (NB - 1) * BAR, 0.7)

def pluck(freq, dur, vel):
    return oud(freq, dur, vel, P['decay'])

def play(seq, t0, step=E8, vel=0.8, pan=-0.15):
    t = t0
    for d, n in seq:
        if d is not None:
            add(pluck(note(deg(d)), max(0.5, n * step + 0.4), vel), t, 0.55, pan=pan, send=0.35)
        t += n * step

# intro flourish: tremolo on the tonic, then a run up to the octave
for k in range(8):
    add(pluck(note(deg(0)), 0.25, 0.35 + 0.05 * k), 0.05 + k * E8 / 2, 0.5, pan=-0.1, send=0.3)
play([(4, 1), (5, 1), (6, 1), (7, 1)], BAR * 0.5, E8, 0.9)
PHRASES = [[(4, 1), (5, 1), (4, 1), (3, 1), (2, 2), (3, 1), (4, 1)],
           [(2, 1), (3, 1), (4, 2), (5, 1), (4, 1), (3, 2)],
           [(7, 2), (6, 1), (5, 1), (4, 2), (3, 1), (2, 1)],
           [(1, 1), (2, 1), (3, 1), (4, 1), (0, 4)]]
for b in range(2, NB - 1):
    play(PHRASES[(b - 2) % len(PHRASES)], b * BAR, E8, 0.7 if b % 2 else 0.8)
play([(4, 1), (2, 1), (1, 1), (0, 5)], (NB - 1) * BAR, E8, 0.9)
for n in (deg(-7), deg(-3), deg(0), deg(2)):
    add(pluck(note(n), 2.5, 0.5), (NB - 1) * BAR + 3 * E8, 0.4, send=0.5)
add(ding(), (NB - 1) * BAR, 0.18, send=0.6)

# ───────── foley per scene ─────────
S = lambda i: i * BAR
USE_CLIPS = os.environ.get('PHOTOS') != '1'
SFX = {
    'bubbles': lambda t0: add(bubbles(BAR + 0.1, 45), t0, 0.9, pan=0.1),
    'bubbles_soft': lambda t0: add(bubbles(BAR * 0.8, 25), t0 + 0.6, 0.6),
    'simmer': lambda t0: add(bubbles(BAR, 12, 200, 500), t0, 0.5),
    'pour': lambda t0: add(pour(1.2), t0 + 0.1, 0.8, pan=0.2),
    'rattle': lambda t0: add(rattle(1.4), t0 + 0.25, 0.7, pan=-0.2),
    'sizzle': lambda t0: add(sizzle(BAR + 0.1, 160, 0.15), t0, 0.55),
    'sizzle_strong': lambda t0: add(sizzle(BAR + 0.1, 420, 0.3), t0, 0.8),
    'crackle': lambda t0: add(sizzle(1.4, 90, 0.03), t0 + 0.2, 0.5),
    'clink': lambda t0: add(clink(), t0 + 0.08, 0.9, pan=0.15, send=0.2),
    'rustle': lambda t0: add(rustle(1.2), t0 + 0.3, 0.8, pan=-0.1),
}
for i, sc in enumerate(SCENES):
    t0 = S(i)
    if sc.get('timer'):
        for k in range(12):
            add(tick(), t0 + 0.5 + k * E8 / 2 * 1.5, 1.0, pan=0.4)
    clip = sc.get('clip') or {}
    wav = os.path.join('clips', clip.get('name', '') + '.wav')
    if USE_CLIPS and clip and clip.get('audio', True) and os.path.exists(wav):
        with wave.open(wav) as w:
            a = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768
        inp = clip.get('in', 0.0); a0 = max(0.0, inp - 0.3)
        seg = a[int(a0 * SR):int((inp + BAR + 0.3) * SR)]
        if len(seg) > SR // 4:
            seg = filt(seg.T, 'high', 120).T
            seg *= min(0.1 / (np.sqrt(np.mean(seg ** 2)) + 1e-9), 20)      # level-match every clip
            fade = int(0.25 * SR); env = np.ones(len(seg)); env[:fade] = np.linspace(0, 1, fade); env[-fade:] = np.linspace(1, 0, fade)
            seg *= env[:, None]
            st = int((t0 - (inp - a0)) * SR); n = min(len(seg), N - st)
            if st >= 0:
                L[st:st + n] += seg[:n, 0] * 0.9; R[st:st + n] += seg[:n, 1] * 0.9
            continue
    for name in sc.get('sfx', []):
        if name in SFX:
            SFX[name](t0)
for i in range(1, NB):
    if SCENES[i].get('transition') == 'flash':
        add(whoosh(0.8, 0.25), S(i) - 0.3, 1.0)
    add(whoosh(), S(i) - 0.17, 1.0, pan=(-0.4 if i % 2 else 0.4))

# ───────── reverb + master ─────────
ir_t = tt(1.8)
irL = filt(rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.5), 'low', 5000)
irR = filt(rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.5), 'low', 5000)
L += signal.fftconvolve(SL, irL)[:N] * 0.05
R += signal.fftconvolve(SRV, irR)[:N] * 0.05
mix = np.stack([L, R], 1)
mix = filt(mix.T, 'high', 30).T
mix = np.tanh(mix * 1.2)
mix /= np.max(np.abs(mix)) / 0.89
fo = int(0.5 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
fi = int(0.02 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
out = os.environ.get('OUT', 'soundtrack.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print(f'wrote {out}  ({DUR:.1f} s, {NB} bars at {240 / BAR:.0f} BPM)')
