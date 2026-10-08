import type { ScoreEntry } from '../game/storage';
import { MAX_SCORES } from '../game/storage';
import { Modal } from './Modal';

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

interface TableProps {
  scores: ScoreEntry[];
  compact?: boolean;
}

export function HighScoreTable({ scores, compact = false }: TableProps) {
  if (scores.length === 0) {
    return (
      <p className="py-4 text-center text-[14px] font-bold text-ink/60">
        No scores yet. Go catch something!
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-1.5">
      {scores.map((s, i) => {
        const rowBg = i === 0 ? 'bg-yellow' : i % 2 === 0 ? 'bg-white' : 'bg-[#f1ead2]';
        return (
          <li
            key={`${s.date}-${i}`}
            className={`flex items-center gap-2.5 rounded-xl border-[3px] border-ink px-2.5 ${compact ? 'py-1.5' : 'py-2'} ${rowBg}`}
          >
            <span className="pixel w-6 shrink-0 text-[10px]">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="pixel truncate text-[10px]">{s.name}</span>
                <span className="pixel shrink-0 text-[11px] text-red">{s.score.toLocaleString()}</span>
              </div>
              {!compact && (
                <div className="mt-1 text-[12px] font-bold text-ink/60">
                  {s.caught} caught · LV {s.level} · {formatDate(s.date)}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface ModalProps {
  scores: ScoreEntry[];
  onClose: () => void;
}

export function HighScoresModal({ scores, onClose }: ModalProps) {
  return (
    <Modal
      title="HIGH SCORES"
      onClose={onClose}
      footer={
        <p className="text-center text-[12px] font-bold text-ink/60">
          Top {MAX_SCORES} scores are saved on this device.
        </p>
      }
    >
      <HighScoreTable scores={scores} />
    </Modal>
  );
}
