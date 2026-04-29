import { Injectable } from '@nestjs/common';

export type CheckoutMode = 'open' | 'double-out' | 'master-out';

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
export class DartsCheckoutLogicService {
  public readonly validScores: DartScore[] = [];

  public readonly possibleCheckouts: { [score: number]: boolean } = {};

  constructor() {
    this.initializeValidScores();
    for (let score = 2; score <= 170; score++) {
      if (this.checkoutPossible(score, 'double-out')) this.possibleCheckouts[score] = true;
    }
  }

  private getMaxFinishScore(checkoutMode: CheckoutMode): number {
    if (checkoutMode === 'double-out') {
      return 170;
    }
    return 180;
  }

  private getMinFinishScore(checkoutMode: CheckoutMode): number {
    return checkoutMode === 'open' ? 1 : 2;
  }

  public scoreFinishable(score: number, checkoutMode: CheckoutMode = 'double-out'): boolean {
    const maxFinishScore = this.getMaxFinishScore(checkoutMode);
    return score == 0 || score > maxFinishScore || this.checkoutPossible(score, checkoutMode);
  }

  public checkoutPossible(score: number, checkoutMode: CheckoutMode = 'double-out'): boolean {
    if (
      score < this.getMinFinishScore(checkoutMode) ||
      score > this.getMaxFinishScore(checkoutMode)
    ) {
      return false;
    }
    return this.findCheckouts(score, 3, checkoutMode).length > 0;
  }

  public isValidCheckoutThrow(score: number, throwScore: number, checkoutMode: CheckoutMode = 'double-out'): boolean {
    const remainingScore = score - throwScore;
    if (remainingScore < 0) return false;
    if (remainingScore === 0) {
      const dart = this.validScores.find(d => d.value * d.multiplier === throwScore);
      if (!dart) return false;
      return this.isValidFinishingDart(dart, checkoutMode);
    }
    return true;
  }


  private initializeValidScores(): void {
    // Single bull (25)
    this.validScores.push({
      value: 25,
      multiplier: 1,
      display: 'SB',
      isDouble: false,
    });

    // Double bull (50)
    this.validScores.push({
      value: 25,
      multiplier: 2,
      display: 'Bull',
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
    checkoutMode: CheckoutMode = 'double-out',
  ): Checkout[] {
    const checkouts: Checkout[] = [];

    if (score <= 0 || score > 180 * throwsLeft) {
      return checkouts;
    }

    this.findCheckoutsRecursive(
      score,
      throwsLeft,
      checkoutMode,
      [],
      checkouts,
    );

    return checkouts;
  }

  private isValidFinishingDart(dart: DartScore, checkoutMode: CheckoutMode): boolean {
    switch (checkoutMode) {
      case 'open':
        return true;
      case 'master-out':
        return dart.multiplier === 2 || dart.multiplier === 3;
      case 'double-out':
      default:
        return dart.isDouble;
    }
  }

  private findCheckoutsRecursive(
    remainingScore: number,
    throwsLeft: number,
    checkoutMode: CheckoutMode,
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
        // Validate finishing throw against the selected checkout mode.
        if (dartTotal === remainingScore) {
          if (!this.isValidFinishingDart(dart, checkoutMode)) {
            continue;
          }
          // Valid finish
          this.findCheckoutsRecursive(
            remainingScore - dartTotal,
            throwsLeft - 1,
            checkoutMode,
            [...currentDarts, dart],
            results,
          );
        } else {
          // Not finishing yet, continue
          this.findCheckoutsRecursive(
            remainingScore - dartTotal,
            throwsLeft - 1,
            checkoutMode,
            [...currentDarts, dart],
            results,
          );
        }
      } else {
        // Not the last dart, continue recursion
        this.findCheckoutsRecursive(
          remainingScore - dartTotal,
          throwsLeft - 1,
          checkoutMode,
          [...currentDarts, dart],
          results,
        );
      }
    }
  }
}
