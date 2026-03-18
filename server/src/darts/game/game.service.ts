
import { Injectable } from "@nestjs/common";
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import ConnectionsService from "src/ws/connections.service";
import { GameEntity } from "./game.entity";
import { User } from "src/users/user.entity";
import { Socket } from "socket.io";
import GameState, { CheckoutGameState, DefaultGameState, TargetGameState } from "./gamestate";
import { InjectRedis } from "@nestjs-modules/ioredis/dist/redis.decorators";
import Redis from "ioredis/built/Redis";

@Injectable()
export default class DartsGameService {

    public gameStates = new Map<string, GameState>();
    public joinedClients: Map<string, Array<Socket>> = new Map();

    constructor(
        private connectionsService: ConnectionsService,
        @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>,
        @InjectRedis() private readonly redis: Redis
    ) {}

    async setGameState(gameId: string, state: GameState) {
        this.gameStates.set(gameId, state);
        await this.redis.set(`gameState:${gameId}`, state.toRealJSON());
    }

    async getGameState(gameId: string): Promise<GameState | null> {
        return this.gameStates.get(gameId) || null;
    }

    async createTraining(user: User, mode: string) {
        const createdGame = new this.gameModel({ playerIds: [], mode, status: 'open', owner: user.id });
        let res = await createdGame.save();

        let gameState: GameState;
        switch (mode) {
            case 'target':
                gameState = new TargetGameState(res);
                break;
            case 'checkouts':
                gameState = new CheckoutGameState(res);
                break;
            default:
                gameState = new DefaultGameState(res);
                break;
        }
        await this.setGameState(res.gameId, gameState);

        return res;
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

    async syncGameState(socket: Socket, msg: { gameId: string }) {
        const { gameId } = msg;
        const gameState = await this.getGameState(gameId);

        if (!gameState) {
            return;
        }

        socket.emit('sync-game', gameState);
    }

    async userCanJoinGame(gameId: string, user: User | null): Promise<boolean> {
        if (!user) {
            return false;
        }
        return true; 
    }

    async broadcast(gameId: string, event: string, data: any) {
        for (const clients of this.joinedClients.get(gameId) || []) {
            clients.emit(event, data);
        }
    }
}