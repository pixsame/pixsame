---
title: Manifest schema
description: The runner-agnostic run manifest that every pixsame tool reads and writes.
order: 3
---

# Manifest schema

The manifest is a machine-readable record of every screenshot comparison made during a test run. A visual regression tool writes it, and CI tooling such as PR comment bots, review dashboards and approval tools reads it. It is the contract between a test runner and everything downstream, and it is published as the open standard `@pixsame/manifest`: a JSON Schema, types, a reader, a writer and a merger.

Everything that is specific to the test runner lives under `runner`, so the same file describes a Cypress run and a Playwright run. Consumers must ignore keys they do not know.

## Top-level fields

| Field | Description |
| --- | --- |
| `version` | Format version, currently `1`. Bumped on breaking changes only. |
| `createdAt`, `updatedAt` | ISO 8601 timestamps. The file is rewritten after every comparison, so it is complete even when the run is aborted. |
| `projectRoot` | Absolute path every relative path in the manifest resolves against. |
| `platform` | The machine that ran the tests: `os`, `arch` and optionally `osVersion`. |
| `ci` | CI metadata detected from the environment (`provider`, `repository`, `sha`, `branch`, `pullRequest`, `url` and more), or `null` outside CI. |
| `options` | Global tool options as configured, in the writer's vocabulary. |
| `runner` | What ran the tests. Only `name` is required. |
| `upload` | Where images were uploaded, when an upload service was used. |
| `entries` | One entry per screenshot comparison. |

## Entries

Each entry records the screenshot `name`, the `test` it belongs to, a `status`, the `comparison` result, the paths in `images` and whether the baseline was written.

| Status | Meaning |
| --- | --- |
| `passed` | Within the threshold. |
| `failed` | Above the threshold. The actual and diff images are kept for review. |
| `missing-baseline` | No baseline exists and the tool was told not to create one. |
| `created` | No baseline existed, so the new image became the baseline. |
| `updated` | The baseline was overwritten on request. |
| `approved` | The baseline was replaced from a review UI. |

`failed` and `missing-baseline` are the entries that need a human.

Optional entry fields add context: `platform`, `target`, `variant` (device, theme, locale and so on), `viewport`, `renderer`, and `hashes` with the sha256 of each image.

## Source of truth

The full JSON Schema lives in the [pixsame repository](https://github.com/pixsame/pixsame/tree/main/packages/visual-regression-manifest). This page is a summary.
