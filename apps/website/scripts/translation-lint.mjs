#!/usr/bin/env node
/* eslint-disable no-console -- a CLI reports through the console */
// Lints every translation against its English source: UI strings (i18n/locales), docs
// (content/docs/<locale>) and the plugin README translations. Usage:
//   node scripts/translation-lint.mjs            # errors fail (exit 1), warnings are printed
//   node scripts/translation-lint.mjs --strict   # warnings fail too
//   node scripts/translation-lint.mjs --locale=pl
// Errors: missing/changed code blocks, inline code, placeholders, links, headings, keys.
// Warnings: glossary terms, Sie/impersonal register, English sentences left in zh files.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkFrontmatter,
  checkGlossary,
  checkLatinProse,
  checkMarkdown,
  checkMessages,
  checkStyle,
  flatten,
  splitFrontmatter,
} from './translation-checks.mjs';
import { README_LOCALES } from './readme-locales.mjs';
import { sliceReadme } from './slice-readme.mjs';

const site = fileURLToPath(new URL('..', import.meta.url));
const plugin = fileURLToPath(
  new URL(
    '../../../packages/cypress-plugin-visual-regression-diff/',
    import.meta.url,
  ),
);
const strict = process.argv.includes('--strict');
const only = process.argv.find((a) => a.startsWith('--locale='))?.slice(9);
const locales = Object.keys(README_LOCALES).filter((l) => !only || l === only);

const read = (path) => readFileSync(path, 'utf8');
const glossary = JSON.parse(read(join(site, 'i18n/glossary.json')));
const errors = [];
const warnings = [];
const report = (list, file, problems) =>
  problems.forEach((p) => list.push(`${relative(process.cwd(), file)}: ${p}`));

const markdownFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? markdownFiles(join(dir, entry.name)).map((f) => join(entry.name, f))
      : entry.name.endsWith('.md')
        ? [entry.name]
        : [],
  );

const lintMarkdown = (locale, file, enText, trText) => {
  const en = splitFrontmatter(enText);
  const tr = splitFrontmatter(trText);
  report(errors, file, checkFrontmatter(en.frontmatter, tr.frontmatter));
  report(errors, file, checkMarkdown(en.body, tr.body));
  report(warnings, file, checkStyle(locale, tr.body));
  report(warnings, file, checkLatinProse(locale, tr.body, 'prose'));
  report(
    warnings,
    file,
    checkGlossary(glossary, locale, en.body, tr.body, 'glossary'),
  );
};

// UI strings
const enMessages = flatten(
  JSON.parse(read(join(site, 'i18n/locales/en.json'))),
);
for (const locale of locales) {
  const file = join(site, `i18n/locales/${locale}.json`);
  if (!existsSync(file)) {
    errors.push(`${relative(process.cwd(), file)}: locale file is missing`);
    continue;
  }
  const messages = flatten(JSON.parse(read(file)));
  report(errors, file, checkMessages(enMessages, messages));
  const strings = (flat) =>
    Object.entries(flat)
      .filter(([k, v]) => !k.startsWith('meta.') && typeof v === 'string')
      .map(([, v]) => v)
      .join('\n');
  report(warnings, file, checkStyle(locale, strings(messages)));
  report(warnings, file, checkLatinProse(locale, strings(messages), 'strings'));
  report(
    warnings,
    file,
    checkGlossary(
      glossary,
      locale,
      strings(enMessages),
      strings(messages),
      'glossary',
    ),
  );
}

// docs
const enDocs = join(site, 'content/docs/en');
for (const locale of locales) {
  for (const path of markdownFiles(enDocs)) {
    const file = join(site, 'content/docs', locale, path);
    if (!existsSync(file)) {
      errors.push(`${relative(process.cwd(), file)}: translation is missing`);
      continue;
    }
    lintMarkdown(locale, file, read(join(enDocs, path)), read(file));
  }
}

// plugin README translations: the English slice is the source
const englishSlice = sliceReadme(read(join(plugin, 'README.md')));
for (const locale of locales) {
  const file = join(plugin, `docs/README-${README_LOCALES[locale]}.md`);
  if (!existsSync(file)) {
    errors.push(`${relative(process.cwd(), file)}: translation is missing`);
    continue;
  }
  lintMarkdown(locale, file, englishSlice, read(file));
}

for (const w of warnings) console.warn(`warning  ${w}`);
for (const e of errors) console.error(`error    ${e}`);
console.log(
  `\n${errors.length} error(s), ${warnings.length} warning(s) across ${locales.join(', ')}`,
);
if (errors.length || (strict && warnings.length)) process.exit(1);
