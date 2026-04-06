<script setup lang="ts">
import Sidebar from './ui/sidebar/Sidebar.vue'
import SidebarContent from './ui/sidebar/SidebarContent.vue'
import SidebarFooter from './ui/sidebar/SidebarFooter.vue'
import SidebarGroup from './ui/sidebar/SidebarGroup.vue'
import SidebarGroupContent from './ui/sidebar/SidebarGroupContent.vue'
import SidebarGroupLabel from './ui/sidebar/SidebarGroupLabel.vue'
import SidebarHeader from './ui/sidebar/SidebarHeader.vue'
import SidebarMenu from './ui/sidebar/SidebarMenu.vue'
import SidebarMenuItem from './ui/sidebar/SidebarMenuItem.vue'
import SidebarMenuButton from './ui/sidebar/SidebarMenuButton.vue'
import SidebarProvider from './ui/sidebar/SidebarProvider.vue'

const menuItems = [
  {
    path: '/home',
    label: 'Home',
    icon: 'M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4 4m-4-4v4',
  },
]

const sections = [
  {
    label: 'Play',
    items: [
      { path: '/local-game', label: 'Private Game', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      {
        path: '/online-game',
        label: 'Online Game',
        icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9-9a9 9 0 019 9',
      },
    ],
  },
  {
    label: 'Compete',
    items: [
      {
        path: '/local-tournament',
        label: 'Local Tournament',
        icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
      },
      {
        path: '/online-tournament',
        label: 'Online Tournament',
        icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
      },
    ],
  },
  {
    label: 'Training',
    items: [{ path: '/training', label: 'Training', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }],
  },
  {
    label: 'Analyse',
    items: [
      {
        path: '/progress',
        label: 'History',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
      {
        path: '/statistics',
        label: 'Statistics',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
    ],
  },
  {
    label: 'Manage',
    items: [
      {
        path: '/settings',
        label: 'Profile Settings',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      },
    ],
  },
]
</script>

<template>
  <SidebarProvider class="w-auto">
    <Sidebar collapsible="none">
      <!-- Header with Logo -->
      <SidebarHeader class="border-b border-slate-800 px-6 py-8">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"
              />
            </svg>
          </div>
          <h1 class="text-xl font-bold text-white">Darts</h1>
        </div>
      </SidebarHeader>

      <!-- Main Navigation Content -->
      <SidebarContent class="px-2 py-6">
        <!-- Home Item -->
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child class="mb-6">
                <RouterLink
                  to="/home"
                  class="flex items-center gap-3"
                  active-class="bg-blue-600 text-white"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4 4m-4-4v4"
                    />
                  </svg>
                  <span class="text-sm font-medium">Home</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <!-- Sections -->
        <template v-for="section in sections" :key="section.label">
          <SidebarGroup>
            <SidebarGroupLabel class="text-xs font-bold uppercase tracking-wider">{{
              section.label
            }}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem v-for="item in section.items" :key="item.path">
                  <SidebarMenuButton as-child>
                    <RouterLink
                      :to="item.path"
                      class="flex items-center gap-3"
                      active-class="bg-blue-600 text-white"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          :d="item.icon"
                        />
                      </svg>
                      <span class="text-sm">{{ item.label }}</span>
                    </RouterLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </template>
      </SidebarContent>

      <SidebarFooter></SidebarFooter>
    </Sidebar>
  </SidebarProvider>
</template>
