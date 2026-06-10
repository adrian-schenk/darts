<template>
  <div class="flex flex-col items-center gap-6 w-full p-4">
    <div class="text-center">
      <h2 class="text-2xl font-bold text-white">Bulling Off</h2>
      <p class="text-gray-400 mt-1">Throw closest to the bull — whoever's nearest goes first</p>
    </div>

    <div v-if="isTie" class="px-4 py-2 bg-yellow-900/50 border border-yellow-600 rounded-lg text-yellow-400 font-semibold">
      Tie! Both players throw again.
    </div>

    <div class="flex gap-6 w-full justify-center flex-wrap">
      <div
        v-for="[uuid, player] in players"
        :key="uuid"
        class="flex flex-col items-center gap-3 flex-1 min-w-56 max-w-md"
      >
        <div class="text-center">
          <p
            class="font-semibold text-lg transition-colors"
            :class="uuid === currentPlayer ? 'text-green-400' : 'text-gray-300'"
          >
            {{ player.playerName }}
            <span v-if="uuid === currentPlayer && !playerStates[uuid]?.bullingOffThrow" class="text-sm text-green-500 ml-1">← throwing</span>
          </p>
          <p v-if="playerStates[uuid]?.bullingOffThrow" class="text-sm font-medium text-white mt-1">
            {{ getFieldName(playerStates[uuid].bullingOffThrow.field) }}
          </p>
          <p v-else-if="uuid === currentPlayer" class="text-sm text-gray-400 mt-1">Throwing...</p>
          <p v-else class="text-sm text-gray-500 mt-1">Waiting...</p>
        </div>

        <Dartboard
          :ref="(el) => setBoardRef(uuid, el as InstanceType<typeof Dartboard>)"
          :click-to-add-marker="true"
          :show-score="isInteractive(uuid)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Dartboard from '@/components/Dartboard.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  players: Map<string, { playerName: string }>
  playerStates: Record<string, any>
  currentPlayer: string
  localPlayer: string | null
}>()

const boardRefs = ref<Map<string, InstanceType<typeof Dartboard> | null>>(new Map())

const isTie = ref(false)
let tieTimeout: ReturnType<typeof setTimeout> | null = null

const setBoardRef = (uuid: string, el: InstanceType<typeof Dartboard> | null) => {
  boardRefs.value.set(uuid, el ?? null)
}

const isInteractive = (uuid: string) => {
  if (uuid !== props.currentPlayer) return false
  if (props.playerStates[uuid]?.bullingOffThrow) return false
  // For local games localPlayer is null — any current player may click;
  // the server rejects clicks from the wrong user anyway
  if (props.localPlayer !== null) return uuid === props.localPlayer
  return true
}

const getFieldName = (field: string): string => {
  if (!field) return ''
  if (field === 'miss') return 'Miss'
  if (field === 'bullseye') return 'Bull'
  if (field === 'outer-bull') return 'Outer Bull'
  const clean = field.replace(/-inner|-outer/, '')
  const [type, num] = clean.split('-')
  if (type === 'single') return `Single ${num}`
  if (type === 'double') return `Double ${num}`
  if (type === 'triple') return `Triple ${num}`
  return field
}

const addMarkerForPlayer = (uuid: string) => {
  const throwData = props.playerStates[uuid]?.bullingOffThrow
  if (!throwData) return
  const board = boardRefs.value.get(uuid)
  if (board) {
    board.clearMarkers()
    board.addHitMarker(throwData.x, throwData.y)
  }
}

watch(
  () => props.playerStates,
  (states) => {
    for (const uuid of props.players.keys()) {
      if (states[uuid]?.bullingOffThrow) {
        addMarkerForPlayer(uuid)
      } else {
        boardRefs.value.get(uuid)?.clearMarkers()
      }
    }

    // Detect a tie: all players have no throw but we were just in a state where all had thrown
    // (server resets throws on tie and broadcasts the new state)
    const allThrown = Array.from(props.players.keys()).every(
      (uuid) => states[uuid]?.bullingOffThrow,
    )
    if (!allThrown && previouslyAllThrown.value) {
      isTie.value = true
      if (tieTimeout) clearTimeout(tieTimeout)
      tieTimeout = setTimeout(() => {
        isTie.value = false
      }, 3000)
    }
    previouslyAllThrown.value = allThrown
  },
  { deep: true },
)

const previouslyAllThrown = ref(false)

onMounted(() => {
  // Restore markers for any throws already recorded when joining mid-bulling-off
  for (const uuid of props.players.keys()) {
    if (props.playerStates[uuid]?.bullingOffThrow) {
      addMarkerForPlayer(uuid)
    }
  }
})

onBeforeUnmount(() => {
  if (tieTimeout) clearTimeout(tieTimeout)
})
</script>
