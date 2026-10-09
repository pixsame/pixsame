import tailwindcss from '@tailwindcss/vite';

// Shared Nuxt layer: design tokens, theming and UI components used by the
// marketing site (apps/website) and, later, the app (apps/app).
export default defineNuxtConfig({
  modules: ['@nuxt/fonts', '@nuxtjs/color-mode'],
  css: [`${import.meta.dirname}/app/assets/css/main.css`],
  vite: { plugins: [tailwindcss()] },
  colorMode: {
    preference: 'system',
    fallback: 'dark',
    classSuffix: '',
    storageKey: 'pixsame-theme',
  },
  fonts: {
    families: [
      { name: 'Bona Nova', provider: 'google', weights: [400, 700], styles: ['normal', 'italic'] },
      { name: 'Signika', provider: 'google', weights: [300, 400, 500, 600, 700] },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 700] },
    ],
  },
});
