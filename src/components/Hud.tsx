import type { HudState, Phase } from '../game/engine';

const MAX_HEARTS = 3;

interface HudProps {
  hud: HudState;
  phase: Phase;
  onPause: () => void;
}

function Heart({ alive, hit }: { alive: boolean; hit: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 transition-opacity duration-200 ${alive ? 'opacity-100' : 'opacity-35'} ${hit ? 'heart-hit' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={alive ? '#e8413b' : '#6b6f93'}
        stroke="#1b1d3a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Hud({ hud, phase, onPause }: HudProps) {
  const toNext = hud.caught % 10;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
      <div className="hud-chip min-w-[104px] px-3 py-2">
        <div className="pixel text-[8px] leading-none text-ink/60">SCORE</div>
        <div key={hud.score} className="pixel mt-2 text-[15px] leading-none animate-pop">
          {hud.score.toLocaleString()}
        </div>
      </div>

      <div className="hud-chip flex flex-col items-center px-3 py-2">
        <div className="pixel text-[9px] leading-none">LV {hud.level}</div>
        <div className="mt-2 h-2.5 w-20 overflow-hidden rounded-full border-2 border-ink bg-ink/15">
          <div
            className="h-full bg-yellow transition-[width] duration-300 ease-out"
            style={{ width: `${toNext * 10}%` }}
          />
        </div>
        <div className="pixel mt-1.5 text-[7px] leading-none text-ink/60">
          {toNext}/10 TO LV {hud.level + 1}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="hud-chip flex gap-1 px-2.5 py-2">
          {Array.from({ length: MAX_HEARTS }, (_, i) => (
            <Heart key={i} alive={i < hud.lives} hit={i === hud.lives && hud.lives < MAX_HEARTS} />
          ))}
        </div>
        {phase === 'playing' && (
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="btn btn-icon pointer-events-auto"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <rect x="3" y="2" width="3.4" height="12" rx="1" fill="#1b1d3a" />
              <rect x="9.6" y="2" width="3.4" height="12" rx="1" fill="#1b1d3a" />
            </svg>
          </button>
        )}
      </div>

      {hud.combo >= 2 && (
        <div
          key={hud.combo}
          className="hud-chip pixel animate-pop absolute left-1/2 top-[96px] -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-[11px] text-red"
        >
          COMBO {hud.combo} · ×{hud.multiplier}
        </div>
      )}
    </div>
  );
}
