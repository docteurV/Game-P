import { TOTAL_POKEMON } from './pokemon';

const HS_KEY = 'pokecatch:highscores:v1';
const DEX_KEY = 'pokecatch:dex:v1';
export const MAX_SCORES = 10;

export interface ScoreEntry {
  name: string;
  score: number;
  caught: number;
  level: number;
  date: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

export function loadHighScores(): ScoreEntry[] {
  const list = read<ScoreEntry[]>(HS_KEY, []);
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.score === 'number')
    .sort((a, b) => b.score - a.score || a.date - b.date)
    .slice(0, MAX_SCORES);
}

export function qualifiesForHighScore(score: number, list: ScoreEntry[] = loadHighScores()): boolean {
  if (score <= 0) return false;
  if (list.length < MAX_SCORES) return true;
  return score > list[list.length - 1].score;
}

export function addHighScore(entry: ScoreEntry): ScoreEntry[] {
  const list = loadHighScores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score || a.date - b.date);
  const top = list.slice(0, MAX_SCORES);
  write(HS_KEY, top);
  return top;
}

export function loadDex(): number[] {
  const ids = read<number[]>(DEX_KEY, []);
  if (!Array.isArray(ids)) return [];
  return ids.filter((n) => Number.isInteger(n) && n >= 1 && n <= TOTAL_POKEMON);
}

export function saveDex(ids: number[]): void {
  write(DEX_KEY, ids);
}
