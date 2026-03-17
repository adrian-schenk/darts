<template>
	<div class="p-6">
		<RouterLink v-if="mode" to="/training" class="text-sm text-gray-400 hover:text-gray-300 mb-4 inline-block">←
			Back</RouterLink>
		<div v-if="!mode" class="max-w-3xl mx-auto">
			<h2 class="text-2xl font-semibold mb-4">Choose Training Mode</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<button v-for="m in modes" @click="startSession(m.value)" :key="m.value"
					class="block mt-2 text-sm text-blue-400 hover:text-blue-300">Go to {{ m.label }}</button>
			</div>
		</div>
		<div v-if="mode == 'target'" class="w-full mx-auto">
			<div class="flex flex-row gap-4 w-full h-full">
				<Player ref="PlayerRef" class="flex-auto h-auto w-full" :show-name="false" :show-sets="false"
					:show-avg="false" :show-history="false" :dart-board-ref="DartboardRef ?? undefined">
				</Player>
				<div class="h-24 border-l border-gray-600 mx-4 self-center"></div>
				<Dartboard ref="DartboardRef" class="w-full flex-auto" :click-to-add-marker="true"></Dartboard>
			</div>
		</div>
		<div v-if="mode == 'checkouts'" class="mx-auto">
			<div class="flex flex-row gap-4 w-full h-full">
				<Player ref="PlayerRef" class="flex-auto h-auto w-full" :show-name="false" :show-sets="false"
					:show-avg="false" :show-history="false" :dart-board-ref="DartboardRef ?? undefined">
					<div class="absolute top-0 mt-8 flex flex-row gap-4">
						<button v-for="difficulty in checkoutDifficulties" :key="difficulty.value" type="button"
							@click="trainingStore.checkoutDifficulty = difficulty.value"
							@focus="trainingStore.checkoutDifficulty = difficulty.value"
							:class="['px-3 py-1 rounded-full text-sm font-semibold border transition-colors cursor-pointer', getDifficultyClass(difficulty.value)]">
							{{ difficulty.label }}
						</button>
					</div>
				</Player>
				<div class="h-24 border-l border-gray-600 mx-4 self-center"></div>
				<Dartboard ref="DartboardRef" class="flex-auto w-full" :click-to-add-marker="true"
					:-player-interface="PlayerRef?.PlayerInterface"></Dartboard>
			</div>
		</div>

		<router-view />
	</div>
</template>

<script setup lang="ts">
import Dartboard from '@/components/Dartboard.vue';
import Player from '@/components/Player.vue';
import Separator from '@/components/ui/separator/Separator.vue';
import getBearer from '@/lib/auth';
import useSocket from '@/lib/socket';
import router from '@/router';
import { useTrainingStore } from '@/stores/training/TrainingStore';
import { Router } from 'lucide-vue-next';
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const trainingStore = useTrainingStore()

let { socket, status, data, send, close } = useSocket();

const PlayerRef = ref<InstanceType<typeof Player> | null>(null);
const DartboardRef = ref<InstanceType<typeof Dartboard> | null>(null);
const props = defineProps<{ sessionid?: string }>()
const mode = ref('');

onMounted(() => {
	if (props.sessionid) {
		fetch(import.meta.env.VITE_API_BASE_URL + '/game/' + props.sessionid, {
			method: 'GET',
			headers: { 'Authorization': getBearer(), 'Content-Type': 'application/json' },
		})
		.then(res => res.json())
		.then(data => {
			if (data.gameId) {
				if (data.mode) {
					mode.value = data.mode
				}
			}

			send("join-game", { gameId: props.sessionid });
			send("sync-game", { gameId: props.sessionid });
		})
		.catch(err => {
			console.error('Error fetching game data:', err);
		});

	}
})

const modes = [
	{ value: 'target', label: 'Target Practice', desc: 'Work on hitting specific targets.' },
	{ value: 'around', label: 'Around The Clock', desc: 'Hit numbers in sequence.' },
	{ value: 'checkouts', label: 'Checkouts', desc: 'Practice finishing combinations.' },
	{ value: 'max', label: 'Max Score', desc: 'Aim for highest scoring.' }
]

const checkoutDifficulties = [
	{ value: 'auto', label: 'Auto', desc: 'Finish with any combination.' },
	{ value: 'easy', label: 'Easy', desc: 'Finish with simple combinations.' },
	{ value: 'medium', label: 'Medium', desc: 'Finish with moderate combinations.' },
	{ value: 'hard', label: 'Hard', desc: 'Finish with complex combinations.' }
]

const startSession = (mode: string) => {
	fetch(import.meta.env.VITE_API_BASE_URL + '/create-training/' + mode, {
		method: 'POST',
		headers: { 'Authorization': getBearer(), 'Content-Type': 'application/json' },
		body: JSON.stringify({ mode })
	})
		.then(res => res.json())
		.then(data => {
			if (data.gameId) {
				router.replace({ name: 'training-session', params: { sessionid: data.gameId } })
			} else {
				// handle error
			}
		})
		.catch(err => {
			console.error('Error starting training session:', err);
		});
}

const getDifficultyClass = (value: string) => {
	if (value === 'easy') return trainingStore.checkoutDifficulty === value ? 'border-green-600 bg-green-500/20 text-white' : 'border-green-400 text-white'
	if (value === 'medium') return trainingStore.checkoutDifficulty === value ? 'border-yellow-600 bg-yellow-500/20 text-white' : 'border-yellow-400 text-white'
	if (value === 'hard') return trainingStore.checkoutDifficulty === value ? 'border-red-600 bg-red-500/20 text-white' : 'border-red-400 text-white'
	return trainingStore.checkoutDifficulty === value ? 'border-blue-600 bg-blue-500/20 text-white' : 'border-blue-500 text-white'
}

</script>

<style scoped></style>
