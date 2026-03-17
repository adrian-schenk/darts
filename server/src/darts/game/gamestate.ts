import { classToPlain, Exclude, instanceToPlain } from "class-transformer";
import { GameEntity } from "./game.entity";
import JsonSerializable from "src/util/JsonSerializable";
import { DartsCheckoutLogicService } from "../logic/checkout.service";

const checkoutLogic: DartsCheckoutLogicService = new DartsCheckoutLogicService();

export enum PlayerState {
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

export class GameState extends JsonSerializable {
    gameId: string;
    mode: string;
    status: string;

    state: PlayerState;

    currentThrows: any[] = new Array();

    constructor(game: GameEntity) {
        super();
        this.gameId = game.gameId;
        this.mode = game.mode;
        this.status = game.status;
        this.state = PlayerState.THROW_DARTS;
    }

    public onDartHit(throwInfo: any) {
        
    }

    public onDartRemove() {
        this.currentThrows = [];
        this.state = PlayerState.THROW_DARTS;
    }
    
    @Exclude()      
    protected getFieldName = (id: string) => {
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

export class DefaultGameState extends GameState {

    score: number = 501;
    checkoutCombination: any[] = new Array();

    @Exclude()
    throwsPerTurn = 3;

    @Exclude()
    doubleOut = true;

    constructor(game: GameEntity) {
        super(game);
    }

    public onDartHit(throwInfo: any): void {
        const fieldScore = this.getFieldScore(throwInfo.field);
        
        this.currentThrows.push({
            score: fieldScore,
            field: this.getFieldName(throwInfo.field)
        });
        
        this.setScore(this.score - fieldScore);

        if (this.currentThrows.length >= this.throwsPerTurn) {
            this.state = PlayerState.REMOVE_DARTS;
        }
    }

    public onDartRemove(): void {
        this.currentThrows = [];
        this.state = PlayerState.THROW_DARTS;

        if (checkoutLogic.checkoutPossible(this.score)) {
            this.checkoutCombination = checkoutLogic.findCheckouts(this.score, this.throwsPerTurn - this.currentThrows.length)[0]?.darts.map(dart => dart.display) || [];
        } else {
            this.checkoutCombination = [];
        }
    }

    public setScore(score: number): void {
        this.score = score;
        if (checkoutLogic.checkoutPossible(this.score)) {
            let combo = checkoutLogic.findCheckouts(this.score, this.throwsPerTurn - this.currentThrows.length)[0]?.darts.map(dart => dart.display) || [];
            this.checkoutCombination = Array(this.currentThrows.length).fill("").concat(combo);
        } else {
            this.checkoutCombination = [];
        }
    }
}

export class TargetGameState extends GameState {
    currentTarget: string;    

    constructor(game: GameEntity) {
        super(game);
        this.currentTarget = 'bullseye';
    }
}

export class CheckoutGameState extends DefaultGameState {

    difficulty: PracticeDifficulty;

    constructor(game: GameEntity) {
        super(game);
        this.setScore(Number(this.getRandomTarget()));
    }

    public onDartHit(throwInfo: any): void {
        super.onDartHit(throwInfo);        

        if (this.score <= 0) {
            this.state = PlayerState.REMOVE_DARTS;        
        }
    }

    public onDartRemove(): void {
        super.onDartRemove();

        if (this.score <= 0) {
            this.setScore(Number(this.getRandomTarget()));
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

export default GameState;