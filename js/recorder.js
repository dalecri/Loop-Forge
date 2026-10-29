/* Record the Strudel master (including effect returns), never the microphone.
   The engine calls attach whenever panic/replay creates a new master bus. */
(() => {
  const VERSION = '20261029-workspace-1';
  let master, capture, worker, context, blob, url, phase = 'idle', frames = 0;
  let generation = 0, readyReject, readyResolve, timer;
  const loaded = new WeakSet();
  const button = () => document.getElementById('mix-record');
  const status = () => document.getElementById('mix-status');
  const exportButton = () => document.getElementById('mix-export');
  function render(message) {
    button().textContent = phase === 'recording' ? '■ STOP REC' : phase === 'starting' ? 'STARTING…' : phase === 'encoding' ? 'SAVING…' : '● RECORD';
    button().disabled = phase === 'starting' || phase === 'encoding';
    button().setAttribute('aria-pressed', String(phase === 'recording'));
    exportButton().disabled = !blob || phase !== 'idle';
    if (message) status().textContent = message;
  }
  function detach() {
    if (capture) {
      try { master?.disconnect(capture); } catch {}
      capture.disconnect();
      capture.port.close();
      capture = null;
    }
  }
  function clean() {
    clearTimeout(timer);
    detach();
    worker?.terminate(); worker = null;
  }
  function fail(message) {
    generation++;
    readyReject?.(new Error(message)); readyReject = readyResolve = null;
    clean(); phase = 'idle'; render(message + (blob ? ' · Previous MP3 still available' : ''));
  }
  async function start(ctx) {
    if (phase !== 'idle') return;
    const gen = ++generation;
    phase = 'starting'; context = ctx; frames = 0; render('Preparing recorder…');
    try {
      await ctx.resume();
      if (!ctx.audioWorklet) throw new Error('Recording requires HTTPS and a browser with AudioWorklet support');
      if (!loaded.has(ctx)) { await ctx.audioWorklet.addModule('js/record-worklet.js?v=' + VERSION); loaded.add(ctx); }
      if (gen !== generation) return;
      worker = new Worker('js/mp3-worker.js?v=' + VERSION);
      const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
      worker.onerror = () => fail('MP3 encoder could not load. Please reload and try again');
      worker.onmessage = e => {
        if (gen !== generation) return;
        const m = e.data;
        if (m.type === 'ready') { clearTimeout(timer); readyResolve?.(); readyReject = readyResolve = null; }
        if (m.type === 'error') fail(m.message || 'MP3 encoding failed');
        if (m.type === 'done') {
          blob = m.blob;
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(blob);
          clean(); phase = 'idle'; render('MP3 ready · ' + time(frames / ctx.sampleRate));
        }
      };
      timer = setTimeout(() => fail('MP3 encoder timed out'), 15000);
      worker.postMessage({ type:'start', sampleRate:ctx.sampleRate });
      await ready;
      if (gen !== generation) return;
      capture = new AudioWorkletNode(ctx, 'loopforge-mix-capture', { numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[2], channelCount:2, channelCountMode:'explicit' });
      capture.port.onmessage = e => {
        if (gen !== generation || !worker) return;
        const m = e.data;
        if (m.type === 'pcm') {
          frames = m.frames;
          worker.postMessage(m, [m.left.buffer, m.right.buffer]);
          // Update once per second, without making live regions announce every frame.
          const message = 'Recording · ' + time(frames / ctx.sampleRate) + ' / 10:00';
          if (status().textContent !== message && phase === 'recording') status().textContent = message;
        } else if (m.type === 'end') {
          phase = 'encoding'; render('Finishing MP3…');
          detach(); worker.postMessage({ type:'end' });
          timer = setTimeout(() => fail('MP3 encoding timed out'), 30000);
        }
      };
      capture.connect(ctx.destination); // Worklet outputs silence, not a second copy.
      master?.connect(capture);
      phase = 'recording'; render('Recording · 0:00 / 10:00');
      return true;
    } catch (error) {
      if (gen === generation) fail(error.message || 'Could not start recording');
      throw error;
    }
  }
  function time(seconds) { const n = Math.floor(seconds); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); }
  function stop() {
    if (phase === 'starting') { generation++; readyResolve?.(); readyReject = readyResolve = null; clean(); phase = 'idle'; render('Recording cancelled'); }
    if (phase !== 'recording') return;
    phase = 'encoding'; render('Finishing MP3…'); capture.port.postMessage('stop');
    timer = setTimeout(() => fail('Recording interrupted. Please try again'), 15000);
  }
  window.LFRecorder = {
    start, stop,
    get busy() { return phase !== 'idle'; },
    attach(node) {
      if (capture) { try { master?.disconnect(capture); } catch {} }
      master = node;
      if (capture) master.connect(capture);
    },
    download() {
      if (!blob || phase !== 'idle') return;
      const a = document.createElement('a');
      a.href = url; a.download = 'loop-forge-' + new Date().toISOString().replace(/[:.]/g, '-') + '.mp3';
      document.body.append(a); a.click(); a.remove();
    }
  };
  window.addEventListener('beforeunload', e => {
    if (phase !== 'idle') { e.preventDefault(); e.returnValue = ''; }
  });
})();
