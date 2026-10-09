<script setup lang="ts">
const { t, locale, locales } = useI18n();
const { public: { appUrl } } = useRuntimeConfig();
const localePath = useLocalePath();
const switchLocalePath = useSwitchLocalePath();

const nav = computed(() => [
  { to: '/product', label: t('nav.product') },
  { to: '/docs/install', label: t('nav.docs') },
  { to: '/pricing', label: t('nav.pricing') },
  { to: '/changelog', label: t('nav.changelog') },
]);
</script>

<template>
  <div class="px-wash relative isolate min-h-screen overflow-x-clip text-ink">
    <PxAurora />
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-coral focus:px-3 focus:py-2 focus:text-on-coral"
    >
      {{ t('a11y.skip') }}
    </a>

    <header class="relative z-10 border-b border-hairline">
      <div class="px-container flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-[22px]">
        <div class="flex items-center gap-10">
          <NuxtLink :to="localePath('/')" :aria-label="t('nav.home')">
            <PixsameLogo />
          </NuxtLink>
          <nav :aria-label="t('nav.label')" class="hidden gap-[26px] text-[13.5px] md:flex">
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
          <label class="sr-only" for="lang">{{ t('a11y.language') }}</label>
          <select
            id="lang"
            class="h-9 rounded-md border border-glass-border bg-glass px-2 text-ink"
            :value="locale"
            @change="navigateTo(switchLocalePath(($event.target as HTMLSelectElement).value as typeof locale))"
          >
            <option v-for="l in locales" :key="typeof l === 'string' ? l : l.code" :value="typeof l === 'string' ? l : l.code">
              {{ typeof l === 'string' ? l : l.name }}
            </option>
          </select>
          <ThemeToggle :label-to-light="t('theme.toLight')" :label-to-dark="t('theme.toDark')" />
          <a v-if="appUrl" class="hidden text-muted hover:text-ink sm:inline" :href="`${appUrl}/login`">{{ t('nav.signIn') }}</a>
          <PxButton :to="localePath('/docs/install')">{{ t('nav.install') }}</PxButton>
        </div>
      </div>
    </header>

    <details class="relative z-20 border-b border-hairline bg-ground/90 backdrop-blur md:hidden">
      <summary class="px-container flex cursor-pointer list-none items-center justify-between py-3 text-sm font-medium">
        {{ t('nav.menu') }}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </summary>
      <nav :aria-label="t('nav.label')" class="px-container flex flex-col gap-3 pb-4 text-[15px]">
        <NuxtLink v-for="item in nav" :key="item.to" :to="localePath(item.to)" class="py-1 text-muted hover:text-ink" active-class="!text-ink">
          {{ item.label }}
        </NuxtLink>
      </nav>
    </details>

    <main id="main" class="relative z-10">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
