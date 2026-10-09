<script setup lang="ts">
const route = useRoute();
const { t, locale } = useI18n();
const localePath = useLocalePath();

// Docs are English-only. Other locales render the same content, flagged noindex.
const path = computed(() => `/docs/${([] as string[]).concat(route.params.slug as string[]).join('/')}`);
const { data: page } = await useAsyncData(() => `doc:${path.value}`, () => queryCollection('docs').path(path.value).first(), { watch: [path] });
if (!page.value) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });

const { data: nav } = await useAsyncData('doc-nav', () => queryCollection('docs').select('title', 'path', 'navigation').order('order', 'ASC').all());

useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
  robots: () => (locale.value === 'en' ? undefined : 'noindex, follow'),
});
</script>

<template>
  <div class="px-container grid gap-10 pt-12 pb-24 lg:grid-cols-[220px_1fr]">
    <nav :aria-label="t('nav.docs')" class="lg:sticky lg:top-8 lg:self-start">
      <p class="px-eyebrow !text-faint">{{ t('nav.docs') }}</p>
      <ul class="mt-4 space-y-2 text-sm">
        <li v-for="item in nav" :key="item.path">
          <NuxtLink :to="localePath(item.path)" class="text-muted hover:text-ink" active-class="!text-coral-text" exact-active-class="font-semibold">{{ item.title }}</NuxtLink>
        </li>
      </ul>
      <p v-if="locale !== 'en'" class="mt-6 text-xs text-faint">{{ t('docs.englishOnly') }}</p>
    </nav>
    <article class="px-prose">
      <ContentRenderer v-if="page" :value="page" />
    </article>
  </div>
</template>
