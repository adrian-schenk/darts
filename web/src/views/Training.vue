<template>
  <RouterLink
    v-if="mode"
    to="/training"
    class="text-sm text-gray-400 hover:text-gray-300 mb-4 inline-block"
    >← Back</RouterLink
  >
  <BackgroundCentered v-if="!mode">
    <h2 class="text-2xl font-bold mb-2">Choose Training Mode</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        v-for="mode in trainingModes"
        :key="mode.value"
        @click="startSession(mode.value)"
        :class="['group relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 hover:shadow-lg transition-all duration-300 text-left', getTrainingModeClass(mode.value)]"
      >
        <div :class="['absolute inset-0 rounded-lg transition-colors', getTrainingModeBgClass(mode.value)]"></div>
        <h3 class="text-xl font-bold text-white mb-2 relative">{{ mode.icon }} {{ mode.label }}</h3>
        <p class="text-gray-400 relative text-sm mb-4 min-h-10">{{ mode.desc }}</p>
        <div :class="['text-xs font-semibold relative', getTrainingModeTextClass(mode.value)]">Practice →</div>
      </button>
    </div>
  </BackgroundCentered>
  <div v-if="mode" class="w-full mx-auto">
    <div
      v-for="[playeruuid, player] of players"
      :key="playeruuid"
      class="flex flex-row gap-4 w-full h-full"
    >
      <Player
        class="flex-auto h-auto w-full"
        :player="player"
        :ref="getPlayerRefSetter(playeruuid)"
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

  <RouterView />
</template>

<script setup lang="ts">
import Dartboard from '@/components/Dartboard.vue'
import Player from '@/components/Player.vue'
import BackgroundCentered from '@/components/ui/BackgroundCentered.vue'
import getBearer from '@/lib/auth'
import { getTrainingModeBgClass, getTrainingModeClass, getTrainingModeTextClass, trainingModes } from '@/lib/modeInfo'
import useSocket from '@/lib/socket'
import router from '@/router'
import { useTrainingStore } from '@/stores/training/TrainingStore'
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'

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
    fetch('/api/game/' + props.gameId, {
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

        socket.on('game-update', (gameState: any) => {
          for (const [uuid, player] of Object.entries(gameState)) {
            players.value.set(uuid, player)
          }
        })

        await send('join-game', { gameId: props.gameId })

        // wait for join-game response
        await new Promise((resolve) => {
          setTimeout(resolve, 2000)
          socket.once('join-game', (data: any) => {
            if (data.success) {
              localPlayer.value = data.playerId
              resolve(null)
            } else if (!data.spectating) {
              router.replace('/training')
              resolve(null)
            }
          })
        })
      })
      .catch((err) => {
        console.error('Error fetching game data:', err)
      })
  }
})

const startSession = (mode: string) => {
  fetch('api/create-training/' + mode, {
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

</script>

<style scoped></style>
