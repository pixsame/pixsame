---
title: Manifest schema
description: The runner-agnostic run manifest that pixsame tools read and write. The specification lives on visual-regression.dev.
order: 2
---

# Manifest schema

The manifest is a JSON file that records every screenshot comparison a test run made: what was compared, against which baseline, and how it went. The test tool writes it. Everything after that, a PR comment bot, a review dashboard, an approval tool, reads the file instead of having to understand the runner.

The format is deliberately not a pixsame thing. It's open, not tied to pixsame or to any runner, and lives at [visual-regression.dev/manifest](https://visual-regression.dev/manifest) in the [visual-regression](https://github.com/visual-regression/visual-regression) repository, together with the field reference, converters for other runners and a viewer. On npm, [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) has the JSON Schema, the types, and a reader, writer and merger.

Every pixsame tool reads and writes it. The GitHub App and the hosted platform will take a manifest from any runner that produces one, ours or somebody else's.
