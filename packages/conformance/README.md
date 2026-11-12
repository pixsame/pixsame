# @pixsame/conformance

Private suite that drives the **real** Cypress and Playwright adapters through
the same scenarios and checks what ends up on disk and in the run manifest.

It lives here, and not in the neutral repo, so it can test pixsame-specific
behavior: the `FRSOURCE_CPVRD_V` baseline marker, the `{platform}` path token,
`updateImages` modes, `createMissingImages`.

## How it works

- `src/server.ts` serves a few static fixture pages; both runners load the same
  markup, so a difference in the output can only come from an adapter.
- Each driver (`src/drivers/`) creates a throw-away project under `.tmp/`
  (git-ignored), writes a generated spec per run, spawns the runner and
  returns what it left behind: the baseline, `.actual` and `.diff` files and
  the manifest entries of that run.
- `src/scenarios.ts` is the scenario table. A run lists a fixture, options, an
  optional `before` hook that changes the workspace (e.g. strips the marker)
  and the expected outcome. A scenario without `runners` applies to both
  runners.
- `src/conformance.test.ts` runs every scenario per runner, then checks that
  both runners tell the same story (manifest status and reason per run).

## Running

```bash
pnpm build                                   # the adapters are used from dist
pnpm --filter @pixsame/conformance test:conformance
```

Needs the Cypress binary and a Playwright Chromium
(`pnpm --filter @pixsame/conformance exec playwright install chromium`).
A full run takes about two minutes; CI runs it as its own `conformance` job,
only when an adapter, this package or the install setup changes.

Cypress runs with Batch Review Mode off here (it defers failure messages to an
end-of-spec summary); Batch Review itself is Cypress-only and gets its own
scenarios when it needs coverage.

## Adding a runner

Implement `Driver` (`create` a workspace, `run` a scenario run and return an
`Observed`), add it to `drivers` in `conformance.test.ts`.
