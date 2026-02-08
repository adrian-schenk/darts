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
					<div v-if="totalThrows > 0" class="flex flex-row justify-center items-center p-1 text-gray-400 mt-2">
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
		<div v-if="props.mode == 'checkouts'" class="max-w-3xl mx-auto">
			<h2 class="text-2xl font-semibold mb-4">Checkouts Practice</h2>
			<p class="mb-4">Practice finishing combinations.</p>
			<Dartboard ref="DartboardRef"></Dartboard>
		</div>

		<router-view />
	</div>
</template>

<script setup lang="ts">
import Dartboard from '@/components/Dartboard.vue';
import Separator from '@/components/ui/separator/Separator.vue';
import useSocket from '@/lib/socket';
import { onMounted, ref, watch } from 'vue';

let { socket, status, data, send, close } = useSocket();

const DartboardRef = ref(Dartboard);
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

const getFieldName = (id: String) => {
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
	return DartboardRef.value.getAllFields()[Math.floor(Math.random() * DartboardRef.value.getAllFields().length)]
}

watch(data, (newData) => {
	if (newData.type === 'dart_hit') {
		const { x, y } = newData.data
		DartboardRef.value.addHitMarker(x, y)
		newData.data.segment = newData.data.segment.replace(/-inner|-outer/, '')
		if (newData.data.segment == curTarget.value) {
			curTargetHit.value = true
			totalHits.value++
			setTimeout(() => {
				DartboardRef.value.clearMarkers()
				curTarget.value = getNextTarget()
				curThrows.value = 0
				curTargetHit.value = false
			}, 1500);
		} else {
			curThrows.value++
		}
		totalThrows.value++
	}
})

onMounted(() => {
	if (props.mode === 'target') {
		curTarget.value = getNextTarget()
	}
})

</script>

<style scoped></style>