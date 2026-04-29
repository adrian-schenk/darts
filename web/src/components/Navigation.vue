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
import { BowArrowIcon, ChartLineIcon, Globe2Icon, HistoryIcon, LucideChartLine, LucideTrophy, LucideUsersRound, SettingsIcon, TrophyIcon, UsersRound, UsersRoundIcon, Zap, CrownIcon } from 'lucide-vue-next'

const menuItems = [
  {
    path: '/home',
    label: 'Home',
    icon: null, // handled in template
  },
]

const sections = [
  {
    label: 'Play',
    items: [
      { path: '/local-game', label: 'Private Game', icon: Zap },
      {
        path: '/online-game',
        label: 'Online Game',
        icon: Globe2Icon
      },
    ],
  },
  {
    label: 'Compete',
    items: [
      {
        path: '/local-tournament',
        label: 'Local Tournament',
        icon: CrownIcon,
      },
      {
        path: '/online-tournament',
        label: 'Online Tournament',
        icon: TrophyIcon,

      },
    ],
  },
  {
    label: 'Training',
    items: [{ path: '/training', label: 'Training', icon: BowArrowIcon }],
  },
  {
    label: 'Analyse',
    items: [
      {
        path: '/progress',
        label: 'History',
        icon: HistoryIcon,
      },
      {
        path: '/statistics',
        label: 'Statistics',
        icon: ChartLineIcon,
      },
    ],
  },
  {
    label: 'Social',
    items: [
      {
        path: '/social',
        label: 'Friends & Teams',
        // socials  & friends icon
        icon: UsersRoundIcon
      },
    ],
  },
  {
    label: 'Manage',
    items: [
      {
        path: '/settings',
        label: 'Profile Settings',
        icon: SettingsIcon,
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
          <h1 class="text-xl font-bold text-white">OpenDarts</h1>
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
                      <component :is="item.icon" class="w-4 h-4" />
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
