<script setup lang="ts">
import { useRoute } from 'vue-router'
import Navigation from '@/components/Navigation.vue'
import router from '@/router';

const route = useRoute()

</script>

<template>
  <div class="flex h-screen bg-slate-950">
    <Navigation />
    <main class="w-full flex-1 overflow-auto">
      <router-view :key="route.path" />
    </main>
  </div>
</template>