"""Procedural soundtrack for the motion reel.

120 BPM, 20 s, A minor. Every visual hit in reel.js lands on a beat defined here:
  0.0-2.0  intro: pad + three plucks on the ball bounces (0.5 / 1.0 / 1.5), whoosh into the drop
  2.0-16.0 groove: four-on-the-floor, claps, hats, offbeat bass, arp from 8 s
  16.0-17.875 build: accelerating snare roll + riser, silence gap
  18.0-20.0 impact + end card, two soft pops for the final dot bounce
Writes soundtrack.wav next to this file.
"""
import os
import wave

import numpy as np
from scipy import signal

SR = 44100
DUR = 20.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)
SEND_L = np.zeros(N)  # reverb send
SEND_R = np.zeros(N)


def add(sig, start, gain=1.0, pan=0.0, send=0.0):
    i = int(round(start * SR))
    if i >= N:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    n = min(len(sig), N - i)
    gl = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
    gr = gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    L[i:i + n] += sig[:n] * gl
    R[i:i + n] += sig[:n] * gr
    if send:
        SEND_L[i:i + n] += sig[:n] * gl * send
        SEND_R[i:i + n] += sig[:n] * gr * send


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def saw(freq, t):
    ph = (freq * t) % 1.0
    return 2 * ph - 1


def note(n):  # MIDI -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


# ---------------- instruments ----------------
def kick(dur=0.5, punch=1.0):
    t = tt(dur)
    f = 44 + 120 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 6.5)
    click = hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 350) * 0.35
    return np.tanh((body + click) * 1.8 * punch) * 0.9


def clap():
    t = tt(0.4)
    n = bp(rng.standard_normal(len(t)), 900, 5000)
    env = np.zeros(len(t))
    for k, off in enumerate((0.0, 0.011, 0.022)):
        m = t >= off
        env[m] += np.exp(-(t[m] - off) * (140 if k < 2 else 16)) * (0.7 if k < 2 else 1.0)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 40) * 0.25
    return (n * env + tone) * 0.55


def snare(vel=1.0):
    t = tt(0.22)
    n = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 22)
    tone = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 35)
    return (n * 0.6 + tone * 0.4) * vel


def hat(open_=False):
    t = tt(0.45 if open_ else 0.08)
    n = hp(rng.standard_normal(len(t)), 7500, 4)
    return n * np.exp(-t * (11 if open_ else 70)) * 0.35


def pluck(freq, dur=0.6, bright=4000, decay=7.0):
    t = tt(dur)
    x = (saw(freq, t) + 0.5 * np.sign(np.sin(2 * np.pi * freq * 1.005 * t))) * np.exp(-t * decay)
    # filter envelope: bright attack that closes down
    y = np.zeros_like(x)
    seg = 512
    for s in range(0, len(x), seg):
        fc = 300 + bright * np.exp(-(s / SR) * 9)
        y[s:s + seg] = lp(x[s:s + seg], fc, 1)
    return y * 0.4


def pop(freq, dur=0.25):
    t = tt(dur)
    f = freq * (1 + 0.6 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * 0.6


def supersaw(freqs, dur, cutoff=1400, attack=0.08, release=0.3, voices=5, spread=0.012):
    t = tt(dur)
    x = np.zeros(len(t))
    for f in freqs:
        for v in range(voices):
            det = 1 + spread * (v - (voices - 1) / 2) / ((voices - 1) / 2)
            x += saw(f * det, t + rng.random() / f)
    x /= len(freqs) * voices
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / release).clip(0)
    return lp(x, cutoff, 2) * env


def bass(freq, dur):
    t = tt(dur)
    x = saw(freq, t) * 0.6 + np.sin(2 * np.pi * freq * t) * 0.8
    env = np.minimum(1, t / 0.005) * np.exp(-t * 3) * np.minimum(1, (dur - t) / 0.02).clip(0)
    return np.tanh(lp(x, 900, 2) * 1.5) * env * 0.5


def whoosh(dur, lo=300, hi=6000, rev=False):
    t = tt(dur)
    n = rng.standard_normal(len(t))
    y = np.zeros_like(n)
    seg = 512
    for s in range(0, len(n), seg):
        p = s / len(n)
        p = p if not rev else p
        fc = lo * (hi / lo) ** (p ** 2)
        y[s:s + seg] = bp(n[s:s + seg], fc * 0.7, min(fc * 1.4, SR / 2 - 200), 1)
    env = (t / dur) ** 2.2 if rev else np.sin(np.pi * t / dur) ** 2
    return y * env * 0.9


def impact():
    t = tt(2.2)
    f = 30 + 90 * np.exp(-t * 12)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    crash = hp(rng.standard_normal(len(t)), 3500) * np.exp(-t * 2.4) * 0.35
    thump = kick(0.6, 1.5)
    out = np.tanh(sub * 1.6) * 0.9 + crash
    out[:len(thump)] += thump
    return out


# ---------------- arrangement ----------------
CH = {
    'Am': [57, 60, 64], 'F': [53, 57, 60], 'C': [48, 52, 55], 'G': [55, 59, 62],
}
ROOT = {'Am': 45, 'F': 41, 'C': 36, 'G': 43}
bars = ['Am', 'Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am']  # 10 bars of 2 s

# intro pad (filtered, swelling)
add(supersaw([note(n) for n in CH['Am']], 2.0, cutoff=700, attack=1.2, release=0.1), 0.0, 0.35, send=0.4)
# plucks on the ball bounces + soft thumps
for t0, n in ((0.5, 76), (1.0, 81), (1.5, 84)):
    add(pluck(note(n), 0.7), t0, 0.55, pan=(t0 - 1.0), send=0.5)
    add(pop(90, 0.2), t0, 0.5)
add(whoosh(0.5, 400, 9000, rev=True), 1.5, 0.35, send=0.3)

# groove 2..16
duck = np.ones(N)
for b in range(4, 32):  # beats from 2.0 s to 16.0 s
    t0 = b * BEAT
    add(kick(), t0, 0.95)
    i = int(t0 * SR)
    m = min(N - i, int(0.4 * SR))
    duck[i:i + m] = np.minimum(duck[i:i + m], 1 - 0.75 * np.exp(-np.arange(m) / SR * 11))
    if b % 2 == 1:
        add(clap(), t0, 0.7, send=0.35)
    add(hat(open_=(b % 4 == 3)), t0 + 0.25, 0.5, pan=0.3)
    if t0 >= 8.0:  # 16th hats
        add(hat(), t0 + 0.125, 0.22, pan=-0.35)
        add(hat(), t0 + 0.375, 0.22, pan=-0.35)

# bass + pad for bars 1..7 (2..16 s)
bassbus = np.zeros(N)
padbus = np.zeros(N)
for bi in range(1, 8):
    ch = bars[bi]
    t0 = bi * 2.0
    pad = supersaw([note(n) for n in CH[ch]] + [note(CH[ch][0] + 12)], 2.0,
                   cutoff=900 + 250 * bi, attack=0.02, release=0.05)
    i = int(t0 * SR)
    padbus[i:i + len(pad)] += pad[:N - i]
    for k in range(4):
        bt = t0 + k * BEAT + 0.25
        bn = bass(note(ROOT[ch]), 0.22)
        j = int(bt * SR)
        bassbus[j:j + len(bn)] += bn[:N - j]
        if bi >= 4:
            bn2 = bass(note(ROOT[ch] + 12), 0.1)
            j2 = int((bt + 0.125) * SR)
            bassbus[j2:j2 + len(bn2)] += bn2[:N - j2] * 0.5
L += bassbus * duck * 0.9
R += bassbus * duck * 0.9
L += padbus * duck * 0.28
R += padbus * duck * 0.28
SEND_L += padbus * 0.08
SEND_R += padbus * 0.08

# arp 8..16 (16ths through chord tones) with ping-pong echo
for bi in range(4, 8):
    tones = CH[bars[bi]]
    seq = [tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[1] + 24]
    for k in range(16):
        t0 = bi * 2.0 + k * 0.125
        p = pluck(note(seq[k % 4]), 0.35, bright=3000, decay=12)
        add(p, t0, 0.2, pan=-0.2, send=0.25)
        add(p, t0 + 0.375, 0.08, pan=0.7)

# montage stutter accents (12..14)
for t0 in (12.0, 12.5, 13.0, 13.5):
    add(whoosh(0.18, 2000, 12000), t0 - 0.02, 0.25, pan=0.5 if t0 % 1 else -0.5)

# zoom-through-the-O whoosh (3.55 -> 4.0) and tunnel whoosh (15.55 -> 16.0)
add(whoosh(0.45, 300, 8000, rev=True), 3.55, 0.35, send=0.2)
add(whoosh(0.45, 300, 8000, rev=True), 15.55, 0.35, send=0.2)

# data scene: counter ticks
tick_times = 14.1 + (1 - (1 - np.linspace(0, 1, 26)) ** 2) * 1.1
for k, t0 in enumerate(tick_times):
    add(pop(1800 + 40 * k, 0.03), t0, 0.07, pan=np.sin(k) * 0.5)

# build 16..17.875
roll = [16 + k * 0.25 for k in range(4)] + [17 + k * 0.125 for k in range(4)] + \
       [17.5 + k * 0.0625 for k in range(6)]
for k, t0 in enumerate(roll):
    add(snare(0.35 + 0.65 * k / len(roll)), t0, 0.6, send=0.3)
for t0 in (16.0, 16.5, 17.0, 17.5):
    add(kick(0.3, 0.8), t0, 0.7)
t = tt(1.875)
riser = saw(220 * 2 ** (t / 1.875 * 2.5), t) * 0.5
riser = lp(riser, 3000) * (t / 1.875) ** 2
add(riser, 16.0, 0.22, send=0.4)
add(whoosh(1.875, 200, 12000, rev=True), 16.0, 0.4)
add(supersaw([note(n) for n in CH['G']], 1.875, cutoff=2500, attack=1.5, release=0.02), 16.0, 0.3)

# silence gap 17.875..18.0
g0, g1 = int(17.875 * SR), int(18.0 * SR)
L[g0:g1] *= np.linspace(1, 0, g1 - g0) ** 4
R[g0:g1] *= np.linspace(1, 0, g1 - g0) ** 4
SEND_L[g0:g1] = 0
SEND_R[g0:g1] = 0

# impact + final chord
add(impact(), 18.0, 1.0, send=0.35)
final = supersaw([note(n) for n in [45, 57, 60, 64, 71]], 2.0, cutoff=2200, attack=0.01, release=1.2)
add(final, 18.0, 0.45, send=0.6)
add(pluck(note(88), 1.0, bright=6000, decay=4), 18.0, 0.3, send=0.8)
# final dot bounce
add(pop(1100, 0.2), 19.25, 0.35, send=0.5)
add(pop(1500, 0.2), 19.45, 0.22, send=0.5)

# ---------------- reverb + master ----------------
ir_t = tt(2.4)
irL = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 2.8)
irR = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 2.8)
irL = lp(irL, 6000)
irR = lp(irR, 6000)
wetL = signal.fftconvolve(SEND_L, irL)[:N] * 0.06
wetR = signal.fftconvolve(SEND_R, irR)[:N] * 0.06
L += wetL
R += wetR

mix = np.stack([L, R], axis=1)
mix = hp(mix.T, 25).T
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) / 0.89
fade = int(0.3 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
mix[:int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'soundtrack.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out)
