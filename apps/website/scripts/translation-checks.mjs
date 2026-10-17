// Pure checks behind scripts/translation-lint.mjs. No file access and no dependencies, so the
// checks are unit-tested (translation-checks.test.mjs) and run in CI without an install.
// Each check returns an array of human-readable problem strings.

const sorted = (list) => [...list].sort();
const sameMultiset = (a, b) =>
  JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

// Elements present in `a` but not in `b`, counting duplicates.
const multisetDiff = (a, b) => {
  const rest = [...b];
  const out = [];
  for (const item of a) {
    const i = rest.indexOf(item);
    if (i === -1) out.push(item);
    else rest.splice(i, 1);
  }
  return out;
};

const describeDiff = (what, en, tr) => {
  const missing = multisetDiff(en, tr);
  const extra = multisetDiff(tr, en);
  const parts = [];
  if (missing.length) parts.push(`missing ${missing.map(quote).join(', ')}`);
  if (extra.length) parts.push(`unexpected ${extra.map(quote).join(', ')}`);
  return `${what}: ${parts.join('; ')}`;
};
const quote = (s) => (s.length > 70 ? `"${s.slice(0, 67)}..."` : `"${s}"`);

// ---------------------------------------------------------------------------------------------
// UI strings (i18n/locales/*.json)
// ---------------------------------------------------------------------------------------------

/** Flattens nested JSON into { 'a.b.c': value }. */
export const flatten = (value, prefix = '', out = {}) => {
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value))
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
  } else {
    out[prefix] = value;
  }
  return out;
};

// vue-i18n tokens that must survive translation untouched: {name}, {'@'} literals, {{ }},
// linked messages (@:key, @.lower:key, @.upper:{'key'}) and printf-style %s / %d.
const PLACEHOLDER = /\{\{[^}]*\}\}|\{[^{}]*\}|@[.:][\w.:{}'-]*|%[sd]/g;
export const placeholders = (text) => text.match(PLACEHOLDER) ?? [];

/** Compares one locale's flattened strings with the English ones. `meta.*` is locale bookkeeping. */
export const checkMessages = (en, tr) => {
  const problems = [];
  const keys = (flat) =>
    Object.keys(flat).filter((k) => !k.startsWith('meta.'));
  const enKeys = keys(en);
  const trKeys = new Set(keys(tr));
  for (const key of enKeys) {
    if (!trKeys.has(key)) {
      problems.push(`${key}: key is missing`);
      continue;
    }
    if (typeof en[key] !== typeof tr[key]) {
      problems.push(
        `${key}: expected ${typeof en[key]}, got ${typeof tr[key]}`,
      );
      continue;
    }
    if (typeof en[key] !== 'string') continue;
    if (tr[key].trim() === '' && en[key].trim() !== '') {
      problems.push(`${key}: value is empty`);
      continue;
    }
    const a = placeholders(en[key]);
    const b = placeholders(tr[key]);
    if (!sameMultiset(a, b))
      problems.push(describeDiff(`${key}: placeholders differ`, a, b));
  }
  const known = new Set(enKeys);
  for (const key of trKeys)
    if (!known.has(key)) problems.push(`${key}: key does not exist in en.json`);
  return problems;
};

// ---------------------------------------------------------------------------------------------
// Markdown (docs and README translations)
// ---------------------------------------------------------------------------------------------

/** Splits a markdown file into its frontmatter block (raw text, may be '') and body. */
export const splitFrontmatter = (markdown) => {
  const m = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  return m
    ? { frontmatter: m[1], body: markdown.slice(m[0].length) }
    : { frontmatter: '', body: markdown };
};

/** Top-level frontmatter keys in order. */
export const frontmatterKeys = (frontmatter) =>
  frontmatter
    .split('\n')
    .map((line) => line.match(/^([A-Za-z][\w-]*):/)?.[1])
    .filter(Boolean);

/**
 * Walks the body once and separates fenced code blocks from prose.
 * A fence closes on a line with the same character, at least as long, and no info string.
 */
export const parseMarkdown = (body) => {
  const blocks = [];
  const prose = [];
  let open = null;
  for (const line of body.split('\n')) {
    const fence = line.match(/^(\s*)(`{3,}|~{3,})\s*(.*)$/);
    if (open) {
      if (
        fence &&
        fence[2][0] === open.char &&
        fence[2].length >= open.length &&
        fence[3] === ''
      ) {
        blocks.push({ info: open.info, lines: open.lines });
        open = null;
      } else {
        open.lines.push(line);
      }
    } else if (fence) {
      open = {
        char: fence[2][0],
        length: fence[2].length,
        info: fence[3].trim(),
        lines: [],
      };
    } else {
      prose.push(line);
    }
  }
  if (open) blocks.push({ info: open.info, lines: open.lines, unclosed: true });
  return { blocks, prose: prose.join('\n') };
};

// Translating comments inside code is allowed (the README translations do it); everything else
// in a block must be byte-identical. Comments are reduced to their marker before comparing.
const normalizeCodeLine = (line) =>
  line
    .replace(/^(\s*)(\/\/|#)(?!!).*$/, '$1$2')
    .replace(/^(\s*)\/\*.*\*\/\s*$/, '$1/**/')
    .replace(/^(\s*)\*(\s.*)?$/, '$1*')
    .replace(/(\S)(\s+)(\/\/|#)\s.*$/, '$1$2$3');

const inlineCode = (prose) =>
  [...prose.matchAll(/(`+)([^`\n]|[^`\n][^\n]*?[^`\n])\1(?!`)/g)].map((m) =>
    m[2].trim(),
  );

// Internal links are localized by prefix; compare them without it.
const LOCALE_PREFIX = /^\/(?:pl|de|zh|zh-tw)(?=\/|#|$)/;
const linkTargets = (prose) =>
  [...prose.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(
    (m) => m[1].replace(LOCALE_PREFIX, '') || '/',
  );

const headings = (prose) =>
  prose
    .split('\n')
    .map((line) => line.match(/^(#{1,6})\s/)?.[1].length)
    .filter(Boolean);

/** Compares a translated markdown body with its English counterpart. */
export const checkMarkdown = (enBody, trBody) => {
  const problems = [];
  const en = parseMarkdown(enBody);
  const tr = parseMarkdown(trBody);

  for (const side of [
    ['English', en],
    ['translation', tr],
  ])
    if (side[1].blocks.some((b) => b.unclosed))
      problems.push(`${side[0]}: a code fence is never closed`);

  // code blocks
  if (en.blocks.length !== tr.blocks.length) {
    problems.push(
      `code blocks: English has ${en.blocks.length}, translation has ${tr.blocks.length}`,
    );
  } else {
    en.blocks.forEach((block, i) => {
      const other = tr.blocks[i];
      const label = `code block #${i + 1} (${block.info || 'no language'})`;
      if (block.info !== other.info) {
        problems.push(
          `${label}: language is "${other.info}", expected "${block.info}"`,
        );
        return;
      }
      if (block.lines.length !== other.lines.length) {
        problems.push(
          `${label}: ${other.lines.length} lines, expected ${block.lines.length}`,
        );
        return;
      }
      block.lines.forEach((line, n) => {
        if (normalizeCodeLine(line) !== normalizeCodeLine(other.lines[n]))
          problems.push(
            `${label}, line ${n + 1}: expected ${quote(line.trim())}, got ${quote(other.lines[n].trim())}`,
          );
      });
    });
  }

  // inline code spans
  const spansEn = inlineCode(en.prose);
  const spansTr = inlineCode(tr.prose);
  if (!sameMultiset(spansEn, spansTr))
    problems.push(describeDiff('inline code', spansEn, spansTr));

  // links
  const linksEn = linkTargets(en.prose);
  const linksTr = linkTargets(tr.prose);
  if (!sameMultiset(linksEn, linksTr))
    problems.push(describeDiff('link targets', linksEn, linksTr));

  // headings
  const levelsEn = headings(en.prose);
  const levelsTr = headings(tr.prose);
  if (JSON.stringify(levelsEn) !== JSON.stringify(levelsTr))
    problems.push(
      `headings: English has ${levelsEn.length} (levels ${levelsEn.join('')}), translation has ${levelsTr.length} (levels ${levelsTr.join('')})`,
    );

  return problems;
};

/** The translated file keeps the English frontmatter keys and must say whether it was reviewed. */
export const checkFrontmatter = (enFrontmatter, trFrontmatter) => {
  const problems = [];
  const enKeys = frontmatterKeys(enFrontmatter).filter((k) => k !== 'source');
  const trKeys = frontmatterKeys(trFrontmatter).filter((k) => k !== 'source');
  for (const key of enKeys)
    if (!trKeys.includes(key))
      problems.push(`frontmatter: "${key}" is missing`);
  if (!trKeys.includes('reviewed'))
    problems.push('frontmatter: "reviewed" is missing (use reviewed: false)');
  return problems;
};

// ---------------------------------------------------------------------------------------------
// Warnings: style and terminology. Heuristic, so they never fail CI unless --strict.
// ---------------------------------------------------------------------------------------------

const stripCode = (text) =>
  parseMarkdown(text)
    .prose.replace(/(`+)[^`\n]+?\1/g, ' ')
    .replace(/\]\([^)]*\)/g, ']');

// \b does not understand Polish or German letters, so spell the boundary out.
const word = (alternatives) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, 'giu');

const STYLE_RULES = {
  // Sie only: no informal address.
  de: {
    label: 'informal "du" address (use Sie)',
    pattern: word('du|dein|deine|deinem|deinen|deiner|deines|dir|dich'),
  },
  // Neutral / impersonal: no second-person singular pronouns or verb forms.
  pl: {
    label: 'second-person singular address (use neutral/impersonal phrasing)',
    pattern: word(
      'ty|cię|tobie|ciebie|twój|twoja|twoje|twoi|twoim|twoich|twojego|twojej|twoją|możesz|musisz|chcesz|masz|jesteś|potrzebujesz|użyjesz|zobaczysz',
    ),
  },
};

export const checkStyle = (locale, text) => {
  const rule = STYLE_RULES[locale];
  if (!rule) return [];
  const hits = [...new Set(stripCode(text).match(rule.pattern) ?? [])];
  return hits.length ? [`${rule.label}: ${hits.slice(0, 6).join(', ')}`] : [];
};

const hasCjk = (text) => /[㐀-鿿]/u.test(text);
// Three or more Latin words, at least one lower-case (so a company name in capitals is fine).
const hasLatinProse = (text) =>
  /(?:\p{Script=Latin}{3,}\s+){2,}\p{Script=Latin}{3,}/u.test(text) &&
  /\p{Ll}{3,}/u.test(text);

/** zh files must not leave whole English sentences behind (checked line by line). */
export const checkLatinProse = (locale, text, label) => {
  if (locale !== 'zh' && locale !== 'zh-tw') return [];
  const lines = stripCode(text)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => hasLatinProse(line) && !hasCjk(line));
  return lines.length
    ? [
        `${label}: English sentence with no Chinese text: ${lines.slice(0, 3).map(quote).join(', ')}`,
      ]
    : [];
};

/**
 * Glossary: `doNotTranslate` terms present in the English must be present verbatim; `terms`
 * entries ({ en, pl, de, zh, 'zh-tw' }, each locale a string or a list of accepted forms) must
 * appear in the translation (a stem is enough for inflected languages; case-insensitive).
 */
export const checkGlossary = (glossary, locale, enText, trText, label) => {
  const problems = [];
  const en = stripCode(enText);
  const tr = stripCode(trText);
  for (const term of glossary.doNotTranslate ?? []) {
    if (en.includes(term) && !tr.includes(term))
      problems.push(`${label}: "${term}" must stay untranslated`);
  }
  for (const entry of glossary.terms ?? []) {
    const targets = [entry[locale]].flat().filter(Boolean);
    if (!targets.length) continue;
    const source = new RegExp(`(?<![\\p{L}])${entry.en}(?![\\p{L}])`, 'iu');
    const lower = tr.toLowerCase();
    if (
      source.test(en) &&
      !targets.some((target) => lower.includes(target.toLowerCase()))
    )
      problems.push(
        `${label}: "${entry.en}" should be ${targets.map((t) => `"${t}"`).join(' or ')}`,
      );
  }
  return problems;
};
