<script setup lang="ts">
const { t } = useI18n();
const {
  public: { appUrl, githubStars },
} = useRuntimeConfig();
const localePath = useLocalePath();
const { locale } = useI18n();
const stars = computed(() =>
  typeof githubStars === 'number'
    ? new Intl.NumberFormat(locale.value, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(githubStars)
    : null,
);

const scrolled = ref(false);
const onScroll = () => {
  scrolled.value = window.scrollY > 8;
};
onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));

const nav = computed(() => [
  { to: '/products', label: t('nav.product') },
  { to: '/docs/getting-started/install', label: t('nav.docs') },
  { to: '/pricing', label: t('nav.pricing') },
  { to: '/changelog', label: t('nav.changelog') },
  { to: '/contact', label: t('footer.contact') },
]);
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-hairline transition-colors duration-200"
    :class="scrolled ? 'bg-ground/85 backdrop-blur-md' : 'bg-transparent'"
  >
    <div
      class="px-container flex items-center justify-between gap-x-6 transition-[padding] duration-200"
      :class="scrolled ? 'py-2.5' : 'py-[22px]'"
    >
      <div class="flex items-center gap-10">
        <NuxtLink :to="localePath('/')" :aria-label="t('nav.home')">
          <PixsameLogo />
        </NuxtLink>
        <nav class="hidden gap-[26px] text-[13.5px] md:flex">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="localePath(item.to)"
            class="text-muted transition-colors hover:text-ink"
            active-class="text-ink"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
      <div class="flex items-center gap-3 text-[13px]">
        <div class="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <ThemeToggle
            :label-to-light="t('theme.toLight')"
            :label-to-dark="t('theme.toDark')"
          />
        </div>
        <a
          v-if="stars"
          class="hidden items-center gap-1.5 text-muted hover:text-ink md:inline-flex"
          href="https://github.com/pixsame/pixsame"
          rel="noopener"
          :aria-label="t('nav.githubStars', { count: stars })"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M8 .25a.75.75 0 0 1 .67.42l1.88 3.8 4.2.61a.75.75 0 0 1 .42 1.28l-3.04 2.96.72 4.18a.75.75 0 0 1-1.09.79L8 12.32l-3.76 1.97a.75.75 0 0 1-1.09-.79l.72-4.18L0 6.36a.75.75 0 0 1 .42-1.28l4.2-.61L6.5.67A.75.75 0 0 1 8 .25Z"
            />
          </svg>
          {{ stars }}
        </a>
        <a
          v-if="appUrl"
          class="hidden text-muted hover:text-ink md:inline"
          :href="`${appUrl}/login`"
          >{{ t('nav.signIn') }}</a
        >
        <PxButton
          class="hidden md:inline-flex"
          :to="localePath('/docs/getting-started/install')"
          >{{ t('nav.install') }}</PxButton
        >
        <MobileMenu :nav="nav" />
      </div>
    </div>
  </header>
</template>
