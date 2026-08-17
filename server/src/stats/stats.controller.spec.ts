import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

describe('StatsController', () => {
  let controller: StatsController;
  const statsService = {
    getAimHeatmap: jest.fn<(userId: string) => Promise<any[]>>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        {
          provide: StatsService,
          useValue: statsService,
        },
      ],
    }).compile();

    controller = module.get<StatsController>(StatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should map dart hit events to heatmap points', async () => {
    statsService.getAimHeatmap.mockResolvedValue([
      { x: 12, y: 34, value: 1 },
      { x: 56, y: 78, value: 1 },
    ]);

    const result = await controller.getHeatmapData({ user: { id: 'user-1' } });

    expect(statsService.getAimHeatmap).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([
      { x: 12, y: 34, value: 1 },
      { x: 56, y: 78, value: 1 },
    ]);
  });
});
