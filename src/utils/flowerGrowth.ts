// src/utils/flowerGrowth.ts
export type FlowerStage = "seed" | "sprout" | "stem" | "bud" | "bloom"

export function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

/**
 * Give bloom enough runway for 12 sequential petals.
 */
export const FLOWER_THRESHOLDS = {
  seed: [0.0, 0.05],
  sprout: [0.05, 0.25],
  stem: [0.25, 0.55],
  bud: [0.55, 0.80],
  bloom: [0.80, 1.0],
} as const satisfies Record<FlowerStage, readonly [number, number]>

export function flowerStageFromProgress(progress01: number): FlowerStage {
  const p = clamp01(progress01)
  if (p < FLOWER_THRESHOLDS.seed[1]) return "seed"
  if (p < FLOWER_THRESHOLDS.sprout[1]) return "sprout"
  if (p < FLOWER_THRESHOLDS.stem[1]) return "stem"
  if (p < FLOWER_THRESHOLDS.bud[1]) return "bud"
  return "bloom"
}

export function remap(x: number, a: number, b: number) {
  if (a === b) return 0
  return clamp01((x - a) / (b - a))
}

// Organic easing (pure math)
export function easeOutCubic(t: number) {
  const x = clamp01(t)
  return 1 - Math.pow(1 - x, 3)
}
export function easeInOutSine(t: number) {
  const x = clamp01(t)
  return 0.5 - 0.5 * Math.cos(Math.PI * x)
}

/**
 * Sequential per-item progress with: gap -> grow -> hold (within each slice).
 * Guarantee: if gapRatio + growRatio <= 1, at most ONE item is actively growing.
 */
export function staggeredProgressV2(
  t01: number,
  index: number,
  count: number,
  gapRatio = 0.20,
  growRatio = 0.60
) {
  const t = clamp01(t01)
  const n = Math.max(1, count)
  const slice = 1 / n

  const start = index * slice
  const u = (t - start) / slice // local time within slice

  if (u <= gapRatio) return 0
  if (u >= gapRatio + growRatio) return 1
  return clamp01((u - gapRatio) / growRatio)
}
