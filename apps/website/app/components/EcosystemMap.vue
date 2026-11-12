<script setup lang="ts">
// The ecosystem as three columns: runners write the manifest, the renderer pins the pixels,
// the platform is where results are kept and judged, the GitHub App is where the team reviews.
// Each part shows its description on hover or keyboard focus (always visible below the lg breakpoint).
const { t } = useI18n();
const localePath = useLocalePath();
const NuxtLink = resolveComponent('NuxtLink');

type Part = { key: string; to?: string; available?: boolean };
const columns: { key: string; parts: Part[] }[] = [
  {
    key: 'runners',
    parts: [
      { key: 'cypress', to: '/products/cypress-plugin', available: true },
      { key: 'playwright', to: '/playwright' },
      { key: 'vitest', to: '/vitest' },
    ],
  },
  {
    key: 'standard',
    parts: [
      { key: 'manifest', to: '/docs/reference/manifest', available: true },
      { key: 'renderer', to: '/platform' },
    ],
  },
  {
    key: 'review',
    parts: [
      { key: 'platform', to: '/platform' },
      { key: 'evaluator', to: '/platform' },
      { key: 'githubApp', to: '/github-app' },
    ],
  },
];
</script>

<template>
  <div class="grid gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
    <section v-for="(col, i) in columns" :key="col.key" class="relative">
      <p class="px-eyebrow !text-faint">{{ t(`product.groups.${col.key}`) }}</p>
      <ul class="mt-4 space-y-3">
        <li v-for="part in col.parts" :key="part.key">
          <component
            :is="part.to ? NuxtLink : 'div'"
            v-bind="part.to ? { to: localePath(part.to) } : { tabindex: 0 }"
            class="px-glass group block cursor-pointer !rounded-lg p-4 transition-all hover:-translate-y-0.5 hover:bg-glass-strong focus-visible:-translate-y-0.5 active:translate-y-0 active:opacity-80"
            :class="part.available ? '!border-coral/40' : ''"
          >
            <span class="flex items-center justify-between gap-2">
              <span class="text-[15px] font-semibold">{{
                t(`product.map.${part.key}.name`)
              }}</span>
              <span class="flex items-center gap-2">
                <span
                  class="font-mono text-[10px] tracking-[0.1em] whitespace-nowrap uppercase"
                  :class="part.available ? 'text-blue-text' : 'text-faint'"
                >
                  {{
                    part.available ? t('product.available') : t('pricing.soon')
                  }}
                </span>
                <svg
                  class="hidden shrink-0 text-faint transition-transform duration-200 group-hover:rotate-180 group-hover:text-ink group-focus-visible:rotate-180 lg:block"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </span>
            <span
              class="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-200 lg:grid-rows-[0fr] lg:opacity-0 lg:group-focus-visible:grid-rows-[1fr] lg:group-focus-visible:opacity-100 lg:group-hover:grid-rows-[1fr] lg:group-hover:opacity-100"
            >
              <span class="overflow-hidden text-sm leading-relaxed text-muted"
                ><span class="mt-2 block">{{
                  t(`product.map.${part.key}.body`)
                }}</span></span
              >
            </span>
          </component>
        </li>
      </ul>
      <span
        v-if="i < columns.length - 1"
        class="absolute top-1/2 -right-5 hidden text-faint lg:block"
        aria-hidden="true"
        >→</span
      >
    </section>
  </div>
</template>
