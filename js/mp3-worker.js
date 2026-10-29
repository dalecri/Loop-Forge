/* LAME runs off the UI/audio threads; encode incrementally to bound PCM memory. */
importScripts('../vendor/lame.min.js?v=20261029-workspace-1');
let encoder, chunks = [];
const pcm16 = data => {
  const out = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i]));
    out[i] = v < 0 ? v * 32768 : v * 32767;
  }
  return out;
};
onmessage = e => {
  try {
    const m = e.data;
    if (m.type === 'start') {
      encoder = new lamejs.Mp3Encoder(2, m.sampleRate, 192);
      chunks = [];
      postMessage({ type:'ready' });
    } else if (m.type === 'pcm') {
      const bytes = encoder.encodeBuffer(pcm16(m.left), pcm16(m.right));
      if (bytes.length) chunks.push(new Uint8Array(bytes));
    } else if (m.type === 'end') {
      const bytes = encoder.flush();
      if (bytes.length) chunks.push(new Uint8Array(bytes));
      postMessage({ type:'done', blob:new Blob(chunks, { type:'audio/mpeg' }) });
      chunks = [];
    }
  } catch (error) { postMessage({ type:'error', message:error.message }); }
};
