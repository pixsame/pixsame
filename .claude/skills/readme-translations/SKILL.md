---
name: readme-translations
description: Keep the translated plugin READMEs (pl, de, zh-CN, zh-TW) in sync with the English README. Use whenever packages/cypress-plugin-visual-regression-diff/README.md is edited (even a one-word or version-number change), when the website CI job fails on "Translated READMEs match the English README", or when `readme:check` reports a stale locale.
---

# Plugin README translations

The website page `/products/cypress-plugin` renders the plugin README. Its translations live in
`packages/cypress-plugin-visual-regression-diff/docs/README-<suffix>.md` (`pl`, `de`, `zh-CN`, `zh-TW`; mapping in
`apps/website/scripts/readme-locales.mjs`). Each one records a fingerprint of the English slice it was made from in its
`source:` frontmatter. CI (`website` job, step "Translated READMEs match the English README") fails when any fingerprint
differs from the current English slice, so **any edit to the English README that changes the slice breaks the PR until the
translations are redone**.

The slice is only the part from `## Getting started` up to `## Migrating from` (see `apps/website/scripts/slice-readme.mjs`).
Edits outside it (badges, intro, migration, maintainer sections) do not change the hash.

## Workflow

1. After editing the plugin README, run from `apps/website`:
   `node scripts/readme-translations.mjs` — it prints each locale as `current` or `stale`, plus the new hash.
   If everything is `current`, you are done.
2. Find what changed in the slice since the translations were made:
   `git log --format=%h -- packages/cypress-plugin-visual-regression-diff/docs` gives the last translation commit; diff the
   README against it (`git diff <that-commit> HEAD -- packages/cypress-plugin-visual-regression-diff/README.md`).
3. Apply **only the differences** to every stale translation, keeping its existing wording and terminology. Do not
   retranslate from scratch. For several locales, run one parallel agent per locale.
4. Rules for every translation:
   - Keep the frontmatter: `reviewed: false` stays (a native speaker flips it), set `source:` to the hash the script prints.
   - Code blocks, commands, option names, identifiers and URLs stay identical to English. Translate prose and `//` comments,
     as the existing files do.
   - Headings must match the English slice in count and order (`grep -cE '^#{2,3} ' <file>`); `nuxt.config.ts` assigns the
     English heading ids by position and the build fails on a mismatch. Links to in-page anchors keep the English id
     (e.g. `#reducing-cross-os-rendering-noise`).
5. Verify: `pnpm --filter @pixsame/website readme:check` exits 0, then `pnpm --filter @pixsame/website build` passes.
6. Commit the README change and the four translations together, so no commit leaves the check red.

## Don't

- Don't just bump `source:` without updating the text: the hash exists to prove the translation was redone.
- Don't merge README edits and translation updates in separate PRs.
- Don't change `readme-translations.mjs` to relax the check.
