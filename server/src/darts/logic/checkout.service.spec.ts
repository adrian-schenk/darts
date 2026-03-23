import { DartsCheckoutLogicService } from './checkout.service';

describe('DartsCheckoutLogicService', () => {
  let service: DartsCheckoutLogicService = new DartsCheckoutLogicService();

  it('possible checkouts should not contain 163', () => {
    expect(service.possibleCheckouts[163]).toBeUndefined();
  });

  it('should return possible checkouts for 170 with 3 darts', () => {
    const checkouts = service.findCheckouts(170, 3);
    expect(checkouts.length).toBeGreaterThan(0);
    expect(checkouts[0].total).toBe(170);
  });

  it('should return no checkouts for impossible score', () => {
    const checkouts = service.findCheckouts(1, 3);
    expect(checkouts.length).toBe(0);
  });

  it('should require double out by default', () => {
    const checkouts = service.findCheckouts(40, 3);
    expect(checkouts.some((c) => c.darts[c.darts.length - 1].isDouble)).toBe(
      true,
    );
  });

  it('should allow single out if requireDoubleOut is false', () => {
    const checkouts = service.findCheckouts(40, 3, false);
    expect(checkouts.some((c) => !c.darts[c.darts.length - 1].isDouble)).toBe(
      true,
    );
  });

  it('should return checkouts for 60 with 2 darts', () => {
    const checkouts = service.findCheckouts(60, 2);
    expect(checkouts.length).toBeGreaterThan(0);
    expect(checkouts[0].total).toBe(60);
  });

  it('should return checkouts for 50 with 1 dart', () => {
    const checkouts = service.findCheckouts(50, 1);
    expect(checkouts.length).toBeGreaterThan(0);
    expect(checkouts[0].total).toBe(50);
  });

  it('should return empty array for negative score', () => {
    const checkouts = service.findCheckouts(-10, 3);
    expect(checkouts.length).toBe(0);
  });

  it('should return empty array for score above max possible', () => {
    const checkouts = service.findCheckouts(1000, 3);
    expect(checkouts.length).toBe(0);
  });
});
