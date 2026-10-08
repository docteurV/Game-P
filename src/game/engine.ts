import {
  POKEMON,
  TIER_COLOR,
  TIER_GLOW,
  TIER_POINTS,
  TOTAL_POKEMON,
  TYPE_COLORS,
  spriteUrl,
  type Tier,
} from './pokemon';
import { initAudio, sfx, vibrate } from './audio';
import { loadDex, saveDex } from './storage';

// ---- Logical playfield (portrait 9:16) -------------------------------------
export const W = 360;
export const H = 640;
const BALL_Y = H - 120;
const GROUND_Y = H - 52;
const BALL_R = 24;
const CATCH_R = 46;
const WILD_SIZE = 66;
const WILD_R = 26;
const KEY_SPEED = 540;
const MAX_LIVES = 3;
const MAX_PARTICLES = 320;
const TAU = Math.PI * 2;
const TIER_INDEX: Record<Tier, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

export type Phase = 'ready' | 'countdown' | 'playing' | 'paused' | 'over';

export interface HudState {
  phase: Phase;
  score: number;
  lives: number;
  level: number;
  caught: number;
  combo: number;
  multiplier: number;
}

export interface GameOverInfo {
  score: number;
  caught: number;
  level: number;
  bestCombo: number;
}

export interface EngineCallbacks {
  onHud(hud: HudState): void;
  onPhase(phase: Phase): void;
  onGameOver(info: GameOverInfo): void;
  onDexChange(ids: number[]): void;
}

type WildState = 'fall' | 'absorb' | 'flee';

interface Wild {
  id: number;
  tier: Tier;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wob: number;
  wobSpd: number;
  wobAmp: number;
  rot: number;
  state: WildState;
  t: number;
  sx: number;
  sy: number;
  pop: number;
  alpha: number;
  scale: number;
}

type ParticleKind = 'dot' | 'star' | 'ring' | 'text' | 'puff';

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  life: number;
  max: number;
  size: number;
  color: string;
  text?: string;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

/** Pre-renders the static night-grove backdrop once (2x resolution). */
function buildBackground(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W * 2;
  c.height = H * 2;
  const g = c.getContext('2d');
  if (!g) return c;
  g.scale(2, 2);

  const sky = g.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#2b3c86');
  sky.addColorStop(0.5, '#1d2a6b');
  sky.addColorStop(1, '#151d4f');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  for (let i = 0; i < 110; i++) {
    g.fillStyle = `rgba(255,255,255,${rand(0.25, 0.9).toFixed(2)})`;
    g.beginPath();
    g.arc(rand(0, W), rand(0, GROUND_Y - 160), rand(0.4, 1.5), 0, TAU);
    g.fill();
  }

  const glow = g.createRadialGradient(290, 92, 6, 290, 92, 80);
  glow.addColorStop(0, 'rgba(255,244,196,0.55)');
  glow.addColorStop(1, 'rgba(255,244,196,0)');
  g.fillStyle = glow;
  g.fillRect(200, 0, 160, 180);
  g.fillStyle = '#fff4c4';
  g.beginPath();
  g.arc(290, 92, 19, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.08)';
  g.beginPath();
  g.arc(296, 88, 5, 0, TAU);
  g.fill();

  const hill = (base: number, amp: number, color: string, phase: number) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 6) {
      const y = base - Math.sin(x / 58 + phase) * amp - Math.sin(x / 23 + phase * 2) * amp * 0.25;
      g.lineTo(x, y);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();
  };
  hill(GROUND_Y - 58, 22, '#23367a', 0.6);
  hill(GROUND_Y - 30, 14, '#1b5160', 2.1);

  g.fillStyle = '#2f9160';
  g.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  g.fillStyle = '#3fae70';
  for (let x = 0; x < W; x += 14) {
    g.beginPath();
    g.moveTo(x, GROUND_Y);
    g.lineTo(x + 7, GROUND_Y - 7);
    g.lineTo(x + 14, GROUND_Y);
    g.closePath();
    g.fill();
  }
  g.fillStyle = '#1f6c47';
  g.fillRect(0, GROUND_Y + 26, W, H);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 22; i++) {
    g.beginPath();
    g.arc(rand(0, W), rand(GROUND_Y + 34, H), rand(1, 3), 0, TAU);
    g.fill();
  }
  return c;
}

export class PokeCatchEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cb: EngineCallbacks;
  private readonly bg: HTMLCanvasElement;
  private readonly imgs: HTMLImageElement[] = [];
  private dex: Set<number>;

  private wilds: Wild[] = [];
  private parts: Particle[] = [];

  private phase: Phase = 'ready';
  private ballX = W / 2;
  private ballVX = 0;
  private ballTarget: number | null = null;
  private ballRot = 0;
  private ballScale = 1;
  private keyL = false;
  private keyR = false;
  private pointerId: number | null = null;

  private spawnT = 0;
  private cdT = 0;
  private cdStep = -1;
  private dyingT = 0;

  private score = 0;
  private lives = MAX_LIVES;
  private caught = 0;
  private combo = 0;
  private bestCombo = 0;
  private level = 1;

  private shake = 0;
  private flash = 0;
  private flashRGB = '255,70,70';
  private bannerText = '';
  private bannerColor = '#ffffff';
  private bannerT = 0;
  private bannerDur = 1;

  private k = 1;
  private raf = 0;
  private last = 0;
  private time = 0;
  private ro: ResizeObserver | null = null;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not supported in this browser.');
    this.ctx = ctx;
    this.cb = cb;
    this.dex = new Set(loadDex());
    this.bg = buildBackground();
    for (const p of POKEMON) {
      const img = new Image();
      img.decoding = 'async';
      img.src = spriteUrl(p.id);
      this.imgs[p.id] = img;
    }
  }

  // ---- Lifecycle -----------------------------------------------------------

  mount(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    c.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(c);
    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    void document.fonts?.load('20px "Press Start 2P"').catch(() => undefined);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.ro?.disconnect();
    this.ro = null;
  }

  // ---- Public controls (called by React layer) -----------------------------

  start(): void {
    if (this.phase !== 'ready') return;
    initAudio();
    sfx.click();
    this.reset();
    this.cdT = 0;
    this.cdStep = -1;
    this.setPhase('countdown');
  }

  /** Instant restart: skips the menu and countdown. */
  restart(): void {
    if (this.phase === 'countdown' || this.phase === 'ready') return;
    initAudio();
    this.reset();
    this.setPhase('playing');
    this.spawnT = 0.35;
    this.showBanner('GO!', '#ffd34d', 0.8);
    sfx.go();
  }

  togglePause(): void {
    if (this.dyingT > 0) return;
    if (this.phase === 'playing') {
      this.setPhase('paused');
      this.ballTarget = null;
      sfx.click();
    } else if (this.phase === 'paused') {
      this.setPhase('playing');
      sfx.click();
    }
  }

  toMenu(): void {
    this.reset();
    this.setPhase('ready');
  }

  setInput(left: boolean, right: boolean): void {
    this.keyL = left;
    this.keyR = right;
  }

  getPhase(): Phase {
    return this.phase;
  }

  // ---- Input ---------------------------------------------------------------

  private toLogicalX(e: PointerEvent): number {
    const r = this.canvas.getBoundingClientRect();
    return clamp(((e.clientX - r.left) / r.width) * W, 0, W);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.phase !== 'playing' || this.dyingT > 0) return;
    this.pointerId = e.pointerId;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.ballTarget = this.toLogicalX(e);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.phase !== 'playing') return;
    if (e.pointerType === 'mouse' || e.pointerId === this.pointerId) {
      this.ballTarget = this.toLogicalX(e);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    if (e.pointerType !== 'mouse') this.ballTarget = null;
  };

  private onVisibility = () => {
    if (document.hidden && this.phase === 'playing') this.togglePause();
  };

  // ---- Layout --------------------------------------------------------------

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    if (r.width < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.k = (r.width * dpr) / W;
    this.canvas.width = Math.round(W * this.k);
    this.canvas.height = Math.round(H * this.k);
  }

  // ---- Loop ----------------------------------------------------------------

  private loop = (now: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = clamp((now - this.last) / 1000, 0, 0.05);
    this.last = now;
    this.update(dt);
    this.render();
  };

  private update(dt: number): void {
    if (this.phase === 'paused') return;
    this.time += dt;
    this.shake *= Math.exp(-dt * 12);
    if (this.shake < 0.05) this.shake = 0;
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.bannerT > 0) this.bannerT = Math.max(0, this.bannerT - dt);
    this.updateParticles(dt);

    if (this.phase === 'countdown') {
      this.updateCountdown(dt);
      this.updateBall(dt);
      return;
    }
    if (this.phase === 'ready' || this.phase === 'over') return;

    // playing
    const slow = this.dyingT > 0 ? 0.35 : 1;
    if (this.dyingT > 0) {
      this.dyingT -= dt;
      if (this.dyingT <= 0) {
        this.finishGame();
        return;
      }
    }
    this.updateBall(dt);
    if (this.dyingT <= 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawn();
        this.spawnT = this.spawnInterval();
      }
    }
    this.updateWilds(dt * slow);
  }

  private updateCountdown(dt: number): void {
    this.cdT += dt;
    const step = Math.floor(this.cdT / 0.6);
    if (step === this.cdStep || step > 3) return;
    this.cdStep = step;
    if (step < 3) {
      this.showBanner(String(3 - step), '#ffffff', 0.5);
      sfx.tick();
    } else {
      this.showBanner('GO!', '#ffd34d', 0.8);
      sfx.go();
      this.spawnT = 0.25;
      this.setPhase('playing');
    }
  }

  private updateBall(dt: number): void {
    const prev = this.ballX;
    const dir = (this.keyR ? 1 : 0) - (this.keyL ? 1 : 0);
    if (dir !== 0) {
      this.ballTarget = null;
      this.ballVX += (dir * KEY_SPEED - this.ballVX) * Math.min(1, dt * 22);
      this.ballX += this.ballVX * dt;
    } else if (this.ballTarget !== null) {
      this.ballX += (this.ballTarget - this.ballX) * Math.min(1, dt * 24);
      this.ballVX = clamp((this.ballX - prev) / Math.max(dt, 1e-3), -1400, 1400);
    } else {
      this.ballVX *= Math.exp(-dt * 14);
      this.ballX += this.ballVX * dt;
    }
    if (this.ballX < BALL_R) {
      this.ballX = BALL_R;
      this.ballVX = 0;
    } else if (this.ballX > W - BALL_R) {
      this.ballX = W - BALL_R;
      this.ballVX = 0;
    }
    this.ballRot += (this.ballX - prev) / BALL_R;
    this.ballScale += (1 - this.ballScale) * Math.min(1, dt * 14);
  }

  // ---- Spawning & wild Pokémon ---------------------------------------------

  private spawnInterval(): number {
    const base = Math.max(0.5, 1.15 - (this.level - 1) * 0.07);
    return base * rand(0.8, 1.15);
  }

  private pickId(): number {
    if (this.dex.size < TOTAL_POKEMON && Math.random() < 0.3) {
      const missing: number[] = [];
      for (let id = 1; id <= TOTAL_POKEMON; id++) if (!this.dex.has(id)) missing.push(id);
      return missing[Math.floor(Math.random() * missing.length)];
    }
    return 1 + Math.floor(Math.random() * TOTAL_POKEMON);
  }

  private spawn(): void {
    const id = this.pickId();
    const sp = 1 + (this.level - 1) * 0.05;
    this.wilds.push({
      id,
      tier: POKEMON[id - 1].tier,
      x: rand(WILD_R, W - WILD_R),
      y: -10,
      vx: rand(-45, 45) * sp,
      vy: rand(20, 50),
      wob: rand(0, TAU),
      wobSpd: rand(2.5, 4.5),
      wobAmp: rand(2, 5),
      rot: 0,
      state: 'fall',
      t: 0,
      sx: 0,
      sy: 0,
      pop: 0,
      alpha: 1,
      scale: 1,
    });
  }

  private updateWilds(dt: number): void {
    const G = 520 + (this.level - 1) * 28;
    for (let i = this.wilds.length - 1; i >= 0; i--) {
      const w = this.wilds[i];
      w.pop = Math.min(1, w.pop + dt * 4);

      if (w.state === 'fall') {
        w.vy = Math.min(560, w.vy + G * dt);
        w.x += w.vx * dt;
        w.y += w.vy * dt;
        w.wob += w.wobSpd * dt;
        w.rot = Math.sin(w.wob) * 0.14;
        if (w.x < WILD_R) {
          w.x = WILD_R;
          w.vx = Math.abs(w.vx);
        } else if (w.x > W - WILD_R) {
          w.x = W - WILD_R;
          w.vx = -Math.abs(w.vx);
        }
        const dx = w.x - this.ballX;
        const dy = w.y - BALL_Y;
        if (dx * dx + dy * dy < CATCH_R * CATCH_R) {
          this.catchWild(w);
          continue;
        }
        if (w.y > BALL_Y + CATCH_R + 8) {
          w.state = 'flee';
          w.t = 0;
          w.vx = (w.x < W / 2 ? -1 : 1) * rand(120, 200);
          w.vy = -rand(220, 300);
          this.missWild(w);
        }
      } else if (w.state === 'absorb') {
        w.t += dt;
        const p = Math.min(1, w.t / 0.2);
        const e = p * p;
        w.x = w.sx + (this.ballX - w.sx) * e;
        w.y = w.sy + (BALL_Y - w.sy) * e;
        w.scale = 1 - 0.8 * e;
        w.rot += dt * 22;
        if (p >= 1) this.wilds.splice(i, 1);
      } else {
        w.t += dt;
        w.vy += G * dt;
        w.x += w.vx * dt;
        w.y += w.vy * dt;
        w.rot += dt * 5;
        w.alpha = clamp(1 - w.t / 0.9, 0, 1);
        if (w.alpha <= 0) this.wilds.splice(i, 1);
      }
    }
  }

  private multiplier(): number {
    return 1 + Math.min(4, Math.floor(this.combo / 5));
  }

  private catchWild(w: Wild): void {
    w.state = 'absorb';
    w.t = 0;
    w.sx = w.x;
    w.sy = w.y;

    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = this.multiplier();
    const pts = TIER_POINTS[w.tier] * mult;
    this.score += pts;
    this.caught++;

    const poke = POKEMON[w.id - 1];
    const col = TYPE_COLORS[poke.types[0]];
    const tierCol = TIER_COLOR[w.tier];
    const tierIdx = TIER_INDEX[w.tier];
    const bx = this.ballX;
    const by = BALL_Y;

    // Juice: burst, sparkles, ring, popups
    this.burst(bx, by, col, 16, 330, 0.6, 4.5, 420, 2.2);
    this.burst(bx, by, '#fff6c8', 8, 240, 0.5, 3, 160, 1.8);
    for (let i = 0; i < 6; i++) {
      this.emit('star', bx + rand(-30, 30), by + rand(-30, 30), 0, rand(-40, -100), 0.45, rand(3, 6), '#ffffff', 0, 2);
    }
    this.emit('ring', bx, by, 0, 0, 0.35, 44 + tierIdx * 12, tierCol);
    this.emit('text', bx, by - 34, 0, -70, 0.9, 13, '#ffd34d', 0, 3, `+${pts}`);
    this.emit('text', w.x, w.y - 44, 0, -40, 1.0, 8, '#ffffff', 0, 2.5, poke.name.toUpperCase());

    if (!this.dex.has(w.id)) {
      this.dex.add(w.id);
      saveDex([...this.dex]);
      this.cb.onDexChange([...this.dex]);
      this.emit('text', bx, by - 62, 0, -50, 1.1, 12, '#8af0ff', 0, 2.5, 'NEW!');
      sfx.newDex();
    }

    this.ballScale = 1.32 + tierIdx * 0.06;
    this.shake = Math.min(12, Math.max(this.shake, tierIdx >= 2 ? 9 : 3 + tierIdx * 1.5));
    sfx.catch(tierIdx, this.combo);
    vibrate(12 + tierIdx * 6);

    if (tierIdx >= 2) {
      this.flash = 0.22;
      this.flashRGB = '255,211,77';
    }

    const newLevel = Math.floor(this.caught / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.showBanner(`LEVEL ${newLevel}`, '#ffd34d', 1.3);
      sfx.levelUp();
      this.emit('ring', bx, by, 0, 0, 0.6, 120, '#ffd34d');
      this.shake = Math.min(12, this.shake + 4);
      this.flash = 0.3;
      this.flashRGB = '255,211,77';
    } else if (this.combo >= 5 && this.combo % 5 === 0) {
      this.showBanner(`${this.combo} COMBO!`, '#ff8a5b', 0.9);
    }
    this.emitHud();
  }

  private missWild(w: Wild): void {
    // Once the final life is gone, extra escapes don't re-trigger the death sequence.
    if (this.lives <= 0) return;
    this.lives -= 1;
    this.combo = 0;
    this.shake = 12;
    this.flash = 0.45;
    this.flashRGB = '255,70,70';
    this.burst(w.x, GROUND_Y - 4, '#e2d2a4', 10, 170, 0.5, 4, 360, 3);
    this.emit('text', w.x, GROUND_Y - 36, 0, -50, 0.9, 12, '#ff6b6b', 0, 3, 'MISS');
    sfx.miss();
    vibrate([40, 30, 40]);
    if (this.lives <= 0) {
      this.dyingT = 1.0;
      this.shake = 12;
    }
    this.emitHud();
  }

  private finishGame(): void {
    this.dyingT = 0;
    this.setPhase('over');
    sfx.gameOver();
    this.cb.onGameOver({
      score: this.score,
      caught: this.caught,
      level: this.level,
      bestCombo: this.bestCombo,
    });
  }

  // ---- Particles & banners ---------------------------------------------------

  private emit(
    kind: ParticleKind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string,
    g = 0,
    drag = 0,
    text?: string,
  ): void {
    if (this.parts.length >= MAX_PARTICLES) return;
    this.parts.push({ kind, x, y, vx, vy, g, drag, life, max: life, size, color, text });
  }

  private burst(x: number, y: number, color: string, n: number, speed: number, life: number, size: number, g: number, drag: number): void {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(speed * 0.35, speed);
      this.emit('dot', x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(life * 0.6, life), rand(size * 0.7, size * 1.2), color, g, drag);
    }
  }

  private updateParticles(dt: number): void {
    const parts = this.parts;
    let j = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += p.g * dt;
      if (p.drag) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      parts[j++] = p;
    }
    parts.length = j;
  }

  private showBanner(text: string, color: string, dur: number): void {
    this.bannerText = text;
    this.bannerColor = color;
    this.bannerDur = dur;
    this.bannerT = dur;
  }

  // ---- State helpers -------------------------------------------------------

  private reset(): void {
    this.wilds.length = 0;
    this.parts.length = 0;
    this.score = 0;
    this.lives = MAX_LIVES;
    this.caught = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.level = 1;
    this.shake = 0;
    this.flash = 0;
    this.bannerT = 0;
    this.dyingT = 0;
    this.spawnT = 0;
    this.ballX = W / 2;
    this.ballVX = 0;
    this.ballScale = 1;
    this.emitHud();
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.cb.onPhase(p);
    this.emitHud();
  }

  private emitHud(): void {
    this.cb.onHud({
      phase: this.phase,
      score: this.score,
      lives: this.lives,
      level: this.level,
      caught: this.caught,
      combo: this.combo,
      multiplier: this.multiplier(),
    });
  }

  // ---- Rendering -----------------------------------------------------------

  private render(): void {
    const c = this.ctx;
    const k = this.k;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#0b1030';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(k, 0, 0, k, 0, 0);

    c.save();
    if (this.shake > 0) {
      c.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);
    }
    c.drawImage(this.bg, -12, -12, W + 24, H + 24);
    this.drawWilds();
    this.drawBall();
    this.drawParticles();
    c.restore();

    if (this.flash > 0) {
      c.globalAlpha = 1;
      c.fillStyle = `rgba(${this.flashRGB},${(this.flash * 0.45).toFixed(3)})`;
      c.fillRect(0, 0, W, H);
    }
    if (this.bannerT > 0) this.drawBanner();
    c.globalAlpha = 1;
  }

  private drawWilds(): void {
    const c = this.ctx;
    for (const w of this.wilds) {
      if (w.state === 'fall') {
        const h = clamp((GROUND_Y - w.y) / GROUND_Y, 0, 1);
        const rx = 14 + 10 * (1 - h);
        c.globalAlpha = 0.25 * (1 - h * 0.6) * clamp(w.pop, 0, 1);
        c.fillStyle = '#04061a';
        c.beginPath();
        c.ellipse(w.x, GROUND_Y + 4, rx, rx * 0.28, 0, 0, TAU);
        c.fill();
      }

      if (w.tier === 'rare' || w.tier === 'legendary') {
        const r = w.tier === 'legendary' ? 50 : 38;
        const grad = c.createRadialGradient(w.x, w.y, 0, w.x, w.y, r);
        grad.addColorStop(0, `${TIER_GLOW[w.tier]}0.55)`);
        grad.addColorStop(1, `${TIER_GLOW[w.tier]}0)`);
        c.globalAlpha = w.alpha;
        c.fillStyle = grad;
        c.beginPath();
        c.arc(w.x, w.y, r, 0, TAU);
        c.fill();
      }

      const s = w.scale * Math.max(0, easeOutBack(w.pop));
      c.save();
      c.globalAlpha = w.alpha;
      c.translate(w.x, w.y);
      c.rotate(w.rot);
      c.scale(s, s);
      const img = this.imgs[w.id];
      if (img && img.complete && img.naturalWidth > 0) {
        c.drawImage(img, -WILD_SIZE / 2, -WILD_SIZE / 2, WILD_SIZE, WILD_SIZE);
      } else {
        c.fillStyle = TYPE_COLORS[POKEMON[w.id - 1].types[0]];
        c.beginPath();
        c.arc(0, 0, WILD_SIZE * 0.36, 0, TAU);
        c.fill();
        c.strokeStyle = '#1b1d3a';
        c.lineWidth = 3;
        c.stroke();
        c.fillStyle = '#1b1d3a';
        c.font = '12px "Press Start 2P", monospace';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(w.id), 0, 1);
      }
      c.restore();
    }
    c.globalAlpha = 1;
  }

  private drawBall(): void {
    const c = this.ctx;
    const bob = this.phase === 'ready' ? Math.sin(this.time * 3) * 4 : 0;
    const x = this.ballX;
    const y = BALL_Y + bob;

    // shadow
    c.globalAlpha = 0.28;
    c.fillStyle = '#05081a';
    c.beginPath();
    c.ellipse(x, BALL_Y + BALL_R + 16, BALL_R * 0.95, 5, 0, 0, TAU);
    c.fill();

    // combo halo
    if (this.combo >= 5) {
      const pulse = 0.5 + 0.35 * Math.sin(this.time * 10);
      c.globalAlpha = 1;
      c.strokeStyle = `rgba(255,211,77,${pulse.toFixed(2)})`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y, BALL_R + 8, 0, TAU);
      c.stroke();
    }

    c.globalAlpha = 1;
    const r = BALL_R;
    c.save();
    c.translate(x, y);
    c.rotate(this.ballRot);
    c.scale(this.ballScale, this.ballScale);

    c.beginPath();
    c.arc(0, 0, r, Math.PI, 0);
    c.closePath();
    c.fillStyle = '#e8413b';
    c.fill();

    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI);
    c.closePath();
    c.fillStyle = '#f8f8f2';
    c.fill();

    c.fillStyle = '#1b1d3a';
    c.fillRect(-r, -r * 0.13, r * 2, r * 0.26);

    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.lineWidth = 3;
    c.strokeStyle = '#1b1d3a';
    c.stroke();

    c.beginPath();
    c.arc(0, 0, r * 0.3, 0, TAU);
    c.fillStyle = '#1b1d3a';
    c.fill();
    c.beginPath();
    c.arc(0, 0, r * 0.2, 0, TAU);
    c.fillStyle = '#f8f8f2';
    c.fill();

    c.beginPath();
    c.arc(-r * 0.42, -r * 0.45, r * 0.16, 0, TAU);
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fill();
    c.restore();
  }

  private drawParticles(): void {
    const c = this.ctx;
    for (const p of this.parts) {
      const t = clamp(p.life / p.max, 0, 1);
      c.globalAlpha = t;
      switch (p.kind) {
        case 'dot': {
          c.fillStyle = p.color;
          c.beginPath();
          c.arc(p.x, p.y, p.size * (0.4 + 0.6 * t), 0, TAU);
          c.fill();
          break;
        }
        case 'star': {
          const s = p.size * (0.5 + t);
          c.fillStyle = p.color;
          c.fillRect(p.x - s, p.y - 0.8, s * 2, 1.6);
          c.fillRect(p.x - 0.8, p.y - s, 1.6, s * 2);
          break;
        }
        case 'ring': {
          c.strokeStyle = p.color;
          c.lineWidth = 2 + 5 * t;
          c.beginPath();
          c.arc(p.x, p.y, p.size * (1 - t) + 4, 0, TAU);
          c.stroke();
          break;
        }
        case 'puff': {
          c.fillStyle = p.color;
          c.beginPath();
          c.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, TAU);
          c.fill();
          break;
        }
        case 'text': {
          c.font = `${p.size}px "Press Start 2P", monospace`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.lineJoin = 'round';
          c.lineWidth = 5;
          c.strokeStyle = '#1b1d3a';
          const text = p.text ?? '';
          c.strokeText(text, p.x, p.y);
          c.fillStyle = p.color;
          c.fillText(text, p.x, p.y);
          break;
        }
      }
    }
    c.globalAlpha = 1;
  }

  private drawBanner(): void {
    const c = this.ctx;
    const t = this.bannerT / this.bannerDur;
    const inT = clamp((1 - t) * 5, 0, 1);
    const s = 0.5 + 0.5 * easeOutBack(inT);
    c.save();
    c.globalAlpha = clamp(this.bannerT * 4, 0, 1);
    c.translate(W / 2, H * 0.36);
    c.scale(s, s);
    c.font = '28px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 9;
    c.strokeStyle = '#1b1d3a';
    c.strokeText(this.bannerText, 0, 0);
    c.fillStyle = this.bannerColor;
    c.fillText(this.bannerText, 0, 0);
    c.restore();
  }

  // Exposed for the React layer's ambient effects (none needed per-frame).
  get logicalSize() {
    return { w: W, h: H };
  }
}
