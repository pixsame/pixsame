<script setup lang="ts">
// A glass card with an "Available" / "Coming soon" badge, a title and a short body.
// It is a link when `to` is given (the OSS packages grid, the changelog index).
defineProps<{ to?: string; available: boolean; title: string; body: string }>();
const { t } = useI18n();
const localePath = useLocalePath();
const NuxtLink = resolveComponent('NuxtLink');
</script>

<template>
  <component
    :is="to ? NuxtLink : 'div'"
    v-bind="to ? { to: localePath(to) } : {}"
    class="px-glass group relative flex h-full flex-col !rounded-lg p-5"
    :class="
      to
        ? 'transition-colors hover:bg-glass-strong active:opacity-80'
        : 'opacity-70'
    "
  >
    <svg
      v-if="to"
      class="absolute top-4 right-4 text-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
    <span
      class="font-mono text-[10px] tracking-[0.12em] uppercase"
      :class="available ? 'text-blue-text' : 'text-faint'"
    >
      {{ available ? t('pricing.oss.available') : t('pricing.soon') }}
    </span>
    <span class="mt-3 text-[17px] font-semibold">{{ title }}</span>
    <span class="mt-2 text-sm leading-relaxed text-muted">{{ body }}</span>
  </component>
</template>
