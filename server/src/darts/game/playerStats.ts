import { Exclude } from 'class-transformer';
import { PlayerState } from './playerState';

export enum StatType {
  VAL,
  AVG,
  MAX,
  MIN,
  COUNT,
  PERCENTAGE,
}

export default class PlayerStats {
  stats: any = {
    legs: {
      value: 1,
    },
    sets: {
      value: 3,
    },
  };

  throwLog: any[] = [];

  constructor() {}

  logThrow(player: PlayerState, roundId: string, throwInfo: any) {
    this.throwLog.push({ roundId, ...throwInfo });

    // calculate the average
    let totalScore = 0;
    let totalThrows = 0;
    for (let log of this.throwLog) {
      totalScore += player.getFieldScore(log.field);
      totalThrows += 1;
    }

    if (totalThrows > 0) {
      this.trackStat('avg', StatType.AVG, (totalScore / totalThrows) * 3);
    }
  }

  trackStat(name: string, type: StatType, value?: number) {
    switch (type) {
      case StatType.VAL:
        this.stats[name] = {
          type,
          value,
        };
        break;
      case StatType.MAX:
        value = Math.max(this.stats[name]?.value ?? 0, value ?? 0);
        this.stats[name] = {
          type,
          value,
        };
        break;
      case StatType.MIN:
        value = Math.min(this.stats[name]?.value ?? Infinity, value ?? 0);
        this.stats[name] = {
          type,
          value,
        };
        break;
      case StatType.COUNT:
        const c = this.stats[name]?.count ?? 0;
        this.stats[name] = {
          type,
          value: c + 1,
          count: c + 1,
        };
        break;
      case StatType.PERCENTAGE:
        const total = this.stats[name]?.total ?? 0;
        const success = this.stats[name]?.success ?? 0;
        this.stats[name] = {
          type,
          value: (success + (value ?? 0)) / (total + 1),
          total: total + 1,
          success: success + ((value ?? 0) > 0 ? 1 : 0),
        };
        break;
      case StatType.AVG:
      default:
        const count = this.stats[name]?.count ?? 0;
        const sum = this.stats[name]?.sum ?? 0;
        this.stats[name] = {
          type,
          value: (sum + (value ?? 0)) / (count + 1),
          count: count + 1,
          sum: sum + (value ?? 0),
        };
        break;
    }
  }

  winLeg(legsPerSet: number) {
    if (!this.stats.legs) {
      this.stats.legs = { value: 0 };
    }
    if (!this.stats.sets) {
      this.stats.sets = { value: 0 };
    }

    this.stats.legs.value += 1;
    if (this.stats.legs.value >= legsPerSet) {
      this.stats.sets.value += 1;
      this.stats.legs.value = 0;
    }
  }
}
