import { useEffect, useRef, useState } from 'react';
import { PokeCatchEngine, type GameOverInfo, type HudState, type Phase } from '../game/engine';
import { initAudio, isMuted, setMuted, sfx } from '../game/audio';
import {
  addHighScore,
  loadDex,
  loadHighScores,
  qualifiesForHighScore,
  type ScoreEntry,
} from '../game/storage';
import { Hud } from './Hud';
import { GameOverPanel, PauseMenu, StartMenu } from './Menus';
import { Pokedex } from './Pokedex';
import { HighScoresModal } from './HighScores';

type ModalKind = null | 'dex' | 'scores';

const INITIAL_HUD: HudState = {
  phase: 'ready',
  score: 0,
  lives: 3,
  level: 1,
  caught: 0,
  combo: 0,
  multiplier: 1,
};

const blurActive = () => {
  const el = document.activeElement;
  if (el instanceof HTMLElement) el.blur();
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PokeCatchEngine | null>(null);
  const heldRef = useRef({ left: false, right: false });

  const [phase, setPhase] = useState<Phase>('ready');
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
  /** null = no high-score entry pending; string = name being typed for a qualifying score */
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [dex, setDex] = useState<number[]>(() => loadDex());
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadHighScores());
  const [muted, setMutedState] = useState<boolean>(() => isMuted());

  // Engine lifecycle — created once per mount, torn down on unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new PokeCatchEngine(canvas, {
      onHud: setHud,
      onPhase: (p) => {
        setPhase(p);
        if (p !== 'over') {
          setGameOver(null);
          setPendingName(null);
        }
      },
      onGameOver: (info) => {
        setGameOver(info);
        setPendingName(qualifiesForHighScore(info.score) ? '' : null);
      },
      onDexChange: setDex,
    });
    engineRef.current = engine;
    engine.mount();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const bestScore = scores[0]?.score ?? 0;

  // Saves a pending high score (called before any restart / navigation).
  const commitPending = () => {
    if (pendingName === null) return;
    const name = pendingName.trim().toUpperCase().slice(0, 8) || 'AAA';
    if (gameOver) {
      setScores(
        addHighScore({
          name,
          score: gameOver.score,
          caught: gameOver.caught,
          level: gameOver.level,
          date: Date.now(),
        }),
      );
    }
    setPendingName(null);
  };

  const startGame = () => {
    const e = engineRef.current;
    if (!e) return;
    blurActive();
    setModal(null);
    e.start();
  };

  const restartGame = () => {
    const e = engineRef.current;
    if (!e) return;
    blurActive();
    commitPending();
    e.restart();
  };

  const togglePause = () => {
    blurActive();
    engineRef.current?.togglePause();
  };

  const goToMenu = () => {
    commitPending();
    engineRef.current?.toMenu();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) {
      initAudio();
      sfx.click();
    }
  };

  // Keyboard: arrows / A-D move, Enter/Space start & restart, P/Esc pause, R restart, M mute.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const eng = engineRef.current;
      if (!eng) return;
      const code = e.code;

      if (code === 'ArrowLeft' || code === 'KeyA') {
        e.preventDefault();
        heldRef.current.left = true;
        eng.setInput(heldRef.current.left, heldRef.current.right);
        return;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        e.preventDefault();
        heldRef.current.right = true;
        eng.setInput(heldRef.current.left, heldRef.current.right);
        return;
      }

      if (modal) {
        if (code === 'Escape' || code === 'KeyB') {
          e.preventDefault();
          setModal(null);
        }
        return;
      }

      if (e.repeat) return;

      switch (code) {
        case 'Space':
        case 'Enter':
          e.preventDefault();
          if (phase === 'ready') startGame();
          else if (phase === 'over') restartGame();
          else if (phase === 'paused') togglePause();
          break;
        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          if (phase === 'playing' || phase === 'paused') togglePause();
          break;
        case 'KeyR':
          if (phase === 'playing' || phase === 'paused' || phase === 'over') {
            e.preventDefault();
            restartGame();
          }
          break;
        case 'KeyM':
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, modal, pendingName, gameOver, muted]);

  // Movement key release + focus loss.
  useEffect(() => {
    const release = (code: string) => {
      const eng = engineRef.current;
      if (!eng) return;
      if (code === 'ArrowLeft' || code === 'KeyA') heldRef.current.left = false;
      else if (code === 'ArrowRight' || code === 'KeyD') heldRef.current.right = false;
      else return;
      eng.setInput(heldRef.current.left, heldRef.current.right);
    };
    const onKeyUp = (e: KeyboardEvent) => release(e.code);
    const onBlur = () => {
      heldRef.current = { left: false, right: false };
      engineRef.current?.setInput(false, false);
    };
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return (
    <div className="stage" onContextMenu={(e) => e.preventDefault()}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Game playfield. Drag or use arrow keys to move the Poké Ball and catch falling Pokémon."
      />

      {(phase === 'countdown' || phase === 'playing' || phase === 'paused' || phase === 'over') && (
        <Hud hud={hud} phase={phase} onPause={togglePause} />
      )}

      {phase === 'ready' && (
        <StartMenu
          best={bestScore}
          muted={muted}
          onPlay={startGame}
          onDex={() => setModal('dex')}
          onScores={() => setModal('scores')}
          onToggleMute={toggleMute}
        />
      )}

      {phase === 'paused' && (
        <PauseMenu
          muted={muted}
          onResume={togglePause}
          onRestart={restartGame}
          onMenu={goToMenu}
          onToggleMute={toggleMute}
        />
      )}

      {phase === 'over' && gameOver && (
        <GameOverPanel
          info={gameOver}
          scores={scores}
          pendingName={pendingName}
          onNameChange={setPendingName}
          onSave={commitPending}
          onRestart={restartGame}
          onMenu={goToMenu}
        />
      )}

      {modal === 'dex' && <Pokedex caught={dex} onClose={() => setModal(null)} />}
      {modal === 'scores' && <HighScoresModal scores={scores} onClose={() => setModal(null)} />}
    </div>
  );
}
