<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({ title: () => t('nav.changelog'), description: () => t('changelog.body') });
const { data: page } = await useAsyncData('changelog', () => queryCollection('changelog').first());
</script>

<template>
  <div class="px-container pt-12 pb-24">
    <p class="px-eyebrow">{{ t('changelog.source') }}</p>
    <article class="px-prose mt-4">
      <ContentRenderer v-if="page" :value="page" />
    </article>
  </div>
</template>
