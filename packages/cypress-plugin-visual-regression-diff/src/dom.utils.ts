import {
  DETERMINISTIC_RENDERING_CSS,
  DETERMINISTIC_RENDERING_STYLE_ID,
} from './constants';

/**
 * The part of `Document` the helpers touch; keeps them testable with a fake.
 * Method shorthand on purpose: its parameters are bivariant, so a real
 * `Document` (whose `appendChild` wants a `Node`) is assignable.
 */
export type StyleHostDocument = {
  getElementById(id: string): { remove(): void } | null;
  createElement(tag: 'style'): { id: string; textContent: string | null };
  head: { appendChild(node: unknown): unknown } | null;
  documentElement: { appendChild(node: unknown): unknown } | null;
};

/** Removes the deterministic-rendering `<style>`; a no-op when it is not there. */
export const removeDeterministicStyle = (doc: StyleHostDocument) => {
  doc.getElementById(DETERMINISTIC_RENDERING_STYLE_ID)?.remove();
};

/** Adds the deterministic-rendering `<style>` once (idempotent). */
export const injectDeterministicStyle = (doc: StyleHostDocument) => {
  if (doc.getElementById(DETERMINISTIC_RENDERING_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = DETERMINISTIC_RENDERING_STYLE_ID;
  style.textContent = DETERMINISTIC_RENDERING_CSS;
  (doc.head ?? doc.documentElement)?.appendChild(style);
};
