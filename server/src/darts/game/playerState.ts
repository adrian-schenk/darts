import { classToPlain, Exclude, instanceToPlain } from "class-transformer";
import { GameEntity } from "./game.entity";
import JsonSerializable from "src/util/JsonSerializable";
import { DartsCheckoutLogicService } from "../logic/checkout.service";
import { v4 as uuidv4 } from "uuid";
import { User } from "src/users/user.entity";

const checkoutLogic: DartsCheckoutLogicService = new DartsCheckoutLogicService();

export enum PlayerActionState {
  IDLE,
  THROW_DARTS,
  REMOVE_DARTS,
  TIMEOUT
}

enum PracticeDifficulty {
    EASY = 'easy',
    MEDIUM = 'medium',
    HARD = 'hard',
    AUTO = 'auto'
}

export class PlayerState extends JsonSerializable {
    uuid: string;
    gameId: string;

    @Exclude({ toPlainOnly: true })
    userId: number;

    state: PlayerActionState;

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

    public onDartHit(throwInfo: any) {
        
    }

    public onDartRemove() {
        this.state = PlayerActionState.THROW_DARTS;
    }
    
    @Exclude()      
    protected getFieldName = (id: string) => {
        if (typeof id !== 'string') return '';
        if (id === 'miss') return 'Miss'
        if (id === 'outer-bull') return 'SB'
        if (id === 'bullseye') return 'Bull'
        const [type, num] = id.replace(/-inner|-outer/, '').split('-')
        if (type === 'single') return `S${num}`
        if (type === 'double') return `D${num}`
        if (type === 'triple') return `T${num}`
        return id
    }

    @Exclude()
    protected getFieldScore = (id: string) => {
        if (typeof id !== 'string') return 0;
        if (id === 'miss') return 0
        if (id === 'outer-bull') return 25
        if (id === 'bullseye') return 50
        const [type, numStr] = id.replace(/-inner|-outer/, '').split('-')
        const num = parseInt(numStr)
        if (type === 'single') return num
        if (type === 'double') return num * 2
        if (type === 'triple') return num * 3
        return 0
    }
    
}

export class DefaultPlayerState extends PlayerState {

    score: number = 501;
    @Exclude()
    saveScore: number = this.score;
    checkoutCombination: any[] = new Array();

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

    public onDartHit(throwInfo: any): void {
        const fieldScore = this.getFieldScore(throwInfo.field);

        this.currentThrows.push({
            score: fieldScore,
            field: this.getFieldName(throwInfo.field)
        });
        
        if (!this.setScore(this.score - fieldScore)) {
            this.currentThrows.at(-1)!.invalid = true;
            this.checkoutCombination = [];
            this.setScore(this.saveScore);
            this.state = PlayerActionState.REMOVE_DARTS;
            return;
        }

        if (this.currentThrows.length >= this.throwsPerTurn) {
            this.saveScore = this.score;
            this.state = PlayerActionState.REMOVE_DARTS;
        }
    }

    public onDartRemove(): void {
        this.currentThrows = [];
        this.state = PlayerActionState.THROW_DARTS;

        this.recalculateCheckoutCombination();
    }

    public setScore(score: number): boolean {
        if (score >= 0 && checkoutLogic.scoreFinishable(score)) {
            this.score = score;
            this.recalculateCheckoutCombination();
            return true;
        }
        return false;
    }

    public setInitialScore(score: number): void {
        this.score = score;
        this.saveScore = score;
        this.recalculateCheckoutCombination();
    }

    public recalculateCheckoutCombination(): void {
        if (checkoutLogic.checkoutPossible(this.score)) {
            let combo = checkoutLogic.findCheckouts(this.score, this.throwsPerTurn - this.currentThrows.length)[0]?.darts.map(dart => dart.display) || [];
            this.checkoutCombination = Array(this.currentThrows.length).fill("").concat(combo);
        } else {
            this.checkoutCombination = [];
        }
    }
}

export class TargetPlayerState extends PlayerState {
    currentTarget: string;    

    constructor() {
        super();
        this.currentTarget = 'bullseye';
    }

    static create(user: User, gameId: string): PlayerState {
        let state = new TargetPlayerState();
        state.userId = user.id;
        state.gameId = gameId;
        return state;
    }
}

export class CheckoutPlayerState extends DefaultPlayerState {

    difficulty: PracticeDifficulty;

    constructor() {
        super();
        this.setInitialScore(Number(this.getRandomTarget()));
    }

    static create(user: User, gameId: string): PlayerState {
        let state = new CheckoutPlayerState();
        state.userId = user.id;
        state.gameId = gameId;
        return state;
    }

    public onDartHit(throwInfo: any): void {
        super.onDartHit(throwInfo);        

        if (this.score <= 0) {
            this.state = PlayerActionState.REMOVE_DARTS;        
        }
    }

    public onDartRemove(): void {
        super.onDartRemove();

        if (this.score <= 0) {
            this.setInitialScore(Number(this.getRandomTarget()));
        }
    }

    public getRandomTarget() {
        switch (this.difficulty) {
            case PracticeDifficulty.EASY:
                return Object.keys(checkoutLogic.possibleCheckouts)
                    .map(Number)
                    .filter(score => score <= 60)
                    [Math.floor(Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length)];
            case PracticeDifficulty.MEDIUM:
                return Object.keys(checkoutLogic.possibleCheckouts)
                    .map(Number)
                    .filter(score => score <= 120)
                    [Math.floor(Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length)];
            case PracticeDifficulty.HARD:
                return Object.keys(checkoutLogic.possibleCheckouts)
                    .map(Number)
                    .filter(score => score <= 170)
                    [Math.floor(Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length)];
            case PracticeDifficulty.AUTO:
                return 130;
            default:
                return Object.keys(checkoutLogic.possibleCheckouts).map(Number)[Math.floor(Math.random() * Object.keys(checkoutLogic.possibleCheckouts).length)];
        }
    }

}

export default PlayerState;