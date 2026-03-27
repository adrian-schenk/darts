import { User } from 'src/users/user.entity';
import { GameState } from '../gameState';
import { PlayerState } from '../playerState';

export type PlayerControllerType = 'human' | 'bot';

export const BotUser: User = {
  id: 0,
  email: '',
  password: '',
  username: '',
  uuid: 'bot'
}

export interface PlannedThrow {
  field: string;
  delayMs?: number;
}

export interface PlayerController {
  readonly type: PlayerControllerType;

  planTurn(gameState: GameState): Promise<void>;
}