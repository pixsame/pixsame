// Scores the answers of `run.mjs` the way DiffSpot does: its judge prompt
// (judge.txt, word for word) and its counting rules. A changed pair is found
// when the judge calls the change "correct" ("partial" is a miss); an
// unchanged pair is right when the judge lists no invented difference.
//
// DiffSpot's judge model is gpt-oss-120b; here the judge is a Claude model,
// so these numbers are not leaderboard numbers.
//
//   node score.mjs --model sonnet [--judge sonnet] [--cases cases-test] [--out results-test]
//
// A verdict is saved into the answer's file; a second run judges what is left.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { askClaude, inParallel } from "../ask.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const model = arg("model");
if (!model) {
  console.error("Give the model whose answers to score: --model sonnet");
  process.exit(2);
}
const judge = arg("judge", "sonnet");
const casesDir = path.resolve(here, arg("cases", "cases-test"));
const dir = path.resolve(here, arg("out", "results-test"), model);
const concurrency = Number(arg("concurrency", "4"));
const ARMS = ["screenshots", "pixels"];
const NAMES = {
  screenshots: "Two screenshots",
  pixels: "Two screenshots and pixsame's comparison of their pixels",
};
const TIERS = ["easy", "medium", "hard"];

const JUDGE = fs
  .readFileSync(path.join(here, "judge.txt"), "utf8")
  .split(">>> PROMPT BEGINS BELOW THIS LINE >>>")[1]
  .trim();
// what DiffSpot's own runner gives the judge for an unchanged pair
const UNCHANGED =
  "No changes were applied; the two screenshots are independent renderings of the same HTML.";

const judgePrompt = (truth, answer) =>
  JUDGE.replace(
    "{gt_json}",
    () => JSON.stringify(truth.split === "no_diff" ? [] : truth.mutations, null, 2),
  )
    .replace("{gt_answer}", () =>
      truth.split === "no_diff" ? UNCHANGED : (truth.description ?? ""),
    )
    .replace("{vlm_response}", () => answer);

const parse = (raw) => {
  const text = String(raw)
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  const from = text.indexOf("{");
  const to = text.lastIndexOf("}");
  return JSON.parse(text.slice(from, to + 1));
};

const verdictOf = async (truth, answer) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const cwd = fs.mkdtempSync(
      path.join(os.tmpdir(), "pixsame-diffspot-judge-"),
    );
    try {
      const result = await askClaude({
        cwd,
        prompt: judgePrompt(truth, answer),
        model: judge,
      });
      if (result.error) continue;
      const label = parse(result.answer);
      const correct = (label.mutations ?? []).filter(
        (one) => one.verdict === "correct",
      ).length;
      const invented = (label.hallucinations ?? []).length;
      return {
        label,
        right: truth.split === "no_diff" ? invented === 0 : correct > 0,
        invented,
        judge,
        judgeCostUsd: result.costUsd,
      };
    } catch {
      // not JSON: ask again
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  }
  return undefined;
};

const ids = fs.readdirSync(casesDir).sort();
const truths = Object.fromEntries(
  ids.map((id) => [
    id,
    JSON.parse(fs.readFileSync(path.join(casesDir, id, "truth.json"), "utf8")),
  ]),
);
const jobs = [];
for (const id of ids) {
  for (const arm of ARMS) {
    const file = path.join(dir, id, `${arm}.json`);
    if (!fs.existsSync(file)) continue;
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    if (saved.verdict?.judge !== judge) jobs.push({ id, arm, file, saved });
  }
}
console.log(`${jobs.length} answers to judge with ${judge}`);
let unjudged = 0;
await inParallel(jobs, concurrency, async ({ id, file, saved }) => {
  const verdict = await verdictOf(truths[id], saved.answer);
  if (!verdict) return void unjudged++;
  fs.writeFileSync(file, `${JSON.stringify({ ...saved, verdict }, null, 2)}\n`);
});
if (unjudged > 0) console.error(`${unjudged} could not be judged; run again`);

/** Wilson score interval, 95%. */
const interval = (hits, n) => {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = hits / n;
  const middle = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  const bottom = 1 + (z * z) / n;
  return [(middle - spread) / bottom, (middle + spread) / bottom];
};
const percent = (share) => `${Math.round(share * 100)}%`;
const cell = (hits, n) => {
  if (n === 0) return "–";
  const [low, high] = interval(hits, n);
  return `${percent(hits / n)} (${percent(low)}–${percent(high)}), ${hits} of ${n}`;
};

const summary = { model, judge, cases: ids.length, arms: {} };
for (const arm of ARMS) {
  const rows = ids.flatMap((id) => {
    const file = path.join(dir, id, `${arm}.json`);
    if (!fs.existsSync(file)) return [];
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    return saved.verdict ? [{ truth: truths[id], saved }] : [];
  });
  if (rows.length === 0) continue;
  const count = (keep) => {
    const kept = rows.filter(({ truth }) => keep(truth));
    return [kept.filter(({ saved }) => saved.verdict.right).length, kept.length];
  };
  const operators = [
    ...new Set(rows.map(({ truth }) => truth.operator).filter(Boolean)),
  ].sort();
  summary.arms[arm] = {
    answers: rows.length,
    changed: count((truth) => truth.split !== "no_diff"),
    unchanged: count((truth) => truth.split === "no_diff"),
    all: count(() => true),
    tiers: Object.fromEntries(
      TIERS.map((tier) => [tier, count((truth) => truth.split === tier)]),
    ),
    operators: Object.fromEntries(
      operators.map((operator) => [
        operator,
        count((truth) => truth.operator === operator),
      ]),
    ),
    costUsd:
      rows.reduce((sum, { saved }) => sum + (saved.costUsd ?? 0), 0) /
      rows.length,
    turns:
      rows.reduce((sum, { saved }) => sum + (saved.turns ?? 0), 0) /
      rows.length,
  };
}

// the same pairs went to both arms, so what counts is where they disagree
const only = { screenshots: 0, pixels: 0 };
for (const id of ids) {
  if (truths[id].split === "no_diff") continue;
  const [a, b] = ARMS.map((arm) => {
    const file = path.join(dir, id, `${arm}.json`);
    return fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, "utf8")).verdict?.right
      : undefined;
  });
  if (a === undefined || b === undefined) continue;
  if (a && !b) only.screenshots++;
  if (b && !a) only.pixels++;
}
summary.foundByOneArmOnly = only;

const arms = Object.keys(summary.arms);
const lines = [
  `# DiffSpot sample: ${model}, judged by ${judge}`,
  "",
  `${ids.length} pairs of the DiffSpot test set. Found means the judge called the change "correct" under DiffSpot's judge prompt; right on unchanged pairs means it listed no invented difference.`,
  "",
  "| What the agent was given | Changes found (95% interval) | Right on unchanged pairs | All pairs | Cost per answer |",
  "| --- | --- | --- | --- | --- |",
  ...arms.map((arm) => {
    const one = summary.arms[arm];
    return `| ${NAMES[arm]} | ${cell(...one.changed)} | ${cell(...one.unchanged)} | ${cell(...one.all)} | $${one.costUsd.toFixed(4)} |`;
  }),
  "",
  ...(arms.length === 2
    ? [
        `Changes found with pixsame's comparison and not from the screenshots alone: ${only.pixels}. The other way round: ${only.screenshots}.`,
        "",
      ]
    : []),
  "## By difficulty",
  "",
  `| Difficulty | ${arms.map((arm) => NAMES[arm]).join(" | ")} |`,
  `| --- | ${arms.map(() => "---").join(" | ")} |`,
  ...TIERS.map(
    (tier) =>
      `| ${tier} | ${arms.map((arm) => cell(...summary.arms[arm].tiers[tier])).join(" | ")} |`,
  ),
  "",
  "## By kind of change",
  "",
  `| Kind | ${arms.map((arm) => NAMES[arm]).join(" | ")} |`,
  `| --- | ${arms.map(() => "---").join(" | ")} |`,
  ...Object.keys(summary.arms[arms[0]]?.operators ?? {}).map(
    (operator) =>
      `| ${operator} | ${arms
        .map((arm) => {
          const [hits, n] = summary.arms[arm].operators[operator] ?? [0, 0];
          return `${hits} of ${n}`;
        })
        .join(" | ")} |`,
  ),
  "",
];
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "RESULTS.md"), lines.join("\n"));
fs.writeFileSync(
  path.join(dir, "summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);
console.log(lines.join("\n"));
