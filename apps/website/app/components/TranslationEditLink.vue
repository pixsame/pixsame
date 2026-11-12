<script setup lang="ts">
// "Translation broken? Edit it yourself": a link to the file on GitHub that renders the current page in the
// current locale. Docs and the Cypress plugin page pass their markdown file as `source`; every other page is
// copy from i18n/locales/<locale>.json. English is the source language, so it never shows. When the locale has
// no file yet (the page falls back to English) the link opens GitHub's "new file" form in the right folder.
const props = defineProps<{
  source?: { path: string; create?: boolean };
}>();

const REPO = 'https://github.com/pixsame/pixsame';
const BRANCH = 'main';
// Pages that pass their own `source`, or that have no translation to fix (the changelog is generated English,
// the legal pages are not open to public edits).
const HANDLED_BY_PAGE = [
  'privacy',
  'terms',
  'docs-slug',
  'products-cypress-plugin',
  'products-cypress-plugin-changelog-page',
];

const { t, locale } = useI18n();
const getRouteBaseName = useRouteBaseName();
const route = useRoute();
const error = useError();

const source = computed(() => {
  if (locale.value === 'en' || error.value) return null;
  if (props.source) return props.source;
  const name = getRouteBaseName(route);
  if (!name || HANDLED_BY_PAGE.includes(name)) return null;
  return { path: `apps/website/i18n/locales/${locale.value}.json` };
});

const href = computed(() => {
  const s = source.value;
  if (!s) return '';
  if (!s.create) return `${REPO}/edit/${BRANCH}/${s.path}`;
  const slash = s.path.lastIndexOf('/');
  const dir = s.path.slice(0, slash);
  return `${REPO}/new/${BRANCH}/${dir}?filename=${encodeURIComponent(s.path.slice(slash + 1))}`;
});
</script>

<template>
  <p v-if="source" class="mt-12">
    <a
      :href="href"
      rel="noopener"
      target="_blank"
      class="inline-flex items-center gap-2 rounded-md border border-glass-border px-3 py-2 text-xs text-muted transition-colors hover:text-ink active:text-coral-text"
    >
      {{ t(source.create ? 'translate.missing' : 'translate.broken') }}
      <span aria-hidden="true">↗</span>
    </a>
  </p>
</template>
