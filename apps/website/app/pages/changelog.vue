<script setup lang="ts">
// Index of the per-integration changelogs. Only the ones that have release notes yet are links.
const { t } = useI18n();
useSeoMeta({
  title: () => t('changelogs.title'),
  description: () => t('changelogs.body'),
});
const integrations = [
  { key: 'cypress', to: '/products/cypress-plugin/changelog', available: true },
  { key: 'manifest', to: '/docs/reference/manifest', available: true },
  { key: 'playwright', available: false },
  { key: 'vitest', available: false },
  { key: 'renderer', available: false },
  { key: 'githubApp', available: false },
] as { key: string; to?: string; available: boolean }[];
</script>

<template>
  <PageShell :crumbs="[{ label: t('nav.changelog') }]">
    <h1 class="text-[clamp(2rem,4.6vw,2.9rem)] leading-[1.06]">
      {{ t('changelogs.title') }}
    </h1>
    <p class="mt-4 max-w-[60ch] text-muted">{{ t('changelogs.body') }}</p>
    <ul class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="p in integrations" :key="p.key">
        <AvailabilityCard
          :to="p.to"
          :available="p.available"
          :title="t(`pricing.oss.${p.key}`)"
          :body="t(`pricing.oss.${p.key}Body`)"
        />
      </li>
    </ul>
  </PageShell>
</template>
