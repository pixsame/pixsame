#!/usr/bin/env node
/**
 * Records a GIF demonstrating Batch Review Mode.
 *
 * The GIF is composed of two panes stacked vertically, mimicking a real screen
 * recording (Cypress runner on top, code editor below) with a visible,
 * animated mouse cursor so the viewer can follow what is being clicked:
 *
 *   1. Creates baseline snapshots for the current component state (headless)
 *   2. Opens Cypress in Chrome, runs the spec once (all green)
 *   3. Opens a Monaco-based editor pane (headless Chrome) showing the component
 *   4. Records: types a style change in the editor → reruns the spec →
 *      2 diffs are deferred (badge) → opens the review carousel → hovers the
 *      diffs → replaces both baselines → reruns → all green
 *   5. Stacks the two panes with ffmpeg and encodes a GIF
 *   6. Restores the component and the original snapshots
 *
 * Usage (from the repository root):
 *   pnpm record-demo
 *
 * Requires: pnpm install && pnpm build (cypress, playwright + ffmpeg-static must be in the root devDependencies).
 * Playwright drives the Chrome that Cypress launches (via CDP) and launches the
 * installed Google Chrome headlessly for the editor pane — no browser download
 * is needed.
 */

import { chromium } from 'playwright';
import { spawn, execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const EXAMPLE_DIR = path.join(ROOT_DIR, 'examples', 'next');
const DEMO_CONFIG = path.join(__dirname, 'cypress.demo.config.ts');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const FRAMES_DIR = path.join(__dirname, '.frames');
const PALETTE_PATH = path.join(__dirname, '.palette.png');

const ABOUT_COMPONENT = path.join(EXAMPLE_DIR, 'components', 'about-component.tsx');
const SNAPSHOTS_DIR = path.join(EXAMPLE_DIR, 'cypress', 'e2e', '__image_snapshots__');
const SNAPSHOTS_BAK_DIR = path.join(EXAMPLE_DIR, 'cypress', 'e2e', '__image_snapshots__bak');

const CYPRESS_PORT = 12345;
const CAPTURE_INTERVAL_MS = 110;
const OUTPUT_GIF = path.join(ASSETS_DIR, 'batch-review-mode.gif');
const GIF_WIDTH = 1200;

const RUNNER_VIEWPORT = { width: 1440, height: 800 };
const EDITOR_VIEWPORT = { width: 1440, height: 440 };

const FAB_SEL = '.cp-visual-regression-diff-fab';
const FAB_BADGE_SEL = '.cp-visual-regression-diff-fab-badge';
const CAROUSEL_SEL = '.cp-visual-regression-diff-carousel';
const RERUN_SEL = 'button[aria-label="Rerun all tests"], button.restart';

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[demo] ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function killAll(processes) {
  for (const proc of processes) {
    // Processes are spawned detached so the whole group (pnpm → next,
    // cypress CLI → Cypress.app) can be terminated at once.
    try { process.kill(-proc.pid, 'SIGTERM'); } catch {}
    try { proc.kill('SIGTERM'); } catch {}
  }
}

async function waitForUrl(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

function spawnProc(cmd, args, opts = {}) {
  const proc = spawn(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    detached: true,
    ...opts,
  });
  proc.stdout.on('data', d => process.stdout.write(d));
  proc.stderr.on('data', d => process.stderr.write(d));
  return proc;
}

// Discover the CDP port that Cypress assigned to Chrome by reading it from the
// running Chrome process's command-line args. Cypress always adds
// --remote-debugging-port=<N> itself; we just need to find N.
async function findChromeCdpPort(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const out = execSync(
        "ps aux | grep 'Google Chrome' | grep -- '--remote-debugging-port=' | grep -v grep",
        { encoding: 'utf8' },
      );
      const match = out.match(/--remote-debugging-port=(\d+)/);
      if (match) {
        const port = parseInt(match[1], 10);
        try {
          const res = await fetch(`http://localhost:${port}/json/version`, {
            signal: AbortSignal.timeout(500),
          });
          if (res.ok) return port;
        } catch {}
      }
    } catch {}
    await sleep(500);
  }
  throw new Error('Timed out waiting for Chrome CDP port');
}

// ─── Component modification ──────────────────────────────────────────────────

const ORIGINAL_COMPONENT = fs.readFileSync(ABOUT_COMPONENT, 'utf8');

const H1_ORIGINAL = '<h1>About Page</h1>';
// Typed character-by-character in the editor pane, then written to disk.
// The change must be big enough for BOTH tests to exceed the 1% diff threshold,
// including the full-page one where the heading covers only a small area.
const H1_ATTRIBUTE = " style={{ color: '#fff', background: '#0070f3', padding: '12px 32px', borderRadius: 8 }}";
const MODIFIED_COMPONENT = ORIGINAL_COMPONENT.replace(
  H1_ORIGINAL,
  `<h1${H1_ATTRIBUTE}>About Page</h1>`,
);

if (ORIGINAL_COMPONENT === MODIFIED_COMPONENT) {
  throw new Error(
    'Could not find the expected h1 in about-component.tsx. ' +
    'The component may have been changed. Please update the modification in this script.',
  );
}

const H1_LINE_INDEX = ORIGINAL_COMPONENT.split('\n').findIndex(l => l.includes(H1_ORIGINAL));
const H1_LINE = H1_LINE_INDEX + 1; // Monaco line numbers are 1-based
const H1_COLUMN = ORIGINAL_COMPONENT.split('\n')[H1_LINE_INDEX].indexOf('<h1') + '<h1'.length + 1;

// ─── Fake cursor (injected into both panes) ──────────────────────────────────

const CURSOR_SCRIPT = `(() => {
  if (window.__demoCursor) return;
  const el = document.createElement('div');
  el.id = '__demo-cursor';
  el.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:26px;height:26px;display:none;transform:translate(-4px,-2px);filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.55))';
  el.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 15 L11.5 21.5 L14.2 20.3 L11.2 14.2 L17 14 Z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const style = document.createElement('style');
  style.textContent = '@keyframes __demo-ripple{0%{transform:translate(-50%,-50%) scale(.25);opacity:.85}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}.__demo-ripple{position:fixed;z-index:2147483646;pointer-events:none;width:46px;height:46px;border-radius:50%;background:rgba(255,196,0,.5);border:2px solid rgba(255,150,0,.95);animation:__demo-ripple .55s ease-out forwards}';
  document.documentElement.appendChild(style);
  document.documentElement.appendChild(el);
  window.__demoCursor = {
    show() { el.style.display = 'block'; },
    hide() { el.style.display = 'none'; },
    move(x, y) { el.style.left = x + 'px'; el.style.top = y + 'px'; },
    click(x, y) {
      const r = document.createElement('div');
      r.className = '__demo-ripple';
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      document.documentElement.appendChild(r);
      setTimeout(() => r.remove(), 700);
    },
  };
})();`;

const easeInOut = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/**
 * A single virtual mouse cursor that can travel between panes (Playwright
 * pages). Position is tracked in the pane's own coordinates; when switching
 * panes the cursor exits through the shared edge and enters the other pane.
 */
class Cursor {
  constructor() {
    this.pane = null;
    this.x = 0;
    this.y = 0;
  }

  async ensure(pane) {
    await pane.page.evaluate(CURSOR_SCRIPT);
  }

  async place(pane, x, y) {
    this.pane = pane;
    this.x = x;
    this.y = y;
    await this.ensure(pane);
    await pane.page.mouse.move(x, y);
    await pane.page.evaluate(([x, y]) => { window.__demoCursor.move(x, y); window.__demoCursor.show(); }, [x, y]);
  }

  async show() {
    await this.ensure(this.pane);
    await this.pane.page.evaluate(([x, y]) => { window.__demoCursor.move(x, y); window.__demoCursor.show(); }, [this.x, this.y]);
  }

  async hide() {
    await this.ensure(this.pane);
    await this.pane.page.evaluate(() => window.__demoCursor.hide());
  }

  async moveTo(pane, x, y, duration = 700) {
    if (this.pane !== pane) {
      const from = this.pane;
      // Exit the current pane through the edge shared with the target pane.
      if (from) {
        const exitY = from.name === 'runner' ? from.page.viewportSize().height : 0;
        await this.moveTo(from, this.x, exitY, Math.round(duration * 0.4));
        await this.hide();
      }
      const enterY = pane.name === 'runner' ? pane.page.viewportSize().height : 0;
      await this.place(pane, this.x, enterY);
      duration = Math.round(duration * (from ? 0.6 : 1));
    }
    const steps = Math.max(2, Math.round(duration / 40));
    const sx = this.x;
    const sy = this.y;
    for (let i = 1; i <= steps; i++) {
      const e = easeInOut(i / steps);
      const cx = sx + (x - sx) * e;
      const cy = sy + (y - sy) * e;
      await pane.page.mouse.move(cx, cy);
      await pane.page.evaluate(([x, y]) => window.__demoCursor.move(x, y), [cx, cy]);
      await sleep(40);
    }
    this.x = x;
    this.y = y;
  }

  async moveToElement(pane, locator, duration = 700, offset = { x: 0.5, y: 0.5 }) {
    const box = await locator.boundingBox();
    if (!box) throw new Error('Element to move to is not visible');
    await this.moveTo(pane, box.x + box.width * offset.x, box.y + box.height * offset.y, duration);
  }

  async click() {
    await this.pane.page.evaluate(([x, y]) => window.__demoCursor.click(x, y), [this.x, this.y]);
    await this.pane.page.mouse.down();
    await sleep(90);
    await this.pane.page.mouse.up();
  }
}

// ─── Editor pane (VS Code-like UI around a Monaco editor) ────────────────────

const MONACO_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min';

const editorHtml = source => `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;background:#1e1e1e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
  .titlebar{height:28px;background:#323233;display:flex;align-items:center;justify-content:center;color:#cccccc;font-size:12px;position:relative;letter-spacing:.2px}
  .lights{position:absolute;left:12px;top:8px;display:flex;gap:8px}
  .lights span{width:12px;height:12px;border-radius:50%;display:block}
  .tabs{height:35px;background:#252526;display:flex;align-items:stretch;font-size:13px}
  .tab{display:flex;align-items:center;gap:7px;padding:0 14px 0 12px;background:#1e1e1e;color:#ffffff;border-right:1px solid #252526;border-top:1px solid #0078d4;min-width:190px}
  .tab .dirty{width:9px;height:9px;border-radius:50%;background:#fff;display:none;margin-left:auto}
  .tab.dirty .dirty{display:block}
  .tab .icon{color:#3178c6;font-weight:700;font-size:10px;letter-spacing:.3px}
  .breadcrumbs{height:22px;background:#1e1e1e;color:#a9a9a9;font-size:12px;display:flex;align-items:center;padding:0 18px;gap:6px}
  #editor{position:absolute;top:85px;bottom:22px;left:0;right:0}
  .statusbar{position:absolute;bottom:0;left:0;right:0;height:22px;background:#007acc;color:#fff;font-size:12px;display:flex;align-items:center;padding:0 12px;gap:18px}
</style></head>
<body>
  <div class="titlebar">
    <div class="lights"><span style="background:#ff5f57"></span><span style="background:#febc2e"></span><span style="background:#28c840"></span></div>
    about-component.tsx — next
  </div>
  <div class="tabs"><div class="tab" id="tab"><span class="icon">TSX</span> about-component.tsx <span class="dirty"></span></div></div>
  <div class="breadcrumbs">components&nbsp;›&nbsp;about-component.tsx&nbsp;›&nbsp;AboutComponent</div>
  <div id="editor"></div>
  <div class="statusbar">
    <span>⎇ main</span>
    <span id="pos">Ln 1, Col 1</span>
    <span style="margin-left:auto">TypeScript JSX</span>
  </div>
  <script>window.__SOURCE__ = ${JSON.stringify(source)};</script>
  <script src="${MONACO_BASE}/vs/loader.js"></script>
  <script>
    require.config({ paths: { vs: '${MONACO_BASE}/vs' } });
    window.MonacoEnvironment = {
      getWorkerUrl: () => URL.createObjectURL(new Blob([
        "self.MonacoEnvironment={baseUrl:'${MONACO_BASE}/'};importScripts('${MONACO_BASE}/vs/base/worker/workerMain.js');"
      ], { type: 'text/javascript' })),
    };
    require(['vs/editor/editor.main'], () => {
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
      });
      const model = monaco.editor.createModel(
        window.__SOURCE__,
        'typescript',
        monaco.Uri.parse('file:///components/about-component.tsx'),
      );
      const editor = monaco.editor.create(document.getElementById('editor'), {
        model,
        theme: 'vs-dark',
        fontSize: 15,
        lineHeight: 22,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        autoClosingBrackets: 'never',
        autoClosingQuotes: 'never',
        autoIndent: 'none',
        formatOnType: false,
        parameterHints: { enabled: false },
        hover: { enabled: false },
        occurrencesHighlight: 'off',
        selectionHighlight: false,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        wordWrap: 'off',
      });
      editor.onDidChangeCursorPosition(e => {
        document.getElementById('pos').textContent = 'Ln ' + e.position.lineNumber + ', Col ' + e.position.column;
      });
      window.__demo = {
        positionToPixels(lineNumber, column) {
          const p = editor.getScrolledVisiblePosition({ lineNumber, column });
          const r = document.getElementById('editor').getBoundingClientRect();
          return { x: r.left + p.left, y: r.top + p.top + p.height / 2 };
        },
        setPosition(lineNumber, column) {
          editor.setPosition({ lineNumber, column });
          editor.focus();
        },
        typeText(text) {
          const pos = editor.getPosition();
          editor.executeEdits('demo', [{
            range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
            text,
            forceMoveMarkers: true,
          }]);
          editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column + text.length });
          document.getElementById('tab').classList.add('dirty');
        },
        save() { document.getElementById('tab').classList.remove('dirty'); },
        getValue() { return editor.getValue(); },
      };
      window.__ready = true;
    });
  </script>
</body></html>`;

// ─── Cypress runner helpers ──────────────────────────────────────────────────

const REPORTER_FINISHED_SEL = '.reporter .test.runnable-passed, .reporter .test.runnable-failed';

async function getBadgeText(page) {
  return page.evaluate(sel => {
    const badge = document.querySelector(sel);
    return badge && badge.style.display !== 'none' ? badge.textContent.trim() : '';
  }, FAB_BADGE_SEL);
}

/**
 * Waits until the spec run finished: the FAB is not marked as running and the
 * reporter shows the expected number of finished tests. When `expectedBadge`
 * is a string, additionally waits for the FAB badge to show exactly that text
 * ('' = hidden). Resolves with the badge text.
 */
async function waitForRunFinished(page, { expectedTests, expectedBadge = null, timeout = 120_000 }) {
  await page.waitForFunction(
    ({ FAB_SEL, FAB_BADGE_SEL, REPORTER_FINISHED_SEL, expectedTests, expectedBadge }) => {
      const fab = document.querySelector(FAB_SEL);
      if (!fab || fab.hasAttribute('data-running')) return false;
      if (document.querySelectorAll(REPORTER_FINISHED_SEL).length < expectedTests) return false;
      if (expectedBadge === null) return true;
      const badge = document.querySelector(FAB_BADGE_SEL);
      const badgeText = badge && badge.style.display !== 'none' ? badge.textContent.trim() : '';
      return badgeText === expectedBadge;
    },
    { FAB_SEL, FAB_BADGE_SEL, REPORTER_FINISHED_SEL, expectedTests, expectedBadge },
    { timeout },
  );
  return getBadgeText(page);
}

/** Waits until the reporter has been reset for a new run (or a test is running). */
async function waitForRunStarted(page, { expectedTests, timeout = 30_000 }) {
  await page.waitForFunction(
    ({ FAB_SEL, REPORTER_FINISHED_SEL, expectedTests }) => {
      const fab = document.querySelector(FAB_SEL);
      if (fab && fab.hasAttribute('data-running')) return true;
      return document.querySelectorAll(REPORTER_FINISHED_SEL).length < expectedTests;
    },
    { FAB_SEL, REPORTER_FINISHED_SEL, expectedTests },
    { timeout },
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

const processes = [];
let editorBrowser = null;

function restoreWorkspace() {
  try { fs.writeFileSync(ABOUT_COMPONENT, ORIGINAL_COMPONENT, 'utf8'); } catch {}
  try {
    if (fs.existsSync(SNAPSHOTS_BAK_DIR)) {
      fs.rmSync(SNAPSHOTS_DIR, { recursive: true, force: true });
      fs.renameSync(SNAPSHOTS_BAK_DIR, SNAPSHOTS_DIR);
    }
  } catch {}
}

async function shutdown() {
  try { await editorBrowser?.close(); } catch {}
  killAll(processes);
  // The Cypress desktop app outlives its CLI's process group — stop it explicitly.
  try { execSync(`pkill -f 'Cypress.app/Contents/MacOS/Cypress.*--config-file ${DEMO_CONFIG}'`); } catch {}
}

async function main() {
  // ── 0. Setup ────────────────────────────────────────────────────────────
  log('Setting up directories…');
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  // Backup existing demo snapshots so we can restore later
  if (fs.existsSync(SNAPSHOTS_DIR)) {
    log('Backing up existing demo snapshots…');
    fs.rmSync(SNAPSHOTS_BAK_DIR, { recursive: true, force: true });
    fs.cpSync(SNAPSHOTS_DIR, SNAPSHOTS_BAK_DIR, { recursive: true });
    fs.rmSync(SNAPSHOTS_DIR, { recursive: true, force: true });
  }

  // ── 1. Start Next.js dev server ─────────────────────────────────────────
  log('Starting Next.js dev server…');
  processes.push(spawnProc('pnpm', ['dev'], { cwd: EXAMPLE_DIR }));
  await waitForUrl('http://localhost:3000', 60_000);
  log('Next.js ready.');

  // ── 2. Create baseline snapshots (headless, no recording) ───────────────
  log('Creating baseline snapshots (this runs tests headlessly)…');
  execSync(
    [
      './node_modules/.bin/cypress run',
      '--headless',
      '--browser chrome',
      `--config-file ${DEMO_CONFIG}`,
      '--expose pluginVisualRegressionUpdateImages=true',
    ].join(' '),
    { cwd: EXAMPLE_DIR, stdio: 'inherit' },
  );
  log('Baselines created.');

  // ── 3. Open Cypress in Chrome ────────────────────────────────────────────
  log(`Starting Cypress with batch review mode (Cypress port ${CYPRESS_PORT})…`);
  processes.push(spawnProc(
    './node_modules/.bin/cypress',
    ['open', '--browser', 'chrome', '--port', String(CYPRESS_PORT), '--config-file', DEMO_CONFIG, '--e2e'],
    { cwd: EXAMPLE_DIR },
  ));
  await waitForUrl(`http://localhost:${CYPRESS_PORT}`, 60_000);
  log('Cypress server ready.');

  log('Waiting for Chrome CDP port (discovering from process args)…');
  const cdpPort = await findChromeCdpPort(30_000);
  log(`Chrome CDP ready on port ${cdpPort}. Connecting Playwright…`);
  await sleep(3000);

  const runnerBrowser = await chromium.connectOverCDP(`http://localhost:${cdpPort}`);
  let runnerPage;
  for (const ctx of runnerBrowser.contexts()) {
    for (const p of ctx.pages()) {
      if (p.url().includes('/__/')) { runnerPage = p; break; }
    }
    if (runnerPage) break;
  }
  runnerPage ??= runnerBrowser.contexts()[0]?.pages()[0];
  if (!runnerPage) throw new Error('Could not find the Cypress runner page.');
  log(`Connected to page: ${runnerPage.url()}`);
  await runnerPage.setViewportSize(RUNNER_VIEWPORT);

  // ── 4. First (green) run — not recorded ──────────────────────────────────
  log('Opening spec list…');
  await runnerPage.goto(`http://localhost:${CYPRESS_PORT}/__/#/specs`);
  await runnerPage.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await sleep(1500);
  try {
    const e2eBtn = runnerPage.getByText('E2E Testing').first();
    if (await e2eBtn.isVisible({ timeout: 2000 })) {
      log('Launchpad detected — clicking E2E Testing…');
      await e2eBtn.click();
      await sleep(2000);
    }
  } catch {}

  log('Running app.cy.ts once so the recording starts from a green run…');
  try {
    await runnerPage.getByText('app.cy.ts').first().click({ timeout: 15_000 });
  } catch {
    await runnerPage.goto(`http://localhost:${CYPRESS_PORT}/__/#/specs/runner?file=cypress/e2e/app.cy.ts`);
  }
  let initialBadge = await waitForRunFinished(runnerPage, { expectedTests: 2 });
  if (initialBadge) {
    // Screenshots taken by the headed browser can differ slightly from the
    // headless baselines. Accept the headed ones through the review UI so the
    // recording starts from a genuinely green run.
    log(`Headed run reported ${initialBadge} diff(s) against headless baselines — accepting headed screenshots as baselines…`);
    await runnerPage.locator(FAB_SEL).click();
    await runnerPage.waitForSelector(CAROUSEL_SEL, { timeout: 15_000 });
    for (let i = 0; i < 10; i++) {
      const btn = runnerPage.locator(`${CAROUSEL_SEL} [data-type="replace"]`);
      if (!(await btn.isVisible().catch(() => false))) break;
      await btn.click();
      await sleep(700);
    }
    await runnerPage.waitForSelector(CAROUSEL_SEL, { state: 'hidden', timeout: 15_000 }).catch(() => {});
    await sleep(1000);
    await runnerPage.locator(RERUN_SEL).first().click();
    await waitForRunStarted(runnerPage, { expectedTests: 2 });
    initialBadge = await waitForRunFinished(runnerPage, { expectedTests: 2, expectedBadge: '' });
  }
  log('Initial run finished (green).');
  // Make sure the FAB shows the plugin logo (not a leftover success check) when recording starts
  await runnerPage.evaluate(sel => document.querySelector(sel)?.removeAttribute('data-success'), FAB_SEL);

  // ── 5. Editor pane ──────────────────────────────────────────────────────
  log('Launching editor pane (headless Chrome + Monaco)…');
  editorBrowser = await chromium.launch({ channel: 'chrome', headless: true });
  const editorPage = await editorBrowser.newPage({ viewport: EDITOR_VIEWPORT, deviceScaleFactor: 1 });
  await editorPage.setContent(editorHtml(ORIGINAL_COMPONENT), { waitUntil: 'load' });
  await editorPage.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });
  await sleep(1500); // let Monaco finish tokenizing/colorizing
  log('Editor ready.');

  const runner = { name: 'runner', page: runnerPage };
  const editor = { name: 'editor', page: editorPage };
  const cursor = new Cursor();
  runnerPage.on('load', () => runnerPage.evaluate(CURSOR_SCRIPT).catch(() => {}));

  // ── 6. Start frame capture ───────────────────────────────────────────────
  let frameIndex = 0;
  let capturing = true;
  const timestamps = [];
  const frameName = i => String(i).padStart(5, '0');

  const captureFrames = async () => {
    while (capturing) {
      const idx = frameIndex;
      const runnerPath = path.join(FRAMES_DIR, `runner_${frameName(idx)}.jpg`);
      const editorPath = path.join(FRAMES_DIR, `editor_${frameName(idx)}.jpg`);
      try {
        await Promise.all([
          runnerPage.screenshot({ path: runnerPath, type: 'jpeg', quality: 90 }),
          editorPage.screenshot({ path: editorPath, type: 'jpeg', quality: 90 }),
        ]);
        timestamps.push(Date.now());
        frameIndex++;
      } catch {
        // Keep the two sequences in lockstep: drop the half-written pair.
        try { fs.unlinkSync(runnerPath); } catch {}
        try { fs.unlinkSync(editorPath); } catch {}
      }
      await sleep(CAPTURE_INTERVAL_MS);
    }
  };

  await cursor.place(runner, 720, 520);
  const capturePromise = captureFrames();
  log('Recording started.');

  // ── 7. Demo flow ─────────────────────────────────────────────────────────

  // 7a. Linger on the green run
  await sleep(1800);

  // 7b. Edit the component in the editor pane: click right after "<h1", type a style attribute
  log('Typing the style change in the editor…');
  const target = await editorPage.evaluate(
    ([l, c]) => window.__demo.positionToPixels(l, c),
    [H1_LINE, H1_COLUMN],
  );
  await cursor.moveTo(editor, target.x, target.y, 1100);
  await cursor.click();
  await editorPage.evaluate(([l, c]) => window.__demo.setPosition(l, c), [H1_LINE, H1_COLUMN]);
  await sleep(400);
  // Move the mouse pointer slightly away so the caret and typed text stay readable
  await cursor.moveTo(editor, target.x + 60, target.y + 48, 350);
  for (const ch of H1_ATTRIBUTE) {
    await editorPage.evaluate(c => window.__demo.typeText(c), ch);
    await sleep(ch === ' ' ? 60 : 28);
  }
  await sleep(700);

  // 7c. Save: apply the change to disk (Next.js hot-reloads the AUT preview)
  log('Saving the component…');
  const typed = await editorPage.evaluate(() => window.__demo.getValue());
  if (typed !== MODIFIED_COMPONENT) {
    log('Warning: editor content differs from the expected modification; writing the expected one.');
  }
  await editorPage.evaluate(() => window.__demo.save());
  fs.writeFileSync(ABOUT_COMPONENT, MODIFIED_COMPONENT, 'utf8');
  await sleep(3500);

  // 7d. Rerun the spec in Cypress
  log('Rerunning the spec…');
  const rerunBtn = runnerPage.locator(RERUN_SEL).first();
  await cursor.moveToElement(runner, rerunBtn, 1000);
  await sleep(250);
  await cursor.click();
  // The cursor is hidden while tests run: Cypress captures the whole browser
  // viewport when taking screenshots and the overlay must not end up in them.
  await cursor.hide();
  await waitForRunStarted(runnerPage, { expectedTests: 2 });

  log('Waiting for both tests to defer their failures (badge "2")…');
  await waitForRunFinished(runnerPage, { expectedTests: 2, expectedBadge: '2' });
  await sleep(1600); // let the after-all error render and the FAB pulse
  log('Badge shows 2 deferred failures.');

  // 7e. Open the review carousel
  await cursor.show();
  await cursor.moveToElement(runner, runnerPage.locator(FAB_SEL), 1100);
  await sleep(900);
  log('Opening the batch review carousel…');
  await cursor.click();
  await runnerPage.waitForSelector(CAROUSEL_SEL, { timeout: 15_000 });
  await sleep(900);

  const hoverTarget = runnerPage.locator(`${CAROUSEL_SEL} [data-carousel-content] [onmouseover]`).first();
  const replaceBtn = runnerPage.locator(`${CAROUSEL_SEL} [data-type="replace"]`);

  // 7f. First diff: hover to compare old vs. new, then replace
  log('Reviewing first image…');
  await cursor.moveToElement(runner, hoverTarget, 900, { x: 0.5, y: 0.45 });
  await sleep(1500);
  await cursor.moveTo(runner, 120, cursor.y, 500);
  await sleep(800);
  await cursor.moveToElement(runner, hoverTarget, 500, { x: 0.5, y: 0.45 });
  await sleep(1100);
  await cursor.moveToElement(runner, replaceBtn, 800);
  await sleep(300);
  await cursor.click();
  await sleep(1200);

  // 7g. Second diff: same, slightly quicker
  log('Reviewing second image…');
  await cursor.moveToElement(runner, hoverTarget, 800, { x: 0.5, y: 0.45 });
  await sleep(1300);
  await cursor.moveTo(runner, 120, cursor.y, 450);
  await sleep(700);
  await cursor.moveToElement(runner, replaceBtn, 800);
  await sleep(300);
  await cursor.click();

  // 7h. Carousel closes after the last image; FAB shows the success check
  await runnerPage.waitForSelector(CAROUSEL_SEL, { state: 'hidden', timeout: 15_000 }).catch(() => {});
  log('Carousel closed.');
  await cursor.moveTo(runner, 1180, 560, 500);
  await sleep(1800);

  // 7i. Rerun: everything passes now
  log('Rerunning the spec to show it passes…');
  await cursor.moveToElement(runner, rerunBtn, 1000);
  await sleep(250);
  await cursor.click();
  await cursor.hide();
  await waitForRunStarted(runnerPage, { expectedTests: 2 });
  await waitForRunFinished(runnerPage, { expectedTests: 2, expectedBadge: '' });
  await sleep(800);
  await cursor.moveTo(runner, cursor.x, cursor.y, 10);
  await cursor.show();
  await cursor.moveTo(runner, 720, 520, 700);
  await sleep(2600);
  log('Demo flow complete!');

  // ── 8. Stop recording ────────────────────────────────────────────────────
  capturing = false;
  await capturePromise;
  log(`Captured ${frameIndex} frame pairs.`);
  if (frameIndex < 10) throw new Error('Too few frames captured.');

  await shutdown();
  await sleep(1000);

  // ── 9. Encode GIF (runner on top, editor below) ──────────────────────────
  const { default: ffmpegStatic } = await import('ffmpeg-static');
  const elapsed = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
  const fps = Math.max(1, Math.min(15, (timestamps.length - 1) / elapsed));
  const framerate = fps.toFixed(3);
  log(`Effective capture rate: ${framerate} fps over ${elapsed.toFixed(1)}s.`);

  const inputs = [
    '-framerate', framerate, '-i', path.join(FRAMES_DIR, 'runner_%05d.jpg'),
    '-framerate', framerate, '-i', path.join(FRAMES_DIR, 'editor_%05d.jpg'),
  ];
  const compose = `[0:v][1:v]vstack=inputs=2:shortest=1,scale=${GIF_WIDTH}:-1:flags=lanczos`;

  log('Generating colour palette…');
  execFileSync(ffmpegStatic, [
    '-y', ...inputs,
    '-filter_complex', `${compose},palettegen=max_colors=200:stats_mode=diff`,
    PALETTE_PATH,
  ], { stdio: 'inherit' });

  log('Encoding GIF…');
  execFileSync(ffmpegStatic, [
    '-y', ...inputs, '-i', PALETTE_PATH,
    '-filter_complex', `${compose}[x];[x][2:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
    '-loop', '0',
    OUTPUT_GIF,
  ], { stdio: 'inherit' });

  log(`GIF saved to: ${OUTPUT_GIF}`);

  // ── 10. Cleanup ──────────────────────────────────────────────────────────
  log('Restoring original about-component.tsx and demo snapshots…');
  restoreWorkspace();

  log('Cleaning up temporary files…');
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  try { fs.unlinkSync(PALETTE_PATH); } catch {}

  log('Done! ✓');
  log(`Output: ${OUTPUT_GIF}`);
}

// ─── Run ────────────────────────────────────────────────────────────────────

const abort = async () => { restoreWorkspace(); await shutdown(); process.exit(1); };
process.on('SIGINT', abort);
process.on('SIGTERM', abort);

main().catch(async err => {
  console.error('[demo] FAILED:', err);
  restoreWorkspace();
  await shutdown();
  process.exit(1);
});
