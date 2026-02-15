<template>
	<div class="p-6">
		<RouterLink v-if="props.mode" to="/training"
			class="text-sm text-gray-400 hover:text-gray-300 mb-4 inline-block">← Back</RouterLink>
		<div v-if="!props.mode" class="max-w-3xl mx-auto">
			<h2 class="text-2xl font-semibold mb-4">Choose Training Mode</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<RouterLink v-for="m in modes" :to="`/training/${m.value}`"
					class="block mt-2 text-sm text-blue-400 hover:text-blue-300">Go to {{ m.label }}</RouterLink>
			</div>
		</div>

		<div v-if="props.mode == 'target'" class="w-full mx-auto">
			<div class="flex flex-row items-center gap-2 rounded-xl bg-[#1a1a1a]">
				<div class="flex flex-col justify-center items-center text-7xl h-full w-4/10 p-4 font-bold"
					:class="curTargetHit ? 'text-green-400' : ''">{{ getFieldName(curTarget) }}
					<div v-if="totalThrows > 0"
						class="flex flex-row justify-center items-center p-1 text-gray-400 mt-2">
						<div class="text-sm text-center text-gray-400 mt-2">{{ curThrows }} Throws
						</div>
						<div class="h-8 border-l border-gray-600 mx-4"></div>
						<div class="text-sm text-center text-gray-400 mt-2">{{ totalThrows }} Total Throws
						</div>
						<div class="h-8 border-l border-gray-600 mx-4"></div>
						<div class="text-sm text-center text-gray-400 mt-2">{{ getAccuracy() }}% Accuracy
						</div>
					</div>
				</div>
				<div class="h-24 border-l border-gray-600 mx-4"></div>
				<Dartboard ref="DartboardRef" class="w-full" :click-to-add-marker="true"></Dartboard>
			</div>
		</div>
		<div v-if="props.mode == 'checkouts'" class="mx-auto">
			<div class="flex flex-row gap-4 w-full h-full">
				<Player ref="PlayerRef" class="flex-auto h-auto w-full" :show-name="false" :show-sets="false"
					:show-avg="false" :show-history="false" :dart-board-ref="DartboardRef ?? undefined">
					<div class="absolute top-0 mt-8 flex flex-row gap-4">
						<button
							v-for="difficulty in checkoutDifficulties"
							:key="difficulty.value"
							type="button"
							@click="trainingStore.checkoutDifficulty = difficulty.value"
							@focus="trainingStore.checkoutDifficulty = difficulty.value"
							:class="['px-3 py-1 rounded-full text-sm font-semibold border transition-colors cursor-pointer', getDifficultyClass(difficulty.value)]">
							{{ difficulty.label }}
						</button>
					</div>
				</Player>
				<Dartboard ref="DartboardRef" class="flex-auto w-full" :click-to-add-marker="true"></Dartboard>
			</div>
		</div>

		<router-view />
	</div>
</template>

<script setup lang="ts">
import Dartboard from '@/components/Dartboard.vue';
import Player from '@/components/Player.vue';
import Separator from '@/components/ui/separator/Separator.vue';
import useSocket from '@/lib/socket';
import { useTrainingStore } from '@/stores/training/TrainingStore';
import { onMounted, ref, watch } from 'vue';

const trainingStore = useTrainingStore()

let { socket, status, data, send, close } = useSocket();

const PlayerRef = ref<InstanceType<typeof Player> | null>(null);
const DartboardRef = ref<InstanceType<typeof Dartboard> | null>(null);
const props = defineProps<{ mode?: string }>()

const modes = [
	{ value: 'target', label: 'Target Practice', desc: 'Work on hitting specific targets.' },
	{ value: 'around', label: 'Around The Clock', desc: 'Hit numbers in sequence.' },
	{ value: 'checkouts', label: 'Checkouts', desc: 'Practice finishing combinations.' },
	{ value: 'max', label: 'Max Score', desc: 'Aim for highest scoring.' }
]

const curTarget = ref<string>('')
const curTargetHit = ref<boolean>(false)
const curThrows = ref<number>(0)
const totalThrows = ref<number>(0)
const totalHits = ref<number>(0)
const locked = ref<boolean>(false)

const checkoutDifficulties = [
	{ value: 'auto', label: 'Auto', desc: 'Finish with any combination.' },
	{ value: 'easy', label: 'Easy', desc: 'Finish with simple combinations.' },
	{ value: 'medium', label: 'Medium', desc: 'Finish with moderate combinations.' },
	{ value: 'hard', label: 'Hard', desc: 'Finish with complex combinations.' }
]

const getDifficultyClass = (value: string) => {
	if (value === 'easy') return trainingStore.checkoutDifficulty === value ? 'border-green-600 bg-green-500/20 text-white' : 'border-green-400 text-white'
	if (value === 'medium') return trainingStore.checkoutDifficulty === value ? 'border-yellow-600 bg-yellow-500/20 text-white' : 'border-yellow-400 text-white'
	if (value === 'hard') return trainingStore.checkoutDifficulty === value ? 'border-red-600 bg-red-500/20 text-white' : 'border-red-400 text-white'
	return trainingStore.checkoutDifficulty === value ? 'border-blue-600 bg-blue-500/20 text-white' : 'border-blue-500 text-white'
}

const getFieldName = (id: string) => {
	if (id === 'miss') return 'Miss'
	if (id === 'outer-bull') return 'SB'
	if (id === 'bullseye') return 'Bull'
	const [type, num] = id.split('-')
	if (type === 'single') return `S${num}`
	if (type === 'double') return `D${num}`
	if (type === 'triple') return `T${num}`
	return id
}

const getAccuracy = () => {
	return totalThrows.value > 0 ? Math.round((totalHits.value / totalThrows.value) * 100) : 0
}

const getNextTarget = () => {
	const fields = DartboardRef.value?.getAllFields?.() ?? ['single-20']
	return fields[Math.floor(Math.random() * fields.length)] ?? 'single-20'
}

watch(data, (newData) => {
	if (newData.type === 'dart_hit') {
		const { x, y } = newData.data

		if (locked.value) return;

		if (props.mode == 'checkouts') {
			newData.data.segment = newData.data.segment.replace(/-inner|-outer/, '')
			PlayerRef.value?.PlayerInterface?.addThrow({
				field: getFieldName(newData.data.segment),
				score: DartboardRef.value?.getSegmentInfo?.(newData.data.segment)?.score ?? 0,
				x: newData.data.x,
				y: newData.data.y
			});
		}
		if (props.mode == 'target') {
			DartboardRef.value?.addHitMarker?.(x, y)
			newData.data.segment = newData.data.segment.replace(/-inner|-outer/, '')
			if (curTarget.value && newData.data.segment == curTarget.value) {
				curTargetHit.value = true
				totalHits.value++
				locked.value = true
				setTimeout(() => {
					DartboardRef.value?.clearMarkers?.()
					curTarget.value = getNextTarget()
					curThrows.value = 0
					curTargetHit.value = false
					locked.value = false
				}, 1500);
			} else {
				curThrows.value++
			}
			totalThrows.value++
		}
	}
})

onMounted(() => {
	if (props.mode === 'target') {
		curTarget.value = getNextTarget()
	}
})

</script>

<style scoped></style>
