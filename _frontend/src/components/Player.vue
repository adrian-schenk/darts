<template>
    <div class="relative p-6 flex flex-col justify-center items-center rounded-lg bg-gray-800">
        <div class="text-4xl text-white">Player name</div>
        <div class="flex justify-center items-center mt-4 text-gray-400">
            <div class="m-4">0 sets</div>
            <div class="h-8 border-l border-gray-600 mx-4"></div>
            <div class="m-4">0 legs</div>
        </div>
        <div class="text-8xl text-white my-4 font-bold">501</div>
        <div class="flex justify-center items-center gap-2 mt-4 text-gray-400">
            <div class="w-32 h-24 rounded-md bg-slate-600"></div>
            <div class="w-32 h-24 rounded-md bg-slate-600"></div>
            <div class="w-32 h-24 rounded-md bg-slate-600"></div>
        </div>
        <div class="absolute top-1/2 -translate-y-1/2 left-4 h-40 w-18 text-sm text-gray-400 rounded-md px-2 py-1 overflow-hidden">
            <div v-for="(score, index) in scoreLog" :key="index" class="flex items-center">
                <div :class="index === 0 ? 'w-3 h-3 bg-green-500 rounded-full' : 'w-3 h-3 bg-gray-500 rounded-full opacity-50'" class="mr-2"></div>
                <div :class="index === 0 ? 'text-white' : 'text-gray-400'">{{ score }}</div>
            </div>
        </div>
        <div class="flex justify-center items-center gap-4 mt-4 text-gray-400">
            <div class="flex flex-col justify-center items-center">
                <div class="text-sm mt-2">Average</div>
                <div class="text-white text-xl font-extrabold">45</div>
            </div>
            <div class="h-8 border-l border-gray-600 mx-4"></div>
            <div class="flex flex-col justify-center items-center">
                <div class="text-sm mt-2">First 6 Avg.</div>
                <div class="text-white text-xl font-extrabold">44</div>  
            </div>
            <div class="h-8 border-l border-gray-600 mx-4"></div>
            <div class="flex flex-col justify-center items-center">
                <div class="text-sm mt-2">Highest Finish</div>
                <div class="text-white text-xl font-extrabold">65</div>  
            </div>
            <div class="h-8 border-l border-gray-600 mx-4"></div>
            <div class="flex flex-col justify-center items-center">
                <div class="text-sm mt-2">Checkout</div>
                <div class="text-white text-xl font-extrabold">10%</div>  
            </div>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            scoreLog: [
                100, 140, 60, 45, 20, 180, 20, 20, 20, 20
            ],
        };
    },
    methods: {
        addScore(newScore) {
            this.scoreLog.unshift(newScore);
            if (this.scoreLog.length > 6) {
                this.scoreLog.pop();
            }
        },
    },
};
</script>