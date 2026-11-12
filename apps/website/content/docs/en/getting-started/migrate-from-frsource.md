---
title: Migrate from @frsource
description: Move from @frsource/cypress-plugin-visual-regression-diff to @pixsame/cypress-plugin-visual-regression-diff in one step.
order: 3
---

# Migrate from @frsource

## Why the package moved

The plugin started life as `@frsource/cypress-plugin-visual-regression-diff`. It's now in the [pixsame](https://github.com/pixsame) organization, next to the manifest format and the other tools, and is published as `@pixsame/cypress-plugin-visual-regression-diff`. The old name is frozen. No more releases go there, so fixes only reach you once you switch.

## What actually changes

The name. `@pixsame` 1.0.0 is the exact code of `@frsource` 4.3.0 with a different label on the box. Baseline images, configuration, every `cy.*` command: all untouched.

## Use the migrate command

The last `@frsource` releases ship a command that does the rename for you. It walks every `package.json` below the current directory and swaps the dependency, rewrites imports and type references in your config and support files, then reinstalls with whichever package manager it finds:

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

Before it writes anything it prints the files it's about to touch and waits for a yes.

| Flag           | What it does                          |
| -------------- | ------------------------------------- |
| `--dry-run`    | Only list the files that would change |
| `--yes`        | Skip the question (required in CI)    |
| `--no-install` | Skip the install step                 |

## Prefer to do it by hand?

Two steps. Swap the package, then search and replace the name in your imports:

```bash
npm uninstall @frsource/cypress-plugin-visual-regression-diff
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff
```

```diff
-import '@frsource/cypress-plugin-visual-regression-diff';
+import '@pixsame/cypress-plugin-visual-regression-diff';
-import { initPlugin } from '@frsource/cypress-plugin-visual-regression-diff/plugins';
+import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
```

One spot people miss: if the package is listed in `compilerOptions.types` of a `tsconfig.json`, rename it there too, or `tsc` will complain about a type definition it can't find.
