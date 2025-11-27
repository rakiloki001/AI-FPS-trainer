export interface GameStats {
  score: number;
  hits: number;
  misses: number;
  accuracy: number;
  avgReactionTime: number; // in ms
  bestStreak: number;
}

export interface Target {
  id: number;
  x: number;
  y: number;
  radius: number;
  spawnTime: number;
  lifeTime: number; // how long it stays on screen
  isHit: boolean;
}

export type GameState = 'menu' | 'loading' | 'playing' | 'summary';

export interface HandCursor {
  x: number;
  y: number;
  isPinching: boolean;
}
