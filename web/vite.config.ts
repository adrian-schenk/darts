import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, './', '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:3000'
  
  return {
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
    ],
    server: {
      host: '0.0.0.0',
      port: Number(env.FRONTEND_PORT || 5173),
      proxy: {
        '/auth': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    }
  }
})
