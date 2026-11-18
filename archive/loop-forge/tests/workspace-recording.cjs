// Real browser layout, touch, Strudel master capture, MP3 decode and offline export.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const f=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.woff2')?'font/woff2':'text/html');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}});
(async()=>{
 await new Promise(r=>server.listen(0,r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true});
 const p=await context.newPage(); const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:'+server.address().port);
 await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());});await p.evaluate(()=>document.fonts.ready);
 for(const width of [375,768,820,1024,1366,1920]){
  await p.setViewportSize({width,height:width<800?1024:1180});await p.evaluate(()=>scrollTo(0,0));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width,'no horizontal overflow '+width);
  const app=await p.locator('.app').boundingBox();assert.equal(app.width,width);assert.equal(app.x,0);
  assert.equal(await p.locator('#studio-aurora').count(),0);
  const cell=await p.locator('.cell').first().boundingBox();
  if(width>=768){assert(cell.width>=44 && cell.height>=44,'touch pad >=44px '+width+' '+JSON.stringify(cell));assert.equal(await p.locator('.grid-row').nth(1).locator('.cell').count(),16);}
  await p.screenshot({path:'/tmp/lf-workspace-'+width+'.png',fullPage:true});
  await p.evaluate(()=>scrollTo(0,700));assert((await p.locator('.hero').boundingBox()).y<1,'pinned header '+width);
 }
 console.log('PASS full-width workspace, iPad 44px pads, no overflow, pinned header');
 await p.setViewportSize({width:820,height:1180});await p.evaluate(()=>scrollTo(0,0));
 const cell=p.locator('.cell').first(),before=await cell.getAttribute('aria-pressed');await cell.tap();assert.notEqual(await cell.getAttribute('aria-pressed'),before);
 // Route the normal play action through real synthesized audio; no remote sample dependency.
 await p.evaluate(()=>{const init=window.initStrudel;window.initStrudel=async opts=>{const r=await init({...opts,prebake:()=>{}});window.testRepl=r;const evaluate=r.evaluate.bind(r);r.evaluate=()=>evaluate('note("c3*4").s("sine").gain(0.3).room(0.2)',false);return r;};});
 async function recordAndDecode(stopWithPlay=false){
  await p.locator('#mix-record').click();await p.waitForFunction(()=>document.getElementById('mix-record').getAttribute('aria-pressed')==='true');
  await p.waitForTimeout(2200);
  if(stopWithPlay)await p.locator('[data-act="play"]').first().click();else await p.locator('#mix-record').click();
  await p.waitForFunction(()=>!document.getElementById('mix-export').disabled);
  const downloadPromise=p.waitForEvent('download');await p.locator('#mix-export').click();const dl=await downloadPromise;
  assert(dl.suggestedFilename().endsWith('.mp3'));const bytes=fs.readFileSync(await dl.path());assert(bytes.length>20000);
  const decoded=await p.evaluate(async a=>{const c=new AudioContext();const b=await c.decodeAudioData(Uint8Array.from(a).buffer);const d=b.getChannelData(0);let energy=0;for(const v of d)energy+=v*v;await c.close();return {duration:b.duration,channels:b.numberOfChannels,rms:Math.sqrt(energy/d.length)};},Array.from(bytes));
  assert(decoded.duration>1.5&&decoded.duration<5);assert.equal(decoded.channels,2);assert(decoded.rms>0.001,'non-silent music MP3');console.log('PASS actual stereo MP3 decoded:',decoded);
 }
 await recordAndDecode(true);await recordAndDecode(true);
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);await p.reload();await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 await p.evaluate(()=>{const init=window.initStrudel;window.initStrudel=async opts=>{const r=await init({...opts,prebake:()=>{}});const evaluate=r.evaluate.bind(r);r.evaluate=()=>evaluate('note("c3*4").s("sine").gain(0.3)',false);return r;};});
 await recordAndDecode();await recordAndDecode();console.log('PASS offline encoder/worklet and recording after replay');
 assert.deepEqual(errors,[]);await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
