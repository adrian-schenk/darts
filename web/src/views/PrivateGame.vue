<template>
  <div class="p-6">
    <div v-if="true" class="w-full mx-auto">
      <div class="flex flex-col gap-4 w-full h-full">
        <div class="flex flex-row gap-4">
          <Player v-for="[playeruuid, player] of players" :key="playeruuid" class="flex-auto h-auto w-full" :player="player" :ref="getPlayerRefSetter(playeruuid)"
            :show-history="true" :dart-board-ref="dartboardRef ?? undefined" :uuid="playeruuid">
          </Player>
        </div>
        <Dartboard ref="dartboardRef" class="flex-auto w-full" :click-to-add-marker="!isSpectating"></Dartboard>
      </div>

    </div>

    <router-view />

  </div>
</template>

<script setup lang="ts">
import Dartboard from '@/components/Dartboard.vue'
import Player from '@/components/Player.vue'
import getBearer from '@/lib/auth'
import { PlayerActionState } from '@/lib/dartPlayer'
import useSocket from '@/lib/socket'
import router from '@/router'
import { onMounted, ref } from 'vue'

let { socket, status, data, send, close } = useSocket()

const props = defineProps<{ gameId?: string }>()
const mode = ref('')

const isSpectating = ref(true)
const players = ref<Map<string, any>>(new Map())
const playerRefs = ref<Map<string, InstanceType<typeof Player> | null>>(new Map())
const dartboardRef = ref<InstanceType<typeof Dartboard> | null>(null)
const playerRefSetters = new Map<string, (el: unknown) => void>()
const dartboardRefSetters = new Map<string, (el: unknown) => void>()

const setPlayerRef = (playerUuid: string, el: unknown) => {
  const nextRef = (el as InstanceType<typeof Player>) ?? null
  if (playerRefs.value.get(playerUuid) === nextRef) {
    return
  }
  playerRefs.value.set(playerUuid, nextRef)
}

const getPlayerRefSetter = (playerUuid: string) => {
  if (!playerRefSetters.has(playerUuid)) {
    playerRefSetters.set(playerUuid, (el: unknown) => setPlayerRef(playerUuid, el))
  }
  return playerRefSetters.get(playerUuid)!
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
              isSpectating.value = data.spectating;
              resolve(null)
            } else if (!data.spectating) {
              router.replace('/local-game')
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
  fetch(import.meta.env.VITE_API_BASE_URL + '/create-local/', {
    method: 'POST',
    headers: { Authorization: getBearer(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.gameId) {
        router.replace({ name: 'local-game-session', params: { gameId: data.gameId } })
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