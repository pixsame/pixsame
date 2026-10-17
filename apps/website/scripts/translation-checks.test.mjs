// Run with: pnpm --filter @pixsame/website translations:test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkFrontmatter,
  checkGlossary,
  checkLatinProse,
  checkMarkdown,
  checkMessages,
  checkStyle,
  flatten,
  placeholders,
} from './translation-checks.mjs';

const fence = '```';
const md = (...lines) => lines.join('\n');
const block = (info, ...code) => md(fence + info, ...code, fence);

describe('placeholders', () => {
  it('finds interpolations, literals, links and printf tokens', () => {
    assert.deepEqual(
      placeholders("Hi {name}, {'@'} @:nav.home @.lower:{'a.b'} %s {{ x }}"),
      ['{name}', "{'@'}", '@:nav.home', "@.lower:{'a.b'}", '%s', '{{ x }}'],
    );
  });
});

describe('checkMessages', () => {
  const en = flatten({
    meta: { reviewed: true },
    nav: { stars: '{count} stars', home: 'Home' },
  });

  it('passes a faithful translation (placeholders may move)', () => {
    const tr = flatten({
      meta: { reviewed: false },
      nav: { stars: 'Sterne: {count}', home: 'Start' },
    });
    assert.deepEqual(checkMessages(en, tr), []);
  });

  it('fails on a dropped placeholder', () => {
    const tr = flatten({ nav: { stars: 'Sterne', home: 'Start' } });
    const [problem] = checkMessages(en, tr);
    assert.match(
      problem,
      /nav\.stars: placeholders differ: missing "\{count\}"/,
    );
  });

  it('fails on a translated placeholder name', () => {
    const tr = flatten({ nav: { stars: '{liczba} gwiazdek', home: 'x' } });
    const [problem] = checkMessages(en, tr);
    assert.match(problem, /missing "\{count\}"; unexpected "\{liczba\}"/);
  });

  it('fails on a duplicated placeholder', () => {
    const tr = flatten({ nav: { stars: '{count} {count}', home: 'x' } });
    assert.match(checkMessages(en, tr)[0], /unexpected "\{count\}"/);
  });

  it('fails on missing, extra and empty keys', () => {
    const tr = flatten({ nav: { stars: '{count}', extra: 'x', home: ' ' } });
    const problems = checkMessages(en, tr).join('\n');
    assert.match(problems, /nav\.home: value is empty/);
    assert.match(problems, /nav\.extra: key does not exist in en\.json/);
    assert.match(
      checkMessages(en, flatten({ nav: { stars: '{count}' } })).join('\n'),
      /nav\.home: key is missing/,
    );
  });
});

describe('checkMarkdown: code blocks', () => {
  const en = md('Run it:', block('bash', 'pnpm add x', '# install'), 'Done.');

  it('passes when only comments are translated', () => {
    const tr = md(
      'Uruchom:',
      block('bash', 'pnpm add x', '# instalacja'),
      'Gotowe.',
    );
    assert.deepEqual(checkMarkdown(en, tr), []);
  });

  it('passes with translated trailing comments', () => {
    const a = md(block('ts', 'run(); // go fast'));
    const b = md(block('ts', 'run(); // los'));
    assert.deepEqual(checkMarkdown(a, b), []);
  });

  it('fails when a code block is missing', () => {
    const problems = checkMarkdown(en, 'Uruchom:\n\nGotowe.');
    assert.match(problems[0], /code blocks: English has 1, translation has 0/);
  });

  it('fails when a code block is added', () => {
    const tr = md(en, block('bash', 'x'));
    assert.match(checkMarkdown(en, tr)[0], /English has 1, translation has 2/);
  });

  it('fails when code is altered', () => {
    const tr = md('Uruchom:', block('bash', 'pnpm add y', '# instalacja'));
    assert.match(
      checkMarkdown(en, tr).join('\n'),
      /code block #1 \(bash\), line 1: expected "pnpm add x", got "pnpm add y"/,
    );
  });

  it('fails when a line is dropped or the language changes', () => {
    assert.match(
      checkMarkdown(en, md(block('bash', 'pnpm add x'))).join('\n'),
      /1 lines, expected 2/,
    );
    assert.match(
      checkMarkdown(en, md(block('sh', 'pnpm add x', '# i'))).join('\n'),
      /language is "sh", expected "bash"/,
    );
  });

  it('fails on a code fence that is never closed', () => {
    assert.match(
      checkMarkdown(en, md('x', fence + 'bash', 'pnpm add x')).join('\n'),
      /never closed/,
    );
  });

  it('does not mistake a longer fence content for a close', () => {
    const outer = md('````md', fence + 'ts', 'a', fence, '````');
    assert.deepEqual(checkMarkdown(outer, outer), []);
  });
});

describe('checkMarkdown: inline code, links, headings', () => {
  it('fails when an inline span is translated or dropped', () => {
    const problems = checkMarkdown(
      'Use `matchImage` now.',
      'Użyj `dopasujObraz`.',
    );
    assert.match(
      problems[0],
      /inline code: missing "matchImage"; unexpected "dopasujObraz"/,
    );
    assert.match(
      checkMarkdown('Use `a` and `b`.', 'Użyj `a`.')[0],
      /missing "b"/,
    );
  });

  it('ignores backticks inside code blocks', () => {
    const src = md(block('md', 'use `x`'), 'and `y`');
    assert.deepEqual(checkMarkdown(src, src), []);
  });

  it('compares links without the locale prefix', () => {
    assert.deepEqual(
      checkMarkdown(
        'See [docs](/docs/usage#a).',
        'Zobacz [dok](/pl/docs/usage#a).',
      ),
      [],
    );
    assert.match(
      checkMarkdown('See [x](https://a.dev).', 'Zobacz [x](https://b.dev).')[0],
      /link targets/,
    );
  });

  it('fails when the heading structure changes', () => {
    assert.match(
      checkMarkdown('# A\n## B\n## C', '# A\n## B')[0],
      /headings: English has 3 .* translation has 2/,
    );
  });

  it('does not count comment lines in code as headings', () => {
    const src = md(block('bash', '# not a heading'), '## Real');
    assert.deepEqual(checkMarkdown(src, src), []);
  });
});

describe('checkFrontmatter', () => {
  it('requires the English keys and reviewed', () => {
    assert.deepEqual(
      checkFrontmatter(
        'title: A\norder: 1',
        'title: B\norder: 1\nreviewed: false',
      ),
      [],
    );
    const problems = checkFrontmatter('title: A\norder: 1', 'title: B');
    assert.equal(problems.length, 2);
  });
});

describe('style warnings', () => {
  it('de: flags informal du, passes Sie', () => {
    assert.match(
      checkStyle('de', 'Du kannst dein Projekt öffnen.')[0],
      /Du, dein/,
    );
    assert.deepEqual(checkStyle('de', 'Sie können Ihr Projekt öffnen.'), []);
  });

  it('de: ignores code', () => {
    assert.deepEqual(checkStyle('de', 'Rufen Sie `du` auf.'), []);
  });

  it('pl: flags second-person singular, passes impersonal', () => {
    assert.match(
      checkStyle('pl', 'Możesz dodać swój plik. Twoje repo.')[0],
      /Możesz, Twoje/,
    );
    assert.deepEqual(
      checkStyle('pl', 'Należy dodać plik. Ci, którzy chcą.'),
      [],
    );
  });

  it('other locales have no register rule', () => {
    assert.deepEqual(checkStyle('zh', 'You can do it'), []);
  });
});

describe('checkLatinProse', () => {
  it('flags an English sentence in zh, passes mixed text and names', () => {
    assert.match(
      checkLatinProse('zh', 'Run the command now', 's')[0],
      /English sentence/,
    );
    assert.deepEqual(checkLatinProse('zh', '运行 matchImage 命令', 's'), []);
    assert.deepEqual(checkLatinProse('zh', 'FRS JAKUB FREISLER', 's'), []);
    assert.deepEqual(checkLatinProse('de', 'Run the command now', 's'), []);
  });
});

describe('checkGlossary', () => {
  const glossary = {
    doNotTranslate: ['pixsame'],
    terms: [{ en: 'thresholds?', pl: ['próg', 'progu'], zh: '阈值' }],
  };

  it('flags a translated brand name', () => {
    assert.match(
      checkGlossary(glossary, 'zh', 'Use pixsame', '使用像素', 'x')[0],
      /"pixsame" must stay untranslated/,
    );
    assert.deepEqual(
      checkGlossary(glossary, 'zh', 'Use pixsame', '使用 pixsame', 'x'),
      [],
    );
  });

  it('flags a glossary term and accepts any listed form', () => {
    assert.match(
      checkGlossary(glossary, 'pl', 'The threshold', 'Granica', 'x')[0],
      /"próg" or "progu"/,
    );
    assert.deepEqual(
      checkGlossary(glossary, 'pl', 'The threshold', 'Do progu', 'x'),
      [],
    );
    assert.deepEqual(
      checkGlossary(glossary, 'de', 'The threshold', 'x', 'x'),
      [],
    );
  });
});
