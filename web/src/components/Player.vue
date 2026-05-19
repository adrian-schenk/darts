<template>
  <div
    class="relative p-6 flex flex-col justify-center items-center rounded-lg bg-gray-800"
    :class="PlayerInterface.state.value === PlayerActionState.IDLE ? 'opacity-50' : ''"
  >
    <slot />
    <div v-if="props.capabilities.showPlayerTime && PlayerInterface.state.value === PlayerActionState.THROW_DARTS" class="absolute top-3 right-3 flex items-center gap-2">
      <button
        v-if="PlayerInterface.state.value == PlayerActionState.THROW_DARTS && props.capabilities.timeoutPossible && props.isOwnPlayer"
        class="rounded-full border border-slate-500/40 bg-slate-800/80 p-2 text-slate-200 transition hover:bg-slate-700/90 hover:text-white cursor-pointer"
        @click="PlayerInterface.requestTimeout()"
      >
        <pause-circle class="h-5 w-5"></pause-circle>
      </button>
      <div class="flex items-center gap-2 rounded-full border border-slate-500/50 bg-slate-900/70 px-3 py-1.5 backdrop-blur-sm shadow-md">
        <div
          :class="[
            'h-2.5 w-2.5 rounded-full',
            remainingTimeDotClass,
            PlayerInterface.remainingTime.value !== null && PlayerInterface.remainingTime.value <= 5
              ? 'animate-pulse'
              : '',
          ]"
        ></div>
        <div class="font-mono text-base font-bold tabular-nums" :class="remainingTimeTextClass">
          {{ formattedRemainingTime }}
        </div>
      </div>
    </div>
    <div v-if="props.capabilities.showStats.player.showName" class="text-4xl text-white font-bold my-4">
      {{ props.player.playerName }}
    </div>
    <div
      v-if="props.capabilities.showStats.player.showSets"
      class="flex justify-center items-center mt-4 text-gray-400"
    >
      <div class="m-4">{{ PlayerInterface.getPlayerStat('sets') }} sets</div>
      <div class="h-8 border-l border-gray-600 mx-4"></div>
      <div class="m-4">{{ PlayerInterface.getPlayerStat('legs') }} legs</div>
    </div>
    <div v-if="PlayerInterface.state.value !== PlayerActionState.REMOVE_DARTS_WON" :class="['text-8xl text-white my-4 font-bold', PlayerInterface.currentTargetHit.value ? 'text-green-500!' : '']">{{ PlayerInterface.score.value != null ? PlayerInterface.score : PlayerInterface.getCurrentTarget() }}</div>
    <template v-else>
      <div class="bg-slate-700 top-1/2 w-1/2 h-22 flex flex-col items-center justify-center rounded-xl">
        <p class="text-white text-2xl font-bold">{{ props.player.playerName }}</p>
        <p class="text-grey font-bold">has won the leg!</p>
      </div>
    </template>
    <div class="flex justify-center items-center gap-2 mt-4 text-gray-400">
      <div
        v-if="!PlayerInterface.currentTarget.value"
        v-for="i in 3"
        :key="i"
        class="w-32 h-24 rounded-md flex flex-col items-center justify-center"
        :class="
          (PlayerInterface.throws.value[i - 1] as Throw).field !== ''
            ? (PlayerInterface.throws.value[i - 1] as Throw).score > 0 &&
              !(PlayerInterface.throws.value[i - 1] as Throw).invalid
              ? 'bg-green-400'
              : 'bg-slate-600'
            : 'bg-slate-600'
        "
      >
        <template
          v-if="
            PlayerInterface.throws.value[i - 1] &&
            (PlayerInterface.throws.value[i - 1] as Throw).score > 0 &&
            !(PlayerInterface.throws.value[i - 1] as Throw).invalid
          "
        >
          <div class="text-2xl font-bold text-white">
            {{ (PlayerInterface.throws.value[i - 1] as Throw).score }}
          </div>
          <div class="text-sm text-white">
            {{ (PlayerInterface.throws.value[i - 1] as Throw).field }}
          </div>
        </template>
        <template v-else>
          <div
            v-if="
              (PlayerInterface.throws.value[i - 1] as Throw).field === '' &&
              PlayerInterface.checkoutCombination.value[i - 1]
            "
            class="flex flex-col items-center justify-center w-full h-full"
          >
            <span class="text-gray-300 text-lg font-bold">{{
              PlayerInterface.checkoutCombination.value[i - 1]
            }}</span>
          </div>
          <div v-else class="text-xl font-bold text-red-500">
            {{ (PlayerInterface.throws.value[i - 1] as Throw).field }}
          </div>
        </template>
      </div>
      <template v-if="PlayerInterface.state.value === PlayerActionState.REMOVE_DARTS">
        <div
          class="absolute bg-slate-700/80 top-1/2 -translate-y-1/2 w-full h-24 flex flex-col items-center justify-center"
        >
          <p class="text-yellow-500 font-bold">Removing darts</p>
        </div>
      </template>
    </div>
    <div
      v-if="showHistory"
      class="absolute top-1/2 -translate-y-1/2 left-4 h-40 w-18 text-sm text-gray-400 rounded-md px-2 py-1 overflow-hidden overflow-y-auto"
    >
      <div
        v-for="(score, index) in PlayerInterface.scoreLog.value"
        :key="index"
        class="flex items-center"
      >
        <div
          :class="
            index === 0
              ? 'w-3 h-3 bg-green-500 rounded-full'
              : 'w-3 h-3 bg-gray-500 rounded-full opacity-50'
          "
          class="mr-2"
        ></div>
        <div :class="index === 0 ? 'text-white' : 'text-gray-400'">{{ score }}</div>
      </div>
    </div>
    <div class="flex justify-center items-center mt-4 text-gray-400">
      <template v-for="([key], i) in visibleStatsEntries" :key="key">
        <div v-if="i > 0" class="h-8 w-px bg-gray-600"></div>
        <div class="flex flex-col justify-center items-center px-4">
          <div class="text-sm mt-2">{{ PlayerInterface.getStatsName(key as string) }}</div>
          <div class="text-white text-xl font-extrabold">
            {{ PlayerInterface.getDataStat(key as string) }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { DartPlayer, PlayerActionState } from '@/lib/dartPlayer.ts'
import type { Throw } from '@/lib/dart'
import { PauseCircle } from 'lucide-vue-next'

const props = defineProps({
  player: { type: Object, required: true },
  capabilities: { type: Object, default: () => ({}) },
  showHistory: { type: Boolean, default: true },
  uuid: { type: String, default: '' },
  isOwnPlayer: { type: Boolean, default: false },
  dartBoardRef: { type: Object, default: null },
})

const PlayerInterface = new DartPlayer({
  uuid: props.uuid,
  name: '',
  dartboardRef: props.dartBoardRef,
})

const formattedRemainingTime = computed(() => {
  const timeLeft = PlayerInterface.remainingTime.value
  if (timeLeft === null || Number.isNaN(timeLeft)) return '--:--'

  const totalSeconds = Math.max(0, Math.floor(timeLeft))
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
})

const remainingTimeTextClass = computed(() => {
  const timeLeft = PlayerInterface.remainingTime.value
  if (timeLeft === null) return 'text-slate-200'
  if (timeLeft <= 5) return 'text-red-300'
  if (timeLeft <= 10) return 'text-amber-300'
  return 'text-emerald-300'
})

const remainingTimeDotClass = computed(() => {
  const timeLeft = PlayerInterface.remainingTime.value
  if (timeLeft === null) return 'bg-slate-300'
  if (timeLeft <= 5) return 'bg-red-400'
  if (timeLeft <= 10) return 'bg-amber-400'
  return 'bg-emerald-400'
})

const visibleStatsEntries = computed(() =>
  Object.entries(props.capabilities.showStats.data ?? {}).filter(([, isVisible]) => isVisible),
)

watch(
  () => props.dartBoardRef,
  (dartBoardRef) => {
    PlayerInterface.boardRef = dartBoardRef
  },
  { immediate: true },
)

watch(
  () => props.uuid,
  (uuid) => {
    PlayerInterface.uuid = uuid
    PlayerInterface.info.uuid = uuid
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  PlayerInterface.dispose()
})

defineExpose({
  PlayerInterface,
})
</script>
