import { InjectRedis } from '@nestjs-modules/ioredis';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import Redis from 'ioredis/built/Redis';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import ConnectionsService from 'src/ws/connections.service';
import { HumanPlayerController } from './controllers/humanPlayer.controller';
import { GameEntity } from './entities/game.entity';
import GameStateFactory from './gameFactory';
import { GameState } from './gameState';
import PlayerStateFactory from './stateFactory';
import { BotPlayerController } from './controllers/botPlayer.controller';

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
    @Inject(forwardRef(() => GameStateFactory)) private gameStateFactory: GameStateFactory,
    private userService: UsersService,
  ) { }

  async setGameState(gameId: string, state: GameState) {
    this.gameStates.set(gameId, state);
    if (!state) return;
    await this.redis.set(`gameState:${gameId}`, state.toRealJSON(), 'EX', 600);
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

    return res;
  }

  async createDartGame(
    players: string[] | { [key: string]: string[] },
    mode: string,
    status: string = 'open',
  ) {

    const createdGame = new this.gameModel();
    let res = await createdGame.save();

    return res;
  }

  async createMultiPlayerGame(
    users: [User, string][],
    config: any
  ) {
    const createdGame = new this.gameModel({
      playerIds: users.map((u) => u[0].id),
      mode: config.mode,
      status: 'open',
    });
    let res = await createdGame.save();

    let gameState: GameState =
      await this.gameStateFactory.createGameStateFromMode(config.mode, res.gameId);

    for (const [user, controllerType] of users) {
      gameState.addPlayer(user, await this.playerStateFactory.createPlayerState(user, res.gameId), controllerType != 'bot' ? new HumanPlayerController() : new BotPlayerController());
    }

    gameState.setRandomTurn();

    await this.setGameState(res.gameId, gameState);

    return { success: true, gameId: res.gameId };
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

      socket.emit('join-game', { success: true });
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
    // Broadcast data to joined clients and spectators
    for (const clients of this.joinedClients.get(gameId) || []) {
      clients.emit(event, data);
    }
    for (const clients of this.spectatingClients.get(gameId) || []) {
      clients.emit(event, data);
    }
  }
}
