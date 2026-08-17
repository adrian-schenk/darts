<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { apiFetch } from '@/lib/api'

type PrivacyPolicy = 'everyone' | 'friends' | 'nobody'

interface Profile {
  id: number
  uuid: string
  username: string
  email: string
  profilePicture: string | null
  elo: number
  twoFactorEnabled: boolean
}

interface Board {
  id: string
  name: string
  imageUrl?: string | null
  color?: string | null
}

interface SettingsData {
  profile: Profile
  privacy: { friendRequests: PrivacyPolicy; teamRequests: PrivacyPolicy }
  boards: Board[]
}

const sections = [
  { id: 'profile', label: 'Profile Picture' },
  { id: 'user-data', label: 'User Data' },
  { id: 'password', label: 'Password' },
  { id: '2fa', label: 'Two-Factor Auth' },
  { id: 'privacy', label: 'Requests' },
  { id: 'boards', label: 'Boards' },
] as const

type SectionId = (typeof sections)[number]['id']

const activeSection = ref<SectionId>('profile')
const loading = ref(true)
const saving = ref(false)
const settings = reactive<SettingsData>({
  profile: {
    id: 0,
    uuid: '',
    username: '',
    email: '',
    profilePicture: null,
    elo: 1000,
    twoFactorEnabled: false,
  },
  privacy: { friendRequests: 'everyone', teamRequests: 'everyone' },
  boards: [],
})

// Profile picture
const profilePictureInput = ref<HTMLInputElement | null>(null)

// User data
const userData = reactive({ username: '', email: '' })

// Password
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 2FA
const twoFactor = ref<{ secret: string; otpauthUrl: string } | null>(null)
const twoFactorCode = ref('')
const twoFactorPassword = ref('')

// Boards
const newBoard = reactive({ name: '', color: '#1a1a1a', imageUrl: '' })
const editingBoardId = ref<string | null>(null)
const editingBoardName = ref('')

const initials = computed(() => settings.profile.username.charAt(0).toUpperCase())

async function loadSettings() {
  loading.value = true
  try {
    const data = await apiFetch<SettingsData>('/api/settings')
    settings.profile = data.profile
    settings.privacy = data.privacy
    settings.boards = data.boards
    userData.username = data.profile.username
    userData.email = data.profile.email
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to load settings')
  } finally {
    loading.value = false
  }
}

function withSaving<T extends unknown[], R>(action: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R | undefined> => {
    saving.value = true
    try {
      return await action(...args)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
      return undefined
    } finally {
      saving.value = false
    }
  }
}

const onProfilePictureChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.error('Please choose an image file')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Image must be smaller than 2 MB')
    return
  }

  const reader = new FileReader()
  reader.onload = async () => {
    try {
      await apiFetch('/api/settings/profile-picture', {
        method: 'PATCH',
        body: JSON.stringify({ profilePicture: reader.result }),
      })
      await loadSettings()
      toast.success('Profile picture updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    }
  }
  reader.readAsDataURL(file)
}

const removeProfilePicture = withSaving(async () => {
  await apiFetch('/api/settings/profile-picture', {
    method: 'PATCH',
    body: JSON.stringify({ profilePicture: null }),
  })
  await loadSettings()
  toast.success('Profile picture removed')
})

const saveUserData = withSaving(async () => {
  await apiFetch('/api/settings/user-data', {
    method: 'PATCH',
    body: JSON.stringify({ username: userData.username, email: userData.email }),
  })
  await loadSettings()
  toast.success('User data updated')
})

const changePassword = withSaving(async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.error('Passwords do not match')
    return
  }
  await apiFetch('/api/settings/password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    }),
  })
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  toast.success('Password changed')
})

const startTwoFactor = withSaving(async () => {
  const data = await apiFetch<{ secret: string; otpauthUrl: string }>(
    '/api/settings/2fa/generate',
    { method: 'POST' },
  )
  twoFactor.value = data
  twoFactorCode.value = ''
})

const enableTwoFactor = withSaving(async () => {
  await apiFetch('/api/settings/2fa/enable', {
    method: 'POST',
    body: JSON.stringify({ token: twoFactorCode.value }),
  })
  twoFactor.value = null
  await loadSettings()
  toast.success('Two-factor authentication enabled')
})

const cancelTwoFactor = () => {
  twoFactor.value = null
  twoFactorCode.value = ''
}

const disableTwoFactor = withSaving(async () => {
  await apiFetch('/api/settings/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({
      password: twoFactorPassword.value,
      token: twoFactorCode.value,
    }),
  })
  twoFactorPassword.value = ''
  twoFactorCode.value = ''
  await loadSettings()
  toast.success('Two-factor authentication disabled')
})

const updatePrivacy = async (key: 'friendRequests' | 'teamRequests') => {
  saving.value = true
  try {
    const data = await apiFetch<SettingsData>('/api/settings/privacy', {
      method: 'PATCH',
      body: JSON.stringify({ [key]: settings.privacy[key] }),
    })
    settings.privacy = data.privacy
    toast.success('Preference saved')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to save preference')
  } finally {
    saving.value = false
  }
}

const addBoard = withSaving(async () => {
  if (!newBoard.name.trim()) {
    toast.error('Board name is required')
    return
  }
  await apiFetch('/api/settings/boards', {
    method: 'POST',
    body: JSON.stringify({
      name: newBoard.name,
      color: newBoard.color,
      imageUrl: newBoard.imageUrl || undefined,
    }),
  })
  newBoard.name = ''
  newBoard.imageUrl = ''
  await loadSettings()
  toast.success('Board added')
})

const startEditBoard = (board: Board) => {
  editingBoardId.value = board.id
  editingBoardName.value = board.name
}

const saveBoardName = withSaving(async (board: Board) => {
  await apiFetch(`/api/settings/boards/${board.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: editingBoardName.value }),
  })
  editingBoardId.value = null
  await loadSettings()
  toast.success('Board updated')
})

const deleteBoard = withSaving(async (board: Board) => {
  await apiFetch(`/api/settings/boards/${board.id}`, { method: 'DELETE' })
  await loadSettings()
  toast.success('Board deleted')
})

onMounted(loadSettings)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-8 py-10">
    <h1 class="text-3xl font-bold text-white">Profile Settings</h1>
    <p class="mt-1 text-sm text-slate-400">Manage your account, privacy and dartboards.</p>

    <div class="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav class="flex flex-row flex-wrap gap-1 lg:flex-col">
        <button
          v-for="section in sections"
          :key="section.id"
          class="rounded-lg px-4 py-2 text-left text-sm font-medium transition"
          :class="activeSection === section.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'"
          @click="activeSection = section.id"
        >
          {{ section.label }}
        </button>
      </nav>

      <section class="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-6">
        <div v-if="loading" class="text-slate-400">Loading…</div>

        <!-- Profile Picture -->
        <div v-else-if="activeSection === 'profile'" class="space-y-6">
          <div class="flex items-center gap-5">
            <div
              class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-600 bg-slate-800 text-3xl font-bold text-white"
            >
              <img
                v-if="settings.profile.profilePicture"
                :src="settings.profile.profilePicture"
                alt="Profile"
                class="h-full w-full object-cover"
              />
              <span v-else>{{ initials }}</span>
            </div>
            <div class="space-y-3">
              <input
                ref="profilePictureInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onProfilePictureChange"
              />
              <button
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                :disabled="saving"
                @click="profilePictureInput?.click()"
              >
                {{ saving ? 'Uploading…' : 'Upload picture' }}
              </button>
              <button
                v-if="settings.profile.profilePicture"
                class="ml-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                @click="removeProfilePicture"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- User Data -->
        <div v-else-if="activeSection === 'user-data'" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Username</label>
            <input
              v-model="userData.username"
              type="text"
              class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Email</label>
            <input
              v-model="userData.email"
              type="email"
              class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400"
            />
          </div>
          <button
            class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60"
            :disabled="saving"
            @click="saveUserData"
          >
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>

        <!-- Password -->
        <div v-else-if="activeSection === 'password'" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Current password</label>
            <input v-model="passwordForm.currentPassword" type="password" class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">New password</label>
            <input v-model="passwordForm.newPassword" type="password" class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Confirm new password</label>
            <input v-model="passwordForm.confirmPassword" type="password" class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400" />
          </div>
          <button
            class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60"
            :disabled="saving"
            @click="changePassword"
          >
            {{ saving ? 'Saving…' : 'Change password' }}
          </button>
        </div>

        <!-- 2FA -->
        <div v-else-if="activeSection === '2fa'" class="space-y-5">
          <div v-if="!settings.profile.twoFactorEnabled && !twoFactor">
            <p class="text-sm text-slate-300">
              Two-factor authentication adds an extra layer of security by requiring a code from an authenticator app.
            </p>
            <button
              class="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60"
              :disabled="saving"
              @click="startTwoFactor"
            >
              {{ saving ? 'Generating…' : 'Enable two-factor authentication' }}
            </button>
          </div>

          <div v-else-if="!settings.profile.twoFactorEnabled && twoFactor" class="space-y-4">
            <p class="text-sm text-slate-300">Scan this code or enter the secret manually in your authenticator app.</p>
            <div class="rounded-xl bg-slate-950/70 p-4">
              <p class="break-all font-mono text-sm text-white">{{ twoFactor.secret }}</p>
              <p class="mt-2 break-all text-xs text-slate-400">{{ twoFactor.otpauthUrl }}</p>
            </div>
            <input
              v-model="twoFactorCode"
              type="text"
              maxlength="6"
              placeholder="6-digit code"
              class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-center font-mono text-lg text-white outline-none focus:border-blue-400"
            />
            <div class="flex gap-3">
              <button
                class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                :disabled="saving || twoFactorCode.length < 6"
                @click="enableTwoFactor"
              >
                {{ saving ? 'Verifying…' : 'Verify & enable' }}
              </button>
              <button class="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800" @click="cancelTwoFactor">
                Cancel
              </button>
            </div>
          </div>

          <div v-else class="space-y-4">
            <p class="text-sm text-emerald-400">Two-factor authentication is enabled.</p>
            <input
              v-model="twoFactorPassword"
              type="password"
              placeholder="Your password"
              class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400"
            />
            <input
              v-model="twoFactorCode"
              type="text"
              maxlength="6"
              placeholder="Current 6-digit code"
              class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-center font-mono text-lg text-white outline-none focus:border-blue-400"
            />
            <button
              class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60"
              :disabled="saving || !twoFactorPassword || twoFactorCode.length < 6"
              @click="disableTwoFactor"
            >
              {{ saving ? 'Disabling…' : 'Disable two-factor authentication' }}
            </button>
          </div>
        </div>

        <!-- Requests / privacy -->
        <div v-else-if="activeSection === 'privacy'" class="space-y-6">
          <div>
            <label class="mb-2 block text-sm font-semibold text-white">Friend Requests</label>
            <select
              v-model="settings.privacy.friendRequests"
              class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400"
              @change="updatePrivacy('friendRequests')"
            >
              <option value="everyone">Everyone</option>
              <option value="friends">Friends only</option>
              <option value="nobody">Nobody</option>
            </select>
            <p class="mt-1 text-xs text-slate-400">Control who can send you friend requests.</p>
          </div>
          <div>
            <label class="mb-2 block text-sm font-semibold text-white">Team Requests</label>
            <select
              v-model="settings.privacy.teamRequests"
              class="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400"
              @change="updatePrivacy('teamRequests')"
            >
              <option value="everyone">Everyone</option>
              <option value="friends">Friends only</option>
              <option value="nobody">Nobody</option>
            </select>
            <p class="mt-1 text-xs text-slate-400">Control who can invite you to teams.</p>
          </div>
        </div>

        <!-- Boards -->
        <div v-else-if="activeSection === 'boards'" class="space-y-6">
          <div class="space-y-3">
            <div
              v-for="board in settings.boards"
              :key="board.id"
              class="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <span class="h-6 w-6 rounded-full border border-slate-600" :style="{ background: board.imageUrl ? undefined : (board.color ?? '#1a1a1a') }">
                  <img v-if="board.imageUrl" :src="board.imageUrl" alt="" class="h-full w-full rounded-full object-cover" />
                </span>
                <input
                  v-if="editingBoardId === board.id"
                  v-model="editingBoardName"
                  type="text"
                  class="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-blue-400"
                  @keyup.enter="saveBoardName(board)"
                />
                <span v-else class="text-sm font-medium text-white">{{ board.name }}</span>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="editingBoardId === board.id"
                  class="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                  @click="saveBoardName(board)"
                >
                  Save
                </button>
                <button v-else class="rounded-lg border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800" @click="startEditBoard(board)">
                  Rename
                </button>
                <button class="rounded-lg border border-red-700/60 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10" @click="deleteBoard(board)">
                  Delete
                </button>
              </div>
            </div>
            <p v-if="settings.boards.length === 0" class="text-sm text-slate-400">No boards yet.</p>
          </div>

          <div class="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <h3 class="mb-3 text-sm font-semibold text-white">Add a board</h3>
            <div class="grid gap-3 sm:grid-cols-3">
              <input v-model="newBoard.name" type="text" placeholder="Board name" class="rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400" />
              <input v-model="newBoard.imageUrl" type="text" placeholder="Image URL (optional)" class="rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-blue-400" />
              <div class="flex items-center gap-2">
                <input v-model="newBoard.color" type="color" class="h-10 w-14 rounded-lg border border-slate-600 bg-slate-950/70" />
                <button class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60" :disabled="saving" @click="addBoard">
                  {{ saving ? 'Adding…' : 'Add' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
