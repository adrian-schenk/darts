import { Injectable } from "@nestjs/common";
import DartsGameService from "../game/game.service";
import { Socket } from "socket.io";
import { GameEntity } from "../game/game.entity";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose/dist/common/mongoose.decorators";

@Injectable()
export default class DartsEventService {
 
    constructor(private readonly gameService: DartsGameService, @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>) { }

    async handleDartsEvent(socket: Socket, msg: any) {

        if (!await this.canUserThrow(socket)) {
            return;
        }

        let gameState = this.gameService.gameStates.get(socket.data.gameId);
        if (!gameState) return;
        switch (msg.type) {
            case 'dart_hit':
                gameState.onDartHit(msg.throw);
                break;
            case 'dart_remove':
                gameState.onDartRemove();
                break;
            default:
                console.warn('Unknown dart event type:', msg.type);
                break;
        }

        this.gameService.broadcast(socket.data.gameId, 'sync-game', gameState);
        this.gameService.broadcast(socket.data.gameId, 'dart-event', msg);
    }

    async canUserThrow(socket: Socket): Promise<boolean> {
        const gameState = this.gameService.getGameState(socket.data.gameId);
        if (!gameState) return false;

        this.gameModel.findOne({ gameId: socket.data.gameId }).exec().then(game => {
            if (!game) return false;
            return game.owner == socket.data.userId;
        });
        return true;
    }

}