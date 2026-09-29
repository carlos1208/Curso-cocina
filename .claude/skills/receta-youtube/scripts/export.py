#!/usr/bin/env python3
"""Mixes and exports every deliverable sized for the channel it travels through, so nothing is too heavy to hand over.

  long:  <slug>_master.mp4   the render as is + audio (large, stays local, never committed)
         <slug>_youtube.mp4  1080p to upload: two-pass, bitrate chosen so the file stays under 95 MB (GitHub's limit is 100)
         <slug>_revision.mp4 720p review copy under 28 MB (the chat's file limit is 30 MiB)
  short: <slug>_short.mp4    1080x1920, under 28 MB (sendable in the chat and committable)
Below ~4 Mb/s the synthetic film grain eats the bitrate, so the encode gets a light denoise first.
    python3 export.py [long|short|all]      (reads guion.json; needs video_sin_audio.mp4 / short_sin_audio.mp4)
"""
import glob
import json
import os
import re
import subprocess
import sys
import tempfile

G = json.load(open('guion.json', encoding='utf-8'))
SLUG = G.get('slug', 'receta')
FF = os.environ.get('FFMPEG', 'ffmpeg')
ENGINE_AUDIO = 'audio_yt.py'
MB = 1_000_000
what = sys.argv[1] if len(sys.argv) > 1 else 'all'


def run(*a, **kw):
    subprocess.run([FF, '-y', '-hide_banner', '-loglevel', 'error', *a], check=True, **kw)


def duration(path):
    info = subprocess.run([FF, '-hide_banner', '-i', path], capture_output=True, text=True).stderr
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', info).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def two_pass(src, dst, kbps, vf=None, audio=None, abr=192):
    """Two-pass x264 at an exact average bitrate (size = bitrate × duration)."""
    filt = ['-vf', vf] if vf else []
    x264 = ['-c:v', 'libx264', '-preset', 'slower', '-tune', 'film', '-b:v', f'{kbps}k', '-maxrate', f'{int(kbps * 1.5)}k',
            '-bufsize', f'{kbps * 2}k', '-pix_fmt', 'yuv420p', '-g', '60']
    ins = ['-i', os.path.abspath(src)] + (['-i', os.path.abspath(audio)] if audio else [])
    maps = ['-map', '0:v', '-map', '1:a'] if audio else []
    with tempfile.TemporaryDirectory() as tmp:
        run(*ins, *filt, *x264, '-pass', '1', '-an', '-f', 'null', '/dev/null', cwd=tmp)
        run(*ins, *maps, *filt, *x264, '-pass', '2', '-c:a', 'aac', '-b:a', f'{abr}k', '-ar', '48000', '-shortest',
            '-movflags', '+faststart', os.path.abspath(dst), cwd=tmp)


def budget(dur, limit_mb, abr=192, cap=8000):
    return int(min(cap, limit_mb * MB * 8 / 1000 / dur - abr) * 0.97)


def lufs(path):
    out = subprocess.run([FF, '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', out)
    return float(m[-1]) if m else float('nan')


def report(paths):
    print(f'\n{"file":<42}{"size":>10}   chat ≤30 MiB   GitHub ≤100 MB   LUFS')
    for p in paths:
        size = os.path.getsize(p)
        print(f'{p:<42}{size / MB:8.1f} MB   {"sí" if size <= 30 * 2**20 else "no":^12}   {"sí" if size <= 100 * MB else "no":^14}   {lufs(p):.1f}')


made = []
env = dict(os.environ, FFMPEG=FF)
if what in ('long', 'all'):
    subprocess.run([sys.executable, ENGINE_AUDIO], check=True, env=env)
    aud = 'mezcla.wav' if glob.glob(G.get('voice', 'voz.mp3')) and os.path.exists('mezcla.wav') else 'musica_fx.wav'
    master = f'{SLUG}_master.mp4'
    run('-i', 'video_sin_audio.mp4', '-i', aud, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k',
        '-ar', '48000', '-movflags', '+faststart', '-shortest', master)
    dur = duration(master)
    kb = budget(dur, 95)
    vf = 'hqdn3d=1.2:1.2:4:4' if kb < 4000 else None
    print(f'long: {dur:.1f} s → upload file at {kb} kb/s{" (+ light denoise)" if vf else ""}')
    two_pass(master, f'{SLUG}_youtube.mp4', kb, vf)
    two_pass(master, f'{SLUG}_revision.mp4', budget(dur, 28, 128, 3000), 'scale=1280:-2:flags=lanczos,hqdn3d=1.5:1.5:5:5', abr=128)
    made += [f'{SLUG}_youtube.mp4', f'{SLUG}_revision.mp4']
if what in ('short', 'all'):
    subprocess.run([sys.executable, ENGINE_AUDIO], check=True,
                   env=dict(env, TL='timeline_short.json', VOICE='voz_short.wav', OUT='short_'))
    dur = duration('short_sin_audio.mp4')
    two_pass('short_sin_audio.mp4', f'{SLUG}_short.mp4', budget(dur, 28), audio='short_mezcla.wav')
    made.append(f'{SLUG}_short.mp4')
report(made)
