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
    <li
      v-for="tier in tiers"
      :key="tier.key"
      class="px-glass flex flex-col !rounded-lg p-5"
      :class="tier.key === 'team' && '!border-coral/40 !bg-coral/15'"
    >
      <div class="flex min-h-6 items-center justify-between gap-2">
        <p class="px-eyebrow">{{ t(`pricing.tiers.${tier.key}.name`) }}</p>
        <span
          v-if="tier.soon"
          class="rounded-full bg-chip px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] whitespace-nowrap uppercase"
          >{{ t('pricing.soon') }}</span
        >
      </div>
      <p
        class="mt-3 text-[25px] leading-tight font-semibold tracking-[-0.01em]"
      >
        {{ t(`pricing.tiers.${tier.key}.price`)
        }}<span
          v-if="t(`pricing.tiers.${tier.key}.unit`)"
          class="text-xs font-normal text-muted"
        >
          {{ t(`pricing.tiers.${tier.key}.unit`) }}</span
        >
      </p>
      <p class="mt-2 text-xs text-muted">
        {{ t(`pricing.tiers.${tier.key}.desc`) }}
      </p>
    </li>
  </ul>
</template>
