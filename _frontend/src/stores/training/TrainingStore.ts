import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTrainingStore  = defineStore('training', {
    state: () => ({
        checkoutDifficulty: ref('easy')
    }),

    persist: true
})