# pixsame website

Static marketing site and docs for pixsame.com. Nuxt 4 (prerendered), Tailwind v4, `@nuxtjs/i18n`, `@nuxtjs/seo`, `@nuxt/content`.
Shared tokens and components live in [`packages/ui-layer`](../../packages/ui-layer), a Nuxt layer the future app reuses.

```bash
pnpm --filter @pixsame/website dev      # http://localhost:3000
pnpm --filter @pixsame/website build    # nuxt generate -> .output/public
pnpm --filter @pixsame/website exec playwright test   # e2e + axe a11y against the built site
```

Use Node >= 22.5 (`engines` in `package.json`; CI uses `.nvmrc`). The plugin packages still support Node 20.

## Locales

`en` (no prefix), `pl`, `de`, `zh` (Simplified, `zh-CN`), `zh-tw` (Traditional, `zh-TW`). UI messages are in `i18n/locales/*.json`,
docs in `content/docs/<locale>/`. A docs page without a translation falls back to the English file and is rendered `noindex`.
The Cypress plugin page (`/products/cypress-plugin`) renders the package README (the "Getting started" to "FAQ" part, see
`scripts/slice-readme.mjs`). Its translations live in the plugin package as `docs/README-<locale>.md` (`pl`, `de`, `zh-CN`,
`zh-TW`), already sliced, with the same `reviewed` flag and a `source` fingerprint of the English slice they were made from.
`pnpm --filter @pixsame/website readme:check` (also run in CI) fails when the English README changed and a translation was
not redone; to redo one, translate the current slice again and set `source` to the hash the script prints.

| Locale | UI messages        | Docs               | Plugin README      |
| ------ | ------------------ | ------------------ | ------------------ |
| en     | done               | done               | done               |
| pl     | pending (AI draft) | pending (AI draft) | pending (AI draft) |
| de     | pending (AI draft) | pending (AI draft) | pending (AI draft) |
| zh-CN  | pending (AI draft) | pending (AI draft) | pending (AI draft) |
| zh-TW  | pending (AI draft) | pending (AI draft) | pending (AI draft) |

Every non-English file is flagged until a native speaker signs it off: `meta.reviewed: false` in the JSON, `reviewed: false` in the
markdown frontmatter (which shows a "machine translation" notice on the page).

### Translation quality

Terminology is in `i18n/glossary.json`, register and rules in `i18n/STYLE.md` (German: Sie; Polish: neutral/impersonal;
"pixsame" stays Latin everywhere; zh-TW is translated from English, not converted from zh-CN). CI runs two checks:

- `pnpm --filter @pixsame/website translations:lint` compares every locale with English (UI strings, docs, plugin README
  translations). **Errors fail CI**: a missing, added or altered code block, inline code span, variable placeholder
  (`{count}`, `@:key`, `%s`), link target, heading or key. Only `//` and `#` comments inside code may be translated.
  Warnings (glossary terms, Sie/impersonal register, English left in Chinese text) are printed; `--strict` makes them fail.
- `pnpm --filter @pixsame/website translations:test` runs the unit tests of those checks.

For an independent second opinion (free API keys, not needed in CI): `DEEPL_API_KEY=... pnpm --filter @pixsame/website
translations:review --locale=pl` (pl, de: DeepL reference translation, divergent paragraphs flagged) or
`GEMINI_API_KEY=... ... --locale=zh` (zh, zh-tw: MQM-style critic). Reports land in the gitignored `.translation-review/`.
The `site-translations` skill (`.claude/skills/site-translations`) describes the whole draft, review, lint, sign-off flow.

## Deploy (Cloudflare Pages)

Deployed by `.github/workflows/website.yml` on every push to `main` that touches the site (after lint, build and tests), to the
Cloudflare Pages project `pixsame-website` via `wrangler pages deploy`. Repo settings it needs:

- Variables (public: they end up in the built site or in dashboard URLs): `NUXT_PUBLIC_TURNSTILE_SITE_KEY`, `NUXT_PUBLIC_CONTACT_ENDPOINT`, `NUXT_PUBLIC_WAITLIST_ENDPOINT`, `CLOUDFLARE_ACCOUNT_ID` (see `.env.example`; copy it to `.env` locally).
- Secret: `CLOUDFLARE_API_TOKEN` (Account > Cloudflare Pages > Edit). It is the only credential.

Build command `pnpm --filter @pixsame/website build`, output `apps/website/.output/public`. `public/_headers` sets CSP and caching.
The site is fully static. The contact and waitlist forms post to Google Apps Script web apps
(sources are kept out of the repo; the waitlist script is bound to the Google Sheet that stores signups).
Each script needs the Script property `TURNSTILE_SECRET`; the site key is `NUXT_PUBLIC_TURNSTILE_SITE_KEY`.

Optional runtime config (env `NUXT_PUBLIC_*` at build time): `APP_URL` (shows "Sign in"), `CF_ANALYTICS_TOKEN`, `TURNSTILE_SITE_KEY`, `CONTACT_ENDPOINT` (Apps Script web app behind `/contact`).
