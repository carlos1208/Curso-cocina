"""ASR segments (times) + the script (text) → SRT whose lines carry the script's words at the voice's real times.
   python3 make_srt.py asr.json plan.json largo|short out.srt"""
import difflib, json, re, sys, unicodedata
from num2words import num2words
asr, plan, kind, out = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), sys.argv[3], sys.argv[4]
def norm(w):
    t = unicodedata.normalize('NFKD', w.lower()); t = ''.join(c for c in t if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9ñ]', '', t)
def expand(w):                       # ASR digits → words, so they match the script
    n = norm(w)
    if n.isdigit(): return [norm(x) for x in num2words(int(n), lang='es').split()]
    return [n] if n else []
script = [w for s in plan[kind] for w in s['narracion'].split()]
sn = [norm(w) for w in script]
aw, aseg = [], []
for k, s in enumerate(asr):
    for w in s['words']:
        for x in expand(w[0]):
            aw.append(x); aseg.append(k)
m = difflib.SequenceMatcher(None, sn, aw, autojunk=False)
seg_of = [None] * len(script)
for a, b, n in m.get_matching_blocks():
    for j in range(n): seg_of[a + j] = aseg[b + j]
print(f'match ratio {m.ratio():.2f}; unmatched script words:', [script[i] for i, s in enumerate(seg_of) if s is None])
# unmatched runs: into an ASR segment that sits between their neighbours (the ASR garbled it), else to the next
# segment when the run opens a clause (previous word ends in punctuation), else to the previous one
i = 0
while i < len(seg_of):
    if seg_of[i] is not None: i += 1; continue
    j = i
    while j < len(seg_of) and seg_of[j] is None: j += 1
    p = seg_of[i - 1] if i > 0 else None
    q = seg_of[j] if j < len(seg_of) else None
    between = [k for k in range(len(asr)) if (p is None or k > p) and (q is None or k < q)]
    if between or p is None or q is None:
        tgt = between[0] if between else (q if p is None else p)
        for k in range(i, j): seg_of[k] = tgt
    else:
        # split the run after its last clause-ending word: before → previous segment, after → next segment
        cut = i if re.search(r'[.?!:;,]$', script[i - 1]) else i
        for k in range(i, j):
            if re.search(r'[.?!:;,]$', script[k]): cut = k + 1
        if not re.search(r'[.?!:;,]$', script[i - 1]) and cut == i: cut = j
        for k in range(i, j): seg_of[k] = p if k < cut else q
    i = j
lines = {}
for w, s in zip(script, seg_of): lines.setdefault(s, []).append(w)
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); mi, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{mi:02d}:{s:02d},{ms:03d}'
with open(out, 'w', encoding='utf-8') as f:
    for n, k in enumerate(sorted(lines), 1):
        f.write(f"{n}\n{ts(asr[k]['t0'])} --> {ts(asr[k]['t1'])}\n{' '.join(lines[k])}\n\n")
        print(f"{asr[k]['t0']:7.2f} {asr[k]['t1']:7.2f}  {' '.join(lines[k])}")
missing = [k for k in range(len(asr)) if k not in lines]
if missing: print('ASR segments with no script words:', [(asr[k]['t0'], asr[k]['text']) for k in missing])
