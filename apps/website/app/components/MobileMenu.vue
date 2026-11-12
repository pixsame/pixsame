<script setup lang="ts">
defineProps<{ nav: { to: string; label: string }[] }>();

const { t } = useI18n();
const {
  public: { appUrl },
} = useRuntimeConfig();
const localePath = useLocalePath();
const open = ref(false);
</script>

<template>
  <button
    type="button"
    class="-mr-2 inline-flex h-9 w-9 items-center justify-center text-ink/70 transition-colors hover:text-ink md:hidden"
    :aria-label="t('nav.menu')"
    aria-haspopup="dialog"
    @click="open = true"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <path d="M3 9h18M3 15h18" />
    </svg>
  </button>
  <SiteDialog
    v-model="open"
    :title="t('nav.menu')"
    :close-label="t('a11y.close')"
  >
    <nav class="flex flex-col">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="localePath(item.to)"
        class="rounded-md px-3 py-3 text-[17px] text-muted transition-colors hover:bg-chip hover:text-ink"
        active-class="!text-ink font-semibold"
      >
        {{ item.label }}
      </NuxtLink>
      <a
        v-if="appUrl"
        :href="`${appUrl}/login`"
        class="rounded-md px-3 py-3 text-[17px] text-muted transition-colors hover:bg-chip hover:text-ink"
        >{{ t('nav.signIn') }}</a
      >
    </nav>
    <div class="mt-3 flex items-center gap-3 px-3">
      <LanguageSwitcher /><ThemeToggle
        :label-to-light="t('theme.toLight')"
        :label-to-dark="t('theme.toDark')"
      />
    </div>
    <PxButton
      :to="localePath('/docs/getting-started/install')"
      class="mt-3 w-full"
      >{{ t('nav.install') }}</PxButton
    >
  </SiteDialog>
</template>
