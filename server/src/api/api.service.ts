import { Injectable } from '@nestjs/common';

export interface DartScore {
  value: number;
  multiplier: 1 | 2 | 3;
  display: string;
  isDouble: boolean;
}

export interface Checkout {
  darts: DartScore[];
  total: number;
}

@Injectable()
export class ApiService {
  private readonly validScores: DartScore[] = [];

  constructor() {
    this.initializeValidScores();
  }

  private initializeValidScores(): void {
    // Single bull (25)
    this.validScores.push({
      value: 25,
      multiplier: 1,
      display: 'S25',
      isDouble: false,
    });

    // Double bull (50)
    this.validScores.push({
      value: 25,
      multiplier: 2,
      display: 'D25',
      isDouble: true,
    });

    // Regular numbers 1-20
    for (let i = 1; i <= 20; i++) {
      // Single
      this.validScores.push({
        value: i,
        multiplier: 1,
        display: `S${i}`,
        isDouble: false,
      });

      // Double
      this.validScores.push({
        value: i,
        multiplier: 2,
        display: `D${i}`,
        isDouble: true,
      });

      // Triple
      this.validScores.push({
        value: i,
        multiplier: 3,
        display: `T${i}`,
        isDouble: false,
      });
    }

    // Add miss (0)
    this.validScores.push({
      value: 0,
      multiplier: 1,
      display: 'Miss',
      isDouble: false,
    });

    // Sort by total score descending for optimization
    this.validScores.sort(
      (a, b) => b.value * b.multiplier - a.value * a.multiplier,
    );
  }

  public findCheckouts(
    score: number,
    throwsLeft: number = 3,
    requireDoubleOut: boolean = true,
  ): Checkout[] {
    const checkouts: Checkout[] = [];

    if (score <= 0 || score > 180 * throwsLeft) {
      return checkouts;
    }

    this.findCheckoutsRecursive(
      score,
      throwsLeft,
      requireDoubleOut,
      [],
      checkouts,
    );

    return checkouts;
  }

  private findCheckoutsRecursive(
    remainingScore: number,
    throwsLeft: number,
    requireDoubleOut: boolean,
    currentDarts: DartScore[],
    results: Checkout[],
  ): void {
    // Base case: no throws left
    if (throwsLeft === 0) {
      if (remainingScore === 0) {
        results.push({
          darts: [...currentDarts],
          total: currentDarts.reduce(
            (sum, dart) => sum + dart.value * dart.multiplier,
            0,
          ),
        });
      }
      return;
    }

    // Base case: exact finish
    if (remainingScore === 0) {
      results.push({
        darts: [...currentDarts],
        total: currentDarts.reduce(
          (sum, dart) => sum + dart.value * dart.multiplier,
          0,
        ),
      });
      return;
    }

    // Try each possible dart score
    for (const dart of this.validScores) {
      const dartTotal = dart.value * dart.multiplier;

      // Skip if this dart would bust (go below 0)
      if (dartTotal > remainingScore) {
        continue;
      }

      // Last dart logic
      if (throwsLeft === 1 || dartTotal === remainingScore) {
        // If we need double out and this finishes the score
        if (dartTotal === remainingScore) {
          if (requireDoubleOut && !dart.isDouble) {
            continue; // Must finish on a double
          }
          // Valid finish
          this.findCheckoutsRecursive(
            remainingScore - dartTotal,
            throwsLeft - 1,
            requireDoubleOut,
            [...currentDarts, dart],
            results,
          );
        } else {
          // Not finishing yet, continue
          this.findCheckoutsRecursive(
            remainingScore - dartTotal,
            throwsLeft - 1,
            requireDoubleOut,
            [...currentDarts, dart],
            results,
          );
        }
      } else {
        // Not the last dart, continue recursion
        this.findCheckoutsRecursive(
          remainingScore - dartTotal,
          throwsLeft - 1,
          requireDoubleOut,
          [...currentDarts, dart],
          results,
        );
      }
    }
  }
}
