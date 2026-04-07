<template>
  <div v-if="gameId" class="w-full mx-auto">
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
        :click-to-add-marker="localPlayer == playeruuid"
        :player-interface="playerRefs.get(playeruuid)?.PlayerInterface ?? undefined"
      ></Dartboard>
    </div>
  </div>

  <RouterView />
</template>

<script setup lang="ts">
import Dartboard from '@/components/Dartboard.vue'
import Player from '@/components/Player.vue'
import getBearer from '@/lib/auth'
import useSocket from '@/lib/socket'
import router from '@/router'
import { onMounted, ref } from 'vue'
import { RouterView, routerViewLocationKey } from 'vue-router'
import { getTrainingModeClass, getTrainingModeBgClass, getTrainingModeTextClass,regularModes, trainingModes } from '@/lib/modeInfo'

let { socket, status, data, send, close } = useSocket()

const props = defineProps<{ gameId?: string }>()
const mode = ref('')
console.log(props)
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


</script>

<style scoped></style>
