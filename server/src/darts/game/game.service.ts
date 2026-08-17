import { InjectRedis } from '@nestjs-modules/ioredis';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { instanceToPlain, plainToInstance } from 'class-transformer';
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
import { createGameEndHandler } from './gameEndHandler';
import TournamentService from '../tournament/tournament.service';
import PlayerState from './playerState';
import { GameResultService } from '../game-result/game-result.service';

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
    @Inject(forwardRef(() => TournamentService))
    private tournamentService: TournamentService,
    private readonly gameResultService: GameResultService,
  ) { }

  async setGameState(gameId: string, state: GameState) {
    this.gameStates.set(gameId, state);
    if (!state) return;
    await this.redis.set(`gameState:${gameId}`, state.toRealJSON(), 'EX', 600);
  }

  async resolveGameEndHandler(gameId: string) {
    const game = await this.gameModel.findOne({ gameId }).exec();

    if (game?.tournamentUuid) {
      return {
        onGameFinished: async ({ gameState, winnerPlayerUuid }: { gameState: GameState; winnerPlayerUuid: string }) => {
          const winnerUserId =
            gameState.playerStates.get(winnerPlayerUuid)?.userId ?? null;
          await this.gameResultService.recordFinishedGame({ gameState, winnerPlayerUuid, isRanked: false });
          await this.tournamentService.onTournamentGameFinishedByGameId(
            game.tournamentUuid!,
            gameId,
            winnerUserId,
          );
        },
      };
    }

    return createGameEndHandler(this.gameResultService);
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
        owner: String(user.id),
        mode: mode,
        isPrivate: true,
        createdAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      })
      .exec();
    if (!res) {
      const createdGame = new this.gameModel({
        playerIds: [user.id],
        mode,
        status: 'open',
        owner: String(user.id),
      });
      res = await createdGame.save();
    }

    return res;
  }

  async createDartGame(
    players: number[],
    mode: string,
    status: string = 'open',
  ) {
    const createdGame = new this.gameModel({
      mode,
      playerIds: players,
      status,
    });
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
    gameState.isLocal = false;
    gameState.config = {
      ...(gameState.config ?? {}),
      mode: config.mode,
      isRanked: String(config.mode).endsWith('/ranked'),
    };

    for (let i = 0; i < users.length; i++) {
      const [user, controllerType] = users[i];
      let playerState = await this.playerStateFactory.createMultiPlayerStateFromConfig(
        user,
        res.gameId,
        config,
        i as 0 | 1,
      );

      if (controllerType == 'bot') {
        playerState.playername = 'Bot';
      }

      gameState.addPlayer(
        user,
        playerState,
        controllerType != 'bot' ? new HumanPlayerController() : new BotPlayerController(),
      );
    }

    gameState.startBullingOff();

    await this.setGameState(res.gameId, gameState);

    return { success: true, gameId: res.gameId };
  }

  async getDartGame(gameId: string): Promise<GameEntity | null> {
    return await this.gameModel.findOne({ gameId }).exec();
  }

  async userIsOwner(gameId: string, user: User): Promise<boolean> {
    const game = await this.getDartGame(gameId);
    return game?.owner === String(user.id);
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

      let uuid: string | null | undefined = null;
      if (!gameState?.isLocal)
        uuid = gameState?.getPlayerUuid(socket.data.user);

      socket.emit('join-game', { success: true, playerId: uuid });
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
    socket.emit('game-joined', await this.getGameUpdateData(gameId, socket.data.user), await this.getGameCapabilities(gameId), gameState?.state);
    socket.emit('player-event', gameState?.currentPlayer, gameState?.getPlayerStatesJSON());
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

  async getGameUpdateData(gameId: string, user: User) {
    return await this.getGameState(gameId).then(async (state) =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(state?.getGameUpdateData() ?? {}).sort(([uuid, playerState]) => playerState.userId === user.id ? -1 : 1).map(
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

  async getGameCapabilities(gameId: string) {
    const gameState = await this.getGameState(gameId);
    return gameState?.getCapabilities() || {};
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

  async broadcast(gameId: string, event: string, ...data: any) {
    // Broadcast data to joined clients and spectators
    for (const clients of this.joinedClients.get(gameId) || []) {
      clients.emit(event, ...data);
    }
    for (const clients of this.spectatingClients.get(gameId) || []) {
      clients.emit(event, ...data);
    }
  }

  async broadcastToOthers(gameId: string, user: User, event: string, ...data: any) {
    // Broadcast data to joined clients and spectators except the user
    const excludedUserId = String(user.id);

    for (const client of this.joinedClients.get(gameId) || []) {
      if (client.data.userId == excludedUserId)
        continue;
      client.emit(event, ...data);
    }

    for (const client of this.spectatingClients.get(gameId) || []) {
      if (client.data.userId == excludedUserId)
        continue;
      client.emit(event, ...data);
    }
  }
}
