# Loop Forge

Tap pixel blocks, get music, steal the code. Loop Forge is a pocket step sequencer that runs in the browser and writes real [Strudel](https://strudel.cc) code as you go.

## Features

- **9 layers**: drums, bass, lead, chords, synth vox chops, arp, FX, sidechain "pump", and a four-slot voice/audio sampler
- **16-step grid** with drag-to-paint (swipe sideways on touch screens, scroll vertically as normal)
- **Note names on the grid** that follow your root note and scale
- **Tempo, tap tempo, swing**, 12 root notes and 7 scales
- **Starters** (Hyperpop, Prog House, Pluck, Lo-Fi, Techno, Roll Dice) and **"Make it more…"** nudges
- **Layer tools**: shift left/right, randomize, clear
- **Arrangement**: intro, build, drop, break, with a per-section on/off for every layer, a proportional timeline and a live "now playing" readout in SONG mode
- **Built-in guide for beginners**: a "? HOW TO" guide written in plain music language (what each instrument, knob and song part does, plus a word list), a 1-minute spotlight tour, and a "?" on every panel that jumps to the right page. It opens automatically on someone's first visit.
- **Undo / redo** for everything (Ctrl/⌘+Z, Ctrl/⌘+Shift+Z)
- **My Loops**: save named loops on the device, export/import `.json` files
- **Share links** that carry the whole loop in the URL
- **Copy code / Open in Strudel**
- **5 themes**: Tactile Studio (default), Neon Night, Pocket DMG, Riso Paper (light), Ember
- **Settings**: grid size, scanlines, motion (respects reduced-motion by default)
- **Responsive**: phone (bottom transport dock, 8-step paging), tablet and desktop
- **Installable PWA** that works offline after the first load (drum samples are cached too)

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| ? or H | How-to guide |
| Space | Play / stop |
| 1 – 9 | Pick a layer |
| Shift + 1 – 4 | Pick a section |
| M | Loop / song |
| T | Tap tempo |
| C | Show / hide code |
| Ctrl/⌘ + Z | Undo (add Shift to redo) |
| ← → | Adjust a focused slider |

## Running it

No build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly works too, minus the offline service worker. It also deploys as-is to GitHub Pages.

## Project layout

```
index.html            page shell
css/style.css         layout + original themes (CSS variables per [data-theme])
css/studio.css        Tactile Studio hardware styling
js/app.js             state, rendering, code generation, audio
js/voice.js           local recording, WAV assets, trim/pitch editor, portable audio export
js/guide.js           in-app guide + tour text (edit the wording here)
vendor/strudel-web.js bundled @strudel/web (audio engine)
fonts/                Pixelify Sans, Silkscreen, VT323 (self-hosted)
sw.js                 offline cache (bump CACHE when shipping changes)
```

Adding a theme: copy one of the `[data-theme="…"]` blocks in `css/style.css` and add an entry to `THEMES` in `js/app.js`.

Saved loops from the earlier version (stored under `loopforge.v1`) and old share links still load.

## Tactile Studio

Tactile Studio is the default look, developed on `experiment/tactile-studio` and promoted to `main`.

- Cobalt molded chassis, a dot-matrix sequence display, raised step pads, saturated orange/violet/blue preset keys, and yellow/charcoal/cyan control modules.
- Real rotary controls: drag **up/down** to adjust, or focus and use arrow keys,
  Page Up/Down, Home/End. Tempo and swing retain horizontal faders.
- The screen visualizes note density across all enabled layers in the selected
  section; it is a pattern preview, not an audio waveform. Its playhead uses the
  existing Strudel scheduler.
- Responsive transport dock and eight-step paging on phones.
- Choose **Tactile Studio** or any original theme in Settings.
- Studio appearance uses `loopforge.settings.studio`, leaving the original
  appearance preference intact. Musical state and saved-loop formats are unchanged.
- `css/studio.css` scopes the hardware treatment to the Studio theme. The service
  worker includes the new stylesheet with a separate cache version.

### Run the current version locally

```sh
git fetch origin
git switch main
git pull --ff-only
python3 -m http.server 8000
```

Open http://localhost:8000. Use a separate browser profile if you want test edits
to remain separate from other Loop Forge loops stored on the same origin.


## Voice and audio clips

1. Open a slot in **Voice / Audio Sampler** below the grid.
2. Choose **Record Mic**, then **Stop & Save**, or **Upload Audio**.
3. Set start/end times and pitch, preview, and choose **Save Edits**.
4. Open the **Voice** layer (keyboard `9`) and add steps to trigger each clip.
5. Use the Voice volume, tone, and reverb knobs to shape the sound.

There are four slots, each accepting up to 30 seconds / 25 MB of source audio.
WAV, MP3, M4A and other formats depend on the browser's decoder. Clips are converted
to mono 24 kHz WAV for consistent playback. Pitch also changes playback speed.
Preview is dry; the layer effects apply during sequencer playback.

Microphone recording requires **HTTPS or localhost**, microphone permission, and
MediaRecorder support. Opening the downloaded HTML directly is not a reliable
microphone setup. Recording stops when the dialog closes, the page is hidden, or
the 30-second limit is reached. Closing the dialog discards an unfinished take.

Audio remains in this browser's **IndexedDB** and is never uploaded. Named loops
and undo history retain references to their original clips when a slot is replaced.
Removing a slot does not erase audio used by other saved loops. Clearing site data
removes local recordings: use **My Loops → Export .JSON** to keep a portable backup.
Exports include voice audio; imports restore it on another device. Share links are
disabled while clips are attached, and copied Strudel code needs matching samples
loaded separately. Old loop files and loops without audio remain supported.

### Audio integration checks

Install Playwright in your development environment, install its Chromium browser,
then run `node tests/voice.cjs`. The checks use a generated WAV, synthetic microphone,
and local sample fixtures. They cover upload, trimming, pitch, preview, real Strudel
playback, recording, IndexedDB persistence, cross-context export/import, invalid
files, missing audio, and responsive layouts. `CHROME_PATH` can select an existing
Chromium binary.
