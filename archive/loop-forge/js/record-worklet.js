/* Stereo PCM capture. Silent output keeps this tap out of the audible mix. */
class MixCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.active = true;
    this.left = new Float32Array(4096);
    this.right = new Float32Array(4096);
    this.used = 0;
    this.frames = 0;
    this.port.onmessage = e => { if (e.data === 'stop') this.finish(); };
  }
  flush() {
    if (!this.used) return;
    const left = this.left.slice(0, this.used), right = this.right.slice(0, this.used);
    this.port.postMessage({ type:'pcm', left, right, frames:this.frames }, [left.buffer, right.buffer]);
    this.used = 0;
  }
  finish() {
    if (!this.active) return;
    this.active = false;
    this.flush();
    this.port.postMessage({ type:'end' });
  }
  process(inputs) {
    if (!this.active) return false;
    const input = inputs[0];
    const count = input[0]?.length || 128;
    for (let i = 0; i < count; i++) {
      this.left[this.used] = input[0]?.[i] || 0;
      this.right[this.used++] = (input[1] || input[0])?.[i] || 0;
      this.frames++;
      if (this.used === this.left.length) this.flush();
      if (this.frames >= sampleRate * 600) { this.finish(); break; }
    }
    return this.active;
  }
}
registerProcessor('loopforge-mix-capture', MixCapture);
