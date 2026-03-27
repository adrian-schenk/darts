import { Injectable } from '@nestjs/common';
import DartsGameService from '../game/game.service';
import { Socket } from 'socket.io';
import { GameEntity } from '../game/entities/game.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { User } from 'src/users/user.entity';
import { DartEventEntity } from './dart_event.entity';

@Injectable()
export default class DartsEventService {
  constructor(
    private readonly gameService: DartsGameService,
    @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>,
    @InjectModel(DartEventEntity.name)
    private dartEventModel: Model<DartEventEntity>,
  ) {}

  async handleDartsEvent(socket: Socket, msg: any) {
    if (!(await this.canUserThrow(socket))) {
      return;
    }

    let gameState = await this.gameService.getGameState(socket.data.gameId);
    if (
      !gameState ||
      socket.data.user.id !=
        gameState.playerStates.get(gameState.currentPlayer)?.userId
    )
      return;

    gameState!.providers.dartEventModel = this.dartEventModel;
    gameState!.providers.gameService = this.gameService;
    await gameState.trigger(msg.type, socket.data.user, msg);
  }

  async canUserThrow(socket: Socket): Promise<boolean> {
    const gameState = this.gameService.getGameState(socket.data.gameId);
    if (!gameState) return false;

    this.gameModel
      .findOne({ gameId: socket.data.gameId })
      .exec()
      .then((game) => {
        if (!game) return false;
        return game.owner == socket.data.userId;
      });
    return true;
  }

  async getDartEvents(gameId: string) {
    return this.dartEventModel
      .find({ gameId })
      .sort({ createdAt: 'asc' })
      .exec();
  }
}
