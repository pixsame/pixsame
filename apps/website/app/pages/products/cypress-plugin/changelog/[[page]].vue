<script setup lang="ts">
const PER_PAGE = 10;
const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();

const current = computed(() =>
  Math.max(1, Number.parseInt(String(route.params.page ?? '1'), 10) || 1),
);
const { data: page } = await useAsyncData('changelog', () =>
  queryCollection('changelog').first(),
);

type Node = string | [string, Record<string, unknown>, ...Node[]];
// One entry per release: every top-level node from an <h2> up to the next one.
const releases = computed(() => {
  const out: Node[][] = [];
  for (const node of (page.value?.body?.value ?? []) as Node[]) {
    if (Array.isArray(node) && node[0] === 'h2') out.push([]);
    out.at(-1)?.push(node);
  }
  return out;
});
const total = computed(() =>
  Math.max(1, Math.ceil(releases.value.length / PER_PAGE)),
);
if (current.value > total.value)
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true,
  });
const nodes = computed(() =>
  releases.value
    .slice((current.value - 1) * PER_PAGE, current.value * PER_PAGE)
    .flat(),
);

const pageTo = (n: number) =>
  localePath(
    n === 1
      ? '/products/cypress-plugin/changelog'
      : `/products/cypress-plugin/changelog/${n}`,
  );
useSeoMeta({
  title: () => t('changelog.title'),
  description: () => t('changelog.body'),
});
</script>

<template>
  <PageShell
    :crumbs="[
      { label: t('nav.product'), to: '/products' },
      { label: t('cypress.crumb'), to: '/products/cypress-plugin' },
      { label: t('changelog.crumb') },
    ]"
  >
    <p class="px-eyebrow">{{ t('changelog.source') }}</p>
    <h1 class="mt-4 text-[clamp(2rem,4.6vw,2.9rem)] leading-[1.06]">
      {{ t('changelog.title') }}
    </h1>
    <article class="px-prose mt-8 !max-w-[88ch]">
      <MinimarkRenderer :nodes="nodes" />
    </article>

    <nav
      v-if="total > 1"
      :aria-label="t('changelog.pagination')"
      class="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-6 text-sm"
    >
      <NuxtLink
        v-if="current > 1"
        :to="pageTo(current - 1)"
        class="px-btn px-btn-ghost"
        >← {{ t('changelog.prev') }}</NuxtLink
      >
      <span v-else />
      <span
        class="font-mono text-[11px] tracking-[0.12em] text-faint uppercase"
        >{{ t('changelog.page', { n: current, total }) }}</span
      >
      <NuxtLink
        v-if="current < total"
        :to="pageTo(current + 1)"
        class="px-btn px-btn-ghost"
        >{{ t('changelog.next') }} →</NuxtLink
      >
      <span v-else />
    </nav>
  </PageShell>
</template>
