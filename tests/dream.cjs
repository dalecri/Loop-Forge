// Run: node tests/dream.cjs (Playwright; optional CHROME_PATH).
// Dream Mode: old output unchanged, honest code, real Strudel compile, links, Drift.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const BASE=process.env.DREAM_BASE||'17330f5'; // last commit before Dream Mode
function serve(ref){return new Promise(r=>{const s=http.createServer((q,res)=>{const u=q.url.split('?')[0];const f=u==='/'?'index.html':decodeURIComponent(u.slice(1));try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.woff2')?'font/woff2':'text/html');res.end(ref?execFileSync('git',['show',ref+':'+f],{cwd:root,stdio:['ignore','pipe','ignore']}):fs.readFileSync(path.join(root,f)));}catch{res.statusCode=404;res.end();}}).listen(0,()=>r(s));});}
const OLD_PRESETS=['hyperpop','prog','pluck','lofi','techno'];
const DREAM_PRESETS=['bestfriend','swirl','electricfeel'];
async function open(b,port,hash=''){
  const c=await b.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const p=await c.newPage();p.errors=[];
  p.on('pageerror',e=>p.errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')p.errors.push(m.text());});
  await p.goto('http://localhost:'+port+'/'+hash);
  await p.evaluate(()=>{localStorage.setItem('loopforge.welcomed','true');document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  // Synth-only engine: no remote samples, but the real bundled Strudel compiler.
  await p.evaluate(()=>{const init=window.initStrudel;window.initStrudel=async o=>{const r=await init({...o,prebake:()=>{}});window.testRepl=r;return r;};});
  return p;
}
const code=async p=>{if(await p.locator('#code-body').isHidden())await p.click('#code-toggle');return p.locator('#code').textContent();};
const click=(p,act,arg)=>p.locator(`[data-act="${act}"]${arg?`[data-arg="${arg}"]`:''}`).first().click();
(async()=>{
  const [now,old]=await Promise.all([serve(null),serve(BASE)]);
  const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const a=await open(b,now.address().port), o=await open(b,old.address().port);

  // 1. Dream off: every original starter writes byte-identical Strudel.
  for(const k of OLD_PRESETS){await click(a,'preset',k);await click(o,'preset',k);assert.equal(await code(a),await code(o),k+' unchanged');}
  for(const m of ['mode']){await click(a,m);await click(o,m);assert.equal(await code(a),await code(o),'song mode unchanged');await click(a,m);await click(o,m);}
  console.log('PASS dream off: all original starters and song mode emit identical code');

  // 2. Old share links load with Dream off and play identically.
  await click(o,'preset','lofi');
  const oldLink=await o.evaluate(()=>{let t;const orig=navigator.clipboard.writeText;navigator.clipboard.writeText=x=>{t=x;return Promise.resolve();};document.querySelector('[data-act="share"]').click();return new Promise(r=>setTimeout(()=>r(t),50));});
  assert(oldLink&&oldLink.includes('#s='),'old app produced a link');
  const viaLink=await open(b,now.address().port,oldLink.slice(oldLink.indexOf('#')));
  assert.equal(await viaLink.locator('[data-dream-btn]').first().getAttribute('aria-pressed'),'false');
  assert.equal(await code(viaLink),await code(o),'old link plays identically');
  console.log('PASS old share link loads with Dream off and identical code');

  // 3. Toggle is a lens: grid untouched, code transformed honestly, off restores exactly.
  const before=await code(viaLink);
  const grid=()=>viaLink.evaluate(()=>JSON.parse(localStorage.getItem('loopforge.v1')).layers);
  const g0=JSON.stringify(await grid());
  await click(viaLink,'dream');
  const dreamt=await code(viaLink);
  for(const needle of ['chord("<','.voicing().anchor(','.swingBy(0.12, 8)','.roomsize(','.delaytime(','.vib(','.velocity("1 ','.nudge("0 ','setcpm(78/4)',' rm '])assert(dreamt.includes(needle),'dream code contains '+needle);
  assert(!/Math\.random/.test(dreamt));
  assert.equal(JSON.stringify(await grid()),g0,'grid unchanged by Dream');
  assert.equal(await viaLink.locator('[data-readout="bpm"]').first().textContent(),'78');
  await click(viaLink,'dream');
  assert.equal(await code(viaLink),before,'Dream off restores exact original code');
  assert.equal(await viaLink.locator('[data-readout="bpm"]').first().textContent(),'84','user tempo restored');
  console.log('PASS Dream toggle transforms code, never the grid, and restores exactly');

  // 4. Every progression and every dream starter compiles and schedules in the real engine.
  await click(a,'play');await a.waitForFunction(()=>window.testRepl?.scheduler.started);
  const compile=async src=>a.evaluate(async c=>{await testRepl.evaluate(c,false);return testRepl.scheduler.pattern.queryArc(0,4).filter(h=>h.hasOnset()).length;},src);
  for(const k of DREAM_PRESETS){
    await click(a,'preset',k);await a.waitForTimeout(250);
    assert.equal(await a.locator('[data-dream-btn]').first().getAttribute('aria-pressed'),'true',k+' loads with Dream on');
    const src=await code(a);
    assert((await compile(src))>20,k+' copied code schedules events');
    for(const prog of ['daydream','swirl','nightswim','electric']){await click(a,'dream-prog',prog);await a.waitForTimeout(150);assert((await compile(await code(a)))>20,k+'/'+prog);}
  }
  // Minor-family keys and song mode compile too.
  await click(a,'scale','1');await click(a,'mode');assert((await compile(await code(a)))>20,'dorian + song mode');await click(a,'mode');
  const live=await a.evaluate(()=>testRepl.scheduler.started);assert.equal(live,true);
  await click(a,'play');
  assert.deepEqual(a.errors.filter(e=>!/sound .* not found|is not loaded|not found! Is it loaded/i.test(e)),[],'no pattern errors');
  console.log('PASS all dream starters x 4 progressions, dorian and song mode compile and schedule in bundled Strudel');

  // 5. Haze >= 70 adds tape hiss; below it does not.
  await click(a,'preset','swirl');assert((await code(a)).includes('const tape = s("pink")'));
  await click(a,'preset','bestfriend');assert(!(await code(a)).includes('const tape'));
  console.log('PASS tape hiss only at high Haze');

  // 6. A dream share link reproduces the exact performance (seed travels in the URL).
  await click(a,'preset','electricfeel');
  const dreamCode=await code(a);
  const link=await a.evaluate(()=>{let t;navigator.clipboard.writeText=x=>{t=x;return Promise.resolve();};document.querySelector('[data-act="share"]').click();return new Promise(r=>setTimeout(()=>r(t),50));});
  const again=await open(b,now.address().port,link.slice(link.indexOf('#')));
  assert.equal(await code(again),dreamCode,'dream link reproduces identical code');
  console.log('PASS dream share link reproduces identical code including humanize');

  // 7. Drift: seeded, sparse, editable, asks before replacing hand-made notes.
  await click(again,'sel','lead');
  let asked=0;again.on('dialog',d=>{asked++;d.accept();});
  await click(again,'drift');await again.waitForTimeout(100);
  assert.equal(asked,1,'confirm before replacing existing lead notes');
  const lead=()=>again.evaluate(()=>JSON.parse(localStorage.getItem('loopforge.v1')).layers.lead.steps);
  const first=await lead();
  const onSteps=first[0].map((_,s)=>first.some(r=>r[s])).filter(Boolean).length;
  assert(onSteps>=3&&onSteps<=8,'sparse: '+onSteps+' of 16 steps');
  await click(again,'drift');await again.waitForTimeout(100);
  assert.equal(asked,1,'re-rolling its own phrase does not ask again');
  assert.notDeepEqual(await lead(),first,'re-roll changes the phrase');
  await click(again,'undo');assert.deepEqual(await lead(),first,'undo restores the previous phrase');
  console.log('PASS Drift is seeded, sparse ('+onSteps+'/16 steps), confirms once, re-rolls, undoable');

  // 8. Phone layout: no horizontal scroll, controls visible.
  const ph=await b.newContext({viewport:{width:375,height:812},serviceWorkers:'block'});const pp=await ph.newPage();
  await pp.goto('http://localhost:'+now.address().port+'/'+link.slice(link.indexOf('#')));
  await pp.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  assert.equal(await pp.evaluate(()=>document.documentElement.scrollWidth),375);
  for(const sel of ['[data-dream-btn]','[data-drift-btn]','#dream-picks .tool','[data-meter="d:haze"]'])assert(await pp.locator(sel).first().isVisible(),sel+' visible on phone');
  await pp.screenshot({path:process.env.SHOT_DIR?path.join(process.env.SHOT_DIR,'dream-phone.png'):'/tmp/dream-phone.png'});
  console.log('PASS phone layout: no horizontal scroll, Dream controls visible');

  await b.close();now.close();old.close();
})().catch(e=>{console.error(e);process.exit(1);});
