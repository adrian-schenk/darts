<template>
  <div class="dartboard-wrapper relative overflow-hidden">
    <div class="dartboard-container">
      <svg ref="svgRef" viewBox="0 0 500 500" class="dartboard-svg" @click="handleBoardClick">
        <defs>
          <filter id="sisalTexture" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="noise" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feComposite operator="in" in="noise" in2="SourceGraphic" result="composite" />
            <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
          </filter>

          <radialGradient id="grad-red" cx="50%" cy="50%" r="50%">
            <stop offset="30%" stop-color="#E63946" />
            <stop offset="100%" stop-color="#9e1b25" />
          </radialGradient>
          <radialGradient id="grad-green" cx="50%" cy="50%" r="50%">
            <stop offset="30%" stop-color="#4CAF50" />
            <stop offset="100%" stop-color="#1b5e20" />
          </radialGradient>
          <radialGradient id="grad-black" cx="50%" cy="50%" r="50%">
            <stop offset="30%" stop-color="#333" />
            <stop offset="100%" stop-color="#050505" />
          </radialGradient>
          <radialGradient id="grad-cream" cx="50%" cy="50%" r="50%">
            <stop offset="30%" stop-color="#f0e6d2" />
            <stop offset="100%" stop-color="#c5b392" />
          </radialGradient>
        </defs>

        <circle cx="250" cy="250" r="225" fill="#111" stroke="#222" stroke-width="2" />

        <g filter="url(#sisalTexture)" transform="translate(250, 250)">
          <path v-for="(segment, index) in segments" :key="`so-${index}`" :d="getSingleOuterPathD(index)"
            :fill="getSegmentFill(index)"
            :class="'segment ' + (highlightedSegment === `single-${segment}` ? 'segment_highlight' : '')"
            @mouseenter="activeSegment = `single-outer-${segment}`" @mouseleave="activeSegment = null" />
          <path v-for="(segment, index) in segments" :key="`d-${index}`" :d="getDoublePathD(index)"
            :fill="getDoubleFill(index)"
            :class="'segment ' + (highlightedSegment === `double-${segment}` ? 'segment_highlight' : '')"
            @mouseenter="activeSegment = `double-${segment}`" @mouseleave="activeSegment = null" />
          <path v-for="(segment, index) in segments" :key="`t-${index}`" :d="getTriplePathD(index)"
            :fill="getDoubleFill(index)"
            :class="'segment ' + (highlightedSegment === `triple-${segment}` ? 'segment_highlight' : '')"
            @mouseenter="activeSegment = `triple-${segment}`" @mouseleave="activeSegment = null" />
          <path v-for="(segment, index) in segments" :key="`si-${index}`" :d="getSingleInnerPathD(index)"
            :fill="getSegmentFill(index)"
            :class="'segment ' + (highlightedSegment === `single-${segment}` ? 'segment_highlight' : '')"
            @mouseenter="activeSegment = `single-inner-${segment}`" @mouseleave="activeSegment = null" />
          <circle cx="0" cy="0" :r="OUTER_BULL_R" fill="url(#grad-green)"
            :class="'segment ' + (highlightedSegment === 'outer-bull' ? 'segment_highlight' : '')"
            @mouseenter="activeSegment = 'outer-bull'" @mouseleave="activeSegment = null" />
          <circle cx="0" cy="0" :r="INNER_BULL_R" fill="url(#grad-red)"
            :class="'segment ' + (highlightedSegment === 'bullseye' ? 'segment_highlight' : '')"
            @mouseenter="activeSegment = 'bullseye'" @mouseleave="activeSegment = null" />
        </g>

        <g transform="translate(250, 250)" filter="url(#wireShadow)" pointer-events="none">
          <path v-for="(segment, index) in segments" :key="`w-${index}`" :d="getRadialWire(index)" stroke="#d8d8d8"
            stroke-width="1.2" fill="none" />
          <circle
            v-for="r in [DOUBLE_OUTER_R, DOUBLE_INNER_R, TRIPLE_OUTER_R, TRIPLE_INNER_R, OUTER_BULL_R, INNER_BULL_R]"
            :key="r" cx="0" cy="0" :r="r" class="wire-ring" />
        </g>

        <g class="dartboard-numbers" pointer-events="none">
          <text v-for="(num, i) in dartboardNumbers" :key="i" :x="250 + 200 * Math.cos((i * 18 - 90) * (Math.PI / 180))"
            :y="250 + 200 * Math.sin((i * 18 - 90) * (Math.PI / 180))" text-anchor="middle" dominant-baseline="middle"
            fill="white" font-weight="bold" font-size="22"
            :transform="`rotate(${i * 18}, ${250 + 200 * Math.cos((i * 18 - 90) * (Math.PI / 180))}, ${250 + 200 * Math.sin((i * 18 - 90) * (Math.PI / 180))})`">{{
              num }}</text>
        </g>

        <g transform="translate(250, 250)" pointer-events="none">
          <g v-for="(m, i) in markers" :key="m.id" :transform="`translate(${m.x}, ${m.y})`">
            <circle r="0" class="dart-ripple" />
            <circle r="4" fill="yellow" stroke="black" stroke-width="1" />
          </g>
        </g>
      </svg>

      <div v-if="showScore && activeSegment" class="scoreboard">
        <div class="score-top">{{ getSegmentInfo(activeSegment).name }}</div>
        <div class="score-main">{{ getSegmentInfo(activeSegment).score }}</div>
      </div>
    </div>
    <div v-if="PlayerInterface?.state.value == PlayerState.REMOVE_DARTS" class="absolute bg-slate-700/80 w-full h-full flex flex-col items-center justify-center top-0 left-0">
        <button @click="PlayerInterface && (PlayerInterface.endTurn())" class="text-2xl cursor-pointer border-2 rounded-full px-3 py-1 border-yellow-600 text-white font-bold hover:bg-yellow-600">Removed darts</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DartPlayer, PlayerState } from '@/lib/dartPlayer'
import useSocket from '@/lib/socket'
import { ref, watch } from 'vue'

let { socket, status, data, send, close } = useSocket()

const props = defineProps({
  clickToAddMarker: { type: Boolean, default: false },
  showScore: { type: Boolean, default: true },
  manualInput: { type: Boolean, default: true },
  PlayerInterface: { type: DartPlayer, default: null },
})

const svgRef = ref<SVGSVGElement | null>(null)
const markers = ref<{ x: number, y: number, id: string }[]>([])
const activeSegment = ref<string | null>(null)
const highlightedSegment = ref<string | null>("single-20")

const handleBoardClick = (event: MouseEvent) => {
  if (!props.clickToAddMarker || !svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()

  // 1. Position in pixels relative to SVG
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  // 2. Scale to 500x500 viewBox
  const scale = 500 / rect.width
  const finalX = (mouseX * scale) - 250
  const finalY = (mouseY * scale) - 250

  //console.log(`Hit at: x=${finalX.toFixed(2)}, y=${finalY.toFixed(2)}`)
  send('dart-event', { type: 'dart_hit', data: { x: finalX, y: finalY, segment: activeSegment.value ?? 'miss'} })
}

const addHitMarker = (x: number, y: number) => {
  markers.value.push({ x, y, id: Date.now().toString() })
  if (markers.value.length > 3) markers.value.shift()
}

const clearMarkers = () => {
  markers.value = []
}

const getAllFields = () => {
  const fields = []
  for (let i = 0; i < 20; i++) {
    const num = segments[i]
    fields.push(`single-${num}`, `double-${num}`, `triple-${num}`)
  }
  fields.push('outer-bull', 'bullseye')
  return fields
}

// --- LOGIC & MATH ---
const dartboardNumbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
const segments = Array.from({ length: 20 }, (_, i) => dartboardNumbers[i])
const DOUBLE_OUTER_R = 170, DOUBLE_INNER_R = 162, TRIPLE_OUTER_R = 107, TRIPLE_INNER_R = 99, OUTER_BULL_R = 16, INNER_BULL_R = 6.35

const getSegmentAngles = (i: number) => ({
  start: ((i * 18 - 9 - 90) * Math.PI) / 180,
  end: ((i * 18 + 9 - 90) * Math.PI) / 180
})

const arcPath = (r1: number, r2: number, start: number, end: number) => {
  const x1 = r1 * Math.cos(start), y1 = r1 * Math.sin(start)
  const x2 = r2 * Math.cos(start), y2 = r2 * Math.sin(start)
  const x3 = r2 * Math.cos(end), y3 = r2 * Math.sin(end)
  const x4 = r1 * Math.cos(end), y4 = r1 * Math.sin(end)
  return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 0 0 ${x1} ${y1} Z`
}

const getDoublePathD = (i: number) => arcPath(DOUBLE_INNER_R, DOUBLE_OUTER_R, getSegmentAngles(i).start, getSegmentAngles(i).end)
const getTriplePathD = (i: number) => arcPath(TRIPLE_INNER_R, TRIPLE_OUTER_R, getSegmentAngles(i).start, getSegmentAngles(i).end)
const getSingleOuterPathD = (i: number) => arcPath(TRIPLE_OUTER_R, DOUBLE_INNER_R, getSegmentAngles(i).start, getSegmentAngles(i).end)
const getSingleInnerPathD = (i: number) => arcPath(OUTER_BULL_R, TRIPLE_INNER_R, getSegmentAngles(i).start, getSegmentAngles(i).end)
const getRadialWire = (i: number) => {
  const a = getSegmentAngles(i).end
  return `M ${OUTER_BULL_R * Math.cos(a)} ${OUTER_BULL_R * Math.sin(a)} L ${DOUBLE_OUTER_R * Math.cos(a)} ${DOUBLE_OUTER_R * Math.sin(a)}`
}

const getSegmentFill = (i: number) => (i % 2 === 0 ? 'url(#grad-black)' : 'url(#grad-cream)')
const getDoubleFill = (i: number) => (i % 2 === 0 ? 'url(#grad-red)' : 'url(#grad-green)')

const getSegmentInfo = (s: string) => {
  if (s === 'miss') return { name: 'MISS', score: 0 }
  if (s === 'bullseye') return { name: 'BULLSEYE', score: 50 }
  if (s === 'outer-bull') return { name: 'OUTER BULL', score: 25 }
  const match = s.match(/-(\d+)/)
  const idx = match ? parseInt(match[1]) : 0
  const num = idx
  const mult = s.includes('double') ? 2 : s.includes('triple') ? 3 : 1
  return { name: `${s.includes('double') ? 'DOUBLE' : s.includes('triple') ? 'TRIPLE' : 'SINGLE'} ${num}`, score: num * mult }
}

defineExpose({ addHitMarker, clearMarkers, getAllFields, getSegmentInfo })

</script>

<style scoped>
.dartboard-wrapper {
  background: #1a1a1a;
  padding: 20px;
  border-radius: 20px;
  display: flex;
  justify-content: center;
}

.dartboard-container {
  width: 100%;
  max-width: 600px;
  position: relative;
}

.dartboard-svg {
  width: 100%;
  height: auto;
  cursor: crosshair;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
}

.segment:hover {
  filter: brightness(1.4);
}

.wire-ring {
  fill: none;
  stroke: #d8d8d8;
  stroke-width: 1.2;
}

.dart-ripple {
  fill: none;
  stroke: white;
  stroke-width: 2;
  animation: ripple 1.2s 3 ease-out forwards;
}

@keyframes ripple {
  0% {
    r: 0;
    opacity: 1;
  }

  100% {
    r: 50;
    opacity: 0;
  }
}

.scoreboard {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 10px 20px;
  border-radius: 10px;
  color: white;
  text-align: center;
  border: 1px solid #444;
}

.score-main {
  font-size: 1.8rem;
  font-weight: bold;
}

.score-top {
  font-size: 0.7rem;
  color: #888;
  text-transform: uppercase;
}
</style>
