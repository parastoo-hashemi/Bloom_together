<script setup lang="ts">
import { computed } from "vue"
import {
  clamp01,
  flowerStageFromProgress,
  FLOWER_THRESHOLDS as T,
  remap,
  easeInOutSine,
  easeOutCubic,
  staggeredProgressV2,
  type FlowerStage,
} from "@/utils/flowerGrowth"

const props = defineProps({
  progress: { type: Number, required: true }, // 0..1
  size: { type: Number, default: 96 },
  compact: { type: Boolean, default: false }, // true for 40x40 friend icons
  title: { type: String, default: "" },
})

const p = computed(() => clamp01(props.progress))
const stage = computed<FlowerStage>(() => flowerStageFromProgress(p.value))

// Flat palette (daisy)
const COLORS = {
  petal: "#FFD84D",
  center: "#FF8A1F",
  stem: "#2FB34A",
  leaf: "#259A3D",
  seed: "#8B5E34",
  seedHi: "#F6C14B",
}

// Local semantic progress per stage (0..1 inside stage)
const budLP = computed(() => remap(p.value, T.bud[0], T.bud[1]))
const bloomLP = computed(() => remap(p.value, T.bloom[0], T.bloom[1]))

// Stem: continuous growth from sprout start to bud end
const stemGrow = computed(() => easeInOutSine(remap(p.value, T.sprout[0], T.bud[1])))
const STEM_DASH = 120
const stemDashoffset = computed(() => STEM_DASH * (1 - stemGrow.value))
const stemOpacity = computed(() => remap(p.value, T.sprout[0], T.sprout[0] + 0.06))

// Leaves: fade in
const leaf1Opacity = computed(() => easeOutCubic(remap(p.value, T.sprout[0] + 0.04, T.stem[0] + 0.10)))
const leaf2Opacity = computed(() => easeOutCubic(remap(p.value, T.sprout[0] + 0.10, T.stem[0] + 0.20)))

// Bud -> Bloom: crossfade/scale (no snapping)
const budAppear = computed(() => easeOutCubic(budLP.value))
const budExit = computed(() => 1 - easeOutCubic(bloomLP.value))
const budOpacity = computed(() => budAppear.value * budExit.value)
const budScale = computed(() => {
  const base = 0.75 + 0.35 * budAppear.value
  const retreat = 0.92 + 0.08 * budExit.value
  return base * retreat
})

// Bloom visibility fade-in
const bloomOpacity = computed(() => remap(p.value, T.bloom[0], T.bloom[0] + 0.08))

// Petals: strict sequential in a sub-window of bloomLP
const petalPhase = computed(() => clamp01(bloomLP.value / 0.85)) // last 15% = fully bloomed hold
const petalCount = computed(() => (props.compact ? 8 : 12))
const petalAngles = computed(() => {
  const n = petalCount.value
  const step = 360 / n
  return Array.from({ length: n }, (_, i) => i * step)
})

// Anchor points
const flowerCy = computed(() => (props.compact ? 50 : 46))
const budCy = computed(() => (props.compact ? 44 : 40))

// Petal progress: one-by-one with gap/grow/hold
function petalT(i: number) {
  const raw = staggeredProgressV2(petalPhase.value, i, petalCount.value, 0.20, 0.60)
  return easeOutCubic(raw)
}

// Grow outward from center: use scaleY only (cartoon look), keep width constant
function petalSY(i: number) {
  const t = petalT(i)
  return 0.08 + 0.92 * t
}

// Center radius grows through bloom
const centerGrow = computed(() => easeOutCubic(bloomLP.value))
const centerR = computed(() => {
  const r0 = props.compact ? 5 : 4.2
  const r1 = props.compact ? 13 : 11.5
  return r0 + (r1 - r0) * centerGrow.value
})
</script>

<template>
  <div class="wrap" :style="{ width: `${size}px`, height: `${size}px` }" :title="title" aria-label="Flower growth">
    <svg class="svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img">
      <!-- Seed (mounted; fades out as sprout begins) -->
      <g :style="{ opacity: 1 - remap(p, T.seed[0], T.sprout[0] + 0.05), transition: 'opacity 160ms ease' }">
        <circle cx="50" cy="84" :r="compact ? 5 : 4.2" :fill="COLORS.seed" />
        <circle v-if="!compact" cx="48.7" cy="82.7" r="1.4" :fill="COLORS.seedHi" opacity="0.9" />
      </g>

      <!-- Stem (mounted; drawn continuously via dashoffset) -->
      <path
        d="M50 92 L50 46"
        :stroke="COLORS.stem"
        :stroke-width="compact ? 8 : 7"
        stroke-linecap="round"
        fill="none"
        :style="{
          opacity: stemOpacity,
          strokeDasharray: STEM_DASH,
          strokeDashoffset: stemDashoffset,
          transition: 'stroke-dashoffset 80ms linear, opacity 160ms ease',
        }"
      />

      <!-- Leaves (mounted; fade in) -->
      <ellipse
        :cx="compact ? 44 : 42.5"
        :cy="compact ? 74 : 70"
        :rx="compact ? 7 : 9"
        :ry="compact ? 4.2 : 4.8"
        :fill="COLORS.leaf"
        :transform="compact ? 'rotate(-25 44 74)' : 'rotate(-25 42.5 70)'"
        :style="{ opacity: compact ? leaf1Opacity : leaf2Opacity, transition: 'opacity 200ms ease' }"
      />
      <ellipse
        v-show="!compact"
        cx="56.5"
        cy="73"
        rx="6.5"
        ry="3.6"
        :fill="COLORS.leaf"
        transform="rotate(25 56.5 73)"
        :style="{ opacity: leaf2Opacity, transition: 'opacity 200ms ease' }"
      />

      <!-- Bud (mounted; scales in then yields to bloom) -->
      <g
        :style="{
          opacity: budOpacity,
          transform: `translate(50px, ${budCy}px) scale(${budScale}) translate(-50px, -${budCy}px)`,
          transition: 'opacity 180ms ease, transform 220ms ease',
        }"
      >
        <ellipse cx="50" :cy="budCy" :rx="compact ? 10 : 9" :ry="compact ? 9 : 8" :fill="COLORS.petal" />
        <circle cx="50" :cy="budCy" :r="compact ? 5 : 4.2" :fill="COLORS.center" />
      </g>

      <!-- Petals (FIXED: no exploding transforms; grow outward from center) -->
      <!-- Strategy:
           - each petal group rotates around (50, flowerCy)
           - ellipse is centered at (50, flowerCy) then translated upward (so base stays near center)
           - scaleY on group makes it extend outward from center
      -->
      <g :style="{ opacity: bloomOpacity, transition: 'opacity 180ms ease' }">
        <g
          v-for="(a, i) in petalAngles"
          :key="i"
          :transform="`rotate(${a} 50 ${flowerCy}) scale(1 ${petalSY(i)})`"
          :style="{
            opacity: petalT(i),
            transition: 'opacity 260ms ease',
          }"
        >
          <ellipse
            cx="50"
            :cy="flowerCy"
            :rx="compact ? 7 : 6.5"
            :ry="compact ? 15 : 14"
            :fill="COLORS.petal"
            :transform="`translate(0, ${compact ? -16 : -18})`"
          />
        </g>
      </g>

      <!-- Center (mounted; radius grows) -->
      <circle
        cx="50"
        :cy="flowerCy"
        :r="centerR"
        :fill="COLORS.center"
        :style="{ opacity: bloomOpacity, transition: 'r 260ms ease, opacity 180ms ease' }"
      />

      <desc>stage: {{ stage }}</desc>
    </svg>
  </div>
</template>

<style scoped>
.wrap { display: grid; place-items: center; }
.svg { width: 100%; height: 100%; display: block; }
</style>
