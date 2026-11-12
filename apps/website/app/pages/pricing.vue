<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({
  title: () => t('nav.pricing'),
  description: () => t('pricing.body'),
});
</script>

<template>
  <PageShell :crumbs="[{ label: t('nav.pricing') }]">
    <h1 class="max-w-[24ch] text-[clamp(2rem,4.6vw,2.9rem)] leading-[1.06]">
      {{ t('pricing.title') }}
    </h1>
    <p class="mt-5 max-w-[560px] text-[16.5px] leading-relaxed text-muted">
      {{ t('pricing.body') }}
    </p>
    <div class="mt-10"><PricingTiers /></div>
    <div class="mt-10"><CapabilityTable /></div>
    <p class="mt-6 text-sm text-faint">{{ t('pricing.note') }}</p>
    <div class="mt-20"><OssPackages /></div>
  </PageShell>
</template>
