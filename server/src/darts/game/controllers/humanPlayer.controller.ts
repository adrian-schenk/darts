import { GameState } from '../gameState';
import { PlayerState } from '../playerState';
import { PlannedThrow, PlayerController } from './playerController.interface';

export class HumanPlayerController implements PlayerController {
  readonly type = 'human' as const;

  constructor() {}

  planTurn(_gameState: GameState): Promise<void> {
    return Promise.resolve();
  }
}