import fs from 'node:fs';
import path from 'node:path';
import metaPng from 'meta-png';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cypressDriver } from './drivers/cypress.js';
import { playwrightDriver } from './drivers/playwright.js';
import { scenarios } from './scenarios.js';
import { startFixtureServer } from './server.js';
import type { Driver, Observed, RunExpectation } from './types.js';
import { removeWorkspace } from './workspace.js';

const { getMetadata } = metaPng;
const MARKER_KEY = 'FRSOURCE_CPVRD_V';

const drivers: Driver[] = [cypressDriver, playwrightDriver];

const hasMarker = (file: string) =>
  getMetadata(new Uint8Array(fs.readFileSync(file)), MARKER_KEY) !== undefined;

const reasonOf = (entry: Observed['entries'][number] | undefined) =>
  (
    entry?.extra as
      { visualRegressionCompare?: { reason?: { code?: string } } } | undefined
  )?.visualRegressionCompare?.reason?.code;

const check = (
  observed: Observed,
  expected: RunExpectation,
  before: Buffer | undefined,
) => {
  expect(
    observed.exitCode === 0 ? 'pass' : 'fail',
    `exit ${observed.exitCode}\n${observed.output}`,
  ).toBe(expected.outcome);

  if (expected.status || expected.reason) {
    expect(observed.entries, observed.output).toHaveLength(1);
  }
  const [entry] = observed.entries;
  if (expected.status) expect(entry?.status).toBe(expected.status);
  if (expected.reason) {
    expect([expected.reason].flat(), `reason was ${reasonOf(entry)}`).toContain(
      reasonOf(entry),
    );
  }
  if (expected.message) expect(observed.output).toMatch(expected.message);
  if (expected.analysis) {
    const analysis = (
      entry?.extra as
        | { pixsame?: { analysis?: { label: string; description: string } } }
        | undefined
    )?.pixsame?.analysis;
    expect(analysis?.label).toBe(expected.analysis.label);
    expect(analysis?.description).toMatch(expected.analysis.description);
    expect(entry?.message).toContain(analysis?.description);
    expect(observed.output).toMatch(expected.analysis.description);
  }

  for (const kind of ['baseline', 'actual', 'diff'] as const) {
    const want = expected.files?.[kind];
    if (want !== undefined) {
      expect(!!observed.files[kind], `${kind} file`).toBe(want);
    }
  }
  const baseline = observed.files.baseline;
  if (expected.baselineMarked !== undefined) {
    expect(baseline && hasMarker(baseline), 'baseline marker').toBe(
      expected.baselineMarked,
    );
  }
  if (expected.baselineUnchanged && baseline && before) {
    expect(fs.readFileSync(baseline).equals(before), 'baseline bytes').toBe(
      true,
    );
  }
  if (expected.baselineInPlatformDir) {
    expect(baseline?.split(path.sep)).toContain(observed.platformToken);
  }
};

let baseUrl = '';
let closeServer = async () => undefined as void;
// scenario name -> runner -> one summary per run, for the equivalence check
const summaries = new Map<string, Map<string, string[]>>();

beforeAll(async () => {
  const server = await startFixtureServer();
  baseUrl = server.baseUrl;
  closeServer = server.close;
});
afterAll(async () => closeServer());

for (const driver of drivers) {
  describe(driver.name, () => {
    for (const scenario of scenarios) {
      if (scenario.runners && !scenario.runners.includes(driver.name)) continue;

      it(scenario.name, async () => {
        const ws = await driver.create(baseUrl);
        const runSummaries: string[] = [];
        try {
          for (const run of scenario.runs) {
            await run.before?.(ws);
            const existing = ws.baseline();
            const before = existing ? fs.readFileSync(existing) : undefined;
            const observed = await driver.run(ws, {
              fixture: run.fixture,
              options: run.options ?? {},
              imagesPath: run.imagesPath,
            });
            check(observed, run.expect, before);
            const [entry] = observed.entries;
            runSummaries.push(`${entry?.status}/${reasonOf(entry)}`);
          }
        } finally {
          removeWorkspace(ws);
        }
        const byRunner = summaries.get(scenario.name) ?? new Map();
        byRunner.set(driver.name, runSummaries);
        summaries.set(scenario.name, byRunner);
      });
    }
  });
}

// Both adapters sit on the same compare core: whatever shared scenario they
// run, the manifest must tell the same story (status and reason per run).
describe('runners agree', () => {
  for (const scenario of scenarios) {
    if (scenario.runners && scenario.runners.length < drivers.length) continue;
    it(scenario.name, () => {
      const byRunner = summaries.get(scenario.name);
      expect(byRunner?.size, 'both runners ran').toBe(drivers.length);
      const [first, ...rest] = [...(byRunner?.values() ?? [])];
      for (const other of rest) expect(other).toEqual(first);
    });
  }
});
