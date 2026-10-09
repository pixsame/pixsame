<script setup lang="ts">
// Port of the mockup's aurora: two blue pools, seven blurred ribbons, a coral sheen,
// a scrim and the Swiss grid. All colours and strengths come from tokens.css.
type Ribbon = {
  c: 'coral' | 'blue' | 'magenta';
  l: number; t: number; w: number; h: number; rot: number; skew: number; blur: number;
  s: [number, number, number, number]; // gradient stop positions (%)
  a: [number, number, number, number]; // alphas at the stops (dark mode)
  m: [number, number, number, number]; // vertical mask stops (%)
};

const ribbons: Ribbon[] = [
  { c: 'coral', l: -4, t: -30, w: 34, h: 150, rot: -13, skew: -17, blur: 24, s: [18, 34, 56, 74], a: [0.8, 0.16, 0.88, 0.12], m: [2, 30, 74, 98] },
  { c: 'coral', l: 14, t: -34, w: 20, h: 140, rot: -8, skew: -12, blur: 13, s: [26, 44, 62, 80], a: [0.55, 0.11, 0.61, 0.08], m: [6, 38, 80, 98] },
  { c: 'magenta', l: 30, t: -26, w: 26, h: 132, rot: 9, skew: 14, blur: 30, s: [20, 40, 60, 78], a: [0.5, 0.1, 0.55, 0.07], m: [4, 34, 76, 98] },
  { c: 'coral', l: 48, t: -36, w: 16, h: 146, rot: 6, skew: 10, blur: 10, s: [30, 48, 66, 84], a: [0.6, 0.12, 0.66, 0.09], m: [8, 40, 78, 98] },
  { c: 'blue', l: 58, t: -30, w: 30, h: 150, rot: 14, skew: 18, blur: 28, s: [16, 36, 58, 76], a: [0.72, 0.14, 0.79, 0.11], m: [2, 32, 76, 98] },
  { c: 'blue', l: 76, t: -34, w: 18, h: 140, rot: 18, skew: 16, blur: 12, s: [24, 44, 64, 82], a: [0.55, 0.11, 0.61, 0.08], m: [6, 36, 80, 98] },
  { c: 'magenta', l: 86, t: -28, w: 24, h: 138, rot: 22, skew: 20, blur: 34, s: [22, 42, 62, 80], a: [0.42, 0.08, 0.46, 0.06], m: [4, 34, 78, 98] },
];

const style = (r: Ribbon) => ({
  '--c': `var(--px-aurora-${r.c})`,
  left: `${r.l}%`, top: `${r.t}%`, width: `${r.w}%`, height: `${r.h}%`,
  transform: `rotate(${r.rot}deg) skewX(${r.skew}deg)`,
  filter: `blur(${r.blur}px)`,
  '--s1': `${r.s[0]}%`, '--s2': `${r.s[1]}%`, '--s3': `${r.s[2]}%`, '--s4': `${r.s[3]}%`,
  '--a1': r.a[0], '--a2': r.a[1], '--a3': r.a[2], '--a4': r.a[3],
  '--m1': `${r.m[0]}%`, '--m2': `${r.m[1]}%`, '--m3': `${r.m[2]}%`, '--m4': `${r.m[3]}%`,
});
</script>

<template>
  <div class="px-aurora" aria-hidden="true">
    <div class="px-aurora-field">
      <div class="px-pool px-pool-top" />
      <div class="px-pool px-pool-bottom" />
      <div v-for="(r, i) in ribbons" :key="i" class="px-ribbon" :style="style(r)" />
      <div class="px-sheen" />
      <div class="px-scrim" />
    </div>
    <div class="px-grid-v" />
    <div class="px-grid-h" />
  </div>
</template>
