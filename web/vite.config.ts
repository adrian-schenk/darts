import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, './', '')
  
  return {
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    define: {
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(env.BACKEND_URL),
      'import.meta.env.VITE_BACKEND_PORT': JSON.stringify(env.BACKEND_PORT),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.API_BASE_URL),
    },
  }
})
