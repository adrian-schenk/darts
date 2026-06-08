<template>
  <div class="mx-auto w-full max-w-[1500px] px-8 py-8" v-if="tournament">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-white">{{ tournament.name }}</h1>
        <p class="text-sm text-slate-300">{{ tournament.playerCount }}/{{ tournament.maxPlayers }} players · {{ tournament.status }}</p>
      </div>
      <button class="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800" @click="loadOverview">
        Refresh
      </button>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
      <div class="bracket flex min-w-[1000px] gap-14 pb-3">
        <div class="round players">
          <h2 class="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Players</h2>
          <div class="space-y-3">
            <div v-for="player in tournament.players" :key="player.id" class="player-pill">
              {{ player.name }}
            </div>
          </div>
        </div>

        <div v-for="round in tournament.rounds" :key="round.index" class="round">
          <h2 class="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Round {{ round.index }}</h2>
          <div class="space-y-5">
            <div v-for="match in round.matches" :key="match.id" class="match-wrap">
              <button
                class="match-card"
                :class="matchButtonClass(match)"
                :disabled="!canSpectate(match)"
                @click="spectateMatch(match)"
              >
                <div class="line-item">{{ match.players[0] ?? '?' }}</div>
                <div class="line-item">{{ match.players[1] ?? '?' }}</div>
                <div class="winner">
                  Winner: <span class="font-semibold">{{ match.winnerName ?? '?' }}</span>
                </div>
                <div class="text-[10px] uppercase tracking-wide text-slate-400">{{ match.status }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="px-8 py-8 text-slate-300">Loading tournament…</div>
</template>

<script setup lang="ts">
import getBearer from '@/lib/auth'
import router from '@/router'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ uuid: string }>()

const tournament = ref<any | null>(null)
let poller: ReturnType<typeof setInterval> | null = null

const loadOverview = async () => {
  const response = await fetch(`/api/tournaments/${props.uuid}`, {
    headers: {
      Authorization: getBearer(),
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  if (data.success) {
    tournament.value = data.tournament
    return
  }

  router.replace('/home')
}

const canSpectate = (match: any) => {
  return !!match.gameId && match.status === 'running' && !match.winnerId
}

const spectateMatch = (match: any) => {
  if (!canSpectate(match)) {
    return
  }
  router.push(`/game/${match.gameId}`)
}

const matchButtonClass = (match: any) => {
  if (canSpectate(match)) {
    return 'match-running'
  }
  if (match.winnerId) {
    return 'match-finished'
  }
  return 'match-pending'
}

onMounted(async () => {
  await loadOverview()
  poller = setInterval(loadOverview, 3000)
})

onBeforeUnmount(() => {
  if (poller) {
    clearInterval(poller)
  }
})
</script>

<style scoped>
.bracket {
  position: relative;
}

.round {
  position: relative;
  min-width: 240px;
}

.round::after {
  content: '';
  position: absolute;
  top: 44px;
  right: -28px;
  width: 20px;
  height: calc(100% - 44px);
  border-right: 2px solid rgba(148, 163, 184, 0.35);
}

.round:last-child::after {
  display: none;
}

.player-pill {
  border: 1px solid rgba(100, 116, 139, 0.8);
  background: rgba(15, 23, 42, 0.8);
  color: #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.65rem 0.8rem;
  font-size: 0.85rem;
}

.match-wrap {
  position: relative;
}

.match-wrap::before {
  content: '';
  position: absolute;
  left: -22px;
  top: 50%;
  width: 18px;
  border-top: 2px solid rgba(148, 163, 184, 0.35);
}

.match-card {
  width: 100%;
  border-radius: 0.9rem;
  border: 1px solid rgba(100, 116, 139, 0.7);
  background: rgba(15, 23, 42, 0.9);
  padding: 0.75rem;
  text-align: left;
  transition: 180ms ease;
}

.match-running {
  border-color: rgba(34, 211, 238, 0.8);
  box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.4);
}

.match-running:hover {
  transform: translateY(-1px);
  background: rgba(8, 47, 73, 0.9);
}

.match-finished {
  border-color: rgba(16, 185, 129, 0.7);
}

.match-pending {
  opacity: 0.9;
}

.line-item {
  color: #e2e8f0;
  font-size: 0.85rem;
  padding: 0.2rem 0;
}

.winner {
  margin-top: 0.45rem;
  color: #cbd5e1;
  font-size: 0.75rem;
}
</style>
