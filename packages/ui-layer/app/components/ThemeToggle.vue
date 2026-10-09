<script setup lang="ts">
// Two-state toggle. Until the visitor chooses, the theme follows the system
// (colorMode.preference === 'system'); a click stores an explicit override.
defineProps<{ labelToLight: string; labelToDark: string }>();

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const toggle = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark';
};
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-glass-border bg-glass text-ink transition-colors hover:bg-glass-strong"
      :aria-label="isDark ? labelToLight : labelToDark"
      @click="toggle"
    >
      <svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    </button>
    <template #fallback>
      <span class="inline-block h-9 w-9" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
