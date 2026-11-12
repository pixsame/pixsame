import { defineCollection, defineContentConfig, z } from '@nuxt/content';

const plugin = '../../packages/cypress-plugin-visual-regression-diff';

export default defineContentConfig({
  collections: {
    // docs/<locale>/<group>/<page>.md. Non-English files are AI drafts until a native speaker
    // flips `reviewed` to true; a missing translation falls back to the English file.
    docs: defineCollection({
      type: 'page',
      source: 'docs/**/*.md',
      schema: z.object({
        order: z.number().default(100),
        reviewed: z.boolean().default(true),
      }),
    }),
    // The privacy policy and the terms (English only; see pages/privacy.vue and pages/terms.vue).
    legal: defineCollection({ type: 'page', source: 'legal/**/*.md' }),
    // Code samples for marketing pages, highlighted at build time by Nuxt Content (shiki).
    snippets: defineCollection({ type: 'page', source: 'snippets/**/*.md' }),
    // The Cypress plugin page is the package README (id ending in `/README.md`, sliced in nuxt.config.ts via
    // content:file:beforeParse) and its translations (id ending in `/README-<locale>.md`, already sliced,
    // with `reviewed` and the `source` fingerprint of the English slice they were made from).
    readme: defineCollection({
      type: 'page',
      source: [
        { cwd: plugin, include: 'README.md', prefix: '/readme' },
        // `docs/*.md`, not `docs/README-*.md`: Nuxt Content cuts an include glob at its first `*` and
        // treats everything before it as a directory, which mangles `README-pl.md` into `README-/pl.md`.
        { cwd: plugin, include: 'docs/*.md', prefix: '/readme' },
      ],
      schema: z.object({
        reviewed: z.boolean().default(true),
        source: z.string().optional(),
      }),
    }),
    // The release notes live next to the package; render them as-is.
    changelog: defineCollection({
      type: 'page',
      source: { cwd: plugin, include: 'CHANGELOG.md', prefix: '/changelog' },
    }),
  },
});
