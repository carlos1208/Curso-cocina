"""Cut parts of an ElevenLabs narration at its digitally silent pauses and write a 192 kb/s MP3.
   python3 edit_voice.py in.mp3 out.mp3 '[[a,b],...]'  (cuts in seconds of the input)"""
import json, subprocess, sys, wave, numpy as np
src, dst, cuts = sys.argv[1], sys.argv[2], sorted(json.loads(sys.argv[3]))
SR = 44100
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-ac','1','-ar',str(SR),'/tmp/_e.wav'],check=True)
w = wave.open('/tmp/_e.wav'); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float)/32768
keep, t = [], 0.0
for a, b in cuts:
    if a > t: keep.append((t, a))
    t = max(t, b)
if t < len(x)/SR: keep.append((t, len(x)/SR))
parts = []
for a, b in keep:
    seg = x[int(a*SR):int(b*SR)].copy()
    # every cut falls in digital silence; a 5 ms fade guards against any residual click
    f = int(0.005*SR); seg[:f] *= np.linspace(0,1,f); seg[-f:] *= np.linspace(1,0,f)
    lvl = 20*np.log10(np.sqrt(np.mean(np.r_[x[max(0,int(a*SR)-441):int(a*SR)+441], x[max(0,int(b*SR)-441):int(b*SR)+441]]**2))+1e-9)
    print(f'keep {a:7.3f}–{b:7.3f}  (edge level {lvl:.0f} dB)')
    parts.append(seg)
y = np.concatenate(parts)
with wave.open('/tmp/_e2.wav','wb') as o:
    o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((np.clip(y,-1,1)*32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg','-y','-loglevel','error','-i','/tmp/_e2.wav','-c:a','libmp3lame','-b:a','192k',dst],check=True)
print(f'{src}: {len(x)/SR:.2f} s → {dst}: {len(y)/SR:.2f} s')
