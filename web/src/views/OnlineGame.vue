<template>
  <!-- Menu is active - show fullscreen menu -->
  <div class="min-h-screen w-full bg-gradient-to-br from-slate-900 to-slate-950">
    <button @click="joinQueue()"
      class="mt-20 mx-auto block bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all">
      Join Online Queue
    </button>
    <button @click="leaveQueue()"
      class="mt-4 mx-auto block bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-lg transition-all">
      Leave Online Queue
    </button>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import Player from '@/components/Player.vue'
import getBearer from '@/lib/auth'
import useSocket from '@/lib/socket'
import router from '@/router'
import { ref } from 'vue'

let { socketId, socket, status, data, send, close } = useSocket()

socket.on('match_found', (matchData: any) => {
  if (matchData.gameId) {
    router.replace(`/game/${matchData.gameId}`)
  }
  // Here you would typically navigate to the game screen and pass the match data
})

const joinQueue = async () => {

  try {

    let body = {}

    let url = '/api/join-queue';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: getBearer(), 'Content-Type': 'application/json', 'X-Socket-Id': socket.id ?? '' },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.success) {
      
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
