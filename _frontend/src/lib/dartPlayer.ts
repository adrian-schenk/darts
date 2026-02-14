import {ref} from "vue";
import type {Throw} from "@/lib/dart.ts";
import Player from "@/components/Player.vue";
import Dartboard from "@/components/Dartboard.vue";

export enum CountingMode {
  SUBTRACT,
  ADD
}

export enum PlayerState {
  THROW_DARTS,
  REMOVE_DARTS,
  TIMEOUT
}

export interface DartPlayerInfo {
  name: string,
  initialScore: number,
  countingMode?: CountingMode,
  throwsPerTurn?: number,
  dartboardRef?: typeof Dartboard
}

export class DartPlayer {

  boardRef

  score = ref(0)
  lastScore = ref(0)
  throws = ref<[Throw, Throw, Throw]>([{
    field: '',
    score: 0
  }, {
    field: '',
    score: 0
  }, {
    field: '',
    score: 0
  }])
  numThrows = ref(0)
  scoreLog = ref<Throw[]>([]);

  countingMode: CountingMode
  throwsPerTurn = ref(3)

  state = ref<PlayerState>(PlayerState.THROW_DARTS)

  constructor(public info: DartPlayerInfo) {
    this.score.value = info.initialScore;
    this.lastScore.value = this.score.value;

    this.countingMode = info.countingMode ? info.countingMode : CountingMode.SUBTRACT
    if (info.throwsPerTurn) this.throwsPerTurn.value = info.throwsPerTurn

    if (info.dartboardRef) this.boardRef = info.dartboardRef
  }

  modifyScore(t: Throw) {
    switch (this.countingMode) {
      case CountingMode.ADD:
        this.score.value += t.score
        break
      default:
        this.score.value -= t.score
    }
  }

  addThrow(t: Throw) {

    if (this.state.value == PlayerState.REMOVE_DARTS) return;

    this.numThrows.value++;
    const idx = this.throws.value.findIndex(x => x.field === '');
    if (idx !== -1) {
      this.throws.value[idx] = t;
    }

    if (this.boardRef) this.boardRef.addHitMarker(t.x, t.y);
    this.modifyScore(t)

    if (this.numThrows.value >= this.throwsPerTurn.value) {
      this.state.value = PlayerState.REMOVE_DARTS
    }
  }

  clearThrows() {
    this.throws.value = [
      { field: "", score: 0 },
      { field: "", score: 0 },
      { field: "", score: 0 },
    ];
    this.numThrows.value = 0;
  }

}
