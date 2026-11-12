<script setup lang="ts">
// Shared frame for every inner page: breadcrumbs with fixed spacing, then the content.
// Use it for each new page so breadcrumbs, spacing and widths stay unified.
export interface Crumb {
  label: string;
  to?: string;
}

withDefaults(defineProps<{ crumbs?: Crumb[]; width?: 'full' | 'prose' }>(), {
  crumbs: () => [],
  width: 'full',
});
const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <div class="px-container pt-8 pb-24">
    <nav v-if="crumbs.length" :aria-label="t('crumb.label')" class="mb-10">
      <ol
        class="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tracking-[0.12em] text-faint uppercase"
      >
        <li class="flex items-center gap-2">
          <NuxtLink
            :to="localePath('/')"
            class="transition-colors hover:text-ink active:text-coral-text"
            >{{ t('crumb.home') }}</NuxtLink
          >
        </li>
        <li v-for="(c, i) in crumbs" :key="i" class="flex items-center gap-2">
          <span aria-hidden="true">/</span>
          <NuxtLink
            v-if="c.to && i < crumbs.length - 1"
            :to="localePath(c.to)"
            class="transition-colors hover:text-ink active:text-coral-text"
            >{{ c.label }}</NuxtLink
          >
          <span v-else aria-current="page" class="text-muted">{{
            c.label
          }}</span>
        </li>
      </ol>
    </nav>
    <div :class="width === 'prose' ? 'max-w-[72ch]' : ''">
      <slot />
    </div>
  </div>
</template>
