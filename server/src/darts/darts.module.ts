import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { GameEntity, GameEntitySchema } from './game/entities/game.entity';
import DartsService from './darts.service';
import DartsGameService from './game/game.service';
import DartsEventService from './darts_event/dartsevent.service';
import { WsModule } from 'src/ws/ws.module';
import MatchmakingService from './matchmaking/mm.service';
import { DartsCheckoutLogicService } from './logic/checkout.service';
import PlayerStateFactory from './game/stateFactory';
import GameStateFactory from './game/gameFactory';
import {
  DartEventEntity,
  DartEventEntitySchema,
} from './darts_event/dart_event.entity';
import { UsersModule } from 'src/users/users.module';
import { MatchmakingController } from './matchmaking/mm.controller';
import {
  TournamentEntity,
  TournamentEntitySchema,
} from './tournament/tournament.entity';
import TournamentService from './tournament/tournament.service';
import { GameResultService } from './game-result/game-result.service';

@Module({
  imports: [
    forwardRef(() => WsModule),
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([User]),
    MongooseModule.forFeature([
      { name: GameEntity.name, schema: GameEntitySchema },
      { name: DartEventEntity.name, schema: DartEventEntitySchema },
      { name: TournamentEntity.name, schema: TournamentEntitySchema },
    ]),
  ],
  providers: [
    DartsService,
    DartsGameService,
    DartsEventService,
    MatchmakingService,
    DartsCheckoutLogicService,
    PlayerStateFactory,
    GameStateFactory,
    TournamentService,
    GameResultService,
  ],
  exports: [
    DartsService,
    DartsGameService,
    DartsEventService,
    MatchmakingService,
    DartsCheckoutLogicService,
    PlayerStateFactory,
    GameStateFactory,
    TournamentService,
    GameResultService,
  ],
  controllers: [
    MatchmakingController
  ]
})
export class DartsModule {}
