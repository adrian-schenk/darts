<script setup lang="ts">
import { useRoute } from 'vue-router'
import Navigation from '@/components/Navigation.vue'
import { Toaster } from '@/components/ui/sonner'

import useSocket from '@/lib/socket.ts'
import 'vue-sonner/style.css'

const route = useRoute()

useSocket()
</script>

<template>
  <div>
    <div class="flex h-screen bg-slate-950">
      <Navigation />
      <main class="relative w-full flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-950">
        <router-view :key="route.path" />
      </main>
    </div>
  </div>
</template>

<style scoped>
:deep([data-sonner-toaster][data-x-position='center']) {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}
</style>
