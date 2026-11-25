// Builds cases from the DiffSpot dataset (https://huggingface.co/datasets/tencent/DiffSpot):
// screenshot pairs of real pages that differ by one CSS change, or by nothing.
//
// DiffSpot ships screenshots, not pages, so `pixsame snap` cannot run on it.
// What can run is the part of pixsame that needs no page: the comparison of
// the pixels of two images. So there are two arms:
//
//   screenshots/  before.png, after.png
//   pixels/       before.png, after.png, pixsame.txt and the crops it names
//                 (the areas where pixels changed, cut out of both images)
//
//   node extract.mjs --data test-00000-of-00001.parquet --out cases-test
//                    [--skip 2] [--per-cell 6] [--no-diff 36]
//
// A cell is one kind of change at one difficulty (39 cells of 100 pairs).
// Pairs are taken in the order of their ids, which are random, so `--skip 2
// --per-cell 6` is the third to the eighth pair of every cell, the same ones
// on every run.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  asyncBufferFromFile,
  parquetMetadataAsync,
  parquetReadObjects,
} from "hyparquet";

const require = createRequire(import.meta.url);
const { compareShots } = require("pixsame/dist/snap/compare.js");
const { facts } = require("@pixsame/analysis");
const { decodePng, encodePng } = await import("visual-regression-compare");

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const data = arg("data");
if (!data) {
  console.error(
    "Give the dataset file: --data test-00000-of-00001.parquet (from https://huggingface.co/datasets/tencent/DiffSpot)",
  );
  process.exit(2);
}
const out = path.resolve(here, arg("out", "cases"));
const skip = Number(arg("skip", "0"));
const perCell = Number(arg("per-cell", "2"));
const noDiff = Number(arg("no-diff", "10"));
// with the same share of unchanged pairs as the cells, they start after the skipped ones too
const skipNoDiff = Number(arg("skip-no-diff", String(skip * 5)));

// Which pixels count as different:
//   exact  every pixel whose bytes differ. Both screenshots of a pair come
//          from the same renderer, and that is the rule `pixsame snap` goes by
//          for two captures from one machine.
//   test   what a visual test counts (pixelmatch at 0.1, anti-aliasing left
//          out). It misses a faint change, and a line one pixel wide.
const maskKind = arg("mask", "exact");

/** More areas than this are counted, not shown: nobody reads thirty crops. */
const MAX_AREAS = 12;
const CROP_MARGIN = 8;

const crop = (image, area) => {
  const x0 = Math.max(0, area.x - CROP_MARGIN);
  const y0 = Math.max(0, area.y - CROP_MARGIN);
  const x1 = Math.min(image.width, area.x + area.width + CROP_MARGIN);
  const y1 = Math.min(image.height, area.y + area.height + CROP_MARGIN);
  const width = x1 - x0;
  const height = y1 - y0;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = ((y0 + y) * image.width + x0) * 4;
    data.set(image.data.subarray(from, from + width * 4), y * width * 4);
  }
  return encodePng({ width, height, data });
};

/** The facts of two screenshots of one size, every differing pixel counted. */
const compareExactly = (before, after) => {
  const baseline = decodePng(before);
  const actual = decodePng(after);
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    return undefined;
  }
  const mask = new Uint8Array(actual.width * actual.height);
  for (let at = 0; at < mask.length; at++) {
    const p = at * 4;
    if (
      baseline.data[p] !== actual.data[p] ||
      baseline.data[p + 1] !== actual.data[p + 1] ||
      baseline.data[p + 2] !== actual.data[p + 2] ||
      baseline.data[p + 3] !== actual.data[p + 3]
    ) {
      mask[at] = 1;
    }
  }
  const found = facts({ baseline, actual, mask });
  return {
    facts: found,
    crops: found
      .filter((fact) => fact.type === "area")
      .map((fact) => ({
        before: crop(baseline, fact.area),
        after: crop(actual, fact.area),
      })),
  };
};

const file = await asyncBufferFromFile(path.resolve(data));
const metadata = await parquetMetadataAsync(file);
const TEXT = [
  "id",
  "ground_truth_diff",
  "mutation_dicts_json",
  "task_type",
  "difficulty",
  "domain",
  "target_bbox_x",
  "target_bbox_y",
  "target_bbox_w",
  "target_bbox_h",
];
const rows = await parquetReadObjects({ file, metadata, columns: TEXT });

const cells = new Map();
rows.forEach((row, at) => {
  const mutations = (row.mutation_dicts_json ?? []).map((one) =>
    JSON.parse(one),
  );
  const unchanged = row.task_type === "no_diff";
  const cell = unchanged
    ? "no_diff"
    : `${mutations[0].type}/${row.difficulty}`;
  if (!cells.has(cell)) cells.set(cell, []);
  cells.get(cell).push({ at, row, mutations, unchanged });
});
const picked = [];
for (const [cell, list] of [...cells].sort(([a], [b]) => a.localeCompare(b))) {
  list.sort((a, b) => a.row.id.localeCompare(b.row.id));
  picked.push(
    ...(cell === "no_diff"
      ? list.slice(skipNoDiff, skipNoDiff + noDiff)
      : list.slice(skip, skip + perCell)),
  );
}

const pixelsText = (facts, crops) => {
  if (facts.length === 0) {
    return maskKind === "exact"
      ? "before.png and after.png: no change. Every pixel is the same.\n"
      : "before.png and after.png: no change. No pixel differs by more than a visual test counts.\n";
  }
  const areas = facts.filter((fact) => fact.type === "area");
  const lines = [
    `before.png and after.png differ: ${facts
      .filter((fact) => fact.type !== "area")
      .map((fact) => fact.text)
      .join("; ")}`,
  ];
  areas.slice(0, MAX_AREAS).forEach((fact, i) => {
    lines.push(
      `  - ${fact.text}${crops[i] ? `; see area-${i + 1}.before.png and area-${i + 1}.after.png` : ""}`,
    );
  });
  if (areas.length > MAX_AREAS) {
    lines.push(`  ${areas.length - MAX_AREAS} more areas, smaller ones`);
  }
  return `${lines.join("\n")}\n`;
};

fs.rmSync(out, { recursive: true, force: true });
let made = 0;
let silent = 0;
let loud = 0;
for (const { at, row, mutations, unchanged } of picked) {
  const [images] = await parquetReadObjects({
    file,
    metadata,
    columns: ["image_before", "image_after"],
    rowStart: at,
    rowEnd: at + 1,
    // the images are bytes, not text
    utf8: false,
  });
  const before = images.image_before.bytes;
  const after = images.image_after.bytes;
  const dir = path.join(out, row.id);
  for (const arm of ["screenshots", "pixels"]) {
    fs.mkdirSync(path.join(dir, arm), { recursive: true });
    fs.writeFileSync(path.join(dir, arm, "before.png"), before);
    fs.writeFileSync(path.join(dir, arm, "after.png"), after);
  }
  const compared =
    (maskKind === "exact" && compareExactly(before, after)) ||
    (await compareShots({ before: { png: before }, after: { png: after } }));
  // crops come in the order of the facts that have one: without a page, the areas
  compared.crops.slice(0, MAX_AREAS).forEach((crop, i) => {
    fs.writeFileSync(
      path.join(dir, "pixels", `area-${i + 1}.before.png`),
      crop.before,
    );
    fs.writeFileSync(
      path.join(dir, "pixels", `area-${i + 1}.after.png`),
      crop.after,
    );
  });
  fs.writeFileSync(
    path.join(dir, "pixels", "pixsame.txt"),
    pixelsText(compared.facts, compared.crops),
  );
  if (compared.facts.length === 0 && !unchanged) silent++;
  if (compared.facts.length > 0 && unchanged) loud++;
  fs.writeFileSync(
    path.join(dir, "truth.json"),
    `${JSON.stringify(
      {
        id: row.id,
        split: unchanged ? "no_diff" : row.difficulty,
        operator: mutations[0]?.type ?? null,
        domain: row.domain,
        description: row.ground_truth_diff || null,
        mutations,
        box: unchanged
          ? null
          : [
              row.target_bbox_x,
              row.target_bbox_y,
              row.target_bbox_w,
              row.target_bbox_h,
            ].map(Number),
        pixsame: compared.facts.map((fact) => fact.text),
      },
      null,
      2,
    )}\n`,
  );
  made++;
}
console.log(
  `${made} cases in ${path.relative(process.cwd(), out)}. pixsame said "no change" on ${silent} changed pairs and reported a change on ${loud} unchanged ones.`,
);
