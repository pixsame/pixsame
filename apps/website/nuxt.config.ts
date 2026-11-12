import { readFileSync } from 'node:fs';
import {
  readmeHash,
  readmeHeadingIds,
  sliceReadme,
} from './scripts/slice-readme.mjs';

type Node = string | [string, Record<string, unknown>, ...Node[]];
type TocLink = { id: string; children?: TocLink[] };

const pluginReadme = new URL(
  '../../packages/cypress-plugin-visual-regression-diff/README.md',
  import.meta.url,
);

// Star count is read once per build (the site is static); null hides the badge.
const githubStars = await fetch(
  'https://api.github.com/repos/pixsame/pixsame',
  {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
    signal: AbortSignal.timeout(5000),
  },
)
  .then((r) => (r.ok ? r.json() : null))
  .then(
    (r: { stargazers_count?: number } | null) => r?.stargazers_count ?? null,
  )
  .catch(() => null);

export default defineNuxtConfig({
  extends: ['../../packages/ui-layer'],
  hooks: {
    'content:file:beforeParse'(ctx) {
      if (ctx.collection.name !== 'readme') return;
      if (ctx.file.id.endsWith('/README.md')) {
        // the English README: keep the part the site shows
        ctx.file.body = sliceReadme(ctx.file.body);
        return;
      }
      // a translation: warn when it was made from an older English README
      const source = ctx.file.body.match(/^source:\s*(\S+)/m)?.[1];
      const current = readmeHash(readFileSync(pluginReadme, 'utf8'));
      if (source !== current)
        // eslint-disable-next-line no-console
        console.warn(
          `[readme] ${ctx.file.id} was translated from README slice ${source}, current is ${current}: run \`pnpm --filter @pixsame/website readme:check\``,
        );
    },
    'content:file:afterParse'(ctx) {
      // Translated READMEs keep the English heading ids, so anchors work in every locale.
      if (
        ctx.collection.name !== 'readme' ||
        ctx.file.id.endsWith('/README.md')
      )
        return;
      const ids = readmeHeadingIds(readFileSync(pluginReadme, 'utf8'));
      const body = ctx.content.body as {
        value: Node[];
        toc?: { links?: TocLink[] };
      };
      const headings = body.value.filter(
        (node): node is Exclude<Node, string> =>
          Array.isArray(node) && /^h[23]$/.test(node[0]),
      );
      if (headings.length !== ids.length) {
        // eslint-disable-next-line no-console
        console.warn(
          `[readme] ${ctx.file.id} has ${headings.length} headings, the English README ${ids.length}: anchors left as generated`,
        );
        return;
      }
      headings.forEach((node, i) => {
        node[1].id = ids[i];
      });
      let i = 0;
      const renumber = (links?: TocLink[]) =>
        links?.forEach((link) => {
          link.id = ids[i++]!;
          renumber(link.children);
        });
      renumber(body.toc?.links);
    },
  },
  modules: ['@nuxtjs/i18n', '@nuxtjs/seo', '@nuxt/content', '@nuxt/eslint'],
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  eslint: { config: { stylistic: false } },
  site: { url: 'https://pixsame.com', name: 'pixsame', defaultLocale: 'en' },
  i18n: {
    baseUrl: 'https://pixsame.com',
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
      { code: 'pl', language: 'pl', name: 'Polski', file: 'pl.json' },
      { code: 'de', language: 'de', name: 'Deutsch', file: 'de.json' },
      { code: 'zh', language: 'zh-CN', name: '简体中文', file: 'zh.json' },
      {
        code: 'zh-tw',
        language: 'zh-TW',
        name: '繁體中文',
        file: 'zh-tw.json',
      },
    ],
  },
  runtimeConfig: {
    public: {
      // Empty until the app exists: hides "Sign in".
      githubStars,
      appUrl: '',
      // Cloudflare Web Analytics beacon token and Turnstile site key (optional).
      cfAnalyticsToken: '',
      turnstileSiteKey: '',
      // Google Apps Script web app that receives the contact form (NUXT_PUBLIC_CONTACT_ENDPOINT).
      contactEndpoint: '',
      // Google Apps Script web app that stores waitlist signups in a Sheet (NUXT_PUBLIC_WAITLIST_ENDPOINT).
      waitlistEndpoint: '',
    },
  },
  content: {
    // Node's built-in sqlite (22.5+): no native better-sqlite3 build needed.
    experimental: { sqliteConnector: 'native' },
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light-high-contrast',
            dark: 'github-dark-high-contrast',
          },
          langs: ['bash', 'ts', 'js', 'json', 'yaml', 'vue'],
        },
      },
    },
  },
  routeRules: { '/**': { prerender: true } },
  nitro: { prerender: { crawlLinks: true } },
});
