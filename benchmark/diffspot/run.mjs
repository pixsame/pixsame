// Asks a model what differs between the two screenshots of every DiffSpot
// case, once from the screenshots alone and once with what pixsame says about
// their pixels. The question is DiffSpot's own, word for word; only the
// sentence that says where the files are is ours.
//
//   node run.mjs --model sonnet [--cases cases-test] [--out results-test]
//                [--arms screenshots,pixels] [--concurrency 4] [--limit 20]
//
// Answers are saved one file per case and arm; a second run skips what is
// there, so an interrupted run can be continued.

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
  console.error("Give a model: --model sonnet (or haiku, opus, a full id)");
  process.exit(2);
}
const casesDir = path.resolve(here, arg("cases", "cases-test"));
const outDir = path.resolve(here, arg("out", "results-test"), model);
const arms = arg("arms", "screenshots,pixels").split(",");
const concurrency = Number(arg("concurrency", "4"));
const limit = Number(arg("limit", "0"));

// DiffSpot's prompt (diffspot/prompts/vlm_diff.txt, the same text for changed
// and unchanged pairs), MIT, (C) 2026 Tencent
const DIFFSPOT = `You are comparing two screenshots of the same web page (Image A and Image B).
Subtle changes may have been made to one or more elements between A and B.

Carefully list **every** difference you can identify. For each difference, state:
  1. Which element changed (be specific: "the 'Sign Up' button in the top-right header")
  2. What changed (color / size / position / text content / visibility / spacing / alignment / etc.)
  3. The direction or magnitude of the change if observable

If you cannot identify any difference, say so explicitly. Do not invent changes.
Output one bullet point per difference, in plain English.`;

const FILES =
  "Image A is before.png and Image B is after.png in the current directory; read both.";

export const PROMPTS = {
  screenshots: `${FILES}\n\n${DIFFSPOT}`,
  pixels: `${FILES} A comparison tool (pixsame) already compared the pixels of the two images: its output is pixsame.txt in the current directory, and it names crops of the areas that changed, cut out of Image A and of Image B. Read it and the crops it names.\n\n${DIFFSPOT}`,
};

const jobs = [];
for (const id of fs.readdirSync(casesDir).sort()) {
  for (const arm of arms) {
    const file = path.join(outDir, id, `${arm}.json`);
    if (!fs.existsSync(file)) jobs.push({ id, arm, file });
  }
}
const todo = limit > 0 ? jobs.slice(0, limit) : jobs;
console.log(
  `${todo.length} answers to get from ${model} (${jobs.length - todo.length} left for later)`,
);

let done = 0;
let failed = 0;
await inParallel(todo, concurrency, async (job) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "pixsame-diffspot-run-"));
  try {
    fs.cpSync(path.join(casesDir, job.id, job.arm), cwd, { recursive: true });
    const question = { cwd, prompt: PROMPTS[job.arm], model, read: true };
    let result = await askClaude(question);
    // one more try: a usage limit or a dropped connection is not an answer
    if (result.error) result = await askClaude(question);
    if (result.error) {
      failed++;
      console.error(`${job.id} ${job.arm}: ${result.error}`);
      return;
    }
    fs.mkdirSync(path.dirname(job.file), { recursive: true });
    fs.writeFileSync(job.file, `${JSON.stringify(result, null, 2)}\n`);
    if (++done % 20 === 0) console.log(`${done} done`);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
console.log(
  `${done} answers saved, ${failed} failed. Run it again to retry the failed ones.`,
);
process.exit(failed > 0 ? 1 : 0);
