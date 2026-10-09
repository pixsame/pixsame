<script setup lang="ts">
// Overrides @nuxt/content's code block so scrollable code is keyboard-focusable.
defineProps<{ code?: string; language?: string | null; filename?: string | null; highlights?: number[]; meta?: string; class?: string | null }>();
</script>

<template>
  <pre tabindex="0" :class="$props.class"><slot /></pre>
</template>
