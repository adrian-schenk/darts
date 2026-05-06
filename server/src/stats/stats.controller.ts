import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { DartEventEntity } from 'src/darts/darts_event/dart_event.entity';
import { GameEntity } from 'src/darts/game/entities/game.entity';

@UseGuards(JwtAuthGuard)
@Controller('api/stats')
export class StatsController {

  constructor(@InjectModel(GameEntity.name) private readonly gameModel: Model<GameEntity>, @InjectModel(DartEventEntity.name) private readonly dartEventModel: Model<DartEventEntity> ) {}

  @Get('aim-heatmap')
  getHeatmapData(@Req() req) {
    let data = this.dartEventModel.find({ type: 'dart_hit', user: req.user.id }).then(events => {
      const heatmapData = events.map(event => {
        const { x, y } = event.payload.throw;
        return { x, y, value: 1 };
      });
      return heatmapData;
    });
    return data;
  }

}
