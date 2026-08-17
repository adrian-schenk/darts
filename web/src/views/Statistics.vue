<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiFetch } from '@/lib/api'

interface Overview {
  gamesPlayed: number
  wins: number
  losses: number
  winRate: number
  average: number | null
  bestCheckout: number | null
  checkoutPercentage: number | null
  elo: number
}

const overview = ref<Overview | null>(null)
const loading = ref(true)

const formatPercent = (value: number | null) => {
  if (value === null) return '—'
  return `${(value * 100).toFixed(0)}%`
}

const formatAverage = (value: number | null) => {
  if (value === null) return '—'
  return value.toFixed(1)
}

onMounted(async () => {
  try {
    overview.value = await apiFetch<Overview>('/api/stats/overview')
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-8 py-10">
    <h1 class="text-3xl font-bold text-white">Statistics</h1>
    <p class="mt-1 text-sm text-slate-400">Your performance across all matches.</p>

    <div v-if="loading" class="mt-8 text-slate-400">Loading…</div>

    <div v-else-if="overview" class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <p class="text-xs uppercase tracking-wide text-slate-400">Rating (Elo)</p>
        <p class="mt-2 text-3xl font-bold text-white">{{ overview.elo }}</p>
      </div>
      <div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <p class="text-xs uppercase tracking-wide text-slate-400">Games Played</p>
        <p class="mt-2 text-3xl font-bold text-white">{{ overview.gamesPlayed }}</p>
      </div>
      <div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <p class="text-xs uppercase tracking-wide text-slate-400">Win Rate</p>
        <p class="mt-2 text-3xl font-bold text-white">{{ formatPercent(overview.winRate) }}</p>
        <p class="text-sm text-slate-400">{{ overview.wins }}W · {{ overview.losses }}L</p>
      </div>
      <div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <p class="text-xs uppercase tracking-wide text-slate-400">3-Dart Average</p>
        <p class="mt-2 text-3xl font-bold text-white">{{ formatAverage(overview.average) }}</p>
      </div>
      <div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <p class="text-xs uppercase tracking-wide text-slate-400">Best Checkout</p>
        <p class="mt-2 text-3xl font-bold text-white">{{ overview.bestCheckout ?? '—' }}</p>
      </div>
      <div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <p class="text-xs uppercase tracking-wide text-slate-400">Checkout Rate</p>
        <p class="mt-2 text-3xl font-bold text-white">{{ formatPercent(overview.checkoutPercentage) }}</p>
      </div>
    </div>
  </div>
</template>
