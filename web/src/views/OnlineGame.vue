<template>
    <BackgroundCentered>
        <div class="text-2xl font-bold mb-2">Play Online</div>

        <FormKit type="form" v-model="settings" :actions="false">
            <div class="text-sm font-semibold text-gray-300 my-2">Game Type</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button type="button" @click="settings.type = 'unranked'"
                    :class="['relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 transition-all duration-300 text-left', settings.type === 'unranked' ? 'border-cyan-300 shadow-lg shadow-cyan-500/40' : 'border-slate-600 opacity-60']"><ButtonTitle>Unranked</ButtonTitle><ButtonDescription>Play a casual game without affecting your rank.</ButtonDescription></button>
                <button type="button" @click="settings.type = 'ranked'"
                    :class="['relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-lg p-6 transition-all duration-300 text-left', settings.type === 'ranked' ? 'border-cyan-300 shadow-lg shadow-cyan-500/40' : 'border-slate-600 opacity-60']"><ButtonTitle>Ranked</ButtonTitle><ButtonDescription>Compete in ranked matches to improve your skill rating.</ButtonDescription></button>
            </div>
            <FormKitSchema :schema="settingsSchema" />
        </FormKit>

        <button @click="queueButtonPressed()"
        :class="[
          'mt-20 mx-auto block text-white font-bold py-3 px-6 rounded-lg transition-all',
          queued
            ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500'
            : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
        ]">
        {{ queued ? 'Leave Online Queue' : 'Join Online Queue' }}
        </button>
        <div v-if="queued" class="mt-3 text-center text-sm text-cyan-200">
          In queue for {{ queueDurationLabel }}
        </div>
        <RouterView />
    </BackgroundCentered>    
</template>

<script setup lang="ts">
import BackgroundCentered from '@/components/ui/BackgroundCentered.vue'
import ButtonDescription from '@/components/ui/ButtonDescription.vue'
import ButtonTitle from '@/components/ui/ButtonTitle.vue'
import getBearer from '@/lib/auth'
import useSocket from '@/lib/socket'
import router from '@/router'
import { computed, onMounted, onUnmounted, ref } from 'vue'

let { socketId, socket, status, data, send, close } = useSocket()

let queued = ref(false);
let queueStartedAt = ref<number | null>(null);
let queueElapsedSeconds = ref(0);
let queueTimer: ReturnType<typeof setInterval> | null = null;

const queueDurationLabel = computed(() => {
  const mins = Math.floor(queueElapsedSeconds.value / 60);
  const secs = queueElapsedSeconds.value % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
});

const startQueueTimer = () => {
  if (queueStartedAt.value == null) {
    queueStartedAt.value = Date.now();
  }

  if (queueTimer) {
    clearInterval(queueTimer);
  }

  queueElapsedSeconds.value = Math.floor((Date.now() - queueStartedAt.value) / 1000);
  queueTimer = setInterval(() => {
    if (queueStartedAt.value != null) {
      queueElapsedSeconds.value = Math.floor((Date.now() - queueStartedAt.value) / 1000);
    }
  }, 1000);
};

const stopQueueTimer = () => {
  if (queueTimer) {
    clearInterval(queueTimer);
    queueTimer = null;
  }
  queueStartedAt.value = null;
  queueElapsedSeconds.value = 0;
};

onMounted(() => {
  fetch('/api/queued', {
    headers: { Authorization: getBearer(), 'X-Socket-Id': socket.id ?? '' },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data)
      if (data.success) {
        queued.value = data.queued;
        startQueueTimer();
      }
    })
    .catch((err) => {
      console.error('Error fetching queue status:', err);
    });
});

onUnmounted(() => {
  stopQueueTimer();
});

let settings = ref<Record<string, any>>({ type: 'unranked', gameConfig: { startingScore: 501, checkoutMode: 'double-out' } });
let settingsSchema = [
    {
    $formkit: 'scoreConfig',
    id: 'gameConfig',
    name: 'gameConfig',
    label: false,
    classes: {
        'wrapper': 'max-w-[unset]!',
    },
    presets: [
        501, 301
    ],
    customizableSets: false,
    showCustomOption: false,
    },
];

socket.on('match_found', (matchData: any) => {
  if (matchData.gameId) {
    queued.value = false;
    stopQueueTimer();
    router.replace(`/game/${matchData.gameId}`)
  }
})

const queueButtonPressed = () => {
  if (!queued.value) {
    joinQueue()
  } else {
    leaveQueue();
  }
}

const joinQueue = async () => {

  try {

    let body = settings.value;

    let url = '/api/join-queue';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: getBearer(), 'Content-Type': 'application/json', 'X-Socket-Id': socket.id ?? '' },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.success) {
      queued.value = true;
      queueStartedAt.value = Date.now();
      startQueueTimer();
    } else {
      console.error('Failed to start game:', data)
      alert(data.message)
    }
  } catch (err) {
    console.error('Error starting game:', err)
    alert('An error occurred while starting the game.')
  } finally {
  }
}

const leaveQueue = async () => {
  try {
    let url = '/api/leave-queue';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: getBearer(), 'Content-Type': 'application/json', 'X-Socket-Id': socket.id ?? '' },
    })

    const data = await response.json()

    if (data.success) {
      queued.value = false;
      stopQueueTimer();
    } else {
      console.error('Failed to leave queue:', data)
      alert(data.message)
    }
  } catch (err) {
    console.error('Error leaving queue:', err)
    alert('An error occurred while leaving the queue.')
  } finally {
  }
}

</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeIn 0.3s ease-out;
}
</style>

<style scoped></style>
