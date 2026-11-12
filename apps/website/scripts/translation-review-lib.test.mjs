import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deeplGlossaryEntries,
  mask,
  paragraphs,
  similarity,
  unmask,
} from './translation-review-lib.mjs';

describe('mask / unmask', () => {
  const source =
    'Use `matchImage` for {count} items, see [docs](https://a.dev/x) and @:nav.home.';

  it('protects code, placeholders and link targets, and restores them', () => {
    const { masked, spans } = mask(source);
    assert.ok(!masked.includes('matchImage'));
    assert.ok(!masked.includes('{count}'));
    assert.ok(!masked.includes('https://a.dev'));
    assert.equal(unmask(masked, spans), source);
  });

  it('survives reordering', () => {
    const { spans } = mask('`a` and `b`');
    assert.equal(unmask('<x i="1"/> und <x i="0"/>', spans), '`b` und `a`');
  });

  it('rejects a dropped or duplicated tag', () => {
    const { spans } = mask('`a` and `b`');
    assert.equal(unmask('<x i="0"/> only', spans), null);
    assert.equal(unmask('<x i="0"/> <x i="0"/>', spans), null);
  });
});

describe('paragraphs', () => {
  it('splits prose and skips code fences', () => {
    const body = [
      'One.',
      '',
      '```ts',
      'a',
      '',
      'b',
      '```',
      '',
      '- x',
      '- y',
      '',
      'Two.',
    ].join('\n');
    assert.deepEqual(paragraphs(body), ['One.', '- x\n- y', 'Two.']);
  });
});

describe('similarity', () => {
  it('is 1 for equal text and low for unrelated text', () => {
    assert.equal(similarity('Uruchom polecenie', 'Uruchom polecenie'), 1);
    assert.ok(
      similarity('Uruchom polecenie', 'Zupełnie coś innego tutaj') < 0.4,
    );
  });

  it('works for CJK', () => {
    assert.ok(similarity('运行命令并查看差异', '运行命令并查看差异') === 1);
    assert.ok(similarity('运行命令并查看差异', '安装依赖项') < 0.3);
  });
});

describe('deeplGlossaryEntries', () => {
  it('uses the first accepted form and keeps brand names', () => {
    const rows = deeplGlossaryEntries(
      {
        doNotTranslate: ['pixsame'],
        terms: [
          { en: 'thresholds?', pl: ['próg', 'progu'] },
          { en: 'x+', pl: 'y' },
        ],
      },
      'pl',
    );
    assert.equal(rows, 'threshold\tpróg\npixsame\tpixsame');
  });
});
