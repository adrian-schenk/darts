<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  UserPlus,
  Users,
  X,
  Check,
  UserMinus,
  LogOut,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  UserCircle,
} from 'lucide-vue-next'
import getBearer from '@/lib/auth'

// ── Types ────────────────────────────────────────────────────────────────────

interface Friend {
  id: number
  uuid: string
  username: string
}

interface IncomingRequest {
  id: number
  createdAt: string
  sender: { uuid: string; username: string }
}

interface SentRequest {
  id: number
  createdAt: string
  receiver: { uuid: string; username: string }
}

interface GroupMember {
  id: number
  uuid: string
  username: string
}

interface Group {
  id: number
  uuid: string
  name: string
  description: string | null
  owner: GroupMember
  members: GroupMember[]
  createdAt: string
}

interface TeamConfirmDialog {
  title: string
  message: string
  confirmLabel: string
  tone: 'danger' | 'warning'
  action: () => Promise<void>
}

// ── State ─────────────────────────────────────────────────────────────────────

const activeTab = ref<'friends' | 'groups'>('friends')

const friends = ref<Friend[]>([])
const incomingRequests = ref<IncomingRequest[]>([])
const sentRequests = ref<SentRequest[]>([])
const groups = ref<Group[]>([])

const expandedGroups = ref<Set<number>>(new Set())

// Loading / error / success feedback
const loadingFriends = ref(false)
const loadingGroups = ref(false)
const actionError = ref('')
const actionSuccess = ref('')

// Add Friend modal
const showAddFriendModal = ref(false)
const addFriendUsername = ref('')
const addFriendLoading = ref(false)
const addFriendError = ref('')

// Remove Friend modal
const showRemoveFriendModal = ref(false)
const friendToRemove = ref<Friend | null>(null)
const removeFriendLoading = ref(false)

// Create Group modal
const showCreateGroupModal = ref(false)
const newGroupName = ref('')
const newGroupDescription = ref('')
const createGroupLoading = ref(false)
const createGroupError = ref('')

// Add Member to Group modal
const showAddMemberModal = ref(false)
const addMemberGroupId = ref<number | null>(null)
const addMemberUsername = ref('')
const addMemberLoading = ref(false)
const addMemberError = ref('')

// Team action confirmation modal
const showTeamConfirmModal = ref(false)
const teamConfirmLoading = ref(false)
const teamConfirmDialog = ref<TeamConfirmDialog | null>(null)

// ── Computed ──────────────────────────────────────────────────────────────────

const currentUser = computed(() => {
  // Extract username from JWT stored in cookie for ownership checks
  try {
    const bearer = getBearer()
    const token = bearer.replace('Bearer ', '')
    const payload = JSON.parse(atob((token.split('.')[1]) ?? ''))
    return { uuid: payload.uuid, username: payload.username }
  } catch {
    return null
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      Authorization: getBearer(),
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const data: any = await res.json().catch(() => ({}))
    throw new Error(data.message ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

function flash(type: 'error' | 'success', msg: string) {
  if (type === 'error') {
    actionError.value = msg
    actionSuccess.value = ''
  } else {
    actionSuccess.value = msg
    actionError.value = ''
  }
  setTimeout(() => {
    actionError.value = ''
    actionSuccess.value = ''
  }, 4000)
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadFriends() {
  loadingFriends.value = true
  try {
    const [f, inc, sent] = await Promise.all([
      apiFetch<Friend[]>('/api/social/friends'),
      apiFetch<IncomingRequest[]>('/api/social/friend-requests/incoming'),
      apiFetch<SentRequest[]>('/api/social/friend-requests/sent'),
    ])
    friends.value = f
    incomingRequests.value = inc
    sentRequests.value = sent
  } catch (e: any) {
    flash('error', e.message)
  } finally {
    loadingFriends.value = false
  }
}

async function loadGroups() {
  loadingGroups.value = true
  try {
    groups.value = await apiFetch<Group[]>('/api/social/groups')
  } catch (e: any) {
    flash('error', e.message)
  } finally {
    loadingGroups.value = false
  }
}

onMounted(() => Promise.all([loadFriends(), loadGroups()]))

// ── Friend actions ────────────────────────────────────────────────────────────

async function submitAddFriend() {
  const username = addFriendUsername.value.trim()
  if (!username) return
  addFriendError.value = ''
  addFriendLoading.value = true
  try {
    await apiFetch('/api/social/friend-request', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
    flash('success', `Friend request sent to ${username}`)
    addFriendUsername.value = ''
    showAddFriendModal.value = false
    await loadFriends()
  } catch (e: any) {
    addFriendError.value = e.message
  } finally {
    addFriendLoading.value = false
  }
}

async function acceptRequest(id: number) {
  try {
    await apiFetch(`/api/social/friend-request/${id}/accept`, { method: 'POST' })
    flash('success', 'Friend request accepted')
    await loadFriends()
  } catch (e: any) {
    flash('error', e.message)
  }
}

async function rejectRequest(id: number) {
  try {
    await apiFetch(`/api/social/friend-request/${id}/reject`, { method: 'POST' })
    await loadFriends()
  } catch (e: any) {
    flash('error', e.message)
  }
}

function openRemoveFriendModal(friend: Friend) {
  friendToRemove.value = friend
  showRemoveFriendModal.value = true
}

function closeRemoveFriendModal() {
  if (removeFriendLoading.value) return
  showRemoveFriendModal.value = false
  friendToRemove.value = null
}

async function removeFriend(uuid: string, username: string) {
  try {
    await apiFetch(`/api/social/friend/${uuid}`, { method: 'DELETE' })
    flash('success', `${username} removed`)
    await loadFriends()
  } catch (e: any) {
    flash('error', e.message)
  }
}

async function confirmRemoveFriend() {
  if (!friendToRemove.value) return
  removeFriendLoading.value = true
  try {
    await removeFriend(friendToRemove.value.uuid, friendToRemove.value.username)
    closeRemoveFriendModal()
  } finally {
    removeFriendLoading.value = false
  }
}

// ── Group actions ─────────────────────────────────────────────────────────────

async function submitCreateGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  createGroupError.value = ''
  createGroupLoading.value = true
  try {
    await apiFetch('/api/social/groups', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: newGroupDescription.value.trim() || undefined,
      }),
    })
    flash('success', `Team "${name}" created`)
    newGroupName.value = ''
    newGroupDescription.value = ''
    showCreateGroupModal.value = false
    await loadGroups()
  } catch (e: any) {
    createGroupError.value = e.message
  } finally {
    createGroupLoading.value = false
  }
}

function openAddMemberModal(groupId: number) {
  addMemberGroupId.value = groupId
  addMemberUsername.value = ''
  addMemberError.value = ''
  showAddMemberModal.value = true
}

function openTeamConfirmModal(dialog: TeamConfirmDialog) {
  teamConfirmDialog.value = dialog
  showTeamConfirmModal.value = true
}

function closeTeamConfirmModal() {
  if (teamConfirmLoading.value) return
  showTeamConfirmModal.value = false
  teamConfirmDialog.value = null
}

async function confirmTeamAction() {
  if (!teamConfirmDialog.value) return
  teamConfirmLoading.value = true
  try {
    await teamConfirmDialog.value.action()
    closeTeamConfirmModal()
  } catch (e: any) {
    flash('error', e.message)
  } finally {
    teamConfirmLoading.value = false
  }
}

async function submitAddMember() {
  const username = addMemberUsername.value.trim()
  if (!username || !addMemberGroupId.value) return
  addMemberError.value = ''
  addMemberLoading.value = true
  try {
    await apiFetch(`/api/social/groups/${addMemberGroupId.value}/members`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
    flash('success', `${username} added to team`)
    showAddMemberModal.value = false
    await loadGroups()
  } catch (e: any) {
    addMemberError.value = e.message
  } finally {
    addMemberLoading.value = false
  }
}

function removeMember(groupId: number, memberUuid: string, username: string) {
  openTeamConfirmModal({
    title: 'Remove Team Member',
    message: `Remove ${username} from this team?`,
    confirmLabel: 'Remove',
    tone: 'danger',
    action: async () => {
      await apiFetch(`/api/social/groups/${groupId}/members/${memberUuid}`, { method: 'DELETE' })
      flash('success', `${username} removed from team`)
      await loadGroups()
    },
  })
}

function leaveGroup(group: Group) {
  openTeamConfirmModal({
    title: 'Leave Team',
    message: `Leave "${group.name}"?`,
    confirmLabel: 'Leave',
    tone: 'warning',
    action: async () => {
      await apiFetch(`/api/social/groups/${group.id}/leave`, { method: 'POST' })
      flash('success', `Left "${group.name}"`)
      await loadGroups()
    },
  })
}

function deleteGroup(group: Group) {
  openTeamConfirmModal({
    title: 'Delete Team',
    message: `Delete "${group.name}" permanently?`,
    confirmLabel: 'Delete',
    tone: 'danger',
    action: async () => {
      await apiFetch(`/api/social/groups/${group.id}`, { method: 'DELETE' })
      flash('success', `"${group.name}" deleted`)
      await loadGroups()
    },
  })
}

function toggleGroup(id: number) {
  if (expandedGroups.value.has(id)) {
    expandedGroups.value.delete(id)
  } else {
    expandedGroups.value.add(id)
  }
}

function isOwner(group: Group) {
  return currentUser.value?.uuid === group.owner.uuid
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <!-- Page header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white">Friends &amp; Teams</h1>
      <p class="text-slate-400 mt-1 text-sm">Manage your dart friends and practice groups</p>
    </div>

    <!-- Global flash messages -->
    <transition name="fade">
      <div
        v-if="actionError"
        class="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm"
      >
        <X class="w-4 h-4 shrink-0" />
        {{ actionError }}
      </div>
    </transition>
    <transition name="fade">
      <div
        v-if="actionSuccess"
        class="mb-4 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-green-400 text-sm"
      >
        <Check class="w-4 h-4 shrink-0" />
        {{ actionSuccess }}
      </div>
    </transition>

    <!-- Tab bar -->
    <div class="flex gap-1 mb-6 bg-slate-800/60 rounded-lg p-1 w-fit">
      <button
        @click="activeTab = 'friends'"
        :class="[
          'flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-colors',
          activeTab === 'friends'
            ? 'bg-blue-600 text-white shadow'
            : 'text-slate-400 hover:text-white',
        ]"
      >
        <UserCircle class="w-4 h-4" />
        Friends
        <span
          v-if="incomingRequests.length"
          class="bg-blue-400 text-blue-950 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
        >
          {{ incomingRequests.length }}
        </span>
      </button>
      <button
        @click="activeTab = 'groups'"
        :class="[
          'flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-colors',
          activeTab === 'groups'
            ? 'bg-blue-600 text-white shadow'
            : 'text-slate-400 hover:text-white',
        ]"
      >
        <Users class="w-4 h-4" />
        Teams
        <span
          v-if="groups.length"
          class="bg-slate-600 text-slate-300 text-xs font-bold rounded-full px-1.5 h-4 flex items-center justify-center"
        >
          {{ groups.length }}
        </span>
      </button>
    </div>

    <!-- ── FRIENDS TAB ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'friends'">

      <!-- Pending incoming requests -->
      <div
        v-if="incomingRequests.length"
        class="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 p-4"
      >
        <h2 class="text-amber-400 font-semibold text-sm mb-3 flex items-center gap-2">
          <UserPlus class="w-4 h-4" />
          Pending requests ({{ incomingRequests.length }})
        </h2>
        <ul class="space-y-2">
          <li
            v-for="req in incomingRequests"
            :key="req.id"
            class="flex items-center justify-between bg-slate-800/60 rounded-lg px-4 py-3"
          >
            <span class="text-white font-medium">{{ req.sender.username }}</span>
            <div class="flex gap-2">
              <button
                @click="acceptRequest(req.id)"
                class="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-md transition-colors"
              >
                <Check class="w-3.5 h-3.5" /> Accept
              </button>
              <button
                @click="rejectRequest(req.id)"
                class="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-md transition-colors"
              >
                <X class="w-3.5 h-3.5" /> Decline
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Friends list header -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-white font-semibold">
          Friends
          <span class="text-slate-500 font-normal">({{ friends.length }})</span>
        </h2>
        <button
          @click="showAddFriendModal = true"
          class="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <UserPlus class="w-4 h-4" /> Add Friend
        </button>
      </div>

      <!-- Friends list -->
      <div v-if="loadingFriends" class="text-slate-500 text-sm py-8 text-center">Loading...</div>
      <div v-else-if="friends.length === 0" class="rounded-xl border border-dashed border-slate-700 py-12 text-center">
        <UserCircle class="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p class="text-slate-500 text-sm">No friends yet — add someone to get started</p>
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="friend in friends"
          :key="friend.uuid"
          class="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 hover:border-slate-600 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
              <span class="text-blue-400 text-sm font-bold">{{ friend.username.charAt(0).toUpperCase() }}</span>
            </div>
            <span class="text-white font-medium">{{ friend.username }}</span>
          </div>
          <button
            @click="openRemoveFriendModal(friend)"
            class="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-red-500/10"
            title="Remove friend"
          >
            <UserMinus class="w-4 h-4" />
          </button>
        </li>
      </ul>

      <!-- Sent requests (collapsed section) -->
      <div v-if="sentRequests.length" class="mt-6">
        <h3 class="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
          Sent requests ({{ sentRequests.length }})
        </h3>
        <ul class="space-y-2">
          <li
            v-for="req in sentRequests"
            :key="req.id"
            class="flex items-center justify-between bg-slate-800/40 rounded-lg px-4 py-2.5 text-sm"
          >
            <span class="text-slate-300">{{ req.receiver.username }}</span>
            <span class="text-slate-600 text-xs">Pending</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- ── GROUPS TAB ──────────────────────────────────────────── -->
    <div v-if="activeTab === 'groups'">
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-white font-semibold">
          Your Teams
          <span class="text-slate-500 font-normal">({{ groups.length }})</span>
        </h2>
        <button
          @click="showCreateGroupModal = true"
          class="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus class="w-4 h-4" /> Create Team
        </button>
      </div>

      <div v-if="loadingGroups" class="text-slate-500 text-sm py-8 text-center">Loading...</div>
      <div v-else-if="groups.length === 0" class="rounded-xl border border-dashed border-slate-700 py-12 text-center">
        <Users class="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p class="text-slate-500 text-sm">No teams yet — create one to get started</p>
      </div>
      <ul v-else class="space-y-3">
        <li
          v-for="group in groups"
          :key="group.id"
          class="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden"
        >
          <!-- Group header row -->
          <div
            class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors select-none"
            @click="toggleGroup(group.id)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-600/40 flex items-center justify-center shrink-0">
                <Users class="w-4 h-4 text-blue-400" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-white font-semibold truncate">{{ group.name }}</span>
                  <span
                    v-if="isOwner(group)"
                    class="text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-medium"
                  >
                    Owner
                  </span>
                </div>
                <p v-if="group.description" class="text-slate-500 text-xs truncate">{{ group.description }}</p>
                <p v-else class="text-slate-600 text-xs">{{ group.members.length }} member{{ group.members.length !== 1 ? 's' : '' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 ml-3 shrink-0">
              <!-- Owner actions -->
              <template v-if="isOwner(group)">
                <button
                  @click.stop="openAddMemberModal(group.id)"
                  class="text-slate-400 hover:text-blue-400 transition-colors p-1.5 rounded-md hover:bg-blue-500/10"
                  title="Add member"
                >
                  <UserPlus class="w-4 h-4" />
                </button>
                <button
                  @click.stop="deleteGroup(group)"
                  class="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-red-500/10"
                  title="Delete team"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </template>
              <!-- Member action -->
              <button
                v-else
                @click.stop="leaveGroup(group)"
                class="text-slate-500 hover:text-amber-400 transition-colors p-1.5 rounded-md hover:bg-amber-500/10"
                title="Leave team"
              >
                <LogOut class="w-4 h-4" />
              </button>
              <ChevronDown v-if="!expandedGroups.has(group.id)" class="w-4 h-4 text-slate-500" />
              <ChevronUp v-else class="w-4 h-4 text-slate-500" />
            </div>
          </div>

          <!-- Expanded members list -->
          <div v-if="expandedGroups.has(group.id)" class="border-t border-slate-700/50 px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Members ({{ group.members.length }})
            </p>
            <ul class="space-y-1.5">
              <li
                v-for="member in group.members"
                :key="member.uuid"
                class="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-700/40"
              >
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold">
                    {{ member.username.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-slate-200 text-sm">{{ member.username }}</span>
                  <span
                    v-if="member.uuid === group.owner.uuid"
                    class="text-xs text-blue-500"
                  >
                    (owner)
                  </span>
                </div>
                <button
                  v-if="isOwner(group) && member.uuid !== group.owner.uuid"
                  @click="removeMember(group.id, member.uuid, member.username)"
                  class="text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
                  title="Remove member"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </div>
  </div>

  <!-- ── ADD FRIEND MODAL ────────────────────────────────────────────────── -->
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="showAddFriendModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="showAddFriendModal = false"
      >
        <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus class="w-5 h-5 text-blue-400" /> Add Friend
            </h2>
            <button
              @click="showAddFriendModal = false"
              class="text-slate-500 hover:text-white transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <p class="text-slate-400 text-sm mb-4">
            Enter the exact username of the player you want to add.
          </p>

          <form @submit.prevent="submitAddFriend" class="space-y-4">
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5">Username</label>
              <input
                v-model="addFriendUsername"
                type="text"
                placeholder="e.g. dartmaster99"
                autofocus
                class="w-full bg-slate-800 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 outline-none transition"
              />
            </div>

            <p v-if="addFriendError" class="text-red-400 text-sm">{{ addFriendError }}</p>

            <div class="flex gap-3 pt-1">
              <button
                type="button"
                @click="showAddFriendModal = false"
                class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="addFriendLoading || !addFriendUsername.trim()"
                class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition-colors"
              >
                {{ addFriendLoading ? 'Sending…' : 'Send Request' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </teleport>

  <!-- ── REMOVE FRIEND MODAL ─────────────────────────────────────────────── -->
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="showRemoveFriendModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="closeRemoveFriendModal()"
      >
        <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <UserMinus class="w-5 h-5 text-red-400" /> Remove Friend
            </h2>
            <button
              @click="closeRemoveFriendModal()"
              class="text-slate-500 hover:text-white transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <p class="text-slate-300 text-sm mb-6">
            Remove
            <span class="text-white font-semibold">{{ friendToRemove?.username }}</span>
            from your friends list?
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              @click="closeRemoveFriendModal()"
              class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg font-medium transition-colors"
              :disabled="removeFriendLoading"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="confirmRemoveFriend()"
              :disabled="removeFriendLoading"
              class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition-colors"
            >
              {{ removeFriendLoading ? 'Removing...' : 'Remove' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>

  <!-- ── TEAM CONFIRMATION MODAL ─────────────────────────────────────────── -->
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="showTeamConfirmModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="closeTeamConfirmModal()"
      >
        <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-white">{{ teamConfirmDialog?.title }}</h2>
            <button
              @click="closeTeamConfirmModal()"
              class="text-slate-500 hover:text-white transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <p class="text-slate-300 text-sm mb-6">
            {{ teamConfirmDialog?.message }}
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              @click="closeTeamConfirmModal()"
              class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg font-medium transition-colors"
              :disabled="teamConfirmLoading"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="confirmTeamAction()"
              :disabled="teamConfirmLoading"
              :class="[
                'flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition-colors',
                teamConfirmDialog?.tone === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-red-600 hover:bg-red-500',
              ]"
            >
              {{ teamConfirmLoading ? 'Processing...' : teamConfirmDialog?.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>

  <!-- ── CREATE GROUP MODAL ─────────────────────────────────────────────── -->
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="showCreateGroupModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="showCreateGroupModal = false"
      >
        <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <Users class="w-5 h-5 text-blue-400" /> Create Team
            </h2>
            <button
              @click="showCreateGroupModal = false"
              class="text-slate-500 hover:text-white transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="submitCreateGroup" class="space-y-4">
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5">Team Name</label>
              <input
                v-model="newGroupName"
                type="text"
                placeholder="e.g. Triple Threat"
                autofocus
                class="w-full bg-slate-800 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 outline-none transition"
              />
            </div>
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5">
                Description <span class="text-slate-600 font-normal">(optional)</span>
              </label>
              <input
                v-model="newGroupDescription"
                type="text"
                placeholder="A short description..."
                class="w-full bg-slate-800 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 outline-none transition"
              />
            </div>

            <p v-if="createGroupError" class="text-red-400 text-sm">{{ createGroupError }}</p>

            <div class="flex gap-3 pt-1">
              <button
                type="button"
                @click="showCreateGroupModal = false"
                class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="createGroupLoading || !newGroupName.trim()"
                class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition-colors"
              >
                {{ createGroupLoading ? 'Creating…' : 'Create Team' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </teleport>

  <!-- ── ADD MEMBER MODAL ───────────────────────────────────────────────── -->
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="showAddMemberModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click.self="showAddMemberModal = false"
      >
        <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus class="w-5 h-5 text-blue-400" /> Add Member
            </h2>
            <button
              @click="showAddMemberModal = false"
              class="text-slate-500 hover:text-white transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="submitAddMember" class="space-y-4">
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-1.5">Username</label>
              <input
                v-model="addMemberUsername"
                type="text"
                placeholder="Enter their username"
                autofocus
                class="w-full bg-slate-800 border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 outline-none transition"
              />
            </div>

            <p v-if="addMemberError" class="text-red-400 text-sm">{{ addMemberError }}</p>

            <div class="flex gap-3 pt-1">
              <button
                type="button"
                @click="showAddMemberModal = false"
                class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="addMemberLoading || !addMemberUsername.trim()"
                class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition-colors"
              >
                {{ addMemberLoading ? 'Adding…' : 'Add Member' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .max-w-md,
.modal-leave-active .max-w-md {
  transition: transform 0.2s ease;
}
.modal-enter-from .max-w-md {
  transform: scale(0.95) translateY(8px);
}
.modal-leave-to .max-w-md {
  transform: scale(0.95) translateY(8px);
}
</style>
