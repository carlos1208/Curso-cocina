"""Synth instruments, kitchen foley generators and music style presets (shared with receta-en-movimiento's audio.py).
Import after setting SR; everything is numpy/scipy, no samples."""
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(21)


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
