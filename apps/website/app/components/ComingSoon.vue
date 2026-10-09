<script setup lang="ts">
// Template for the unreleased-product pages: github-app, playwright, platform.
const props = defineProps<{ page: 'githubApp' | 'playwright' | 'platform'; product: string }>();
const { t } = useI18n();
useSeoMeta({ title: () => t(`soon.${props.page}.title`), description: () => t(`soon.${props.page}.body`) });
</script>

<template>
  <section class="px-container pt-[74px] pb-24">
    <div class="max-w-[680px]">
      <p class="px-eyebrow">{{ t('soon.status') }}</p>
      <h1 class="mt-5 text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.06]">{{ t(`soon.${props.page}.title`) }}</h1>
      <p class="mt-5 text-[17px] leading-relaxed text-muted">{{ t(`soon.${props.page}.body`) }}</p>
      <ul class="mt-8 space-y-3">
        <li v-for="n in 3" :key="n" class="px-glass !rounded-lg flex gap-3 p-4">
          <span class="font-mono text-xs text-coral-text" aria-hidden="true">0{{ n }}</span>
          <span>{{ t(`soon.${props.page}.b${n}`) }}</span>
        </li>
      </ul>
      <div class="mt-10"><WaitlistForm :product="product" /></div>
    </div>
  </section>
</template>
