import {
  Exclude,
  Transform,
  Type,
  instanceToPlain,
  plainToInstance,
} from 'class-transformer';
import type { PlayerController } from './controllers/playerController.interface';
import { GameEntity } from './entities/game.entity';
import {
  CheckoutPlayerState,
  DefaultPlayerState,
  PlayerActionState,
  PlayerState,
  playerStateTypeMap,
  TargetPlayerState,
} from './playerState';
import { User } from 'src/users/user.entity';
import JsonSerializable from 'src/util/JsonSerializable';
import { v4 as uuidv4 } from 'uuid';
import { BotPlayerController } from './controllers/botPlayer.controller';
import { HumanPlayerController } from './controllers/humanPlayer.controller';
import { DartsCheckoutLogicService } from '../logic/checkout.service';
import DartsGameService from './game.service';
import type { GameEndHandler } from './gameEndHandler';

const checkoutLogic: DartsCheckoutLogicService =
  new DartsCheckoutLogicService();

enum GameStateType {
  PLAYING = 'PLAYING',
  BULLING_OFF = 'BULLING_OFF',
  SCORECORRECTION = 'SCORECORRECTION',
  OPPONENT_LEFT = 'OPPONENT_LEFT',
  RESIGNED = 'RESIGNED',
  FINISHED = 'FINISHED',
}

export class GameState extends JsonSerializable {
  @Exclude({ toPlainOnly: true })
  joinable: boolean = true;
  gameId: string;

  @Exclude()
  isMultiplayer: boolean = false;

  @Exclude()
  isLocal: boolean = true;

  @Exclude({ toPlainOnly: true })
  @Transform(
    ({ value }) => Object.fromEntries((value as Map<string, string>).entries()),
    { toPlainOnly: true },
  )
  @Transform(
    ({ value }) => new Map<string, string>(Object.entries(value ?? {})),
    { toClassOnly: true },
  )
  users: Map<string, string> = new Map();

  @Transform(
    ({ value, options }) =>
      Object.fromEntries(
        Array.from((value as Map<string, PlayerState>).entries()).map(
          ([uuid, playerState]) => [
            uuid,
            {
              __type: playerState.constructor.name,
              ...instanceToPlain(playerState, {
                ignoreDecorators: options?.ignoreDecorators,
              }),
            },
          ],
        ),
      ),
    { toPlainOnly: true },
  )
  @Transform(
    ({ value }) => {
      const entries = Object.entries(value ?? {}).map(([uuid, plainValue]) => {
        const raw = plainValue as Record<string, any>;
        const stateType = raw?.__type;
        const PlayerStateCtor = playerStateTypeMap[stateType] ?? PlayerState;
        const { __type, ...payload } = raw ?? {};
        return [uuid, plainToInstance(PlayerStateCtor, payload)] as const;
      });

      return new Map<string, PlayerState>(entries);
    },
    { toClassOnly: true },
  )
  playerStates: Map<string, PlayerState> = new Map();

  @Transform(
    ({ value, options }) =>
      Object.fromEntries(
        Array.from((value as Map<string, PlayerController>).entries()).map(
          ([uuid, controller]) => [
            uuid,
            {
              ...instanceToPlain(controller, {
                ignoreDecorators: options?.ignoreDecorators,
              }),
            },
          ],
        ),
      ),
    { toPlainOnly: true },
  )
  @Transform(
    ({ value }) => {
      const entries = Object.entries(value).map(([uuid, plainValue]) => {
        switch ((plainValue as PlayerController).type) {
          case 'human':
            return [uuid, new HumanPlayerController()] as const;
          case 'bot':
            return [uuid, new BotPlayerController()] as const;
        }
      });

      return new Map<string, PlayerController>(entries);
    },
    { toClassOnly: true },
  )
  @Exclude({ toPlainOnly: true })
  controllers: Map<string, PlayerController> = new Map();

  currentPlayer: string = '';

  state: GameStateType;

  winnerPlayerUuid: string | null = null;

  @Exclude({ toPlainOnly: true })
  roundUuid: string;

  @Exclude({ toPlainOnly: true })
  config: any = {};

  @Exclude({ toPlainOnly: true })
  @Transform(() => { })
  providers: any = {};

  constructor() {
    super();
    this.roundUuid = uuidv4();
    this.state = GameStateType.BULLING_OFF;
  }

  static create(gameId: string) {
    let gameState = new GameState();
    gameState.gameId = gameId;
    gameState.state = GameStateType.BULLING_OFF;
    return gameState;
  }

  startBullingOff() {
    if (this.playerStates.size <= 1) {
      this.state = GameStateType.PLAYING;
      const [firstUuid] = this.playerStates.keys();
      if (firstUuid) this.setTurn(firstUuid);
      return;
    }

    const playerUuids = Array.from(this.playerStates.keys());
    const firstUuid = playerUuids[Math.floor(Math.random() * playerUuids.length)]!;
    this.setBullingOffTurn(firstUuid);
  }

  private setBullingOffTurn(playerUuid: string) {
    this.switchTurn();
  }

  private async handleBullingOffEvent(event: string, user: User, payload: any) {
    const currentPlayerState = this.playerStates.get(this.currentPlayer);
    if (!currentPlayerState) return;

    if (event === 'dart_hit') {
      if (currentPlayerState.bullingOffThrow !== null) return;

      const throwInfo = payload.throw;
      currentPlayerState.bullingOffThrow = {
        field: throwInfo.field,
        x: throwInfo.x,
        y: throwInfo.y,
      };
      currentPlayerState.state = PlayerActionState.REMOVE_DARTS;

    } else if (event === 'dart_remove') {
      const allUuids = Array.from(this.playerStates.keys());
      const nextUuid = allUuids.find(
        (uuid) => uuid !== this.currentPlayer && this.playerStates.get(uuid)?.bullingOffThrow === null,
      );

      if (nextUuid) {
        this.setBullingOffTurn(nextUuid);
      } else {
        this.evaluateBullingOff();
      }
    }

    this.providers.dartEventModel.create({
      gameId: this.gameId,
      playerUuid: payload.playerUuid ?? 'bot',
      user: user.id,
      type: event,
      payload: { ...payload, bullingOff: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    });


    payload.playerUuid = this.currentPlayer;
    await this.providers.gameService.setGameState(this.gameId, this);
    this.providers.gameService.broadcast(this.gameId, 'game-event', this.state);
    this.providers.gameService.broadcast(this.gameId, 'dart-event', payload);
    this.providers.gameService.broadcast(this.gameId, 'player-event', this.currentPlayer, this.getPlayerStatesJSON());
  }

  private evaluateBullingOff() {

    if (this.state !== GameStateType.BULLING_OFF) {
      return;
    }

    const distances = new Map<string, number>();
    for (const [uuid, ps] of this.playerStates) {
      if (ps.bullingOffThrow) {
        const { x, y } = ps.bullingOffThrow;
        distances.set(uuid, Math.sqrt(x * x + y * y));
      }
    }

    const minDist = Math.min(...distances.values());
    const winners = Array.from(distances.entries())
      .filter(([, dist]) => Math.abs(dist - minDist) < 0.5)
      .map(([uuid]) => uuid);

    for (const [, ps] of this.playerStates) {
      ps.bullingOffThrow = null;
      ps.state = PlayerActionState.IDLE;
    }

    if (winners.length > 1) {
      const firstUuid = winners[Math.floor(Math.random() * winners.length)]!;
      this.setBullingOffTurn(firstUuid);
    } else {
      const winnerUuid = winners[0]!;
      this.state = GameStateType.PLAYING;
      this.setTurn(winnerUuid);
    }
  }

  async trigger(event: string, user: User, payload: any) {
    if (this.state === GameStateType.FINISHED) {
      return;
    }

    if (!this.isCurrentPlayer(user)) {
      return;
    }

    if (this.state === GameStateType.BULLING_OFF) {
      await this.handleBullingOffEvent(event, user, payload);
      return;
    }

    switch (event) {
      case 'dart_hit':
        this.onDartHit(user, payload.throw);
        break;
      case 'dart_remove':
        await this.onDartRemove(user);
        break;
      default:
        console.warn('Unknown dart event type:', payload.type);
        break;
    }
    payload.playerUuid = this.currentPlayer;

    this.providers.dartEventModel.create({
      gameId: this.gameId,
      playerUuid: payload.playerUuid,
      user: user.id,
      type: event,
      payload: payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update game state in memory and Redis
    await this.providers.gameService.setGameState(this.gameId, this);


    this.providers.gameService.broadcast(this.gameId, 'game-event', this.state);
    this.providers.gameService.broadcast(this.gameId, 'dart-event', payload);
    this.providers.gameService.broadcast(this.gameId, 'player-event', this.currentPlayer, this.getPlayerStatesJSON());
  }

  async onDartHit(user: User, throwInfo: any): Promise<Boolean> {
    if (
      this.currentPlayer &&
      this.playerStates.get(this.currentPlayer)?.userId === user.id &&
      this.playerStates.get(this.currentPlayer)?.state === PlayerActionState.THROW_DARTS
    ) {
      this.playerStates
        .get(this.currentPlayer)
        ?.onDartHit(this.roundUuid, throwInfo);

      if (this.playerStates.get(this.currentPlayer)?.hasRoundEnded(this)) {
        const winnerUuid = this.currentPlayer;
        this.playerStates.get(winnerUuid)?.stats.winLeg(this.getLegsPerSet());
        this.onPreRoundEnd();
        this.playerStates.forEach((ps, uuid) => {
          ps.onRoundEnd(this);
        });
        this.nextRound();

        if (await this.tryFinishGame(winnerUuid)) {
          return true;
        }
      }

    }
    return false;
  }

  async onDartRemove(user: User): Promise<Boolean> {
    if (
      this.currentPlayer &&
      this.playerStates.get(this.currentPlayer)?.userId === user.id
    ) {
      this.playerStates.get(this.currentPlayer)?.onDartRemove();

      this.switchTurn();

      return true;
    }
    return false;
  }

  async onTimeGone() {

    if (this.state === GameStateType.FINISHED) {
      return;
    }

    this.playerStates.get(this.currentPlayer)?.onDartRemove();

    if (this.playerStates.get(this.currentPlayer)?.hasRoundEnded(this)) {
      const winnerUuid = this.currentPlayer;
      this.playerStates.get(winnerUuid)?.stats.winLeg(this.getLegsPerSet());
      this.onPreRoundEnd();
      this.playerStates.forEach((ps, uuid) => {
        ps.onRoundEnd(this);
      });
      this.nextRound();
    }

    await this.providers.gameService.setGameState(this.gameId, this);

    this.trigger('dart_remove', { id: this.playerStates.get(this.currentPlayer)?.userId } as User, { type: 'dart_remove' });
  }

  protected onPreRoundEnd() { }
  public newRoundTarget(): any { }

  getCurrentPlayerId(): string | null {
    return this.currentPlayer || null;
  }

  getCurrentPlayer(): PlayerState | null {
    if (!this.currentPlayer) {
      return null;
    }
    return this.playerStates.get(this.currentPlayer) || null;
  }

  isCurrentPlayer(user: User): boolean {
    return (
      this.state !== GameStateType.FINISHED &&
      this.currentPlayer !== undefined &&
      this.playerStates.get(this.currentPlayer)?.userId === user.id
    );
  }

  switchTurn() {
    if (this.state === GameStateType.FINISHED) {
      return;
    }

    if (this.playerStates.size <= 1) {
      this.setTurn(this.currentPlayer);
    }

    const previousPlayer = this.currentPlayer;
    for (const uuid of this.playerStates.keys()) {
      if (uuid !== previousPlayer) {
        this.setTurn(uuid);
        break;
      }
    }
  }

  setTurn(playerUuid: string) {
    if (this.state === GameStateType.FINISHED) {
      return;
    }

    const previousPlayer = this.currentPlayer;
    if (previousPlayer && previousPlayer !== playerUuid) {
      this.playerStates.get(previousPlayer)!.state = PlayerActionState.IDLE;
    }

    this.currentPlayer = playerUuid;
    this.playerStates.get(this.currentPlayer)!.setTurn(this);

    if (this.controllers.has(this.currentPlayer)) {
      this.controllers.get(this.currentPlayer)?.planTurn(this);
    }
  }

  setRandomTurn() {
    const playerUuids = Array.from(this.playerStates.keys());
    const randomUuid =
      playerUuids[Math.floor(Math.random() * playerUuids.length)];
    this.setTurn(randomUuid);
  }

  setState(state: GameStateType) {
    this.state = state;
  }

  nextRound() {
    this.roundUuid = uuidv4();
  }

  addPlayer(user: User, ps: PlayerState, controller: PlayerController): string {
    let playerUuid = '';

    if (!this.playerStates.has(ps.uuid)) {
      let playerState = this.playerStates.get(ps.uuid);
      if (!playerState) {
        playerState = ps;
        playerUuid = playerState.uuid;
        this.playerStates.set(playerUuid, playerState);

        playerState.wonPlayerActionState = PlayerActionState.REMOVE_DARTS;
        playerState.onRoundEnd(this);

        //if (!this.currentPlayer) {
        //  this.setTurn(playerState.uuid);
        //}

        if (this.playerStates.size >= 2) {
          this.isMultiplayer = true;
          this.playerStates.forEach((ps) => {
            ps.wonPlayerActionState = PlayerActionState.REMOVE_DARTS_WON;
          });
        }
      }
      this.users.set(user.uuid, String(user.id));
      this.controllers.set(playerUuid, controller);
    } else {
      for (let [uuid, playerState] of this.playerStates.entries()) {
        if (playerState.userId == user.id) {
          playerUuid = uuid;
          break;
        }
      }
    }

    return playerUuid;
  }

  getPlayerUuid(user: User): string | null {
    for (let [uuid, playerState] of this.playerStates.entries()) {
      if (playerState.userId == user.id) {
        return uuid;
      }
    }
    return null;
  }

  getPlayerStates() {
    return this.playerStates;
  }

  getPlayerStatesJSON() {
    return Object.fromEntries(
      Array.from((this.playerStates as Map<string, PlayerState>).entries()).map(
        ([uuid, playerState]) => [
          uuid,
          {
            __type: playerState.constructor.name,
            ...instanceToPlain(playerState, {
            }),
          },
        ],
      ),
    );
  }

  getGameUpdateData() {
    return Object.fromEntries(
      Array.from(this.playerStates.entries()).map(([uuid, playerState]) => [
        uuid,
        {
          userId: playerState.userId,
          showStats: playerState.showStats,
          playername: playerState.playername,
        },
      ]),
    );
  }

  getCapabilities() {
    const capabilities: any = {};

    capabilities.showStats = Array.from(this.playerStates.values())[0]?.showStats;

    capabilities.showPlayerTime = !this.isLocal;

    capabilities.allowScoreCorrection = true;
    capabilities.finished = this.state === GameStateType.FINISHED;
    capabilities.winnerPlayerUuid = this.winnerPlayerUuid;

    return capabilities;
  }

  private getLegsPerSet(): number {
    return Number(this.config?.gameConfig?.legs ?? 3);
  }

  private getSetsNeededToWin(): number {
    return 4;
  }

  private hasPlayerWonGame(playerUuid: string): boolean {
    if (!this.isMultiplayer || this.playerStates.size <= 1) {
      return false;
    }

    const setsWon = Number(
      this.playerStates.get(playerUuid)?.stats?.stats?.sets?.value ?? 0,
    );

    return setsWon >= this.getSetsNeededToWin();
  }

  private async tryFinishGame(playerUuid: string): Promise<boolean> {
    if (this.state === GameStateType.FINISHED) {
      return true;
    }

    if (!this.hasPlayerWonGame(playerUuid)) {
      return false;
    }

    this.state = GameStateType.FINISHED;
    this.winnerPlayerUuid = playerUuid;
    this.joinable = false;

    const gameEndHandler = this.providers.gameEndHandler as
      | GameEndHandler
      | undefined;

    await gameEndHandler?.onGameFinished({
      gameState: this,
      winnerPlayerUuid: playerUuid,
      isRanked: Boolean(this.config?.isRanked),
    });

    return true;
  }
}

enum PracticeDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  AUTO = 'auto',
}

export class CheckoutGameState extends GameState {

  @Exclude({ toPlainOnly: true })
  checkoutScore: number;

  difficulty: PracticeDifficulty = PracticeDifficulty.AUTO;

  constructor() {
    super();
    this.checkoutScore = this.getRandomTarget();
  }

  static create(gameId: string) {
    let gameState = new CheckoutGameState();
    gameState.gameId = gameId;
    return gameState;
  }

  protected onPreRoundEnd(): void {
    this.checkoutScore = this.getRandomTarget();
  }

  public newRoundTarget(): any {
    return this.checkoutScore;
  }

  public getRandomTarget() {
    switch (this.difficulty) {
      case PracticeDifficulty.EASY:
        return Object.keys(checkoutLogic.possibleCheckouts)
          .map(Number)
          .filter((score) => score <= 60)[
          Math.floor(
            Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length,
          )
        ];
      case PracticeDifficulty.MEDIUM:
        return Object.keys(checkoutLogic.possibleCheckouts)
          .map(Number)
          .filter((score) => score <= 120)[
          Math.floor(
            Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length,
          )
        ];
      case PracticeDifficulty.HARD:
        return Object.keys(checkoutLogic.possibleCheckouts)
          .map(Number)
          .filter((score) => score <= 170)[
          Math.floor(
            Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length,
          )
        ];
      case PracticeDifficulty.AUTO:
        return Object.keys(checkoutLogic.possibleCheckouts).map(Number)[
          Math.floor(
            Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length,
          )
        ];
      default:
        return Object.keys(checkoutLogic.possibleCheckouts).map(Number)[
          Math.floor(
            Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length,
          )
        ];
    }
  }

}