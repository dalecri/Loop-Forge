// StrudelBox round-trip test: random grids -> Strudel code -> grid must be identical.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const core = html.split('/*CORE*/')[1].split('/*ENDCORE*/')[0];
const C = new Function(core + '\nreturn { presetTree, emptyTree, codeOf, parseCode, normalize };')();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let fails = 0;
const P = C.presetTree(), pc = C.codeOf(P);
if (C.codeOf(C.parseCode(pc, C.emptyTree())) !== pc) { fails++; console.log('preset not stable'); }
for (let k = 0; k < 3000; k++) {
  const T = C.emptyTree(60 + Math.floor(Math.random() * 120));
  for (const r of ['bd', 'sn', 'hh', 'oh']) T.drums.rows[r] = T.drums.rows[r].map(() => Math.random() < 0.3 || null);
  for (const n of ['bass', 'arp', 'lead']) {
    const l = T.lanes[n];
    l.root = Math.floor(Math.random() * 12); l.scale = Math.random() < 0.5 ? 'minor' : 'major';
    l.steps = l.steps.map(() => { const x = Math.random(); return x < 0.35 ? null : x < 0.6 ? 'h' : Math.random() < 0.3 ? [50, 53, 57] : [30 + Math.floor(Math.random() * 50)]; });
    C.normalize(l.steps); l.gain = Math.round(Math.random() * 120) / 100;
  }
  T.swing = Math.random() < 0.5 ? 0 : 0.2;
  const c = C.codeOf(T), U = C.parseCode(c, C.emptyTree());
  const ok = ['bass', 'arp', 'lead'].every(n => same(U.lanes[n].steps, T.lanes[n].steps)) && same(U.drums.rows, T.drums.rows)
    && U.rawArgs.length === 0 && C.codeOf(U) === c && U.bpm === T.bpm && U.swing === T.swing;
  if (!ok && ++fails < 3) console.log(c);
}
const raw = C.parseCode('stack(\n  s("bd*4").jux(rev),\n  note("<c4 e4>").s("piano")\n)', C.emptyTree());
if (!C.codeOf(raw).includes('.jux(rev)') || !C.codeOf(raw).includes('note("<c4 e4>")')) { fails++; console.log('raw block lost'); }
console.log(fails ? `FAIL ${fails}` : 'ok: 3000 random patterns round-trip, raw blocks kept');
process.exit(fails ? 1 : 0);
