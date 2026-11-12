<script setup lang="ts">
const { t, locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();
const open = ref(false);

const items = computed(() =>
  locales.value.map((l) =>
    typeof l === 'string'
      ? { code: l, name: l }
      : { code: l.code, name: l.name ?? l.code },
  ),
);
</script>

<template>
  <button
    type="button"
    class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-glass-border bg-glass text-ink transition-colors hover:bg-glass-strong"
    :aria-label="t('a11y.language')"
    aria-haspopup="dialog"
    @click="open = true"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z"
      />
    </svg>
  </button>
  <SiteDialog
    v-model="open"
    :title="t('a11y.language')"
    :close-label="t('a11y.close')"
  >
    <ul class="flex flex-col">
      <li v-for="l in items" :key="l.code">
        <NuxtLink
          :to="switchLocalePath(l.code as typeof locale)"
          class="flex items-center justify-between rounded-md px-3 py-3 text-[15px] transition-colors hover:bg-chip"
          :class="l.code === locale ? 'font-semibold text-ink' : 'text-muted'"
          :aria-current="l.code === locale ? 'true' : undefined"
          :lang="l.code"
          @click="open = false"
        >
          {{ l.name }}
          <svg
            v-if="l.code === locale"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-coral-text"
            aria-hidden="true"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </NuxtLink>
      </li>
    </ul>
  </SiteDialog>
</template>
