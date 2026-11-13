"""Writes guion.json for the enchiladas (design layer). Times: '@S07' = shot start; numbers = seconds of the voice
(word starts measured with Parakeet on voz.mp3 / voz_short.mp3)."""
import json
from openpyxl import load_workbook

wb = load_workbook('hoja_tomas.xlsx')
subs_l = [list(r) for r in wb['Subtítulos'].iter_rows(min_row=2, values_only=True) if r[0] is not None]
subs_s = [list(r) for r in wb['Subtítulos Short'].iter_rows(min_row=2, values_only=True) if r[0] is not None]

# ── subtitles: the script's words at the voice's times, written with figures and highlighted quantities ──
FIX_L = {
    'Para cuatro personas necesitas seiscientos gramos de pechuga de pollo.': 'Para **4 personas** necesitas **600 g** de pechuga de pollo.',
    'Seis chiles guajillo y dos chiles ancho.': '**6** chiles guajillo y **2** chiles ancho.',
    'Trescientos gramos de tomate, cebolla blanca': '**300 g** de tomate, cebolla blanca',
    'y cuatro dientes de ajo.': 'y **4** dientes de ajo.',
    'Doce tortillas de maíz y aceite.': '**12** tortillas de maíz y aceite.',
    'Ponlo en una olla con litro y medio de agua,': 'Ponlo en una olla con **litro y medio** de agua,',
    'media cebolla y dos dientes de ajo.': '**media** cebolla y **2** dientes de ajo.',
    'Una hoja de laurel y una cucharadita de sal.': '**1** hoja de laurel y **1 cucharadita** de sal.',
    'Cocina veinticinco minutos a fuego medio-bajo.': 'Cocina **25 minutos** a fuego **medio-bajo**.',
    'déjalo enfriar diez minutos y deshébralo con dos tenedores.': 'déjalo enfriar **10 minutos** y deshébralo con **2** tenedores.',
    'Guarda doscientos cincuenta mililitros para la salsa.': 'Guarda **250 ml** para la salsa.',
    'Tuéstalos en una sartén seca a fuego medio,': 'Tuéstalos en una sartén seca a fuego **medio**,',
    'de veinte a treinta segundos por lado.': 'de **20 a 30 segundos** por lado.',
    'Remójalos quince minutos en agua caliente para que se ablanden.': 'Remójalos **15 minutos** en agua caliente para que se ablanden.',
    'un cuarto de cebolla y dos dientes de ajo.': '**¼** de cebolla y **2** dientes de ajo.',
    'Media cucharadita de comino,': '**½ cucharadita** de comino,',
    'media de orégano,': '**½** de orégano,',
    'una cucharadita de sal y el caldo.': '**1 cucharadita** de sal y el caldo.',
    'Un minuto,': '**1 minuto**,',
    'Calienta dos cucharadas de aceite y fríe la salsa a fuego medio,': 'Calienta **2 cucharadas** de aceite y fríe la salsa a fuego **medio**,',
    'Calienta ciento veinte mililitros de aceite a fuego medio.': 'Calienta **120 ml** de aceite a fuego **medio**.',
    'Báñalas con más salsa caliente.': 'Báñalas con más salsa caliente.',
    '¿las prefieres rojas o verdes?': '¿Las prefieres rojas o verdes?',
}
SPLIT_L = {   # lines that join a number to its unit, or run long for the 700 px column (times from the word marks)
    'de ocho': None, 'a diez minutos.': [[None, None, 'de **8 a 10 minutos**.']],
    'Pasa': None, 'cada tortilla cinco segundos por lado.': [[131.39, None, 'Pasa cada tortilla **5 segundos** por lado.']],
    'Armado. Rellena cada tortilla con dos cucharadas de pollo y enróllala.': [[145.31, 145.68, 'Armado.'], [145.79, None, 'Rellena cada tortilla con **2 cucharadas** de pollo y enróllala.']],
    'Acomoda tres por plato, con la unión hacia abajo para que no se abran.': [[None, 151.5, 'Acomoda **3 por plato**,'], [151.66, None, 'con la unión hacia abajo para que no se abran.']],
}
out_l, pending = [], None
for t0, t1, txt in subs_l:
    if txt in SPLIT_L:
        rule = SPLIT_L[txt]
        if rule is None:
            pending = t0; continue
        for a, b, s in rule:
            out_l.append([round(a if a is not None else (pending if pending is not None else t0), 2), round(b if b is not None else t1, 2), s])
        pending = None; continue
    out_l.append([round(t0, 2), round(t1, 2), FIX_L.get(txt, txt)])

FIX_S = {
    'Necesitas seiscientos gramos de pollo,': 'Necesitas **600 g** de pollo,',
    'seis chiles guajillo': '**6** chiles guajillo',
    'y dos chiles ancho.': 'y **2** chiles ancho.',
    'Trescientos gramos de tomate y doce tortillas de maíz.': '**300 g** de tomate y **12** tortillas de maíz.',
    'Cocina el pollo veinticinco minutos y deshébralo.': 'Cocina el pollo **25 minutos** y deshébralo.',
    'remójalos quince minutos y licúalos con tomate,': 'remójalos **15 minutos** y licúalos con tomate,',
}
out_s = [[round(t0, 2), round(t1, 2), FIX_S.get(txt, txt)] for t0, t1, txt in subs_s]

C = dict(base='#F2B544', pollo='#DB8B78', salsa='#D9573B', tortilla='#F3D35B', armado='#E9A23B', verde='#A9C44E')

G = {
  "slug": "enchiladas_rojas",
  "title": "Enchiladas rojas de pollo",
  "tag": "CURSO DE COCINA  ·  COCINA MEXICANA",
  "sheet": "hoja_tomas.xlsx",
  "voice": "voz.mp3",
  "music": "latino",
  "footage": "landscape",
  "cue_chars": 64,
  "duration_limits": [150, 240],
  "media": {
    "HERO": {"img": "raw/HERO.jpg"}, "N01": {"img": "raw/N01.jpg"}, "N03": {"img": "raw/N03.jpg"},
    "N04": {"img": "raw/N04.jpg"}, "N06": {"img": "raw/N06.jpg"}, "N10": {"img": "raw/N10.jpg"},
    "N02": {"clip": "raw/N02.mp4"}, "N05": {"clip": "raw/N05.mp4"}, "N07": {"clip": "raw/N07.mp4"},
    "N08": {"clip": "raw/N08.mp4"}, "N09": {"clip": "raw/N09.mp4"}, "N11": {"clip": "raw/N11.mp4"}, "N12": {"clip": "raw/N12.mp4"}
  },
  "chapters": [
    {"start": "S03", "id": "ingredientes", "title": "Ingredientes", "h1": "Ingredientes", "h2": "para 4 personas", "color": C['base'], "mark": "MISE EN PLACE"},
    {"start": "S07", "id": "pollo", "title": "Pollo", "h1": "Pollo", "h2": "deshebrado", "color": C['pollo'], "mark": "POLLO"},
    {"start": "S13", "id": "salsa", "title": "Salsa roja", "h1": "Salsa", "h2": "de guajillo", "color": C['salsa'], "mark": "SALSA ROJA"},
    {"start": "S23", "id": "tortillas", "title": "Tortillas", "h1": "Tortillas", "h2": "flexibles", "color": C['tortilla'], "mark": "TORTILLAS"},
    {"start": "S27", "id": "armado", "title": "Armado", "h1": "Rellenar", "h2": "y enrollar", "color": C['armado'], "mark": "ARMADO"},
    {"start": "S30", "id": "servicio", "title": "Servicio", "h1": "Servir", "h2": "y decorar", "color": C['verde'], "mark": "SERVICIO"}
  ],
  # landscape card 1000x562: clips (640x360) fill it at z 1; photos (4:3) lose a strip top and bottom (f picks it)
  "shots": {
    "S01": {"src": "HERO"}, "S02": {"src": "N12", "a": 0, "b": 4.0},
    "S03": {"src": "N01", "z": [1.0, 1.03], "f": [[0.42, 0.52], [0.42, 0.52]]},
    "S04": {"src": "N01", "z": [1.03, 1.06], "f": [[0.42, 0.52], [0.40, 0.52]], "tr": "none"},
    "S05": {"src": "N01", "z": [1.06, 1.09], "f": [[0.40, 0.52], [0.42, 0.50]], "tr": "none"},
    "S06": {"src": "N01", "z": [1.45, 1.52], "f": [[0.30, 0.22], [0.32, 0.22]]},
    "S07": {"src": "N02", "a": 0, "b": 8.0, "z": [1.0, 1.04]},
    "S08": {"src": "N02", "a": 3.0, "b": 6.4, "z": [1.28, 1.34], "f": [[0.45, 0.32], [0.47, 0.32]]},
    "S09": {"src": "N02", "a": 2.6, "b": 8.0, "z": [1.0, 1.06], "f": [[0.5, 0.6], [0.5, 0.6]]},
    "S10": {"src": "N02", "a": 0, "b": 3.2, "z": [1.3, 1.38], "f": [[0.45, 0.35], [0.45, 0.35]]},
    "S11": {"src": "N03", "z": [1.04, 1.12], "f": [[0.36, 0.6], [0.34, 0.6]]},
    "S12": {"src": "N02", "a": 2.4, "b": 8.0, "z": [1.18, 1.24], "f": [[0.45, 0.4], [0.45, 0.42]]},
    "S13": {"src": "N04", "z": [1.0, 1.12], "f": [[0.5, 0.55], [0.56, 0.6]]},
    "S14": {"src": "N04", "z": [1.55, 1.62], "f": [[0.64, 0.68], [0.64, 0.68]]},
    "S15": {"src": "N05", "a": 0, "b": 5.9, "z": [1.0, 1.04]},
    "S16": {"src": "N05", "a": 1.7, "b": 8.0, "z": [1.2, 1.26], "f": [[0.48, 0.4], [0.48, 0.42]]},
    "S17": {"src": "N06", "z": [1.04, 1.12], "f": [[0.38, 0.62], [0.38, 0.6]]},
    "S18": {"src": "N07", "a": 0, "b": 3.6, "z": [1.0, 1.02]},
    "S19": {"src": "N07", "a": 3.6, "b": 6.6, "z": [1.0, 1.04]},
    "S20": {"src": "N07", "a": 5.9, "b": 8.0, "z": [1.08, 1.12]},
    "S21": {"src": "N08", "a": 0, "b": 7.2, "z": [1.0, 1.03]},
    "S22": {"src": "N08", "a": 2.5, "b": 8.0, "z": [1.2, 1.26], "f": [[0.45, 0.42], [0.45, 0.42]]},
    "S23": {"src": "N09", "a": 0, "b": 7.0, "z": [1.0, 1.03]},
    "S24": {"src": "N09", "a": 2.5, "b": 6.2, "z": [1.25, 1.3], "f": [[0.42, 0.42], [0.42, 0.42]]},
    "S25": {"src": "N09", "a": 1.6, "b": 8.0, "z": [1.06, 1.1]},
    "S26": {"src": "N08", "a": 0, "b": 3.8, "z": [1.3, 1.36], "f": [[0.45, 0.4], [0.45, 0.4]]},
    "S27": {"src": "N10", "z": [1.0, 1.1], "f": [[0.5, 0.6], [0.5, 0.58]]},
    "S28": {"src": "N11", "a": 5.0, "b": 8.0, "z": [1.04, 1.08], "f": [[0.48, 0.6], [0.48, 0.6]]},
    "S29": {"src": "N11", "a": 1.0, "b": 3.9, "z": [1.0, 1.02]},
    "S30": {"src": "HERO", "z": [1.08, 1.24], "f": [[0.47, 0.6], [0.47, 0.58]]},
    "S31": {"src": "N12", "a": 0, "b": 4.9, "z": [1.0, 1.04]},
    "S32": {"src": "HERO", "z": [1.04, 1.04]}
  },
  "callouts": [
    {"kind": "board", "t": 14.1, "until": "S05",
     "groups": [["a", "Pollo y salsa"], ["b", "Aromáticos"], ["c", "Y además"]],
     "items": [
       {"g": "a", "t": 14.1, "v": 600, "unit": "g", "label": "pechuga de pollo"},
       {"g": "a", "t": 17.3, "v": 6, "unit": "", "label": "chiles guajillo"},
       {"g": "a", "t": 18.9, "v": 2, "unit": "", "label": "chiles ancho"},
       {"g": "a", "t": 20.8, "v": 300, "unit": "g", "label": "tomate"},
       {"g": "b", "t": 22.55, "v": "¾", "unit": "", "label": "cebolla blanca"},
       {"g": "b", "t": 23.9, "v": 4, "unit": "", "label": "dientes de ajo"},
       {"g": "b", "t": 25.8, "v": "½", "unit": "cdta", "label": "comino"},
       {"g": "b", "t": 26.6, "v": "½", "unit": "cdta", "label": "orégano"},
       {"g": "c", "t": 27.4, "v": 1, "unit": "", "label": "hoja de laurel"},
       {"g": "c", "t": 28.18, "v": 2, "unit": "cdtas", "label": "sal"},
       {"g": "c", "t": 28.75, "v": 12, "unit": "", "label": "tortillas de maíz"},
       {"g": "c", "t": 30.11, "v": 120, "unit": "ml", "label": "aceite (+ 2 cdas)"}]},
    {"kind": "list", "t": 32.39, "rows": [[120, "ml", "crema agria", 32.39], [100, "g", "queso fresco", 33.35], ["½", "", "cebolla morada", 34.23], [2, "hojas", "lechuga", 35.43], [1, "", "aguacate", 36.07]]},
    {"kind": "chips", "t": 41.26, "items": [["+ 1,5 l de agua", 41.26], ["+ ½ cebolla", 42.74]], "until": "S07"},
    {"kind": "chips", "t": 43.94, "items": [["+ 2 dientes de ajo", 43.94]]},
    {"kind": "chips", "t": 45.88, "items": [["+ 1 hoja de laurel", 45.88], ["+ 1 cdta de sal", 47.23]]},
    {"kind": "timer", "t": 49.58, "value": 25, "unit": "min", "label": "hervor suave"},
    {"kind": "heat", "t": 50.85, "level": 2, "label": "Medio-bajo", "until": "S09"},
    {"kind": "tip", "t": 54.55, "icon": "x", "text": "A borbotones: seco y fibroso"},
    {"kind": "timer", "t": 59.28, "value": 10, "unit": "min", "label": "que se enfríe"},
    {"kind": "tip", "t": 60.09, "icon": "hand", "text": "Con 2 tenedores"},
    {"kind": "list", "t": 64.98, "rows": [[250, "ml", "de caldo → salsa", 64.98]]},
    {"kind": "chips", "t": 74.92, "items": [["– tallo", 74.92], ["– semillas", 75.97], ["– venas", 77.17]]},
    {"kind": "tip", "t": 78.66, "icon": "fire", "text": "El picante está en semillas y venas"},
    {"kind": "heat", "t": 82.62, "level": 3, "label": "Medio"},
    {"kind": "timer", "t": 84.03, "value": 30, "unit": "s", "main": "20–30 segundos", "label": "sartén seca", "sides": 2},
    {"kind": "tip", "t": 89.4, "icon": "x", "text": "Quemados: salsa amarga"},
    {"kind": "timer", "t": 93.91, "value": 15, "unit": "min", "label": "en agua caliente"},
    {"kind": "chips", "t": 98.77, "items": [["+ 300 g de tomate", 98.77], ["+ ¼ de cebolla", 99.53]], "until": "S18"},
    {"kind": "chips", "t": 101.12, "items": [["+ 2 dientes de ajo", 101.12]]},
    {"kind": "list", "t": 103.0, "rows": [["½", "cdta", "de comino", 103.0], ["½", "cdta", "de orégano", 105.11], [1, "cdta", "de sal", 106.4], [250, "ml", "de caldo", 108.08]]},
    {"kind": "timer", "t": 109.48, "value": 1, "unit": "min", "label": "en la licuadora"},
    {"kind": "chips", "t": 112.34, "items": [["+ 2 cdas de aceite", 112.34]]},
    {"kind": "heat", "t": 115.06, "level": 3, "label": "Medio"},
    {"kind": "timer", "t": 116.23, "value": 10, "unit": "min", "main": "8–10 minutos", "label": "hasta que oscurezca"},
    {"kind": "tip", "t": 119.07, "icon": "check", "text": "Oscura y espesa: ya no sabe a crudo"},
    {"kind": "chips", "t": 128.28, "items": [["+ 120 ml de aceite", 128.28]]},
    {"kind": "heat", "t": 130.28, "level": 3, "label": "Medio"},
    {"kind": "timer", "t": 133.03, "value": 5, "unit": "s", "main": "5 segundos", "label": "por lado", "sides": 2},
    {"kind": "tip", "t": 135.2, "icon": "x", "text": "No es para freírlas"},
    {"kind": "tip", "t": 137.97, "icon": "check", "text": "Flexibles: no se rompen"},
    {"kind": "tip", "t": 142.03, "icon": "drop", "text": "Salsa por ambos lados"},
    {"kind": "list", "t": 147.24, "rows": [[2, "cdas", "de pollo por tortilla", 147.24]]},
    {"kind": "tip", "t": 148.68, "icon": "hand", "text": "Rellena y enrolla"},
    {"kind": "big", "t": 150.72, "text": "3 por plato", "until": "S29"},
    {"kind": "tip", "t": 152.0, "icon": "check", "text": "La unión hacia abajo", "until": "S29"},
    {"kind": "chips", "t": 159.99, "items": [["crema", 159.99], ["queso fresco", 161.23], ["cebolla morada", 162.97]], "until": "S30"},
    {"kind": "chips", "t": 164.59, "items": [["lechuga", 164.59], ["aguacate", 165.47]], "until": "S30"},
    {"kind": "big", "t": 167.41, "text": "¡A la mesa!"}
  ],
  "pins": [],
  "subtitles": out_l,
  "hook": {
    "title": ["Enchiladas", "rojas"],
    "cards": [
      {"before": {"src": "N04", "a": 0, "rate": 0, "z": 1.0, "f": [0.47, 0.55]}, "after": {"src": "N05", "a": 2.0, "rate": 1, "z": 1.0, "f": [0.42, 0.5]}},
      {"before": {"src": "HERO", "a": 0, "rate": 0, "z": 1.0, "f": [0.46, 0.6]}, "after": {"src": "N12", "a": 1.2, "rate": 1, "z": 1.0, "f": [0.52, 0.5]}},
      {"before": {"src": "N10", "a": 0, "rate": 0, "z": 1.0, "f": [0.5, 0.6]}, "after": {"src": "N11", "a": 0.8, "rate": 1, "z": 1.0, "f": [0.56, 0.5]}}
    ],
    "rows": [],
    "beat": 2.0,
    "words": [["Picantes", 2.05, C['salsa'], "chile guajillo y ancho"], ["Cremosas", 3.2, C['base'], "crema y queso fresco"], ["Bañadas", 4.2, "#F6EFE3", "en salsa roja"]],
    "tagline": ["COMO EN MÉXICO  ·  PASO A PASO", 6.4],
    "sizzle": "N09"
  },
  "end": {"start": "S32", "title": "¡Buen provecho!", "next": "PRÓXIMO VIDEO", "bubble": ["¿Rojas o verdes?", "Cuéntamelo en", "los comentarios"]},
  "thumb": {"img": "raw/HERO.jpg", "crop": [0.15, 0.08, 0.62], "title": ["Enchiladas", "rojas"],
            "tags": [["picantes", C['salsa'], "#F6EFE3"], ["cremosas", "#F6EFE3", "#140E09"], ["de pollo", C['base'], "#140E09"]]},
  "short": {
    "mode": "autonomo", "voice": "voz_short.mp3", "sheet": "Short", "limits": [30, 47], "loop": True, "cover_t": 1.6,
    "hook": {
      "title": ["Enchiladas", "rojas"],
      "vertical": {"title_y": 470,
                   "cuts": [[0, "HERO", 0, 1, [1.0, 1.08], [0.47, 0.6]]],
                   "pins": [["salsa de guajillo", 2.4, [0.3, 0.72], C['salsa']],
                            ["crema y queso", 3.0, [0.6, 0.5], "#F6EFE3"]]}
    },
    "chapters": [
      {"start": "V02", "title": "Ingredientes", "color": C['base']},
      {"start": "V04", "title": "Pollo", "color": C['pollo']},
      {"start": "V05", "title": "Salsa", "color": C['salsa']},
      {"start": "V07", "title": "Tortillas", "color": C['tortilla']},
      {"start": "V08", "title": "Armado", "color": C['armado']},
      {"start": "V09", "title": "Servicio", "color": C['verde']}
    ],
    "cta": {"start": "V10", "card": ["Guárdala", "Receta con trucos", "en el canal  ▶"], "until": "@V10$"},
    "shots": {
      "V02": {"src": "N01", "z": [1.0, 1.06], "f": [[0.42, 0.52], [0.40, 0.52]]},
      "V03": {"src": "N01", "z": [1.3, 1.36], "f": [[0.34, 0.3], [0.36, 0.28]]},
      "V04": {"src": "N02", "a": 0, "b": 3.5},
      "V05": {"src": "N05", "a": 0, "b": 6.1},
      "V06": {"src": "N08", "a": 2.0, "b": 5.3},
      "V07": {"src": "N09", "a": 0, "b": 4.2},
      "V08": {"src": "N11", "a": 0.6, "b": 4.6},
      "V09": {"src": "N12", "a": 0, "b": 4.2},
      "V10": {"src": "N12", "a": 4.2, "b": 6.9},
      "V11": {"src": "HERO", "z": [1.1, 1.04], "f": [[0.47, 0.6], [0.47, 0.6]]}
    },
    "callouts": [
      {"kind": "list", "t": 4.58, "until": "V03", "rows": [[600, "g", "de pollo", 4.58], [6, "", "chiles guajillo", 6.47], [2, "", "chiles ancho", 8.16], [300, "g", "de tomate", 9.6], [12, "", "tortillas de maíz", 11.44]]},
      {"kind": "timer", "t": 14.23, "value": 25, "unit": "min", "label": "y deshébralo"},
      {"kind": "timer", "t": 18.7, "value": 15, "unit": "min", "label": "chiles en remojo"},
      {"kind": "timer", "t": 23.0, "value": 10, "unit": "min", "main": "8–10 minutos", "label": "a fuego medio"},
      {"kind": "timer", "t": 26.3, "value": 5, "unit": "s", "main": "5 segundos", "label": "por lado", "sides": 2},
      {"kind": "list", "t": 30.3, "rows": [[2, "cdas", "de pollo por tortilla", 30.3]]},
      {"kind": "chips", "t": 34.45, "items": [["crema", 34.45], ["queso fresco", 35.01], ["cebolla morada", 35.88]], "until": "V09"},
      {"kind": "chips", "t": 37.01, "items": [["aguacate", 37.01]]}
    ],
    "pins": [],
    "subtitles": out_s
  }
}

# pins on the mise en place (numbers = board order), re-planted on each shot of the same photo so they stay
PIN_N01 = [(1, 14.1, [0.40, 0.70]), (2, 17.3, [0.10, 0.70]), (3, 18.9, [0.25, 0.57]), (4, 20.8, [0.23, 0.34]),
           (5, 22.55, [0.25, 0.43]), (6, 23.9, [0.35, 0.37]), (7, 25.8, [0.50, 0.40]), (8, 26.6, [0.61, 0.40]),
           (9, 27.4, [0.40, 0.42]), (11, 28.75, [0.47, 0.22])]
starts = {'S03': 10.38, 'S04': 17.21, 'S05': 25.77}
ends = {'S03': 17.21, 'S04': 25.77, 'S05': 31.19}
for sid in ('S03', 'S04', 'S05'):
    for n, t, xy in PIN_N01:
        if t < ends[sid]:
            G['pins'].append({"shot": sid, "t": round(max(t, starts[sid]), 2), "xy": xy, "n": n})
for n, (t, xy) in enumerate([(32.39, [0.33, 0.18]), (33.35, [0.61, 0.26]), (34.23, [0.15, 0.21]), (35.43, [0.06, 0.22]), (36.07, [0.22, 0.16])], 1):
    G['pins'].append({"shot": "S06", "t": t, "xy": xy, "n": n})
for n, (t, xy) in enumerate([(159.99, [0.37, 0.68]), (161.23, [0.55, 0.6]), (162.97, [0.385, 0.57]), (164.59, [0.53, 0.54]), (165.47, [0.5, 0.46])], 1):
    G['pins'].append({"shot": "S30", "t": t, "xy": xy, "n": n})

import re
def nbsp(t):
    return re.sub(r'\*\*(.+?)\*\*', lambda m: '**' + m.group(1).replace(' ', '\u00a0') + '**', t)
for lst in (G['subtitles'], G['short']['subtitles']):
    for s in lst: s[2] = nbsp(s[2])
# keep "Picantes," on its own: the next line starts just past the 0.35 s merge gap
for k, s in enumerate(G['subtitles']):
    if s[2] == 'Picantes,': G['subtitles'][k + 1][0] = round(s[1] + 0.36, 2)
# callouts: start inside the shot they belong to (sheet times are rounded to 0.1 s) and end with it
rows = [r for r in wb['Tomas'].iter_rows(min_row=2, values_only=True) if r[0]]
T = {r[0]: (float(r[1]), float(r[2])) for r in rows}
def shot_of(t):
    for sid, (a, b) in T.items():
        if a - 0.2 <= t < b - 0.2: return sid
    return list(T)[-1]
for o in G['callouts']:
    sid = shot_of(o['t'])
    if o['t'] < T[sid][0] + 0.02: o['t'] = round(T[sid][0] + 0.05, 2)
    o.setdefault('until', sid)
rows_s = [r for r in wb['Short'].iter_rows(min_row=2, values_only=True) if r[0]]
TS = {r[0]: (float(r[1]), float(r[2])) for r in rows_s}
for o in G['short']['callouts']:
    sid = next((k for k, (a, b) in TS.items() if a - 0.2 <= o['t'] < b - 0.2), list(TS)[-1])
    if o['t'] < TS[sid][0] + 0.02: o['t'] = round(TS[sid][0] + 0.05, 2)
    o.setdefault('until', sid)
json.dump(G, open('guion.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out_l), 'subtitles long,', len(out_s), 'short;', len(G['callouts']), 'callouts,', len(G['pins']), 'pins')
for s in out_l: print(f'{s[0]:7.2f} {s[1]:7.2f} {s[2]}')
