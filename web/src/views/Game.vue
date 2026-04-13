<template>
  <div v-if="props.gameId" class="w-full mx-auto">
    <div class="flex flex-col gap-4 w-full h-full flex-auto">
      <div class="flex flex-row gap-4">
        <Player v-for="[playeruuid, player] of players" :key="playeruuid" class="flex-auto h-auto w-full"
          :player="player" :ref="getPlayerRefSetter(playeruuid)" :show-history="true"
          :dart-board-ref="dartboardRef ?? undefined" :uuid="playeruuid">
        </Player>
      </div>
      <Dartboard ref="dartboardRef" class="flex-auto w-full" :click-to-add-marker="!spectating"></Dartboard>
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

let { socket, status, data, send, close } = useSocket()

const props = defineProps<{ gameId?: string }>()
const mode = ref('')

const localPlayer = ref<any>(null)
const spectating = ref<boolean>(false)
const players = ref<Map<string, any>>(new Map())
const playerRefs = ref<Map<string, InstanceType<typeof Player> | null>>(new Map())
const dartboardRef = ref<InstanceType<typeof Dartboard> | null>(null)
const playerRefSetters = new Map<string, (el: unknown) => void>()

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
            } else if (data.spectating) {
              spectating.value = true
              resolve(null)
            } else if (!data.spectating) {
              router.replace('/')
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
