"""Escribe guion.json de la velouté de tomate (capa de diseño). Tiempos: '@S07' = inicio de la toma; números =
segundos de la voz (inicio de palabra medido con whisper sobre voz.mp3 / voz_short.mp3, ver asr_*.json)."""
import json, re, unicodedata
from openpyxl import load_workbook

wb = load_workbook('hoja_tomas.xlsx')
subs_l = [list(r) for r in wb['Subtítulos'].iter_rows(min_row=2, values_only=True) if r[0] is not None]
subs_s = [list(r) for r in wb['Subtítulos Short'].iter_rows(min_row=2, values_only=True) if r[0] is not None]


def norm(t):
    t = unicodedata.normalize('NFKD', t.lower())
    return ''.join(c for c in t if not unicodedata.combining(c))


def words(path):
    return [(norm(re.sub(r'[^\wáéíóúñü]', '', x['w'])), x['t0']) for x in json.load(open(path, encoding='utf-8'))]


WL, WS = words('asr_largo.json'), words('asr_short.json')


def at(word, near, W=WL, win=4.0, default=None):
    """Inicio de la palabra (prefijo, sin tildes) más cercana a `near`; si no aparece, `default` o `near`."""
    w = norm(word)
    hits = [t for x, t in W if x.startswith(w) and abs(t - near) <= win]
    return round(min(hits, key=lambda t: abs(t - near)), 2) if hits else (default if default is not None else near)


# ── subtítulos: texto del guion en los tiempos de la voz, con cifras y cantidades resaltadas ──
FIX_L = {
    'Para cuatro personas necesitas un kilo y doscientos gramos de tomate chonto maduro.':
        'Para **4 personas** necesitas **1,2 kg** de tomate chonto maduro.',
    'Dos chalotas, cuatro dientes de ajo y dos ramas de tomillo.': '**2** chalotas, **4** dientes de ajo y **2** ramas de tomillo.',
    'Cuatrocientos mililitros de fondo de verduras,': '**400 ml** de fondo de verduras,',
    'cincuenta de crema de leche y cuarenta gramos de mantequilla fría.': '**50 ml** de crema de leche y **40 g** de mantequilla fría.',
    'cuarenta gramos de albahaca y ciento veinte mililitros de aceite de girasol.': '**40 g** de albahaca y **120 ml** de aceite de girasol.',
    'Y para acompañar, ocho rebanadas de brioche, ciento sesenta gramos de gruyère,':
        'Y para acompañar, **8** rebanadas de brioche, **160 g** de gruyère,',
    'veinte de parmesano y, si quieres, una burrata.': '**20 g** de parmesano y, si quieres, una burrata.',
    'Calienta la sartén de hierro a fuego alto durante tres minutos.': 'Calienta la sartén de hierro a fuego **alto** durante **3 minutos**.',
    'Pon los tomates boca abajo con una cucharada de aceite de oliva.': 'Pon los tomates boca abajo con **1 cucharada** de aceite de oliva.',
    'Déjalos de seis a ocho minutos, sin moverlos.': 'Déjalos de **6 a 8 minutos**, sin moverlos.',
    'En la olla, a fuego medio bajo,': 'En la olla, a fuego **medio-bajo**,',
    'Cinco minutos, sin que tomen color.': '**5 minutos**, sin que tomen color.',
    'Diez minutos a fuego medio, hasta que se desarmen.': '**10 minutos** a fuego **medio**, hasta que se desarmen.',
    'Agrega el fondo y cocina veinte minutos a fuego bajo.': 'Agrega el fondo y cocina **20 minutos** a fuego **bajo**.',
    'Saca el tomillo y licúa dos minutos a máxima potencia.': 'Saca el tomillo y licúa **2 minutos** a máxima potencia.',
    'Devuélvela al fuego bajo con la crema.': 'Devuélvela al fuego **bajo** con la crema.',
    'Blanquea la albahaca diez segundos en agua hirviendo.': 'Blanquea la albahaca **10 segundos** en agua hirviendo.',
    'Sécala bien y licúala dos minutos con el aceite.': 'Sécala bien y licúala **2 minutos** con el aceite.',
    'Sartén a fuego medio bajo, de tres a cuatro minutos por lado.': 'Sartén a fuego **medio-bajo**, de **3 a 4 minutos** por lado.',
}
FIX_S = {
    'Un kilo doscientos de tomate, dos chalotas, cuatro ajos y tomillo.': '**1,2 kg** de tomate, **2** chalotas, **4** ajos y tomillo.',
    'Cuatrocientos mililitros de fondo, cuarenta gramos de mantequilla, brioche y gruyère.':
        '**400 ml** de fondo, **40 g** de mantequilla, brioche y gruyère.',
    'Tatema los tomates en sartén de hierro, a fuego alto, ocho minutos.': 'Tatema los tomates en sartén de hierro, a fuego **alto**, **8 minutos**.',
    'y cocina treinta minutos.': 'y cocina **30 minutos**.',
    'Brioche con gruyère y costra de parmesano, cuatro minutos por lado.': 'Brioche con gruyère y costra de parmesano, **4 minutos** por lado.',
}
SUBS_L = [[a, b, FIX_L.get(s, s)] for a, b, s in subs_l]
SUBS_S = [[a, b, FIX_S.get(s, s)] for a, b, s in subs_s]

media = {'HERO': {'img': 'raw/HERO.jpg'}}
for k in ('N01', 'N11', 'N13', 'N16'):
    media[k] = {'img': f'raw/{k}.jpg'}
for k in ('N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08', 'N09', 'N10', 'N12', 'N14', 'N15'):
    media[k] = {'clip': f'raw/{k}.mp4'}

chapters = [
    dict(start='S03', id='ingredientes', title='Ingredientes', h1='Ingredientes', h2='para 4 personas', color='#F2B544', mark='MISE EN PLACE'),
    dict(start='S08', id='tatemados', title='Tomates tatemados', h1='Tomates', h2='tatemados', color='#C8452E', mark='TATEMADO'),
    dict(start='S12', id='veloute', title='Velouté', h1='Velouté', h2='de seda', color='#E8673F', mark='VELOUTÉ'),
    dict(start='S23', id='albahaca', title='Aceite de albahaca', h1='Aceite', h2='de albahaca', color='#7DB04A', mark='ACEITE VERDE'),
    dict(start='S27', id='brioche', title='Brioche de gruyère', h1='Brioche', h2='de gruyère', color='#E9B44C', mark='BRIOCHE'),
    dict(start='S32', id='servicio', title='Servicio', h1='Servir', h2='y decorar', color='#F1DDB8', mark='SERVICIO'),
]


def sh(src, a=None, b=None, z=None, f=None, **kw):
    d = {'src': src}
    if a is not None: d['a'] = a
    if b is not None: d['b'] = b
    if z: d['z'] = z
    if f: d['f'] = [f, f] if isinstance(f[0], (int, float)) else f
    d.update(kw)
    return d


shots = {
    'S01': sh('HERO', z=[1.0, 1.06], f=[0.5, 0.58]),
    'S02': sh('N14', 5.1, 8.0, [1.45, 1.5], [0.5, 0.68]),
    'S03': sh('N01', z=[1.55, 1.62], f=[0.24, 0.4]),                       # tomates
    'S04': sh('N01', z=[1.55, 1.6], f=[[0.2, 0.5], [0.24, 0.48]]),          # chalota, ajo, tomillo
    'S05': sh('N01', z=[1.5, 1.56], f=[[0.62, 0.4], [0.6, 0.42]]),          # fondo, crema, mantequilla
    'S06': sh('N01', z=[1.6, 1.66], f=[0.6, 0.34]),                         # albahaca
    'S07': sh('N01', z=[1.25, 1.32], f=[[0.62, 0.48], [0.6, 0.48]]),        # brioche, quesos, burrata
    'S08': sh('N02', 0, 8.0, [1.0, 1.04]),
    'S09': sh('N02', 0, 8.0, [1.3, 1.36], [0.5, 0.42]),
    'S10': sh('N02', 4.0, 8.0, [1.6, 1.66], [0.5, 0.4]),
    'S11': sh('N02', 1.0, 6.0, [1.15, 1.2], [0.5, 0.48]),
    'S12': sh('N03', 0, 6.9, [1.0, 1.04]),
    'S13': sh('N03', 2.5, 8.0, [1.35, 1.4], [0.55, 0.5]),
    'S14': sh('N04', 0, 5.0, [1.0, 1.04]),
    'S15': sh('N04', 4.0, 8.0, [1.3, 1.36], [0.55, 0.45]),
    'S16': sh('N05', 1.0, 5.0, [1.05, 1.1], [0.55, 0.5]),
    'S17': sh('N06', 2.0, 6.5, [1.0, 1.04]),
    'S18': sh('N07', 0, 3.6, [1.0, 1.03]),
    'S19': sh('N07', 2.0, 8.0, [1.55, 1.6], [0.48, 0.66]),
    'S20': sh('N08', 0, 6.3, [1.0, 1.04]),
    'S21': sh('N08', 2.1, 8.0, [1.3, 1.36], [0.5, 0.42]),
    'S22': sh('N16', z=[1.0, 1.1], f=[[0.38, 0.6], [0.34, 0.62]]),
    'S23': sh('N09', 0, 8.0, [1.0, 1.04]),
    'S24': sh('N09', 3.3, 8.0, [1.3, 1.36], [0.45, 0.42]),
    'S25': sh('N10', 0, 6.4, [1.0, 1.04]),
    'S26': sh('N10', 3.5, 8.0, [1.35, 1.4], [0.5, 0.42]),
    'S27': sh('N11', z=[1.0, 1.12], f=[[0.45, 0.45], [0.42, 0.46]]),
    'S28': sh('N11', z=[1.45, 1.52], f=[0.6, 0.4]),
    'S29': sh('N12', 0, 4.9, [1.0, 1.04]),
    'S30': sh('N12', 0.4, 8.0, [1.35, 1.4], [0.45, 0.58]),
    'S31': sh('N13', z=[1.08, 1.16], f=[[0.45, 0.62], [0.42, 0.64]]),
    'S32': sh('N14', 0, 5.5, [1.5, 1.55], [0.52, 0.68]),
    'S33': sh('N14', 2.4, 8.0, [1.6, 1.66], [0.5, 0.68]),
    'S34': sh('N15', 0, 3.5, [1.55, 1.6], [0.5, 0.7]),
    'S35': sh('HERO', z=[1.12, 1.04], f=[0.5, 0.6]),
}

L = lambda w, n, **k: at(w, n, **k)
callouts = [
    dict(kind='board', t=L('kilo', 10.5), until='S06', groups=[['a', 'Base'], ['c', 'Para la sopa'], ['b', 'Aceite verde']], items=[
        dict(g='a', t=L('kilo', 10.5), v='1,2', unit='kg', label='tomate chonto maduro'),
        dict(g='a', t=L('dos', 15.1), v=2, unit='', label='chalotas'),
        dict(g='a', t=L('cuatro', 16.3), v=4, unit='', label='dientes de ajo'),
        dict(g='a', t=L('dos', 18.4), v=2, unit='', label='ramas de tomillo'),
        dict(g='c', t=20.63, v=400, unit='ml', label='fondo de verduras'),
        dict(g='c', t=23.89, v=50, unit='ml', label='crema de leche'),
        dict(g='c', t=L('40', 26.1), v=40, unit='g', label='mantequilla fría'),
        dict(g='b', t=30.17, v=40, unit='g', label='albahaca'),
        dict(g='b', t=L('120', 32.6), v=120, unit='ml', label='aceite de girasol'),
    ]),
    dict(kind='list', t=L('8', 37.4), until='S07', rows=[
        [8, '', 'rebanadas de brioche', L('8', 37.4)],
        [160, 'g', 'de gruyère', L('160', 39.6)],
        [20, 'g', 'de parmesano', 42.05],
        [1, '', 'burrata (opcional)', L('burrata', 44.9)],
    ]),
    dict(kind='heat', t=L('alto', 54.0), level=4, label='Alto', until='S08'),
    dict(kind='timer', t=L('tres', 54.7, default=54.6), value=3, unit='min', label='sartén vacía', until='S08'),
    dict(kind='chips', t=L('cucharada', 57.6), items=[['+ 1 cda de aceite de oliva', L('cucharada', 57.6)]], until='S09'),
    dict(kind='timer', t=60.6, value=8, unit='min', main='6–8 minutos', label='sin moverlos', until='S09'),
    dict(kind='tip', t=64.6, icon='check', text='Piel ampollada, bordes casi negros', until='S10'),
    dict(kind='tip', t=L('reemplaza', 69.4), icon='fire', text='Ahumado sin encender el horno', until='S11'),
    dict(kind='heat', t=L('medio', 75.0), level=2, label='Medio-bajo', until='S12'),
    dict(kind='chips', t=L('cucharada', 78.6), items=[['+ 1 cda de aceite', L('cucharada', 78.6)]], until='S12'),
    dict(kind='timer', t=80.35, value=5, unit='min', label='sin que tomen color', until='S13'),
    dict(kind='tip', t=83.05, icon='x', text='Doradas: la sopa amarga', until='S13'),
    dict(kind='list', t=L('tomates', 86.3), until='S14', rows=[
        [2, 'ramas', 'de tomillo', L('tomillo', 87.0)],
        [5, 'g', 'de azúcar', L('azucar', 88.6)],
        [8, 'g', 'de sal', L('sal', 89.6)],
    ]),
    dict(kind='heat', t=L('medio', 91.9), level=3, label='Medio', until='S15'),
    dict(kind='timer', t=90.8, value=10, unit='min', label='hasta que se desarmen', until='S15'),
    dict(kind='chips', t=93.85, items=[['+ 400 ml de fondo', 93.85]], until='S16'),
    dict(kind='timer', t=L('veinte', 95.0, default=95.0), value=20, unit='min', label='hervor suave', until='S16'),
    dict(kind='heat', t=L('bajo', 96.3), level=1, label='Bajo', until='S16'),
    dict(kind='timer', t=L('dos', 98.9), value=2, unit='min', label='a máxima potencia', until='S17'),
    dict(kind='big', t=L('paso', 103.0), text='El paso clave', until='S18'),
    dict(kind='tip', t=107.2, icon='check', text='Colador fino: textura de seda', until='S19'),
    dict(kind='tip', t=109.3, icon='press', text='Presiona y descarta pieles y semillas', until='S19'),
    dict(kind='heat', t=L('fuego', 114.0), level=1, label='Bajo', until='S20'),
    dict(kind='chips', t=L('crema', 115.0), items=[['+ 50 ml de crema', L('crema', 115.0)],
                                                   ['+ 40 g de mantequilla fría', L('mantequilla', 117.0)]], until='S20'),
    dict(kind='tip', t=119.45, icon='x', text='Sin hervir', until='S21'),
    dict(kind='tip', t=L('brillo', 123.6), icon='spark', text='Brillo de espejo', until='S21'),
    dict(kind='tip', t=125.35, icon='x', text='Si hierve, se corta', until='S22'),
    dict(kind='chips', t=L('gotas', 128.9), items=[['+ 5 ml de vinagre de jerez', L('gotas', 128.9)]], until='S22'),
    dict(kind='timer', t=L('10', 134.2), value=10, unit='s', main='10 segundos', label='en agua hirviendo', until='S23'),
    dict(kind='timer', t=136.45, value=1, unit='min', main='Agua con hielo', label='de inmediato', cold=True, until='S23'),
    dict(kind='tip', t=L('choque', 140.0), icon='check', text='El choque fija el verde', until='S24'),
    dict(kind='list', t=144.35, until='S25', rows=[[40, 'g', 'de albahaca', 144.35], [120, 'ml', 'de aceite de girasol', L('licuala', 145.6)]]),
    dict(kind='timer', t=L('dos', 146.0), value=2, unit='min', label='en la licuadora', until='S25'),
    dict(kind='tip', t=150.75, icon='drop', text='Filtro de café: gota a gota', until='S26'),
    dict(kind='list', t=156.85, until='S27', rows=[[60, 'g', 'de mantequilla blanda', 156.85], [1, 'cdta', 'de tomillo', L('tomillo', 158.9)],
                                                   [20, 'g', 'de parmesano por fuera', L('presiona', 162.6)]]),
    dict(kind='chips', t=165.55, items=[['+ 160 g de gruyère', 165.55]], until='S28'),
    dict(kind='heat', t=L('fuego', 169.0), level=2, label='Medio-bajo', until='S29'),
    dict(kind='timer', t=L('tres', 170.4, default=170.4), value=4, unit='min', main='3–4 minutos', label='por lado', sides=2, until='S29'),
    dict(kind='tip', t=173.25, icon='fire', text='Fuego bajo: funde sin quemar', until='S30'),
    dict(kind='tip', t=177.65, icon='bread', text='Costra de parmesano', until='S30'),
    dict(kind='big', t=180.85, text='En bastones', until='S31'),
    dict(kind='chips', t=184.85, items=[['burrata (opcional)', 184.85]], until='S32'),
    dict(kind='chips', t=187.95, items=[['aceite verde', 187.95], ['albahaca', 190.05], ['sal en escamas', L('escamas', 192.0)]], until='S33'),
    dict(kind='big', t=L('listos', 195.6), text='¡A mojar!', until='S34'),
]

# pins sobre la mise en place (coordenadas de la imagen N01)
P = {'tomate': [0.24, 0.37], 'chalota': [0.13, 0.5], 'ajo': [0.1, 0.6], 'tomillo': [0.5, 0.43], 'fondo': [0.89, 0.32],
     'crema': [0.75, 0.33], 'mantequilla': [0.37, 0.48], 'albahaca': [0.58, 0.34], 'brioche': [0.75, 0.5],
     'gruyere': [0.37, 0.59], 'parmesano': [0.57, 0.59], 'burrata': [0.92, 0.41]}
pins = [
    dict(shot='S03', t=L('kilo', 10.5), xy=P['tomate'], n=1),
    dict(shot='S04', t=L('dos', 15.1), xy=P['chalota'], n=2),
    dict(shot='S04', t=L('cuatro', 16.3), xy=P['ajo'], n=3),
    dict(shot='S04', t=L('dos', 18.4), xy=P['tomillo'], n=4),
    dict(shot='S05', t=20.63, xy=P['fondo'], n=5),
    dict(shot='S05', t=23.89, xy=P['crema'], n=6),
    dict(shot='S05', t=L('40', 26.1), xy=P['mantequilla'], n=7),
    dict(shot='S06', t=30.17, xy=P['albahaca'], n=8),
    dict(shot='S07', t=L('8', 37.4), xy=P['brioche'], n=1),
    dict(shot='S07', t=L('160', 39.6), xy=P['gruyere'], n=2),
    dict(shot='S07', t=42.05, xy=P['parmesano'], n=3),
    dict(shot='S07', t=L('burrata', 44.9), xy=P['burrata'], n=4),
]

hook = {
    'title': ['Velouté', 'de tomate'],
    'cards': [
        {'before': {'src': 'N02', 'a': 0, 'rate': 0, 'z': 1.0, 'f': [0.5, 0.5]}, 'after': {'src': 'N02', 'a': 2.0, 'rate': 1, 'z': 1.25, 'f': [0.5, 0.45]}},
        {'before': {'src': 'HERO', 'a': 0, 'rate': 0, 'z': 1.0, 'f': [0.5, 0.6]}, 'after': {'src': 'N08', 'a': 1.0, 'rate': 1, 'z': 1.1, 'f': [0.5, 0.45]}},
        {'before': {'src': 'N13', 'a': 0, 'rate': 0, 'z': 1.0, 'f': [0.45, 0.62]}, 'after': {'src': 'N12', 'a': 2.0, 'rate': 1, 'z': 1.2, 'f': [0.48, 0.55]}},
    ],
    'rows': [], 'beat': 2.4,
    'words': [['Ahumada', at('ahumada', 6.2, default=6.15), '#D9573B', 'tomate tatemado'],
              ['Sedosa', at('sedosa', 7.0, default=6.95), '#F2B544', 'mantequilla montada'],
              ['Brillante', at('brillante', 7.6, default=7.6), '#7DB04A', 'aceite de albahaca']],
    'tagline': ['NIVEL RESTAURANTE  ·  PASO A PASO', 8.2],
    'sizzle': 'N02',
}
end = {'start': 'S35', 'title': '¡Buen provecho!', 'next': 'PRÓXIMO VIDEO', 'bubble': ['¿Con qué la mojas?', 'Cuéntamelo en', 'los comentarios']}
thumb = {'img': 'raw/HERO.jpg', 'crop': [0.03, 0.31, 0.94], 'title': ['Velouté', 'de tomate'],
         'tags': [['tatemado', '#D9573B', '#F6EFE3'], ['sedosa', '#F6EFE3', '#140E09'], ['nivel chef', '#F2B544', '#140E09']]}

S = lambda w, n, **k: at(w, n, W=WS, **k)
short = {
    'mode': 'autonomo', 'voice': 'voz_short.mp3', 'sheet': 'Short', 'limits': [30, 47], 'loop': True, 'cover_t': 1.2,
    'hook': {'title': ['Velouté', 'de tomate'], 'vertical': {'title_y': 470, 'cuts': [[0, 'HERO', 0, 1, [1.0, 1.08], [0.5, 0.6]]],
             'pins': []}},
    'chapters': [{'start': 'V02', 'title': 'Ingredientes', 'color': '#F2B544'}, {'start': 'V04', 'title': 'Tatemar', 'color': '#C8452E'},
                 {'start': 'V05', 'title': 'Velouté', 'color': '#E8673F'}, {'start': 'V08', 'title': 'Brioche', 'color': '#E9B44C'},
                 {'start': 'V09', 'title': 'Servicio', 'color': '#7DB04A'}],
    'cta': {'start': 'V10', 'card': ['Guárdala', 'Receta con trucos', 'en el canal  ▶'], 'until': '@V10$'},
    'shots': {
        'V02': {'src': 'N01', 'z': [1.25, 1.3], 'f': [[0.4, 0.45], [0.4, 0.45]]},
        'V03': {'src': 'N01', 'z': [1.5, 1.56], 'f': [[0.6, 0.44], [0.62, 0.44]]},
        'V04': {'src': 'N02', 'a': 0, 'b': 6.0},
        'V05': {'src': 'N04', 'a': 0, 'b': 5.6},
        'V06': {'src': 'N07', 'a': 0, 'b': 2.8},
        'V07': {'src': 'N08', 'a': 0.5, 'b': 3.6},
        'V08': {'src': 'N12', 'a': 0, 'b': 4.6},
        'V09': {'src': 'N14', 'a': 4.2, 'b': 8.0, 'z': [1.35, 1.4], 'f': [[0.5, 0.68], [0.5, 0.68]]},
        'V10': {'src': 'N15', 'a': 0, 'b': 3.3, 'z': [1.5, 1.55], 'f': [[0.5, 0.7], [0.5, 0.7]]},
        'V11': {'src': 'HERO', 'z': [1.1, 1.04], 'f': [[0.5, 0.6], [0.5, 0.6]]},
    },
    'callouts': [
        {'kind': 'list', 't': 1.7, 'until': 'V03', 'rows': [['1,2', 'kg', 'de tomate', 1.7], [2, '', 'chalotas', S('dos', 4.0)],
                                                          [4, '', 'ajos', S('cuatro', 5.0)], [400, 'ml', 'de fondo', 7.1],
                                                          [40, 'g', 'de mantequilla', S('40', 9.2)]]},
        {'kind': 'timer', 't': S('ocho', 17.9, default=17.9), 'value': 8, 'unit': 'min', 'label': 'fuego alto', 'until': 'V04'},
        {'kind': 'timer', 't': 22.8, 'value': 30, 'unit': 'min', 'label': 'con tomates y fondo', 'until': 'V05'},
        {'kind': 'tip', 't': 24.75, 'icon': 'check', 'text': 'Colador fino', 'until': 'V06'},
        {'kind': 'tip', 't': 27.55, 'icon': 'x', 'text': 'Sin hervir', 'until': 'V07'},
        {'kind': 'timer', 't': S('4', 33.3), 'value': 4, 'unit': 'min', 'label': 'por lado', 'sides': 2, 'until': 'V08'},
        {'kind': 'chips', 't': 35.25, 'items': [['aceite verde', 35.25], ['burrata', S('burrata', 36.9)]], 'until': 'V09'},
    ],
    'pins': [], 'subtitles': SUBS_S,
}

G = dict(slug='veloute_tomate', title='Velouté de tomate tatemado', tag='CURSO DE COCINA  ·  ALTA COCINA EN CASA', sheet='hoja_tomas.xlsx',
         voice='voz.mp3', music='calido', footage='portrait', duration_limits=[150, 240], media=media, chapters=chapters, shots=shots,
         callouts=callouts, pins=pins, subtitles=SUBS_L, hook=hook, end=end, thumb=thumb, short=short)
json.dump(G, open('guion.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('guion.json:', len(shots), 'tomas,', len(callouts), 'callouts,', len(SUBS_L), 'subtítulos;', 'short', len(SUBS_S), 'subtítulos')
