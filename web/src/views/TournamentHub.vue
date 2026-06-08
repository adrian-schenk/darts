<template>
  <div class="mx-auto w-full max-w-7xl px-8 py-10">
    <div class="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section class="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
        <h1 class="text-3xl font-bold text-white">Create Private Tournament</h1>
        <p class="mt-2 text-sm text-slate-300">Set up a private bracket. Matches start automatically once the tournament is full.</p>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">Tournament Name</label>
            <input v-model="form.name" type="text" class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none transition focus:border-cyan-400" placeholder="Friday Night Cup" />
          </div>
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">Max Players</label>
            <input v-model.number="form.maxPlayers" min="2" step="1" type="number" class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none transition focus:border-cyan-400" />
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">Starting Score</label>
            <select v-model.number="form.startingScore" class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none transition focus:border-cyan-400">
              <option :value="501">501</option>
              <option :value="301">301</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">Checkout Mode</label>
            <select v-model="form.checkoutMode" class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none transition focus:border-cyan-400">
              <option value="double-out">Double Out</option>
              <option value="master-out">Master Out</option>
              <option value="open">Open</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">Legs Per Set</label>
            <input v-model.number="form.legs" min="1" step="1" type="number" class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none transition focus:border-cyan-400" />
          </div>
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">Sets (for setup)</label>
            <input v-model.number="form.sets" min="1" step="1" type="number" class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none transition focus:border-cyan-400" />
          </div>
        </div>

        <button
          class="mt-6 inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-900/30 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="creating"
          @click="createPrivateTournament"
        >
          {{ creating ? 'Creating…' : 'Create Tournament' }}
        </button>
      </section>

      <section class="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-6 shadow-2xl shadow-indigo-950/30 backdrop-blur-sm">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-2xl font-bold text-white">Tournaments</h2>
          <button class="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800" @click="loadTournaments">Refresh</button>
        </div>

        <div class="mt-4 flex gap-2">
          <button
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
            :class="filter === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'"
            @click="filter = 'all'"
          >
            All
          </button>
          <button
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
            :class="filter === 'public' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'"
            @click="filter = 'public'"
          >
            Public
          </button>
          <button
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
            :class="filter === 'private' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'"
            @click="filter = 'private'"
          >
            Private
          </button>
        </div>

        <div class="mt-4 space-y-3">
          <article
            v-for="tournament in filteredTournaments"
            :key="tournament.uuid"
            class="rounded-xl border border-slate-700 bg-slate-950/50 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-white">{{ tournament.name }}</h3>
                <p class="text-xs text-slate-400">{{ tournament.mode }} · {{ tournament.playerCount }}/{{ tournament.maxPlayers }} players</p>
              </div>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" :class="statusClass(tournament.status)">{{ tournament.status }}</span>
            </div>

            <div class="mt-3 flex gap-2">
              <button
                v-if="tournament.status === 'open'"
                class="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                @click="joinTournament(tournament.uuid)"
              >
                Join
              </button>
              <button
                class="rounded-lg border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                @click="openTournament(tournament.uuid)"
              >
                Overview
              </button>
            </div>
          </article>

          <p v-if="filteredTournaments.length === 0" class="text-sm text-slate-400">No tournaments found.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import getBearer from '@/lib/auth'
import router from '@/router'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{ defaultFilter?: 'all' | 'private' | 'public' }>()

const creating = ref(false)
const tournaments = ref<any[]>([])
const filter = ref<'all' | 'private' | 'public'>(props.defaultFilter ?? 'all')

const form = ref({
  name: '',
  maxPlayers: 8,
  startingScore: 501,
  checkoutMode: 'double-out',
  legs: 3,
  sets: 2,
})

const filteredTournaments = computed(() => {
  if (filter.value === 'all') return tournaments.value
  if (filter.value === 'private') return tournaments.value.filter((t) => t.isPrivate)
  return tournaments.value.filter((t) => !t.isPrivate)
})

const statusClass = (status: string) => {
  if (status === 'open') return 'bg-amber-500/20 text-amber-200'
  if (status === 'running') return 'bg-blue-500/20 text-blue-200'
  return 'bg-emerald-500/20 text-emerald-200'
}

const loadTournaments = async () => {
  const response = await fetch('/api/tournaments', {
    headers: {
      Authorization: getBearer(),
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  tournaments.value = data.tournaments ?? []
}

const createPrivateTournament = async () => {
  creating.value = true
  try {
    const response = await fetch('/api/tournaments/private', {
      method: 'POST',
      headers: {
        Authorization: getBearer(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: form.value.name,
        maxPlayers: form.value.maxPlayers,
        mode: 'standard',
        settings: {
          gameConfig: {
            startingScore: form.value.startingScore,
            checkoutMode: form.value.checkoutMode,
            legs: form.value.legs,
            sets: form.value.sets,
          },
        },
      }),
    })

    const data = await response.json()
    if (data.success && data.uuid) {
      router.push(`/tournament/${data.uuid}`)
      return
    }

    throw new Error(data?.message ?? 'Could not create tournament')
  } catch (error) {
    console.error(error)
    alert('Could not create tournament')
  } finally {
    creating.value = false
    await loadTournaments()
  }
}

const joinTournament = async (uuid: string) => {
  const response = await fetch(`/api/tournaments/${uuid}/join`, {
    method: 'POST',
    headers: {
      Authorization: getBearer(),
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  if (!data.success) {
    alert(data.message ?? 'Unable to join tournament')
  }

  await loadTournaments()
}

const openTournament = (uuid: string) => {
  router.push(`/tournament/${uuid}`)
}

onMounted(() => {
  loadTournaments()
})
</script>
