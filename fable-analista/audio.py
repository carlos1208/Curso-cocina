"""Banda sonora procedural para el explainer de Fable 5.2.

108 BPM, 172 tiempos + 1,5 s de cola, en re menor / fa mayor. La estructura sigue a video.js:
  0-8     intro: pad y plucks
  8-80    parte 1 (6 escenas de 12 tiempos): groove a medio tiempo, Dm9 | Bbmaj7 | C
  80-88   puente: sin batería, subida y golpe al cambiar a papel
  88-160  parte 2 (6 escenas de 12 tiempos): más luminosa, Bb | F | C
  160-172 cierre: Bb | C | F y cola
Cada cambio de escena lleva un soplido antes y un golpe suave al entrar; las cifras llevan una campana.
Escribe soundtrack.wav junto a este archivo.
"""
import os
import wave

import numpy as np
from scipy import signal

SR = 44100
BPM = 108
BEAT = 60 / BPM
TOTAL_BEATS = 172
TAIL = 1.5
DUR = TOTAL_BEATS * BEAT + TAIL
N = int(SR * DUR)
rng = np.random.default_rng(11)

L = np.zeros(N)
R = np.zeros(N)
SL = np.zeros(N)  # envío a reverb
SR_ = np.zeros(N)


def add(sig, beat, gain=1.0, pan=0.0, send=0.0):
    i = int(round(beat * BEAT * SR))
    if i >= N or i < 0:
        return
    n = min(len(sig), N - i)
    gl = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
    gr = gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    L[i:i + n] += sig[:n] * gl
    R[i:i + n] += sig[:n] * gr
    if send:
        SL[i:i + n] += sig[:n] * gl * send
        SR_[i:i + n] += sig[:n] * gr * send


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR / 2 - 200) / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def saw(f, dur, det=0.0):
    ph = f * (1 + det) * tt(dur)
    return 2 * (ph - np.floor(ph + 0.5))


def env(n, a, r):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** 1.5
    e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def pad_note(m, dur, bright=1.0):
    f = mf(m)
    x = saw(f, dur, 0.0035) + saw(f, dur, -0.0035) + 0.6 * np.sin(2 * np.pi * f * tt(dur))
    x = lp(x, (700 + f * 1.6) * bright, 2)
    return x * env(len(x), 0.45, 0.7)


def pluck(m, dur=0.4, bright=1.0):
    f, t = mf(m), tt(dur)
    x = (0.55 * saw(f, dur) + np.sin(2 * np.pi * f * t)) * np.exp(-t * 9)
    return lp(x, 2400 * bright, 2)


def bell(m, dur=1.8):
    f, t = mf(m), tt(dur)
    x = np.sin(2 * np.pi * f * t + 1.4 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 7)) * np.exp(-t * 3.0)
    x += 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 5)
    x[:60] *= np.linspace(0, 1, 60)
    return x


def bass_note(m, dur):
    f, t = mf(m), tt(dur)
    x = np.sin(2 * np.pi * f * t) + 0.35 * lp(saw(f, dur), 420, 2)
    return x * env(len(x), 0.008, min(0.08, dur / 3)) * np.exp(-t * 1.8)


def kick(soft=1.0):
    t = tt(0.34)
    f = 44 + 80 * np.exp(-t * 30)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9.5)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 220) * 0.12 * soft
    return x + click


def clap():
    t = tt(0.22)
    e = sum(np.exp(-np.clip(t - d, 0, None) * 38) * (t >= d) for d in (0.0, 0.011, 0.023))
    return bp(rng.standard_normal(len(t)), 900, 3800) * e / 2.2


def hat(open_=False):
    t = tt(0.22 if open_ else 0.05)
    return hp(rng.standard_normal(len(t)), 7500, 3) * np.exp(-t * (16 if open_ else 80))


def tick():
    t = tt(0.018)
    return bp(rng.standard_normal(len(t)), 1800, 5200) * np.exp(-t * 260)


def whoosh(dur):
    t = tt(dur)
    x = rng.standard_normal(len(t))
    x = hp(lp(x, 6500), 900) * (t / dur) ** 2.6
    x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return x


def impact():
    t = tt(0.9)
    x = np.sin(2 * np.pi * (48 + 26 * np.exp(-t * 18)) * t) * np.exp(-t * 5.5)
    return x + lp(rng.standard_normal(len(t)), 500) * np.exp(-t * 14) * 0.5


def riser(dur):
    t = tt(dur)
    f = 220 * 2 ** (2 * (t / dur) ** 2)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + hp(rng.standard_normal(len(t)), 2500) * 0.5
    return x * (t / dur) ** 2


# ── armonía ──
DM9 = (38, [50, 57, 60, 64, 65])
BBM7 = (34, [46, 53, 57, 62, 65])
CADD = (36, [48, 55, 60, 62, 64])
BB9 = (34, [46, 53, 58, 60, 62])
FADD = (41, [41, 53, 57, 60, 67])
CMAJ = (36, [48, 55, 60, 64, 67])
P1 = [DM9, BBM7, CADD]
P2 = [BB9, FADD, CMAJ]


def chord_pad(ch, beat, beats, gain=0.085, bright=1.0):
    for k, m in enumerate(ch[1]):
        add(pad_note(m, beats * BEAT + 0.6, bright), beat, gain, pan=(-0.5 + k * 0.25), send=0.5)


def arp(ch, beat, beats, step=0.5, octave=12, gain=0.12, bright=1.0):
    notes = [m + octave for m in ch[1][1:]]
    seq = notes + notes[-2:0:-1]
    for i in range(int(beats / step)):
        add(pluck(seq[i % len(seq)], bright=bright), beat + i * step, gain * (1.0 if i % 2 == 0 else 0.75),
            pan=(-0.45 if i % 2 == 0 else 0.45), send=0.45)


def bass_bar(ch, beat, busy=False):
    pat = [(0, 1.3), (1.5, 0.45), (2, 1.3), (3.5, 0.45)] if not busy else [(0, 0.9), (1, 0.45), (1.5, 0.45), (2, 0.9), (3, 0.45), (3.5, 0.45)]
    for off, d in pat:
        add(bass_note(ch[0] + (12 if ch[0] < 36 else 0), d * BEAT), beat + off, 0.42)


def drums_half(beat, fill=False):
    add(kick(), beat, 0.78)
    add(kick(), beat + 2, 0.7)
    if fill:
        add(kick(0.6), beat + 3.5, 0.5)
    add(clap(), beat + 1, 0.2, send=0.35)
    add(clap(), beat + 3, 0.22, send=0.35)
    for i in range(8):
        add(hat(), beat + i * 0.5, 0.075 if i % 2 == 0 else 0.05, pan=0.25)


def drums_four(beat, fill=False):
    for i in range(4):
        add(kick(0.7), beat + i, 0.68)
    add(clap(), beat + 1, 0.2, send=0.35)
    add(clap(), beat + 3, 0.22, send=0.35)
    for i in range(8):
        add(hat(), beat + i * 0.5, 0.07 if i % 2 == 0 else 0.095, pan=0.25)
    add(hat(True), beat + 3.5, 0.06, pan=-0.3)
    if fill:
        for i in range(4):
            add(clap(), beat + 3 + i * 0.25, 0.08 + 0.03 * i, send=0.3)


def scene_change(beat, strong=0.3):
    add(whoosh(BEAT * 1.5), beat - 1.5, 0.16, send=0.5)
    add(impact(), beat, strong, send=0.3)


# ── intro (0-8) ──
chord_pad(DM9, 0, 8, 0.08, 0.8)
add(impact(), 0, 0.3, send=0.4)
for i, m in enumerate([62, 65, 69, 72, 74, 72, 69, 77]):
    add(pluck(m, 0.6), i, 0.13, pan=(-0.4 if i % 2 else 0.4), send=0.6)
add(bell(74), 0.8, 0.12, send=0.6)

# ── parte 1 (8-80) ──
for s in range(6):
    b0 = 8 + s * 12
    scene_change(b0, 0.34)
    for k, ch in enumerate(P1):
        bb = b0 + k * 4
        chord_pad(ch, bb, 4)
        bass_bar(ch, bb)
        drums_half(bb, fill=(k == 2))
        arp(ch, bb, 4, step=(1.0 if s == 0 else 0.5), gain=(0.1 if s == 0 else 0.115))
    add(bell(81 if s % 2 == 0 else 77), b0 + 5.4, 0.15, pan=0.2, send=0.6)  # entra la cifra
    add(bell(84), b0 + 7.2, 0.08, pan=-0.2, send=0.6)

# tecleo en la escena 3 (pregunta y respuesta) y en la 6 de la parte 2 (consulta SQL)
for a, e in ((32 + 1.9, 32 + 3.3), (32 + 3.9, 32 + 6.6), (148 + 2.1, 148 + 3.8)):
    b = a
    while b < e:
        add(tick(), b, 0.05 + 0.03 * rng.random(), pan=rng.uniform(-0.3, 0.3))
        b += 0.125 + 0.06 * rng.random()

# ── puente (80-88) ──
add(whoosh(BEAT * 1.5), 80 - 1.5, 0.16, send=0.5)
add(impact(), 80, 0.3, send=0.4)
chord_pad(CADD, 80, 4, 0.085, 0.7)
for i, m in enumerate([72, 74, 79, 76]):
    add(pluck(m, 0.7), 80 + i, 0.12, pan=(-0.4 if i % 2 else 0.4), send=0.7)
add(riser(BEAT * 3.5), 80, 0.07, send=0.4)
add(impact(), 83.7, 0.5, send=0.5)  # paso a papel
chord_pad(CMAJ, 84, 4, 0.085, 1.1)
for i in range(8):
    add(pluck([72, 76, 79, 84][i % 4], 0.5, 1.2), 84 + i * 0.5, 0.11, pan=(-0.4 if i % 2 else 0.4), send=0.5)
for i in range(6):
    add(clap(), 86.5 + i * 0.25, 0.05 + 0.025 * i, send=0.3)

# ── parte 2 (88-160) ──
for s in range(6):
    b0 = 88 + s * 12
    scene_change(b0, 0.36 if s else 0.5)
    add(bell(77 if s % 2 == 0 else 81), b0 + 0.15, 0.15, pan=-0.2, send=0.6)  # entra el número
    for k, ch in enumerate(P2):
        bb = b0 + k * 4
        chord_pad(ch, bb, 4, 0.085, 1.15)
        bass_bar(ch, bb, busy=True)
        drums_four(bb, fill=(k == 2))
        arp(ch, bb, 4, octave=12, gain=0.115, bright=1.25)
    add(bell(84), b0 + 7.0, 0.08, pan=0.2, send=0.6)

# ── cierre (160-172) ──
add(whoosh(BEAT * 1.5), 160 - 1.5, 0.16, send=0.5)
add(impact(), 160, 0.5, send=0.5)
chord_pad(BB9, 160, 4, 0.09, 0.9)
chord_pad(CMAJ, 164, 4, 0.09, 0.9)
chord_pad(FADD, 168, 6.5, 0.1, 1.0)
for bb, ch in ((160, BB9), (164, CMAJ)):
    add(kick(), bb, 0.6)
    add(bass_note(ch[0] + (12 if ch[0] < 36 else 0), 3.5 * BEAT), bb, 0.4)
    arp(ch, bb, 4, step=1.0, gain=0.1)
add(kick(), 168, 0.6)
add(bass_note(41, 5 * BEAT), 168, 0.42)
for i, m in enumerate([65, 69, 72, 77]):
    add(pluck(m, 0.9), 168 + i * 0.5, 0.11, pan=(-0.4 if i % 2 else 0.4), send=0.7)
add(bell(77), 168, 0.16, send=0.7)
add(bell(84), 170, 0.09, send=0.7)

# ── reverb, máster ──
irn = int(1.9 * SR)
ir_t = np.arange(irn) / SR
irl = rng.standard_normal(irn) * np.exp(-ir_t * 3.4)
irr = rng.standard_normal(irn) * np.exp(-ir_t * 3.4)
irl, irr = hp(lp(irl, 5200), 220), hp(lp(irr, 5200), 220)
wl = signal.fftconvolve(SL, irl)[:N] * 0.02
wr = signal.fftconvolve(SR_, irr)[:N] * 0.02
L += wl
R += wr

L, R = hp(L, 28), hp(R, 28)
fade = np.ones(N)
nf = int(1.3 * SR)
fade[-nf:] = np.linspace(1, 0, nf) ** 1.6
L *= fade
R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
drive = 0.72 / peak
L, R = np.tanh(L * drive), np.tanh(R * drive)
peak = max(np.abs(L).max(), np.abs(R).max())
g = 10 ** (-1 / 20) / peak
out = np.stack([L * g, R * g], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'soundtrack.wav')
with wave.open(path, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f'soundtrack.wav · {DUR:.2f} s')
