<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4"
  >
    <div class="w-full max-w-md">
      <!-- Logo Section -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-4">Login</h1>
      </div>

      <!-- Login Card -->
      <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-6">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Username Field -->
          <div>
            <label for="username" class="block text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              v-model="form.username"
              placeholder="Enter your username"
              class="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Password Field -->
          <div>
            <label for="password" class="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              v-model="form.password"
              placeholder="Enter your password"
              class="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-between text-sm">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="form.rememberMe"
                class="w-4 h-4 rounded bg-slate-800 border border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-slate-400">Remember me</span>
            </label>
            <a href="#" class="text-blue-500 hover:text-blue-400 transition-colors">
              Forgot password?
            </a>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/50 mt-6"
          >
            Sign In
          </button>
        </form>
      </div>

      <!-- Register Link -->
      <div class="text-center">
        <p class="text-slate-400">
          Don't have an account?
          <RouterLink
            to="/register"
            class="text-blue-500 hover:text-blue-400 font-medium transition-colors"
          >
            Sign up here
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Cookies from 'js-cookie'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { RouterLink } from 'vue-router'

const router = useRouter()

const form = ref({
  username: '',
  password: '',
  rememberMe: false,
})

const handleLogin = () => {
  fetch(
    `/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form.value),
    },
  )
    .then((res) => {
      if (!res.ok) {
        throw new Error('Login failed')
      }

      return res.json()
    })
    .then((token) => {
      Cookies.set('auth_token', token.access_token, {
        expires: form.value.rememberMe ? 7 : undefined,
        secure: true,
        sameSite: 'strict',
      })
      window.location.href = '/'
    })
    .catch((error) => {
      console.error('Login failed:', error)
    })
}
</script>
