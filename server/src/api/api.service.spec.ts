import { Test, TestingModule } from '@nestjs/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiService],
    }).compile();

    service = module.get<ApiService>(ApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findCheckouts', () => {
    it('should find checkout for score 40 with double out (D20)', () => {
      const checkouts = service.findCheckouts(40, 1, true);
      expect(checkouts.length).toBeGreaterThan(0);
      const d20Checkout = checkouts.find(
        (c) => c.darts.length === 1 && c.darts[0].display === 'D20',
      );
      expect(d20Checkout).toBeDefined();
    });

    it('should find checkout for score 50 with double out (Bull)', () => {
      const checkouts = service.findCheckouts(50, 1, true);
      expect(checkouts.length).toBeGreaterThan(0);
      const bullCheckout = checkouts.find(
        (c) => c.darts.length === 1 && c.darts[0].display === 'D25',
      );
      expect(bullCheckout).toBeDefined();
    });

    it('should find multiple checkouts for score 100 with 2 throws and double out', () => {
      const checkouts = service.findCheckouts(100, 2, true);
      expect(checkouts.length).toBeGreaterThan(0);
      // T20, D20 is a common checkout for 100
      const t20d20 = checkouts.find(
        (c) =>
          c.darts.length === 2 &&
          c.darts[0].display === 'T20' &&
          c.darts[1].display === 'D20',
      );
      expect(t20d20).toBeDefined();
    });

    it('should return empty array for impossible checkouts', () => {
      // 163 is not possible with 3 darts
      const checkouts = service.findCheckouts(163, 3, true);
      expect(checkouts.length).toBe(0);
    });

    it('should work without double out requirement', () => {
      const checkouts = service.findCheckouts(60, 1, false);
      expect(checkouts.length).toBeGreaterThan(0);
      // Should include T20 (60 points, not a double)
      const t20 = checkouts.find(
        (c) => c.darts.length === 1 && c.darts[0].display === 'T20',
      );
      expect(t20).toBeDefined();
    });

    it('should respect throwsLeft parameter', () => {
      const checkouts1 = service.findCheckouts(100, 1, true);
      const checkouts2 = service.findCheckouts(100, 2, true);

      // With only 1 throw, 100 is not possible
      expect(checkouts1.length).toBe(0);

      // With 2 throws, 100 should be possible
      expect(checkouts2.length).toBeGreaterThan(0);
    });

    it('should return empty array for score 0', () => {
      const checkouts = service.findCheckouts(0, 3, true);
      expect(checkouts.length).toBe(0);
    });

    it('should return empty array for negative scores', () => {
      const checkouts = service.findCheckouts(-10, 3, true);
      expect(checkouts.length).toBe(0);
    });
  });
});
