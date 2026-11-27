"""Banda sonora original de "Auto-mejora recursiva" (195 s, 96 BPM, re menor).

Lee events.json (lo exporta `node render.cjs --events` desde video.js) para que cada
tecla, golpe, clic y transición suene en el mismo fotograma en que se ve.
Escribe soundtrack.wav (44,1 kHz, estéreo, 16 bits). Solo numpy y scipy.
"""
import json
import os
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = os.path.dirname(os.path.abspath(__file__))
SR = 44100
BPM = 96
BEAT = 60 / BPM          # 0,625 s
BAR = 4 * BEAT           # 2,5 s
meta = json.load(open(os.path.join(ROOT, 'events.json')))
TOTAL = meta['total']
N = int(TOTAL * SR) + SR
rng = np.random.default_rng(7)
scene = {s['id']: (s['t0'], s['t0'] + s['dur']) for s in meta['scenes']}

music = np.zeros((2, N))
sfx = np.zeros((2, N))


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def put(bus, t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[0, i:i + len(sig)] += sig * gain * l * 1.414
    bus[1, i:i + len(sig)] += sig * gain * r * 1.414


def tt(d):
    return np.arange(int(d * SR)) / SR


# ───────────── armonía: un acorde por compás ─────────────
CH = {
    'Dm9': [50, 53, 57, 60, 64], 'Bb': [46, 53, 57, 60, 62], 'F': [41, 53, 57, 60, 64],
    'C': [48, 55, 60, 62, 64], 'Gm7': [43, 50, 53, 58, 62], 'A': [45, 52, 57, 61, 64], 'F9': [41, 53, 57, 60, 64, 67],
}
CYCLE = ['Dm9', 'Bb', 'F', 'C']
NB = int(round(TOTAL / BAR))
bars = []
for b in range(NB):
    t0 = b * BAR
    if t0 < scene['idea'][0]:
        c = 'Dm9'
    elif scene['importa'][0] <= t0 < scene['importa'][0] + 4 * BAR:
        c = ['Dm9', 'Bb', 'Gm7', 'A'][int((t0 - scene['importa'][0]) / BAR)]
    elif t0 >= scene['cierre'][0]:
        k = int((t0 - scene['cierre'][0]) / BAR)
        c = ['Bb', 'Bb', 'C', 'C', 'F9', 'F9', 'F9'][min(k, 6)]
    else:
        c = CYCLE[(b // 2) % 4]
    bars.append(c)


def section(t):
    for sid, (a, b) in scene.items():
        if a <= t < b:
            return sid
    return 'cierre'


# intensidad: abre el filtro del pad y sube capas
LEVEL = {'intro': 0.2, 'idea': 0.45, 'origen': 0.6, 'bucle': 0.88, 'puertas': 0.5, 'importa': 0.62, 'resumen': 0.78, 'cierre': 0.32}
tgrid = np.arange(N) / SR
inten = np.array([LEVEL[section(x)] for x in np.arange(0, N / SR, 0.05)])
inten = np.convolve(inten, np.ones(40) / 40, mode='same')        # rampas de 2 s
inten = np.interp(tgrid, np.arange(len(inten)) * 0.05, inten)

# ───────────── pad: sierras desafinadas, oscuro + brillante ─────────────
segs = []
for b, c in enumerate(bars):
    if segs and segs[-1][2] == c:
        segs[-1][1] = (b + 1) * BAR
    else:
        segs.append([b * BAR, (b + 1) * BAR, c])
pad = np.zeros((2, N))
for s, e, c in segs:
    d = e - s + 1.6
    x = tt(d)
    env = np.minimum(1, x / 0.9) * np.clip((e - s + 1.4 - x) / 1.4, 0, 1)
    for m in CH[c]:
        for side, det in ((0, -0.07), (1, 0.07)):
            f = mf(m + det)
            ph = rng.random()
            v = (2 * ((f * x + ph) % 1) - 1) + 0.6 * (2 * ((f * 1.0035 * x + ph * 0.5) % 1) - 1)
            i = int(s * SR)
            n = min(len(x), N - i)
            pad[side, i:i + n] += (v * env)[:n] * 0.05
dark = np.stack([lp(ch, 650) for ch in pad])
bright = np.stack([lp(ch, 2600) for ch in pad])
pad = dark * (1 - inten) + bright * inten
music += pad * (0.75 + 0.35 * inten)

# ───────────── percusión y bajo ─────────────
def kick():
    x = tt(0.45)
    f = 44 + 80 * np.exp(-x * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7) + 0.3 * np.exp(-x * 120) * rng.standard_normal(len(x)) * 0.3


def hat(open_=False):
    x = tt(0.12 if open_ else 0.05)
    return hp(rng.standard_normal(len(x)), 7000) * np.exp(-x * (25 if open_ else 80))


def pluck(f, d=0.35, bright=1.0):
    x = tt(d)
    mod = (1.2 * bright) * np.exp(-x * 18) * np.sin(2 * np.pi * 2 * f * x)
    return np.sin(2 * np.pi * f * x + mod) * np.exp(-x * 9) * np.minimum(1, x / 0.004)


def bass_note(f, d):
    x = tt(d)
    v = np.sin(2 * np.pi * f * x) + 0.35 * np.tanh(2.5 * np.sin(2 * np.pi * f * x))
    return v * np.minimum(1, x / 0.01) * np.exp(-x * 2.2) * np.clip((d - x) / 0.05, 0, 1)


K = kick()
duck = np.ones(N)
for b in range(NB):
    sec = section(b * BAR + 0.01)
    root = CH[bars[b]][0]
    while root > 47:
        root -= 12
    for q in range(4):
        t = b * BAR + q * BEAT
        s = section(t + 0.01)
        idea_b = s == 'idea' and t >= scene['idea'][0] + 3 * BAR
        kick_on = (s in ('origen', 'resumen') and q in (0, 2)) or s == 'bucle' or (idea_b and q == 0) \
            or (s == 'importa' and t >= scene['importa'][0] + 4 * BAR and q in (0, 2))
        if kick_on and t < TOTAL - 1:
            put(music, t, K, 0.55)
            i = int(t * SR)
            d = np.minimum(1, 0.55 + 0.45 * tt(0.3) / 0.3)
            duck[i:i + len(d)] = np.minimum(duck[i:i + len(d)], d)
        if s in ('bucle', 'resumen'):
            put(music, t + BEAT / 2, hat(), 0.09, pan=0.3)
            if s == 'bucle' and t >= scene['bucle'][0] + 8 * BAR:
                put(music, t + BEAT / 4, hat(), 0.04, pan=-0.3)
                put(music, t + 3 * BEAT / 4, hat(), 0.04, pan=-0.3)
        # bajo
        f = mf(root)
        if s in ('bucle', 'resumen'):
            for h in (0, 1):
                put(music, t + h * BEAT / 2, bass_note(f, BEAT / 2 * 0.9), 0.2)
        elif s in ('origen', 'importa') or idea_b:
            put(music, t, bass_note(f, BEAT * 0.95), 0.2)
        elif s in ('idea', 'puertas') and q == 0:
            put(music, t, bass_note(f, BAR * 0.95), 0.2)
    # arpegio
    tones = sorted(CH[bars[b]][1:])
    pat = tones + tones[::-1][1:-1]
    sub = {'origen': 2, 'bucle': 4, 'resumen': 2, 'puertas': 1, 'importa': 2}.get(sec, 0)
    if sub:
        for k in range(4 * sub):
            t = b * BAR + k * BEAT / sub
            m = pat[k % len(pat)] + 12
            g = 0.075 if sub < 4 else 0.055
            put(music, t, pluck(mf(m), 0.3 if sub == 4 else 0.45, 0.8 + 0.4 * (k % 2)), g, pan=0.45 if k % 2 else -0.45)
    if sec == 'cierre':
        for k in range(0, 4, 2):
            m = sorted(CH[bars[b]])[-(1 + (b + k) % 3)] + 12
            put(music, b * BAR + k * BEAT, pluck(mf(m), 1.8, 0.6), 0.07, pan=0.35 if k else -0.35)

music *= duck

# acorde final que se apaga despacio
x = tt(6)
fin = sum(pluck(mf(m + 12), 6, 0.5) for m in CH['F9']) / 3
put(music, scene['cierre'][0] + 4 * BAR, fin * np.exp(-x * 0.2), 0.12)

# ───────────── efectos sincronizados con la imagen ─────────────
PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89]


def noise(d):
    return rng.standard_normal(int(d * SR))


for ev in meta['events']:
    t, kind, v = ev['t'], ev['type'], ev['v']
    if kind == 'key':
        x = tt(0.03)
        click = bp(noise(0.03), 1800 + 2500 * v, 6500) * np.exp(-x * 260) + 0.4 * np.sin(2 * np.pi * (160 + 60 * v) * x) * np.exp(-x * 120)
        put(sfx, t, click, 0.32, pan=-0.3 + 0.6 * v)
    elif kind == 'whoosh':
        d = 1.0
        x = tt(d)
        env = np.sin(np.pi * np.clip(x / d, 0, 1)) ** 2
        n = noise(d)
        sw = bp(n, 300, 1400) * (1 - x / d) + bp(n, 1400, 6000) * (x / d)
        put(sfx, t - 0.15, sw * env, 0.16 if v == 0 else 0.22, pan=-0.2)
    elif kind == 'impact':
        x = tt(2.5)
        boom = np.sin(2 * np.pi * np.cumsum(38 + 40 * np.exp(-x * 6)) / SR) * np.exp(-x * 1.6)
        boom += 0.5 * lp(noise(2.5), 900) * np.exp(-x * 5)
        put(sfx, t, boom, 0.5 if v == 0 else 0.35)
        put(sfx, t, pluck(mf(74), 2.5, 0.4) * np.exp(-x * 0.5), 0.12)
    elif kind in ('pop', 'blip'):
        m = PENTA[int(v) % len(PENTA)] + (0 if kind == 'pop' else 12)
        x = tt(0.25)
        f = mf(m) * (1 + 0.5 * np.exp(-x * 60))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * (22 if kind == 'pop' else 16))
        put(sfx, t, s, 0.13 if kind == 'pop' else 0.1, pan=0.25 * np.sin(v * 2.1))
    elif kind == 'tick':
        x = tt(0.12)
        s = np.sin(2 * np.pi * mf(PENTA[6 + int(v)] + 12) * x) * np.exp(-x * 45) + 0.3 * hp(noise(0.12), 5000) * np.exp(-x * 300)
        put(sfx, t, s, 0.11, pan=0.2)
    elif kind == 'lock':
        for k, dt in enumerate((0.0, 0.07)):
            x = tt(0.15)
            s = (np.sin(2 * np.pi * 1250 * x) + 0.6 * np.sin(2 * np.pi * 3170 * x)) * np.exp(-x * 70) + 0.5 * hp(noise(0.15), 3000) * np.exp(-x * 220)
            put(sfx, t + dt, s, 0.2 - 0.06 * k)
        x = tt(0.4)
        put(sfx, t, np.sin(2 * np.pi * 70 * x) * np.exp(-x * 14), 0.3)
    elif kind == 'gate':
        x = tt(0.3)
        s = np.sin(2 * np.pi * np.cumsum(120 + 80 * np.exp(-x * 30)) / SR) * np.exp(-x * 18) + 0.3 * bp(noise(0.3), 400, 2500) * np.exp(-x * 40)
        put(sfx, t, s, 0.22, pan=-0.4 + 0.27 * v)
    elif kind == 'bad':
        x = tt(0.45)
        f = mf(69 - 2 * v) * (1 - 0.12 * x / 0.45)
        s = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.06) / SR)) * np.exp(-x * 6)
        put(sfx, t, s, 0.07 + 0.012 * v)
    elif kind == 'riser':
        d = v
        x = tt(d)
        n = noise(d)
        r = (x / d) ** 2
        s = (bp(n, 500, 2000) * (1 - r) + bp(n, 2000, 9000) * r) * r
        s += 0.4 * np.sin(2 * np.pi * np.cumsum(200 + 1400 * r) / SR) * r
        put(sfx, t, s, 0.14)

# ───────────── reverberación, mezcla y normalización ─────────────
ir_t = tt(2.4)
ir = np.stack([rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 2.6) for _ in range(2)])
ir = np.stack([lp(ch, 5000) for ch in ir])
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
wet_in = music * 0.8 + sfx * 0.5
wet = np.stack([fftconvolve(wet_in[c], ir[c])[:N] for c in range(2)])
mix = music + sfx + 0.28 * wet
mix = hp(mix, 30)
fade = np.ones(N)
end = int(TOTAL * SR)
fade[end - int(1.5 * SR):end] = np.linspace(1, 0, int(1.5 * SR))
fade[end:] = 0
mix *= fade
mix *= 10 ** (-17 / 20) / np.sqrt(np.mean(mix[:, :end] ** 2))      # media de -17 dB
ax = np.abs(mix)                                                     # limitador suave: pico < -1 dB
mix = np.sign(mix) * np.where(ax < 0.7, ax, 0.7 + 0.19 * np.tanh((ax - 0.7) / 0.19))
pcm = (np.clip(mix.T[:end], -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, 'soundtrack.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
rms = 20 * np.log10(np.sqrt(np.mean(mix[:, :end] ** 2)) + 1e-9)
print(f'soundtrack.wav: {TOTAL:.1f} s, pico {20*np.log10(np.max(np.abs(mix))):.1f} dB, RMS {rms:.1f} dB, {len(meta["events"])} efectos')
for sid, (a, b) in scene.items():
    seg = mix[:, int(a * SR):int(min(b, TOTAL) * SR)]
    print(f'  {sid:8s} RMS {20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9):6.1f} dB')
