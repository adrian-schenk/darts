import { ref } from 'vue'
import type { Throw } from '@/lib/dart.ts'
import useSocket from './socket'

export enum PlayerActionState {
  IDLE,
  THROW_DARTS,
  REMOVE_DARTS,
  REMOVE_DARTS_WON,
  FINISHED
}

export interface DartPlayerInfo {
  uuid: string
  name: string
  throwsPerTurn?: number
  dartboardRef?:
  | {
    addHitMarker?: (x: number, y: number) => void
    clearMarkers?: () => void
  }
  | {
    value?: {
      addHitMarker?: (x: number, y: number) => void
      clearMarkers?: () => void
    }
  }
}

export class DartPlayer {
  uuid: string

  boardRef: any = null

  currentTarget = ref<string | null>(null)
  currentTargetHit = ref<boolean>(false)
  score = ref<number | null>(null)
  throws = ref<[Throw, Throw, Throw]>([
    {
      field: '',
      score: 0,
    },
    {
      field: '',
      score: 0,
    },
    {
      field: '',
      score: 0,
    },
  ])

  checkoutCombination = ref<string[]>([])

  scoreLog = ref<Throw[]>([])

  state = ref<PlayerActionState>(PlayerActionState.IDLE)

  gameState = ref<string | null>(null)

  winnerPlayerUuid = ref<string | null>(null)

  stats = ref<any>(null)

  socket: any = null

  remainingTime = ref<number | null>(null)

  private remainingTimeIntervalId: ReturnType<typeof setInterval> | null = null

  constructor(public info: DartPlayerInfo) {
    this.uuid = info.uuid
    
    const { socket } = useSocket()
    this.socket = socket

    if (info.dartboardRef) this.boardRef = info.dartboardRef

    socket.on('dart-event', this.handleDartEvent)
    socket.on('player-event', this.handlePlayerEvent)
  }

  private readonly handleDartEvent = (msg: any) => {
    if (this.uuid && msg.playerUuid !== this.uuid) return
    
    if (msg.type === 'dart_hit') {
      const t: Throw = { ...msg.throw }

      t.score = this.getFieldScore(t.field)
      t.field = this.getFieldName(t.field)
      this.addThrow(t)

      if (this.currentTarget.value) {
        this.currentTargetHit.value = t.field === this.getFieldName(this.currentTarget.value)
      }
    }
  }

  private readonly handlePlayerEvent = (gameState: any) => {
    if (!this.uuid)
        this.uuid = gameState.currentPlayer ?? null;

    const playerGameState = gameState.playerStates?.[this.uuid] ?? gameState
    const board = this.getBoard()
    if (
      (this.state.value == PlayerActionState.REMOVE_DARTS || this.state.value == PlayerActionState.REMOVE_DARTS_WON) &&
      this.state.value != playerGameState.state &&
      board
    ) {
      board.clearMarkers?.()
    }

    if (
      playerGameState.state === PlayerActionState.THROW_DARTS && (this.state.value == PlayerActionState.REMOVE_DARTS || this.state.value == PlayerActionState.REMOVE_DARTS_WON || this.state.value == PlayerActionState.IDLE)
    ) {
      this.remainingTime.value = playerGameState.remainingTime ?? null
      if (this.remainingTimeIntervalId !== null) {
        clearInterval(this.remainingTimeIntervalId)
        this.remainingTimeIntervalId = null
      }
      this.remainingTimeIntervalId = setInterval(() => {
        if (this.remainingTime.value !== null && this.state.value === PlayerActionState.THROW_DARTS) {
          this.remainingTime.value = Math.max(0, this.remainingTime.value - 1)
        }
      }, 1000)
    }

    this.state.value = playerGameState.state
    this.gameState.value = gameState.state ?? null
    this.winnerPlayerUuid.value = gameState.winnerPlayerUuid ?? null
    this.stats.value = playerGameState.stats

    if (this.currentTarget.value) {
      setTimeout(() => {
        this.currentTargetHit.value = false
        this.currentTarget.value = playerGameState.currentTarget ?? null
      }, 1500)
    } else {
      this.currentTarget.value = playerGameState.currentTarget ?? null;
    }

    this.score.value = playerGameState.score ?? null
    this.throws.value = [
      { field: '', score: 0 },
      { field: '', score: 0 },
      { field: '', score: 0 },
    ]

    if (playerGameState.currentThrows) {
      for (let i = 0; i < playerGameState.currentThrows.length; i++) {
        const t = playerGameState.currentThrows[i]
        this.throws.value[i] = {
          field: t.field,
          score: t.score,
          invalid: t.invalid,
        }
      }
    }

    this.checkoutCombination.value = playerGameState.checkoutCombination ?? [];
  }

  private getBoard() {
    if (!this.boardRef) return null
    if (typeof this.boardRef === 'object' && 'value' in this.boardRef) {
      return this.boardRef.value ?? null
    }
    return this.boardRef
  }

  dispose() {
    if (this.remainingTimeIntervalId !== null) {
      clearInterval(this.remainingTimeIntervalId)
      this.remainingTimeIntervalId = null
    }
    this.socket?.off?.('dart-event', this.handleDartEvent)
    this.socket?.off?.('player-event', this.handlePlayerEvent)
  }

  addThrow(t: Throw) {
    const board = this.getBoard()
    if (board && typeof board.addHitMarker === 'function') {
      board.addHitMarker(t.x, t.y)
    }
  }

  endTurn() {
    this.socket.emit('dart-event', { type: 'dart_remove' })
  }

  getFieldName = (id: string) => {
    if (id === 'miss') return 'Miss'
    if (id === 'outer-bull') return 'SB'
    if (id === 'bullseye') return 'Bull'
    const [type, num] = id.replace(/-inner|-outer/, '').split('-')
    if (type === 'single') return `S${num}`
    if (type === 'double') return `D${num}`
    if (type === 'triple') return `T${num}`
    return ''
  }

  getFieldScore = (id: string) => {
    if (id === 'miss') return 0
    if (id === 'outer-bull') return 25
    if (id === 'bullseye') return 50
    const [type, numStr] = id.replace(/-inner|-outer/, '').split('-')
    const num = parseInt(numStr ?? '0')
    if (type === 'single') return num
    if (type === 'double') return num * 2
    if (type === 'triple') return num * 3
    return 0
  }

  getStatsName(stat: string) {
    if (stat === 'avg') return 'Average'
    if (stat === 'avg_6') return 'Average (6 darts)'
    if (stat === 'percentage_checkout') return 'Checkout %'
    if (stat === 'max_checkout') return 'Highest Checkout'
    if (stat === 'count_throws') return 'Total throws'
    if (stat === 'count_hits') return 'Total hits'
    return stat.charAt(0).toUpperCase() + stat.slice(1)
  }

  getDataStat(stat: string) {
    let val = this.stats.value?.[stat] ? this.stats.value?.[stat].value : 'N/A'
    let suffix = ''
    if (stat.includes('avg')) {
      val = Number(val).toFixed(0)
    }
    if (stat.includes('percentage')) {
      suffix = '%'
      val = (Number(val) * 100).toFixed(0)
    }
    return val + suffix
  }

  getPlayerStat(stat: string) {
    return this.stats.value?.[stat] ? this.stats.value?.[stat].value : 'N/A'
  }

  getCurrentTarget() {
    return this.currentTarget.value ? this.getFieldName(this.currentTarget.value) : '';
  }

  hasWonGame() {
    return this.winnerPlayerUuid.value !== null && this.winnerPlayerUuid.value === this.uuid
  }

  isGameFinished() {
    return this.gameState.value === 'FINISHED'
  }
}
