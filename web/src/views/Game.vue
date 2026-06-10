<template>
  <div v-if="props.gameId" class="w-full mx-auto">
    <BullingOff
      v-show="currentGameState === 'BULLING_OFF'"
      :players="players"
      :player-states="bullingOffPlayerStates"
      :current-player="bullingOffCurrentPlayer"
      :local-player="localPlayer"
    />
    <div v-show="currentGameState !== 'BULLING_OFF'" class="flex flex-col gap-4 w-full h-full flex-auto">
      <div class="flex flex-row gap-4">
        <Player v-for="[playeruuid, player] of players" :key="playeruuid" class="flex-auto h-auto w-full"
          :player="player" :capabilities="gameCapabilities" :ref="getPlayerRefSetter(playeruuid)" :show-history="true"
          :dart-board-ref="dartboardRef ?? undefined" :uuid="playeruuid" :is-own-player="playeruuid == localPlayer">
        </Player>
      </div>
      <Dartboard ref="dartboardRef" class="flex-auto w-full" :click-to-add-marker="!spectating" :uuid="localPlayer"></Dartboard>
    </div>
  </div>
  <RouterView />
</template>

<script setup lang="ts">
import BullingOff from '@/components/BullingOff.vue'
import Dartboard from '@/components/Dartboard.vue'
import Player from '@/components/Player.vue'
import getBearer from '@/lib/auth'
import useSocket from '@/lib/socket'
import router from '@/router'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, routerViewLocationKey } from 'vue-router'
import { toast } from 'vue-sonner'

let { socket, status, data, send, close } = useSocket()

const props = defineProps<{ gameId?: string }>()
const mode = ref('')
const tournamentUuid = ref<string | null>(null)
let returnTimeout: ReturnType<typeof setTimeout> | null = null

const localPlayer = ref<any>(null)
const spectating = ref<boolean>(false)
const gameCapabilities = ref<any>(null)
const currentGameState = ref<any>(null)
const players = ref<Map<string, any>>(new Map())
const playerRefs = ref<Map<string, InstanceType<typeof Player> | null>>(new Map())
const dartboardRef = ref<InstanceType<typeof Dartboard> | null>(null)
const playerRefSetters = new Map<string, (el: unknown) => void>()

const bullingOffCurrentPlayer = ref<string>('')
const bullingOffPlayerStates = ref<Record<string, any>>({})

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
          tournamentUuid.value = data.tournamentUuid ?? null
        }
        
        socket.on('game-joined', (playerUpdates: any, capabilities: any, state: any) => {
          const nextPlayers = new Map<string, any>()

          for (const [uuid, player] of Object.entries(playerUpdates ?? {})) {
            if (!player || typeof player !== 'object') {
              continue
            }

            nextPlayers.set(uuid, player)
          }

          players.value = nextPlayers
          gameCapabilities.value = capabilities
          currentGameState.value = state

          console.log(players.value)
        })

        socket.on('game-event', (state: any) => {
          currentGameState.value = state
        })

        socket.on('player-event', (currentPlayer: string, playerStates: any) => {
          bullingOffCurrentPlayer.value = currentPlayer
          bullingOffPlayerStates.value = playerStates
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

watch(
  () => gameCapabilities.value?.finished,
  (finished) => {
    if (!finished || !tournamentUuid.value || returnTimeout) {
      return
    }

    toast.success('Returning to tournament overview in 5 seconds...')
    returnTimeout = setTimeout(() => {
      router.replace(`/tournament/${tournamentUuid.value}`)
    }, 5000)
  },
)

onBeforeUnmount(() => {
  if (returnTimeout) {
    clearTimeout(returnTimeout)
    returnTimeout = null
  }
})


</script>

<style scoped></style>
