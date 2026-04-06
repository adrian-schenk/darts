<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps(['context'])

const showCustomOption = computed(() => props.context?.node?.props?.showCustomOption ?? true)

const presetValues = computed<number[]>(() => {
  return (props.context?.node?.props?.presets as number[] | undefined) ?? [501, 301]
})

const checkoutDetails = {
  'open': { name: 'Open', description: 'Any combination of darts can be used to checkout.' },
  'double-out': { name: 'Double-Out', description: 'The final dart must land in a double area to checkout.' },
  'master-out': { name: 'Master-Out', description: 'The final dart must land in a double, triple or the bullseye to checkout.' }
}
const checkouts = computed(() => {
  return (props.context?.node?.props?.checkouts) ?? ['open', 'double-out', 'master-out']
})

const selectedValue = ref<number>(501)
const isCustomSelected = ref(false)
const customInput = ref<number>(501)
const selectedCheckout = ref<string>('double-out')

const patchNodeValue = (patch: Record<string, unknown>) => {
  const currentValue = props.context?.node?.value
  const nextValue = currentValue && typeof currentValue === 'object'
    ? { ...currentValue, ...patch }
    : patch
  props.context?.node?.input(nextValue)
}

const setNodeScoreValue = (value: number) => {
  selectedValue.value = value
  patchNodeValue({ startingScore: value })
}

const selectScorePreset = (preset: number) => {
  isCustomSelected.value = false
  setNodeScoreValue(preset)
}

const selectCustomScore = () => {
  isCustomSelected.value = true
}

const selectCheckout = (checkout: string) => {
  selectedCheckout.value = checkout
  patchNodeValue({ checkoutMode: checkout })
}

const onCustomScoreInput = () => {
  if (!Number.isFinite(customInput.value) || customInput.value < 1) return
  setNodeScoreValue(customInput.value)
}
</script>

<template>
  <div class="w-full">
    <div class="text-sm font-semibold text-gray-300 my-2">Scoring</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      <button v-for="preset in presetValues" :key="preset" :class="[
        'relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 transition-all duration-300 text-left',
        !isCustomSelected && selectedValue === preset
          ? 'border-cyan-300 shadow-lg shadow-cyan-500/40'
          : 'border-blue-600 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50'
      ]" @click="() => { selectScorePreset(preset) }" type="button">
        <div class="text-xl font-bold text-white mb-2 relative">{{ preset }}</div>
        <div class="text-gray-400 relative text-sm mb-4 min-h-10">{{ preset }}</div>
      </button>
      <button v-if="showCustomOption" @click="() => { selectCustomScore() }" type="button" :class="[
        'relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 transition-all duration-300 text-left',
        isCustomSelected
          ? 'border-cyan-300 shadow-lg shadow-cyan-500/40'
          : 'border-blue-600 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50'
      ]">
        <div class="text-xl font-bold text-white mb-2 relative">Custom</div>
        <div class="text-gray-400 relative text-sm mb-4 min-h-10">Enter a custom score</div>
      </button>
    </div>
    <div v-if="showCustomOption && isCustomSelected" class="w-full">
      <input type="number" v-model.number="customInput" @input="onCustomScoreInput"
        class="w-full mt-4 px-4 py-2 border-gray-600 border-2 rounded bg-slate-900/70 text-white" />
    </div>

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
</template>
