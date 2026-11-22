// The fourteen kinds of change: thirteen single CSS properties, modelled on
// the change types of the DiffSpot benchmark (arXiv 2605.29615), and a move.
// Each is one small edit of the kind that slips into a pull request.
//
// `needs` is what the target must be (`text`, `box` or `any`), `read` the
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
    read: ["letter-spacing"],
    css: () => "letter-spacing: 0.06em",
    says: "its letter spacing got wider",
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

/** The declarations as a rule that wins over the page's own styles. */
export const rule = (selector, declarations) =>
  `${selector} { ${declarations
    .split(";")
    .map((one) => one.trim())
    .filter(Boolean)
    .map((one) => `${one} !important`)
    .join("; ")} }`;
