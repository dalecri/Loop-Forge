# GBX-16

A touch-first groovebox for iPad: 16 backlit pads, a 16/32-step sequencer, live recording, four pattern slots and a master filter, in one page that runs in Safari with no build step and works offline once installed.

All sounds are synthesized with the Web Audio API. You can also load your own audio files onto any pad.

> This repo used to hold **Loop Forge**, the Strudel step sequencer. It now lives in [`archive/loop-forge/`](archive/loop-forge/), unchanged and still playable at `archive/loop-forge/` on the same site. Old Loop Forge share links (`#s=…`) forward there automatically, and loops saved in Loop Forge are still there because it's the same site and storage.

## Play

1. **Tap pads to play.** Tapping a pad also selects it, and the bottom row shows its steps: tap or drag across them to draw a beat.
2. **Hit REC while it plays.** Pad hits snap to the nearest step. The pattern loops, so you can layer one pad at a time.
3. **Tap A, B, C or D while it plays.** The switch waits for the end of the loop, so you can chain patterns into a song.

## Controls

| Control | What it does |
| --- | --- |
| Play / Rec | Start or stop; arm live recording (starts playback if stopped) |
| Tempo fader | 60 to 180 BPM |
| Swing | Delays every second 16th note. Drag up/down, double-tap to reset |
| Filter | Left: low-pass sweep. Right: high-pass sweep. Double-tap for off. Always opens off |
| Master | Output level, into a gentle compressor |
| Tape | Records the master output. Tap again to stop, then **Save** to share or download (.m4a in Safari) |
| Clear | Tap twice to clear the current pattern |
| ‹ › | Change the selected pad's sound (17 built-in sounds, plus your sample if loaded) |
| Volume / Pitch | Per pad. Pitch is ±12 semitones; melodic sounds show the note name |
| Load | Put an audio file from the Files app onto the selected pad |
| Mute | Tap Mute, then tap pads to mute or unmute them in the sequencer. Muted pads dim with a red dot |
| Copy | Tap Copy, then a slot, to duplicate the current pattern into it |
| 16 / 32 | Pattern length. Going to 32 duplicates the first 16 steps when the second half is empty |

Knobs turn with a vertical drag. Pad colours show the sound type: amber drums, teal bass, violet synths and chords, pink samples.

### Keyboard (Magic Keyboard or desktop)

| Key | Action |
| --- | --- |
| Space | Play / stop |
| 1 2 3 4 / Q W E R / A S D F / Z X C V | The 16 pads, row by row |

## Install and offline

Open the site in Safari, then **Share → Add to Home Screen**. The service worker (`sw.js`) caches the app on first load, so it opens and plays with no connection after that. It makes no network requests of its own: fonts are system fonts and every sound is generated in the browser.

Audio unlocks on the first tap, as iOS requires. The page also asks iPadOS 17+ to keep playing when the silent switch is on.

Devices that installed Loop Forge from this address switch to GBX-16 on their next online visit: the new `sw.js` replaces the old worker at the same path.

## Your data

- Patterns, the kit (sounds, volume, pitch), mutes, tempo, swing and master save automatically to `localStorage` (`qp-groovebox-v1`).
- Loaded samples are stored in IndexedDB (`qp-groovebox`) so they survive reloads.
- Nothing is uploaded. Clearing site data in Safari erases both.

## Run it locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works, just without the offline cache.

## Tests

```sh
pip install playwright && python -m playwright install chromium
python tests/smoke.py        # CHROME_PATH=/path/to/chrome to use an existing browser
```

The smoke test checks: audio unlock on first tap, no off-site requests, the sequencer, live record, the queued pattern switch, mute, copy, the filter, saving, the offline cold start, old share-link forwarding, that the archived Loop Forge still loads, and that nothing overflows at iPad (1180×820, 820×1180) and iPad mini (1133×744, 744×1133, plus shorter heights for Safari's toolbars) sizes. It runs in headless Chromium, so a real iPad is still the final check.

## Layout

```
index.html            the whole app: markup, styles, synth engine, sequencer, UI
sw.js                 offline cache (bump VERSION when shipping changes)
manifest.webmanifest  home-screen install
icon.svg, icon-*.png  app icons
tests/smoke.py        headless browser checks
archive/loop-forge/   the previous app, unchanged
```
