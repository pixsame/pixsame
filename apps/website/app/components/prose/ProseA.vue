<script setup lang="ts">
// Overrides @nuxtjs/mdc's link so site-internal links written in markdown (docs, the plugin README)
// stay in the visitor's locale; anchors and external URLs pass through untouched.
const props = defineProps<{ href?: string; target?: string }>();
const localePath = useLocalePath();
const to = computed(() =>
  props.href?.startsWith('/') ? localePath(props.href) : props.href,
);
</script>

<template>
  <NuxtLink :href="to" :target="target"><slot /></NuxtLink>
</template>
