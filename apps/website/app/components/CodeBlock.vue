<script setup lang="ts">
defineProps<{ file: string; code: string }>();
</script>

<template>
  <figure class="px-glass !rounded-lg overflow-hidden">
    <figcaption class="border-b border-hairline px-4 py-2.5 font-mono text-[11px] tracking-[0.1em] text-muted">{{ file }}</figcaption>
    <pre tabindex="0" class="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed"><code>{{ code }}</code></pre>
  </figure>
</template>
