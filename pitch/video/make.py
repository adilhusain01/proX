#!/usr/bin/env python3
"""Builds the narrated pitch video from ../index.html.

Each slide's <aside> is spoken by an ElevenLabs voice, the slide stays up for as long as its
line takes, and slides cross-fade. Audio is cached by text, so a rerun only pays for lines
that changed. Needs ffmpeg, Node, and ../.env with ELEVENLABS_API_KEY.

    python3 pitch/video/make.py            # build out/prox-pitch.mp4
    python3 pitch/video/make.py --no-tts   # reuse cached audio only, spend nothing
"""
import base64, hashlib, json, os, re, subprocess, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DECK = HERE.parent / 'index.html'
OUT = HERE / 'out'
VOICE = 'onwK4e9ZLuTAKqWW03F9'      # Daniel, Steady Broadcaster (a built-in voice, usable on the free plan)
MODEL = 'eleven_multilingual_v2'
FADE, LEAD, TAIL = 0.35, 0.25, 0.55  # seconds: cross-fade, pause before a line, pause after it

def env():
    for line in (HERE.parent / '.env').read_text().splitlines():
        if '=' in line and not line.strip().startswith('#'):
            k, v = line.split('=', 1); os.environ.setdefault(k.strip(), v.strip())

def slides():
    # Drop HTML comments first: the note at the top of the deck mentions <section> and <aside> in prose.
    html = re.sub(r'<!--.*?-->', '', DECK.read_text(), flags=re.S)
    found = re.findall(r'<section id="([^"]+)"(?:(?!</section>).)*?<aside>(.*?)</aside>', html, re.S)
    return [(sid, re.sub(r'\s+', ' ', text).strip()) for sid, text in found]

def speak(text, before, after, path):
    body = json.dumps({'text': text, 'model_id': MODEL, 'previous_text': before, 'next_text': after,
                       'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.2, 'use_speaker_boost': True}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128',
                                 data=body, headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'content-type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)
    path.write_bytes(base64.b64decode(data['audio_base64']))
    path.with_suffix('.json').write_text(json.dumps(data['alignment']))

def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)]))

def main():
    env(); (OUT / 'audio').mkdir(parents=True, exist_ok=True); (OUT / 'slides').mkdir(parents=True, exist_ok=True)
    deck = slides(); spent = 0
    longest = max(len(text) for _, text in deck)
    assert longest < 900, f'a slide has {longest} characters of script; that is not a spoken line'
    audio = []
    for i, (sid, text) in enumerate(deck):
        key = hashlib.sha1(f'{VOICE}|{MODEL}|{text}'.encode()).hexdigest()[:10]
        path = OUT / 'audio' / f'{i + 1:02d}-{sid}-{key}.mp3'
        if not path.exists():
            if '--no-tts' in sys.argv: sys.exit(f'no cached audio for slide {i + 1} ({sid})')
            speak(text, deck[i - 1][1] if i else '', deck[i + 1][1] if i + 1 < len(deck) else '', path); spent += len(text)
        audio.append(path)
    print(f'narration ready, {spent} characters spent this run')

    for old in (OUT / 'slides').glob('*.png'): old.unlink()
    subprocess.check_call(['node', str(HERE / 'shots.mjs'), str(HERE.parent.parent / 'frontend'), str(OUT / 'slides')])
    images = sorted((OUT / 'slides').glob('*.png'))
    assert len(images) == len(audio), (len(images), len(audio))

    lengths = [FADE + LEAD + duration(a) + TAIL for a in audio]
    starts, t = [], 0.0
    for n, d in enumerate(lengths):
        starts.append(t); t += d - FADE          # each slide starts FADE before the previous one ends
    total = starts[-1] + lengths[-1]

    cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error']
    for img, d in zip(images, lengths): cmd += ['-loop', '1', '-framerate', '30', '-t', f'{d:.3f}', '-i', str(img)]
    for a in audio: cmd += ['-i', str(a)]
    n = len(images); parts = [f'[{i}:v]format=yuv420p,setsar=1[v{i}]' for i in range(n)]
    last = 'v0'
    for i in range(1, n):
        parts.append(f'[{last}][v{i}]xfade=transition=fade:duration={FADE}:offset={starts[i]:.3f}[x{i}]'); last = f'x{i}'
    for i in range(n):
        ms = int(round((starts[i] + FADE + LEAD) * 1000))
        parts.append(f'[{n + i}:a]aresample=44100,adelay={ms}|{ms}[a{i}]')
    parts.append(''.join(f'[a{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0,alimiter=limit=0.95,apad[aout]')
    video = OUT / 'prox-pitch.mp4'
    cmd += ['-filter_complex', ';'.join(parts), '-map', f'[{last}]', '-map', '[aout]', '-t', f'{total:.3f}', '-r', '30',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(video)]
    subprocess.check_call(cmd)
    timing = [{'slide': i + 1, 'id': deck[i][0], 'start': round(starts[i], 2), 'length': round(lengths[i], 2)} for i in range(n)]
    (OUT / 'timing.json').write_text(json.dumps(timing, indent=2))
    print(f'{video}  {total:.1f}s')

if __name__ == '__main__':
    main()
