// The fourteen kinds of change: thirteen single CSS properties, modelled on
// the change types of the DiffSpot benchmark (arXiv 2605.29615), and a move.
// Each is one small edit of the kind that slips into a pull request.
//
// `needs` is what the target must be (`text`, `box`, `container` or `any`), `read` the
// computed styles the edit depends on, and `css(computed)` the declarations
// that make the change, or `undefined` when it would change nothing.

const px = (value) => Number.parseFloat(value) || 0;

export const MUTATIONS = [
  {
    id: "color",
    needs: "text",
    read: ["color"],
    css: ({ color }) =>
      color === "rgb(179, 38, 30)" ? undefined : "color: rgb(179, 38, 30)",
    says: "its text colour changed (to a red)",
  },
  {
    id: "background-color",
    needs: "box",
    read: ["background-color"],
    css: () => "background-color: rgb(255, 224, 138)",
    says: "its background colour changed (to a yellow)",
  },
  {
    id: "font-size",
    needs: "text",
    read: ["font-size"],
    css: (c) => `font-size: ${px(c["font-size"]) + 2}px`,
    says: "its text got larger (font size up by 2px)",
  },
  {
    id: "font-weight",
    needs: "text",
    read: ["font-weight"],
    css: (c) => `font-weight: ${Number(c["font-weight"]) >= 600 ? 400 : 700}`,
    says: (c) =>
      Number(c["font-weight"]) >= 600
        ? "its text got lighter (bold to regular)"
        : "its text got bolder (regular to bold)",
  },
  {
    id: "line-height",
    needs: "text",
    read: ["line-height", "font-size"],
    css: (c) =>
      `line-height: ${Math.round((px(c["line-height"]) || px(c["font-size"]) * 1.2) + 6)}px`,
    says: "its line height got larger (lines taller, by about 6px)",
  },
  {
    id: "letter-spacing",
    needs: "text",
    read: ["letter-spacing", "font-size"],
    css: () => "letter-spacing: 0.06em",
    // an element that was spaced wider than this already gets narrower
    says: (c) =>
      px(c["letter-spacing"]) > 0.06 * px(c["font-size"])
        ? "its letter spacing got narrower"
        : "its letter spacing got wider",
  },
  {
    id: "border-radius",
    needs: "box",
    read: ["border-top-left-radius"],
    css: (c) =>
      `border-radius: ${px(c["border-top-left-radius"]) >= 8 ? 0 : px(c["border-top-left-radius"]) + 10}px`,
    says: (c) =>
      px(c["border-top-left-radius"]) >= 8
        ? "its corners became square (border radius removed)"
        : "its corners became rounder (border radius larger)",
  },
  {
    id: "padding",
    needs: "box",
    read: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
    css: (c) =>
      `padding: ${["top", "right", "bottom", "left"].map((side) => `${px(c[`padding-${side}`]) + 6}px`).join(" ")}`,
    says: "its padding got larger (by 6px on every side), so it grew",
  },
  {
    id: "margin",
    needs: "any",
    read: ["margin-top"],
    css: (c) => `margin-top: ${px(c["margin-top"]) + 14}px`,
    says: "the space above it got larger (margin up by 14px), so it sits lower",
  },
  {
    id: "width",
    needs: "box",
    read: ["width"],
    css: (c) => `width: ${Math.round(px(c.width) * 0.85)}px`,
    says: "it got narrower (to about 85% of its width)",
  },
  {
    id: "opacity",
    needs: "any",
    read: ["opacity"],
    css: () => "opacity: 0.55",
    says: "it became partly transparent (faded)",
  },
  {
    id: "border-width",
    needs: "box",
    read: ["border-top-width"],
    css: (c) =>
      px(c["border-top-width"]) > 0
        ? `border-width: ${px(c["border-top-width"]) + 3}px`
        : "border: 3px solid rgb(60, 60, 67)",
    says: (c) =>
      px(c["border-top-width"]) > 0
        ? "its border got thicker"
        : "it got a border (3px, dark)",
  },
  {
    id: "box-shadow",
    needs: "box",
    read: ["box-shadow"],
    css: () => "box-shadow: rgba(0, 0, 0, 0.35) 0px 6px 16px 0px",
    says: "it got a drop shadow",
  },
  {
    id: "move",
    needs: "any",
    read: ["position"],
    css: () => "position: relative; top: 10px; left: 14px",
    says: "it moved (10px down and 14px to the right), nothing else about it changed",
  },
];

/**
 * Eight more kinds, first used in round 1. They were chosen before
 * `pixsame snap` was run on any of them, and on purpose included changes it
 * had no name for then (a background image, a transform), so the result
 * showed what it could not say as well as what it could.
 */
export const EXTRA = [
  {
    id: "border-color",
    needs: "box",
    read: ["border-top-width"],
    css: (c) =>
      px(c["border-top-width"]) > 0
        ? "border-color: rgb(200, 30, 30)"
        : undefined,
    says: "its border colour changed (to a red)",
  },
  {
    id: "text-decoration",
    needs: "text",
    read: ["text-decoration-line"],
    css: (c) =>
      c["text-decoration-line"] === "none"
        ? "text-decoration: underline"
        : "text-decoration: none",
    says: (c) =>
      c["text-decoration-line"] === "none"
        ? "its text got underlined"
        : "its text lost its underline",
  },
  {
    id: "text-align",
    needs: "text",
    read: ["text-align"],
    css: (c) =>
      `text-align: ${["right", "end"].includes(c["text-align"]) ? "left" : "right"}`,
    says: (c) =>
      ["right", "end"].includes(c["text-align"])
        ? "its text is now aligned to the left"
        : "its text is now aligned to the right",
  },
  {
    id: "font-family",
    needs: "text",
    read: ["font-family"],
    css: (c) =>
      c["font-family"].includes("Courier")
        ? undefined
        : 'font-family: "Courier New", Courier, monospace',
    says: "its font changed (to a monospace typeface)",
  },
  {
    id: "gap",
    needs: "container",
    read: ["row-gap", "column-gap"],
    css: (c) => `gap: ${px(c["row-gap"]) + 12}px ${px(c["column-gap"]) + 12}px`,
    says: "the gap between its items got larger (by 12px)",
  },
  {
    id: "background-image",
    needs: "box",
    read: ["background-image"],
    css: () =>
      "background-image: linear-gradient(135deg, rgb(255, 224, 138), rgb(255, 138, 138))",
    says: "its background became a gradient (yellow to pink)",
  },
  {
    id: "transform",
    needs: "box",
    read: ["transform"],
    css: () => "transform: rotate(-3deg)",
    says: "it is tilted (rotated by a few degrees)",
  },
  {
    id: "hidden",
    needs: "any",
    read: ["visibility"],
    css: () => "visibility: hidden",
    says: "it disappeared (it is hidden; the space it took stays empty)",
  },
];

/**
 * Seven more kinds, first used in round 2, chosen the same way: before
 * `pixsame snap` was run on any of them. `item` is a child of a flex or grid
 * container that has siblings.
 */
export const EXTRA2 = [
  {
    id: "font-style",
    needs: "text",
    read: ["font-style"],
    css: (c) =>
      `font-style: ${c["font-style"] === "italic" ? "normal" : "italic"}`,
    says: (c) =>
      c["font-style"] === "italic"
        ? "its text is no longer italic"
        : "its text became italic",
  },
  {
    id: "text-transform",
    needs: "text",
    read: ["text-transform"],
    css: (c) =>
      c["text-transform"] === "uppercase"
        ? "text-transform: none"
        : "text-transform: uppercase",
    says: (c) =>
      c["text-transform"] === "uppercase"
        ? "its text is no longer in capitals"
        : "its text is now all in capitals",
  },
  {
    id: "height",
    needs: "box",
    read: ["height"],
    css: (c) => `height: ${Math.round(px(c.height) + 24)}px`,
    says: "it got taller (by about 24px)",
  },
  {
    id: "display-none",
    needs: "any",
    read: ["display"],
    css: () => "display: none",
    says: "it is gone (removed from the page; what follows took its place)",
  },
  {
    id: "order",
    needs: "item",
    read: ["order"],
    css: () => "order: 99",
    says: "it now comes last among its siblings (it moved to the end of its row or list)",
  },
  {
    id: "filter",
    needs: "box",
    read: ["filter"],
    css: () => "filter: blur(2px)",
    says: "it became blurred",
  },
  {
    id: "outline",
    needs: "box",
    read: ["outline-style"],
    css: () => "outline: rgb(200, 30, 30) solid 3px; outline-offset: 2px",
    says: "it got an outline (red, 3px)",
  },
];

/** The declarations as a rule that wins over the page's own styles. */
export const rule = (selector, declarations) =>
  `${selector} { ${declarations
    .split(";")
    .map((one) => one.trim())
    .filter(Boolean)
    .map((one) => `${one} !important`)
    .join("; ")} }`;
