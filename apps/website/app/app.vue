<script setup lang="ts">
const head = useLocaleHead({ seo: true });
const { public: { cfAnalyticsToken } } = useRuntimeConfig();
useHead(() => ({
  script: cfAnalyticsToken
    ? [{ src: 'https://static.cloudflareinsights.com/beacon.min.js', defer: true, 'data-cf-beacon': JSON.stringify({ token: cfAnalyticsToken }) }]
    : [],
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }, ...(head.value.link ?? [])],
  htmlAttrs: { lang: head.value.htmlAttrs?.lang },
  meta: head.value.meta,
}));
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
