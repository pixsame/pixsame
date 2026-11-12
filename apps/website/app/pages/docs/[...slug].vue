<script setup lang="ts">
definePageMeta({ layout: 'docs' });

const route = useRoute();
const { t, locale } = useI18n();

// Content lives in content/docs/<locale>/<group>/<page>.md. The current locale's file is used when it
// exists, the English one otherwise (flagged `fallback`, rendered noindex). Non-English files carry
// `reviewed: false` until a native speaker signs them off, which shows a notice.
const slug = computed(() =>
  ([] as string[]).concat(route.params.slug as string[]).join('/'),
);
const docPath = (loc: string) => `/docs/${loc}/${slug.value}`;
const { data: page } = await useAsyncData(
  () => `doc:${locale.value}:${slug.value}`,
  async () => {
    const own =
      locale.value === 'en'
        ? null
        : await queryCollection('docs').path(docPath(locale.value)).first();
    const doc =
      own ?? (await queryCollection('docs').path(docPath('en')).first());
    return doc ? { ...doc, fallback: !own && locale.value !== 'en' } : null;
  },
  { watch: [slug, locale] },
);
if (!page.value)
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true,
  });

// The sidebar lists the English pages (the complete set) with translated titles where they exist.
const { data: pages } = await useAsyncData(
  () => `doc-nav:${locale.value}`,
  async () => {
    const all = await queryCollection('docs')
      .select('title', 'path', 'order')
      .order('order', 'ASC')
      .all();
    const own = new Map(
      all
        .filter((p) => p.path.startsWith(`/docs/${locale.value}/`))
        .map((p) => [p.path.replace(`/docs/${locale.value}/`, ''), p.title]),
    );
    return all
      .filter((p) => p.path.startsWith('/docs/en/'))
      .map((p) => {
        const rel = p.path.replace('/docs/en/', '');
        return {
          path: `/docs/${rel}`,
          title: own.get(rel) ?? p.title,
          group: rel.split('/')[0] ?? '',
        };
      });
  },
  { watch: [locale] },
);
const groups = computed(() =>
  ['getting-started', 'reference', 'integrations']
    .map((key) => ({
      key,
      items: (pages.value ?? []).filter((p) => p.group === key),
    }))
    .filter((g) => g.items.length),
);
const group = computed(() => slug.value.split('/')[0] ?? '');
const toc = computed(
  () => page.value?.body?.toc?.links?.filter((l) => l.depth === 2) ?? [],
);

// Scroll-spy: the "on this page" entry whose heading last crossed the upper third of the viewport is marked.
const activeId = ref('');
const update = () => {
  const line = window.innerHeight * 0.3;
  const heads = toc.value
    .map((l) => document.getElementById(l.id))
    .filter((el): el is HTMLElement => !!el);
  const passed = heads.filter((h) => h.getBoundingClientRect().top <= line);
  activeId.value = (passed.at(-1) ?? heads[0])?.id ?? '';
};
onMounted(() => {
  window.addEventListener('scroll', update, { passive: true });
  nextTick(update);
});
watch(toc, () => nextTick(update));
onBeforeUnmount(() => window.removeEventListener('scroll', update));

const editSource = computed(() => ({
  path: `apps/website/content/docs/${locale.value}/${slug.value}.md`,
  create: !!page.value?.fallback,
}));

useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
  robots: () => (page.value?.fallback ? 'noindex, follow' : undefined),
});
</script>

<template>
  <PageShell
    :crumbs="[
      { label: t('nav.docs'), to: '/docs/getting-started/install' },
      { label: t(`docs.groups.${group}`) },
      { label: page?.title ?? '' },
    ]"
  >
    <div
      class="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_200px]"
    >
      <nav
        :aria-label="t('nav.docs')"
        class="lg:sticky lg:top-20 lg:self-start"
      >
        <details class="group lg:hidden">
          <summary
            class="flex cursor-pointer list-none items-center justify-between rounded-md border border-glass-border px-3 py-2.5 text-sm font-medium"
          >
            {{ t('docs.menu') }}
            <svg
              class="transition-transform group-open:rotate-180"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div class="mt-3"><DocsNavGroups :groups="groups" /></div>
        </details>
        <div class="hidden lg:block"><DocsNavGroups :groups="groups" /></div>
      </nav>

      <article
        class="px-prose min-w-0"
        :lang="page?.fallback ? 'en' : undefined"
      >
        <p
          v-if="page?.fallback"
          class="rounded-md border border-hairline bg-chip px-3 py-2 text-xs !text-faint"
        >
          {{ t('docs.fallback') }}
        </p>
        <p
          v-else-if="page?.reviewed === false"
          class="rounded-md border border-hairline bg-chip px-3 py-2 text-xs !text-faint"
        >
          {{ t('docs.draft') }}
        </p>
        <ContentRenderer v-if="page" :value="page" />
        <TranslationEditLink :source="editSource" />
      </article>

      <aside
        v-if="toc.length"
        class="hidden xl:sticky xl:top-20 xl:block xl:self-start"
        :aria-label="t('docs.onThisPage')"
      >
        <p class="px-eyebrow !text-faint">{{ t('docs.onThisPage') }}</p>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-for="l in toc" :key="l.id">
            <a
              :href="`#${l.id}`"
              class="transition-colors hover:text-ink active:text-coral-text"
              :class="
                activeId === l.id ? 'font-medium text-coral-text' : 'text-muted'
              "
              :aria-current="activeId === l.id ? 'location' : undefined"
              >{{ l.text }}</a
            >
          </li>
        </ul>
      </aside>
    </div>
  </PageShell>
</template>
