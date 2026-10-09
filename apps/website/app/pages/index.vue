<script setup lang="ts">
const { t, locale } = useI18n();
const localePath = useLocalePath();
useSeoMeta({ title: () => t('seo.title'), description: () => t('seo.description') });
useHead({ titleTemplate: '%s' });
useSchemaOrg([
  defineSoftwareApp({
    name: 'pixsame',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    description: () => t('seo.description'),
    inLanguage: () => locale.value,
    license: 'https://opensource.org/licenses/MIT',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
  }),
]);

const install = 'npm i -D @pixsame/cypress-plugin-visual-regression-diff';
const copied = ref(false);
const copy = async () => {
  try {
    await navigator.clipboard.writeText(install);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    /* clipboard unavailable: the command stays selectable */
  }
};
const features = [
  { key: 'manifest', available: true },
  { key: 'renderer', available: false },
  { key: 'forensic', available: false },
  { key: 'approve', available: false },
] as const;
const runsIn = ['GitHub Actions', 'GitLab CI', 'CircleCI', 'Buildkite', 'Jenkins'];
</script>

<template>
  <div>
    <section class="px-container grid items-start gap-12 pt-[74px] pb-20 lg:grid-cols-12">
      <div class="lg:col-span-7">
        <p class="px-eyebrow">{{ t('hero.eyebrow') }}</p>
        <h1 class="mt-6 text-[clamp(2.4rem,5.6vw,4rem)] leading-[1.04]">{{ t('hero.title') }}</h1>
        <p class="mt-5 text-2xl">{{ t('hero.tagline') }}</p>
        <p class="mt-4 max-w-[560px] text-[16.5px] leading-relaxed text-muted">{{ t('hero.body') }}</p>
        <div class="mt-8 flex flex-wrap items-center gap-6">
          <div class="px-glass flex max-w-full items-center gap-3 !rounded-lg px-4 py-2.5 font-mono text-[13px]">
            <span class="text-faint" aria-hidden="true">$</span>
            <code class="min-w-0 break-all">{{ install }}</code>
            <button type="button" class="shrink-0 text-[11px] font-medium tracking-[0.1em] text-coral-text" @click="copy">
              {{ copied ? t('hero.copied') : t('hero.copy') }}
            </button>
          </div>
          <PxButton variant="ghost" :to="localePath('/docs/install')">{{ t('hero.docs') }} →</PxButton>
        </div>
      </div>
      <div class="lg:col-span-5"><HeroDetectionCard /></div>
    </section>

    <section class="px-container border-y border-hairline py-6" :aria-label="t('runs.label')">
      <div class="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[11px] tracking-[0.12em] text-faint uppercase">
        <span>{{ t('runs.label') }}</span>
        <span v-for="ci in runsIn" :key="ci" class="text-muted">{{ ci }}</span>
      </div>
    </section>

    <section class="px-container py-20" aria-labelledby="features-title">
      <h2 id="features-title" class="sr-only">{{ t('features.title') }}</h2>
      <ol class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <li v-for="(f, i) in features" :key="f.key" class="px-glass !rounded-lg flex flex-col p-5">
          <span class="font-mono text-xs text-coral-text" aria-hidden="true">0{{ i + 1 }}</span>
          <h3 class="mt-3 !font-sans text-[17px] font-semibold">{{ t(`features.${f.key}.title`) }}</h3>
          <p class="mt-2 flex-1 text-sm leading-relaxed text-muted">{{ t(`features.${f.key}.body`) }}</p>
          <p
            class="mt-4 font-mono text-[10px] tracking-[0.12em] uppercase"
            :class="f.available ? 'text-blue-text' : 'text-faint'"
          >
            {{ f.available ? t('features.available') : t('pricing.soon') }}
          </p>
        </li>
      </ol>
    </section>

    <section class="px-container pb-24" aria-labelledby="pricing-title">
      <div class="grid items-end gap-6 pb-8 lg:grid-cols-12">
        <h2 id="pricing-title" class="text-[clamp(1.8rem,3.4vw,2rem)] leading-[1.16] lg:col-span-6">{{ t('pricing.title') }}</h2>
        <p class="max-w-[520px] text-muted lg:col-span-6">{{ t('pricing.body') }}</p>
      </div>
      <PricingTiers />
      <p class="mt-6"><PxButton variant="ghost" :to="localePath('/pricing')">{{ t('pricing.compare') }} →</PxButton></p>
    </section>
  </div>
</template>
