// Scores the answers of a model and writes the table.
//
// - A page that changed: the answer is a hit when it names the element that
//   was changed and the change that was made, in the right direction. A judge
//   model decides, from the truth and the answer alone; it never sees which
//   arm the answer came from. Extra lines in the answer do not void a hit (a
//   change has side effects, and naming them is right).
// - A page that did not change: the answer is right when it is exactly
//   NO DIFFERENCE. Anything else is an invented difference. No judge needed.
//
//   node score.mjs --model sonnet [--judge haiku] [--concurrency 4]
//
// Verdicts are saved next to the answers, so scoring again costs nothing.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const judge = arg("judge", "haiku");
const casesDir = path.resolve(here, arg("cases", "cases"));
const dir = path.resolve(here, arg("out", "results"), model);
const concurrency = Number(arg("concurrency", "4"));
const ARMS = ["screenshots", "aria", "facts"];
const NAMES = {
  screenshots: "Two screenshots",
  aria: "Two accessibility snapshots",
  facts: "`pixsame snap` output",
};

const judgePrompt = (truth, answer) =>
  `You are grading an answer in a benchmark. Exactly one thing was changed on a web page.

ELEMENT CHANGED: ${truth.element} (CSS selector ${truth.selector}${truth.text ? `, its text: "${truth.text}"` : ""})
CHANGE MADE: ${truth.what.slice(truth.element.length + 2)}
CSS APPLIED: ${truth.css}

Someone was asked to list every visual difference between the page before and after. Their answer:

<answer>
${answer}
</answer>

Decide whether the answer contains the change that was made. Both of these must hold for one line of the answer:

1. It is about that element: it names it by its text, its selector, its role on the page or a description that fits no other element.
2. It states that change itself, in the right direction. The property may be named in other words (for font size "text got larger"; for a box shadow "a shadow appeared"; for opacity "faded" or "lighter and more transparent"; for a move "shifted down and right").

These do NOT count as stating the change:
- only a consequence of it. For letter spacing, "the button got wider" is a consequence, not the change. For a thicker border, "it got taller" is a consequence. For padding, "it got larger" alone is a consequence unless padding or inner spacing is named. For line height, "the elements below moved down" is a consequence.
- only that something changed: "look changed", "appearance differs", "pixels changed".
- the right change on another element, or the wrong direction.

Extra lines in the answer do not matter either way.

Reply with one word: HIT or MISS.`;

const ask = (prompt) =>
  new Promise((resolve) => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "pixsame-bench-judge-"));
    const child = spawn(
      "claude",
      [
        "-p",
        prompt,
        "--model",
        judge,
        "--output-format",
        "json",
        "--safe-mode",
        "--tools",
        "",
        "--strict-mcp-config",
        "--disable-slash-commands",
        "--no-session-persistence",
      ],
      { cwd, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.on("error", () => resolve(undefined));
    child.on("close", () => {
      fs.rmSync(cwd, { recursive: true, force: true });
      try {
        const word = String(JSON.parse(stdout).result).trim().toUpperCase();
        resolve(
          word.startsWith("HIT")
            ? true
            : word.startsWith("MISS")
              ? false
              : undefined,
        );
      } catch {
        resolve(undefined);
      }
    });
  });

const rows = [];
const pending = [];
for (const id of fs.readdirSync(dir).sort()) {
  if (!fs.statSync(path.join(dir, id)).isDirectory()) continue;
  const truth = JSON.parse(
    fs.readFileSync(path.join(casesDir, id, "truth.json"), "utf8"),
  );
  for (const arm of ARMS) {
    const file = path.join(dir, id, `${arm}.json`);
    if (!fs.existsSync(file)) continue;
    const result = JSON.parse(fs.readFileSync(file, "utf8"));
    const row = { id, arm, truth, result, file };
    rows.push(row);
    if (!truth.changed) {
      row.correct = /^\s*NO DIFFERENCE\.?\s*$/i.test(result.answer ?? "");
    } else if (typeof result.hit === "boolean" && result.judge === judge) {
      row.correct = result.hit;
    } else {
      pending.push(row);
    }
  }
}

console.log(`${rows.length} answers, ${pending.length} to judge with ${judge}`);
let unjudged = 0;
const work = async () => {
  for (let row = pending.shift(); row; row = pending.shift()) {
    // an answer that says nothing changed cannot hold the change
    let hit = /^\s*NO DIFFERENCE\.?\s*$/i.test(row.result.answer ?? "")
      ? false
      : await ask(judgePrompt(row.truth, row.result.answer));
    if (hit === undefined)
      hit = await ask(judgePrompt(row.truth, row.result.answer));
    if (hit === undefined) {
      unjudged++;
      continue;
    }
    row.correct = hit;
    fs.writeFileSync(
      row.file,
      `${JSON.stringify({ ...row.result, hit, judge }, null, 2)}\n`,
    );
  }
};
await Promise.all(Array.from({ length: concurrency }, work));
if (unjudged > 0) {
  console.error(`${unjudged} answers could not be judged; run this again.`);
  process.exit(1);
}

const mean = (values) =>
  values.length === 0
    ? 0
    : values.reduce((sum, v) => sum + v, 0) / values.length;
const pct = (part, whole) =>
  whole === 0 ? "n/a" : `${Math.round((part / whole) * 100)}%`;
/** A 95% interval for a share, by Wilson's method. */
const interval = (hits, n) => {
  if (n === 0) return "";
  const z = 1.96;
  const p = hits / n;
  const centre = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const half =
    (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) /
    (1 + (z * z) / n);
  return ` (${Math.round((centre - half) * 100)}–${Math.round((centre + half) * 100)})`;
};
const inputOf = ({ usage }) =>
  usage.input_tokens +
  usage.cache_creation_input_tokens +
  usage.cache_read_input_tokens;

const summary = ARMS.map((arm) => {
  const mine = rows.filter(
    (row) => row.arm === arm && typeof row.correct === "boolean",
  );
  const changed = mine.filter((row) => row.truth.changed);
  const same = mine.filter((row) => !row.truth.changed);
  return {
    arm,
    changed: changed.length,
    found: changed.filter((row) => row.correct).length,
    same: same.length,
    invented: same.filter((row) => !row.correct).length,
    input: Math.round(mean(mine.map((row) => inputOf(row.result)))),
    output: Math.round(mean(mine.map((row) => row.result.usage.output_tokens))),
    cost: mean(mine.map((row) => row.result.costUsd)),
    seconds: mean(mine.map((row) => row.result.durationMs)) / 1000,
    turns: mean(mine.map((row) => row.result.turns)),
  };
});

// what every call carries whatever the arm: the smallest input seen
const floor = Math.min(...rows.map((row) => inputOf(row.result)));
const kinds = [
  ...new Set(rows.filter((r) => r.truth.changed).map((r) => r.truth.kind)),
];
const modelId = rows[0]?.result.model ?? model;

const lines = [
  `# Results: ${modelId}`,
  "",
  `${summary[0].changed} changed pages and ${summary[0].same} unchanged pages per arm, one answer each. Judge: ${judge}. Intervals are 95%.`,
  "",
  "| What the agent was given | Changes found | Invented a difference on an unchanged page | Input tokens | Output tokens | Cost per answer | Time |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...summary.map(
    (s) =>
      `| ${NAMES[s.arm]} | ${pct(s.found, s.changed)}${interval(s.found, s.changed)} | ${pct(s.invented, s.same)} (${s.invented} of ${s.same}) | ${s.input.toLocaleString("en")} | ${s.output.toLocaleString("en")} | $${s.cost.toFixed(4)} | ${s.seconds.toFixed(1)} s |`,
  ),
  "",
  `Input tokens include what Claude Code itself sends with every call (its instructions and the Read tool), about ${floor.toLocaleString("en")} tokens whatever the arm; the difference between rows is what the arm's material costs. Cost is at list prices, as Claude Code reports it.`,
  "",
  "## Changes found, by kind of change",
  "",
  `| Kind | ${ARMS.map((arm) => NAMES[arm]).join(" | ")} |`,
  `| --- | ${ARMS.map(() => "---").join(" | ")} |`,
  ...kinds.map((kind) => {
    const cells = ARMS.map((arm) => {
      const mine = rows.filter(
        (row) =>
          row.arm === arm &&
          row.truth.kind === kind &&
          typeof row.correct === "boolean",
      );
      return `${mine.filter((row) => row.correct).length} of ${mine.length}`;
    });
    return `| ${kind} | ${cells.join(" | ")} |`;
  }),
  "",
];
fs.writeFileSync(path.join(dir, "RESULTS.md"), lines.join("\n"));
fs.writeFileSync(
  path.join(dir, "summary.json"),
  `${JSON.stringify({ model: modelId, judge, overhead: floor, arms: summary }, null, 2)}\n`,
);
console.log(lines.join("\n"));
