import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "src/users/user.entity";
import { GameEntity } from "./game.entity";
import PlayerState, { CheckoutPlayerState, DefaultPlayerState, TargetPlayerState } from "./playerState";

@Injectable()
export default class PlayerStateFactory {

    constructor(
        @InjectModel(GameEntity.name) private gameModel: Model<GameEntity>
    ) {}

    async createPlayerState(user: User, gameId: string): Promise<PlayerState> {
        const game = await this.gameModel.findOne({ gameId }).exec();
        if (!game) throw new Error(`Game not found: ${gameId}`);

        switch (game.mode) {
            case 'target':
                return TargetPlayerState.create(user, game.gameId);
            case 'checkouts':
                return CheckoutPlayerState.create(user, game.gameId);
            default:
                return DefaultPlayerState.create(user, game.gameId);
        }
    }

}