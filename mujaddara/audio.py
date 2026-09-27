"""Soundtrack + kitchen foley for the mujaddara recipe video.

96 BPM -> one bar = 2.5 s = one scene. 12 bars = 30 s.
Music: maqsum darbuka groove, Karplus-Strong "oud" in D hijaz, warm drone pad, sub bass.
Foley (synthesized): boiling bubbles, pouring/rattling lentils, sizzle, lid clink, timer ticks,
crispy crackles, sprinkle rustle, whooshes on the cuts.
Writes soundtrack.wav next to this file.
"""
import os
import wave

import numpy as np
from scipy import signal

SR = 44100
DUR = 30.0
N = int(SR * DUR)
BAR = 2.5
E8 = BAR / 8          # eighth note
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
# D hijaz: D Eb F# G A Bb C
D, Eb, Fs, G, A, Bb, C = 62, 63, 66, 67, 69, 70, 72
# per-bar harmony (root, pad notes)
HARM = [('D', [50, 57, 62]), ('D', [50, 57, 62]), ('G', [43, 55, 58, 62]), ('D', [50, 57, 62]),
        ('C', [48, 55, 60, 63]), ('D', [50, 57, 62]), ('G', [43, 55, 58, 62]), ('D', [50, 57, 66]),
        ('C', [48, 55, 60, 63]), ('G', [43, 55, 58, 62]), ('A', [45, 57, 61, 64]), ('D', [50, 57, 62, 66])]
ROOTS = {'D': 38, 'G': 43, 'C': 36, 'A': 45}
for b, (r, notes) in enumerate(HARM):
    t0 = b * BAR
    add(pad([note(n) for n in notes], BAR + 0.6, cutoff=700 + 60 * b), t0 - 0.3, 0.16, send=0.3)
    if b >= 1:
        add(sub(note(ROOTS[r]), BAR * 0.95), t0, 0.5)
        add(sub(note(ROOTS[r] + 7), E8 * 1.8), t0 + 4 * E8, 0.3)

# darbuka: maqsum  D T . T D . T .   (bars 1..10), intro bar sparse, final bar hit
MAQSUM = [('D', 0), ('T', 1), ('T', 3), ('D', 4), ('T', 6)]
for b in range(1, 11):
    t0 = b * BAR
    for kind, pos in MAQSUM:
        if kind == 'D':
            add(doum(1.0 if pos == 0 else 0.8), t0 + pos * E8, 0.55)
        else:
            add(tek(0.9), t0 + pos * E8, 0.4, pan=0.25)
    for s in range(16):
        if s % 2:
            add(shaker(), t0 + s * E8 / 2, 1.0, pan=-0.35)
    if b in (4, 8):   # little fill: ka-ka on the last 16ths
        add(tek(0.5, 0.6), t0 + 7 * E8, 0.35, pan=-0.2)
        add(tek(0.6, 0.6), t0 + 7.5 * E8, 0.35, pan=0.2)
add(doum(0.7), 0.0, 0.5)
add(doum(1.2), 11 * BAR, 0.7)

# oud: intro flourish (tremolo on D, run up), phrases, final cadence
def play(seq, t0, step=E8, vel=0.8, pan=-0.15):
    t = t0
    for n, d in seq:
        if n is not None:
            add(oud(note(n), max(0.5, d * step + 0.4), vel), t, 0.55, pan=pan, send=0.35)
        t += d * step
    return t

# tremolo on D4 (16ths) then run A Bb C# D
for k in range(8):
    add(oud(note(D), 0.25, 0.35 + 0.05 * k), 0.05 + k * E8 / 2, 0.5, pan=-0.1, send=0.3)
play([(A, 1), (Bb, 1), (66 + 7, 1), (74, 1)], 1.25, E8 / 2 * 2, 0.9)

phrase_a = [(A, 1), (Bb, 1), (A, 1), (G, 1), (Fs, 2), (G, 1), (A, 1)]
phrase_b = [(D + 12, 2), (C, 1), (Bb, 1), (A, 2), (G, 1), (Fs, 1)]
phrase_c = [(Fs, 1), (G, 1), (A, 2), (Bb, 1), (A, 1), (G, 2)]
phrase_d = [(Eb, 1), (Fs, 1), (G, 1), (A, 1), (D, 4)]
for b, ph in ((2, phrase_a), (3, phrase_c), (5, phrase_a), (6, phrase_b), (7, phrase_d),
              (8, phrase_c), (9, phrase_b), (10, phrase_a)):
    play(ph, b * BAR, E8, 0.7 if b % 2 else 0.8)
# final cadence
play([(A, 1), (Fs, 1), (Eb, 1), (D, 5)], 11 * BAR, E8, 0.9)
for n in (D - 12, A - 12, D, Fs):
    add(oud(note(n), 2.5, 0.5), 11 * BAR + 3 * E8, 0.4, send=0.5)
add(ding(), 11 * BAR, 0.18, send=0.6)

# ───────── foley per scene ─────────
S = lambda i: i * BAR
add(bubbles(2.6, 45), S(2), 0.9, pan=0.1)                        # 01 boil
add(pour(1.2), S(3) + 0.1, 0.8); add(rattle(1.4), S(3) + 0.25, 0.7, pan=-0.2)   # 02 strain
add(sizzle(2.6, 160, 0.15), S(4), 0.55)                           # 03 caramelize
add(pour(1.0), S(5) + 0.2, 0.7, pan=0.2); add(bubbles(2.0, 25), S(5) + 0.6, 0.6)  # 04 combine
add(clink(), S(6) + 0.08, 0.9, pan=0.15, send=0.2)               # 05 lid
for k in range(12):
    add(tick(), S(6) + 0.5 + k * E8 / 2 * 1.5, 1.0, pan=0.4)     # timer
add(bubbles(2.4, 12, 200, 500), S(6), 0.5)
add(whoosh(0.8, 0.25), S(7) - 0.3, 1.0)                           # time-lapse
add(sizzle(2.6, 420, 0.3), S(8), 0.8)                             # 06 fry
add(sizzle(1.4, 90, 0.03), S(9) + 0.2, 0.5)                       # 07 drain crackle
add(rustle(1.2), S(10) + 0.3, 0.8, pan=-0.1)                      # 08 sprinkle
for i in range(1, 12):
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
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'soundtrack.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out)
