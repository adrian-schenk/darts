<script setup lang="ts">
import type { FormKitContextLike } from '@/lib/types';
import { getBotDifficultyColors } from '@/lib/modeInfo'
import { computed, nextTick, ref, watch } from 'vue'

export type EnemyConfigProps = {
  name: string,
  label: string,
  icon: string,
  description: string
};

type BotDifficulty = 'auto' | 'easy' | 'medium' | 'hard'

const botDifficulties: Array<{ value: BotDifficulty; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const props = defineProps(['context']);

const presetValues = computed<any>(() => {
  if (props.context?.node?.props?.presets) return props.context?.node?.props?.presets
  return []
})

const selectedType = ref<string>('')
const selectedDifficulty = ref<BotDifficulty>('auto')

const setValue = (type: string, difficulty?: BotDifficulty) => {
  if (type === 'bot') {
    props.context?.node?.input({ type, difficulty: difficulty ?? selectedDifficulty.value })
    return
  }
  props.context?.node?.input({ type })
}

const selectPreset = (preset: EnemyConfigProps) => {
  selectedType.value = preset.name
  setValue(preset.name)
}

const selectDifficulty = (difficulty: BotDifficulty) => {
  selectedDifficulty.value = difficulty
  if (selectedType.value === 'bot') {
    setValue('bot', difficulty)
  }
}

const getDifficultyClass = (difficulty: BotDifficulty) => {
  const colors = getBotDifficultyColors(difficulty)
  if (selectedDifficulty.value === difficulty) {
    return `${colors.selected} shadow-lg`
  }
  return `${colors.normal} ${colors.hovered}`
}

watch(props.context?.node?.props?.presets, (newVal) => {
  setValue(newVal?.[0]?.name ?? '')
  selectedType.value = newVal?.[0]?.name ?? ''
}, { immediate: true })

</script>

<template>
  <div class="w-full">
    <div class="text-sm font-semibold text-gray-300 my-2">Opponent</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      <button v-for="preset in presetValues" :key="preset.name" :class="[
        'relative rounded-lg p-6 transition-all duration-300 text-left border-2 bg-gradient-to-br from-slate-800 to-slate-900',
        selectedType === preset.name
          ? 'border-cyan-300 shadow-lg shadow-cyan-500/40'
          : 'border-blue-600 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50'
      ]" @click="() => { selectPreset(preset) }" type="button">
        <div class="text-xl font-bold text-white mb-2 relative">{{ preset.label }}</div>
        <div class="text-gray-400 relative text-sm mb-4 min-h-10">{{ preset.description }}</div>
      </button>
    </div>

    <div v-if="selectedType === 'bot'" class="w-full">
      <div class="text-sm font-semibold text-gray-300 my-2">Bot Difficulty</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
        <button v-for="difficulty in botDifficulties" :key="difficulty.value" type="button" :class="[
          'rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-200',
          getDifficultyClass(difficulty.value)
        ]" @click="selectDifficulty(difficulty.value)">
          {{ difficulty.label }}
        </button>
      </div>
    </div>
  </div>
</template>
