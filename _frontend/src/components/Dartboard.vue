<template>
  <div class="dartboard-wrapper">
    <div class="dartboard-container">
      <svg viewBox="0 0 500 500" class="dartboard-svg">
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

          <filter id="wireShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.8" flood-color="black" flood-opacity="0.6" />
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
          
          <g id="singles-outer">
            <path
              v-for="(segment, index) in segments"
              :key="`single-outer-${index}`"
              :d="getSingleOuterPathD(index)"
              :fill="getSegmentFill(index)"
              class="segment"
              @mouseenter="activeSegment = `single-outer-${index}`"
              @mouseleave="activeSegment = null"
            />
          </g>

          <g id="doubles">
            <path
              v-for="(segment, index) in segments"
              :key="`double-${index}`"
              :d="getDoublePathD(index)"
              :fill="getDoubleFill(index)"
              class="segment"
              @mouseenter="activeSegment = `double-${index}`"
              @mouseleave="activeSegment = null"
            />
          </g>

          <g id="triples">
            <path
              v-for="(segment, index) in segments"
              :key="`triple-${index}`"
              :d="getTriplePathD(index)"
              :fill="getDoubleFill(index)"
              class="segment"
              @mouseenter="activeSegment = `triple-${index}`"
              @mouseleave="activeSegment = null"
            />
          </g>

          <g id="singles-inner">
            <path
              v-for="(segment, index) in segments"
              :key="`single-inner-${index}`"
              :d="getSingleInnerPathD(index)"
              :fill="getSegmentFill(index)"
              class="segment"
              @mouseenter="activeSegment = `single-inner-${index}`"
              @mouseleave="activeSegment = null"
            />
          </g>

          <circle
            cx="0" cy="0"
            :r="OUTER_BULL_R"
            fill="url(#grad-green)"
            class="segment"
            @mouseenter="activeSegment = 'outer-bull'"
            @mouseleave="activeSegment = null"
          />

          <circle
            cx="0" cy="0"
            :r="INNER_BULL_R"
            fill="url(#grad-red)"
            class="segment"
            @mouseenter="activeSegment = 'bullseye'"
            @mouseleave="activeSegment = null"
          />
        </g>

        <g class="wireframe" transform="translate(250, 250)" filter="url(#wireShadow)">
           <path v-for="(segment, index) in segments" :key="`wire-${index}`"
                 :d="getRadialWire(index)"
                 stroke="#d8d8d8" stroke-width="1.2" fill="none" stroke-linecap="round" />
           
           <circle cx="0" cy="0" :r="DOUBLE_OUTER_R" class="wire-ring" />
           <circle cx="0" cy="0" :r="DOUBLE_INNER_R" class="wire-ring" />
           <circle cx="0" cy="0" :r="TRIPLE_OUTER_R" class="wire-ring" />
           <circle cx="0" cy="0" :r="TRIPLE_INNER_R" class="wire-ring" />
           <circle cx="0" cy="0" :r="OUTER_BULL_R" class="wire-ring" />
           <circle cx="0" cy="0" :r="INNER_BULL_R" class="wire-ring" />
        </g>

        <g id="numbers" class="dartboard-numbers">
          <text
            v-for="(number, index) in dartboardNumbers"
            :key="`num-${index}`"
            :x="250 + 200 * Math.cos((index * 18 - 90) * (Math.PI / 180))"
            :y="250 + 200 * Math.sin((index * 18 - 90) * (Math.PI / 180))"
            text-anchor="middle"
            dominant-baseline="middle"
            :transform="`rotate(${index * 18}, ${250 + 200 * Math.cos((index * 18 - 90) * (Math.PI / 180))}, ${250 + 200 * Math.sin((index * 18 - 90) * (Math.PI / 180))})`"
          >
            {{ number }}
          </text>
        </g>
      </svg>

      <transition name="fade">
        <div v-if="activeSegment" class="scoreboard">
           <div class="score-top">{{ getSegmentInfo(activeSegment).name }}</div>
           <div class="score-main">{{ getSegmentInfo(activeSegment).score }}</div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const dartboardNumbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
const segments = Array.from({ length: 20 }, (_, i) => i)
const activeSegment = ref<string | null>(null)

// --- MEASUREMENTS (In Millimeters) ---
// 1 SVG Unit = 1mm

const RING_WIDTH = 8

// Radius calculations based on your specs:
// "center to outer double edge is 170mm"
const DOUBLE_OUTER_R = 170
const DOUBLE_INNER_R = 170 - RING_WIDTH // 162mm

// "center to outer triple edge is 107mm"
const TRIPLE_OUTER_R = 107
const TRIPLE_INNER_R = 107 - RING_WIDTH // 99mm

// "inner bull is 12.7mm (dia) and outer bull is 32mm (dia)"
const OUTER_BULL_R = 32 / 2   // 16mm radius
const INNER_BULL_R = 12.7 / 2 // 6.35mm radius

// --- MATH HELPERS ---

const getSegmentAngles = (index: number) => {
  const startAngle = ((index * 18 - 9 - 90) * Math.PI) / 180
  const endAngle = ((index * 18 + 9 - 90) * Math.PI) / 180
  return { startAngle, endAngle }
}

const arcPath = (r1: number, r2: number, startAngle: number, endAngle: number) => {
  // Since we translated the Group to 250,250, our center is 0,0 for calculations
  const cx = 0
  const cy = 0
  
  const x1 = cx + r1 * Math.cos(startAngle)
  const y1 = cy + r1 * Math.sin(startAngle)
  const x2 = cx + r2 * Math.cos(startAngle)
  const y2 = cy + r2 * Math.sin(startAngle)
  const x3 = cx + r2 * Math.cos(endAngle)
  const y3 = cy + r2 * Math.sin(endAngle)
  const x4 = cx + r1 * Math.cos(endAngle)
  const y4 = cy + r1 * Math.sin(endAngle)

  return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 0 0 ${x1} ${y1} Z`
}

// --- PATH GENERATORS ---

const getDoublePathD = (i: number) => {
  const { startAngle, endAngle } = getSegmentAngles(i)
  return arcPath(DOUBLE_INNER_R, DOUBLE_OUTER_R, startAngle, endAngle)
}

const getTriplePathD = (i: number) => {
  const { startAngle, endAngle } = getSegmentAngles(i)
  return arcPath(TRIPLE_INNER_R, TRIPLE_OUTER_R, startAngle, endAngle)
}

const getSingleOuterPathD = (i: number) => {
  const { startAngle, endAngle } = getSegmentAngles(i)
  // Fill space between Double Inner and Triple Outer
  return arcPath(TRIPLE_OUTER_R, DOUBLE_INNER_R, startAngle, endAngle)
}

const getSingleInnerPathD = (i: number) => {
  const { startAngle, endAngle } = getSegmentAngles(i)
  // Fill space between Triple Inner and Outer Bull
  return arcPath(OUTER_BULL_R, TRIPLE_INNER_R, startAngle, endAngle)
}

const getRadialWire = (i: number) => {
  const angle = ((i * 18 + 9 - 90) * Math.PI) / 180
  // Wire runs from Outer Bull edge to Double Outer edge
  const x1 = OUTER_BULL_R * Math.cos(angle)
  const y1 = OUTER_BULL_R * Math.sin(angle)
  const x2 = DOUBLE_OUTER_R * Math.cos(angle)
  const y2 = DOUBLE_OUTER_R * Math.sin(angle)
  return `M ${x1} ${y1} L ${x2} ${y2}`
}

// --- DISPLAY LOGIC ---

const getSegmentFill = (i: number) => (i % 2 === 0 ? 'url(#grad-black)' : 'url(#grad-cream)')
const getDoubleFill = (i: number) => (i % 2 === 0 ? 'url(#grad-red)' : 'url(#grad-green)')

const getSegmentInfo = (segment: string) => {
  if (segment === 'bullseye') return { name: 'BULLSEYE', score: 50 }
  if (segment === 'outer-bull') return { name: 'OUTER BULL', score: 25 }

  const match = segment.match(/(\w+)-(\w+)-(\d+)|(\w+)-(\d+)/)
  if (!match) return { name: '', score: 0 }
  
  let typeStr, indexStr;
  if (match[1] && match[3]) { typeStr = match[1] + '-' + match[2]; indexStr = match[3]; }
  else { typeStr = match[4]; indexStr = match[5]; }

  const index = parseInt(indexStr)
  const number = dartboardNumbers[index]
  
  let mult = 1
  let label = 'SINGLE'
  
  if (typeStr.includes('double')) { mult = 2; label = 'DOUBLE'; }
  if (typeStr.includes('triple')) { mult = 3; label = 'TRIPLE'; }
  
  return { name: `${label} ${number}`, score: number * mult }
}
</script>

<style scoped>
.dartboard-wrapper {
  background: #222;
  padding: 40px;
  border-radius: 20px;
  display: flex;
  justify-content: center;
  font-family: 'Arial', sans-serif;
}

.dartboard-container {
  width: 100%;
  max-width: 600px;
  position: relative;
  user-select: none;
}

.dartboard-svg {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.5));
}

.segment {
  cursor: pointer;
  stroke: rgba(0,0,0,0.2); 
  stroke-width: 0.5; /* Faint line between segments */
  transition: opacity 0.1s;
}

.segment:hover {
  filter: brightness(1.4);
  mask: url(#sisalTexture);
}

.wire-ring {
  fill: none;
  stroke: #d8d8d8;
  stroke-width: 1.2;
}

.dartboard-numbers text {
  font-size: 22px;
  font-weight: bold;
  fill: #fff;
  pointer-events: none;
}

/* Scoreboard HUD */
.scoreboard {
  position: absolute;
  top: 90%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(15, 15, 15, 0.9);
  backdrop-filter: blur(4px);
  border: 1px solid #555;
  padding: 10px 20px;
  border-radius: 8px;
  text-align: center;
  pointer-events: none;
  min-width: 100px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
}

.score-top {
  color: #aaa;
  font-size: 0.75rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.score-main {
  color: #fff;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -45%);
}
</style>