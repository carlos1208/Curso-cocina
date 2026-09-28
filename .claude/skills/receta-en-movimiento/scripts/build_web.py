#!/usr/bin/env python3
"""Builds the scroll-driven recipe web page from recipe.json.

Usage (from the project folder that holds recipe.json):
    FFMPEG=/path/to/ffmpeg python3 <skill>/scripts/build_web.py [--video receta_web.mp4] [--out web]

Writes <out>/index.html plus the media it references:
  img/…               photos, resized to 1080 px wide
  clips/<name>.mp4    H.264 (Safari/Chrome) and clips/<name>.webm (VP9) for every clip that has a "web"
                      setting in recipe.json: {"scrub": [a, b]} = the scroll drives the clip from a to b s,
                      {"loop": [a, b]} = plays that segment forwards and backwards on its own.
  media/video.mp4     the rendered vertical video (720p) for the "La receta en 30 segundos" section
  media/soundtrack.mp3
Existing media files are kept (delete them to re-encode). The page is then published as an Artifact
with every file in <out>/ passed through `files` (see SKILL.md).
"""
import argparse
import glob
import html
import json
import os
import shutil
import subprocess
import sys

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(SKILL, 'assets', 'web', 'template.html')
FF = os.environ.get('FFMPEG', 'ffmpeg')
CHECK = '<span class="box"><svg viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5L10 3" fill="none" stroke="#14100C" stroke-width="2"/></svg></span>'


def ff(*args):
    subprocess.run([FF, '-y', '-hide_banner', '-loglevel', 'error', *args], check=True)


def esc(t):
    return html.escape(str(t), quote=True)


def raw_clip(name):
    for ext in ('mp4', 'mov', 'MOV', 'webm'):
        p = os.path.join('clips_raw', f'{name}.{ext}')
        if os.path.exists(p):
            return p
    return None


def encode_clip(name, web, out):
    src = raw_clip(name)
    if not src:
        return False
    os.makedirs(os.path.join(out, 'clips'), exist_ok=True)
    mp4, webm = (os.path.join(out, 'clips', f'{name}.{e}') for e in ('mp4', 'webm'))
    if os.path.exists(mp4) and os.path.exists(webm):
        return True
    scale = 'scale=540:960:force_original_aspect_ratio=increase,crop=540:960'
    if 'scrub' in web:   # short GOP so seeking while scrolling is instant
        common = ['-i', src, '-an', '-vf', scale]
        ff(*common, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '29', '-preset', 'slow',
           '-g', '8', '-keyint_min', '8', '-sc_threshold', '0', '-movflags', '+faststart', mp4)
        ff(*common, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '42', '-g', '8', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '3', webm)
    else:                # ping-pong loop: forwards then backwards, so the loop point is invisible
        a, b = web.get('loop', [0, 5])
        fc = f'[0:v]{scale},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]'
        common = ['-ss', str(a), '-t', str(b - a), '-i', src, '-an', '-filter_complex', fc, '-map', '[v]']
        ff(*common, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '29', '-preset', 'slow', '-g', '48', '-movflags', '+faststart', mp4)
        ff(*common, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '42', '-g', '48', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '3', webm)
    return True


def copy_img(path, out):
    if not path or not os.path.exists(path):
        return
    dst = os.path.join(out, path)
    if os.path.exists(dst):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    ff('-i', path, '-vf', 'scale=1080:-1:flags=lanczos', '-q:v', '4', dst)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='web')
    ap.add_argument('--video', help='rendered vertical video to embed (default: newest *_web.mp4)')
    args = ap.parse_args()
    R = json.load(open('recipe.json', encoding='utf-8'))
    out = args.out
    os.makedirs(out, exist_ok=True)

    scenes = R['scenes']
    intro = next((s for s in scenes if s.get('kind') == 'intro'), {})
    steps = {}
    for s in scenes:
        if s.get('kind') == 'step':
            steps.setdefault(s['n'], []).append(s)
    order = sorted(steps)

    # ── media ──
    clip_ok = {}
    for s in scenes:
        c = s.get('clip') or {}
        if c.get('web') and c['name'] not in clip_ok:
            clip_ok[c['name']] = encode_clip(c['name'], c['web'], out)
    for p in {R.get('heroImage'), *[s.get('img') for s in scenes]}:
        copy_img(p, out)
    os.makedirs(os.path.join(out, 'media'), exist_ok=True)
    video = args.video or max(glob.glob('*_web.mp4'), key=os.path.getmtime, default=None)
    if video and not os.path.exists(os.path.join(out, 'media', 'video.mp4')):
        ff('-i', video, '-vf', 'scale=720:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-b:v', '1800k',
           '-maxrate', '2500k', '-bufsize', '4000k', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
           os.path.join(out, 'media', 'video.mp4'))
    if os.path.exists('soundtrack.wav') and not os.path.exists(os.path.join(out, 'media', 'soundtrack.mp3')):
        ff('-i', 'soundtrack.wav', '-c:a', 'libmp3lame', '-b:a', '160k', os.path.join(out, 'media', 'soundtrack.mp3'))

    def web_clip(s):
        c = s.get('clip') or {}
        if not c.get('web') or not clip_ok.get(c['name']):
            return None
        return {'name': c['name'], **({'scrub': c['web']['scrub']} if 'scrub' in c['web'] else {})}

    # ── stage data for the sticky player ──
    stage = []
    for n in order:
        first, *rest = steps[n]
        clip = web_clip(first)
        e = {'img': first.get('img'), 'z': [1.04, 1.1] if clip else first.get('mv', {}).get('z', [1.08, 1.2]),
             'f': [[.5, .5], [.5, .52]] if clip else first.get('mv', {}).get('f', [[.5, .5], [.5, .5]])}
        if first.get('webFrame'):
            e.update(first['webFrame'])       # {"z": [...], "f": [[..],[..]]} to reframe (e.g. hide a logo)
        if clip:
            e['clip'] = clip
        if first.get('mv', {}).get('r') and not clip:
            e['rot'] = first['mv']['r']
        if first.get('timer'):
            e['time'] = first['timer']
        if first.get('gauge'):
            g = first['gauge']
            e['gauge'] = {'names': g.get('names', ['Claro', 'Medio', g.get('label', 'Listo').capitalize()]),
                          'colors': g.get('colors', ['#F3E6BD', '#DDAA5E', '#9A5A22', '#4A2710'])}
        if first.get('steam'):
            e['steam'] = [{**m, 'alpha': m.get('alpha', .2) * (0.6 if clip else 1)} for m in first['steam']]
        if first.get('glints') and not clip:
            e['glints'] = first['glints']
        if first.get('grow') and not clip:
            e['grow'] = first['grow']
        if rest:                                # a second scene of the same step becomes the reveal at mid-scroll
            r = rest[0]
            e['img2'] = r.get('img')
            c2 = web_clip(r)
            if c2:
                e['clip2'] = {**c2, 'scrub': c2.get('scrub', [0, 4])}
            e['steam2'] = [{**m, 'alpha': m.get('alpha', .2) * (0.5 if c2 else 1)} for m in (r.get('steam') or [{'x0': .2, 'x1': .8, 'y': .45, 'n': 12, 'rise': 170, 'size': 320, 'alpha': .2}])]
        stage.append(e)
    hero = {'img': R.get('heroImage') or intro.get('img')}
    hc = web_clip(intro) if intro else None
    if hc and 'scrub' not in hc:
        hero['clip'] = hc

    # ── HTML blocks ──
    facts = '\n'.join(f'        <div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in R.get('facts', []))
    ings = []
    for g in R.get('ingredients', []):
        if isinstance(g, list):
            g = {'qty': g[0], 'name': g[1]}
        data = ''
        if 'q' in g:
            data = f' data-q="{g["q"]}" data-u="{esc(g.get("unit", "|"))}"' + (f' data-q2="{g["q2"]}"' if 'q2' in g else '')
        note = f'<small>{esc(g["note"])}</small>' if g.get('note') else ''
        name = g['name'][:1].upper() + g['name'][1:]
        ings.append(f'      <li><button class="ing" type="button" role="checkbox" aria-checked="false"{data}>{CHECK}'
                    f'<span class="q">{esc(g["qty"])}</span><span class="n">{esc(name)}{note}</span></button></li>')
    arts = []
    for k, n in enumerate(order):
        s = steps[n][0]
        notes = [x.get('note') for x in steps[n] if x.get('note')]
        body = s.get('body') or ' · '.join(s.get('lines', []))
        parts = [f'        <article class="step{" is-active" if k == 0 else ""}" id="paso-{n}">',
                 f'          <p class="kicker"><b>{n:02d}</b> {esc(s.get("kicker", ""))}</p>',
                 f'          <h3>{esc(s.get("webTitle") or s["title"])}</h3>',
                 f'          <p>{esc(body)}</p>']
        if s.get('adds'):
            parts.append('          <ul class="adds">' + ''.join(f'<li>{esc(a)}</li>' for a in s['adds']) + '</ul>')
        for nt in notes:
            parts.append(f'          <p class="note">{esc(nt)}</p>')
        if s.get('tags'):
            parts.append('          <ul class="tags">' + ''.join(f'<li>{esc(t)}</li>' for t in s['tags']) + '</ul>')
        parts.append('        </article>')
        arts.append('\n'.join(parts))

    web_title = R.get('webTitle') or R['title'].title()
    rep = {
        'PAGE_TITLE': R.get('pageTitle') or f'Cocina {web_title}',
        'PAGE_DESC': f'{R.get("course", "Curso de Cocina")}: {web_title} paso a paso. El scroll cocina la receta.',
        'COURSE': R.get('course', 'Curso de Cocina'),
        'BRAND_TAG': (R.get('tag', '').split('·')[-1].strip() or 'RECETA'),
        'EYEBROW': R.get('eyebrow', ''),
        'WEB_TITLE': web_title,
        'LEDE': R.get('lede') or R.get('subtitle', ''),
        'FACTS': facts,
        'HERO_ALT': R.get('heroAlt') or f'{web_title} recién servido',
        'INGREDIENTS': '\n'.join(ings),
        'NSTEPS': str(len(order)), 'NSTEPS2': f'{len(order):02d}',
        'RAIL': '<i><b></b></i>' * len(order),
        'FIRST_TITLE': steps[order[0]][0].get('webTitle') or steps[order[0]][0]['title'],
        'STEPS': '\n'.join(arts),
        'COOK_INTRO': R.get('cookIntro') or 'Baja despacio: los videos avanzan con el scroll, los temporizadores corren y el vapor sube mientras lees. Pasa el cursor sobre la imagen para soplar el vapor y haz clic para remover.',
        'HERO_IMG': hero['img'] or '',
        'FOOTER_RECIPE': R.get('tag', '').replace('CURSO DE COCINA', '').strip(' ·').title() + f': {web_title}',
        'HERO_JSON': json.dumps(hero, ensure_ascii=False),
        'STAGE_JSON': json.dumps(stage, ensure_ascii=False),
        'STORAGE_KEY': json.dumps(web_title.lower().replace(' ', '-') + '-mise'),
    }
    page = open(TEMPLATE, encoding='utf-8').read()
    for k, v in rep.items():
        # text placeholders are escaped; the JSON / pre-built HTML blocks are inserted as-is
        raw = k in ('FACTS', 'INGREDIENTS', 'STEPS', 'RAIL', 'HERO_JSON', 'STAGE_JSON', 'STORAGE_KEY')
        page = page.replace('{{' + k + '}}', v if raw else esc(v))
    left = [p for p in rep if '{{' + p + '}}' in page]
    if '{{' in page and left:
        sys.exit(f'unfilled placeholders: {left}')
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
    files = sorted(os.path.relpath(p, out) for p in glob.glob(os.path.join(out, '**', '*'), recursive=True)
                   if os.path.isfile(p) and not p.endswith(('index.html', 'artifact_files.json')))
    json.dump({f: os.path.abspath(os.path.join(out, f)) for f in files}, open(os.path.join(out, 'artifact_files.json'), 'w'), indent=1)
    total = sum(os.path.getsize(os.path.join(out, f)) for f in files) / 1e6
    print(f'wrote {out}/index.html · {len(order)} steps · {len(files)} media files ({total:.1f} MB)')
    print(f'Artifact `files` map: {out}/artifact_files.json')


if __name__ == '__main__':
    main()
