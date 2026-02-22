
import { Injectable } from "@nestjs/common";
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import ConnectionsService from "src/ws/connections.service";
import { GameEntity } from "./game.entity";


@Injectable()
export default class DartsGameService {

    constructor(
        private connectionsService: ConnectionsService,
        @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>
    ) {}

    async createDartGame(players: string[] | {[key: string]: string[]}, mode: string, status: string = 'open') {
        const playerIds = Array.isArray(players) ? players : Object.values(players).flat();
        const teams = !Array.isArray(players) ? players : undefined;
        const createdGame = new this.gameModel({ playerIds, teams, mode, status });
        return await createdGame.save();
    }

    async getDartGame(gameId: string) : Promise<GameEntity | null> {
        return await this.gameModel.findOne({ gameId }).exec();
    }

    joinDartGame() {

    }

    leaveDartGame() {
    
    }

}