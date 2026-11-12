<script setup lang="ts">
const { t } = useI18n();
const packages = [
  { key: 'cypress', to: '/products/cypress-plugin', available: true },
  { key: 'manifest', to: '/docs/reference/manifest', available: true },
  { key: 'playwright', to: '/playwright', available: false },
  { key: 'vitest', to: '/vitest', available: false },
  { key: 'renderer', to: '/products', available: false },
  { key: 'githubApp', to: '/github-app', available: false },
];
</script>

<template>
  <section aria-labelledby="oss-title">
    <h2 id="oss-title" class="text-[clamp(1.6rem,3vw,2rem)] leading-[1.16]">
      {{ t('pricing.oss.title') }}
    </h2>
    <p class="mt-3 max-w-[60ch] text-muted">{{ t('pricing.oss.body') }}</p>
    <ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="p in packages" :key="p.key">
        <AvailabilityCard
          :to="p.to"
          :available="p.available"
          :title="t(`pricing.oss.${p.key}`)"
          :body="t(`pricing.oss.${p.key}Body`)"
        />
      </li>
    </ul>
  </section>
</template>
