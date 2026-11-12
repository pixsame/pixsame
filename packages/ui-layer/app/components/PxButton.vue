<script setup lang="ts">
const props = withDefaults(
  defineProps<{ to?: string; variant?: 'primary' | 'ghost' }>(),
  { variant: 'primary' },
);
// resolveComponent must run in script: called inside the template it renders a literal <NuxtLink> tag.
const NuxtLink = resolveComponent('NuxtLink');
const external = computed(() => !!props.to?.startsWith('http'));
</script>

<template>
  <a
    v-if="to && external"
    :href="to"
    class="px-btn"
    :class="`px-btn-${variant}`"
    ><slot
  /></a>
  <component
    :is="NuxtLink"
    v-else-if="to"
    :to="to"
    class="px-btn"
    :class="`px-btn-${variant}`"
    ><slot
  /></component>
  <button v-else type="button" class="px-btn" :class="`px-btn-${variant}`">
    <slot />
  </button>
</template>
