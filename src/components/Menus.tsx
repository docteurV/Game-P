import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { spriteUrl } from '../game/pokemon';
import type { GameOverInfo } from '../game/engine';
import type { ScoreEntry } from '../game/storage';
import { HighScoreTable } from './HighScores';

// ---------- Shared bits -----------------------------------------------------

export function PokeBallIcon({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative rounded-full border-4 border-ink ${className}`}
      style={{ background: 'linear-gradient(to bottom, #e8413b 0 47%, #1b1d3a 47% 54%, #f8f8f2 54% 100%)' }}
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink bg-paper" />
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = Math.min(900, 350 + value * 0.3);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toLocaleString()}</>;
}

// ---------- Start screen ----------------------------------------------------

const FLOATERS = [25, 1, 4, 7, 133, 143, 150, 149, 131, 39, 94, 6, 9, 130, 65, 147];
const SPOTS = [
  { l: '4%', t: '9%', s: 62, r: '-14deg', d: '5.2s', dl: '0s' },
  { l: '74%', t: '6%', s: 54, r: '10deg', d: '6.1s', dl: '-1s' },
  { l: '80%', t: '30%', s: 58, r: '6deg', d: '5.6s', dl: '-2s' },
  { l: '0%', t: '44%', s: 52, r: '-6deg', d: '6.8s', dl: '-3s' },
  { l: '12%', t: '74%', s: 66, r: '8deg', d: '5.9s', dl: '-0.5s' },
  { l: '74%', t: '76%', s: 60, r: '-10deg', d: '6.4s', dl: '-2.5s' },
];

interface StartMenuProps {
  best: number;
  muted: boolean;
  onPlay: () => void;
  onDex: () => void;
  onScores: () => void;
  onToggleMute: () => void;
}

export function StartMenu({ best, muted, onPlay, onDex, onScores, onToggleMute }: StartMenuProps) {
  const picks = useMemo(() => {
    const pool = [...FLOATERS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, SPOTS.length);
  }, []);

  return (
    <div className="fade-in absolute inset-0 z-30 flex flex-col items-center justify-between overflow-hidden px-5 pb-6 pt-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {SPOTS.map((spot, i) => (
          <img
            key={`${picks[i]}-${i}`}
            src={spriteUrl(picks[i])}
            alt=""
            draggable={false}
            className="float-sprite absolute opacity-90"
            style={
              {
                left: spot.l,
                top: spot.t,
                width: spot.s,
                height: spot.s,
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 4px 0 rgba(27,29,58,0.45))',
                '--r': spot.r,
                '--d': spot.d,
                '--dl': spot.dl,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="enter relative flex flex-col items-center text-center">
        <div className="hud-chip pixel mb-4 px-3 py-1.5 text-[8px] text-red">151 ORIGINAL POKÉMON</div>
        <h1 className="title-logo text-[44px] leading-[1.1]">
          POKÉ
          <br />
          CATCH
        </h1>
        <PokeBallIcon className="spin-ball mt-5 h-14 w-14" />
        {best > 0 && (
          <div className="pixel mt-4 text-[9px] text-paper text-stroke">BEST {best.toLocaleString()}</div>
        )}
      </div>

      <div className="enter relative flex w-full max-w-[280px] flex-col gap-3">
        <button type="button" onClick={onPlay} className="btn btn-red glow-pulse min-h-[62px] text-[15px]">
          ▶ PLAY
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onDex} className="btn btn-blue">
            POKÉDEX
          </button>
          <button type="button" onClick={onScores} className="btn btn-yellow">
            SCORES
          </button>
        </div>
        <button type="button" onClick={onToggleMute} className="btn btn-sm self-center">
          SOUND: {muted ? 'OFF' : 'ON'}
        </button>
      </div>

      <div className="panel enter relative w-full max-w-[300px] px-4 py-3 text-center">
        <div className="pixel mb-2 text-[8px] text-red">HOW TO PLAY</div>
        <p className="text-[13px] font-extrabold leading-snug">
          Catch falling Pokémon with your Poké Ball.
          <br />
          <span className="text-ink/70">
            Keys ← → / A D · Drag on touch · P or Esc pauses
          </span>
        </p>
        <p className="mt-1.5 text-[12px] font-bold text-ink/65">
          Chain catches for combos and bigger multipliers. Miss 3 and it's over!
        </p>
        <p className="pixel mt-2.5 text-[8px] blink">PRESS ENTER OR SPACE</p>
      </div>
    </div>
  );
}

// ---------- Pause -----------------------------------------------------------

interface PauseMenuProps {
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onToggleMute: () => void;
}

export function PauseMenu({ muted, onResume, onRestart, onMenu, onToggleMute }: PauseMenuProps) {
  return (
    <div className="scrim fade-in absolute inset-0 z-30 flex items-center justify-center p-6">
      <div className="panel enter w-full max-w-[300px] overflow-hidden">
        <div className="panel-head pixel px-4 py-3 text-center text-[14px] leading-none">PAUSED</div>
        <div className="flex flex-col gap-3 p-5">
          <button type="button" onClick={onResume} className="btn btn-red min-h-[58px]">
            RESUME
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onRestart} className="btn btn-yellow">
              RESTART
            </button>
            <button type="button" onClick={onToggleMute} className="btn">
              SOUND {muted ? 'OFF' : 'ON'}
            </button>
          </div>
          <button type="button" onClick={onMenu} className="btn btn-sm self-center">
            MAIN MENU
          </button>
          <p className="text-center text-[13px] font-bold text-ink/65">P / Esc resume · R restart</p>
        </div>
      </div>
    </div>
  );
}

// ---------- Game over -------------------------------------------------------

interface GameOverProps {
  info: GameOverInfo;
  scores: ScoreEntry[];
  pendingName: string | null;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border-[3px] border-ink bg-white px-2 py-2 text-center">
      <div className="pixel text-[7px] leading-none text-ink/60">{label}</div>
      <div className="pixel mt-2 text-[13px] leading-none">{value}</div>
    </div>
  );
}

export function GameOverPanel({
  info,
  scores,
  pendingName,
  onNameChange,
  onSave,
  onRestart,
  onMenu,
}: GameOverProps) {
  const isNew = pendingName !== null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="scrim fade-in absolute inset-0 z-30 flex items-center justify-center p-5">
      <div className="panel enter flex max-h-[94%] w-full max-w-[330px] flex-col overflow-hidden">
        <div className="panel-head pixel px-4 py-3 text-center text-[15px] leading-none">GAME OVER</div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
          <div className="text-center">
            <div className="pixel text-[8px] text-ink/60">FINAL SCORE</div>
            <div className="pixel mt-2.5 text-[28px] leading-none text-red">
              <CountUp value={info.score} />
            </div>
            {isNew && <div className="pixel mt-3 text-[9px] text-blue blink">NEW HIGH SCORE!</div>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="CAUGHT" value={info.caught} />
            <Stat label="LEVEL" value={info.level} />
            <Stat label="COMBO" value={`×${info.bestCombo}`} />
          </div>

          {isNew ? (
            <form onSubmit={submit} className="flex flex-col gap-2">
              <label htmlFor="player-name" className="pixel text-[8px] text-ink/70">
                ENTER YOUR NAME
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  id="player-name"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={8}
                  value={pendingName ?? ''}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="AAA"
                  className="input-pixel min-w-0"
                />
                <button type="submit" className="btn btn-mint btn-sm shrink-0">
                  SAVE
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="pixel mb-2.5 text-[8px] text-ink/70">TOP SCORES</div>
              <HighScoreTable scores={scores.slice(0, 5)} compact />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button type="button" onClick={onRestart} className="btn btn-red glow-pulse min-h-[58px]">
              PLAY AGAIN
            </button>
            <p className="text-center text-[13px] font-bold text-ink/65">Press ENTER or R to restart instantly</p>
            <button type="button" onClick={onMenu} className="btn btn-sm self-center">
              MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
