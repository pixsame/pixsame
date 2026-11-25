// Packs the answers of a run into one file, and unpacks them again.
//
// `run.mjs` and `score.mjs` work with one file per case and arm, so that an
// interrupted run can be continued. The repository keeps one `answers.jsonl`
// per run instead: a line per answer, in the order of the cases.
//
//   node pack.mjs --out results-final --model sonnet            # folders -> answers.jsonl
//   node pack.mjs --out results-final --model sonnet --unpack   # answers.jsonl -> folders

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
const model = arg("model");
if (!model) {
  console.error("Give the model whose answers to pack: --model sonnet");
  process.exit(2);
}
const dir = path.resolve(here, arg("out", "results"), model);
const packed = path.join(dir, "answers.jsonl");
const ARMS = ["screenshots", "aria", "facts"];

if (process.argv.includes("--unpack")) {
  const lines = fs.readFileSync(packed, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    const { id, arm, ...result } = JSON.parse(line);
    fs.mkdirSync(path.join(dir, id), { recursive: true });
    fs.writeFileSync(
      path.join(dir, id, `${arm}.json`),
      `${JSON.stringify(result, null, 2)}\n`,
    );
  }
  console.log(`${lines.length} answers unpacked into ${dir}`);
} else {
  const lines = [];
  for (const id of fs.readdirSync(dir).sort()) {
    if (!fs.statSync(path.join(dir, id)).isDirectory()) continue;
    for (const arm of ARMS) {
      const file = path.join(dir, id, `${arm}.json`);
      if (!fs.existsSync(file)) continue;
      lines.push(
        JSON.stringify({ id, arm, ...JSON.parse(fs.readFileSync(file, "utf8")) }),
      );
    }
  }
  fs.writeFileSync(packed, `${lines.join("\n")}\n`);
  console.log(`${lines.length} answers packed into ${packed}`);
}
