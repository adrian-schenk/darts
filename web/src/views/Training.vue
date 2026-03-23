<template>
  <div class="p-6">
    <RouterLink
      v-if="mode"
      to="/training"
      class="text-sm text-gray-400 hover:text-gray-300 mb-4 inline-block"
      >← Back</RouterLink
    >
    <div v-if="!mode" class="max-w-3xl mx-auto">
      <h2 class="text-2xl font-semibold mb-4">Choose Training Mode</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          v-for="m in modes"
          @click="startSession(m.value)"
          :key="m.value"
          class="block mt-2 text-sm text-blue-400 hover:text-blue-300"
        >
          Go to {{ m.label }}
        </button>
      </div>
    </div>
    <div v-if="mode" class="w-full mx-auto">
      <div
        v-for="[playeruuid, player] of players"
        :key="playeruuid"
        class="flex flex-row gap-4 w-full h-full"
      >
        <Player
          class="flex-auto h-auto w-full"
          :ref="getPlayerRefSetter(playeruuid)"
          :v-bind:player="player"
          :show-name="true"
          :show-sets="true"
          :show-avg="true"
          :show-history="true"
          :dart-board-ref="dartboardRefs.get(playeruuid) ?? undefined"
          :uuid="playeruuid"
        >
        </Player>
        <div class="h-24 border-l border-gray-600 mx-4 self-center"></div>
        <Dartboard
          :ref="getDartboardRefSetter(playeruuid)"
          class="flex-auto w-full"
          :click-to-add-marker="true"
          :player-interface="playerRefs.get(playeruuid)?.PlayerInterface ?? undefined"
        ></Dartboard>
      </div>
    </div>

    <router-view />
  </div>
</template>

<script setup lang="ts">
import Dartboard from '@/components/Dartboard.vue'
import Player from '@/components/Player.vue'
import getBearer from '@/lib/auth'
import useSocket from '@/lib/socket'
import router from '@/router'
import { useTrainingStore } from '@/stores/training/TrainingStore'
import { onMounted, ref } from 'vue'

const trainingStore = useTrainingStore()

let { socket, status, data, send, close } = useSocket()

const props = defineProps<{ gameId?: string }>()
const mode = ref('')

const localPlayer = ref<any>(null)
const players = ref<Map<string, any>>(new Map())
const playerRefs = ref<Map<string, InstanceType<typeof Player> | null>>(new Map())
const dartboardRefs = ref<Map<string, InstanceType<typeof Dartboard> | null>>(new Map())
const playerRefSetters = new Map<string, (el: unknown) => void>()
const dartboardRefSetters = new Map<string, (el: unknown) => void>()

const setPlayerRef = (playerUuid: string, el: unknown) => {
  const nextRef = (el as InstanceType<typeof Player>) ?? null
  if (playerRefs.value.get(playerUuid) === nextRef) {
    return
  }
  playerRefs.value.set(playerUuid, nextRef)
}

const setDartboardRef = (playerUuid: string, el: unknown) => {
  const nextRef = (el as InstanceType<typeof Dartboard>) ?? null
  if (dartboardRefs.value.get(playerUuid) === nextRef) {
    return
  }
  dartboardRefs.value.set(playerUuid, nextRef)
}

const getPlayerRefSetter = (playerUuid: string) => {
  if (!playerRefSetters.has(playerUuid)) {
    playerRefSetters.set(playerUuid, (el: unknown) => setPlayerRef(playerUuid, el))
  }
  return playerRefSetters.get(playerUuid)!
}

const getDartboardRefSetter = (playerUuid: string) => {
  if (!dartboardRefSetters.has(playerUuid)) {
    dartboardRefSetters.set(playerUuid, (el: unknown) => setDartboardRef(playerUuid, el))
  }
  return dartboardRefSetters.get(playerUuid)!
}

onMounted(() => {
  if (props.gameId) {
    fetch(import.meta.env.VITE_API_BASE_URL + '/game/' + props.gameId, {
      method: 'GET',
      headers: { Authorization: getBearer(), 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.gameId) {
          if (data.mode) {
            mode.value = data.mode
          }
        }

        send('join-game', { gameId: props.gameId })

        await new Promise((resolve) => {
          setTimeout(resolve, 2000)
          socket.once('join-game', (data: any) => {
            if (data.success) {
              localPlayer.value = data.playerId
              resolve(null)
            } else {
              router.replace('/training')
              resolve(null)
            }
          })
        })

        socket.on('game-update', (gameState: any) => {
          for (const player of Object.values(gameState.playerStates)) {
            players.value.set((player as any).uuid, player)
          }
        })

        send('sync-game', { gameId: props.gameId })
      })
      .catch((err) => {
        console.error('Error fetching game data:', err)
      })
  }
})

const modes = [
  { value: 'target', label: 'Target Practice', desc: 'Work on hitting specific targets.' },
  { value: 'around', label: 'Around The Clock', desc: 'Hit numbers in sequence.' },
  { value: 'checkouts', label: 'Checkouts', desc: 'Practice finishing combinations.' },
  { value: 'max', label: 'Max Score', desc: 'Aim for highest scoring.' },
]

const checkoutDifficulties = [
  { value: 'auto', label: 'Auto', desc: 'Finish with any combination.' },
  { value: 'easy', label: 'Easy', desc: 'Finish with simple combinations.' },
  { value: 'medium', label: 'Medium', desc: 'Finish with moderate combinations.' },
  { value: 'hard', label: 'Hard', desc: 'Finish with complex combinations.' },
]

const startSession = (mode: string) => {
  fetch(import.meta.env.VITE_API_BASE_URL + '/create-training/' + mode, {
    method: 'POST',
    headers: { Authorization: getBearer(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.gameId) {
        router.replace({ name: 'training-session', params: { gameId: data.gameId } })
      } else {
        // handle error
      }
    })
    .catch((err) => {
      console.error('Error starting training session:', err)
    })
}

const getDifficultyClass = (value: string) => {
  if (value === 'easy')
    return trainingStore.checkoutDifficulty === value
      ? 'border-green-600 bg-green-500/20 text-white'
      : 'border-green-400 text-white'
  if (value === 'medium')
    return trainingStore.checkoutDifficulty === value
      ? 'border-yellow-600 bg-yellow-500/20 text-white'
      : 'border-yellow-400 text-white'
  if (value === 'hard')
    return trainingStore.checkoutDifficulty === value
      ? 'border-red-600 bg-red-500/20 text-white'
      : 'border-red-400 text-white'
  return trainingStore.checkoutDifficulty === value
    ? 'border-blue-600 bg-blue-500/20 text-white'
    : 'border-blue-500 text-white'
}
</script>

<style scoped></style>
