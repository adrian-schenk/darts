import { PlayerState } from "./playerState";

export enum StatType {
  AVG,
  MAX,
  MIN,
  PERCENTAGE,
}

export default class PlayerStats {
  stats: any = {
  };

  throwLog: any[] = [];

  constructor() { }

  logThrow(roundId: string, throwInfo: any) {
    this.throwLog.push({ roundId, ...throwInfo });
  }

  trackStat(name: string, type: StatType, value: number) {
    switch (type) {
      case StatType.MAX:
        value = Math.max(this.stats[name]?.value ?? 0, value);
        this.stats[name] = {
          type,
          value,
        };
        break;
      case StatType.MIN:
        value = Math.min(this.stats[name]?.value ?? Infinity, value);
        this.stats[name] = {
          type,
          value,
        };
        break;
      case StatType.PERCENTAGE:
        const total = this.stats[name]?.total ?? 0;
        const success = this.stats[name]?.success ?? 0;
        this.stats[name] = {
          type,
          value: (success + value) / (total + 1),
          total: total + 1,
          success: success + (value > 0 ? 1 : 0),
        };
        break;
      case StatType.AVG:
      default:
        const count = this.stats[name]?.count ?? 0;
        const sum = this.stats[name]?.sum ?? 0;
        this.stats[name] = {
          type,
          value: (sum + value) / (count + 1),
          count: count + 1,
          sum: sum + value,
        };
        break;
    }
  }
  
}