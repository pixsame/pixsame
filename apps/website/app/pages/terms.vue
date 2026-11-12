<script setup lang="ts">
// The text lives in content/legal/terms.md. Legal documents are English only: other locales show the same
// text with a notice, so that no translation can introduce mistakes.
const { t, locale } = useI18n();
const { data: page } = await useAsyncData('legal:terms', () =>
  queryCollection('legal').path('/legal/terms').first(),
);
if (!page.value)
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
    fatal: true,
  });
useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
});
</script>

<template>
  <PageShell :crumbs="[{ label: page?.title ?? '' }]">
    <article class="px-prose">
      <p
        v-if="locale !== 'en'"
        role="note"
        class="px-glass !rounded-lg p-4 text-sm"
      >
        {{ t('legal.englishNotice') }}
      </p>
      <h1>{{ page?.title }}</h1>
      <ContentRenderer v-if="page" :value="page" />
    </article>
  </PageShell>
</template>
