# Motion Reel 2026

20-second motion design showreel, 1920×1080 @ 60 fps, made entirely in code — no After Effects, no templates.

**Watch:** [`reel_web.mp4`](reel_web.mp4)

| Time | Section | What's happening |
|---|---|---|
| 0–2 s | Principles | Bouncing ball with squash, stretch and anticipation; the ball grows until it becomes the background |
| 2–4 s | Kinetic type | "MOTION" slams in, splits in half, then the camera zooms through the O |
| 4–6 s | Editorial cuts | EVERY / FRAME / TELLS / A STORY, one word per beat |
| 6–8 s | Grid systems | 144 shapes morph in ripple waves, then shrink to dots |
| 8–10 s | Particles | The dots burst into 4,000 particles that spell DESIGN |
| 10–12 s | 3D / depth | The particles form a point-cloud sphere, turn into a torus, then collapse |
| 12–14 s | Montage | Rings, isometric blocks, Unknown-Pleasures lines and a kaleidoscope, one per half beat |
| 14–16 s | Data viz | Frame counter, bars that bounce on the kick, and a line chart |
| 16–18 s | Build-up | An accelerating tunnel with a 3-2-1 countdown and a silence gap |
| 18–20 s | Signature | Impact, then the name lockup; the ball from the intro lands as the full stop |

The whole piece runs at 120 BPM, so every cut and hit lands on a beat of the procedural soundtrack.

## Files

- `index.html` + `reel.js`: the animation. Every frame is a pure function of time, so any frame can be rendered in any order.
  - Open it through a local server for a live preview with sound: `npx serve .`, then `/index.html` (`?t=9.5` shows a single frame, `?sub=4` turns on motion blur).
- `audio.py`: synthesizes `soundtrack.wav` (drums, bass, pads, arp, riser and impact) with numpy/scipy.
- `render.cjs`: renders the 1200 frames in headless Chromium using 4 workers, adds motion blur (4–12 subframes per frame), and encodes with ffmpeg.
- `fonts/`: Anton, Space Grotesk and JetBrains Mono (SIL Open Font License).

## Rebuild

```bash
pip install numpy scipy imageio-ffmpeg
python3 audio.py
NODE_PATH=$(npm root -g) FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") node render.cjs
```

This writes `reel.mp4` (the high-bitrate master, which is git-ignored) and `reel_web.mp4`.
