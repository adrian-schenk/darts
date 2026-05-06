<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4"
  >
    <div class="w-full max-w-md">
      <!-- Logo Section -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-4">Register</h1>
      </div>
      
      <!-- Register Card -->
      <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-6">
        <FormKit type="form" :actions="false" @submit="handleRegister">
          <FormKit
            type="email"
            name="email"
            label="Email"
            placeholder="Enter your email"
            validation="required|email"
          />

          <FormKit
            type="text"
            name="username"
            label="Username"
            placeholder="Enter your username"
            validation="required"
          />

          <FormKit
            type="password"
            name="password"
            label="Password"
            placeholder="Enter your password"
            validation="required"
          />

          <FormKit
            type="password"
            name="password_confirm"
            label="Repeat Password"
            placeholder="Repeat your password"
            validation="required|confirm"
            validation-label="Repeat Password"
          />

          <button
            type="submit"
            class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/50 mt-2"
          >
            Sign Up
          </button>
        </FormKit>
      </div>

      <!-- Login Link -->
      <div class="text-center">
        <p class="text-slate-400">
          Already have an account?
          <RouterLink
            to="/login"
            class="text-blue-500 hover:text-blue-400 font-medium transition-colors"
          >
            Sign in here
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Cookies from 'js-cookie'
import { RouterLink } from 'vue-router'

const handleRegister = (data: { email: string; username: string; password: string }) => {
  fetch(
    `/auth/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: data.email, username: data.username, password: data.password }),
    },
  )
    .then((res) => {
      if (!res.ok) {
        throw new Error('Registration failed')
      }
      return res.json()
    })
    .then((token) => {
      Cookies.set('auth_token', token.access_token, {
        secure: true,
        sameSite: 'strict',
      })
      window.location.href = '/'
    })
    .catch((error) => {
      console.error('Registration failed:', error)
    })
}
</script>
