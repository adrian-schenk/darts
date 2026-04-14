import { Model } from 'mongoose';
import { GameEntity } from './entities/game.entity';
import { CheckoutGameState, GameState } from './gameState';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { DartEventEntity } from '../darts_event/dart_event.entity';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import DartsGameService from './game.service';

@Injectable()
export default class GameStateFactory {
  constructor(
    @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>,
    @InjectModel(DartEventEntity.name) private dartEventModel: Model<DartEventEntity>,
    @Inject(forwardRef(() => DartsGameService)) private dartsGameService: DartsGameService,
  ) {}

  async createGameStateFromMode(
    mode: string,
    gameId: string,
  ): Promise<GameState> {
    let gameState: GameState;
    const game = await this.gameModel.findOne({ gameId: gameId }).exec();
    switch (game?.mode) {
      case 'checkouts':
        gameState = CheckoutGameState.create(gameId);
        break;
      default:
        gameState = GameState.create(gameId);
        break;
    }

    gameState.providers = {
      dartEventModel: this.dartEventModel,
      gameService: this.dartsGameService
    }
    return gameState;
  }
}
