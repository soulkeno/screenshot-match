// Tiny Web Audio synth so games have sound without loading audio files.
let ctx: AudioContext | null = null;
let muted = false;
let loaded = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!loaded) { loaded = true; muted = localStorage.getItem("ember:muted") === "1"; }
  if (muted) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMuted() {
  if (typeof window !== "undefined" && !loaded) { loaded = true; muted = localStorage.getItem("ember:muted") === "1"; }
  return muted;
}
export function setMuted(v: boolean) {
  muted = v;
  if (typeof window !== "undefined") localStorage.setItem("ember:muted", v ? "1" : "0");
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, delay = 0, slideTo?: number) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol = 0.12, delay = 0, hp = 1500) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination); s.start(t);
}

export const sfx = {
  click: () => tone(520, 0.05, "triangle", 0.08),
  bet: () => { tone(330, 0.07, "triangle", 0.1); tone(495, 0.08, "triangle", 0.08, 0.05); },
  tick: () => tone(880, 0.03, "square", 0.04),
  card: () => noise(0.12, 0.18, 0, 2500),
  flip: () => { noise(0.08, 0.12, 0, 3000); tone(700, 0.06, "triangle", 0.05, 0.02); },
  reveal: () => tone(760, 0.12, "sine", 0.12, 0, 1100),
  gem: () => { tone(988, 0.1, "sine", 0.12); tone(1319, 0.14, "sine", 0.1, 0.06); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.12, i * 0.07)); },
  bigWin: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.22, "triangle", 0.13, i * 0.07)); },
  lose: () => tone(300, 0.35, "sawtooth", 0.06, 0, 120),
  boom: () => { noise(0.5, 0.35, 0, 200); tone(120, 0.4, "sine", 0.25, 0, 40); },
  cashout: () => { tone(880, 0.08, "triangle", 0.1); tone(1320, 0.16, "triangle", 0.1, 0.06); },
  coin: () => { tone(1500, 0.05, "square", 0.04); tone(2200, 0.08, "square", 0.03, 0.04); },
  roll: () => { for (let i = 0; i < 6; i++) noise(0.04, 0.08, i * 0.05, 1800); },
};
