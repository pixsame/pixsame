# pixsame website

Static marketing site and docs for pixsame.com. Nuxt 4 (prerendered), Tailwind v4, `@nuxtjs/i18n`, `@nuxtjs/seo`, `@nuxt/content`.
Shared tokens and components live in [`packages/ui-layer`](../../packages/ui-layer), a Nuxt layer the future app reuses.

```bash
pnpm --filter @pixsame/website dev      # http://localhost:3000
pnpm --filter @pixsame/website build    # nuxt generate -> .output/public
pnpm --filter @pixsame/website exec playwright test   # e2e + axe a11y against the built site
```

Use Node >= 22.21 (CI uses `.nvmrc`).

## Locales

`en` (no prefix), `pl`, `de`, `zh` (Simplified, `zh-CN`), `zh-tw` (Traditional, `zh-TW`). Messages are in `i18n/locales/*.json`.
Docs (`content/docs`) are English-only; other locales show them with `noindex`.

| Locale | Native review |
| --- | --- |
| en | done |
| pl | pending (AI draft) |
| de | pending (AI draft) |
| zh-CN | pending (AI draft) |
| zh-TW | pending (AI draft) |

Each non-English file has `meta.reviewed: false` until a native speaker signs it off.

## Deploy (Cloudflare Pages)

Build command `pnpm --filter @pixsame/website build`, output `apps/website/.output/public`. `public/_headers` sets CSP and caching.
The waitlist form posts to `/api/waitlist`, a Pages Function (`functions/api/waitlist.ts`). Deploy with `wrangler pages deploy` from `apps/website`
so the `functions/` directory is picked up. Set the secrets `WAITLIST_ENDPOINT` and `WAITLIST_TOKEN` (the service on the Vultr server)
and, to enable the spam check, `TURNSTILE_SECRET`.

Optional runtime config (env `NUXT_PUBLIC_*` at build time): `APP_URL` (shows "Sign in"), `CF_ANALYTICS_TOKEN`, `TURNSTILE_SITE_KEY`.
