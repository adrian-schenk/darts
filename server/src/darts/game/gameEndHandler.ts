import { GameState } from './gameState';

export interface GameResultContext {
  gameState: GameState;
  winnerPlayerUuid: string;
  isRanked: boolean;
}

export interface GameEndHandler {
  onGameFinished(context: GameResultContext): Promise<void>;
}

export class NoopGameEndHandler implements GameEndHandler {
  async onGameFinished(_: GameResultContext): Promise<void> {}
}

export class RankedGameEndHandler implements GameEndHandler {
  async onGameFinished(_: GameResultContext): Promise<void> {
    // Intentionally left blank for now. Ranked ELO updates can be plugged in here.
  }
}

export function createGameEndHandler(mode: string): GameEndHandler {
  if (mode.endsWith('/ranked')) {
    return new RankedGameEndHandler();
  }
  return new NoopGameEndHandler();
}
