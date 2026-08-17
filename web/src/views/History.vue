<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiFetch } from '@/lib/api'

interface HistoryEntry {
  gameId: string
  mode: string
  finishedAt: string | null
  isRanked: boolean
  outcome: 'win' | 'loss' | 'practice'
  opponent: { userId: number; username: string } | null
  stats: Record<string, any>
}

const games = ref<HistoryEntry[]>([])
const loading = ref(true)

const outcomeLabel = computed(() => ({
  win: 'Win',
  loss: 'Loss',
  practice: 'Practice',
}))

const outcomeClass = computed(() => ({
  win: 'bg-emerald-500/20 text-emerald-200',
  loss: 'bg-red-500/20 text-red-200',
  practice: 'bg-slate-600/30 text-slate-300',
}))

const prettyMode = (mode: string) => {
  const base = mode.split('/')[0] ?? mode
  if (base === 'standard') return 'Standard'
  if (base === 'checkouts') return 'Checkouts'
  if (base === 'around') return 'Around the Clock'
  if (base === 'target') return 'Target Practice'
  return base
}

const formatDate = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

onMounted(async () => {
  try {
    games.value = await apiFetch<HistoryEntry[]>('/api/stats/history')
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-8 py-10">
    <h1 class="text-3xl font-bold text-white">Game History</h1>
    <p class="mt-1 text-sm text-slate-400">Your recent matches and practice sessions.</p>

    <div class="mt-8 space-y-3">
      <div v-if="loading" class="text-slate-400">Loading…</div>
      <p v-else-if="games.length === 0" class="text-sm text-slate-400">No games yet — start one to see it here.</p>

      <article
        v-for="game in games"
        :key="game.gameId"
        class="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-4"
      >
        <div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-white">{{ prettyMode(game.mode) }}</span>
            <span
              v-if="game.isRanked"
              class="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-200"
            >
              Ranked
            </span>
          </div>
          <p class="mt-0.5 text-xs text-slate-400">
            {{ formatDate(game.finishedAt) }}
            <template v-if="game.opponent"> · vs {{ game.opponent.username }}</template>
            <template v-else> · Solo</template>
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div v-if="game.stats?.avg?.value !== undefined" class="text-right">
            <p class="text-xs text-slate-400">3-dart avg</p>
            <p class="font-mono text-sm font-bold text-white">{{ Number(game.stats.avg.value).toFixed(1) }}</p>
          </div>
          <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="outcomeClass[game.outcome]">
            {{ outcomeLabel[game.outcome] }}
          </span>
        </div>
      </article>
    </div>
  </div>
</template>
