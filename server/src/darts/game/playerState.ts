import {
  classToPlain,
  Exclude,
  instanceToPlain,
  Transform,
  Type,
} from 'class-transformer';
import { GameEntity } from './entities/game.entity';
import JsonSerializable from 'src/util/JsonSerializable';
import { DartsCheckoutLogicService } from '../logic/checkout.service';
import { v4 as uuidv4 } from 'uuid';
import { User } from 'src/users/user.entity';
import PlayerStats, { StatType } from './playerStats';
import { GameState } from './gameState';
import { number_fields } from './utils';

const checkoutLogic: DartsCheckoutLogicService =
  new DartsCheckoutLogicService();

export enum PlayerActionState {
  IDLE,
  THROW_DARTS,
  REMOVE_DARTS,
  TIMEOUT,
}

enum PracticeDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  AUTO = 'auto',
}

export class PlayerState extends JsonSerializable {
  uuid: string;
  gameId: string;

  @Exclude({ toPlainOnly: true })
  userId: number;

  @Exclude({ toPlainOnly: true })
  playername: string;

  @Exclude({ toPlainOnly: true })
  controllerType: 'human' | 'bot' = 'human';

  @Exclude()
  locked: boolean = false;

  @Exclude()
  numThrows: number = 0;

  state: PlayerActionState;

  showStats: any = {
    player: {
      showName: true,
      showSets: true,
      showLegs: true,
    },
    data: {
      avg: true,
      avg_6: true,
      max_checkout: true,
      percentage_checkout: true,
    },
  };

  @Type(() => PlayerStats)
  @Transform(
    ({ value, options }) => (options?.ignoreDecorators ? value : value.stats),
    { toPlainOnly: true },
  )
  stats: PlayerStats = new PlayerStats();

  constructor() {
    super();
    this.uuid = uuidv4();
    this.state = PlayerActionState.IDLE;
  }

  static create(user: User, gameId: string): PlayerState {
    let state = new PlayerState();
    state.userId = user.id;
    state.gameId = gameId;
    return state;
  }

  public onDartHit(roundId: string, throwInfo: any): any {
    this.stats.logThrow(this, roundId, throwInfo);
  }

  public onDartRemove() {
    this.state = PlayerActionState.THROW_DARTS;
  }

  public onRoundEnd(game: GameState) {}

  public hasRoundEnded(game: GameState): boolean {
    return false;
  }

  public setTurn() {
    this.state = PlayerActionState.THROW_DARTS;
  }

  protected setShowPlayerStat(stat: string, value: boolean) {
    this.showStats.player[stat] = value;
  }

  protected setShowDataStat(stat: string, value: boolean) {
    this.showStats.data[stat] = value;
  }

  @Exclude()
  public getFieldName = (id: string) => {
    if (typeof id !== 'string') return '';
    if (id === 'miss') return 'Miss';
    if (id === 'outer-bull') return 'SB';
    if (id === 'bullseye') return 'Bull';
    const [type, num] = id.replace(/-inner|-outer/, '').split('-');
    if (type === 'single') return `S${num}`;
    if (type === 'double') return `D${num}`;
    if (type === 'triple') return `T${num}`;
    return '';
  };

  @Exclude()
  public getFieldScore = (id: string) => {
    if (typeof id !== 'string') return 0;
    if (id === 'miss') return 0;
    if (id === 'outer-bull') return 25;
    if (id === 'bullseye') return 50;
    const [type, numStr] = id.replace(/-inner|-outer/, '').split('-');
    const num = parseInt(numStr);
    if (type === 'single') return num;
    if (type === 'double') return num * 2;
    if (type === 'triple') return num * 3;
    return 0;
  };

  @Exclude()
  public getRandomField() {
    let fields = [
      'bullseye',
      'outer-bull',
    ]

    for (let i = 1; i <= 20; i++) {
      fields.push(`single-${i}`);
      fields.push(`double-${i}`);
      fields.push(`triple-${i}`);
    }

    return fields[Math.floor(Math.random() * fields.length)];
  }

  @Exclude()
  public lock(millis: number) {
    this.locked = true;
    setTimeout(() => {
      this.locked = false;
    }, millis);
  }
}

export class DefaultPlayerState extends PlayerState {
  score: number = 501;
  @Exclude()
  saveScore: number = this.score;
  @Exclude()
  initialScore: number = 501;
  checkoutCombination: any[] = new Array();

  @Exclude()
  checkoutMode: 'open' | 'double-out' | 'master-out' = 'double-out';

  @Exclude()
  throwsPerTurn = 3;

  @Exclude()
  doubleOut = true;

  currentThrows: any[] = new Array();

  constructor() {
    super();
  }

  static create(user: User, gameId: string): PlayerState {
    let state = new DefaultPlayerState();
    state.userId = user.id;
    state.gameId = gameId;
    return state;
  }

  public onDartHit(roundId: string, throwInfo: any): any {
    super.onDartHit(roundId, throwInfo);

    const fieldScore = this.getFieldScore(throwInfo.field);

    this.currentThrows.push({
      score: fieldScore,
      field: this.getFieldName(throwInfo.field),
    });

    // Check for bust
    if (!this.setScore(this.score - fieldScore)) {
      this.currentThrows.at(-1)!.invalid = true;
      this.checkoutCombination = [];
      this.setScore(this.saveScore);
      this.state = PlayerActionState.REMOVE_DARTS;
      this.stats.trackStat('percentage_checkout', StatType.PERCENTAGE, 0);
      return;
    }

    // Check if turn is over
    if (this.currentThrows.length >= this.throwsPerTurn) {
      if (this.score > 0) {
        this.saveScore = this.score;
      }
      this.state = PlayerActionState.REMOVE_DARTS;
    }

    // Check for checkout
    if (this.score <= 0) {
      this.stats.trackStat('percentage_checkout', StatType.PERCENTAGE, 1);
      this.stats.trackStat('max_checkout', StatType.MAX, this.saveScore);
      this.state = PlayerActionState.REMOVE_DARTS;
    }
  }

  public onDartRemove(): void {
    this.currentThrows = [];
    this.state = PlayerActionState.THROW_DARTS;

    this.recalculateCheckoutCombination();
  }

  public onRoundEnd(game: GameState) {
    this.setSaveScore(this.initialScore);
  }

  public hasRoundEnded(game: GameState): boolean {
    return this.score <= 0;
  }

  public setScore(score: number): boolean {
    if (score >= 0 && checkoutLogic.scoreFinishable(score)) {
      this.score = score;
      this.recalculateCheckoutCombination();
      return true;
    }
    return false;
  }

  public setSaveScore(score: number): void {
    this.score = score;
    this.saveScore = score;
    this.recalculateCheckoutCombination();
  }

  public setInitialScore(score: number): void {
    this.initialScore = score;
    this.setSaveScore(score);
  }

  public recalculateCheckoutCombination(): void {
    if (checkoutLogic.checkoutPossible(this.score)) {
      let combo =
        checkoutLogic
          .findCheckouts(
            this.score,
            this.throwsPerTurn - this.currentThrows.length,
          )[0]
          ?.darts.map((dart) => dart.display) || [];
      this.checkoutCombination = Array(this.currentThrows.length)
        .fill('')
        .concat(combo);
    } else {
      this.checkoutCombination = [];
    }
  }
}

export class TargetPlayerState extends PlayerState {
  currentTarget: string;

  constructor() {
    super();
    this.setShowPlayerStat('showName', false);
    this.setShowPlayerStat('showSets', false);
    this.setShowPlayerStat('showLegs', false);
    this.setShowDataStat('avg', false);
    this.setShowDataStat('avg_6', false);
    this.setShowDataStat('max_checkout', false);
    this.setShowDataStat('percentage_checkout', false);
    this.setShowDataStat('count_throws', true);
    this.setShowDataStat('count_hits', true);
    this.currentTarget = this.getRandomField();
  }

  static create(user: User, gameId: string): PlayerState {
    let state = new TargetPlayerState();
    state.userId = user.id;
    state.gameId = gameId;
    return state;
  }

  public onDartHit(roundId: string, throwInfo: any): any {
    super.onDartHit(roundId, throwInfo);

    let hitField = throwInfo.field.replace('-inner', '').replace('-outer', '');
    if (hitField === this.currentTarget) {
      this.currentTarget = this.getRandomField();
      this.stats.trackStat('count_hits', StatType.COUNT, 1);
    }
    this.stats.trackStat('count_throws', StatType.COUNT, 1);
  }
}

export class AroundPlayerState extends TargetPlayerState {

  cur = 0;

  constructor() { 
    super();
  }

  static create(user: User, gameId: string): PlayerState {
    let state = new AroundPlayerState();
    state.userId = user.id;
    state.gameId = gameId;
    state.currentTarget = 'single-' + number_fields[state.cur];
    return state;
  }

  public onDartHit(roundId: string, throwInfo: any) {
    let hitField = throwInfo.field.replace('-inner', '').replace('-outer', '');
    if (hitField === 'single-' + number_fields[this.cur]) {
      this.cur++;
      if (this.cur < number_fields.length) {
        this.currentTarget = 'single-' + number_fields[this.cur];
      }
      this.stats.trackStat('count_hits', StatType.COUNT, 1);
    }
    this.stats.trackStat('count_throws', StatType.COUNT, 1);

    this.numThrows++;
    if (this.numThrows >= 3) {
      this.numThrows = 0;
      this.state = PlayerActionState.REMOVE_DARTS;
    }
  }

}

export class CheckoutPlayerState extends DefaultPlayerState {
  difficulty: PracticeDifficulty;

  constructor() {
    super();
    this.setSaveScore(Number(this.getRandomTarget()));
    this.setShowPlayerStat('showName', false);
    this.setShowPlayerStat('showSets', false);
    this.setShowPlayerStat('showLegs', false);
    this.setShowDataStat('avg', false);
    this.setShowDataStat('avg_6', false);
  }

  static create(user: User, gameId: string): PlayerState {
    let state = new CheckoutPlayerState();
    state.userId = user.id;
    state.gameId = gameId;
    return state;
  }

  public onDartHit(roundId: string, throwInfo: any): any {
    super.onDartHit(roundId, throwInfo);
  }

  public onDartRemove(): void {
    super.onDartRemove();
  }

  public onRoundEnd(game: GameState): void {
    this.setSaveScore(Number(this.getRandomTarget()));
  }

  public hasRoundEnded(game: GameState): boolean {
    return this.score <= 0;
  }

  public getRandomTarget() {
    switch (this.difficulty) {
      case PracticeDifficulty.EASY:
        return Object.keys(checkoutLogic.possibleCheckouts)
          .map(Number)
          .filter((score) => score <= 60)[
          Math.floor(
            Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length,
          )
        ];
      case PracticeDifficulty.MEDIUM:
        return Object.keys(checkoutLogic.possibleCheckouts)
          .map(Number)
          .filter((score) => score <= 120)[
          Math.floor(
            Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length,
          )
        ];
      case PracticeDifficulty.HARD:
        return Object.keys(checkoutLogic.possibleCheckouts)
          .map(Number)
          .filter((score) => score <= 170)[
          Math.floor(
            Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length,
          )
        ];
      case PracticeDifficulty.AUTO:
        return 130;
      default:
        return Object.keys(checkoutLogic.possibleCheckouts).map(Number)[
          Math.floor(
            Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length,
          )
        ];
    }
  }
}

export const playerStateTypeMap: Record<string, new () => PlayerState> = {
  PlayerState,
  DefaultPlayerState,
  TargetPlayerState,
  AroundPlayerState,
  CheckoutPlayerState,
};

export default PlayerState;
