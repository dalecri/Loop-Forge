/* Local audio assets. No microphone data is uploaded; WAV blobs live in IndexedDB. */
(() => {
  'use strict';
  const MAX_SECONDS = 30, MAX_BYTES = 25 * 1024 * 1024, RATE = 24000;
  const assets = new Map(), registered = new Set(), urls = new Map();
  let dbPromise, ctx, api, active = 0, busy = false, recorder, stream, timer, preview, recordToken = 0;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function database() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('loopforge.audio', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('clips', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('Audio storage is unavailable. Allow site storage and try again.'));
    }).catch(e => { dbPromise = null; throw e; });
    return dbPromise;
  }
  async function store(asset) {
    const db = await database();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('clips', 'readwrite');
      tx.objectStore('clips').put(asset);
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(new Error('Could not save audio. Your browser storage may be full.'));
    });
    assets.set(asset.id, asset);
  }
  function context() { return ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)()); }
  async function decode(blob) {
    if (!blob.size || blob.size > MAX_BYTES) throw new Error('Choose a non-empty audio file smaller than 25 MB.');
    let buffer;
    try { buffer = await context().decodeAudioData(await blob.arrayBuffer()); }
    catch (e) { throw new Error('This audio format could not be decoded. Try WAV, MP3, or another format your browser supports.'); }
    if (buffer.duration > MAX_SECONDS + .1 || buffer.duration < .02) throw new Error('Use a clip between 0.02 and 30 seconds long. Trim longer files before uploading.');
    const offline = new OfflineAudioContext(1, Math.ceil(buffer.duration * RATE), RATE);
    const source = offline.createBufferSource(); source.buffer = buffer; source.connect(offline.destination); source.start();
    return offline.startRendering();
  }
  function wav(buffer) {
    const data = buffer.getChannelData(0), bytes = new ArrayBuffer(44 + data.length * 2), v = new DataView(bytes);
    const str = (at, s) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
    str(0,'RIFF'); v.setUint32(4,36+data.length*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,RATE,true);v.setUint32(28,RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,data.length*2,true);
    for (let i=0;i<data.length;i++) { const x=Math.max(-1,Math.min(1,data[i]));v.setInt16(44+i*2,x<0?x*32768:x*32767,true); }
    return new Blob([bytes],{type:'audio/wav'});
  }
  const newId = () => 'v' + Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2,'0')).join('');
  async function ingest(blob, name) {
    const buffer = await decode(blob);
    const asset = { id:newId(), name:String(name || 'Voice recording').slice(0,60), duration:buffer.duration, blob:wav(buffer) };
    await store(asset);
    return asset;
  }
  const descriptor = a => ({ id:a.id, name:a.name, duration:a.duration, start:0, end:a.duration, pitch:0 });
  function normalize(list) {
    return Array.from({length:4},(_,i) => {
      const c=Array.isArray(list)?list[i]:null;
      if (!c || !/^v[a-f0-9]{24}$/.test(c.id)) return null;
      const finite=(x,d)=>Number.isFinite(Number(x))?Number(x):d;
      const duration=Math.max(.02,Math.min(30.1,finite(c.duration,.02)));
      const start=Math.max(0,Math.min(duration-.02,finite(c.start,0)));
      return {id:c.id,name:String(c.name || 'Voice clip').slice(0,60),duration,start,end:Math.max(start+.02,Math.min(duration,finite(c.end,duration))),pitch:Math.max(-12,Math.min(12,Math.round(finite(c.pitch,0))))};
    });
  }
  function refresh() {
    if (!api) return;
    $('voice-slots').innerHTML = api.getClips().map((c,i)=>'<button class="voice-slot" data-voice-slot="'+i+'"><span class="label">0'+(i+1)+'</span><strong>'+esc(c?c.name:'Add voice / audio')+'</strong><span>'+ (c ? (assets.has(c.id)?(c.end-c.start).toFixed(2)+'s · '+(c.pitch>0?'+':'')+c.pitch+' st':'Audio missing on this device') : 'Record or upload') +'</span></button>').join('');
  }
  async function prepare(clips) {
    await ready;
    for (const c of clips.filter(Boolean)) {
      if (!assets.has(c.id)) throw new Error('Voice audio is missing. Import the exported loop file or replace the missing clip.');
      if (registered.has(c.id)) continue;
      if (!urls.has(c.id)) urls.set(c.id,URL.createObjectURL(assets.get(c.id).blob));
      await window.samples({['lfvoice_'+c.id]:[urls.get(c.id)]});
      registered.add(c.id);
    }
  }
  function stopPreview() { if (preview) { try { preview.stop(); } catch(e) {} preview=null; } }
  function renderEditor() {
    const c=api.getClips()[active];
    $('voice-editor-fields').hidden=!c;
    $('voice-slot-heading').textContent='VOICE / AUDIO · SLOT '+(active+1);
    $('voice-preview').disabled=!c || !assets.has(c.id);
    $('voice-remove').disabled=!c;
    if(c) {
      $('voice-name').value=c.name; $('voice-start').value=c.start.toFixed(2); $('voice-end').value=c.end.toFixed(2); $('voice-pitch').value=c.pitch;
      $('voice-start').max=c.duration; $('voice-end').max=c.duration;
      $('voice-pitch-value').textContent=c.pitch+' semitones';
      $('voice-duration').textContent='Source: '+c.duration.toFixed(2)+'s. Pitch changes playback speed too.';
      drawWave(c).catch(() => message("Could not draw this waveform. Try replacing the clip."));
    }
  }
  async function drawWave(c) {
    const canvas=$('voice-wave'), g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);
    const asset=assets.get(c.id); if(!asset)return;
    const buffer=await context().decodeAudioData(await asset.blob.arrayBuffer());
    if(api.getClips()[active]?.id!==c.id)return;
    const data=buffer.getChannelData(0),w=canvas.width,h=canvas.height;
    g.fillStyle='#172735';g.fillRect(0,0,w,h);g.fillStyle='#ffc83b44';g.fillRect(c.start/c.duration*w,0,(c.end-c.start)/c.duration*w,h);
    g.fillStyle='#74d7ef';
    for(let x=0;x<w;x+=3){let peak=0;const a=Math.floor(x/w*data.length),b=Math.floor((x+3)/w*data.length);for(let i=a;i<b;i++)peak=Math.max(peak,Math.abs(data[i]));g.fillRect(x,h/2-Math.max(1,peak*h*.45),2,Math.max(2,peak*h*.9));}
  }
  function message(text) { $('voice-status').textContent=text; }
  function setBusy(value) {
    busy=value;
    for(const id of ['voice-upload','voice-record','voice-preview','voice-apply','voice-remove'])$(id).disabled=value;
    $('voice-stop').hidden=!recorder;
    if(!value)renderEditor();
  }
  async function addFile(file) {
    if(busy)return;
    const slot=active;setBusy(true);message('Decoding and saving audio…');
    try { const a=await ingest(file,file.name);api.onChange(slot,descriptor(a));message('Saved on this device. Trim below, then add steps to the voice layer.'); }
    catch(e){message(e.message);}finally{setBusy(false);refresh();}
  }
  function releaseStream() { if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;clearInterval(timer); }
  function stopRecording(keep=true) {
    if(!recorder)return;
    recorder.keep=keep;
    if(recorder.state!=='inactive')recorder.stop();
    releaseStream();
  }
  async function record() {
    if(busy)return;
    if(!isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {message('Recording needs HTTPS or localhost and a browser with microphone support. You can still upload an audio file.');return;}
    const token=++recordToken, slot=active;
    setBusy(true);stopPreview();api.onRecordStart();message('Waiting for microphone permission…');
    try {
      const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      if(token!==recordToken || !$('dlg-voice').open){media.getTracks().forEach(t=>t.stop());return;}
      stream=media;
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
      const r=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),parts=[];recorder=r;r.keep=true;
      r.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
      r.onstop=async()=>{
        recorder=null;releaseStream();$('voice-stop').hidden=true;
        try { if(r.keep && parts.length){message('Saving recording…');const a=await ingest(new Blob(parts,{type:r.mimeType}), 'Recording '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));api.onChange(slot,descriptor(a));message('Recording saved. Preview and trim below.');} }
        catch(e){message(e.message);}finally{setBusy(false);refresh();}
      };
      r.onerror=()=>{message('Recording failed. Try uploading a clip instead.');stopRecording(false);};
      stream.getAudioTracks().forEach(t=>t.onended=()=>stopRecording(true));
      r.start(200);const started=Date.now();$('voice-stop').hidden=false;
      const update=()=>{const seconds=(Date.now()-started)/1000;message('● Recording '+seconds.toFixed(1)+' / 30s');if(seconds>=29.5)stopRecording(true);};update();timer=setInterval(update,100);
    }catch(e){releaseStream();setBusy(false);message(e.name==='NotAllowedError'?'Microphone permission was denied. Allow it in browser settings or upload a file.':'Could not access the microphone. Check your device and try again.');}
  }
  function edits() {
    const c=api.getClips()[active]; if(!c)return null;
    const start=Number($('voice-start').value),end=Number($('voice-end').value),pitch=Number($('voice-pitch').value);
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>c.duration+.005||end-start<.02)throw new Error('Trim end must be after start, within the clip, with at least 0.02 seconds remaining.');
    return {...c,name:$('voice-name').value.trim().slice(0,60)||'Voice clip',start,end:Math.min(c.duration,end),pitch};
  }
  async function listen() {
    stopPreview();
    try {const c=edits();if(!c)return;const asset=assets.get(c.id);if(!asset)throw new Error('Audio missing. Upload the clip again.');const ac=context();await ac.resume();const source=ac.createBufferSource();source.buffer=await ac.decodeAudioData(await asset.blob.arrayBuffer());source.playbackRate.value=2**(c.pitch/12);source.connect(ac.destination);preview=source;source.start(0,c.start,c.end-c.start);message('Previewing trimmed clip (dry audio).');}
    catch(e){message(e.message);}
  }
  const ready=(async()=>{
    try {const db=await database();const list=await new Promise((resolve,reject)=>{const r=db.transaction('clips').objectStore('clips').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});list.forEach(a=>assets.set(a.id,a));}
    catch(e){/* Storage errors are shown when trying to save. */}
  })();
  async function exportAssets(clips) {
    await ready;
    const result=[];
    for(const id of new Set(clips.filter(Boolean).map(c=>c.id))){const a=assets.get(id);if(!a)throw new Error('A voice clip is missing. Replace it before exporting.');const bytes=new Uint8Array(await a.blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));result.push({id,name:a.name,wav:btoa(binary)});}
    return result;
  }
  async function importAssets(items,clips) {
    const out=normalize(clips), mapped=new Map();
    if(!Array.isArray(items)||items.length>4)throw new Error('Invalid audio package.');
    for(const c of out.filter(Boolean)) {
      if(mapped.has(c.id))continue;
      const item=items.find(a=>a.id===c.id);
      if(!item){if(assets.has(c.id))continue;throw new Error('This loop is missing its audio. Export it again with the voice files included.');}
      if(typeof item.wav!=='string'||item.wav.length>2100000)throw new Error('Audio package is too large.');
      const binary=atob(item.wav),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
      const a=await ingest(new Blob([bytes],{type:'audio/wav'}),item.name);
      mapped.set(c.id,a);
    }
    return out.map(c=>{if(!c)return null;const a=mapped.get(c.id);return a?normalize([{...c,id:a.id,duration:a.duration}])[0]:c;});
  }
  function init(options) {
    api=options;refresh();ready.then(refresh);
    $('voice-slots').addEventListener('click',e=>{const b=e.target.closest('[data-voice-slot]');if(b)open(Number(b.dataset.voiceSlot));});
    $('voice-upload').onclick=()=>$('voice-file').click();
    $('voice-file').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)addFile(f);};
    $('voice-record').onclick=record;$('voice-stop').onclick=()=>stopRecording(true);$('voice-preview').onclick=listen;
    $('voice-pitch').oninput=()=>{$('voice-pitch-value').textContent=$('voice-pitch').value+' semitones';};
    $('voice-apply').onclick=()=>{try{const c=edits();if(c){api.onChange(active,c);message('Trim and pitch saved.');refresh();drawWave(c).catch(() => {});}}catch(e){message(e.message);}};
    $('voice-remove').onclick=()=>{stopPreview();api.onChange(active,null);refresh();renderEditor();message('Removed from this slot. Existing saved loops keep their audio.');};
    $('dlg-voice').addEventListener('close',()=>{recordToken++;stopPreview();stopRecording(false);if(!recorder)setBusy(false);});
  }
  function open(slot=0) {if(busy)return;active=slot;renderEditor();message('Up to 30 seconds per clip · audio stays on this device.');$('dlg-voice').showModal();}
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopPreview(); stopRecording(true); } });
  window.addEventListener('pagehide', () => { recordToken++; stopPreview(); stopRecording(false); releaseStream(); });
  window.LFVoice={init,refresh,open,prepare,normalize,exportAssets,importAssets,has:id=>assets.has(id)};
})();
