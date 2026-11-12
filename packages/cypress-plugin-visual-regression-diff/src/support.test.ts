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
