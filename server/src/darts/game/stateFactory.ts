import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/users/user.entity';
import { GameEntity } from './entities/game.entity';
import PlayerState, {
  AroundPlayerState,
  CheckoutPlayerState,
  DefaultPlayerState,
  TargetPlayerState,
} from './playerState';

@Injectable()
export default class PlayerStateFactory {
  constructor(
    @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>,
  ) {}

  async createPlayerState(user: User, gameId: string): Promise<PlayerState> {
    const game = await this.gameModel.findOne({ gameId }).exec();
    if (!game) throw new Error(`Game not found: ${gameId}`);

    let playerState: PlayerState;
    switch (game.mode) {
      case 'target':
        playerState = TargetPlayerState.create(user, game.gameId);
        break;
      case 'checkouts':
        playerState = CheckoutPlayerState.create(user, game.gameId);
        break;
      case 'around':
        playerState = AroundPlayerState.create(user, game.gameId);
        break;
      default:
        playerState = DefaultPlayerState.create(user, game.gameId);
        break;
    }

    return playerState;
  }

  async createPlayerStateFromConfig(user: User, gameId: string, config: any, player: 0 | 1,): Promise<PlayerState> {
    let playerState: PlayerState = await this.createPlayerState(user, gameId);

    playerState.playername = config.opponent == 'bot' ? 'Bot' : config.gameConfig?.players?.[player]?.name || `Player ${player + 1}`;
    
    (playerState as DefaultPlayerState).setInitialScore(config.gameConfig?.players?.[player]?.startingScore || 501);
    (playerState as DefaultPlayerState).checkoutMode = config.gameConfig?.players?.[player]?.checkoutMode || 'double-out';

    return playerState;
  }
}
