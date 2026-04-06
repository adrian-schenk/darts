<script setup lang="ts">
import { useRoute } from 'vue-router'
import Navigation from '@/components/Navigation.vue'

import useSocket from '@/lib/socket.ts'

const route = useRoute()

useSocket()
</script>

<template>
  <div class="flex h-screen bg-slate-950">
    <Navigation />
    <main class="w-full flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-950">
      <router-view :key="route.path" />
    </main>
  </div>
</template>
