# Loop Forge

Tap pixel blocks, get music, steal the code. Loop Forge is a pocket step sequencer that runs in the browser and writes real [Strudel](https://strudel.cc) code as you go.

## Features

- **8 layers**: drums, bass, lead, chords, vox chops, arp, FX and a sidechain "pump"
- **16-step grid** with drag-to-paint (swipe sideways on touch screens, scroll vertically as normal)
- **Note names on the grid** that follow your root note and scale
- **Tempo, tap tempo, swing**, 12 root notes and 7 scales
- **Starters** (Hyperpop, Prog House, Pluck, Lo-Fi, Techno, Roll Dice) and **"Make it more…"** nudges
- **Layer tools**: shift left/right, randomize, clear
- **Arrangement**: intro, build, drop, break, with a per-section on/off for every layer, a proportional timeline and a live "now playing" readout in SONG mode
- **Undo / redo** for everything (Ctrl/⌘+Z, Ctrl/⌘+Shift+Z)
- **My Loops**: save named loops on the device, export/import `.json` files
- **Share links** that carry the whole loop in the URL
- **Copy code / Open in Strudel**
- **4 themes**: Neon Night (default), Pocket DMG, Riso Paper (light), Ember
- **Settings**: grid size, scanlines, motion (respects reduced-motion by default)
- **Responsive**: phone (bottom transport dock, 8-step paging), tablet and desktop
- **Installable PWA** that works offline after the first load (drum samples are cached too)

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space | Play / stop |
| 1 – 8 | Pick a layer |
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
css/style.css         layout + themes (CSS variables per [data-theme])
js/app.js             state, rendering, code generation, audio
vendor/strudel-web.js bundled @strudel/web (audio engine)
fonts/                Pixelify Sans, Silkscreen, VT323 (self-hosted)
sw.js                 offline cache (bump CACHE when shipping changes)
```

Adding a theme: copy one of the `[data-theme="…"]` blocks in `css/style.css` and add an entry to `THEMES` in `js/app.js`.

Saved loops from the earlier version (stored under `loopforge.v1`) and old share links still load.
