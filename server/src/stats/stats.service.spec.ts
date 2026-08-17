import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StatsService } from './stats.service';
import { GameEntity } from 'src/darts/game/entities/game.entity';
import { DartEventEntity } from 'src/darts/darts_event/dart_event.entity';
import { UsersService } from 'src/users/users.service';

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: getModelToken(GameEntity.name),
          useValue: {},
        },
        {
          provide: getModelToken(DartEventEntity.name),
          useValue: {},
        },
        {
          provide: UsersService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
