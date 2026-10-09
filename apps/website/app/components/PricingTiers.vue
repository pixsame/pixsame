<script setup lang="ts">
const { t } = useI18n();
const tiers = [
  { key: 'core', soon: false },
  { key: 'team', soon: true },
  { key: 'enterprise', soon: true },
] as const;
</script>

<template>
  <ul class="grid gap-4 sm:grid-cols-3">
    <li v-for="tier in tiers" :key="tier.key" class="px-glass !rounded-lg p-5">
      <div class="flex items-center justify-between">
        <p class="px-eyebrow">{{ t(`pricing.tiers.${tier.key}.name`) }}</p>
        <span v-if="tier.soon" class="rounded-full bg-chip px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase">{{ t('pricing.soon') }}</span>
      </div>
      <p class="font-heading mt-3 text-4xl font-bold">
        {{ t(`pricing.tiers.${tier.key}.price`) }}<span v-if="t(`pricing.tiers.${tier.key}.unit`)" class="font-sans text-sm font-normal text-muted"> {{ t(`pricing.tiers.${tier.key}.unit`) }}</span>
      </p>
      <p class="mt-2 text-sm text-muted">{{ t(`pricing.tiers.${tier.key}.desc`) }}</p>
    </li>
  </ul>
</template>
