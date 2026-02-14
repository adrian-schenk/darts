import { Test, TestingModule } from '@nestjs/testing';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { HttpException } from '@nestjs/common';

describe('ApiController', () => {
  let controller: ApiController;
  let service: ApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiController],
      providers: [ApiService],
    }).compile();

    controller = module.get<ApiController>(ApiController);
    service = module.get<ApiService>(ApiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCheckouts', () => {
    it('should return checkouts for valid score with default parameters', () => {
      const result = controller.getCheckouts(40);
      expect(result).toBeDefined();
      expect(result.score).toBe(40);
      expect(result.throwsLeft).toBe(3);
      expect(result.doubleOut).toBe(true);
      expect(result.checkouts).toBeDefined();
      expect(Array.isArray(result.checkouts)).toBe(true);
    });

    it('should use custom throwsLeft parameter', () => {
      const result = controller.getCheckouts(40, '2');
      expect(result.throwsLeft).toBe(2);
    });

    it('should use custom doubleOut parameter (false)', () => {
      const result = controller.getCheckouts(60, undefined, 'false');
      expect(result.doubleOut).toBe(false);
    });

    it('should use custom doubleOut parameter (true)', () => {
      const result = controller.getCheckouts(60, undefined, 'true');
      expect(result.doubleOut).toBe(true);
    });

    it('should throw exception for score greater than 180', () => {
      expect(() => controller.getCheckouts(181)).toThrow(HttpException);
    });

    it('should throw exception for negative score', () => {
      expect(() => controller.getCheckouts(-1)).toThrow(HttpException);
    });

    it('should throw exception for score 0', () => {
      expect(() => controller.getCheckouts(0)).toThrow(HttpException);
    });

    it('should throw exception for throwsLeft less than 1', () => {
      expect(() => controller.getCheckouts(40, '0')).toThrow(HttpException);
    });

    it('should throw exception for throwsLeft greater than 3', () => {
      expect(() => controller.getCheckouts(40, '4')).toThrow(HttpException);
    });
  });
});
