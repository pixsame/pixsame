<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const groups = [
  { key: 'product', links: [['/product', 'nav.product'], ['/pricing', 'nav.pricing'], ['/github-app', 'footer.githubApp'], ['/playwright', 'footer.playwright'], ['/platform', 'footer.platform']] },
  { key: 'resources', links: [['/docs/install', 'nav.docs'], ['/changelog', 'nav.changelog']] },
  { key: 'legal', links: [['/privacy', 'footer.privacy'], ['/terms', 'footer.terms']] },
] as const;
</script>

<template>
  <footer class="relative z-10 mt-12 border-t border-hairline">
    <div class="px-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div>
        <PixsameLogo />
        <p class="mt-4 max-w-[34ch] text-sm text-muted">{{ t('footer.tagline') }}</p>
      </div>
      <nav v-for="g in groups" :key="g.key" :aria-label="t(`footer.${g.key}`)">
        <p class="px-eyebrow !text-faint">{{ t(`footer.${g.key}`) }}</p>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li v-for="[to, label] in g.links" :key="to">
            <NuxtLink :to="localePath(to)" class="text-muted hover:text-ink">{{ t(label) }}</NuxtLink>
          </li>
          <li v-if="g.key === 'resources'">
            <a href="https://github.com/pixsame/pixsame" class="text-muted hover:text-ink" rel="noopener">GitHub</a>
          </li>
          <li v-if="g.key === 'resources'">
            <a href="https://www.npmjs.com/org/pixsame" class="text-muted hover:text-ink" rel="noopener">npm</a>
          </li>
        </ul>
      </nav>
    </div>
    <p class="px-container pb-10 font-mono text-[11px] tracking-[0.08em] text-faint">© {{ new Date().getFullYear() }} pixsame · MIT</p>
  </footer>
</template>
