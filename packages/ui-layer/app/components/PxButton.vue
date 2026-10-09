<script setup lang="ts">
withDefaults(
  defineProps<{ to?: string; variant?: 'primary' | 'ghost' }>(),
  { variant: 'primary' },
);
</script>

<template>
  <component
    :is="to ? (to.startsWith('http') ? 'a' : resolveComponent('NuxtLink')) : 'button'"
    v-bind="to ? (to.startsWith('http') ? { href: to } : { to }) : { type: 'button' }"
    class="inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-colors"
    :class="
      variant === 'primary'
        ? 'rounded-full bg-coral px-4 py-2.5 text-on-coral hover:brightness-110'
        : 'text-ink underline decoration-hairline underline-offset-[6px] hover:decoration-coral'
    "
  >
    <slot />
  </component>
</template>
