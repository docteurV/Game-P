import { memo } from 'react';
import { POKEMON, TIER_LABEL, TOTAL_POKEMON, TYPE_COLORS, dexNumber, spriteUrl } from '../game/pokemon';
import { Modal } from './Modal';

interface PokedexProps {
  caught: number[];
  onClose: () => void;
}

export const Pokedex = memo(function Pokedex({ caught, onClose }: PokedexProps) {
  const set = new Set(caught);
  const pct = Math.round((set.size / TOTAL_POKEMON) * 100);

  return (
    <Modal
      title="POKÉDEX"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="pixel shrink-0 text-[10px]">
            {set.size}/{TOTAL_POKEMON}
          </div>
          <div className="h-3.5 flex-1 overflow-hidden rounded-full border-[3px] border-ink bg-white">
            <div className="h-full bg-mint transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
          </div>
          <div className="pixel shrink-0 text-[9px] text-ink/60">{pct}%</div>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {POKEMON.map((p) => {
          const got = set.has(p.id);
          const color = TYPE_COLORS[p.types[0]];
          return (
            <div
              key={p.id}
              className="flex flex-col items-center rounded-xl border-[3px] border-ink px-1 pb-1.5 pt-1"
              style={{ background: got ? `${color}55` : '#e9e4d2' }}
            >
              <span className="pixel text-[7px] leading-none text-ink/60">{dexNumber(p.id)}</span>
              <img
                src={spriteUrl(p.id)}
                alt={got ? p.name : 'Unknown Pokémon'}
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="my-0.5 h-14 w-14 select-none"
                style={
                  got
                    ? { imageRendering: 'pixelated' }
                    : { imageRendering: 'pixelated', filter: 'brightness(0)', opacity: 0.4 }
                }
              />
              <span className="text-center text-[11px] font-extrabold leading-tight">
                {got ? p.name : '???'}
              </span>
              {got && p.tier !== 'common' && (
                <span className="mt-0.5 rounded-md border-2 border-ink bg-white px-1 text-[8px] font-black uppercase leading-tight">
                  {TIER_LABEL[p.tier]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
});
