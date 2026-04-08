<template>
  <!-- Menu is active - show fullscreen menu -->
  <div class="min-h-screen w-full bg-gradient-to-br from-slate-900 to-slate-950">
    <div class="p-6 max-w-4xl mx-auto">
      <!-- Local Games Mode Selection -->
      <template v-if="!selectedMode">

        <div class="text-2xl font-bold mb-2">Regular modes</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <button v-for="mode in regularModes" :key="mode.value" @click="selectMode(mode, 'local')"
            class="group relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-600 rounded-lg p-6 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 text-left">
            <div class="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 rounded-lg transition-colors"></div>
            <h3 class="text-xl font-bold text-white mb-2 relative">{{ mode.icon }} {{ mode.label }}</h3>
            <p class="text-gray-400 relative text-sm mb-4 min-h-10">{{ mode.desc }}</p>
            <div class="text-blue-400 text-xs font-semibold relative group-hover:text-blue-300">Play →</div>
          </button>
        </div>

        <div class="text-2xl font-bold mb-2">Training modes</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button v-for="mode in trainingModes" :key="mode.value" @click="selectMode(mode, 'training')"
            :class="['group relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 hover:shadow-lg transition-all duration-300 text-left', getTrainingModeClass(mode.value)]">
            <div :class="['absolute inset-0 rounded-lg transition-colors', getTrainingModeBgClass(mode.value)]"></div>
            <h3 class="text-xl font-bold text-white mb-2 relative">{{ mode.icon }} {{ mode.label }}</h3>
            <p class="text-gray-400 relative text-sm mb-4 min-h-10">{{ mode.desc }}</p>
            <div :class="['text-xs font-semibold relative', getTrainingModeTextClass(mode.value)]">Practice →</div>
          </button>
        </div>
      </template>

      <!-- Confirmation Screen -->
      <div v-if="selectedMode" class="animate-in max-w-2xl mx-auto">
        <button @click="cancelSelection()"
          class="text-sm text-gray-400 hover:text-gray-300 mb-6 flex items-center gap-2">
          ← Back to Modes
        </button>

        <div class="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-gray-700 rounded-lg p-8">
          <h2 class="text-3xl font-bold text-white mb-2">{{ selectedMode.icon }} {{ selectedMode.label }}</h2>
          <p class="text-gray-400 text-lg mb-6">{{ selectedMode.desc }}</p>
          
          <FormKit type="form" v-model="selectedModeSettings" :actions="false">
            <FormKitSchema :schema="selectedMode.settingsSchema" />
          </FormKit>

          <div class="flex gap-4">
            <button @click="cancelSelection()"
              class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors">
              Cancel
            </button>
            <button @click="startGame()" :disabled="isStarting"
              class="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 rounded-lg transition-all disabled:cursor-not-allowed">
              {{ isStarting ? 'Starting...' : 'Start Game' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import Dartboard from '@/components/Dartboard.vue'
import Player from '@/components/Player.vue'
import ScoreConfig from '@/components/settings/ScoreConfig.vue'
import getBearer from '@/lib/auth'
import { PlayerActionState } from '@/lib/dartPlayer'
import {
  getTrainingModeClass,
  getTrainingModeBgClass,
  getTrainingModeTextClass,
  regularModes,
  trainingModes,
  type GameMode,
  type ModeSettings,
} from '@/lib/modeInfo'
import useSocket from '@/lib/socket'
import router from '@/router'
import { FormKit, FormKitSchema } from '@formkit/vue'
import { onMounted, ref, watch } from 'vue'

let { socketId, socket, status, data, send, close } = useSocket()

const mode = ref('')

const isSpectating = ref(true)
const players = ref<Map<string, any>>(new Map())
const playerRefs = ref<Map<string, InstanceType<typeof Player> | null>>(new Map())
const dartboardRef = ref<InstanceType<typeof Dartboard> | null>(null)
const playerRefSetters = new Map<string, (el: unknown) => void>()

type SelectedMode = GameMode & { category: 'local' | 'training' }

const selectedMode = ref<SelectedMode | null>(null)
const selectedModeSettings = ref<ModeSettings>({})
const isStarting = ref(false)

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

const selectMode = (mode: GameMode, category: 'local' | 'training') => {
  selectedMode.value = { ...mode, category }
  selectedModeSettings.value = { ...mode.settingsDefaults }
}

const cancelSelection = () => {
  selectedMode.value = null
  selectedModeSettings.value = {}
}

const startGame = async () => {
  if (!selectedMode.value) return

  isStarting.value = true
  try {
    const { category, value } = selectedMode.value

    let url = ''
    let body = {}

    if (category === 'local') {
      // For local games, use the local game endpoint
      url = import.meta.env.VITE_API_BASE_URL + '/create-local/'
      body = { mode: value, settings: selectedModeSettings.value }
    } else {
      // For training, use the training endpoint
      url = import.meta.env.VITE_API_BASE_URL + '/create-training/' + value
      body = { settings: selectedModeSettings.value }
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: getBearer(), 'Content-Type': 'application/json', 'X-Socket-Id': socketId?.value ?? '' },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.gameId) {
      router.replace({ path: '/game/' + data.gameId })
    } else {
      console.error('Failed to start game:', data)
      alert('Failed to start game. Please try again.')
    }
  } catch (err) {
    console.error('Error starting game:', err)
    alert('An error occurred while starting the game.')
  } finally {
    isStarting.value = false
  }
}

</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeIn 0.3s ease-out;
}
</style>

<style scoped></style>
