<script setup lang="ts">
withDefaults(defineProps<{ size?: number; wordmark?: boolean }>(), {
  size: 22,
  wordmark: true,
});
</script>

<template>
  <span class="inline-flex items-center gap-[7px]">
    <span class="sr-only">pixsame</span>
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 64 64"
      class="block flex-none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="24" y="24" width="16" height="16" fill="var(--px-coral-fill)" />
      <rect x="6" y="6" width="34" height="34" rx="2" fill="none" stroke="var(--px-ink)" stroke-width="5" />
      <rect x="24" y="24" width="34" height="34" rx="2" fill="none" stroke="var(--px-ink)" stroke-width="5" />
    </svg>
    <span
      v-if="wordmark"
      class="font-heading inline-flex items-baseline text-[19px] leading-[1.05] font-bold tracking-[-0.01em] whitespace-nowrap text-ink"
      aria-hidden="true"
    >
      <span>p</span>
      <span class="relative inline-block">
        ı
        <svg
          viewBox="0 0 20 20"
          class="absolute top-[0.12em] left-1/2 h-[0.22em] w-[0.22em] -translate-x-1/2 overflow-visible"
        >
          <rect width="20" height="20" rx="2" fill="var(--px-coral-fill)" />
        </svg>
      </span>
      <span>xsame</span>
    </span>
  </span>
</template>
