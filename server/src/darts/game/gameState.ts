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

const checkoutLogic: DartsCheckoutLogicService =
  new DartsCheckoutLogicService();

enum GameStateType {
  PLAYING = 'PLAYING',
  BULLING_OFF = 'BULLING_OFF',
}

export class GameState extends JsonSerializable {
  @Exclude({ toPlainOnly: true })
  joinable: boolean = true;
  gameId: string;

  @Exclude()
  isMultiplayer: boolean = false;

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

  @Exclude({ toPlainOnly: true })
  currentPlayer: string;

  @Exclude({ toPlainOnly: true })
  state: GameStateType;

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
  }

  static create(gameId: string) {
    let gameState = new GameState();
    gameState.gameId = gameId;
    return gameState;
  }

  async trigger(event: string, user: User, payload: any) {
    switch (event) {
      case 'dart_hit':
        this.onDartHit(user, payload.throw);
        break;
      case 'dart_remove':
        this.onDartRemove(user);
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

    this.providers.gameService.broadcast(this.gameId, 'player-event', this);
    this.providers.gameService.broadcast(this.gameId, 'dart-event', payload);
  }

  onDartHit(user: User, throwInfo: any): Boolean {
    if (
      this.currentPlayer &&
      this.playerStates.get(this.currentPlayer)?.userId === user.id &&
      this.playerStates.get(this.currentPlayer)?.state === PlayerActionState.THROW_DARTS
    ) {
      this.playerStates
        .get(this.currentPlayer)
        ?.onDartHit(this.roundUuid, throwInfo);
    }
    return false;
  }

  onDartRemove(user: User): Boolean {
    if (
      this.currentPlayer &&
      this.playerStates.get(this.currentPlayer)?.userId === user.id
    ) {
      this.playerStates.get(this.currentPlayer)?.onDartRemove();

      if (this.playerStates.get(this.currentPlayer)?.hasRoundEnded(this)) {
        this.playerStates.get(this.currentPlayer)?.stats.winLeg(3);
        this.onPreRoundEnd();
        this.playerStates.forEach((ps, uuid) => {
          ps.onRoundEnd(this);
        });
        this.nextRound();
      }

      this.switchTurn();

      return true;
    }
    return false;
  }

  protected onPreRoundEnd() {}
  public newRoundTarget(): any {}

  switchTurn() {
    const previousPlayer = this.currentPlayer;
    for (const uuid of this.playerStates.keys()) {
      if (uuid !== previousPlayer) {
        this.setTurn(uuid);
        break;
      }
    }
  }

  setTurn(playerUuid: string) {
    const previousPlayer = this.currentPlayer;
    if (previousPlayer && previousPlayer !== playerUuid) {
      this.playerStates.get(previousPlayer)!.state = PlayerActionState.IDLE;
    }

    this.currentPlayer = playerUuid;
    this.playerStates.get(this.currentPlayer)!.setTurn();

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
      let playerState = this.playerStates.get(user.uuid);
      if (!playerState) {
        playerState = ps;
        playerUuid = playerState.uuid;
        this.playerStates.set(playerUuid, playerState);

        playerState.wonPlayerActionState = PlayerActionState.REMOVE_DARTS;
        playerState.onRoundEnd(this);

        if (!this.currentPlayer) {
          this.setTurn(playerState.uuid);
        }

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

  getPlayerStates() {
    return this.playerStates;
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