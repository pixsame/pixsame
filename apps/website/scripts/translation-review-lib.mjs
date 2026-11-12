// Pure helpers for scripts/translation-review.mjs (no network, no files), unit-tested.
import { parseMarkdown } from './translation-checks.mjs';

// Things an MT engine must not touch: inline code, vue-i18n tokens, link targets.
const PROTECTED =
  /(`+)[^`\n]+?\1|\{\{[^}]*\}\}|\{[^{}]*\}|@[.:][\w.:{}'-]*|%[sd]|(?<=\])\([^)\s]*\)|https?:\/\/[^\s)]+/g;

/** Swaps protected spans for <x i="n"/> tags (DeepL: ignore_tags=x). */
export const mask = (text) => {
  const spans = [];
  const masked = text.replace(PROTECTED, (span) => {
    spans.push(span);
    return `<x i="${spans.length - 1}"/>`;
  });
  return { masked, spans };
};

/** Restores the spans; returns null when the engine dropped or duplicated a tag. */
export const unmask = (text, spans) => {
  const tags = text.match(/<x i="\d+"\s*\/?>(?:<\/x>)?/g) ?? [];
  if (tags.length !== spans.length) return null;
  const seen = new Set();
  let ok = true;
  const out = text.replace(/<x i="(\d+)"\s*\/?>(?:<\/x>)?/g, (_, n) => {
    if (seen.has(n) || !spans[n]) ok = false;
    seen.add(n);
    return spans[n] ?? '';
  });
  return ok ? out : null;
};

/**
 * Paragraph-level units of a markdown body: prose blocks separated by blank lines, with code
 * fences and headings-only/empty blocks left out. Both languages are split the same way, so
 * units pair up by index.
 */
export const paragraphs = (body) =>
  parseMarkdown(body)
    .prose.split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^#{1,6}\s*$/.test(p));

const bigrams = (text) => {
  const s = text.toLowerCase().replace(/\s+/g, '');
  const out = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
};

/** Sørensen–Dice similarity over character bigrams, 0..1. Works for CJK too. */
export const similarity = (a, b) => {
  const x = bigrams(a);
  const y = bigrams(b);
  let overlap = 0;
  let total = 0;
  for (const n of x.values()) total += n;
  for (const n of y.values()) total += n;
  if (!total) return 1;
  for (const [g, n] of x) overlap += Math.min(n, y.get(g) ?? 0);
  return (2 * overlap) / total;
};

/** Tab-separated glossary entries (en -> first accepted target form) for DeepL. */
export const deeplGlossaryEntries = (glossary, locale) => {
  const rows = [];
  for (const entry of glossary.terms ?? []) {
    const target = [entry[locale]].flat().filter(Boolean)[0];
    const source = entry.en.replace(/s\?$/, '');
    if (target && /^[\w -]+$/.test(source)) rows.push(`${source}\t${target}`);
  }
  for (const term of glossary.doNotTranslate ?? [])
    rows.push(`${term}\t${term}`);
  return rows.join('\n');
};
