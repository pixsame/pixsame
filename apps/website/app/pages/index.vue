<script setup lang="ts">
const { t, locale } = useI18n();
const localePath = useLocalePath();
useSeoMeta({
  title: () => t('seo.title'),
  description: () => t('seo.description'),
});
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

const features = [
  { key: 'manifest', available: true },
  { key: 'renderer', available: false },
  { key: 'forensic', available: false },
  { key: 'approve', available: false },
] as const;
const runsIn = [
  'GitHub Actions',
  'GitLab CI',
  'CircleCI',
  'Buildkite',
  'Jenkins',
];
</script>

<template>
  <div>
    <section
      class="px-container grid grid-cols-1 items-start gap-12 pt-8 pb-10 md:pb-20 md:pt-14 lg:grid-cols-12 lg:pt-[74px]"
    >
      <div class="min-w-0 lg:col-span-6">
        <p class="px-eyebrow">{{ t('hero.eyebrow') }}</p>
        <h1 class="mt-6 text-[clamp(2.4rem,5.6vw,4rem)] leading-[1.04]">
          {{ t('hero.title') }}
        </h1>
        <p class="mt-5 text-lg leading-[1.2] tracking-[-0.005em] md:text-2xl">
          {{ t('hero.tagline') }}
        </p>
        <p
          class="mt-4 max-w-[560px] text-sm leading-[1.6] text-muted md:text-[16.5px]"
        >
          {{ t('hero.body') }}
        </p>
        <p
          class="mt-3 max-w-[560px] font-mono text-[11px] leading-relaxed tracking-[0.04em] text-faint"
        >
          {{ t('hero.soonNote') }}
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-6">
          <InstallCommand />
          <PxButton
            variant="ghost"
            class="hidden md:inline-flex"
            :to="localePath('/docs/getting-started/install')"
            >{{ t('hero.docs') }} →</PxButton
          >
          <PxButton
            class="w-full justify-center md:hidden"
            :to="localePath('/docs/getting-started/install')"
            >{{ t('nav.install') }}</PxButton
          >
        </div>
      </div>
      <div class="hidden min-w-0 md:block lg:col-span-6">
        <HeroDetectionCard />
      </div>
    </section>

    <section
      class="px-container hidden border-y border-hairline py-6 md:block"
      :aria-label="t('runs.label')"
    >
      <div
        class="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[11px] tracking-[0.12em] text-faint uppercase"
      >
        <span>{{ t('runs.label') }}</span>
        <span v-for="ci in runsIn" :key="ci" class="text-muted">{{ ci }}</span>
      </div>
    </section>

    <section
      class="px-container border-t border-hairline py-8 md:border-0 md:py-20"
      aria-labelledby="features-title"
    >
      <h2 id="features-title" class="sr-only">{{ t('features.title') }}</h2>
      <ol class="grid gap-2.5 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <li
          v-for="(f, i) in features"
          :key="f.key"
          class="px-glass min-h-[196px] flex-col !rounded-lg p-5 max-md:!min-h-0"
          :class="[
            f.key === 'approve' && '!border-coral/35 !bg-coral/15',
            f.key === 'manifest' || f.key === 'approve'
              ? 'flex'
              : 'hidden md:flex',
          ]"
        >
          <span class="font-mono text-xs text-coral-text" aria-hidden="true"
            ><span class="md:hidden">0{{ f.key === 'approve' ? 2 : 1 }}</span
            ><span class="hidden md:inline">0{{ i + 1 }}</span></span
          >
          <h3 class="mt-3 !font-sans text-[17px] font-semibold md:mt-8">
            {{ t(`features.${f.key}.title`) }}
          </h3>
          <p class="mt-2 flex-1 text-sm leading-relaxed text-muted">
            {{ t(`features.${f.key}.body`) }}
          </p>
          <p
            class="mt-4 hidden font-mono text-[10px] tracking-[0.12em] uppercase md:block"
            :class="f.available ? 'text-blue-text' : 'text-faint'"
          >
            {{ f.available ? t('features.available') : t('pricing.soon') }}
          </p>
        </li>
      </ol>
    </section>

    <section class="px-container pb-24" aria-labelledby="pricing-title">
      <div class="grid items-end gap-8 lg:grid-cols-12">
        <div class="lg:col-span-4">
          <h2
            id="pricing-title"
            class="text-[clamp(1.8rem,3.4vw,2rem)] leading-[1.16]"
          >
            {{ t('pricing.title') }}
          </h2>
          <p class="mt-3 text-sm leading-relaxed text-muted">
            {{ t('pricing.body') }}
          </p>
          <p class="mt-5">
            <PxButton variant="ghost" :to="localePath('/pricing')"
              >{{ t('pricing.compare') }} →</PxButton
            >
          </p>
        </div>
        <div class="lg:col-span-8"><PricingTiers /></div>
      </div>
    </section>
  </div>
</template>
