# GBX-16

A touch-first groovebox for iPad: 16 backlit pads, a 16/32-step sequencer, live recording, four pattern slots, genre starters and a key lock that keeps every note in tune, in one page that runs in Safari with no build step and works offline once installed.

All sounds are synthesized with the Web Audio API. You can also load your own audio files onto any pad.

> This repo used to hold **Loop Forge**, the Strudel step sequencer. It now lives in [`archive/loop-forge/`](archive/loop-forge/), unchanged and still playable at `archive/loop-forge/` on the same site. Old Loop Forge share links (`#s=…`) forward there automatically, and loops saved in Loop Forge are still there because it's the same site and storage.

## New to music? Start here

1. Tap **VIBES** and pick a starter: **Hyperpop**, **2-Step**, **Dreamy** or **Dance Pop**. Tap it again to load.
2. Press **Play**. Each starter fills all four slots: **A** intro, **B** groove, **C** break, **D** drop. Tap them in order while it plays and you have a song.
3. Change anything. Every pitched pad is locked to the key, so nothing you do can sound out of tune.

Starters use a 32-step pattern (two bars). The **bass row** and **chord row** follow the same four-chord progression column by column, so the bass pad under a chord always fits it. Chord pads show their chord name (Am, F, C, G) and change with the key.

| Starter | Tempo | Key | What's in it |
| --- | --- | --- | --- |
| Hyperpop | 158 | A minor | 808 slide bass, supersaw leads, bright stabs, busy hats |
| 2-Step | 132 | F minor | Heavy swing, skippy kick, vocal chops, warm 7th chords |
| Dreamy | 108 | E major | Big reverb, long chords, bell and pluck melodies |
| Dance Pop | 124 | G major | Four-on-the-floor kick, off-beat bass, supersaw hooks |

**Key** (in the VIBES panel): step the root note up or down and pick minor or major. All pitched pads move with it, and the pitch knob only lands on notes in the key.

**Reset** (in the VIBES panel): **Kit** puts the 16 sounds back to the factory kit and C minor. **Everything** also clears all patterns, mutes, tempo and swing. Both ask twice.

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
| Space | Reverb on the whole mix (kept off the kick and bass so they stay tight) |
| Filter | Left: low-pass sweep. Right: high-pass sweep. Double-tap for off. Always opens off |
| Master | Output level, into a gentle compressor |
| Tape | Records the master output. Tap again to stop, then **Save** to share or download (.m4a in Safari) |
| Clear | Tap twice to clear the current pattern |
| ‹ › | Change the selected pad's sound (20 built-in sounds, plus your sample if loaded) |
| Volume / Pitch | Per pad. Pitch is ±12 semitones; pitched sounds stay in the key and show the note or chord name |
| Load | Put an audio file from the Files app onto the selected pad |
| Vibes | Genre starters, key and reset |
| Mute | Tap Mute, then tap pads to mute or unmute them in the sequencer. Muted pads dim with a red dot |
| Copy | Tap Copy, then a slot, to duplicate the current pattern into it |
| 16 / 32 | Pattern length. Going to 32 duplicates the first 16 steps when the second half is empty |

Knobs turn with a vertical drag, and the screen shows the value while you turn. Pad colours show the sound type: amber drums, teal bass, violet synths, chords and vocals, pink samples.

**Sounds:** kick, 808, snare, clap, hat, open hat, toms, rim, shaker, bass, sub, 808 slide (glides between notes), pluck, supersaw, stab and chord (both follow the key), bell, vox ah, vox oo.

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

- Patterns, the kit (sounds, volume, pitch), mutes, key, tempo, swing, space and master save automatically to `localStorage` (`qp-groovebox-v1`), and immediately when the app is closed or swiped away.
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

The smoke test checks: audio unlock on first tap, no off-site requests, the sequencer, live record, the queued pattern switch, mute, copy, the filter, starters, key lock, chords following the key, both resets, space, saving, the offline cold start, old share-link forwarding, that the archived Loop Forge still loads, and that nothing (including the Vibes panel) overflows at iPad (1180×820, 820×1180) and iPad mini (1133×744, 744×1133, plus shorter heights for Safari's toolbars) sizes. It runs in headless Chromium, so a real iPad is still the final check.

## Layout

```
index.html            the whole app: markup, styles, synth engine, sequencer, UI
sw.js                 offline cache (bump VERSION when shipping changes)
manifest.webmanifest  home-screen install
icon.svg, icon-*.png  app icons
tests/smoke.py        headless browser checks
archive/loop-forge/   the previous app, unchanged
```
