<script setup lang="ts">
// Template for the unreleased-product pages: github-app, playwright, vitest, platform.
const props = defineProps<{
  page: 'githubApp' | 'playwright' | 'vitest' | 'platform';
  product: string;
}>();
const { t } = useI18n();
const localePath = useLocalePath();
useSeoMeta({
  title: () => t(`soon.${props.page}.title`),
  description: () => t(`soon.${props.page}.body`),
});
</script>

<template>
  <PageShell
    :crumbs="[
      { label: t('nav.product'), to: '/products' },
      { label: t(`soon.${props.page}.title`) },
    ]"
  >
    <div class="max-w-[720px]">
      <p class="px-eyebrow">{{ t('soon.status') }}</p>
      <h1 class="mt-5 text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.06]">
        {{ t(`soon.${props.page}.title`) }}
      </h1>
      <p class="mt-5 text-[17px] leading-relaxed text-muted">
        {{ t(`soon.${props.page}.body`) }}
      </p>
    </div>

    <ul class="mt-10 grid gap-4 md:grid-cols-3">
      <li
        v-for="n in 3"
        :key="n"
        class="px-glass group relative overflow-hidden !rounded-lg p-6 transition-transform hover:-translate-y-0.5"
      >
        <span
          class="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-coral/20 blur-2xl transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
        <span
          class="relative inline-flex size-9 items-center justify-center rounded-full bg-coral text-on-coral"
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <p class="relative mt-5 text-[17px] leading-snug font-semibold">
          {{ t(`soon.${props.page}.b${n}`) }}
        </p>
      </li>
    </ul>

    <div class="mt-10"><WaitlistForm :product="product" /></div>
    <p class="mt-6">
      <PxButton variant="ghost" :to="localePath('/products')"
        >← {{ t('nav.product') }}</PxButton
      >
    </p>
  </PageShell>
</template>
