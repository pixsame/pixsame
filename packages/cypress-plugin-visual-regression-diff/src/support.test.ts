import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { setGracefulCleanup } from 'tmp-promise';
import { Cypress } from '@mocks/cypress.mock';
import { LS_SHOW_NON_FAILING_DIFFS } from './constants';
import {
  generateOverlayTemplate,
  getEffectiveShowPassingImages,
} from './support';

setGracefulCleanup();

vi.mock('./commands.ts', () => ({}));

describe('generateOverlayTemplate', () => {
  it('pins each change on the image and lists the rest', () => {
    const html = generateOverlayTemplate({
      title: 'some title',
      imgNewBase64: 'img-new-base64',
      imgOldBase64: 'img-old-base64',
      imgDiffBase64: 'img-diff-base64',
      wasImageNotUpdatedYet: true,
      error: true,
      pins: [
        {
          number: 1,
          kind: 'removed',
          side: 'baseline',
          text: 'removed a "Overview" <b>',
          boxes: [{ left: 10, top: 20, width: 30, height: 5 }],
        },
        {
          number: 2,
          kind: 'moved',
          side: 'actual',
          text: '2 elements moved down by 6 px',
          boxes: [
            { left: 1, top: 2, width: 3, height: 4 },
            { left: 5, top: 6, width: 7, height: 8 },
          ],
        },
      ],
      rest: ['the screenshot changed size 10x10 → 10x12'],
    });
    // one outline per box, hidden until its number or its line is hovered
    expect(html.match(/data-pix-box="2"/g)).toHaveLength(2 + 1);
    expect(html).toContain(
      'data-pix-box="1" style="position:absolute;left:10%;top:20%;width:30%;height:5%;',
    );
    // a removed element is pinned on the old image only
    expect(html).toContain('<div data-pin-side="baseline">');
    // texts from the page never become markup
    expect(html).toContain('removed a &quot;Overview&quot; &lt;b&gt;');
    expect(html).not.toContain('"Overview" <b>');
    expect(html).toContain('Other findings (1)');
    expect(html).toContain('the screenshot changed size 10x10 → 10x12');
  });

  it('generates proper template', () => {
    expect(
      generateOverlayTemplate({
        title: 'some title',
        imgNewBase64: 'img-new-base64',
        imgOldBase64: 'img-old-base64',
        imgDiffBase64: 'img-diff-base64',
        wasImageNotUpdatedYet: true,
        error: true,
      }),
    ).toMatchSnapshot();

    expect(
      generateOverlayTemplate({
        title: 'some title',
        imgNewBase64: 'img-new-base64',
        imgOldBase64: 'img-old-base64',
        imgDiffBase64: 'img-diff-base64',
        wasImageNotUpdatedYet: false,
        error: true,
      }),
    ).toMatchSnapshot();

    expect(
      generateOverlayTemplate({
        title: 'some title',
        imgNewBase64: 'img-new-base64',
        imgOldBase64: 'img-old-base64',
        imgDiffBase64: 'img-diff-base64',
        wasImageNotUpdatedYet: false,
        error: false,
      }),
    ).toMatchSnapshot();
  });
});

describe('getEffectiveShowPassingImages', () => {
  const getItem = vi.fn<(key: string) => string | null>();

  beforeEach(() => {
    Cypress.expose.mockReset();
    Cypress.env.mockReset();
    getItem.mockReset();
    vi.stubGlobal('top', { localStorage: { getItem } });
  });

  afterEach(() => {
    vi.stubGlobal('top', undefined);
  });

  it('falls back to config when top is unavailable', () => {
    vi.stubGlobal('top', undefined);
    Cypress.expose.mockReturnValue(true);

    expect(getEffectiveShowPassingImages()).toBe(true);
    expect(getItem).not.toHaveBeenCalled();
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('prefers localStorage value %s over config', (stored, expected) => {
    getItem.mockReturnValue(stored);
    Cypress.expose.mockReturnValue(!expected);

    expect(getEffectiveShowPassingImages()).toBe(expected);
    expect(getItem).toHaveBeenCalledWith(LS_SHOW_NON_FAILING_DIFFS);
    expect(Cypress.expose).not.toHaveBeenCalled();
  });

  it('falls back to config when localStorage is empty', () => {
    getItem.mockReturnValue(null);
    Cypress.expose.mockReturnValue(true);

    expect(getEffectiveShowPassingImages()).toBe(true);
  });
});
