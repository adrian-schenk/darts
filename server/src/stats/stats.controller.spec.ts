import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StatsController } from './stats.controller';
import { GameEntity } from 'src/darts/game/entities/game.entity';
import { DartEventEntity } from 'src/darts/darts_event/dart_event.entity';

describe('StatsController', () => {
  let controller: StatsController;
  const dartEventModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    dartEventModel.find.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        {
          provide: getModelToken(GameEntity.name),
          useValue: {},
        },
        {
          provide: getModelToken(DartEventEntity.name),
          useValue: dartEventModel,
        },
      ],
    }).compile();

    controller = module.get<StatsController>(StatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should map dart hit events to heatmap points', async () => {
    dartEventModel.find.mockResolvedValue([
      { payload: { throw: { x: 12, y: 34 } } },
      { payload: { throw: { x: 56, y: 78 } } },
    ]);

    const result = await controller.getHeatmapData({
      user: { id: 'user-1' },
    });

    expect(dartEventModel.find).toHaveBeenCalledWith({
      type: 'dart_hit',
      user: 'user-1',
    });
    expect(result).toEqual([
      { x: 12, y: 34, value: 1 },
      { x: 56, y: 78, value: 1 },
    ]);
  });
});
