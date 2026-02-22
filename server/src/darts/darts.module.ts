import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from '@nestjs/mongoose';
import { GameEntity, GameEntitySchema } from './game/game.entity';
import DartsService from "./darts.service";
import DartsGameService from "./game/game.service";
import DartsEventService from "./darts_event/dartsevent.service";
import { WsModule } from "src/ws/ws.module";

@Module({
  imports: [
    forwardRef(() => WsModule),
    MongooseModule.forFeature([
      { name: GameEntity.name, schema: GameEntitySchema }
    ])
  ],
  providers: [DartsService, DartsGameService, DartsEventService],
  exports: [DartsService, DartsGameService, DartsEventService, DartsEventService]
})
export class DartsModule {}