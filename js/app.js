/* Loop Forge: a pixel step sequencer that writes Strudel code.
 * Plain JS, no build step. Strudel (vendor/strudel-web.js) puts its API on
 * window (initStrudel, evaluate, hush, samples...), so everything here lives
 * inside this IIFE to avoid clobbering those globals. */
(() => {
  'use strict';

  // ── constants ───────────────────────────────────────────────────
  const STORE_KEY = 'loopforge.v1';
  const SETTINGS_KEY = 'loopforge.settings';
  const SLOTS_KEY = 'loopforge.slots';
  const VERSION = 'v3';
  const BPM_RANGE = [60, 200, 1];
  const SWING_RANGE = [0, 1, 0.05];
  const METER_SEGS = 14;

  const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const SCALES = {
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'major': [0, 2, 4, 5, 7, 9, 11],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11],
    'minor pentatonic': [0, 3, 5, 7, 10],
    'harmonic minor': [0, 2, 3, 5, 7, 8, 11]
  };
  const SCALE_NAMES = Object.keys(SCALES);

  const R = { gain: [0, 1.4, 0.05], lpf: [200, 16000, 100], env: [0.02, 1.2, 0.01], room: [0, 0.7, 0.02] };
  const degRows = () => [7, 6, 5, 4, 3, 2, 1, 0].map(d => ({ deg: d }));
  const noteLayer = (id, name, color, oct, snd, envMode, envLabel, params) => ({
    id, name, color, kind: 'note', oct, snd, envMode, rows: degRows(), params, ranges: R,
    labels: { gain: 'GAIN', lpf: 'FILTER', env: envLabel, room: 'ROOM' }
  });
  const DEFS = [
    {
      id: 'drums', name: 'DRUMS', color: 'pink', kind: 'sample',
      rows: [{ label: 'kick', snd: 'bd' }, { label: 'clap', snd: 'cp' }, { label: 'hat', snd: 'hh', g: 0.5 }, { label: 'open', snd: 'oh', g: 0.45 }],
      params: { gain: 0.95, lpf: 16000, env: 0.12, room: 0.05 }, ranges: R,
      labels: { gain: 'GAIN', lpf: 'TONE', env: 'RELEASE', room: 'ROOM' }
    },
    noteLayer('bass', 'BASS', 'purple', 2, 'sawtooth', 'pluck', 'DECAY', { gain: 0.85, lpf: 900, env: 0.18, room: 0 }),
    noteLayer('lead', 'LEAD', 'cyan', 4, 'sawtooth', 'pluck', 'DECAY', { gain: 0.6, lpf: 4000, env: 0.16, room: 0.2 }),
    noteLayer('chords', 'CHORDS', 'blue', 3, 'sawtooth', 'pad', 'ATTACK', { gain: 0.45, lpf: 2600, env: 0.35, room: 0.4 }),
    noteLayer('vox', 'VOX CHOPS', 'yellow', 5, 'sawtooth', 'vowel', 'DECAY', { gain: 0.5, lpf: 3500, env: 0.14, room: 0.25 }),
    noteLayer('arp', 'ARP', 'lime', 4, 'triangle', 'pluck', 'DECAY', { gain: 0.4, lpf: 5000, env: 0.1, room: 0.3 }),
    {
      id: 'fx', name: 'FX', color: 'orange', kind: 'sample',
      rows: [
        { label: 'riser', snd: 'white', suffix: '.attack(0.5).release(0.15).hpf(900)' },
        { label: 'fall', snd: 'white', suffix: '.attack(0.01).decay(0.45).sustain(0).lpf(2500)' },
        { label: 'sub', snd: 'sine', suffix: '.note("c1").attack(0.01).decay(0.7).sustain(0)' },
        { label: 'air', snd: 'pink', suffix: '.attack(0.01).decay(0.25).sustain(0).hpf(4500)' }
      ],
      params: { gain: 0.45, lpf: 16000, env: 0.2, room: 0.35 }, ranges: R,
      labels: { gain: 'GAIN', lpf: 'TONE', env: 'RELEASE', room: 'ROOM' }
    },
    {
      id: 'pump', name: 'PUMP', color: 'pink', kind: 'pump',
      params: { amount: 0.7, rate: 1 },
      ranges: { amount: [0, 1, 0.05], rate: [0.5, 4, 0.5] },
      labels: { amount: 'DEPTH', rate: 'PUMPS/BAR' }
    }
  ];
  const SECTIONS = [
    { id: 'intro', name: 'INTRO', bars: 8 }, { id: 'build', name: 'BUILD', bars: 8 },
    { id: 'drop', name: 'DROP', bars: 16 }, { id: 'breakdown', name: 'BREAK', bars: 8 }
  ];
  const PUMPABLE = ['bass', 'chords', 'lead', 'arp', 'vox'];
  const def = id => DEFS.find(d => d.id === id);
  const rowCount = d => (d.kind === 'pump' ? 0 : d.rows.length);
  const blank = rows => Array.from({ length: rows }, () => Array(16).fill(false));
  const parse = str => str.split('').map(c => c === 'x');

  const PRESETS = {
    hyperpop: {
      name: 'HYPERPOP', full: 'HYPERPOP BOUNCE', bpm: 158, keyRoot: 'C', scaleName: 'minor', swing: 0,
      pat: {
        drums: { 0: 'x..x..x...x.x...', 1: '....x.......x..x', 2: '..x.x.x.x.x.x.xx', 3: '......x.........' },
        bass: { 7: 'x..x..x...x.x...', 5: '......x.....x...' },
        lead: { 3: '....x.......x...', 1: '..........x.....', 5: 'x...............' },
        chords: { 7: 'x.......x.......', 5: 'x.......x.......', 3: 'x.......x.......' },
        vox: { 2: '......x.......x.', 4: '............x...' },
        arp: { 7: 'x...x...x...x...', 5: '..x...x...x...x.', 3: '.x...x...x...x..' },
        fx: { 0: '..............x.' }
      }
    },
    prog: {
      name: 'PROG HOUSE', full: 'PROG HOUSE ROLLER', bpm: 126, keyRoot: 'A', scaleName: 'minor', swing: 0,
      pat: {
        drums: { 0: 'x...x...x...x...', 1: '....x.......x...', 2: '..x...x...x...x.', 3: '......x.......x.' },
        bass: { 7: '..x...x...x...x.', 6: '..............x.' },
        lead: { 4: '....x.......x...', 2: '..........x.....' },
        chords: { 7: 'x.......x.......', 4: 'x.......x.......', 2: 'x.......x.......' },
        vox: { 3: '..........x.....' },
        arp: { 7: 'x.x.x.x.x.x.x.x.', 4: '.x.x.x.x.x.x.x.x' },
        fx: { 3: 'x...............' }
      }
    },
    pluck: {
      name: 'PLUCK', full: 'DEADMAU5 PLUCK', bpm: 128, keyRoot: 'F', scaleName: 'minor', swing: 0,
      pat: {
        drums: { 0: 'x...x...x...x...', 1: '............x...', 2: '..x...x...x...x.' },
        bass: { 7: 'x...x...x...x...' },
        lead: { 7: 'x.......x.......', 5: '..x.......x.....', 3: '....x.......x...', 2: '......x.......x.' },
        chords: { 6: 'x...............', 4: '........x.......', 1: 'x.......x.......' },
        arp: { 7: 'x..x..x.x..x..x.' },
        fx: { 2: '..............x.' }
      }
    },
    lofi: {
      name: 'LO-FI', full: 'LO-FI STUDY TAPE', bpm: 84, keyRoot: 'D', scaleName: 'dorian', swing: 0.45,
      pat: {
        drums: { 0: 'x.....x...x.....', 1: '....x.......x...', 2: 'x.x.x.x.x.x.x.x.' },
        bass: { 7: 'x.........x.....', 4: '......x.........' },
        lead: { 4: '........x.......', 3: '..........x.....', 2: '............x...' },
        chords: { 7: 'x.......x.......', 5: 'x.......x.......', 3: 'x.......x.......', 1: 'x.......x.......' },
        fx: { 3: 'x...............' }
      }
    },
    techno: {
      name: 'TECHNO', full: 'WAREHOUSE TECHNO', bpm: 132, keyRoot: 'A', scaleName: 'phrygian', swing: 0.1,
      pat: {
        drums: { 0: 'x...x...x...x...', 1: '....x.......x...', 2: '..x...x...x...x.', 3: '..............x.' },
        bass: { 7: '.xx..xx..xx..xx.' },
        chords: { 7: '..x.......x.....', 5: '..x.......x.....', 3: '..x.......x.....' },
        arp: { 7: 'x..x..x..x..x...', 4: '..x.....x.......' },
        fx: { 0: '..............x.', 3: 'x.......x.......' }
      }
    }
  };

  const THEMES = [
    { id: 'neon', name: 'NEON NIGHT', sw: ['#1B0F42', '#FF6EC7', '#A16BFF', '#5CE1E6', '#FFE066'] },
    { id: 'gameboy', name: 'POCKET DMG', sw: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F', '#E0F8D0'] },
    { id: 'paper', name: 'RISO PAPER', sw: ['#F7F0E4', '#2B2118', '#F2668B', '#3CBCC8', '#F5C243'] },
    { id: 'ember', name: 'EMBER', sw: ['#1A0A07', '#FF5470', '#FF8A3D', '#FFB547', '#D6F25C'] }
  ];

  // ── helpers ─────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const num = (v, lo, hi, dflt) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : dflt);
  const snap = (v, rg) => clamp(parseFloat((Math.round(v / rg[2]) * rg[2]).toFixed(4)), rg[0], rg[1]);
  const rnd = p => Math.random() < p;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const s16 = fn => Array.from({ length: 16 }, (_, i) => (fn(i) ? 'x' : '.')).join('');
  const lsGet = (k, dflt) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const b64 = str => { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = str => new TextDecoder().decode(Uint8Array.from(atob(str), c => c.charCodeAt(0)));

  /** Note name for a scale degree on a note layer, e.g. "D#4". */
  function noteName(d, deg) {
    const sc = SCALES[state.scaleName] || SCALES.minor;
    const semis = sc[deg % sc.length] + 12 * Math.floor(deg / sc.length);
    const abs = KEYS.indexOf(state.keyRoot) + semis;
    return KEYS[abs % 12] + (d.oct + Math.floor(abs / 12));
  }
  const sectionName = id => SECTIONS.find(s => s.id === id).name;
  const rowLabel = (d, row) => (d.kind === 'note' ? noteName(d, row.deg) : row.label);

  // ── state ───────────────────────────────────────────────────────
  function makeInitial() {
    const layers = {};
    for (const d of DEFS) layers[d.id] = { params: Object.assign({}, d.params), steps: blank(rowCount(d)) };
    const allOn = () => ({ drums: true, bass: true, lead: true, chords: true, vox: true, arp: true, fx: true, pump: true });
    const sections = {};
    for (const s of SECTIONS) sections[s.id] = { bars: s.bars, on: allOn() };
    sections.intro.on = { drums: true, chords: true, pump: true };
    sections.build.on = { drums: true, bass: true, arp: true, fx: true, pump: true };
    sections.breakdown.on = { chords: true, vox: true, arp: true, pump: true };
    return {
      bpm: 148, keyRoot: 'C', scaleName: 'minor', mode: 'loop', section: 'drop', sel: 'drums', swing: 0,
      layers, sections, pumpOn: true, pumpTargets: { bass: true, chords: true, vox: false, arp: true, lead: false }
    };
  }

  /** Coerce anything (old saves, share links, imported files) into a valid state. */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !raw.layers || typeof raw.layers !== 'object') return null;
    const st = makeInitial();
    st.bpm = Math.round(num(raw.bpm, BPM_RANGE[0], BPM_RANGE[1], st.bpm));
    if (KEYS.includes(raw.keyRoot)) st.keyRoot = raw.keyRoot;
    if (SCALES[raw.scaleName]) st.scaleName = raw.scaleName;
    if (raw.mode === 'song' || raw.mode === 'loop') st.mode = raw.mode;
    st.swing = num(raw.swing, 0, 1, 0);
    if (typeof raw.pumpOn === 'boolean') st.pumpOn = raw.pumpOn;
    if (raw.pumpTargets && typeof raw.pumpTargets === 'object') for (const id of PUMPABLE) st.pumpTargets[id] = !!raw.pumpTargets[id];
    const rs = raw.sections && typeof raw.sections === 'object' ? raw.sections : {};
    if (rs.break && !rs.breakdown) rs.breakdown = rs.break;
    for (const s of SECTIONS) {
      const src = rs[s.id];
      if (!src || typeof src !== 'object') continue;
      st.sections[s.id].bars = Math.round(num(src.bars, 1, 32, s.bars));
      if (src.on && typeof src.on === 'object') {
        st.sections[s.id].on = {};
        for (const d of DEFS) if (src.on[d.id]) st.sections[s.id].on[d.id] = true;
      }
    }
    const sec = raw.section === 'break' ? 'breakdown' : raw.section;
    if (st.sections[sec]) st.section = sec;
    if (def(raw.sel)) st.sel = raw.sel;
    for (const d of DEFS) {
      const src = raw.layers[d.id];
      if (!src || typeof src !== 'object') continue;
      const L = st.layers[d.id];
      if (src.params && typeof src.params === 'object') {
        for (const k of Object.keys(L.params)) {
          const rg = d.ranges[k];
          if (rg) L.params[k] = num(src.params[k], rg[0], rg[1], L.params[k]);
        }
      }
      if (Array.isArray(src.steps)) {
        L.steps = L.steps.map((row, ri) => row.map((_, si) => !!(Array.isArray(src.steps[ri]) && src.steps[ri][si])));
      }
    }
    return st;
  }

  const strip = st => {
    const { bpm, keyRoot, scaleName, mode, section, sel, swing, layers, sections, pumpOn, pumpTargets } = st;
    return { bpm, keyRoot, scaleName, mode, section, sel, swing, layers, sections, pumpOn, pumpTargets };
  };

  let state = makeInitial();
  const ui = {
    playing: false, loading: false, step: -1, bar: -1, showCode: false, page: 'all', toastTimer: 0, tour: -1, guideTab: 'start',
    undo: [], redo: [], lastCo: { key: null, t: 0 }, gestureSnap: null, taps: []
  };
  let settings = Object.assign({ theme: 'neon', scanlines: true, motion: 'auto', cells: 'cozy' }, lsGet(SETTINGS_KEY, {}));
  const narrowMQ = window.matchMedia('(max-width: 600px)');

  // ── history / commit ────────────────────────────────────────────
  const snapshot = () => JSON.stringify(strip(state));
  function pushHistory(coalesce) {
    const now = Date.now();
    if (coalesce && ui.lastCo.key === coalesce && now - ui.lastCo.t < 900) { ui.lastCo.t = now; return; }
    ui.lastCo = { key: coalesce, t: now };
    ui.undo.push(snapshot());
    if (ui.undo.length > 120) ui.undo.shift();
    ui.redo.length = 0;
  }
  /** Mutate state. history:false for navigation-only changes; replay:false when audio doesn't change. */
  function commit(fn, opts = {}) {
    const { history = true, replay = true, coalesce = null } = opts;
    if (history) pushHistory(coalesce);
    fn(state);
    afterChange(replay);
  }
  function afterChange(replay) {
    persist();
    render();
    if (replay) scheduleEval();
  }
  function restore(snap) {
    const st = normalize(JSON.parse(snap));
    if (st) state = st;
    afterChange(true);
  }
  function undo() {
    if (!ui.undo.length) return flash('NOTHING TO UNDO');
    ui.redo.push(snapshot());
    restore(ui.undo.pop());
    ui.lastCo = { key: null, t: 0 };
    flash('UNDO');
  }
  function redo() {
    if (!ui.redo.length) return flash('NOTHING TO REDO');
    ui.undo.push(snapshot());
    restore(ui.redo.pop());
    ui.lastCo = { key: null, t: 0 };
    flash('REDO');
  }
  // Drags (meters, grid painting) record one undo step for the whole gesture.
  function beginGesture() { ui.gestureSnap = snapshot(); }
  function endGesture() {
    if (ui.gestureSnap == null) return;
    if (snapshot() !== ui.gestureSnap) {
      ui.undo.push(ui.gestureSnap);
      if (ui.undo.length > 120) ui.undo.shift();
      ui.redo.length = 0;
      ui.lastCo = { key: null, t: 0 };
    }
    ui.gestureSnap = null;
    persist();
    render();
  }

  let saveFailed = null;
  function persist() {
    const ok = lsSet(STORE_KEY, strip(state));
    if (saveFailed === !ok) return; // only touch the footer when the status changes
    saveFailed = !ok;
    $('save-state').textContent = ok ? 'SAVED ON THIS DEVICE ✦ LOOP FORGE ' + VERSION : 'NOT SAVING (STORAGE BLOCKED) ✦ USE SHARE LINK';
  }

  // ── code generation ─────────────────────────────────────────────
  function sampleCode(d, L) {
    const out = [];
    d.rows.forEach((row, ri) => {
      const on = L.steps[ri];
      if (!on || !on.some(Boolean)) return;
      const g = (L.params.gain * (row.g || 1)).toFixed(2);
      let line = '  s("' + on.map(v => (v ? row.snd : '~')).join(' ') + '")';
      line += row.suffix ? row.suffix : '.release(' + L.params.env.toFixed(2) + ')';
      if (L.params.lpf < 15500) line += '.lpf(' + Math.round(L.params.lpf) + ')';
      if (L.params.room > 0.01) line += '.room(' + L.params.room.toFixed(2) + ')';
      line += '.gain(' + g + ')';
      out.push(line);
    });
    if (!out.length) return null;
    return out.length === 1 ? out[0].trim() : 'stack(\n' + out.join(',\n') + '\n)';
  }
  function noteCode(d, L, pumped) {
    const toks = [];
    let any = false;
    for (let s = 0; s < 16; s++) {
      const degs = [];
      d.rows.forEach((row, ri) => { if (L.steps[ri] && L.steps[ri][s]) degs.push(row.deg); });
      if (!degs.length) { toks.push('~'); continue; }
      any = true;
      degs.sort((a, b) => a - b);
      toks.push(degs.length === 1 ? String(degs[0]) : '[' + degs.join(',') + ']');
    }
    if (!any) return null;
    let line = 'n("' + toks.join(' ') + '")';
    line += '.scale("' + state.keyRoot + d.oct + ':' + state.scaleName + '")';
    line += '.s("' + d.snd + '")';
    const e = L.params.env;
    if (d.envMode === 'pad') line += '.attack(' + e.toFixed(2) + ').release(' + (e * 2).toFixed(2) + ').sustain(0.75)';
    else line += '.attack(0.005).decay(' + e.toFixed(2) + ').sustain(0)';
    if (d.envMode === 'vowel') line += '.vowel("<a e i o>")';
    line += '.lpf(' + Math.round(L.params.lpf) + ')';
    if (L.params.room > 0.01) line += '.room(' + L.params.room.toFixed(2) + ')';
    const g = L.params.gain;
    if (pumped) {
      const p = state.layers.pump.params;
      line += '.gain(sine.range(' + (g * (1 - p.amount)).toFixed(2) + ', ' + g.toFixed(2) + ').fast(' + p.rate + '))';
    } else line += '.gain(' + g.toFixed(2) + ')';
    return line;
  }
  function layerCode(id) {
    const d = def(id), L = state.layers[id];
    if (!d || d.kind === 'pump') return null;
    const pumped = state.pumpOn && !!state.pumpTargets[id];
    return d.kind === 'sample' ? sampleCode(d, L) : noteCode(d, L, pumped);
  }
  // swingBy(x, 8) delays every off-beat 16th by x of an 8th note; 1/6 is a full triplet shuffle.
  const swung = expr => (state.swing > 0.001 ? expr + '.swingBy(' + (state.swing / 6).toFixed(3) + ', 8)' : expr);
  function buildCode(forPlayback) {
    const st = state, live = [], lines = [];
    lines.push('// ' + st.keyRoot + ' ' + st.scaleName + ' · ' + st.bpm + ' BPM · made in Loop Forge');
    lines.push('setcpm(' + st.bpm + '/4)   // ' + st.bpm + ' BPM, one cycle = one bar');
    lines.push('');
    for (const d of DEFS) {
      const c = layerCode(d.id);
      if (!c) continue;
      live.push(d.id);
      lines.push('// ' + d.name);
      lines.push('const ' + d.id + ' = ' + c);
      lines.push('');
    }
    if (!live.length) return '// tap the grid to make a sound\nsilence';
    const stackOf = secId => {
      const on = live.filter(id => st.sections[secId].on[id]);
      return on.length ? 'stack(' + on.join(', ') + ')' : 'silence';
    };
    if (forPlayback && st.mode === 'loop') {
      lines.push('// looping the ' + st.section + ' section');
      lines.push(swung(stackOf(st.section)));
      return lines.join('\n');
    }
    lines.push('// ── SECTIONS ──');
    for (const s of SECTIONS) lines.push('const ' + s.id + ' = ' + stackOf(s.id));
    lines.push('');
    lines.push('// ── ARRANGEMENT ──');
    if (st.mode === 'loop') {
      lines.push('// (looping ' + st.section + ', switch to SONG for the full arrangement)');
      lines.push(swung(st.section));
    } else {
      lines.push(swung('arrange(' + SECTIONS.map(s => '[' + st.sections[s.id].bars + ', ' + s.id + ']').join(', ') + ')'));
    }
    return lines.join('\n');
  }

  // ── audio ───────────────────────────────────────────────────────
  let repl = null, replPromise = null, evalTimer = 0;
  function warmAudio() {
    if (replPromise) return replPromise;
    if (typeof window.initStrudel !== 'function') return Promise.reject(new Error('strudel not loaded'));
    replPromise = Promise.resolve(window.initStrudel({ prebake: () => window.samples('github:tidalcycles/dirt-samples') }))
      .then(r => { repl = r; return r; })
      .catch(err => { replPromise = null; throw err; });
    return replPromise;
  }
  async function evaluate() {
    if (!ui.playing) return;
    try { await window.evaluate(buildCode(true)); } catch (e) { console.error(e); flash('PATTERN ERROR'); }
  }
  function scheduleEval() {
    if (!ui.playing) return;
    clearTimeout(evalTimer);
    evalTimer = setTimeout(evaluate, 120);
  }
  async function togglePlay() {
    if (ui.playing || ui.loading) return stop();
    ui.loading = true;
    renderTransport();
    try { await warmAudio(); } catch (e) {
      console.error(e);
      ui.loading = false;
      renderTransport();
      return flash('AUDIO ENGINE FAILED TO LOAD. CHECK CONNECTION');
    }
    if (!ui.loading) return; // stopped while loading
    ui.loading = false;
    ui.playing = true;
    ui.bar = -1;
    renderTransport();
    await evaluate();
  }
  function stop() {
    clearTimeout(evalTimer);
    if (typeof window.hush === 'function' && repl) { try { window.hush(); } catch (e) { /* not started */ } }
    ui.playing = false;
    ui.loading = false;
    ui.step = -1;
    ui.bar = -1;
    renderTransport();
    paintHead();
  }

  // Playhead follows Strudel's scheduler clock (one cycle = one bar).
  function tick() {
    requestAnimationFrame(tick);
    if (!ui.playing || !repl || !repl.scheduler) return;
    let cyc;
    try { cyc = repl.scheduler.now(); } catch (e) { return; }
    if (!isFinite(cyc) || cyc < 0) return;
    const step = Math.floor((cyc - Math.floor(cyc)) * 16) % 16;
    const bar = Math.floor(cyc);
    if (step !== ui.step) { ui.step = step; paintHead(); }
    if (bar !== ui.bar) { ui.bar = bar; paintLive(); }
    if (state.mode === 'song') paintFill(cyc);
  }
  function songPos(cyc) {
    const total = SECTIONS.reduce((a, s) => a + state.sections[s.id].bars, 0);
    let b = ((Math.floor(cyc) % total) + total) % total;
    for (const s of SECTIONS) {
      const n = state.sections[s.id].bars;
      if (b < n) return { id: s.id, name: s.name, bar: b, bars: n, frac: cyc - Math.floor(cyc) };
      b -= n;
    }
    return null;
  }
  function paintHead() {
    const g = $('grid');
    if (!g) return;
    if (ui.playing && ui.step >= 0) g.dataset.head = ui.step; else delete g.dataset.head;
  }
  function paintLive() {
    let liveId = null, text = '';
    if (ui.loading) text = 'LOADING SOUNDS…';
    else if (ui.playing) {
      if (state.mode === 'song' && ui.bar >= 0) {
        const p = songPos(ui.bar);
        if (p) { liveId = p.id; text = '▶ SONG · ' + p.name + ' · BAR ' + (p.bar + 1) + '/' + p.bars; }
      } else {
        liveId = state.section;
        text = '▶ LOOPING ' + sectionName(state.section);
      }
    }
    $('now').textContent = text;
    for (const el of $$('[data-sec]')) el.classList.toggle('is-live', el.dataset.sec === liveId);
    if (!liveId) for (const f of $$('.tl-fill')) f.style.width = '0';
  }
  function paintFill(cyc) {
    const p = songPos(cyc);
    for (const f of $$('.tl-fill')) {
      f.style.width = p && f.parentNode.dataset.sec === p.id ? ((p.bar + p.frac) / p.bars * 100).toFixed(1) + '%' : '0';
    }
  }

  // ── generators ──────────────────────────────────────────────────
  function setRows(st, id, map) {
    st.layers[id].steps = blank(rowCount(def(id)));
    for (const k of Object.keys(map)) st.layers[id].steps[Number(k)] = parse(map[k]);
  }
  function applyPreset(key) {
    const p = PRESETS[key];
    commit(st => {
      st.bpm = p.bpm; st.keyRoot = p.keyRoot; st.scaleName = p.scaleName; st.swing = p.swing || 0;
      for (const d of DEFS) if (d.kind !== 'pump') st.layers[d.id].steps = blank(rowCount(d));
      for (const id of Object.keys(p.pat)) setRows(st, id, p.pat[id]);
    });
    flash(p.full, true);
  }
  function dice() {
    commit(st => {
      const set = (id, map) => setRows(st, id, map);
      const four = rnd(0.5);
      set('drums', {
        0: s16(i => (four ? i % 4 === 0 : [0, 3, 6, 10, 12].includes(i) || (i === 14 && rnd(0.4)))),
        1: s16(i => i % 8 === 4 || (i === 15 && rnd(0.4))),
        2: s16(i => (rnd(0.7) ? i % 2 === 0 : rnd(0.35))),
        3: s16(i => i % 8 === 6 && rnd(0.6))
      });
      set('bass', { 7: s16(i => (four ? i % 4 === 2 : [0, 3, 6, 10, 12].includes(i))), 5: s16(i => i === 14 && rnd(0.5)) });
      const mel = pick([[0, 4, 7, 12], [0, 2, 6, 10], [2, 6, 8, 14]]);
      set('lead', { 3: s16(i => mel.includes(i) && rnd(0.8)), 5: s16(i => i === mel[0] + 1) });
      set('chords', { 7: 'x.......x.......', 5: 'x.......x.......', 3: 'x.......x.......' });
      set('vox', { 2: s16(i => i % 8 === 6 && rnd(0.7)) });
      set('arp', { 7: s16(i => i % 4 === 0), 5: s16(i => i % 4 === 2), 3: s16(i => i % 8 === 1) });
      set('fx', { 0: s16(i => i === 14 && rnd(0.5)) });
      st.bpm = 120 + Math.floor(Math.random() * 8) * 5;
      st.keyRoot = pick(['C', 'D', 'F', 'G', 'A']);
      st.swing = pick([0, 0, 0, 0.2, 0.35]);
    });
    flash('ROLLED A FRESH LOOP', true);
  }
  function nudge(kind) {
    const or = (a, b) => a.map((v, i) => v || b[i]);
    commit(st => {
      const L = st.layers;
      if (kind === 'harder') {
        L.drums.steps[2] = Array(16).fill(true);
        L.drums.steps[0] = or(L.drums.steps[0], parse('..........x....x'));
        L.drums.params.gain = Math.min(1.4, L.drums.params.gain + 0.15);
        L.bass.params.lpf = Math.min(16000, L.bass.params.lpf + 500);
        L.bass.params.env = Math.max(0.05, L.bass.params.env - 0.04);
        st.pumpOn = true;
      } else if (kind === 'dreamier') {
        L.chords.params.env = Math.min(1.2, L.chords.params.env + 0.2);
        L.chords.params.room = Math.min(0.7, L.chords.params.room + 0.15);
        L.chords.params.gain = Math.min(1.4, L.chords.params.gain + 0.08);
        L.lead.params.room = Math.min(0.7, L.lead.params.room + 0.15);
        L.lead.params.lpf = Math.max(400, L.lead.params.lpf - 900);
        L.drums.steps[2] = L.drums.steps[2].map((v, i) => v && i % 4 === 2);
        st.bpm = Math.max(BPM_RANGE[0], st.bpm - 6);
      } else if (kind === 'faster') {
        st.bpm = Math.min(BPM_RANGE[1], st.bpm + 8);
        L.arp.steps[7] = parse('x.x.x.x.x.x.x.x.');
      } else if (kind === 'weirder') {
        for (const id of ['lead', 'vox', 'arp']) {
          const sh = 1 + Math.floor(Math.random() * 5);
          L[id].steps = L[id].steps.map(r => r.slice(sh).concat(r.slice(0, sh)));
        }
        L.vox.params.lpf = 1200 + Math.floor(Math.random() * 50) * 100;
        L.fx.steps[3] = parse('..x.....x......x');
      } else if (kind === 'swing') {
        st.swing = st.swing > 0.3 ? 0 : 0.45;
      }
    });
    flash(kind === 'swing' ? (state.swing ? 'SWUNG IT' : 'STRAIGHT AGAIN') : kind.toUpperCase(), true);
  }
  function randomizeLayer() {
    const d = def(state.sel);
    if (d.kind === 'pump') return;
    commit(st => {
      const L = st.layers[d.id];
      if (d.kind === 'sample') {
        const dens = d.id === 'drums' ? [0.25, 0.12, 0.55, 0.12] : [0.06, 0.06, 0.08, 0.1];
        L.steps = L.steps.map((row, ri) => row.map((_, si) => rnd(dens[ri] + (ri === 0 && si % 4 === 0 ? 0.5 : 0))));
      } else if (d.envMode === 'pad') {
        L.steps = blank(8);
        for (const at of [0, 8]) {
          const root = pick([0, 1, 3, 4]);
          for (const off of [0, 2, 4]) if (root + off < 8) L.steps[7 - (root + off)][at] = true;
        }
      } else {
        L.steps = blank(8);
        let deg = pick([0, 2, 4]);
        for (let si = 0; si < 16; si++) {
          if (!rnd(d.id === 'bass' ? 0.4 : 0.35)) continue;
          deg = clamp(deg + pick([-2, -1, 0, 1, 2]), 0, 7);
          L.steps[7 - deg][si] = true;
        }
      }
    });
    flash('RANDOM ' + d.name, true);
  }

  // ── grid painting ───────────────────────────────────────────────
  // Mouse/pen paint immediately. Touch waits until the finger moves sideways
  // (or lifts), so a vertical swipe over the grid still scrolls the page.
  let paint = null;
  function setCell(el, val) {
    const ri = +el.dataset.r, si = +el.dataset.s;
    const row = state.layers[state.sel].steps[ri];
    if (!row || row[si] === val) return;
    row[si] = val;
    el.setAttribute('aria-pressed', String(val));
    scheduleEval();
  }
  function cellAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.classList.contains('cell') ? el : null;
  }
  function onCellDown(e, el) {
    beginGesture();
    const val = el.getAttribute('aria-pressed') !== 'true';
    paint = { val, last: el, pointerId: e.pointerId, x: e.clientX, y: e.clientY, pending: e.pointerType === 'touch' ? el : null };
    if (!paint.pending) setCell(el, val);
  }
  function onPaintMove(e) {
    if (!paint || e.pointerId !== paint.pointerId) return;
    if (paint.pending) {
      if (Math.abs(e.clientX - paint.x) < 6) return;
      setCell(paint.pending, paint.val);
      paint.pending = null;
    }
    const el = cellAt(e.clientX, e.clientY);
    if (el && el !== paint.last) { paint.last = el; setCell(el, paint.val); }
  }
  function onPaintEnd(e, cancelled) {
    if (!paint || e.pointerId !== paint.pointerId) return;
    if (paint.pending && !cancelled) setCell(paint.pending, paint.val);
    paint = null;
    endGesture();
  }

  // ── pixel meters (sliders) ──────────────────────────────────────
  function meterSpec(key) {
    if (key === 'bpm') return { label: 'TEMPO', v: state.bpm, rg: BPM_RANGE, color: 'yellow', set: v => { state.bpm = Math.round(v); } };
    if (key === 'swing') return { label: 'SWING', v: state.swing, rg: SWING_RANGE, color: 'orange', set: v => { state.swing = v; } };
    const k = key.slice(2), d = def(state.sel), L = state.layers[state.sel];
    return { label: d.labels[k], v: L.params[k], rg: d.ranges[k], color: d.color, set: v => { L.params[k] = v; } };
  }
  function fmt(key, v) {
    if (key === 'bpm') return String(v);
    if (key === 'swing') return Math.round(v * 100) + '%';
    if (key === 'p:lpf') return Math.round(v) + 'hz';
    if (key === 'p:rate') return v + 'x';
    if (key === 'p:amount') return Math.round(v * 100) + '%';
    return Number(v).toFixed(2);
  }
  function segsHTML(frac) {
    let h = '';
    for (let i = 0; i < METER_SEGS; i++) h += '<i class="seg' + (frac >= (i + 0.5) / METER_SEGS ? ' lit' : '') + '"></i>';
    return h;
  }
  function meterHTML(key, extraClass = '') {
    const m = meterSpec(key);
    const frac = (m.v - m.rg[0]) / (m.rg[1] - m.rg[0]);
    return '<div class="meter ' + extraClass + '" role="slider" tabindex="0" data-meter="' + key + '" style="--c:var(--' + m.color + ')"' +
      ' aria-label="' + esc(m.label) + '" aria-valuemin="' + m.rg[0] + '" aria-valuemax="' + m.rg[1] + '" aria-valuenow="' + m.v + '"' +
      ' aria-valuetext="' + esc(fmt(key, m.v)) + '">' + segsHTML(frac) + '</div>';
  }
  function patchMeter(el) {
    const key = el.dataset.meter, m = meterSpec(key);
    const frac = (m.v - m.rg[0]) / (m.rg[1] - m.rg[0]);
    el.querySelectorAll('.seg').forEach((s, i) => s.classList.toggle('lit', frac >= (i + 0.5) / METER_SEGS));
    el.setAttribute('aria-valuenow', m.v);
    el.setAttribute('aria-valuetext', fmt(key, m.v));
    for (const r of $$('[data-readout="' + key + '"]')) r.textContent = fmt(key, m.v);
  }
  let drag = null;
  function meterFromPointer(e) {
    const el = drag.el, m = meterSpec(el.dataset.meter);
    const r = el.getBoundingClientRect();
    const f = clamp((e.clientX - r.left - 4) / (r.width - 8), 0, 1);
    const v = snap(m.rg[0] + f * (m.rg[1] - m.rg[0]), m.rg);
    if (v === m.v) return;
    m.set(v);
    patchMeter(el);
    scheduleEval();
  }
  function meterKey(e, el) {
    const key = el.dataset.meter, m = meterSpec(key), st = m.rg[2];
    const big = Math.max(st, (m.rg[1] - m.rg[0]) / 10);
    const delta = { ArrowRight: st, ArrowUp: st, ArrowLeft: -st, ArrowDown: -st, PageUp: big, PageDown: -big }[e.key];
    let v;
    if (delta !== undefined) v = m.v + delta;
    else if (e.key === 'Home') v = m.rg[0];
    else if (e.key === 'End') v = m.rg[1];
    else return false;
    v = snap(v, m.rg);
    if (v !== m.v) {
      pushHistory('meter:' + key);
      m.set(v);
      patchMeter(el);
      persist();
      scheduleEval();
      clearTimeout(ui.meterRender);
      ui.meterRender = setTimeout(render, 400);
    }
    return true;
  }

  // ── rendering ───────────────────────────────────────────────────
  function render() {
    // Keep keyboard focus on the "same" control across innerHTML swaps.
    const a = document.activeElement;
    const fk = a && a !== document.body ? focusKey(a) : null;
    renderChips();
    renderTools();
    renderGrid();
    renderTempo();
    renderStarters();
    renderKnobs();
    renderArrange();
    renderCode();
    renderTransport();
    if (fk && !document.contains(a)) {
      const el = document.querySelector(fk);
      if (el) el.focus({ preventScroll: true });
    }
  }
  function focusKey(el) {
    if (el.dataset.meter) return '[data-meter="' + el.dataset.meter + '"]';
    if (el.classList.contains('cell')) return '.cell[data-r="' + el.dataset.r + '"][data-s="' + el.dataset.s + '"]';
    if (el.dataset.act) return '[data-act="' + el.dataset.act + '"]' + (el.dataset.arg != null ? '[data-arg="' + CSS.escape(el.dataset.arg) + '"]' : '');
    return null;
  }

  function renderChips() {
    const secName = sectionName(state.section);
    $('chips').innerHTML = DEFS.map((d, i) => {
      const on = !!state.sections[state.section].on[d.id], sel = state.sel === d.id;
      return '<div class="chip' + (sel ? ' is-sel' : '') + '" style="--c:var(--' + d.color + ')">' +
        '<button class="chip-power" data-act="power" data-arg="' + d.id + '" aria-pressed="' + on + '" title="Play ' + d.name + ' in ' + secName + '"' +
        ' aria-label="' + d.name + ' in ' + secName + '">' + (on ? '●' : '') + '</button>' +
        '<button class="chip-name" data-act="sel" data-arg="' + d.id + '" aria-pressed="' + sel + '">' + d.name + '</button>' +
        '<span class="chip-key" aria-hidden="true">' + (i + 1) + '</span></div>';
    }).join('');
    const d = def(state.sel);
    $('sel-hint').textContent = d.kind === 'pump' ? (state.pumpOn ? 'SIDECHAIN ON' : 'SIDECHAIN OFF') :
      d.kind === 'note' ? state.keyRoot + ' ' + state.scaleName.toUpperCase() + ' · 16 STEPS' : 'SOUNDS · 16 STEPS';
  }

  function effectivePage() { return narrowMQ.matches ? ui.page : 'all'; }
  function renderTools() {
    const d = def(state.sel);
    if (d.kind === 'pump') { $('tools').innerHTML = ''; $('tools').hidden = true; return; }
    $('tools').hidden = false;
    const pg = effectivePage();
    const pageBtn = (p, label) => '<button class="tool' + (pg === p ? ' is-on' : '') + '" data-act="page" data-arg="' + p + '" aria-pressed="' + (pg === p) + '">' + label + '</button>';
    $('tools').style.setProperty('--c', 'var(--' + d.color + ')');
    $('tools').innerHTML =
      '<div class="tools-group">' +
      '<button class="tool" data-act="layer-shift" data-arg="-1" title="Nudge pattern one step earlier" aria-label="Shift ' + d.name + ' left">◀ SHIFT</button>' +
      '<button class="tool" data-act="layer-shift" data-arg="1" title="Nudge pattern one step later" aria-label="Shift ' + d.name + ' right">SHIFT ▶</button>' +
      '<button class="tool" data-act="layer-rand">✦ RANDOM</button>' +
      '<button class="tool" data-act="layer-clear">CLEAR</button>' +
      '</div>' +
      '<div class="pager" role="group" aria-label="Visible steps">' + pageBtn('a', '1–8') + pageBtn('b', '9–16') + pageBtn('all', 'ALL') + '</div>';
  }

  function renderGrid() {
    const d = def(state.sel), L = state.layers[state.sel], wrap = $('grid-wrap');
    if (d.kind === 'pump') {
      wrap.innerHTML = '<div class="pump"><p>Sidechain ducks the sustained layers on every kick so the track breathes like a club mix. Pick who gets pumped.</p>' +
        '<div class="wrap-row">' + [{ id: 'on', name: 'PUMP ON' }].concat(PUMPABLE.map(id => ({ id, name: def(id).name }))).map(t => {
          const active = t.id === 'on' ? state.pumpOn : !!state.pumpTargets[t.id];
          return '<button class="tool' + (active ? ' is-on' : '') + '" style="height:44px;padding:0 12px' +
            (active && t.id === 'on' ? ';background:var(--pink);color:var(--on-accent)' : '') + '" data-act="pump" data-arg="' + t.id + '" aria-pressed="' + active + '">' + t.name + '</button>';
        }).join('') + '</div></div>';
      return;
    }
    const pg = effectivePage();
    const cols = pg === 'a' ? [0, 1, 2, 3, 4, 5, 6, 7] : pg === 'b' ? [8, 9, 10, 11, 12, 13, 14, 15] : Array.from({ length: 16 }, (_, i) => i);
    let h = '<div class="grid" id="grid" style="--c:var(--' + d.color + ');--cols:' + cols.length + '">';
    h += '<div class="grid-row" aria-hidden="true"><div class="grid-label"></div><div class="grid-cells">' +
      cols.map(s => '<div class="step-dot' + (s % 4 === 0 ? ' is-beat' : '') + '" data-s="' + s + '"></div>').join('') + '</div></div>';
    d.rows.forEach((row, ri) => {
      const label = rowLabel(d, row);
      h += '<div class="grid-row"><div class="grid-label">' + esc(label) + '</div><div class="grid-cells">';
      for (const s of cols) {
        const on = !!(L.steps[ri] && L.steps[ri][s]);
        h += '<button class="cell' + (s % 4 === 0 ? ' is-beat' : '') + '" data-r="' + ri + '" data-s="' + s + '" aria-pressed="' + on + '" aria-label="' + esc(label) + ' step ' + (s + 1) + '"></button>';
      }
      h += '</div></div>';
    });
    wrap.innerHTML = h + '</div>';
    paintHead();
  }

  function renderTempo() {
    const sIdx = SCALE_NAMES.indexOf(state.scaleName);
    $('tempo').innerHTML =
      '<div class="bpm-row"><div class="bpm-num"><div class="bpm-big" data-readout="bpm">' + state.bpm + '</div><div class="label" style="padding-bottom:6px">BPM</div></div>' +
      '<div class="bpm-btns"><button class="btn btn-sq" data-act="bpm" data-arg="-1" aria-label="Slower">−</button>' +
      '<button class="btn btn-sq" data-act="bpm" data-arg="1" aria-label="Faster">+</button>' +
      '<button class="btn btn-pixel" data-act="tap" title="Tap along to set the tempo (T)">TAP</button></div></div>' +
      meterHTML('bpm') +
      '<div class="slider"><div class="slider-head"><span class="label">SWING</span><span class="readout" data-readout="swing">' + fmt('swing', state.swing) + '</span></div>' + meterHTML('swing', 'sm') + '</div>' +
      '<div class="stack"><div class="label">ROOT NOTE</div><div class="keys">' + KEYS.map(k =>
        '<button class="key" data-act="key" data-arg="' + k + '" aria-pressed="' + (state.keyRoot === k) + '">' + k + '</button>').join('') + '</div></div>' +
      '<div class="stack"><div class="label">SCALE</div><div class="scale">' +
      '<button class="btn btn-sq" data-act="scale" data-arg="-1" aria-label="Previous scale">◀</button>' +
      '<div class="scale-name" aria-live="polite">' + esc(SCALE_NAMES[sIdx]) + '</div>' +
      '<button class="btn btn-sq" data-act="scale" data-arg="1" aria-label="Next scale">▶</button></div></div>';
  }

  function renderStarters() {
    $('starters').innerHTML =
      '<div class="presets">' + Object.keys(PRESETS).map(k => '<button class="btn" data-act="preset" data-arg="' + k + '" title="' + PRESETS[k].full + ' · ' + PRESETS[k].bpm + ' BPM">' + PRESETS[k].name + '</button>').join('') +
      '<button class="btn btn-hot" data-act="dice">✦ ROLL DICE</button></div>' +
      '<div class="rule"></div><div class="label">MAKE IT MORE…</div>' +
      '<div class="nudges">' + ['harder', 'dreamier', 'faster', 'weirder', 'swing'].map(k =>
        '<button class="btn btn-alt" data-act="nudge" data-arg="' + k + '">' + (k === 'swing' ? 'SWUNG' : k.toUpperCase()) + '</button>').join('') + '</div>';
  }

  function renderKnobs() {
    const d = def(state.sel);
    $('knobs-title').textContent = '◎ ' + d.name + ' KNOBS';
    const keys = d.kind === 'pump' ? ['amount', 'rate'] : ['gain', 'lpf', 'env', 'room'];
    $('knobs').innerHTML = keys.map(k => {
      const key = 'p:' + k;
      return '<div class="slider"><div class="slider-head"><span class="label">' + d.labels[k] + '</span><span class="readout" data-readout="' + key + '">' +
        fmt(key, state.layers[d.id].params[k]) + '</span></div>' + meterHTML(key, 'sm') + '</div>';
    }).join('');
  }

  function renderArrange() {
    const cur = state.sections[state.section];
    const total = SECTIONS.reduce((a, s) => a + state.sections[s.id].bars, 0);
    const secs = Math.round(total * 240 / state.bpm);
    $('arrange').innerHTML =
      '<div class="tabs">' + SECTIONS.map(s => '<button class="tab" data-act="section" data-arg="' + s.id + '" data-sec="' + s.id + '" aria-pressed="' + (state.section === s.id) + '">' + s.name + '</button>').join('') + '</div>' +
      '<div class="timeline" aria-hidden="true">' + SECTIONS.map(s => '<button class="tl-block' + (state.section === s.id ? ' is-sel' : '') + '" tabindex="-1" data-act="section" data-arg="' + s.id + '" data-sec="' + s.id + '" style="flex:' + state.sections[s.id].bars + '">' +
        '<span class="tl-fill"></span>' + s.name + '</button>').join('') + '</div>' +
      '<div class="length"><span class="label">LENGTH</span><div style="display:flex;align-items:center;gap:6px">' +
      '<button class="btn" data-act="bars" data-arg="-2" aria-label="Shorter section">−</button>' +
      '<div class="length-val">' + cur.bars + ' bars</div>' +
      '<button class="btn" data-act="bars" data-arg="2" aria-label="Longer section">+</button></div></div>' +
      '<p class="hint">' + (state.mode === 'loop'
        ? 'LOOP mode repeats only this section. Flip to SONG to hear intro → build → drop → break back to back.'
        : 'SONG mode plays every section in order. Full track: ' + total + ' bars · ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + '.') +
      ' Use the ● dots on each layer to choose who plays in ' + sectionName(state.section) + '.</p>';
    paintLive();
  }

  function renderCode() {
    $('code-body').hidden = !ui.showCode;
    $('code-caret').textContent = ui.showCode ? '▼' : '▶';
    $('code-toggle').setAttribute('aria-expanded', String(ui.showCode));
    if (ui.showCode) $('code').textContent = buildCode(false);
  }

  function renderTransport() {
    for (const b of $$('[data-play-btn]')) {
      b.textContent = ui.loading ? '… LOADING' : ui.playing ? '■ STOP' : '▶ PLAY';
      b.classList.toggle('is-playing', ui.playing);
      b.classList.toggle('is-playing-blink', ui.playing);
      b.classList.toggle('is-loading', ui.loading);
      b.setAttribute('aria-pressed', String(ui.playing));
    }
    for (const b of $$('[data-mode-btn]')) {
      b.textContent = state.mode === 'loop' ? 'LOOP' : 'SONG';
      b.classList.toggle('is-song', state.mode === 'song');
    }
    for (const b of $$('[data-undo]')) b.disabled = !ui.undo.length;
    for (const b of $$('[data-redo]')) b.disabled = !ui.redo.length;
    paintLive();
  }

  // ── toast ───────────────────────────────────────────────────────
  function flash(msg, withUndo) {
    const t = $('toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (withUndo && ui.undo.length ? '<button data-act="undo">UNDO</button>' : '');
    t.hidden = false;
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => { t.hidden = true; }, withUndo ? 3200 : 1800);
  }

  // ── export / share ──────────────────────────────────────────────
  function copyText(text, okMsg) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      flash(ok ? okMsg : 'COULD NOT COPY. SELECT IT MANUALLY');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => flash(okMsg), fallback);
    else fallback();
  }
  function shareURL() {
    const enc = b64(JSON.stringify(strip(state))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return location.origin + location.pathname + '#s=' + enc;
  }
  async function share() {
    const url = shareURL();
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title: 'Loop Forge loop', text: state.keyRoot + ' ' + state.scaleName + ' · ' + state.bpm + ' BPM', url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    copyText(url, 'SHARE LINK COPIED');
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportLoop() {
    const name = 'loop-forge-' + state.keyRoot.replace('#', 's').toLowerCase() + '-' + state.bpm + 'bpm.json';
    download(name, JSON.stringify({ app: 'loop-forge', version: 3, loop: strip(state) }, null, 2));
    flash('LOOP EXPORTED');
  }
  function importLoop(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let st = null;
      try { const data = JSON.parse(reader.result); st = normalize(data && data.loop ? data.loop : data); } catch (e) { st = null; }
      if (!st) return flash('THAT FILE IS NOT A LOOP FORGE LOOP');
      commit(s => Object.assign(s, st));
      flash('LOOP IMPORTED', true);
      closeDialogs();
    };
    reader.readAsText(file);
  }

  // ── saved loop slots ────────────────────────────────────────────
  const getSlots = () => { const s = lsGet(SLOTS_KEY, []); return Array.isArray(s) ? s : []; };
  const setSlots = s => lsSet(SLOTS_KEY, s) || flash('STORAGE FULL OR BLOCKED');
  function renderLoops() {
    const slots = getSlots();
    const suggested = (state.keyRoot + ' ' + state.scaleName + ' ' + state.bpm).toUpperCase();
    $('loops-body').innerHTML =
      '<form class="save-row" data-form="save"><label class="sr-only" for="slot-name">Loop name</label>' +
      '<input class="input" id="slot-name" maxlength="40" placeholder="' + esc(suggested) + '" autocomplete="off">' +
      '<button class="btn c-lime" type="submit" style="color:var(--on-accent)">SAVE</button></form>' +
      (slots.length ? '<ul class="slots">' + slots.map(s => {
        const L = s.data || {};
        const when = new Date(s.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return '<li class="slot"><div class="slot-meta"><span class="slot-name">' + esc(s.name) + '</span>' +
          '<span class="slot-sub">' + esc((L.keyRoot || '?') + ' ' + (L.scaleName || '') + ' · ' + (L.bpm || '?') + ' BPM · ' + when) + '</span></div>' +
          '<button class="tool" data-act="slot-load" data-arg="' + s.id + '">LOAD</button>' +
          '<button class="tool" data-act="slot-over" data-arg="' + s.id + '" title="Overwrite with the current loop">SAVE</button>' +
          '<button class="tool" data-act="slot-del" data-arg="' + s.id + '" aria-label="Delete ' + esc(s.name) + '">✕</button></li>';
      }).join('') + '</ul>' : '<div class="empty">NO SAVED LOOPS YET. NAME THIS ONE AND HIT SAVE.</div>') +
      '<div class="rule"></div><div class="label">FILES</div><div class="seg-ctrl">' +
      '<button class="btn btn-pixel" data-act="export">⇩ EXPORT .JSON</button>' +
      '<button class="btn btn-pixel" data-act="import">⇧ IMPORT .JSON</button></div>' +
      '<p class="hint">Loops live in this browser. Export a file or use SHARE LINK to move them between devices.</p>';
  }
  function saveSlot(name) {
    const slots = getSlots();
    const nm = (name || '').trim() || (state.keyRoot + ' ' + state.scaleName + ' ' + state.bpm).toUpperCase();
    slots.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: nm.slice(0, 40), at: Date.now(), data: strip(state) });
    setSlots(slots.slice(0, 50));
    renderLoops();
    flash('SAVED "' + nm.slice(0, 40).toUpperCase() + '"');
  }

  // ── settings ────────────────────────────────────────────────────
  function applySettings() {
    const r = document.documentElement;
    r.dataset.theme = settings.theme;
    r.dataset.scanlines = settings.scanlines ? 'on' : 'off';
    r.dataset.motion = settings.motion;
    r.dataset.cells = settings.cells;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(r).getPropertyValue('--page').trim() || '#1B0F42';
  }
  function setSetting(k, v) {
    settings[k] = v;
    lsSet(SETTINGS_KEY, settings);
    applySettings();
    renderSettings();
  }
  function renderSettings() {
    const opt = (k, v, label) => '<button class="tool' + (settings[k] === v ? ' is-on' : '') + '" style="height:42px;padding:0 14px" data-act="setting" data-arg="' + k + ':' + v + '" aria-pressed="' + (settings[k] === v) + '">' + label + '</button>';
    $('settings-body').innerHTML =
      '<div class="label">THEME</div><div class="themes">' + THEMES.map(t =>
        '<button class="theme-btn" data-act="setting" data-arg="theme:' + t.id + '" aria-pressed="' + (settings.theme === t.id) + '">' +
        '<span class="swatch">' + t.sw.map(c => '<i style="background:' + c + '"></i>').join('') + '</span><span>' + t.name + '</span></button>').join('') + '</div>' +
      '<div class="label">GRID SIZE</div><div class="seg-ctrl">' + opt('cells', 'cozy', 'COZY') + opt('cells', 'chunky', 'CHUNKY') + '</div>' +
      '<div class="label">SCANLINES</div><div class="seg-ctrl">' + opt('scanlines', true, 'ON') + opt('scanlines', false, 'OFF') + '</div>' +
      '<div class="label">MOTION</div><div class="seg-ctrl">' + opt('motion', 'auto', 'MATCH SYSTEM') + opt('motion', 'on', 'ON') + opt('motion', 'off', 'OFF') + '</div>' +
      '<div class="rule"></div><div class="label">KEYBOARD SHORTCUTS</div>' +
      '<dl class="kbd-list">' +
      '<dt>? or H</dt><dd>How-to guide</dd>' +
      '<dt>SPACE</dt><dd>Play / stop</dd>' +
      '<dt>1 – 8</dt><dd>Pick a layer</dd>' +
      '<dt>SHIFT + 1 – 4</dt><dd>Pick a section</dd>' +
      '<dt>M</dt><dd>Toggle loop / song</dd>' +
      '<dt>T</dt><dd>Tap tempo</dd>' +
      '<dt>CTRL/⌘ + Z</dt><dd>Undo (add Shift to redo)</dd>' +
      '<dt>C</dt><dd>Show / hide the code</dd>' +
      '<dt>← →</dt><dd>Adjust a focused slider</dd>' +
      '</dl>' +
      '<p class="hint">Drag across the grid to paint steps. On touch screens, swipe sideways to paint and up/down to scroll. Sound engine: <a href="https://strudel.cc" target="_blank" rel="noopener">Strudel</a>.</p>';
  }
  function openDialog(id) {
    const dlg = $(id);
    if (id === 'dlg-settings') renderSettings(); else renderLoops();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeDialogs() { for (const d of $$('dialog[open]')) { if (d.close) d.close(); else d.removeAttribute('open'); } }

  // ── guide ───────────────────────────────────────────────────────
  const GUIDE = window.LOOP_FORGE_GUIDE || [];
  const TOUR = window.LOOP_FORGE_TOUR || [];
  const WELCOMED_KEY = 'loopforge.welcomed';
  function renderGuide(id) {
    const i = Math.max(0, GUIDE.findIndex(g => g.id === id));
    const g = GUIDE[i];
    if (!g) return;
    ui.guideTab = g.id;
    $('guide-tabs').innerHTML = GUIDE.map(t =>
      '<button class="guide-tab" role="tab" id="gt-' + t.id + '" data-act="guide-tab" data-arg="' + t.id + '" aria-selected="' + (t.id === g.id) + '"' +
      ' aria-controls="guide-body" tabindex="' + (t.id === g.id ? 0 : -1) + '">' + t.tab + '</button>').join('');
    const prev = GUIDE[i - 1], next = GUIDE[i + 1];
    $('guide-body').setAttribute('aria-labelledby', 'gt-' + g.id);
    $('guide-body').innerHTML = '<h2>' + esc(g.title) + '</h2>' + g.html +
      (g.id === 'start' ? '<button class="btn btn-hot" data-act="tour" style="align-self:flex-start">▶ TAKE THE 1-MINUTE TOUR</button>' : '') +
      '<div class="guide-nav">' +
      (prev ? '<button class="btn btn-pixel" data-act="guide-tab" data-arg="' + prev.id + '">◀ ' + prev.tab + '</button>' : '<span></span>') +
      (next ? '<button class="btn btn-pixel" data-act="guide-tab" data-arg="' + next.id + '">' + next.tab + ' ▶</button>' : '<button class="btn btn-pixel" data-act="close-dialog">GOT IT ✓</button>') +
      '</div>';
    $('guide-body').scrollTop = 0;
    const tab = $('gt-' + g.id);
    if (tab) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function openGuide(id) {
    endTour();
    closeDialogs();
    renderGuide(id || ui.guideTab || 'start');
    const dlg = $('dlg-guide');
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    lsSet(WELCOMED_KEY, true);
  }

  // Spotlight tour: dims the page around one panel at a time.
  function tourTarget(step) {
    if (step.mobileTarget && matchMedia('(max-width: 760px)').matches) return document.querySelector(step.mobileTarget);
    if (step.panel) { const el = $(step.panel); return el && el.closest('.panel'); }
    return document.querySelector(step.target);
  }
  function showTourStep(i) {
    if (!TOUR.length) return;
    ui.tour = clamp(i, 0, TOUR.length - 1);
    for (const el of $$('.tour-focus')) el.classList.remove('tour-focus');
    const step = TOUR[ui.tour], el = tourTarget(step);
    if (el) {
      el.classList.add('tour-focus');
      const tall = el.getBoundingClientRect().height > innerHeight * 0.45;
      const calm = settings.motion === 'off' || (settings.motion === 'auto' && matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (!el.classList.contains('dock')) el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: calm ? 'auto' : 'smooth' });
    }
    const last = ui.tour === TOUR.length - 1;
    const card = $('tour');
    card.innerHTML = '<div class="bar bar-tempo"><span>✦ QUICK TOUR</span><button class="dlg-close" data-act="tour-end" aria-label="End tour">✕</button></div>' +
      '<div class="body"><h2 id="tour-title">' + esc(step.title) + '</h2><p>' + esc(step.text) + '</p>' +
      '<div class="tour-nav"><span class="tour-count">' + (ui.tour + 1) + ' / ' + TOUR.length + '</span><span style="display:flex;gap:6px">' +
      (ui.tour > 0 ? '<button class="btn btn-pixel" data-act="tour-back">◀ BACK</button>' : '<button class="btn btn-pixel" data-act="tour-end">SKIP</button>') +
      '<button class="btn btn-pixel btn-help" data-act="' + (last ? 'tour-end' : 'tour-next') + '">' + (last ? 'DONE ✓' : 'NEXT ▶') + '</button>' +
      '</span></div></div>';
    card.hidden = false;
    const btn = card.querySelector('[data-act="tour-next"], [data-act="tour-end"].btn-help');
    if (btn) btn.focus({ preventScroll: true });
  }
  function startTour() { closeDialogs(); lsSet(WELCOMED_KEY, true); showTourStep(0); }
  function endTour() {
    if (ui.tour == null || ui.tour < 0) return;
    ui.tour = -1;
    for (const el of $$('.tour-focus')) el.classList.remove('tour-focus');
    $('tour').hidden = true;
  }

  // ── actions ─────────────────────────────────────────────────────
  function tapTempo() {
    const now = performance.now();
    ui.taps = ui.taps.filter(t => now - t < 2000);
    ui.taps.push(now);
    if (ui.taps.length < 2) return flash('KEEP TAPPING…');
    const gaps = ui.taps.slice(1).map((t, i) => t - ui.taps[i]);
    const bpm = Math.round(clamp(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length), BPM_RANGE[0], BPM_RANGE[1]));
    commit(st => { st.bpm = bpm; }, { coalesce: 'tap' });
  }
  const actions = {
    play: () => togglePlay(),
    mode: () => commit(st => { st.mode = st.mode === 'loop' ? 'song' : 'loop'; }),
    undo, redo,
    'open-loops': () => openDialog('dlg-loops'),
    'open-settings': () => openDialog('dlg-settings'),
    'open-guide': () => openGuide('start'),
    guide: id => openGuide(id),
    'guide-tab': id => { renderGuide(id); const t = $('gt-' + id); if (t) t.focus({ preventScroll: true }); },
    tour: startTour,
    'tour-next': () => showTourStep(ui.tour + 1),
    'tour-back': () => showTourStep(ui.tour - 1),
    'tour-end': endTour,
    'close-dialog': closeDialogs,
    code: () => { ui.showCode = !ui.showCode; renderCode(); },
    copy: () => copyText(buildCode(false), 'COPIED. PASTE IT INTO STRUDEL.CC'),
    'open-strudel': () => window.open('https://strudel.cc/#' + encodeURIComponent(b64(buildCode(false))), '_blank', 'noopener'),
    share,
    'clear-all': () => { commit(st => Object.assign(st, makeInitial())); flash('CLEARED', true); },
    sel: id => commit(st => { st.sel = id; }, { history: false, replay: false }),
    power: id => commit(st => { const on = st.sections[st.section].on; on[id] = !on[id]; }),
    key: k => commit(st => { st.keyRoot = k; }),
    scale: dir => commit(st => {
      const i = SCALE_NAMES.indexOf(st.scaleName);
      st.scaleName = SCALE_NAMES[(i + Number(dir) + SCALE_NAMES.length) % SCALE_NAMES.length];
    }, { coalesce: 'scale' }),
    section: id => commit(st => { st.section = id; }, { history: false, replay: state.mode === 'loop' }),
    bars: delta => commit(st => { const s = st.sections[st.section]; s.bars = clamp(s.bars + Number(delta), 2, 32); }, { coalesce: 'bars' }),
    preset: applyPreset,
    dice,
    nudge,
    pump: id => commit(st => { if (id === 'on') st.pumpOn = !st.pumpOn; else st.pumpTargets[id] = !st.pumpTargets[id]; }),
    'layer-clear': () => {
      const d = def(state.sel);
      commit(st => { st.layers[d.id].steps = blank(rowCount(d)); });
      flash('CLEARED ' + d.name, true);
    },
    'layer-shift': dir => commit(st => {
      const n = Number(dir);
      st.layers[st.sel].steps = st.layers[st.sel].steps.map(r => (n > 0 ? [r[15]].concat(r.slice(0, 15)) : r.slice(1).concat(r[0])));
    }, { coalesce: 'shift' }),
    'layer-rand': randomizeLayer,
    page: p => { ui.page = p; renderTools(); renderGrid(); },
    bpm: delta => commit(st => { st.bpm = clamp(st.bpm + Number(delta), BPM_RANGE[0], BPM_RANGE[1]); }, { coalesce: 'bpm' }),
    tap: tapTempo,
    setting: arg => {
      const i = arg.indexOf(':'), k = arg.slice(0, i), raw = arg.slice(i + 1);
      setSetting(k, raw === 'true' ? true : raw === 'false' ? false : raw);
    },
    'slot-load': id => {
      const s = getSlots().find(x => x.id === id), st = s && normalize(s.data);
      if (!st) return flash('COULD NOT LOAD THAT LOOP');
      commit(x => Object.assign(x, st));
      closeDialogs();
      flash('LOADED "' + s.name.toUpperCase() + '"', true);
    },
    'slot-over': id => {
      const slots = getSlots(), s = slots.find(x => x.id === id);
      if (!s) return;
      s.data = strip(state); s.at = Date.now();
      setSlots(slots); renderLoops(); flash('UPDATED "' + s.name.toUpperCase() + '"');
    },
    'slot-del': id => {
      const slots = getSlots(), s = slots.find(x => x.id === id);
      if (!s || !confirm('Delete "' + s.name + '"?')) return;
      setSlots(slots.filter(x => x.id !== id)); renderLoops();
    },
    export: exportLoop,
    import: () => $('import-file').click()
  };

  // ── events ──────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (cell) {
      // Pointer taps are handled on pointerdown; this is keyboard activation (Enter).
      if (e.detail === 0) commit(st => { const r = st.layers[st.sel].steps[+cell.dataset.r]; r[+cell.dataset.s] = !r[+cell.dataset.s]; });
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el.dataset.arg, el, e);
  });

  document.addEventListener('submit', e => {
    if (e.target.dataset.form === 'save') { e.preventDefault(); saveSlot($('slot-name').value); }
  });

  document.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const cell = e.target.closest('.cell');
    if (cell) { onCellDown(e, cell); return; }
    const meter = e.target.closest('.meter');
    if (meter) {
      beginGesture();
      drag = { el: meter, pointerId: e.pointerId };
      try { meter.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
      meterFromPointer(e);
    }
  });
  document.addEventListener('pointermove', e => {
    if (paint) onPaintMove(e);
    else if (drag && e.pointerId === drag.pointerId) meterFromPointer(e);
  });
  const endPointer = cancelled => e => {
    if (paint) onPaintEnd(e, cancelled);
    if (drag && e.pointerId === drag.pointerId) { drag = null; endGesture(); }
  };
  document.addEventListener('pointerup', endPointer(false));
  document.addEventListener('pointercancel', endPointer(true));

  // First touch anywhere starts the audio engine + sample download in the
  // background (and inside a user gesture, which mobile browsers require).
  document.addEventListener('pointerdown', () => { warmAudio().catch(() => {}); }, { once: true, capture: true });

  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (ui.tour >= 0) {
      if (e.key === 'Escape') { endTour(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); ui.tour < TOUR.length - 1 ? showTourStep(ui.tour + 1) : endTour(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); showTourStep(ui.tour - 1); return; }
    }
    const openDlg = document.querySelector('dialog[open]');
    if (openDlg) {
      // Arrow keys move between guide tabs.
      if (openDlg.id === 'dlg-guide' && t && t.classList.contains('guide-tab') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const i = GUIDE.findIndex(g => g.id === ui.guideTab) + (e.key === 'ArrowRight' ? 1 : -1);
        const g = GUIDE[(i + GUIDE.length) % GUIDE.length];
        actions['guide-tab'](g.id);
      }
      return; // dialogs handle their own keys (Esc closes)
    }
    if (t && t.dataset && t.dataset.meter && meterKey(e, t)) { e.preventDefault(); return; }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
    const digit = /^Digit([1-8])$/.exec(e.code);
    if (digit) {
      const i = Number(digit[1]) - 1;
      if (e.shiftKey) { if (SECTIONS[i]) actions.section(SECTIONS[i].id); }
      else if (DEFS[i]) actions.sel(DEFS[i].id);
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'm') actions.mode();
    else if (k === 't') tapTempo();
    else if (k === 'c') actions.code();
    else if (k === '?' || k === 'h') openGuide();
  });

  $('import-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importLoop(f);
    e.target.value = '';
  });
  for (const d of $$('dialog')) {
    // Click on the backdrop closes the dialog.
    d.addEventListener('click', e => { if (e.target === d) closeDialogs(); });
  }
  const onNarrowChange = () => { renderTools(); renderGrid(); };
  if (narrowMQ.addEventListener) narrowMQ.addEventListener('change', onNarrowChange); else narrowMQ.addListener(onNarrowChange);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

  // ── boot ────────────────────────────────────────────────────────
  function boot() {
    applySettings();
    let loaded = null, fromLink = false;
    const h = location.hash.match(/[#&]s=([^&]+)/);
    if (h) {
      try {
        let s = h[1].replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        loaded = normalize(JSON.parse(unb64(s)));
        fromLink = !!loaded;
      } catch (e) { loaded = null; }
      // Drop the hash so later edits aren't overwritten by the link on reload.
      history.replaceState(null, '', location.pathname + location.search);
    }
    const firstVisit = !lsGet(STORE_KEY, null) && !lsGet(WELCOMED_KEY, false);
    if (!loaded) loaded = normalize(lsGet(STORE_KEY, null));
    if (loaded) state = loaded;
    else {
      const pat = PRESETS.hyperpop.pat;
      state.bpm = PRESETS.hyperpop.bpm;
      for (const id of Object.keys(pat)) setRows(state, id, pat[id]);
    }
    persist();
    render();
    if (fromLink) flash('LOADED A SHARED LOOP');
    else if (firstVisit) openGuide('start');
    requestAnimationFrame(tick);
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  boot();
})();
