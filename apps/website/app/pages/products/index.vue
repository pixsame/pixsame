<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
useSeoMeta({
  title: () => t('product.title'),
  description: () => t('product.body'),
});
const stats = ['manifest', 'runners', 'license'] as const;
</script>

<template>
  <PageShell :crumbs="[{ label: t('nav.product') }]">
    <div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
      <div class="min-w-0 lg:col-span-6">
        <h1 class="text-[clamp(2.2rem,4.6vw,2.9rem)] leading-[1.06]">
          {{ t('product.title') }}
        </h1>
        <p class="mt-5 text-[16.5px] leading-relaxed text-muted">
          {{ t('product.body') }}
        </p>
        <p
          class="mt-4 inline-block rounded-full bg-chip px-3 py-1 font-mono text-[10px] tracking-[0.12em] uppercase"
        >
          {{ t('product.status') }}
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-6">
          <PxButton :to="localePath('/products/cypress-plugin')">{{
            t('product.cypressCta')
          }}</PxButton>
          <PxButton variant="ghost" :to="localePath('/pricing')"
            >{{ t('pricing.compare') }} →</PxButton
          >
        </div>
      </div>
      <div class="min-w-0 lg:col-span-6">
        <CodeBlock file="cypress.config.ts" snippet="cypress-config" />
      </div>
    </div>

    <dl class="mt-16 grid gap-4 sm:grid-cols-3">
      <div v-for="s in stats" :key="s" class="px-glass !rounded-lg p-5">
        <dd class="text-4xl leading-none font-semibold">
          {{ t(`product.stats.${s}.value`) }}
        </dd>
        <dt class="mt-2 text-sm text-muted">
          {{ t(`product.stats.${s}.label`) }}
        </dt>
      </div>
    </dl>

    <section class="mt-24" aria-labelledby="soon-title">
      <p class="px-eyebrow">{{ t('product.soon.eyebrow') }}</p>
      <h2
        id="soon-title"
        class="mt-3 max-w-[24ch] text-[clamp(1.6rem,3vw,2rem)] leading-[1.16]"
      >
        {{ t('product.soon.title') }}
      </h2>
      <p class="mt-3 max-w-[60ch] text-muted">{{ t('product.soon.body') }}</p>
      <div class="mt-10"><EcosystemMap /></div>
    </section>
  </PageShell>
</template>
