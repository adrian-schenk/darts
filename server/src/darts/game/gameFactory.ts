import { Model } from 'mongoose';
import { GameEntity } from './entities/game.entity';
import { GameState } from './gameState';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';

export default class GameStateFactory {
  constructor(
    @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>,
  ) {}

  async createGameStateFromMode(
    mode: string,
    gameId: string,
  ): Promise<GameState> {
    let gameState: GameState;
    const game = await this.gameModel.findOne({ gameId: gameId }).exec();
    switch (game?.mode) {
      case 'target':
        gameState = GameState.create(gameId);
        break;
      case 'checkouts':
        gameState = GameState.create(gameId);
        break;
      default:
        gameState = GameState.create(gameId);
        break;
    }

    return gameState;
  }
}
