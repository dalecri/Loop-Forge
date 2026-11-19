# StrudelBox

A touch-first groovebox for iPad that translates between a step grid and live [Strudel](https://strudel.cc) code, in one HTML file that runs in Safari. It never makes sound itself: it writes Strudel code and hands it to the official `@strudel/web` engine (`initStrudel` + `evaluate`).

> This repo used to hold **GBX-16** and, before that, **Loop Forge**. GBX-16 is in the git history (commit `03d6a07`). Loop Forge still lives in [`archive/loop-forge/`](archive/loop-forge/), and old Loop Forge share links (`#s=…`) still forward there.

## Play

1. Press **Play**. A rave-pop loop is loaded on first open: 150 BPM, A minor, 909 four-on-the-floor, saw bass, square arp, halo pad chords (Am F C G).
2. Tap steps on and off. Drag across a drum row to paint.
3. On Bass, Arp and Lead steps: **drag up or down** to move the note along the scale, **drag right** to hold it across steps.
4. Pick sounds from each lane's dropdown: 14 drum machines for Drums, 36 instruments (synths and General MIDI sounds) for the melodic lanes.
5. **Am** opens the key picker (root + minor/major); notes move with the key. **Chord** makes new steps triads. The dice fills the lane from the scale.
6. Knobs: drag up or down, double-tap to reset. **Clear** needs a press and hold.
7. **A–D** are four pattern slots, saved on this device.

## The code drawer

**Code** opens the generated Strudel. It updates on every tap. Edit it, then press ✓ to parse it back into the grid (↺ throws the edit away).

The parser reads: `setcpm`, `stack`, `s()`, `note()`, mini-notation sequences, `~` rests, `*n` repeats, `[ ]` groups, `,` stacks/chords and `_` holds, plus `.bank() .gain() .lpf() .room() .delay() .s()` and the generator's own `.swingBy(x, 8)`.

Anything else is kept as a locked raw block: greyed in the drawer, never deleted, and still playing.

## Sounds

- Drums use Strudel's official tidal-drum-machines sample map.
- `@strudel/web` 1.3.0 ships without soundfonts, so the General MIDI instruments use a port of Strudel's own soundfont loader. Each one downloads the first time it plays.
- Sound needs a connection.

## Tests

```
node tests/roundtrip.js        # 3000 random patterns: grid -> code -> grid must match exactly
python3 tests/smoke.py         # headless Chromium: taps, drags, apply, reload, slots, dropdowns
```
