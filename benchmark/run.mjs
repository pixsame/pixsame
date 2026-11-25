// Asks a model, for every case and every arm, what changed on the page.
//
// The model runs as a coding agent would: Claude Code in headless mode, with
// only the Read tool, in an empty directory that holds that arm's files and
// nothing else. So the numbers are those of a real agent, on your Claude
// subscription or API key, and every call carries the same fixed overhead of
// the agent's own instructions.
//
//   node run.mjs --model sonnet [--pages landing] [--arms screenshots,aria,facts]
//                [--concurrency 4] [--cases cases] [--out results] [--limit 20]
//
// Answers are saved one file per case and arm; a second run skips what is
// there, so an interrupted run can be continued.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { askClaude } from "./ask.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const model = arg("model");
if (!model) {
  console.error(
    "Give a model: --model sonnet (or haiku, opus, or a full model id)",
  );
  process.exit(2);
}
const casesDir = path.resolve(here, arg("cases", "cases"));
const outDir = path.resolve(here, arg("out", "results"), model);
const pages = arg("pages")?.split(",");
const arms = arg("arms", "screenshots,aria,facts").split(",");
const concurrency = Number(arg("concurrency", "4"));
const limit = Number(arg("limit", "0"));

const TASK =
  "List every visual difference between the two states, one per line, in the form `<element>: <what changed, with the direction or the values>`. If nothing differs, reply with exactly NO DIFFERENCE. Reply with the list only.";

/** What each arm is told. The task is the same; only where to look differs. */
export const PROMPTS = {
  screenshots: `A web page was captured before and after a code change. The screenshots are before.png and after.png in the current directory; read both. ${TASK}`,
  aria: `A web page was captured before and after a code change. Its accessibility snapshots, as a browser tool gives them, are before.aria.yml and after.aria.yml in the current directory; read both. ${TASK}`,
  facts: `A web page was captured before and after a code change. A comparison tool (pixsame snap) already compared the two captures; its output is snap.txt in the current directory; read it. ${TASK}`,
};

const ask = (cwd, prompt) => askClaude({ cwd, prompt, model, read: true });

const jobs = [];
for (const id of fs.readdirSync(casesDir).sort()) {
  if (pages && !pages.includes(id.split("--")[0])) continue;
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
const work = async () => {
  for (let job = todo.shift(); job; job = todo.shift()) {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "pixsame-bench-run-"));
    try {
      fs.cpSync(path.join(casesDir, job.id, job.arm), cwd, { recursive: true });
      let result = await ask(cwd, PROMPTS[job.arm]);
      // one more try: a usage limit or a dropped connection is not an answer
      if (result.error) result = await ask(cwd, PROMPTS[job.arm]);
      if (result.error) {
        failed++;
        console.error(`${job.id} ${job.arm}: ${result.error}`);
        continue;
      }
      fs.mkdirSync(path.dirname(job.file), { recursive: true });
      fs.writeFileSync(job.file, `${JSON.stringify(result, null, 2)}\n`);
      if (++done % 20 === 0) console.log(`${done} done`);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  }
};
await Promise.all(Array.from({ length: concurrency }, work));
console.log(
  `${done} answers saved, ${failed} failed. Run it again to retry the failed ones.`,
);
process.exit(failed > 0 ? 1 : 0);
