<template>
  <div class="relative p-6 flex flex-col justify-center items-center rounded-lg bg-gray-800">
    <div v-if="showName" class="text-4xl text-white font-bold">Player name</div>
    <div v-if="showSets" class="flex justify-center items-center mt-4 text-gray-400">
      <div class="m-4">0 sets</div>
      <div class="h-8 border-l border-gray-600 mx-4"></div>
      <div class="m-4">0 legs</div>
    </div>
    <div class="text-8xl text-white my-4 font-bold">{{ PlayerInterface.score }}</div>
    <div class="flex justify-center items-center gap-2 mt-4 text-gray-400">
      <template v-if="PlayerInterface.state.value != PlayerState.REMOVE_DARTS">
        <div
          v-for="(t, i) in PlayerInterface.throws.value"
          :key="i"
          class="w-32 h-24 rounded-md flex flex-col items-center justify-center"
          :class="t.field !== '' ? (t.score > 0 ? 'bg-green-400' : 'bg-slate-600') : 'bg-slate-600'"
        >
          <template v-if="t && t.score > 0">
            <div class="text-2xl font-bold text-white">
              {{ t.score }}
            </div>
            <div class="text-sm text-white">
              {{ t.field }}
            </div>
          </template>
          <template v-else>
            <div class="text-xl font-bold text-red-500">
              {{ t.field }}
            </div>
          </template>
        </div>
      </template>
      <template v-else>
        <div class="w-full w-32 h-24 rounded-md flex flex-col items-center justify-center"><p class="text-yellow-500 font-bold">Remove darts</p></div>
      </template>
    </div>
    <div v-if="showHistory"
         class="absolute top-1/2 -translate-y-1/2 left-4 h-40 w-18 text-sm text-gray-400 rounded-md px-2 py-1 overflow-hidden overflow-y-auto">
      <div v-for="(score, index) in PlayerInterface.scoreLog.value" :key="index"
           class="flex items-center">
        <div
          :class="index === 0 ? 'w-3 h-3 bg-green-500 rounded-full' : 'w-3 h-3 bg-gray-500 rounded-full opacity-50'"
          class="mr-2"></div>
        <div :class="index === 0 ? 'text-white' : 'text-gray-400'">{{ score }}</div>
      </div>
    </div>
    <div class="flex justify-center items-center gap-4 mt-4 text-gray-400">
      <div v-if="showAvg" class="flex flex-col justify-center items-center">
        <div class="text-sm mt-2">Average</div>
        <div class="text-white text-xl font-extrabold">45</div>
      </div>
      <div v-if="showAvg" class="h-8 border-l border-gray-600 mx-4"></div>
      <div v-if="showAvg" class="flex flex-col justify-center items-center">
        <div class="text-sm mt-2">First 6 Avg.</div>
        <div class="text-white text-xl font-extrabold">44</div>
      </div>
      <div v-if="showAvg" class="h-8 border-l border-gray-600 mx-4"></div>
      <div class="flex flex-col justify-center items-center">
        <div class="text-sm mt-2">Highest Finish</div>
        <div class="text-white text-xl font-extrabold">65</div>
      </div>
      <div class="h-8 border-l border-gray-600 mx-4"></div>
      <div class="flex flex-col justify-center items-center">
        <div class="text-sm mt-2">Checkout</div>
        <div class="text-white text-xl font-extrabold">10%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from "vue";
import type {Throw} from '@/lib/dart.js'
import {DartPlayer, PlayerState} from "@/lib/dartPlayer.ts";
import Player from "./Player.vue";
import Dartboard from "@/components/Dartboard.vue";

const {
  showName = true,
  showSets = true,
  showAvg = true,
  showHistory = true,
  initialScore = 501,
  dartBoardRef = null
} = defineProps({
  showName: Boolean,
  showSets: Boolean,
  showAvg: Boolean,
  showHistory: Boolean,
  initialScore: Number,
  dartBoardRef: Dartboard
})

const PlayerInterface = new DartPlayer({
  name: '',
  initialScore: 501,
  dartboardRef: dartBoardRef
});

defineExpose({
  PlayerInterface
})

</script>
