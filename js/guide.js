/* In-app guide content, written for music lovers, not programmers.
 * Edit the words freely: each entry is one tab in the HOW TO dialog.
 * `html` is trusted markup; keep it simple (p, ul, ol, dl, b). */
window.LOOP_FORGE_GUIDE = [
  {
    id: 'start',
    tab: 'START HERE',
    title: 'Make your first loop in a minute',
    html: `
<ol class="g-steps">
  <li><b>Press ▶ PLAY.</b> A beat is already loaded so you hear something right away.</li>
  <li><b>Tap squares on the grid.</b> A lit square plays a sound. Tap again to remove it. You hear every change instantly, no need to stop.</li>
  <li><b>Pick another instrument</b> with the coloured buttons above the grid (bass, chords, lead…) and tap in some notes.</li>
  <li><b>Keep it.</b> Your loop saves itself on this device. Use <b>LOOPS</b> to keep different versions, or <b>SHARE LINK</b> to send it to a friend.</li>
</ol>
<div class="g-tip"><b>Blank page fear?</b> Press a <b>STARTER</b> style or <b>✦ ROLL DICE</b>, then change things until it sounds like you. Nothing you do is permanent: <b>↶</b> undoes any change.</div>
<div class="g-tip"><b>No sound?</b> Turn up your volume. On iPhone, flip off the silent switch on the side. The very first play downloads the drum sounds, so you need internet that one time.</div>`
  },
  {
    id: 'grid',
    tab: 'THE GRID',
    title: 'The step grid: one bar of music',
    html: `
<p>Read the grid <b>left to right</b>, like a line of sheet music. The whole width is <b>one bar</b>, which loops over and over.</p>
<ul class="g-list">
  <li><b>16 columns = 16 steps.</b> Count along: "1 e and a, 2 e and a, 3 e and a, 4 e and a".</li>
  <li><b>The brighter columns are the beats</b> (1, 2, 3, 4), where you would tap your foot or clap.</li>
  <li><b>A lit square</b> means "play this sound at this moment".</li>
  <li><b>A light sweeps across</b> while music plays so you can see where you are.</li>
</ul>
<p><b>What the rows mean depends on the instrument:</b></p>
<ul class="g-list">
  <li><b>Drums and FX:</b> each row is a different sound (kick, clap, hi-hat…).</li>
  <li><b>Bass, lead, chords, vox, arp:</b> each row is a note, named on the left (like C3 or D#4). <b>Higher rows play higher notes.</b> The notes always belong to your chosen key, so there are no wrong notes.</li>
  <li>Light <b>several squares in the same column</b> on a melodic instrument to play a <b>chord</b>.</li>
</ul>
<p><b>Handy moves</b></p>
<dl class="g-defs">
  <dt>Drag</dt><dd>Hold and slide across squares to fill (or erase) many at once. On a phone, swipe sideways to paint and up/down to scroll the page.</dd>
  <dt>◀ SHIFT / SHIFT ▶</dt><dd>Slides the whole pattern one step earlier or later. Great for making a part feel off-beat and groovier.</dd>
  <dt>✦ RANDOM</dt><dd>Makes a brand new pattern for just this instrument.</dd>
  <dt>CLEAR</dt><dd>Empties this instrument's grid.</dd>
  <dt>1–8 / 9–16 / ALL</dt><dd>On small phones, shows half the bar at a time so the squares are bigger to tap.</dd>
</dl>`
  },
  {
    id: 'layers',
    tab: 'INSTRUMENTS',
    title: 'Your instruments (layers)',
    html: `
<p>Each coloured button above the grid is one instrument. <b>Tap its name</b> to show it in the grid and edit it. The <b>● dot</b> beside it switches that instrument on or off <b>for the part of the song you're on</b> (see Song Parts).</p>
<dl class="g-defs">
  <dt class="g-c" style="--c:var(--pink)">DRUMS</dt><dd>The heartbeat. <b>Kick</b> is the deep thump, <b>clap</b> is the snap (usually on beats 2 and 4), <b>hat</b> is the ticking hi-hat that keeps time, <b>open</b> is a longer sizzling hi-hat.</dd>
  <dt class="g-c" style="--c:var(--purple)">BASS</dt><dd>Low notes that give the groove its weight. Often follows the kick.</dd>
  <dt class="g-c" style="--c:var(--cyan)">LEAD</dt><dd>The main tune, the bit people hum.</dd>
  <dt class="g-c" style="--c:var(--blue)">CHORDS</dt><dd>Several notes at once that set the mood and harmony. Usually just a few long hits per bar.</dd>
  <dt class="g-c" style="--c:var(--yellow)">VOX CHOPS</dt><dd>Short, voice-like synth stabs that cycle through "ah, eh, ee, oh" sounds.</dd>
  <dt class="g-c" style="--c:var(--lime)">ARP</dt><dd>Quick repeating notes that add sparkle and movement.</dd>
  <dt class="g-c" style="--c:var(--orange)">FX</dt><dd>Ear candy for transitions: <b>riser</b> (whoosh up), <b>fall</b> (whoosh down), <b>sub</b> (deep boom), <b>air</b> (bright breath).</dd>
  <dt class="g-c" style="--c:var(--pink)">PUMP</dt><dd>Not an instrument. It makes the instruments you pick dip in volume on every beat, the "breathing" feel of dance music (producers call it sidechain). Choose who pumps and how hard.</dd>
</dl>`
  },
  {
    id: 'tempo',
    tab: 'TEMPO & KEY',
    title: 'Speed, groove and mood',
    html: `
<dl class="g-defs">
  <dt>BPM</dt><dd><b>Beats per minute</b>, how fast the music goes. Roughly: 70–90 chill, hip-hop, lo-fi · 120–130 house · 130–140 techno · 150+ hyperpop and drum &amp; bass. Drag the yellow bar, use <b>− +</b>, or press <b>TAP</b> in time with a song in your head (4 taps or more).</dd>
  <dt>SWING</dt><dd>At 0% the timing is straight and machine-tight. Turn it up and every second small step arrives a little late, for a bouncy, shuffled, human feel (think lo-fi, funk, old-school hip-hop).</dd>
  <dt>ROOT NOTE</dt><dd>The "home" note the music settles on. Changing it moves everything higher or lower, like singing the same song in a different key.</dd>
  <dt>SCALE</dt><dd>The family of notes allowed, which sets the feeling:</dd>
</dl>
<ul class="g-list g-scales">
  <li><b>minor</b>: moody, emotional</li>
  <li><b>major</b>: bright, happy</li>
  <li><b>dorian</b>: soulful, a hopeful minor</li>
  <li><b>phrygian</b>: dark, tense, mysterious</li>
  <li><b>lydian</b>: dreamy, floating</li>
  <li><b>minor pentatonic</b>: bluesy, almost impossible to sound wrong</li>
  <li><b>harmonic minor</b>: dramatic, cinematic</li>
</ul>`
  },
  {
    id: 'starters',
    tab: 'STARTERS',
    title: 'Starters and "make it more…"',
    html: `
<p><b>Starters</b> load a complete loop in a style. They replace your current patterns (press ↶ to get yours back).</p>
<dl class="g-defs">
  <dt>HYPERPOP</dt><dd>Fast, bouncy, sugary.</dd>
  <dt>PROG HOUSE</dt><dd>Steady four-on-the-floor dance groove.</dd>
  <dt>PLUCK</dt><dd>Melodic electronic with short plucky notes.</dd>
  <dt>LO-FI</dt><dd>Slow, swung, cozy study beat.</dd>
  <dt>TECHNO</dt><dd>Driving, dark, rolling bass.</dd>
  <dt>✦ ROLL DICE</dt><dd>A random new loop every time.</dd>
</dl>
<p><b>Make it more…</b> tweaks what you already have:</p>
<dl class="g-defs">
  <dt>HARDER</dt><dd>Busier drums, punchier bass, more pump.</dd>
  <dt>DREAMIER</dt><dd>Softer, more echo, a bit slower.</dd>
  <dt>FASTER</dt><dd>Speeds up and adds a running arp.</dd>
  <dt>WEIRDER</dt><dd>Scrambles the melodies for happy accidents.</dd>
  <dt>SWUNG</dt><dd>Switches the shuffle feel on or off.</dd>
</dl>`
  },
  {
    id: 'knobs',
    tab: 'KNOBS',
    title: 'Knobs: shaping the sound',
    html: `
<p>Knobs change <b>how</b> the selected instrument sounds, not <b>when</b> it plays. Drag a bar left (less) or right (more), or tap anywhere on it.</p>
<dl class="g-defs">
  <dt>GAIN</dt><dd>Volume of this instrument.</dd>
  <dt>FILTER / TONE</dt><dd>Brightness. Low sounds dark and muffled, like music through a wall. High sounds crisp and bright. Slowly opening it is a classic way to build excitement.</dd>
  <dt>DECAY</dt><dd>How long each note rings. Short = plucky and tight. Long = held out.</dd>
  <dt>ATTACK</dt><dd>(Chords) how slowly the notes fade in. Low hits straight away, high makes soft swells.</dd>
  <dt>RELEASE</dt><dd>(Drums and FX) how long the tail lasts after each hit.</dd>
  <dt>ROOM</dt><dd>Echo (reverb): how big the space sounds, from a small dry closet to a huge hall.</dd>
  <dt>DEPTH</dt><dd>(Pump) how far the volume dips on each beat.</dd>
  <dt>PUMPS/BAR</dt><dd>(Pump) how many dips per bar. 1 is a slow swell, 4 matches every beat.</dd>
</dl>`
  },
  {
    id: 'arrange',
    tab: 'SONG PARTS',
    title: 'From loop to song',
    html: `
<p>Songs are built from parts. Loop Forge gives you four:</p>
<dl class="g-defs">
  <dt>INTRO</dt><dd>Ease the listener in, usually with just a few instruments.</dd>
  <dt>BUILD</dt><dd>Tension rises. Add elements, maybe a riser.</dd>
  <dt>DROP</dt><dd>The big moment where everything hits.</dd>
  <dt>BREAK</dt><dd>A calm breather: drums out, chords and melody in.</dd>
</dl>
<p><b>Every part uses the same patterns.</b> What changes is <b>who plays</b>. Pick a part, then use the <b>● dots</b> on the instrument buttons to switch instruments in or out of it.</p>
<dl class="g-defs">
  <dt>LENGTH</dt><dd>How many bars that part lasts. One bar = one trip across the grid (4 beats).</dd>
  <dt>LOOP</dt><dd>Repeats only the part you're editing. Best while you work.</dd>
  <dt>SONG</dt><dd>Plays intro → build → drop → break in order, like a finished track. The coloured strip shows where you are.</dd>
</dl>
<p>The LOOP / SONG switch is next to the Play button.</p>`
  },
  {
    id: 'save',
    tab: 'SAVE & SHARE',
    title: 'Saving, sharing and the code',
    html: `
<dl class="g-defs">
  <dt>Auto-save</dt><dd>Your current loop saves itself on this device. Close the page and it's there next time.</dd>
  <dt>LOOPS</dt><dd>Keep as many named loops as you like. <b>LOAD</b> brings one back, <b>SAVE</b> on a loop replaces it with what you have now, <b>✕</b> deletes it.</dd>
  <dt>EXPORT / IMPORT</dt><dd>Saves a loop as a small file, handy for moving to another device or keeping a backup.</dd>
  <dt>SHARE LINK</dt><dd>Copies a link that opens your exact loop for anyone. No account needed.</dd>
  <dt>↶ ↷</dt><dd>Undo and redo any change.</dd>
  <dt>CLEAR ALL</dt><dd>Start from a blank slate (and yes, you can undo that too).</dd>
</dl>
<p><b>What's the code for?</b> Every tap quietly writes music code for <b>Strudel</b>, a free tool for making music by typing. You never need to look at it. If you're curious, <b>OPEN STRUDEL</b> opens your loop there to explore, and <b>COPY CODE</b> copies the text.</p>`
  },
  {
    id: 'words',
    tab: 'WORD LIST',
    title: 'Music words, plainly',
    html: `
<dl class="g-defs">
  <dt>Beat</dt><dd>The steady pulse you tap your foot to.</dd>
  <dt>Bar</dt><dd>A group of 4 beats. The grid is one bar.</dd>
  <dt>Step</dt><dd>One square-wide slot in the grid. 4 steps per beat.</dd>
  <dt>Loop</dt><dd>A short piece of music that repeats.</dd>
  <dt>Groove</dt><dd>The feel of the rhythm, what makes you nod your head.</dd>
  <dt>Key</dt><dd>The root note plus the scale. It decides which notes sound "right".</dd>
  <dt>Melody</dt><dd>Notes one after another: the tune.</dd>
  <dt>Chord</dt><dd>Several notes played together.</dd>
  <dt>Arp</dt><dd>Short for arpeggio: the notes of a chord played one at a time, quickly.</dd>
  <dt>Reverb</dt><dd>Echo that makes a sound feel like it's in a room or hall.</dd>
  <dt>Filter</dt><dd>Removes high or low parts of a sound, making it darker or thinner.</dd>
  <dt>Sidechain</dt><dd>Making sounds duck in volume when the kick hits. Here it's called PUMP.</dd>
  <dt>Swing</dt><dd>Delaying every other small step for a bouncy, human feel.</dd>
  <dt>Drop</dt><dd>The high-energy peak of a dance track.</dd>
</dl>`
  }
];

/* Spotlight tour: `target` is a CSS selector; `mobileTarget` is used on narrow screens. */
window.LOOP_FORGE_TOUR = [
  { target: '.hero .hero-actions', mobileTarget: '.dock', title: 'Play and stop', text: '▶ PLAY starts the music and you can keep editing while it plays. LOOP repeats one part, SONG plays the whole track.' },
  { target: '#chips', title: 'Your instruments', text: 'Each button is an instrument. Tap a name to edit it in the grid. The ● dot turns it on or off for the current song part.' },
  { target: '#grid-wrap', title: 'The grid', text: 'One bar of music, left to right. Tap squares to add sounds. Higher rows play higher notes. Drag to paint lots at once.' },
  { panel: 'tempo', title: 'Speed and mood', text: 'BPM is how fast. Swing adds bounce. The root note and scale set the mood: minor is moody, major is bright.' },
  { panel: 'starters', title: 'Need a start?', text: 'Load a ready-made style or roll the dice, then make it harder, dreamier, faster or weirder.' },
  { panel: 'knobs', title: 'Shape the sound', text: 'Volume, brightness (filter), how long notes ring, and how much echo for the instrument you picked.' },
  { panel: 'arrange', title: 'Make it a song', text: 'Intro, build, drop, break. Pick a part, choose which instruments play in it with the ● dots, then switch to SONG.' },
  { target: '[data-act="open-guide"]', title: 'Help is always here', text: 'Your loop saves itself. LOOPS keeps versions, SHARE LINK sends it to friends, and ? HOW TO brings this guide back any time.' }
];
