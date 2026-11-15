#!/usr/bin/env python3
"""Mezcla de audio + video sin audio → entregables con el peso justo.
    python3 tools/export.py long    → <slug>_master.mp4, <slug>_youtube.mp4 (≤ 95 MB), <slug>_revision.mp4 (≤ 28 MB, 720p)
    python3 tools/export.py short   → <slug>_short.mp4 y <slug>_short_sin_musica.mp4 (≤ 28 MB), <slug>_short_portada.jpg
El bitrate de video sale de la duración: (tope · 0,96 − audio) / duración.
"""
import json, os, subprocess, sys

FF = os.environ.get('FFMPEG', 'ffmpeg')
G = json.load(open('guion.json', encoding='utf-8'))
SLUG = G['slug']
mode = sys.argv[1] if len(sys.argv) > 1 else 'long'


def run(*a):
    subprocess.run([FF, '-y', '-hide_banner', '-loglevel', 'error', *a], check=True)


def dur(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p],
                                capture_output=True, text=True).stdout)


def lufs(p):
    err = subprocess.run([FF, '-hide_banner', '-i', p, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    i = err.rfind('I:')
    return err[i:i + 20].split()[1] if i >= 0 else '?'


def fit(src, wav, out, cap_mb, scale=None, abr=192):
    d = dur(src)
    vbr = int((cap_mb * 0.96 * 8 * 1024 * 1024 / d - abr * 1000) / 1000)
    vf = ['-vf', f'scale={scale}:flags=lanczos'] if scale else []
    for p in (1, 2):
        args = ['-i', src, '-i', wav, '-map', '0:v', '-map', '1:a', *vf, '-c:v', 'libx264', '-preset', 'slow', '-b:v', f'{vbr}k',
                '-maxrate', f'{int(vbr * 1.5)}k', '-bufsize', f'{vbr * 2}k', '-pass', str(p), '-passlogfile', f'/tmp/{SLUG}_2p',
                '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
        if p == 1:
            run(*args, '-an', '-f', 'mp4', '/dev/null')
        else:
            run(*args, '-c:a', 'aac', '-b:a', f'{abr}k', '-ar', '48000', '-shortest', out)
    return out


rows = []
if mode == 'long':
    v, a = 'video_sin_audio.mp4', 'mezcla.wav'
    if not os.path.exists(a):
        subprocess.run([sys.executable, 'audio_yt.py'], check=True)
    run('-i', v, '-i', a, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', f'{SLUG}_master.mp4')
    rows.append((f'{SLUG}_master.mp4', 'local (no se entrega)'))
    rows.append((fit(v, a, f'{SLUG}_youtube.mp4', 95), 'GitHub → subir a YouTube'))
    rows.append((fit(v, a, f'{SLUG}_revision.mp4', 28, '1280:720', 160), 'chat (revisión)'))
else:
    v = 'short_sin_audio.mp4'
    env = dict(os.environ, TL='timeline_short.json', VOICE='voz_short.wav', OUT='short_')
    if not os.path.exists('short_mezcla.wav'):
        subprocess.run([sys.executable, 'audio_yt.py'], check=True, env=env)
    rows.append((fit(v, 'short_mezcla.wav', f'{SLUG}_short.mp4', 28), 'chat → Shorts / Reels / TikTok'))
    rows.append((fit(v, 'short_sin_musica.wav', f'{SLUG}_short_sin_musica.mp4', 28), 'chat → con audio en tendencia'))
    t = G['short'].get('cover_t', 1.2)
    run('-ss', str(t), '-i', v, '-frames:v', '1', '-q:v', '2', f'{SLUG}_short_portada.jpg')
    rows.append((f'{SLUG}_short_portada.jpg', 'chat (portada)'))
print(f'{"archivo":44} {"MB":>7} {"LUFS":>6}  vía')
for p, via in rows:
    mb = os.path.getsize(p) / 1024 / 1024
    print(f'{p:44} {mb:7.1f} {lufs(p) if p.endswith(".mp4") else "":>6}  {via}')
