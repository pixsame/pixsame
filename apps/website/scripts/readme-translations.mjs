#!/usr/bin/env node
/* eslint-disable no-console -- a CLI reports through the console */
// Reports whether the translated READMEs in the plugin package (docs/README-<locale>.md) were
// made from the current English README. Usage:
//   node scripts/readme-translations.mjs          # print the status of every locale
//   node scripts/readme-translations.mjs --check  # exit 1 when a translation is stale or missing
// A stale translation means: retranslate the slice (see apps/website/README.md) and update `source`.
import { existsSync, readFileSync } from 'node:fs';
import { README_LOCALES, readmeHash } from './slice-readme.mjs';

const plugin = new URL(
  '../../../packages/cypress-plugin-visual-regression-diff/',
  import.meta.url,
);
const current = readmeHash(readFileSync(new URL('README.md', plugin), 'utf8'));
const check = process.argv.includes('--check');
let failed = false;

for (const [locale, suffix] of Object.entries(README_LOCALES)) {
  const file = new URL(`docs/README-${suffix}.md`, plugin);
  let status = 'missing';
  if (existsSync(file)) {
    const source = readFileSync(file, 'utf8').match(/^source:\s*(\S+)/m)?.[1];
    status =
      source === current
        ? 'current'
        : `stale (made from ${source ?? 'unknown'})`;
  }
  if (status !== 'current') failed = true;
  console.log(`${locale.padEnd(6)} docs/README-${suffix}.md  ${status}`);
}

console.log(`\nEnglish README slice: ${current}`);
if (check && failed) {
  console.error(
    '\nA translated README is stale or missing. Retranslate it from the current English README and set `source` to the hash above.',
  );
  process.exit(1);
}
