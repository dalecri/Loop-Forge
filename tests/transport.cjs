// Run: node tests/transport.cjs. Exercises the production transport functions.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/app.js'), 'utf8');
const audio = source.slice(source.indexOf('  let repl = null'), source.indexOf('  // Playhead follows'));
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise, resolve}; };
function fixture() {
  const calls = {start:0, stop:0, panic:0, evaluate:0};
  const engine = {scheduler:{started:false}, evaluate:async (_, auto) => {assert.equal(auto,false); calls.evaluate++;}, start(){calls.start++;this.scheduler.started=true;}, stop(){calls.stop++;this.scheduler.started=false;}};
  const ctx = {console, setTimeout, clearTimeout, ui:{playing:false,loading:false}, state:{voiceClips:[]}, LFVoice:{prepare:async()=>{}}, window:{initStrudel:async()=>engine, samples(){}, panic(){calls.panic++;}, hush(){throw Error('global hush must not be used');}}, renderTransport(){}, paintHead(){}, buildCode:()=> 'pattern', flash(){}};
  vm.createContext(ctx);vm.runInContext(audio+'\n globalThis.transport={togglePlay,stop,evaluate,scheduleEval};',ctx);
  return {ctx, calls, engine, ...ctx.transport};
}
(async()=>{
  const a=fixture(); await a.togglePlay();assert.equal(a.calls.start,1); await a.evaluate();assert.equal(a.calls.start,1,'live edits must not restart the clock');a.stop();assert.equal(a.engine.scheduler.started,false);assert.equal(a.calls.panic,1);
  const b=fixture();await b.togglePlay();const prep=deferred();b.ctx.LFVoice.prepare=()=>prep.promise;const pending=b.evaluate();await Promise.resolve();b.stop();prep.resolve();await pending;assert.equal(b.calls.evaluate,1,'cancel evaluation during voice preparation');
  const c=fixture();await c.togglePlay();const compile=deferred();c.engine.evaluate=()=>compile.promise;const active=c.evaluate();await new Promise(r=>setImmediate(r));c.stop();compile.resolve();await active;assert.equal(c.calls.start,1,'late compile cannot resume stopped audio');
  const d=fixture();const warm=deferred();d.ctx.window.initStrudel=()=>warm.promise;const first=d.togglePlay();d.stop();const second=d.togglePlay();warm.resolve(d.engine);await Promise.all([first,second]);assert.equal(d.calls.start,1,'only newest loading request starts playback');
  const e=fixture();await e.togglePlay();e.scheduleEval();e.stop();await new Promise(r=>setTimeout(r,150));assert.equal(e.calls.evaluate,1,'stop cancels debounced edits');
  console.log('PASS: instance stop, panic, live edits, preparation/compile/loading races, pending debounce');
})().catch(e=>{console.error(e);process.exitCode=1;});
