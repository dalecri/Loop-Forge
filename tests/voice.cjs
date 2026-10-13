/* Run: npm install --no-save playwright; npx playwright install chromium; node tests/voice.cjs
 * CHROME_PATH optionally selects an existing Chromium binary.
 * Uses synthetic microphone input and a generated WAV; no network/audio upload required. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
function tone(seconds = 1) {
  const rate=24000,n=rate*seconds,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.sin(i/rate*Math.PI*440*2)*8000,44+i*2);return b;
}
const fixture=tone(), errors=[];
const server=http.createServer((req,res)=>{
  if(req.url==='/__tone.wav'){res.setHeader('Content-Type','audio/wav');return res.end(fixture);}
  const name=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!name.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2'})[path.extname(name)]||'application/octet-stream');res.end(fs.readFileSync(name));}catch(e){res.writeHead(404);res.end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
  async function fresh(){const context=await browser.newContext({viewport:{width:1280,height:1000},serviceWorkers:'block',permissions:['microphone']});const page=await context.newPage();await page.addInitScript(() => { window.__sources=[];window.__streams=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){window.__sources.push({rate:this.playbackRate.value,duration:this.buffer?.duration,offset:a[1]});return start.apply(this,a);};const gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async (...args)=>{const s=await gum(...args);window.__streams.push(s);return s;}; });page.on('pageerror',e=>errors.push(e.message));await page.route('https://raw.githubusercontent.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({bd:[base+'/__tone.wav'],cp:[base+'/__tone.wav'],hh:[base+'/__tone.wav'],oh:[base+'/__tone.wav']})}));await page.goto(base);await page.locator('#dlg-guide [data-act="close-dialog"]').click();return {context,page};}
  const {context,page:p}=await fresh();
  await p.locator('[data-voice-slot="0"]').click();
  await p.locator('#voice-file').setInputFiles({name:'voice-test.wav',mimeType:'audio/wav',buffer:fixture});
  await p.waitForFunction(()=>document.getElementById('voice-name').value==='voice-test.wav');
  await p.locator('#voice-start').fill('0.20');await p.locator('#voice-end').fill('0.80');await p.locator('#voice-pitch').fill('5');await p.locator('#voice-apply').click();
  assert.match(await p.locator('#voice-status').textContent(),/saved/);
  await p.locator('#voice-preview').click();await p.waitForTimeout(250);
  await p.locator('#dlg-voice [data-act="close-dialog"]').click();
  await p.locator('.cell[data-r="0"][data-s="0"]').click();
  await p.locator('[data-act="code"]').click();assert.match(await p.locator('#code').textContent(),/lfvoice_v[\da-f]+/);assert.match(await p.locator('#code').textContent(),/\.begin\(0.200000\).end\(0.800000\)/);
  await p.evaluate(()=>window.__sources=[]);await p.locator('.hero-actions [data-act="play"]').click();await p.waitForFunction(()=>document.getElementById('studio-status').textContent==='PLAYING');await p.waitForTimeout(1700);assert(await p.evaluate(()=>window.__sources.some(s=>Math.abs(s.rate-2**(5/12))<.01 && Math.abs(s.duration-1)<.01)),'voice reaches actual Web Audio playback');assert.equal(await p.locator('#sequence-bars .is-current').count(),1);await p.locator('.hero-actions [data-act="play"]').click();
  await p.reload();await p.waitForFunction(()=>document.querySelector('[data-voice-slot="0"]').textContent.includes('0.60s'));
  await p.locator('.hero-actions [data-act="open-loops"]').click();await p.locator('#slot-name').fill('Voice test');await p.locator('#dlg-loops button[type="submit"]').click();
  const download=p.waitForEvent('download');await p.locator('[data-act="export"]').click();const saved=await download;const payload=JSON.parse(fs.readFileSync(await saved.path(),'utf8'));assert.equal(payload.audio.length,1);assert.equal(payload.loop.voiceClips[0].pitch,5);
  const {context:c2,page:q}=await fresh();await q.locator('#import-file').setInputFiles({name:'loop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});await q.waitForFunction(()=>document.querySelector('[data-voice-slot="0"]').textContent.includes('voice-test.wav'));assert.match(await q.locator('[data-voice-slot="0"]').textContent(),/0.60s/);
  // Missing payload must fail without replacing the current loop.
  const bad=structuredClone(payload);bad.audio=[];bad.loop.voiceClips[0].id='v'+'0'.repeat(24);await q.locator('#import-file').setInputFiles({name:'missing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await q.waitForTimeout(300);assert.match(await q.locator('#toast').textContent(),/missing its audio/);
  // Real MediaRecorder with a synthetic microphone, then reload persistence.
  await q.locator('[data-voice-slot="1"]').click();await q.locator('#voice-record').click();await q.waitForFunction(()=>!document.getElementById('voice-stop').hidden);await q.waitForTimeout(900);await q.locator('#voice-stop').click();await q.waitForFunction(()=>document.getElementById('voice-status').textContent.includes('Recording saved'));
  await q.locator('#dlg-voice [data-act="close-dialog"]').click();await q.reload();await q.waitForFunction(()=>document.querySelector('[data-voice-slot="1"]').textContent.includes('Recording'));
  // Closing a recording releases the microphone and discards that take.
  await q.locator('[data-voice-slot="2"]').click();await q.locator('#voice-record').click();await q.waitForFunction(()=>!document.getElementById('voice-stop').hidden);await q.waitForTimeout(300);await q.locator('#dlg-voice [data-act="close-dialog"]').click();await q.waitForTimeout(200);assert(await q.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));assert.match(await q.locator('[data-voice-slot="2"]').textContent(),/Add voice/);
  await q.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));});await q.locator('[data-voice-slot="2"]').click();await q.locator('#voice-record').click();await q.waitForFunction(()=>document.getElementById('voice-status').textContent.includes('permission was denied'));await q.locator('#dlg-voice [data-act="close-dialog"]').click();
  // Invalid input and invalid trims leave the existing clip intact.
  await q.locator('[data-voice-slot="0"]').click();await q.locator('#voice-file').setInputFiles({name:'bad.wav',mimeType:'audio/wav',buffer:Buffer.from('bad')});await q.waitForFunction(()=>document.getElementById('voice-status').textContent.includes('could not be decoded'));await q.locator('#voice-start').fill('0.9');await q.locator('#voice-end').fill('0.1');await q.locator('#voice-apply').click();assert.match(await q.locator('#voice-status').textContent(),/end must be after start/);await q.locator('#dlg-voice [data-act="close-dialog"]').click();
  for(const width of [320,390,768,1280]){await q.setViewportSize({width,height:900});assert(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);}
  await q.screenshot({path:'/tmp/voice-desktop.png',fullPage:true});await q.setViewportSize({width:390,height:844});await q.locator('[data-voice-slot="0"]').click();await q.screenshot({path:'/tmp/voice-mobile.png'});
  assert.deepEqual(errors,[]);console.log('PASS: WAV upload, trimming, pitch, preview, real Strudel playback, persistence, portable export/import, microphone recording, invalid input, responsive layout');
  await c2.close();await context.close();await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
