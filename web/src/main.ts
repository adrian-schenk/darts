import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { plugin as formkitPlugin, defaultConfig as formkitDefaultConfig, createInput } from '@formkit/vue'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import ScoreConfig from './components/settings/ScoreConfig.vue'
import enemyConfig from "@/components/settings/EnemyConfig.vue";

const app = createApp(App)

app.use(createPinia().use(piniaPluginPersistedstate)).use(router).use(formkitPlugin, formkitDefaultConfig({
  inputs: {
    scoreConfig: createInput(ScoreConfig, {
      props: ['presets', 'showCustomOption'],
    }),
    enemyConfig: createInput(enemyConfig, {
      props: ['presets'],
    }),
  },
  theme: 'genesis',
})).mount('#app')
