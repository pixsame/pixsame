// Builds the cases: for every page, one case per kind of change and three
// where nothing changes. A case holds what each arm of the benchmark gets:
//
//   screenshots/  before.png, after.png        (what an agent sees in a screenshot)
//   aria/         before.aria.yml, after.aria.yml (what a browser tool's snapshot gives)
//   facts/        snap.txt                      (what `pixsame snap` prints)
//   truth.json    what was changed, for scoring; never shown to a model
//
// The facts come from the real command, run the way an agent runs it: capture,
// change the page, capture again. Nothing here calls a model.
//
//   node generate.mjs [--set pilot|round1|round2|final] [--pages landing,pricing] [--out cases] [--part 1/3]

import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXTRA, EXTRA2, MUTATIONS as PILOT, rule } from "./mutations.mjs";

const require = createRequire(import.meta.url);
const { run } = require("pixsame");
const { chromium } = require("playwright-core");

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1];
};
// each set has its own pages; a later set also has the kinds of change of the ones before
const SETS = {
  pilot: { pages: "./pages.mjs", kinds: PILOT, out: "cases" },
  round1: { pages: "./pages-round1.mjs", kinds: [...PILOT, ...EXTRA] },
  round2: {
    pages: "./pages-round2.mjs",
    kinds: [...PILOT, ...EXTRA, ...EXTRA2],
  },
  final: {
    pages: "./pages-final.mjs",
    kinds: [...PILOT, ...EXTRA, ...EXTRA2],
  },
};
const setName = arg("set", "pilot");
const set = SETS[setName];
if (!set) {
  console.error(`No set ${setName}; there is ${Object.keys(SETS).join(", ")}`);
  process.exit(2);
}
const { PAGES } = await import(set.pages);
const MUTATIONS = set.kinds;
const out = path.resolve(here, arg("out", set.out ?? `cases-${setName}`));
const only = arg("pages")?.split(",");
const IDENTICAL = 3;
const VIEWPORT = { width: 1280, height: 800 };

let html = "";
const server = http.createServer((_, response) => {
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(html);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://localhost:${server.address().port}/`;

const launch = () =>
  chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const browser = await launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
});
const tab = await context.newPage();

/** `pixsame snap` in `cwd`, as text. */
const snap = async (cwd) => {
  const lines = [];
  // a browser that never answers must not stop the whole run: `again` retries
  let timer;
  const code = await Promise.race([
    run(["snap", url], {
      out: (line) => lines.push(line),
      exec: async () => 0,
      open: () => undefined,
      wait: async () => undefined,
      cwd,
    }),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Timeout: snap did not answer in 90 s")),
        90_000,
      );
    }),
  ]).finally(() => clearTimeout(timer));
  if (code !== 0)
    throw new Error(`snap exited with ${code}: ${lines.join("\n")}`);
  return lines.join("\n");
};

const aria = async () => {
  await tab.goto(url, { waitUntil: "load" });
  return tab.locator("body").ariaSnapshot();
};

const computed = async (selector, properties) => {
  await tab.goto(url, { waitUntil: "load" });
  return tab.evaluate(
    ([sel, props]) => {
      const element = document.querySelector(sel);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        ...Object.fromEntries(props.map((p) => [p, style.getPropertyValue(p)])),
        "(text)": element.textContent.replace(/\s+/g, " ").trim().slice(0, 80),
      };
    },
    [selector, properties],
  );
};

/** Runs `work`, and twice more when the browser was too slow to answer. */
const again = async (work) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      if (attempt === 3 || !/Timeout|timed out/i.test(String(error)))
        throw error;
    }
  }
};

const build = async (id, before, after, truth) => {
  const dir = path.join(out, id);
  fs.rmSync(dir, { recursive: true, force: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "pixsame-bench-"));
  try {
    html = before;
    await snap(work);
    const ariaBefore = await aria();
    html = after;
    const text = await snap(work);
    const ariaAfter = await aria();
    const snaps = path.join(work, ".pixsame", "snaps");
    const [target] = fs
      .readdirSync(snaps, { withFileTypes: true })
      .filter((entry) => entry.isDirectory());
    const shots = path.join(
      snaps,
      target.name,
      `${VIEWPORT.width}x${VIEWPORT.height}`,
    );
    for (const arm of ["screenshots", "aria", "facts"]) {
      fs.mkdirSync(path.join(dir, arm), { recursive: true });
    }
    fs.copyFileSync(
      path.join(shots, "before.png"),
      path.join(dir, "screenshots", "before.png"),
    );
    fs.copyFileSync(
      path.join(shots, "after.png"),
      path.join(dir, "screenshots", "after.png"),
    );
    fs.writeFileSync(
      path.join(dir, "aria", "before.aria.yml"),
      `${ariaBefore}\n`,
    );
    fs.writeFileSync(
      path.join(dir, "aria", "after.aria.yml"),
      `${ariaAfter}\n`,
    );
    // the crops the output points to come along, at the place it names
    const prefix = `${path.relative(work, shots)}${path.sep}`;
    for (const name of fs.readdirSync(shots)) {
      if (!name.startsWith("area-")) continue;
      fs.mkdirSync(path.join(dir, "facts", prefix), { recursive: true });
      fs.copyFileSync(
        path.join(shots, name),
        path.join(dir, "facts", prefix, name),
      );
    }
    // the address is the local server's; an agent would see its dev server's
    fs.writeFileSync(
      path.join(dir, "facts", "snap.txt"),
      `${text.replaceAll(url, "http://localhost:3000/")}\n`,
    );
    fs.writeFileSync(path.join(dir, "before.html"), before);
    fs.writeFileSync(path.join(dir, "after.html"), after);
    fs.writeFileSync(
      path.join(dir, "truth.json"),
      `${JSON.stringify(truth, null, 2)}\n`,
    );
    return text;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
};

const pages = PAGES.filter((page) => !only || only.includes(page.id));
let made = 0;
let silent = 0;
// `--part 1/3` builds every third page, so that several runs can share the work
const [part, parts] = (arg("part") ?? "1/1").split("/").map(Number);
for (const [pageIndex, page] of pages.entries()) {
  if (pageIndex % parts !== part - 1) continue;
  for (const [index, mutation] of MUTATIONS.entries()) {
    const fits = page.targets.filter(
      (target) =>
        mutation.needs === "any" || target.kind.includes(mutation.needs),
    );
    // a different target per kind of change and per page, the same on every run
    const order = fits.map(
      (_, i) => fits[(i + index + pageIndex) % fits.length],
    );
    // a run that was interrupted goes on where it stopped
    if (
      fs.existsSync(path.join(out, `${page.id}--${mutation.id}`, "truth.json"))
    ) {
      made++;
      continue;
    }
    await again(async () => {
      let done = false;
      for (const target of order) {
        html = page.html;
        const styles = await computed(target.selector, mutation.read);
        const declarations = styles && mutation.css(styles);
        if (!declarations) continue;
        const after = page.html.replace(
          "</head>",
          `<style>${rule(target.selector, declarations)}</style></head>`,
        );
        // a change nobody can see is not a case (padding on a box of fixed size, say)
        const shotBefore = await tab.screenshot();
        html = after;
        await tab.goto(url, { waitUntil: "load" });
        if (shotBefore.equals(await tab.screenshot())) continue;
        const says =
          typeof mutation.says === "function"
            ? mutation.says(styles)
            : mutation.says;
        const text = await build(
          `${page.id}--${mutation.id}`,
          page.html,
          after,
          {
            page: page.id,
            changed: true,
            kind: mutation.id,
            selector: target.selector,
            element: target.name,
            text: styles["(text)"],
            css: declarations,
            before: styles,
            what: `${target.name}: ${says}`,
          },
        );
        if (text.includes("no change since")) silent++;
        made++;
        done = true;
        break;
      }
      if (!done) throw new Error(`No target for ${mutation.id} on ${page.id}`);
    });
  }
  for (let i = 1; i <= IDENTICAL; i++) {
    if (
      !fs.existsSync(path.join(out, `${page.id}--identical-${i}`, "truth.json"))
    ) {
      await again(() =>
        build(`${page.id}--identical-${i}`, page.html, page.html, {
          page: page.id,
          changed: false,
          kind: "identical",
          what: "nothing changed",
        }),
      );
    }
    made++;
  }
  console.log(
    `${page.id}: ${MUTATIONS.length} changes, ${IDENTICAL} identical`,
  );
}

await browser.close();
server.closeAllConnections();
server.close();
console.log(
  `${made} cases in ${path.relative(process.cwd(), out)}. ${silent} changed pages gave "no change" from pixsame snap.`,
);
// a snap call that timed out may still hold its browser
process.exit(0);
