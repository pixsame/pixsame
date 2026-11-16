import { describe, expect, it } from 'vitest';
import { updateImagesFromEnv } from './update.utils';

describe('updateImagesFromEnv', () => {
  it.each([
    ['true', true],
    ['1', true],
    [' TRUE ', true],
    ['failures-only', 'failures-only'],
    ['false', undefined],
    ['', undefined],
    [undefined, undefined],
  ])('reads %j as %j', (value, expected) => {
    expect(updateImagesFromEnv({ PIXSAME_UPDATE_IMAGES: value })).toBe(
      expected,
    );
  });
});
