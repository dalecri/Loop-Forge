// Run: node tests/meters.cjs (requires Playwright; optional CHROME_PATH).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);
  try {res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}
  catch {res.statusCode=404;res.end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const page=await browser.newPage({viewport:{width:1100,height:950}});
  await page.goto('http://localhost:'+server.address().port);
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());window.initStrudel=async()=>({});});
  await page.evaluate(()=>document.fonts.ready);
  const meter=page.locator('[data-meter="p:gain"]');
  await meter.scrollIntoViewIfNeeded();
  const value=async()=>Number(await meter.getAttribute('aria-valuenow'));
  const setLow=async()=>{await meter.focus();await page.keyboard.press('Home');};
  const drag=async(dx,dy,shift=false)=>{
    await meter.scrollIntoViewIfNeeded();
    const box=await meter.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
    await page.mouse.move(x,y);await page.mouse.down();
    const before=await value();assert.equal(await value(),before);
    if(shift)await page.keyboard.down('Shift');
    await page.mouse.move(x+dx,y+dy,{steps:12});
    if(shift)await page.keyboard.up('Shift');
    await page.mouse.up();return before;
  };
  await setLow();await drag(60,0);const horizontal=await value();assert(horizontal>0);
  await page.locator('[data-act="undo"]').first().click();assert.equal(await value(),0,'one undo restores an entire drag');
  await drag(0,-60);assert.equal(await value(),horizontal,'up and right use the same sensitivity');
  await drag(-30,0);assert((await value())<horizontal,'left decreases');
  await setLow();await drag(60,0,true);assert((await value())>0 && (await value())<horizontal,'Shift provides fine control');
  await setLow();const box=await meter.boundingBox();await page.mouse.move(box.x+5,box.y+5);const before=await value();await page.mouse.down();assert.equal(await value(),before,'off-centre grab does not jump');await page.mouse.up();
  await meter.focus();await page.keyboard.press('End');assert.equal(await value(),1.4);
  await meter.focus();await page.keyboard.press('ArrowLeft');assert.equal(await value(),1.35);
  // Actual browser touch input, including movement outside the small knob.
  await page.setViewportSize({width:375,height:812});await setLow();await meter.scrollIntoViewIfNeeded();
  const session=await page.context().newCDPSession(page),rect=await meter.boundingBox();
  const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+6*i,y}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await value(),horizontal,'touch drag matches mouse drag');
  assert.equal(await meter.evaluate(e=>e.classList.contains('is-dragging')),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),375);
  // Header and monitor remain on screen at the bottom of the app.
  for (const width of [375, 1100]) {
    await page.setViewportSize({width,height:812});
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    await page.waitForTimeout(50);
    const header=await page.locator('.hero').boundingBox();
    assert(header.y>=-1 && header.y<=1,'header pins to viewport at '+width);
    const monitor=await page.locator('.studio-screen').boundingBox();
    assert(monitor.y>=0 && monitor.y+monitor.height<220,'compact monitor stays visible');
    assert(await page.locator('.hero [data-act="play"]').isVisible());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    await page.screenshot({path:'/tmp/loop-forge-nav-'+width+'.png'});
  }
  const frame=()=>page.locator('#studio-aurora').evaluate(e=>e.toDataURL());
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);const still=await frame();
  await page.waitForTimeout(120);assert.equal(await frame(),still,'reduced motion freezes aurora');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForTimeout(150);assert.notEqual(await frame(),still,'aurora animates again');
  await page.evaluate(()=>document.documentElement.dataset.motion='off');
  await page.waitForTimeout(100);const off=await frame();
  await page.waitForTimeout(120);assert.equal(await frame(),off,'motion setting freezes aurora');
  await page.evaluate(()=>document.documentElement.dataset.theme='paper');
  assert.equal(await page.locator('#studio-aurora').isVisible(),false,'aurora only belongs to studio');
  await page.evaluate(()=>{document.documentElement.dataset.theme='studio';document.documentElement.dataset.motion='auto';});
  // Check the actual short synthesis buffer and the persisted mute switch.
  await page.evaluate(()=>{
    window.clicks=[];
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){
      if(this.buffer && this.buffer.duration<0.04) clicks.push({duration:this.buffer.duration,peak:Math.max(...this.buffer.getChannelData(0).map(Math.abs))});
      return start.apply(this,args);
    };
  });
  await page.locator('.hero [data-act="open-settings"]').click();
  assert((await page.evaluate(()=>clicks.length))>0,'button creates mechanical click buffer');
  await page.locator('[data-arg="uiSounds:false"]').click();
  const mutedCount=await page.evaluate(()=>clicks.length);
  await page.locator('#dlg-settings [data-act="close-dialog"]').click();
  assert.equal(await page.evaluate(()=>clicks.length),mutedCount,'mute suppresses feedback');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('loopforge.settings.studio')).uiSounds),false);
  await page.locator('.hero [data-act="open-settings"]').click();
  await page.locator('[data-arg="uiSounds:true"]').click();
  assert((await page.evaluate(()=>clicks.length))>mutedCount,'reenabling sounds resumes feedback');
  await page.locator('#dlg-settings [data-act="close-dialog"]').click();
  await page.waitForTimeout(40);
  const cellCount=await page.evaluate(()=>clicks.length);
  await page.locator('.cell').first().click();
  assert.equal(await page.evaluate(()=>clicks.length),cellCount+1,'step click sounds once');
  console.log('PASS pinned mobile/desktop nav, sequence monitor, synthesized clicks and saved mute');
  console.log('PASS horizontal/vertical mouse drag, fine adjustment, no grab jump, undo, keyboard, real touch drag and mobile overflow');
  await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
