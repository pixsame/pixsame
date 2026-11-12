<script setup lang="ts">
// Docs get the quiet variant of the site frame: solid ground, no Swiss grid, the four-pool aurora from the mockup.
const { t } = useI18n();
</script>

<template>
  <div class="relative isolate min-h-screen overflow-x-clip bg-ground text-ink">
    <div
      class="pointer-events-none fixed inset-0 -z-10 bg-[image:var(--px-docs-aurora)]"
      aria-hidden="true"
    />
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-coral focus:px-3 focus:py-2 focus:text-on-coral"
    >
      {{ t('a11y.skip') }}
    </a>
    <SiteHeader />
    <main id="main" class="relative z-10">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
