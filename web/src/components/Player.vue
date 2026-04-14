<template>
  <div
    class="relative p-6 flex flex-col justify-center items-center rounded-lg bg-gray-800"
    :class="PlayerInterface.state.value === PlayerActionState.IDLE ? 'opacity-50' : ''"
  >
    <slot />
    <div v-if="props.player.showStats.player.showName" class="text-4xl text-white font-bold">
      {{ props.player.playerName }}
    </div>
    <div
      v-if="props.player.showStats.player.showSets"
      class="flex justify-center items-center mt-4 text-gray-400"
    >
      <div class="m-4">{{ PlayerInterface.getPlayerStat('sets') }} sets</div>
      <div class="h-8 border-l border-gray-600 mx-4"></div>
      <div class="m-4">{{ PlayerInterface.getPlayerStat('legs') }} legs</div>
    </div>
    <div :class="['text-8xl text-white my-4 font-bold', PlayerInterface.currentTargetHit.value ? 'text-green-500!' : '']">{{ PlayerInterface.score.value != null ? PlayerInterface.score : PlayerInterface.getCurrentTarget() }}</div>
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

const props = defineProps({
  player: { type: Object, required: true },
  showHistory: { type: Boolean, default: true },
  uuid: { type: String, default: '' },
  dartBoardRef: { type: Object, default: null },
})

const PlayerInterface = new DartPlayer({
  uuid: props.uuid,
  name: '',
  dartboardRef: props.dartBoardRef,
})

const visibleStatsEntries = computed(() =>
  Object.entries(props.player.showStats.data ?? {}).filter(([, isVisible]) => isVisible),
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
