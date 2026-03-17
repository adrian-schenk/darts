import {ref, watch} from "vue";
import type {Throw} from "@/lib/dart.ts";
import useSocket from "./socket";

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
  dartboardRef?: {
    addHitMarker?: (x: number, y: number) => void,
    clearMarkers?: () => void
  } | {
    value?: {
      addHitMarker?: (x: number, y: number) => void,
      clearMarkers?: () => void
    }
  }
}

export class DartPlayer {

  boardRef: any = null

  score = ref(0)
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

  checkoutCombination = ref<string[]>([]);

  scoreLog = ref<Throw[]>([]);

  state = ref<PlayerState>(PlayerState.THROW_DARTS)

  socket: any = null;

  constructor(public info: DartPlayerInfo) {
    const { socket, status, data, send, close } = useSocket();
    this.socket = socket;

    if (info.dartboardRef) this.boardRef = info.dartboardRef;

    socket.on('dart-event', (msg: any) => {
      if (msg.type === 'dart_hit') {
        const t: Throw = msg.throw;
        t.score = this.getFieldScore(t.field);
        t.field = this.getFieldName(t.field);
        this.addThrow(t)
      }
    })

    socket.on('sync-game', (gameState: any) => {
      if (this.state.value == PlayerState.REMOVE_DARTS && this.state.value != gameState.state && this.boardRef) {
        this.boardRef?.clearMarkers?.();
      }

      this.state.value = gameState.state;

      this.score.value = gameState.score;
      this.throws.value = [
        { field: "", score: 0 },
        { field: "", score: 0 },
        { field: "", score: 0 },
      ];
      for (let i = 0; i < gameState.currentThrows.length; i++) {
        const t = gameState.currentThrows[i];
        this.throws.value[i] = {
          field: t.field,
          score: t.score,
          invalid: t.invalid
        }
      }

      this.checkoutCombination.value = gameState.checkoutCombination;
    })

  }

  addThrow(t: Throw) {
    const board = this.boardRef

    if (board && typeof board.addHitMarker === 'function') {
      board.addHitMarker(t.x, t.y)
    }
  }

  endTurn() {
    this.socket.emit('dart-event', { type: 'dart_remove' });
  }

  getFieldName = (id: string) => {
    if (id === 'miss') return 'Miss'
    if (id === 'outer-bull') return 'SB'
    if (id === 'bullseye') return 'Bull'
    const [type, num] = id.replace(/-inner|-outer/, '').split('-')
    if (type === 'single') return `S${num}`
    if (type === 'double') return `D${num}`
    if (type === 'triple') return `T${num}`
    return id
  }

  getFieldScore = (id: string) => {
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
