import { GameResultService } from '../game-result/game-result.service';
import { GameState } from './gameState';

export interface GameResultContext {
  gameState: GameState;
  winnerPlayerUuid: string;
  isRanked: boolean;
}

export interface GameEndHandler {
  onGameFinished(context: GameResultContext): Promise<void>;
}

export class PersistentGameEndHandler implements GameEndHandler {
  constructor(private readonly gameResultService: GameResultService) {}

  async onGameFinished(context: GameResultContext): Promise<void> {
    await this.gameResultService.recordFinishedGame(context);
  }
}

export function createGameEndHandler(
  gameResultService: GameResultService,
): GameEndHandler {
  return new PersistentGameEndHandler(gameResultService);
}
