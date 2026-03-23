import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from '@nestjs/mongoose';
import { GameEntity, GameEntitySchema } from './game/entities/game.entity';
import DartsService from "./darts.service";
import DartsGameService from "./game/game.service";
import DartsEventService from "./darts_event/dartsevent.service";
import { WsModule } from "src/ws/ws.module";
import MatchmakingService from "./matchmaking/mm.service";
import { DartsCheckoutLogicService } from "./logic/checkout.service";
import PlayerStateFactory from "./game/stateFactory";
import GameStateFactory from "./game/gameFactory";
import { DartEventEntity, DartEventEntitySchema } from "./darts_event/dart_event.entity";

@Module({
  imports: [
    forwardRef(() => WsModule),
    MongooseModule.forFeature([
      { name: GameEntity.name, schema: GameEntitySchema },
      { name: DartEventEntity.name, schema: DartEventEntitySchema },
    ])
  ],
  providers: [DartsService, DartsGameService, DartsEventService, MatchmakingService, DartsCheckoutLogicService, PlayerStateFactory, GameStateFactory],
  exports: [DartsService, DartsGameService, DartsEventService, MatchmakingService, DartsCheckoutLogicService, PlayerStateFactory, GameStateFactory]
})
export class DartsModule {}