// WebAudio synthesized sounds — no audio files, no network.
// Every sound is built from oscillators and a short noise buffer: a chop, a sizzle, a ding, a
// coin, a burn and a tray pickup. The context is made on the first user gesture (browsers refuse
// one before that) and a master gain makes the whole kitchen mutable with M.

let ctx = null;
let master = null;
let muted = false;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.3, when = 0, slideTo = null) {
  const c = ensureCtx();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 0.2, when = 0, filterFreq = 2000) {
  const c = ensureCtx();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt);
  filt.connect(g);
  g.connect(master);
  src.start(t0);
}

export const audio = {
  /** Called from the first click or key: browsers start audio only after a gesture. */
  unlock() {
    ensureCtx();
  },
  setMuted(value) {
    muted = !!value;
    if (master) master.gain.value = muted ? 0 : 0.5;
  },
  isMuted() {
    return muted;
  },
  chop() {
    noise(0.07, 0.22, 0, 1100);
    tone(240, 0.05, 'square', 0.1);
  },
  sizzle() {
    noise(0.3, 0.14, 0, 3400);
  },
  ding() {
    tone(880, 0.16, 'sine', 0.2);
    tone(1320, 0.2, 'sine', 0.18, 0.07);
  },
  coin() {
    tone(988, 0.09, 'square', 0.14);
    tone(1319, 0.14, 'square', 0.14, 0.07);
  },
  tap() {
    tone(520, 0.05, 'triangle', 0.12);
  },
  plate() {
    noise(0.09, 0.1, 0, 2600);
    tone(700, 0.07, 'triangle', 0.12);
  },
  toss() {
    noise(0.18, 0.16, 0, 700);
    tone(300, 0.12, 'sawtooth', 0.08, 0, 180);
  },
  burn() {
    noise(0.45, 0.26, 0, 520);
    tone(130, 0.4, 'sawtooth', 0.16, 0, 70);
  },
  error() {
    tone(190, 0.16, 'sawtooth', 0.14, 0, 140);
  },
  serve() {
    tone(660, 0.11, 'triangle', 0.2);
    tone(880, 0.11, 'triangle', 0.2, 0.08);
    tone(1100, 0.18, 'triangle', 0.2, 0.16);
  },
};
