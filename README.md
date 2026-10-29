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
- **Record + Export MP3**: capture the stereo mix, including effects and voice clips, locally at 192 kbps for up to 10 minutes
- **My Loops**: save named loops on the device, export/import `.json` files
- **Share links** that carry the whole loop in the URL
- **Copy code / Open in Strudel**
- **5 themes**: Carbon Studio (default), Neon Night, Pocket DMG, Riso Paper (light), Ember
- **Settings**: grid size, scanlines, motion (respects reduced-motion by default)
- **Responsive**: edge-to-edge Studio workspace with a pinned transport/monitor, eight-step phone paging and all 16 touch-sized steps on iPad
- **Installable PWA** that works offline after the first load (drum samples are cached too)

## Record your music

Press **RECORD** to capture your performance (playback starts if needed). Change
layers, knobs or sections while recording. Press **STOP REC** or stop playback,
then **EXPORT MP3** to download a playable stereo file. Recording stops at ten
minutes. Export before reloading: completed takes stay in memory for this session.
No microphone permission or uploads are needed; the encoder works offline after
one online load. Use HTTPS or localhost. JSON exports still save editable projects.

MP3 encoding uses [LAME](https://lame.sourceforge.net/) via the separately loaded,
unmodified lamejs 1.2.1 library. See [license and source notices](vendor/LAME-NOTICE.md).

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
js/recorder.js        master mix capture + MP3 download controls
js/record-worklet.js  stereo PCM capture on the audio thread
js/mp3-worker.js      MP3 encoding off the UI thread
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


## Android personal test build

`android/` is a small native WebView shell with the web app bundled inside the APK.
It uses a local HTTPS origin for microphone APIs and IndexedDB. Requires Android
8.0+ and an up-to-date Android System WebView (Chromium 120+ for nested CSS).
This is a sideloaded personal test build, not a Play Store release.

- Download and open the APK on Android. Allow installation from the browser/files
  app if Android asks, then install. Microphone permission is requested when recording.
- Keep an internet connection for the Strudel drum sample catalog and drum sounds.
  The native app bundles its UI, but does not promise offline drum playback.
- Upload uses the Android file picker; Export .JSON uses the Android save dialog.
  Existing browser loops must be exported/imported to transfer into the native app.
- Audio and loops stay in app-local storage. Export backups before uninstalling or
  clearing app data. Leaving the app stops playback and discards an unfinished take.
- Android permissions: internet and microphone only. No broad storage permission.
- Source includes no signing keys. Future updates must use the same signing key and
  a higher manifest versionCode to preserve app data through an in-place update.

### Build the APK

Install JDK 17 and Android SDK platform 35 / build-tools 35.0.0. Set `JAVA_HOME`
and `ANDROID_HOME`. Create your own keystore once (keep it securely for updates):

```sh
keytool -genkeypair -keystore loop-forge.keystore -alias loopforge -keyalg RSA -keysize 2048 -validity 10000
export LOOPFORGE_KEYSTORE=/absolute/path/loop-forge.keystore
read -rs LOOPFORGE_KEY_PASSWORD
export LOOPFORGE_KEY_PASSWORD
bash android/build.sh
```

Use the same password for the key and keystore. Output:
`android/build/Loop-Forge-Carbon.apk`. The SDK-only script compiles Java, converts
it with D8, packages the assets, aligns, signs, and verifies the APK. Build outputs
and keystores are git-ignored. The delivered test keystore uses password `android`
and alias `loopforge`; it is only for this personal test app, not a production key.

Validation: browser audio integration/portable export tests, Android bridge dispatch,
responsive screenshots, Java/D8 compilation, APK v2/v3 signatures and zip alignment.
Physical-device microphone, file-picker and install checks remain to be done on Android.
