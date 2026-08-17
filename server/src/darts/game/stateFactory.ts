import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
import DartsGameService from './game.service';

@Injectable()
export default class PlayerStateFactory {

  /*
    PLayerStates can be created in multiple ways:
      1. From a local game with either regular config or custom config
      2. From a multiplayer game with regular config
  */

  constructor(
    @Inject(forwardRef(() => DartsGameService)) private dartsGameService: DartsGameService,
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

  async createMultiPlayerStateFromConfig(user: User, gameId: string, config: any, player: 0 | 1,): Promise<PlayerState> {
    let playerState: PlayerState = await this.createPlayerState(user, gameId);

    const playerConfig = config.gameConfig?.players?.[player];
    const startingScore =
      playerConfig?.startingScore ?? config.gameConfig?.startingScore ?? 501;
    const checkoutMode =
      playerConfig?.checkoutMode ?? config.gameConfig?.checkoutMode ?? 'double-out';
    const startMode =
      playerConfig?.startMode ?? config.gameConfig?.startMode ?? 'straight-in';

    playerState.playername = this.resolvePlayername(user, config, player);

    if (playerState instanceof DefaultPlayerState && !(playerState instanceof CheckoutPlayerState)) {
      (playerState as DefaultPlayerState).setInitialScore(startingScore);
      (playerState as DefaultPlayerState).checkoutMode = checkoutMode;
      (playerState as DefaultPlayerState).startMode = startMode;
    }

    playerState.setShowPlayerStat('showName', true);

    return playerState;
  }

  private resolvePlayername(user: User, config: any, player: 0 | 1): string {
    const explicitName = config.gameConfig?.players?.[player]?.name;
    if (explicitName) return explicitName;

    const opponentType = config.opponent?.type;
    if (opponentType === 'bot') {
      return player === 1 ? 'Bot' : user.username;
    }
    if (opponentType === 'local') {
      return `Player ${player + 1}`;
    }

    return user.username;
  }
}
