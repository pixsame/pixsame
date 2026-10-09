<script setup lang="ts">
defineProps<{ error: { statusCode: number } }>();
const { t } = useI18n();
const localePath = useLocalePath();
useSeoMeta({ title: () => t('notFound.title'), robots: 'noindex' });
</script>

<template>
  <NuxtLayout>
    <section class="px-container pt-[74px] pb-24">
      <p class="px-eyebrow">{{ error.statusCode }}</p>
      <h1 class="mt-5 text-[clamp(2.2rem,5vw,3.4rem)]">{{ t('notFound.title') }}</h1>
      <p class="mt-4 text-muted">{{ t('notFound.body') }}</p>
      <p class="mt-8"><PxButton :to="localePath('/')">{{ t('notFound.home') }}</PxButton></p>
    </section>
  </NuxtLayout>
</template>
