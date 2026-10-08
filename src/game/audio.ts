// Tiny synthesized sound effects (no asset files needed).
const MUTE_KEY = 'pokecatch:muted:v1';
const MASTER_VOL = 0.32;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Must be called from a user gesture (click / key press). Safe to call repeatedly. */
export function initAudio(): void {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOL;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (master) master.gain.value = m ? 0 : MASTER_VOL;
}

function note(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.2,
  slideTo?: number,
): void {
  if (!ctx || !master || muted) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export const sfx = {
  tick() {
    note(660, 0, 0.09, 'square', 0.16);
  },
  go() {
    note(880, 0, 0.22, 'square', 0.2);
    note(1320, 0.07, 0.3, 'triangle', 0.18);
  },
  catch(tierIndex: number, combo: number) {
    const base = 523.25 * Math.pow(2, Math.min(combo, 12) / 12);
    [0, 4, 7, 12].forEach((semi, i) => note(base * Math.pow(2, semi / 12), i * 0.045, 0.12, 'square', 0.14));
    if (tierIndex >= 2) note(base * 2, 0.2, 0.45, 'triangle', 0.2);
  },
  miss() {
    note(240, 0, 0.32, 'sawtooth', 0.16, 80);
  },
  newDex() {
    [784, 988, 1319].forEach((f, i) => note(f, 0.12 + i * 0.07, 0.16, 'triangle', 0.2));
  },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.2, 'square', 0.16));
  },
  gameOver() {
    [392, 349, 311, 262].forEach((f, i) => note(f, i * 0.18, 0.3, 'triangle', 0.22));
  },
  click() {
    note(520, 0, 0.05, 'triangle', 0.12);
  },
};

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
