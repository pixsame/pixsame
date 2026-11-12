<script setup lang="ts">
defineProps<{
  groups: { key: string; items: { path: string; title: string }[] }[];
}>();
const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <div class="space-y-6">
    <section v-for="g in groups" :key="g.key">
      <p class="px-eyebrow !text-faint">{{ t(`docs.groups.${g.key}`) }}</p>
      <ul class="mt-3 space-y-0.5 text-sm">
        <li v-for="item in g.items" :key="item.path">
          <NuxtLink
            :to="localePath(item.path)"
            class="block rounded-md border-l-2 border-transparent px-3 py-1.5 text-muted transition-colors hover:bg-chip hover:text-ink active:opacity-70"
            active-class="!border-coral !bg-coral/10 !font-medium !text-ink"
          >
            {{ item.title }}
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
