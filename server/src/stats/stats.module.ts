import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { DartEventEntity, DartEventEntitySchema } from 'src/darts/darts_event/dart_event.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { GameEntity, GameEntitySchema } from 'src/darts/game/entities/game.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameEntity.name, schema: GameEntitySchema },
      { name: DartEventEntity.name, schema: DartEventEntitySchema },
    ]),
    UsersModule,
  ],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}
