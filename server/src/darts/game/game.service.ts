import { ConsoleLogger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import ConnectionsService from 'src/ws/connections.service';
import { GameEntity, GameEntitySchema } from './entities/game.entity';
import { User } from 'src/users/user.entity';
import { Socket } from 'socket.io';
import PlayerState, {
  CheckoutPlayerState,
  DefaultPlayerState,
  TargetPlayerState,
} from './playerState';
import { InjectRedis } from '@nestjs-modules/ioredis/dist/redis.decorators';
import Redis from 'ioredis/built/Redis';
import { log } from 'console';
import { GameState } from './gameState';
import GameStateFactory from './gameFactory';
import PlayerStateFactory from './stateFactory';
import { plainToClassFromExist, plainToInstance } from 'class-transformer';
import { UsersService } from 'src/users/users.service';

@Injectable()
export default class DartsGameService {
  public gameStates = new Map<string, GameState>();
  public joinedClients: Map<string, Array<Socket>> = new Map();
  public spectatingClients: Map<string, Array<Socket>> = new Map();

  constructor(
    private connectionsService: ConnectionsService,
    @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>,
    @InjectRedis() private readonly redis: Redis,
    private playerStateFactory: PlayerStateFactory,
    private gameStateFactory: GameStateFactory,
    private userService: UsersService,
  ) {}

  async setGameState(gameId: string, state: GameState) {
    this.gameStates.set(gameId, state);
    await this.redis.set(`gameState:${gameId}`, state.toRealJSON());
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    if (this.gameStates.has(gameId)) {
      return this.gameStates.get(gameId) || null;
    }

    const stateJson = await this.redis.get(`gameState:${gameId}`);
    if (!stateJson) {
      return null;
    }
    return plainToInstance(GameState, JSON.parse(stateJson || '{}'));
  }

  async createTraining(user: User, mode: string) {
    let res = await this.gameModel
      .findOne({
        owner: Number(user.id),
        mode: mode,
        createdAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      })
      .exec();
    if (!res) {
      const createdGame = new this.gameModel({
        playerIds: [],
        mode,
        status: 'open',
        owner: user.id,
      });
      res = await createdGame.save();
    }

    if (!(await this.getGameState(res.gameId))) {
      let gameState: GameState =
        await this.gameStateFactory.createGameStateFromMode(mode, res.gameId);
      gameState.joinable = false;

      await this.setGameState(res.gameId, gameState);
    }

    return res;
  }

  async createDartGame(
    players: string[] | { [key: string]: string[] },
    mode: string,
    status: string = 'open',
  ) {
    const playerIds = Array.isArray(players)
      ? players
      : Object.values(players).flat();
    const teams = !Array.isArray(players) ? players : undefined;
    const createdGame = new this.gameModel({ mode, status, owner: 2 });
    let res = await createdGame.save();

    if (!(await this.getGameState(res.gameId))) {
      let gameState: GameState =
        await this.gameStateFactory.createGameStateFromMode(mode, res.gameId);
      gameState.joinable = false;

      await this.setGameState(res.gameId, gameState);
    }

    return res;
  }

  async getDartGame(gameId: string): Promise<GameEntity | null> {
    return await this.gameModel.findOne({ gameId }).exec();
  }

  async userIsOwner(gameId: string, user: User): Promise<boolean> {
    const game = await this.getDartGame(gameId);
    return game?.owner == Number(user.id);
  }

  async joinDartGame(socket: Socket, msg: { gameId: string }) {
    const { gameId } = msg;

    if (!(await this.getDartGame(gameId))) {
      socket.emit('join-game', { success: false, message: 'Game not found' });
      return;
    }

    const gameState = await this.getGameState(gameId);
    socket.data.gameId = gameId;
    if (await this.userCanJoinGame(gameId, socket.data.user)) {
      // Add to joined clients
      if (!this.joinedClients.has(gameId)) {
        this.joinedClients.set(gameId, []);
      }

      this.joinedClients.get(gameId)?.push(socket);
      let PlayerUuid = gameState?.addPlayer(
        socket.data.user,
        await this.playerStateFactory.createPlayerState(
          socket.data.user,
          gameId,
        ),
      );

      socket.emit('join-game', { success: true, playerId: PlayerUuid });
    } else {
      // Add to spectating clients
      if (!this.spectatingClients.has(gameId)) {
        this.spectatingClients.set(gameId, []);
      }
      this.spectatingClients.get(gameId)?.push(socket);

      socket.emit('join-game', {
        success: false,
        spectating: true,
        message: 'Unable to join game',
      });
    }
    this.setGameState(gameId, gameState!);
    socket.emit('game-update', await this.getGameUpdateData(gameId));
    socket.emit('player-event', gameState);
  }

  async leaveDartGame(gameId: string, client: Socket) {
    const clients = this.joinedClients.get(gameId);
    if (clients) {
      this.joinedClients.set(
        gameId,
        clients.filter((c) => c !== client),
      );
    }
  }

  async deleteDartGame(gameId: string) {
    await this.gameModel.deleteOne({ gameId }).exec();
    this.gameStates.delete(gameId);
    this.joinedClients.delete(gameId);
  }

  async syncGameState(socket: Socket, msg: { gameId: string }) {
    const { gameId } = msg;
    const gameState = await this.getGameState(gameId);

    if (!gameState) {
      return;
    }

    socket.emit('player-event', gameState);
  }

  async getGameUpdateData(gameId: string) {
    return await this.getGameState(gameId).then(async (state) =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(state?.getGameUpdateData() ?? {}).map(
            async ([uuid, playerState]) => [
              uuid,
              {
                playerName:
                  playerState.playername ||
                  (await this.userService
                    .findById(playerState.userId)
                    .then((user) => user?.username)),
                showStats: playerState.showStats,
              },
            ],
          ),
        ),
      ),
    );
  }

  async userCanJoinGame(gameId: string, user: User | null): Promise<boolean> {
    if (!user) {
      return false;
    }

    let gameState = await this.getGameState(gameId);
    if (
      !gameState ||
      (!gameState.joinable && !(await this.userIsOwner(gameId, user)))
    ) {
      return false;
    }

    return true;
  }

  async broadcast(gameId: string, event: string, data: any) {
    console.log(this.joinedClients, this.spectatingClients);
    // Broadcast data to joined clients and spectators
    for (const clients of this.joinedClients.get(gameId) || []) {
      clients.emit(event, data);
    }
    for (const clients of this.spectatingClients.get(gameId) || []) {
      clients.emit(event, data);
    }
  }
}
