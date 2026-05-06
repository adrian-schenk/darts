<script setup lang="ts">
import { useFormKitValue } from '@/lib/formKitHelper'
import { computed, ref, watch } from 'vue'

const props = defineProps(['context'])

const showCustomOption = computed(() => props.context?.node?.props?.showCustomOption ?? true)
const customizableSets = computed(() => props.context?.node?.props?.customizableSets ?? false)

const presetValues = computed<number[]>(() => {
  return (props.context?.node?.props?.presets as number[] | undefined) ?? [501, 301]
})

const scoringDetails = {
  301: { name: '301', description: 'Players start with 301 points and the first to reach exactly 0 wins.' },
  501: { name: '501', description: 'Players start with 501 points and the first to reach exactly 0 wins.' },
}

const startDetails = {
  'straight-in': { name: 'Straight-In', description: 'Players can start scoring with any dart.' },
  'double-in': { name: 'Double-In', description: 'Players must hit a double area to start scoring.' },
  'master-in': { name: 'Master-In', description: 'Players must hit a double, triple or the bullseye to start scoring.' }
}

const checkoutDetails = {
  'open': { name: 'Straight-Out', description: 'Any combination of darts can be used to checkout.' },
  'double-out': { name: 'Double-Out', description: 'The final dart must land in a double area to checkout.' },
  'master-out': { name: 'Master-Out', description: 'The final dart must land in a double, triple or the bullseye to checkout.' }
}
const checkouts = computed<string[]>(() => {
  return (props.context?.node?.props?.checkouts) ?? ['open', 'double-out', 'master-out']
})

const starts = computed<string[]>(() => {
  return (props.context?.node?.props?.starts) ?? ['straight-in', 'double-in', 'master-in']
})

type PlayerConfig = {
  name: string
  startingScore: number
  checkoutMode: string
}

const opponent = useFormKitValue('opponent', props.context?.node);

const selectedValue = ref<number>(501)
const isCustomSelected = ref(false)
const selectedCheckout = ref<string>('double-out')
const selectedStart = ref<string>('straight-in')
const sets = ref<number>(2)
const legs = ref<number>(3)

const players = ref<PlayerConfig[]>([
  { name: 'Player 1', startingScore: 501, checkoutMode: 'double-out' },
  { name: 'Player 2', startingScore: 501, checkoutMode: 'double-out' },
])

const setNodeValue = (value: Record<string, unknown>) => {
  props.context?.node?.input(value)
}

const patchNodeValue = (patch: Record<string, unknown>) => {
  const current = props.context?.node?.value as Record<string, unknown> | undefined
  if (!current) return
  setNodeValue({ ...current, ...patch })
}

const selectScorePreset = (preset: number) => {
  isCustomSelected.value = false
  selectedValue.value = preset
  setNodeValue({ startingScore: preset, checkoutMode: selectedCheckout.value })
}

const selectCustomScore = () => {
  isCustomSelected.value = true
  setNodeValue({ players: players.value })
}

const selectCheckout = (checkout: string) => {
  selectedCheckout.value = checkout
  setNodeValue({ startingScore: selectedValue.value, checkoutMode: checkout })
}

const selectStart = (start: string) => {
  selectedStart.value = start
  setNodeValue({ startMode: start })
}

watch(players, () => {
  if (!isCustomSelected.value) return
  setNodeValue({ players: players.value })
}, { deep: true })

watch(sets, (val) => patchNodeValue({ sets: val }))
watch(legs, (val) => patchNodeValue({ legs: val }))
</script>

<template>
  <div class="w-full">
    <!-- Scoring presets -->
    <div>
      <div class="text-sm font-semibold text-gray-300 my-2">Scoring</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        <button v-for="preset in presetValues" :key="preset" :class="[
          'relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 transition-all duration-300 text-left',
          !isCustomSelected && selectedValue === preset
            ? 'border-cyan-300 shadow-lg shadow-cyan-500/40'
            : 'border-blue-600 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50'
        ]" @click="() => { selectScorePreset(preset) }" type="button">
          <div class="text-xl font-bold text-white mb-2 relative">{{ preset }}</div>
          <div class="text-gray-400 relative text-sm mb-4 min-h-10">{{ scoringDetails[preset].description }}</div>
        </button>
        <button v-if="showCustomOption" @click="() => { selectCustomScore() }" type="button" :class="[
          'relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 transition-all duration-300 text-left',
          isCustomSelected
            ? 'border-cyan-300 shadow-lg shadow-cyan-500/40'
            : 'border-blue-600 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50'
        ]">
          <div class="text-xl font-bold text-white mb-2 relative">Custom</div>
          <div class="text-gray-400 relative text-sm mb-4 min-h-10">Configure per-player settings</div>
        </button>
      </div>
    </div>

    <!-- Shared config (non-custom presets) -->
    <div v-if="!isCustomSelected">
      <div class="text-sm font-semibold text-gray-300 my-2">Start</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        <button v-for="start in starts" :key="start" :class="[
          'relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 transition-all duration-300 text-left',
          selectedStart === start
            ? 'border-cyan-300 shadow-lg shadow-cyan-500/40'
            : 'border-blue-600 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50'
        ]" @click="() => { selectStart(start) }" type="button">
          <div class="text-xl font-bold text-white mb-2 relative">{{ startDetails[start].name }}</div>
          <div class="text-gray-400 relative text-sm mb-4 min-h-10">{{ startDetails[start].description }}</div>
        </button>
      </div>
    </div>

    <div v-if="!isCustomSelected">
      <div class="text-sm font-semibold text-gray-300 my-2">Checkout</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        <button v-for="checkout in checkouts" :key="checkout" :class="[
          'relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 transition-all duration-300 text-left',
          selectedCheckout === checkout
            ? 'border-cyan-300 shadow-lg shadow-cyan-500/40'
            : 'border-blue-600 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50'
        ]" @click="() => { selectCheckout(checkout) }" type="button">
          <div class="text-xl font-bold text-white mb-2 relative">{{ checkoutDetails[checkout].name }}</div>
          <div class="text-gray-400 relative text-sm mb-4 min-h-10">{{ checkoutDetails[checkout].description }}</div>
        </button>
      </div>
    </div>

    <!-- Per-player custom config -->
    <div v-if="isCustomSelected" class="mt-4 flex flex-col gap-6">
      <div v-for="(player, index) in players" :key="index"
        class="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-700 rounded-lg p-5">
        <div class="text-sm font-semibold text-cyan-300 mb-4">Player {{ index + 1 }} {{ index == 0 && opponent.type !== 'local' ? '(You)' : '' }}</div>

        <label class="block text-xs text-gray-400 mb-1" v-if="opponent.type === 'local'">Name</label>
        <input type="text" v-model="player.name" v-if="opponent.type === 'local'"
          class="w-full mb-4 px-4 py-2 border-gray-600 border-2 rounded bg-slate-900/70 text-white" />

        <label class="block text-xs text-gray-400 mb-1">Starting Score</label>
        <input type="number" v-model.number="player.startingScore"
          class="w-full mb-4 px-4 py-2 border-gray-600 border-2 rounded bg-slate-900/70 text-white" />

       <label class="block text-xs text-gray-400 mb-2">Start</label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button v-for="start in starts" :key="start" type="button" :class="[
            'bg-gradient-to-br from-slate-700 to-slate-800 border-2 rounded-lg p-3 transition-all duration-200 text-left',
            player.startMode === start
              ? 'border-cyan-300 shadow-lg shadow-cyan-500/40'
              : 'border-blue-700 hover:border-blue-400'
          ]" @click="player.startMode = start">
            <div class="text-sm font-bold text-white">{{ startDetails[start].name }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ startDetails[start].description }}</div>
          </button>
        </div>

        <label class="block text-xs text-gray-400 mb-2">Checkout</label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button v-for="checkout in checkouts" :key="checkout" type="button" :class="[
            'bg-gradient-to-br from-slate-700 to-slate-800 border-2 rounded-lg p-3 transition-all duration-200 text-left',
            player.checkoutMode === checkout
              ? 'border-cyan-300 shadow-lg shadow-cyan-500/40'
              : 'border-blue-700 hover:border-blue-400'
          ]" @click="player.checkoutMode = checkout">
            <div class="text-sm font-bold text-white">{{ checkoutDetails[checkout].name }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ checkoutDetails[checkout].description }}</div>
          </button>
        </div>
      </div>
    </div>

    <div v-if="customizableSets">
      <div class="text-sm font-semibold text-gray-300 my-2">Sets / Legs</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 w-full">
        <label for="sets" class="block text-xs text-gray-400 mb-1">Number of Sets</label>
        <input id="sets" type="number" v-model.number="sets"
          class="w-full mb-4 px-4 py-2 border-gray-600 border-2 rounded bg-slate-900/70 text-white" />
        <label for="legs" class="block text-xs text-gray-400 mb-1">Number of Legs</label>
        <input id="legs" type="number" v-model.number="legs"
          class="w-full mb-4 px-4 py-2 border-gray-600 border-2 rounded bg-slate-900/70 text-white" />
      </div>
    </div>
  </div>
</template>
