#!/usr/bin/env python3
"""Post-build tweaks for web/index.html (run after build_web.py). Idempotent.
- <!DOCTYPE html> + charset + viewport first: the Artifacts server refuses pages that don't start as HTML.
- Timers of 60+ minutes read as H:MM "horas", like the video.
- Wider quantity column ("300–500 ml", and ×3 → "900–1500 ml").
- Mobile stage: colour scale sits above the two-line hint; the hint wraps before the timer."""
p = 'web/index.html'
s = open(p, encoding='utf-8').read()
if not s.lstrip().lower().startswith('<!doctype'):
    s = '<!DOCTYPE html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + s
reps = [
    ('grid-template-columns: 26px 7.2rem 1fr;', 'grid-template-columns: 26px 8.8rem 1fr;'),
    ('    .caramel { bottom: 44px; }\n  }', '    .caramel { bottom: 62px; }\n    .hint { right: 124px; }\n  }'),
    ('<span class="t" id="timerTxt">00:00</span><small>min</small>',
     '<span class="t" id="timerTxt">00:00</span><small id="timerUnit">min</small>'),
    ('timerTxt.textContent = mmss(f * S.time * 60);',
     "timerTxt.textContent = S.time >= 60 ? hmm(f * S.time * 60) : mmss(f * S.time * 60);\n"
     "      document.getElementById('timerUnit').textContent = S.time >= 60 ? 'horas' : 'min';"),
    ("const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;",
     "const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;\n"
     "  const hmm = s => `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}`;"),
]
for old, new in reps:
    if new in s:
        continue
    assert old in s, old
    s = s.replace(old, new)
open(p, 'w', encoding='utf-8').write(s)
print('patched', p)
