<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const groups = [
  {
    key: 'product',
    links: [
      ['/products', 'nav.product'],
      ['/pricing', 'nav.pricing'],
      ['/github-app', 'footer.githubApp'],
      ['/playwright', 'footer.playwright'],
      ['/vitest', 'footer.vitest'],
      ['/platform', 'footer.platform'],
    ],
  },
  {
    key: 'resources',
    links: [
      ['/docs/getting-started/install', 'nav.docs'],
      ['/changelog', 'nav.changelog'],
      ['/contact', 'footer.contact'],
    ],
  },
  {
    key: 'legal',
    links: [
      ['/privacy', 'footer.privacy'],
      ['/terms', 'footer.terms'],
      ['/brand', 'footer.brand'],
    ],
  },
] as const;
</script>

<template>
  <footer class="relative z-10 mt-12 border-t border-hairline">
    <div
      class="px-container grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
    >
      <div class="col-span-2 lg:col-span-1">
        <PixsameLogo />
        <p class="mt-4 max-w-[34ch] text-sm text-muted">
          {{ t('hero.tagline') }}
        </p>
      </div>
      <nav v-for="g in groups" :key="g.key" :aria-label="t(`footer.${g.key}`)">
        <p class="px-eyebrow !text-faint">{{ t(`footer.${g.key}`) }}</p>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li v-for="[to, label] in g.links" :key="to">
            <NuxtLink :to="localePath(to)" class="text-muted hover:text-ink">{{
              t(label)
            }}</NuxtLink>
          </li>
          <li v-if="g.key === 'resources'">
            <a
              href="https://github.com/pixsame/pixsame"
              class="text-muted hover:text-ink"
              rel="noopener"
              >GitHub</a
            >
          </li>
          <li v-if="g.key === 'resources'">
            <a
              href="https://www.npmjs.com/org/pixsame"
              class="text-muted hover:text-ink"
              rel="noopener"
              >npm</a
            >
          </li>
        </ul>
      </nav>
    </div>
    <div
      class="px-container flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-10 font-mono text-[11px] tracking-[0.08em] text-faint"
    >
      <p>© {{ new Date().getFullYear() }} pixsame</p>
      <a
        href="https://www.frsource.org"
        rel="noopener"
        class="inline-flex items-center gap-2 hover:text-ink"
      >
        {{ t('footer.by') }}
        <img
          src="/frsource-logo.svg"
          alt=""
          width="20"
          height="18"
          class="h-[18px] w-auto"
        />
        <span class="font-semibold tracking-[0.12em]">FRSOURCE</span>
      </a>
    </div>
  </footer>
</template>
