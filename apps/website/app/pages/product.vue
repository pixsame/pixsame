<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
useSeoMeta({ title: () => t('product.title'), description: () => t('product.body') });
const code = `import { defineConfig } from 'cypress';
import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
  },
});`;
const stats = ['manifest', 'runners', 'license'] as const;
</script>

<template>
  <section class="px-container pt-[74px] pb-24">
    <p class="font-mono text-[11px] tracking-[0.12em] text-faint uppercase">{{ t('nav.product') }} / {{ t('product.crumb') }}</p>
    <div class="mt-6 grid items-start gap-12 lg:grid-cols-12">
      <div class="lg:col-span-6">
        <h1 class="text-[clamp(2.2rem,4.6vw,2.9rem)] leading-[1.06]">{{ t('product.title') }}</h1>
        <p class="mt-5 text-[16.5px] leading-relaxed text-muted">{{ t('product.body') }}</p>
        <p class="mt-4 inline-block rounded-full bg-chip px-3 py-1 font-mono text-[10px] tracking-[0.12em] uppercase">{{ t('product.status') }}</p>
        <div class="mt-8 flex flex-wrap items-center gap-6">
          <PxButton :to="localePath('/docs/install')">{{ t('product.start') }}</PxButton>
          <PxButton variant="ghost" :to="localePath('/pricing')">{{ t('pricing.compare') }} →</PxButton>
        </div>
      </div>
      <div class="lg:col-span-6"><CodeBlock file="cypress.config.ts" :code="code" /></div>
    </div>
    <dl class="mt-16 grid gap-4 sm:grid-cols-3">
      <div v-for="s in stats" :key="s" class="px-glass !rounded-lg p-5">
        <dd class="font-heading text-4xl font-bold">{{ t(`product.stats.${s}.value`) }}</dd>
        <dt class="mt-1 text-sm text-muted">{{ t(`product.stats.${s}.label`) }}</dt>
      </div>
    </dl>
  </section>
</template>
