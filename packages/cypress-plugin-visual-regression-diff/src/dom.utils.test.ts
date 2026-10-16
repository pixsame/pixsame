import { it, expect, describe } from 'vitest';
import {
  injectDeterministicStyle,
  removeDeterministicStyle,
  type StyleHostDocument,
} from './dom.utils';
import {
  DETERMINISTIC_RENDERING_CSS,
  DETERMINISTIC_RENDERING_STYLE_ID,
} from './constants';

type FakeStyle = { id: string; textContent: string | null; remove: () => void };

// a minimal document: a `head` holding elements, looked up by id
const fakeDocument = ({ withHead = true } = {}) => {
  const children: FakeStyle[] = [];
  const container = {
    appendChild: (node: unknown) => children.push(node as FakeStyle),
  };
  const doc: StyleHostDocument = {
    getElementById: (id) => children.find((el) => el.id === id) ?? null,
    createElement: () => {
      const el: FakeStyle = {
        id: '',
        textContent: null,
        remove: () => children.splice(children.indexOf(el), 1),
      };
      return el;
    },
    head: withHead ? container : null,
    documentElement: container,
  };
  return { doc, children };
};

describe('injectDeterministicStyle', () => {
  it('adds one <style> with the preset CSS to <head>', () => {
    const { doc, children } = fakeDocument();

    injectDeterministicStyle(doc);

    expect(children).toEqual([
      expect.objectContaining({
        id: DETERMINISTIC_RENDERING_STYLE_ID,
        textContent: DETERMINISTIC_RENDERING_CSS,
      }),
    ]);
  });

  it('is idempotent', () => {
    const { doc, children } = fakeDocument();
    injectDeterministicStyle(doc);
    injectDeterministicStyle(doc);
    expect(children).toHaveLength(1);
  });

  it('falls back to the document element when there is no <head>', () => {
    const { doc, children } = fakeDocument({ withHead: false });
    injectDeterministicStyle(doc);
    expect(children).toHaveLength(1);
  });
});

describe('removeDeterministicStyle', () => {
  it('removes the injected <style>', () => {
    const { doc, children } = fakeDocument();
    injectDeterministicStyle(doc);

    removeDeterministicStyle(doc);

    expect(children).toEqual([]);
  });

  it('is a no-op when nothing was injected', () => {
    const { doc, children } = fakeDocument();
    expect(() => removeDeterministicStyle(doc)).not.toThrow();
    expect(children).toEqual([]);
  });
});
