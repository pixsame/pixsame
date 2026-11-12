#!/usr/bin/env node
/* eslint-disable no-console -- a CLI reports through the console */
// Independent second opinion on a translation. Writes a markdown report to
// .translation-review/<locale>.md (gitignored); it never edits translations itself.
//
//   DEEPL_API_KEY=... node scripts/translation-review.mjs --locale=pl     # pl, de: DeepL reference
//   GEMINI_API_KEY=... node scripts/translation-review.mjs --locale=zh    # zh, zh-tw: Gemini critic
//
//   --engine=deepl|gemini   override the default (pl, de -> deepl; zh, zh-tw -> gemini)
//   --only=<substring>      only files whose path contains it (e.g. --only=usage)
//   --threshold=0.55        DeepL: report units less similar than this (0..1, default 0.5)
//
// deepl:  translates the English source with DeepL (glossary from i18n/glossary.json, Sie for de)
//         and flags paragraphs/strings where our translation diverges strongly. Divergence is a
//         pointer to look, not proof of an error.
// gemini: sends English + translation + glossary + STYLE.md and asks for an MQM-style list of
//         accuracy / terminology / fluency / style errors with exact spans.
// Both free tiers are enough for the whole site; keys come from the environment only.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flatten, splitFrontmatter } from './translation-checks.mjs';
import {
  deeplGlossaryEntries,
  mask,
  paragraphs,
  similarity,
  unmask,
} from './translation-review-lib.mjs';
import { README_LOCALES } from './readme-locales.mjs';
import { sliceReadme } from './slice-readme.mjs';

const site = fileURLToPath(new URL('..', import.meta.url));
const plugin = fileURLToPath(
  new URL(
    '../../../packages/cypress-plugin-visual-regression-diff/',
    import.meta.url,
  ),
);
const arg = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const locale = arg('locale');
if (!locale || !(locale in README_LOCALES)) {
  console.error(`Usage: --locale=${Object.keys(README_LOCALES).join('|')}`);
  process.exit(2);
}
const engine =
  arg('engine') ?? (locale === 'pl' || locale === 'de' ? 'deepl' : 'gemini');
const only = arg('only');
const threshold = Number(arg('threshold') ?? 0.5);
const key =
  process.env[engine === 'deepl' ? 'DEEPL_API_KEY' : 'GEMINI_API_KEY'];
if (!key) {
  console.error(
    `${engine === 'deepl' ? 'DEEPL_API_KEY' : 'GEMINI_API_KEY'} is not set. Free keys: ` +
      (engine === 'deepl'
        ? 'https://www.deepl.com/pro-api (API Free, 500k characters/month)'
        : 'https://aistudio.google.com/apikey'),
  );
  process.exit(2);
}

const read = (p) => readFileSync(p, 'utf8');
const glossary = JSON.parse(read(join(site, 'i18n/glossary.json')));
const style = existsSync(join(site, 'i18n/STYLE.md'))
  ? read(join(site, 'i18n/STYLE.md'))
  : '';

// ---- collect (english, translation) pairs per file -------------------------------------------
const files = []; // { path, kind: 'json' | 'md', en, tr }
const mdFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? mdFiles(join(dir, e.name)).map((f) => join(e.name, f))
      : e.name.endsWith('.md')
        ? [e.name]
        : [],
  );
files.push({
  path: `i18n/locales/${locale}.json`,
  kind: 'json',
  en: read(join(site, 'i18n/locales/en.json')),
  tr: read(join(site, `i18n/locales/${locale}.json`)),
});
for (const p of mdFiles(join(site, 'content/docs/en')))
  files.push({
    path: `content/docs/${locale}/${p}`,
    kind: 'md',
    en: read(join(site, 'content/docs/en', p)),
    tr: read(join(site, 'content/docs', locale, p)),
  });
files.push({
  path: `plugin README (${README_LOCALES[locale]})`,
  kind: 'md',
  en: sliceReadme(read(join(plugin, 'README.md'))),
  tr: read(join(plugin, `docs/README-${README_LOCALES[locale]}.md`)),
});

/** Pairs of { id, en, tr } for a file; null when the structures do not line up. */
const units = (file) => {
  if (file.kind === 'json') {
    const en = flatten(JSON.parse(file.en));
    const tr = flatten(JSON.parse(file.tr));
    return Object.keys(en)
      .filter(
        (k) => !k.startsWith('meta.') && typeof en[k] === 'string' && tr[k],
      )
      .map((k) => ({ id: k, en: en[k], tr: tr[k] }));
  }
  const en = paragraphs(splitFrontmatter(file.en).body);
  const tr = paragraphs(splitFrontmatter(file.tr).body);
  if (en.length !== tr.length) return null;
  return en.map((e, i) => ({ id: `paragraph ${i + 1}`, en: e, tr: tr[i] }));
};

// ---- engines ----------------------------------------------------------------------------------
const deepl = async () => {
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  const call = async (path, body) => {
    const res = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok)
      throw new Error(`DeepL ${path}: ${res.status} ${await res.text()}`);
    return res.json();
  };
  const target = { pl: 'PL', de: 'DE', zh: 'ZH-HANS', 'zh-tw': 'ZH-HANT' }[
    locale
  ];
  const glossaryLang = target.split('-')[0];
  let glossaryId;
  try {
    ({ glossary_id: glossaryId } = await call('/v2/glossaries', {
      name: `pixsame-${locale}-${Date.now()}`,
      source_lang: 'EN',
      target_lang: glossaryLang,
      entries: deeplGlossaryEntries(glossary, locale),
      entries_format: 'tsv',
    }));
  } catch (error) {
    console.warn(
      `No DeepL glossary (${error.message}); continuing without it.`,
    );
  }
  const translate = async (texts) => {
    const out = [];
    for (let i = 0; i < texts.length; i += 40) {
      const batch = texts.slice(i, i + 40);
      const res = await call('/v2/translate', {
        text: batch,
        source_lang: 'EN',
        target_lang: target,
        tag_handling: 'xml',
        ignore_tags: ['x'],
        ...(locale === 'de' ? { formality: 'prefer_more' } : {}),
        ...(glossaryId && glossaryLang === target
          ? { glossary_id: glossaryId }
          : {}),
      });
      out.push(...res.translations.map((t) => t.text));
    }
    return out;
  };
  return async (list) => {
    const masked = list.map((u) => mask(u.en));
    const reference = await translate(masked.map((m) => m.masked));
    const lines = [];
    list.forEach((u, i) => {
      const ref = unmask(reference[i], masked[i].spans);
      if (ref === null)
        return lines.push(`- ${u.id}: DeepL altered a protected span, skipped`);
      const score = similarity(u.tr, ref);
      if (score >= threshold) return;
      lines.push(
        `### ${u.id} (similarity ${score.toFixed(2)})\n\n- **English:** ${u.en}\n- **Ours:** ${u.tr}\n- **DeepL:** ${ref}\n`,
      );
    });
    return lines;
  };
};

const gemini = () => {
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  return async (list) => {
    const prompt = `You are a senior ${locale} localisation reviewer for a developer-tools website.
Review the translation of each numbered English segment into ${locale}. Report only real problems.
Categories: accuracy (meaning changed, omitted, added), terminology (glossary or inconsistent term),
fluency (grammar, unnatural wording), style (register, tone). Severity: minor | major | critical.
Do not report placeholders, code or links; a script checks those. Do not nitpick synonyms.
Glossary (en -> ${locale}): ${JSON.stringify(glossary)}
Style guide:
${style || '(none)'}
Return JSON: an array of {"segment": <number>, "span": "<exact text from the translation>",
"category": "...", "severity": "...", "reason": "...", "suggestion": "<replacement>"}. [] if none.

${list.map((u, i) => `[${i + 1}] EN: ${u.en}\n[${i + 1}] ${locale}: ${u.tr}`).join('\n\n')}`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0,
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`);
    const text =
      (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    return JSON.parse(text).map((issue) => {
      const u = list[issue.segment - 1];
      return `### ${u?.id ?? `segment ${issue.segment}`}: ${issue.severity} ${issue.category}\n\n- **Span:** ${issue.span}\n- **Why:** ${issue.reason}\n- **Suggestion:** ${issue.suggestion}\n`;
    });
  };
};

// ---- run --------------------------------------------------------------------------------------
const review = await (engine === 'deepl' ? deepl() : gemini())();
const report = [`# ${engine} review of ${locale}\n`];
for (const file of files.filter((f) => !only || f.path.includes(only))) {
  const list = units(file);
  if (!list) {
    report.push(
      `## ${file.path}\n\nParagraph counts differ from English; fix the structure first (translations:lint).\n`,
    );
    continue;
  }
  console.log(`${engine}: ${file.path} (${list.length} units)`);
  const found = [];
  // Gemini gets ~40 segments per request to stay inside per-minute limits.
  for (let i = 0; i < list.length; i += 40)
    found.push(...(await review(list.slice(i, i + 40))));
  report.push(
    `## ${file.path}\n\n${found.length ? found.join('\n') : 'Nothing flagged.\n'}`,
  );
}
const dir = join(site, '.translation-review');
mkdirSync(dir, { recursive: true });
const out = join(dir, `${locale}-${engine}.md`);
writeFileSync(out, report.join('\n'));
console.log(`\nReport: ${relative(process.cwd(), out)}`);
