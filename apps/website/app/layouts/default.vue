<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <div class="px-wash relative isolate min-h-screen overflow-x-clip text-ink">
    <PxAurora />
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-coral focus:px-3 focus:py-2 focus:text-on-coral"
    >
      {{ t('a11y.skip') }}
    </a>
    <SiteHeader />
    <main id="main" class="relative z-10">
      <slot />
      <div class="px-container pb-12"><TranslationEditLink /></div>
    </main>
    <SiteFooter />
  </div>
</template>
