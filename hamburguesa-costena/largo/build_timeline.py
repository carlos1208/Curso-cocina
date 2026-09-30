"""Builds timeline.json for the long YouTube cut (16:9) from the shot sheet plus the motion design layer.

Shot times come straight from hoja_tomas.xlsx (sheet "Tomas"), so moving a cut there and re-running this keeps
everything in sync. This file adds what the sheet does not carry: which media and which part of it each shot shows,
the framing inside the vertical card, and the animated callouts (quantities, timers, heat, tips, pins) timed to the
narration. Subtitles are the sheet's lines rewritten with accents, numerals and the two "HOGAO" typos fixed.
    python3 build_timeline.py   → timeline.json + subtitulos.srt
"""
import json

import openpyxl

SHEET = 'hoja_tomas.xlsx'
wb = openpyxl.load_workbook(SHEET, data_only=True)
rows = [r for r in wb['Tomas'].iter_rows(min_row=2, values_only=True) if r[0] and str(r[0]).startswith('S')]
T = {r[0]: (float(r[1]), float(r[2])) for r in rows}
DUR = round(max(t1 for _, t1 in T.values()), 2)

# ── palette (shared with the short) + one accent per chapter ──
COL = {'saffron': '#F2B544', 'cream': '#F6EFE3', 'dark': '#140E09', 'ember': '#E0782F',
       'red': '#D9573B', 'lime': '#A9C44E', 'rose': '#DB8B78', 'gold': '#E9A23B'}

# side = where the card sits (the text column takes the other side); alternating sides keeps a 2:37 video moving
CHAPTERS = [
    dict(id='gancho', t=0.0, n=0, title='Hamburguesa costeña', color=COL['saffron'], side='hook'),
    dict(id='ingredientes', t=T['S03'][0], n=1, title='Ingredientes', h1='Ingredientes', h2='para 4 hamburguesas', color=COL['saffron'], side='R', mark='MISE EN PLACE'),
    dict(id='hogao', t=T['S07'][0], n=2, title='Hogao caramelizado', h1='Hogao', h2='caramelizado', color=COL['red'], side='L', mark='HOGAO'),
    dict(id='salsa', t=T['S13'][0], n=3, title='Salsa de suero', h1='Salsa', h2='de suero', color=COL['lime'], side='R', mark='SUERO'),
    dict(id='carne', t=T['S16'][0], n=4, title='La carne', h1='La', h2='carne', color=COL['rose'], side='L', mark='CARNE'),
    dict(id='smash', t=T['S21'][0], n=5, title='Plátano, queso y smash', h1='Plátano, queso', h2='y smash', color=COL['ember'], side='R', mark='SMASH'),
    dict(id='armado', t=T['S26'][0], n=6, title='Armado', h1='A', h2='armar', color=COL['gold'], side='L', mark='ARMADO'),
    dict(id='cierre', t=T['S29'][0], n=7, title='Cierre', color=COL['saffron'], side='end'),
]

# media: C1–C6 are the short's clips, N.. the new material (N07/N08 as renamed after checking what each file shows)
MEDIA = {k: {'clip': k} for k in ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'N04', 'N05', 'N06', 'N07', 'N08', 'N11', 'N14', 'N15']}
MEDIA.update({k: {'img': f'raw/{k}.jpg'} for k in ['N01', 'N02', 'N03', 'N09', 'N10', 'N12', 'N13', 'N16']})


def shot(sid, src, a=0.0, b=None, z=(1.03, 1.08), f=((.5, .5), (.5, .5)), tr='push', **kw):
    """src plays from a to b (clip seconds) across the shot's time; stills ignore a/b and use the camera move."""
    t0, t1 = T[sid]
    s = dict(id=sid, t0=t0, t1=t1, src=src, a=a, b=b if b is not None else a + (t1 - t0), z=list(z), f=[list(p) for p in f], tr=tr)
    s.update(kw)
    return s


SHOTS = [
    # hook: three dealt cards (see engine "hook"); S02 re-deals them for DULCE / SALADO / ÁCIDO
    shot('S01', 'C6', 0, 8.0, tr='none'),
    shot('S02', 'C6', 8.0, 8.0, tr='none'),
    # ingredients: stills with slow push + numbered pins on each ingredient
    shot('S03', 'N01', z=(1.0, 1.06), f=((.5, .42), (.5, .4)), tr='chapter'),
    shot('S04', 'N02', z=(1.02, 1.08), f=((.5, .58), (.52, .6))),
    shot('S05', 'N03', z=(1.0, 1.07), f=((.48, .56), (.46, .58))),
    shot('S06', 'N01', z=(2.05, 2.25), f=((.22, .5), (.23, .5)), tr='zoom'),
    # hogao
    shot('S07', 'N04', 0, 8.0, tr='chapter'),
    shot('S08', 'N04', 3.7, 8.0, z=(1.2, 1.26), f=((.5, .62), (.5, .64)), tr='zoom'),
    shot('S09', 'N05', 0, 6.4),
    shot('S10', 'N06', 0, 6.6),
    shot('S11', 'N07', 0, 3.9, z=(1.04, 1.1)),
    shot('S12', 'C1', 0, 3.5, z=(2.3, 2.3), f=((.5, .535), (.5, .535))),   # zoom keeps the pot's brand logo out
    # salsa
    shot('S13', 'N08', 0, 8.0, z=(1.16, 1.2), f=((.46, .6), (.46, .6)), tr='chapter'),   # crop hides a hand at the top edge
    shot('S14', 'C2', 0, 4.2),
    shot('S15', 'N09', z=(1.0, 1.06), f=((.5, .55), (.5, .58))),
    # carne
    shot('S16', 'N10', z=(1.0, 1.05), f=((.5, .55), (.5, .56)), tr='chapter'),
    shot('S17', 'C5', 6.2, 8.0, z=(1.12, 1.2), f=((.5, .56), (.5, .58))),   # the crust: "en un smash eso se nota"
    shot('S18', 'N11', 0, 6.0),
    shot('S19', 'N10', z=(1.55, 1.7), f=((.46, .66), (.5, .7)), tr='zoom'),
    shot('S20', 'C4', 0, 8.0, z=(1.08, 1.16), f=((.5, .58), (.5, .6))),
    # plátano, queso y smash (C3 is a split screen: left half plantain, right half cheese)
    shot('S21', 'C3', 0.5, 5.1, z=(2.0, 2.06), f=((.25, .59), (.25, .6)), tr='chapter'),
    shot('S22', 'C3', 4.0, 7.7, z=(2.0, 2.06), f=((.75, .6), (.75, .6))),
    shot('S23', 'N12', z=(1.0, 1.06), f=((.5, .5), (.52, .52)), shimmer=[.08, .36, .98, .62]),
    shot('S24', 'C5', 1.4, 6.2, z=(1.04, 1.1), f=((.5, .58), (.5, .6))),
    shot('S25', 'N13', z=(1.0, 1.06), f=((.5, .6), (.5, .62))),
    # armado
    shot('S26', 'N14', 0, 3.5, tr='chapter'),
    shot('S27', 'N15', 0, 8.0, z=(1.03, 1.07), f=((.5, .55), (.5, .56))),
    shot('S28', 'N16', z=(2.1, 1.35), f=((.34, .53), (.4, .5))),   # N16 arrived as a sharp still: pull out from the crusted cheese
    shot('S29', 'C6', 1.3, 8.0, tr='end'),
]

# ── callouts (absolute times, tied to the words in the narration) ──
# kinds: qty (counter + unit + label), timer (ring), heat (flame bars), tip (icon + sentence), chips, note, stack, measure
C = []
def co(kind, t, t1=None, **kw):
    C.append(dict(kind=kind, t=t, t1=t1, **kw))

# ingredientes: a mise-en-place board that fills as each ingredient is named; pins mark it on the photo
ING = [  # group, t, qty value, unit, label, pin shot, pin xy
    ('base', 13.9, 600, 'g', 'carne molida 80/20', 'S03', (.5, .29)),
    ('base', 18.3, 4, '', 'panes brioche', 'S03', (.83, .34)),
    ('base', 19.9, 200, 'g', 'queso costeño', 'S04', (.28, .6)),
    ('base', 21.5, 2, '', 'plátanos maduros', 'S04', (.82, .64)),
    ('hogao', 25.0, 300, 'g', 'tomate chonto', 'S05', (.26, .6)),
    ('hogao', 26.7, 150, 'g', 'cebolla', 'S05', (.7, .58)),
    ('salsa', 30.2, 60, 'g', 'suero costeño', 'S06', (.156, .558)),
    ('salsa', 31.9, 60, 'g', 'mayonesa', 'S06', (.313, .558)),
    ('salsa', 32.9, None, '', 'ají dulce', 'S06', (.2, .45)),
]
co('board', 12.9, T['S06'][1], groups=[['base', 'La base'], ['hogao', 'Hogao'], ['salsa', 'Salsa']],
   items=[dict(g=g, t=t, v=v, unit=u, label=l) for g, t, v, u, l, _, _ in ING])
PINS = [dict(shot=s, t=t, xy=list(xy), n=i + 1) for i, (_, t, _, _, _, s, xy) in enumerate(ING)]

# hogao: a doneness gauge runs under the whole chapter
co('gauge', T['S07'][0] + .6, T['S12'][1], stops=[[T['S07'][0], 'Transparente'], [T['S09'][0], 'Tomate'], [T['S10'][0], 'Reduce'], [T['S12'][0], 'Mermelada']],
   colors=['#EFE3C2', '#E0492F', '#A8321F', '#62190F'], at=[T['S07'][0] + 1, T['S12'][1] - 1])
co('heat', 38.6, T['S07'][1], level=2, label='Fuego medio-bajo')
co('chips', 38.0, T['S07'][1], items=[['1 cda de aceite', 38.0], ['cebolla', 41.0], ['pizca de sal', 42.1]])
co('timer', 43.7, T['S08'][1], value=3, unit='min', label='hasta que esté transparente')
co('tip', 45.9, T['S08'][1], icon='x', text='Que no se dore')
co('chips', 48.0, T['S09'][1], items=[['+ 300 g de tomate', 48.1]])
co('heat', 49.3, T['S09'][1], level=1, label='Fuego bajo')
co('timer', 51.9, T['S09'][1], value=25, unit='min', approx=True, label='moviendo de vez en cuando')
co('tip', 54.4, T['S10'][1], icon='drop', text='¿Se pega? Un chorrito de agua')
co('chips', 57.2, T['S10'][1], items=[['2 cdas de azúcar', 57.9], ['1 cda de vinagre', 59.3]])
co('tip', 61.0, T['S11'][1], icon='check', text='El surco no se cierra enseguida')
co('trace', 61.4, T['S11'][1], shot='S11', path=[[.1, .77], [.46, .56], [.82, .36]])
co('tip', 65.0, T['S12'][1], icon='spark', text='Brillante, casi como mermelada')

# salsa
co('list', 69.9, T['S13'][1], rows=[[60, 'g', 'suero costeño', 70.3], [60, 'g', 'mayonesa', 71.5], [1, 'cda', 'ají dulce, picado muy fino', 72.7], [1, 'cdta', 'jugo de limón', 75.5]])
co('tip', 77.5, T['S14'][1], icon='x', text='Prueba antes de agregar sal')
co('chips', 79.6, T['S14'][1], items=[['el suero ya trae sal', 79.6]])
co('timer', 81.9, T['S15'][1], value=30, unit='min', label='en la nevera', cold=True)

# carne
co('tip', 87.3, T['S16'][1], icon='x', text='No mezcles la sal con la carne')
co('chips', 89.2, T['S16'][1], items=[['queda compacta', 89.2], ['textura de salchicha', 90.4]])
co('big', 92.3, T['S17'][1], text='En un smash,\nse nota.')
co('note', 95.0, T['S19'][1], text='Esto sí se mezcla, con suavidad:')
co('list', 98.8, T['S19'][1], rows=[['½', 'cdta', 'ajo en polvo', 98.9], ['½', 'cdta', 'cebolla en polvo', 101.4], ['½', 'cdta', 'pimentón ahumado', 103.2]])
co('chips', 104.2, T['S19'][1], items=[['para los 600 g', 104.3]])
PINS += [dict(shot='S19', t=101.4, xy=[.42, .65], n='b'), dict(shot='S19', t=103.2, xy=[.59, .756], n='c')]
co('balls', 106.6, T['S20'][1], n=4, each='150 g')
co('tip', 108.0, T['S20'][1], icon='hand', text='Sin apretar')
co('chips', 109.8, T['S20'][1], items=[['sal y pimienta: por fuera', 110.2], ['justo antes de cocinar', 111.9]])

# plátano, queso y smash
co('timer', 115.3, T['S21'][1], value=2, unit='min', label='por lado · hasta dorar', sides=2)
co('timer', 119.2, T['S22'][1], value=1, unit='min', label='por lado · hasta hacer costra', sides=2)
co('heat', 122.5, T['S23'][1], level=4, label='Plancha muy caliente')
co('tip', 125.4, T['S24'][1], icon='press', text='Una sola vez')
co('measure', 126.9, T['S24'][1], text='1 cm')
co('tip', 128.3, T['S24'][1], icon='x', text='No la vuelvas a presionar')
co('chips', 130.0, T['S24'][1], items=[['salpimienta', 130.0]])
co('timer', 131.6, T['S25'][1], value=2, unit='min', plus=1, label='voltea · 1 minuto más')

# armado: the burger builds itself as each layer is named
co('tip', 136.2, T['S26'][1], icon='bread', text='Tuesta el pan en la grasa')
co('stack', 138.4, T['S27'][1], layers=[
    ['pan tostado', '#D9A15C', 138.5], ['salsa de suero', '#F3EBDD', 139.1], ['carne', '#5E3324', 140.9],
    ['queso frito', '#E7C27B', 141.8], ['plátano maduro', '#E9A23B', 142.8], ['hogao', '#A8321F', 145.2]])
co('tip', 147.2, T['S28'][1], icon='fire', text='Sírvela caliente')
co('chips', 148.3, T['S28'][1], items=[['con el queso aún crujiente', 148.4]])

# ── subtitles: sheet timings, text corrected; **x** marks what gets highlighted ──
SUBS = [
    (0.2, 3.9, 'Hoy hacemos una hamburguesa con sabor de la Costa: **hogao**'),
    (3.9, 6.0, '**caramelizado**, **queso costeño frito**,'),
    (6.5, 8.4, '**plátano maduro** y **salsa de suero**.'),
    (9.0, 11.8, 'Dulce, salado y ácido en cada mordisco.'),
    (12.6, 17.5, 'Para **4 hamburguesas**: **600 g** de carne molida de res **80/20**,'),   # "cuatro" moves to the next cue
    (17.5, 22.3, '**4** panes brioche, **200 g** de queso costeño y **2** plátanos maduros.'),
    (23.0, 26.5, 'Para el hogao, **300 g** de tomate y **150**'),
    (26.5, 27.5, 'de cebolla.'),
    (28.2, 32.3, 'Para la salsa, **60 g** de suero costeño, **60** de'),
    (32.3, 33.8, 'mayonesa y ají dulce.'),
    (34.3, 37.0, 'Empezamos por el hogao, que es lo que más tarda.'),
    (37.4, 41.2, 'Calienta **1 cucharada** de aceite a **fuego medio-bajo** y sofríe la'),
    (41.2, 41.9, 'cebolla con'),
    (41.9, 42.8, 'una pizca de sal.'),
    (43.5, 47.1, '**3 minutos**, hasta que esté transparente. Que no se dore.'),
    (47.8, 50.9, 'Agrega el tomate y cocina a **fuego bajo**, moviendo de vez en'),
    (50.9, 51.2, 'cuando.'),
    (51.9, 53.6, 'Son unos **25 minutos**.'),
    (54.2, 56.3, 'Si se pega, échale un chorrito de agua.'),
    (57.0, 60.2, 'Al final, **2 cucharadas** de azúcar y **1** de vinagre.'),
    (60.8, 63.7, 'Está listo cuando pasas la cuchara y el surco no se cierra'),
    (63.7, 64.1, 'enseguida.'),
    (64.7, 67.2, 'Debe verse brillante, casi como una mermelada.'),
    (68.2, 69.4, 'Ahora, la salsa.'),
    (70.0, 73.6, 'Mezcla el suero, la mayonesa, **1 cucharada** de ají dulce'),
    (73.6, 74.9, 'picado muy fino y'),
    (74.9, 76.5, '**1 cucharadita** de jugo de limón.'),
    (77.4, 78.7, 'Prueba antes de agregar sal.'),
    (79.5, 81.0, 'El suero costeño ya es salado.'),
    (81.6, 84.5, 'Déjala **30 minutos** en la nevera para que los sabores se'),
    (84.5, 85.0, 'integren.'),
    (86.0, 86.8, 'Ahora, la carne.'),
    (87.3, 91.0, 'No mezcles la sal con la carne: la vuelve compacta, con textura'),
    (91.0, 91.7, 'de salchicha,'),
    (92.3, 94.1, 'y en un smash eso se nota.'),
    (94.8, 100.2, 'Lo que sí puedes mezclar, suavemente, es **½ cucharadita** de ajo en polvo,'),
    (100.2, 105.2, '**½** de cebolla en polvo y **½** de pimentón ahumado para los **600 g**.'),
    (105.9, 108.9, 'Forma **4 bolas** de **150 g**, sin apretar.'),
    (109.7, 112.9, 'La sal y la pimienta van por fuera, justo antes de cocinar.'),
    (113.9, 117.3, 'Fríe el plátano hasta que dore, **2 minutos** por lado, y'),
    (117.3, 117.8, 'resérvalo.'),
    (118.5, 121.6, 'Luego el queso, **1 minuto** por lado, hasta que haga costra.'),
    (122.2, 124.1, 'Ahora, la plancha **muy caliente**.'),
    (124.6, 127.8, 'Pon una bola y aplástala de una sola vez hasta **1 cm**.'),
    (128.3, 129.3, 'No la vuelvas a presionar.'),
    (130.0, 130.8, 'Salpimienta.'),
    (131.4, 134.2, '**2 minutos**, voltea y **1 minuto** más.'),
    (135.1, 135.6, 'A armar.'),
    (136.2, 138.1, 'Tuesta el pan en la grasa de la plancha.'),
    (138.6, 140.1, 'Abajo, la salsa de suero.'),
    (140.7, 143.8, 'Encima, la carne, el queso frito y el plátano.'),
    (144.4, 146.6, 'Termina con una cucharada generosa de hogao.'),
    (147.1, 150.1, 'Sírvela caliente, mientras el queso conserva la costra.'),
    (151.0, 152.4, 'Si te sirvió, suscríbete.'),
    (152.8, 156.0, 'En el próximo video… y dime en los comentarios si te gustaría'),
    (156.0, 156.8, 'explorar otra'),
    (156.9, 157.3, 'versión.'),
]


def cues(subs, max_chars=92, gap=0.35):
    """Joins the sheet's fragments ("cebolla con" · "una pizca de sal.") into readable cues of up to two lines."""
    out = []
    for t0, t1, s in subs:
        if out:
            p = out[-1]
            plain = lambda x: x.replace('**', '')
            if t0 - p[1] < gap and not plain(p[2]).rstrip().endswith(('.', '?', '!', '…')) and len(plain(p[2] + ' ' + s)) <= max_chars:
                p[1], p[2] = t1, p[2] + ' ' + s
                continue
        out.append([t0, t1, s])
    for i in range(len(out) - 1):          # hold each cue until the next one when the gap is short
        if out[i + 1][0] - out[i][1] < 0.6:
            out[i][1] = out[i + 1][0] - 0.02
    return out


CUES = cues(SUBS)


def srt_time(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


with open('subtitulos.srt', 'w', encoding='utf-8') as fh:
    for i, (t0, t1, s) in enumerate(CUES, 1):
        fh.write(f'{i}\n{srt_time(t0)} --> {srt_time(t1)}\n{s.replace("**", "")}\n\n')

json.dump(dict(duration=DUR, fps=30, colors=COL, chapters=CHAPTERS, media=MEDIA, shots=SHOTS, callouts=C, pins=PINS, cues=CUES,
               tag='CURSO DE COCINA  ·  RECETA 02'),
          open('timeline.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
total = sum(t1 - t0 for t0, t1 in T.values())
print(f'timeline.json: {len(SHOTS)} shots, {len(C)} callouts, {len(CUES)} subtitle cues, {DUR:.2f} s (shots sum {total:.2f} s)')
