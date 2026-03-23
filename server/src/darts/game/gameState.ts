import { Exclude, Transform, Type, instanceToPlain } from "class-transformer";
import { GameEntity } from "./entities/game.entity";
import { PlayerState } from "./playerState";
import { User } from "src/users/user.entity";
import JsonSerializable from "src/util/JsonSerializable";

export class GameState extends JsonSerializable {
    
    @Exclude({ toPlainOnly: true })
    joinable: boolean = true;
    gameId: string;

    @Exclude({ toPlainOnly: true })
    @Transform(
        ({ value }) => Object.fromEntries((value as Map<string, string>).entries()),
        { toPlainOnly: true }
    )
    @Transform(
        ({ value }) => new Map<string, string>(Object.entries(value ?? {})),
        { toClassOnly: true }
    )
    users: Map<string, string> = new Map();

    @Type(() => PlayerState)
    @Transform(
        ({ value, options }) => Object.fromEntries(
            Array.from((value as Map<string, PlayerState>).entries()).map(([uuid, playerState]) => [uuid, instanceToPlain(playerState, { ignoreDecorators: options?.ignoreDecorators })])
        ),
        { toPlainOnly: true }
    )
    playerStates: Map<string, PlayerState> = new Map();
    
    @Exclude({ toPlainOnly: true })
    currentPlayer: string;

    constructor() {
        super();
    }

    static create(gameId: string) {
        let gameState = new GameState();
        gameState.gameId = gameId;
        return gameState;
    }

    onDartHit(user: User, throwInfo: any) : Boolean {
        if (this.currentPlayer && this.playerStates.get(this.currentPlayer)?.userId === user.id) {
            this.playerStates.get(this.currentPlayer)?.onDartHit(throwInfo);
            return true;
        }
        return false;
    }

    onDartRemove(user: User) : Boolean {
        if (this.currentPlayer && this.playerStates.get(this.currentPlayer)?.userId === user.id) {
            this.playerStates.get(this.currentPlayer)?.onDartRemove();
            return true;
        }
        return false;
    }

    setTurn() {

    }

    addPlayer(user: User, ps: PlayerState) {
        let playerUuid = "";

        if (!this.users.has(user.uuid)) {
            let playerState = this.playerStates.get(user.uuid);
            if (!playerState) {
                playerState = ps;
                playerUuid = playerState.uuid;
                this.playerStates.set(playerUuid, playerState);

                if (!this.currentPlayer) {
                    this.currentPlayer = playerState.uuid;
                }
            }
            this.users.set(user.uuid, String(user.id));
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

}