// The Cypress plugin page renders the package README so the docs have one source of truth.
// Keep everything from "Getting started" up to the migration section (badges, logo and the
// maintainer sections at the end are GitHub material), and turn the <details> FAQ into plain
// headings, which the markdown renderer understands and the "on this page" list can pick up.
import { createHash } from 'node:crypto';

export const sliceReadme = (markdown) => {
  const start = markdown.indexOf('\n## Getting started');
  const end = markdown.indexOf('\n## Migrating from');
  if (start === -1)
    throw new Error('README.md: "## Getting started" heading not found');
  return markdown
    .slice(start, end === -1 ? undefined : end)
    .replace(
      /<details><summary>(.*?)<\/summary>/g,
      (_, question) => `### ${question}`,
    )
    .replace(/<\/details>/g, '')
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    .replace(
      '](./examples)',
      '](https://github.com/pixsame/pixsame/tree/main/examples)',
    );
};

// Fingerprint of the English slice. Every translation in the plugin's docs/README-<locale>.md
// records the fingerprint it was made from in its `source` frontmatter, so a README edit that
// was not followed by a retranslation is detectable (scripts/readme-translations.mjs).
export const readmeHash = (markdown) =>
  createHash('sha256').update(sliceReadme(markdown)).digest('hex').slice(0, 16);

// Heading ids of the English slice, in document order, as Nuxt Content generates them
// (github-slugger: lowercase, punctuation dropped, spaces to hyphens). Translations get these
// ids in nuxt.config.ts so in-page anchors (`#usage`, FAQ cross-links, the docs' link to
// `#batch-review-mode`) resolve in every locale.
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
export const readmeHeadingIds = (markdown) =>
  sliceReadme(markdown)
    .split('\n')
    .filter((line) => /^#{2,3} /.test(line))
    .map((line) => slug(line.replace(/^#+ /, '')));

export { README_LOCALES } from './readme-locales.mjs';
