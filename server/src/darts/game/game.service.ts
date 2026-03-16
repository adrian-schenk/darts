
import { Injectable } from "@nestjs/common";
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import ConnectionsService from "src/ws/connections.service";
import { GameEntity } from "./game.entity";
import { User } from "src/users/user.entity";
import { Socket } from "socket.io";


@Injectable()
export default class DartsGameService {

    public joinedClients: Map<string, Array<Socket>> = new Map();

    constructor(
        private connectionsService: ConnectionsService,
        @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>
    ) {}

    async createTraining(user: User, mode: string) {
        const createdGame = new this.gameModel({ playerIds: [], mode, status: 'open', owner: user.id });
        return await createdGame.save();
    }

    async createDartGame(players: string[] | {[key: string]: string[]}, mode: string, status: string = 'open') {
        const playerIds = Array.isArray(players) ? players : Object.values(players).flat();
        const teams = !Array.isArray(players) ? players : undefined;
        const createdGame = new this.gameModel({ playerIds, teams, mode, status });
        return await createdGame.save();
    }

    async getDartGame(gameId: string) : Promise<GameEntity | null> {
        return await this.gameModel.findOne({ gameId }).exec();
    }

    async joinDartGame(socket: Socket, msg: { gameId: string }) {
        const { gameId } = msg;

        if (!this.joinedClients.has(gameId)) {
            this.joinedClients.set(gameId, []);
        }
        if (await this.userCanJoinGame(gameId, await this.connectionsService.getUserBySocketId(socket.id))) {
            this.joinedClients.get(gameId)?.push(socket);
        }
        socket.data.gameId = gameId;
    }

    async leaveDartGame(gameId: string, client: Socket) {
        const clients = this.joinedClients.get(gameId);
        if (clients) {
            this.joinedClients.set(gameId, clients.filter(c => c !== client));
        }
    }

    async userCanJoinGame(gameId: string, user: User | null): Promise<boolean> {
        if (!user) {
            return false;
        }
        return true; 
    }
}