import { Test, TestingModule } from '@nestjs/testing';
import { DartSocket } from './ws.gateway';

describe('ChatGateway', () => {
  let gateway: DartSocket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DartSocket],
    }).compile();

    gateway = module.get<DartSocket>(DartSocket);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
