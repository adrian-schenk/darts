import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard)
@Controller('api/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('history')
  getHistory(@Req() req) {
    return this.statsService.getHistory(req.user.id);
  }

  @Get('overview')
  getOverview(@Req() req) {
    return this.statsService.getOverview(req.user.id);
  }

  @Get('aim-heatmap')
  getHeatmapData(@Req() req) {
    return this.statsService.getAimHeatmap(req.user.id);
  }
}
