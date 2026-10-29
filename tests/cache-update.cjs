// Reproduce stale cached studio CSS, then upgrade without clearing user data.
// Run: node tests/cache-update.cjs (Playwright; optional CHROME_PATH).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
let upgraded=false;
const old=(ref,file)=>execFileSync('git',['show',ref+':'+file],{cwd:root});
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
  try {
    const type=file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'text/html';
    res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control',file.endsWith('.css')?'max-age=3600':'no-cache');
    // The unversioned CDN URL stays stale even after the new release appears.
    if(file.startsWith('css/') && !u.search)res.end(old('1ae68ec',file));
    else if(!upgraded && (['index.html','sw.js'].includes(file) || file.startsWith('js/')))res.end(old('8240374',file));
    else res.end(fs.readFileSync(path.join(root,file)));
  } catch {res.statusCode=404;res.end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,r));
  const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const c=await b.newContext({viewport:{width:1280,height:850}});
  const p=await c.newPage();
  await p.goto('http://localhost:'+server.address().port);
  await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  await p.evaluate(()=>navigator.serviceWorker.ready);
  assert.equal(await p.locator('#studio-aurora').evaluate(e=>getComputedStyle(e).position),'static');
  assert((await p.locator('.hero').boundingBox()).y>800,'reproduces canvas pushing old header down');
  await p.evaluate(()=>localStorage.setItem('test-keep','saved-loop-sentinel'));
  upgraded=true;
  await p.reload();
  await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  await p.evaluate(()=>document.fonts.ready);
  assert.equal(await p.locator('#studio-aurora').count(),0);
  assert((await p.locator('.hero').boundingBox()).y<100,'new header starts at top');
  await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  assert(Math.abs((await p.locator('.hero').boundingBox()).y)<1,'header stays pinned');
  await p.screenshot({path:'/tmp/loop-forge-cache-fixed.png'});
  await p.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();if(!r?.active)return false;return (await caches.keys()).includes('loopforge-20261029-workspace-1');});
  await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await p.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.includes('v=20261029-workspace-1'));
  await p.waitForFunction(async()=>!(await caches.keys()).includes('loopforge-quiet-pixel-aurora-v1'));
  await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  await c.setOffline(true);await p.reload();
  assert.equal(await p.locator('#studio-aurora').count(),0);
  assert.equal(await p.evaluate(()=>localStorage.getItem('test-keep')),'saved-loop-sentinel');
  const missing=await p.evaluate(async()=>{try{const res=await fetch('css/never-existed.css?v=wrong');return !res.ok && !(await res.text()).includes('<!DOCTYPE html>');}catch{return true;}});
  assert.equal(missing,true,'missing styles do not receive HTML as fallback');
  console.log('PASS stale CSS reproduction, in-place upgrade, pinned header, offline reload, user data preserved, exact asset fallback');
  await b.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
