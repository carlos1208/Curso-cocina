"""Transcribe a narration with Parakeet TDT v3 (sherpa-onnx), segment by segment on the silent pauses.
   python3 asr.py voz.mp3 out.json  → [{"t0","t1","text","words":[[w,t0,t1],...]}]"""
import json, subprocess, sys, wave
import numpy as np, sherpa_onnx
M = '/home/claude/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/'
src, out = sys.argv[1], sys.argv[2]
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-ac','1','-ar','16000','/tmp/_asr.wav'],check=True)
w = wave.open('/tmp/_asr.wav'); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32)/32768; sr = 16000
hop = 80
db = 20*np.log10(np.array([np.sqrt(np.mean(x[i:i+hop]**2)) for i in range(0, len(x)-hop, hop)])+1e-9)
sp = db > -50
segs=[]; i=0; n=len(sp)
while i<n:
    if sp[i]:
        j=i
        while j<n:
            if sp[j]: j+=1; continue
            k=j
            while k<n and not sp[k]: k+=1
            if (k-j)*hop/sr < 0.12 and k<n: j=k
            else: break
        segs.append((i*hop/sr, j*hop/sr)); i=j
    else: i+=1
rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=M+'encoder.int8.onnx', decoder=M+'decoder.int8.onnx', joiner=M+'joiner.int8.onnx',
        tokens=M+'tokens.txt', num_threads=2, model_type='nemo_transducer', decoding_method='greedy_search')
res = []
for a, b in segs:
    a0, b0 = max(0, a-0.15), min(len(x)/sr, b+0.15)
    s = rec.create_stream(); s.accept_waveform(sr, x[int(a0*sr):int(b0*sr)]); rec.decode_stream(s)
    r = s.result
    toks, ts = list(r.tokens), list(r.timestamps)
    # tokens: sentencepiece pieces; a leading '▁' starts a word
    words=[]
    for tk, t in zip(toks, ts):
        if tk.startswith(('▁',' ')) or not words:
            words.append([tk.replace('▁','').strip(), round(a0+t,3), round(a0+t,3)])
        else:
            words[-1][0] += tk; words[-1][2] = round(a0+t,3)
    res.append(dict(t0=round(a,3), t1=round(b,3), text=r.text.strip(), words=words))
    print(f'{a:7.2f} {b:7.2f}  {r.text.strip()}', flush=True)
json.dump(res, open(out,'w'), ensure_ascii=False, indent=1)
