// The layer has no Nuxt project of its own, so it borrows the website's config (built by
// @nuxt/eslint from the website, which extends this layer). Run `pnpm --filter @pixsame/website lint`.
export { default } from '../../apps/website/eslint.config.mjs';
