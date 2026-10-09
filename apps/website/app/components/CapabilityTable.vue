<script setup lang="ts">
const { t } = useI18n();
const rows = ['renderer', 'cloud', 'evaluator', 'history'] as const;
const cols = ['core', 'team', 'enterprise'] as const;
</script>

<template>
  <div class="px-glass !rounded-lg overflow-x-auto">
    <table class="w-full min-w-[560px] text-left text-[14px]">
      <caption class="sr-only">{{ t('pricing.table.caption') }}</caption>
      <thead>
        <tr class="font-mono text-[11px] tracking-[0.1em] text-faint uppercase">
          <th scope="col" class="p-4 font-medium">{{ t('pricing.table.capability') }}</th>
          <th v-for="c in cols" :key="c" scope="col" class="p-4 font-medium">{{ t(`pricing.tiers.${c}.name`) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r" class="border-t border-hairline">
          <th scope="row" class="p-4 font-medium">{{ t(`pricing.table.rows.${r}.label`) }}</th>
          <td v-for="c in cols" :key="c" class="p-4 text-muted">{{ t(`pricing.table.rows.${r}.${c}`) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
