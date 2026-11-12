---
name: site-translations
description: Translate or update the pixsame website translations (pl, de, zh, zh-tw) - UI strings in apps/website/i18n/locales, docs in apps/website/content/docs/<locale>, and the plugin README translations. Use whenever English UI strings, English docs, or the plugin README slice change, when adding a page or locale, when `translations:lint` or `readme:check` fails, or when asked to improve translation quality.
---

# Site translations

Pipeline: **draft (you) -> independent review (DeepL / Gemini) -> revise -> lint -> human sign-off.**
Inputs that every run must read first: `apps/website/i18n/STYLE.md` (register and rules) and
`apps/website/i18n/glossary.json` (terminology, do-not-translate list).

## Surfaces

| Surface       | English source                                                                                   | Translation                                          | Frontmatter / flag                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| UI strings    | `i18n/locales/en.json`                                                                           | `i18n/locales/<locale>.json`                         | `meta.reviewed: false`                                                                |
| Docs          | `content/docs/en/**.md`                                                                          | `content/docs/<locale>/**.md` (same path)            | `reviewed: false`, same keys as English                                               |
| Plugin README | slice of `packages/cypress-plugin-visual-regression-diff/README.md` (`scripts/slice-readme.mjs`) | `packages/.../docs/README-<pl\|de\|zh-CN\|zh-TW>.md` | `reviewed: false`, `source:` = hash printed by `node scripts/readme-translations.mjs` |

Locale codes: `pl`, `de`, `zh` (Simplified, zh-CN), `zh-tw` (Traditional, Taiwan). Run everything from `apps/website`.

## Workflow

1. **Find what changed.** `git diff` of the English source against the commit the translation was last made from. Only
   translate the differences; keep the existing wording and terminology of untouched sentences. Do not retranslate
   whole files unless asked.
2. **Draft one locale per agent, in parallel** (one subagent each for pl, de, zh, zh-tw), each given: STYLE.md, the
   glossary, the English diff, the current translated file, and a reminder that zh-tw is translated from English, not
   converted from zh. Do not let one agent write two Chinese variants.
3. **Lint (hard gate).** `pnpm --filter @pixsame/website translations:lint`. Errors must be zero: they mean a code
   block, inline code span, placeholder, link target, heading or key was changed, dropped or added. Fix the translation;
   never edit the linter to make it pass. Warnings (glossary, Sie/impersonal register, English left in zh) should be
   resolved or consciously accepted.
4. **Independent review** (needs a free key in the environment; skip and say so if none is set):
   - pl, de: `DEEPL_API_KEY=... pnpm --filter @pixsame/website translations:review --locale=pl` - DeepL translates the
     English with the glossary; paragraphs where ours diverges strongly are listed in `.translation-review/pl-deepl.md`.
   - zh, zh-tw: `GEMINI_API_KEY=... pnpm --filter @pixsame/website translations:review --locale=zh` - MQM-style critic
     report in `.translation-review/zh-gemini.md`.
     A flagged segment is a pointer, not a verdict: decide per item whether the draft or the reference is better, and
     apply only fixes you can justify (meaning, terminology, register). Do not adopt the reference wholesale: it ignores the
     style guide's choices.
5. **Re-lint**, then for README translations set `source:` to the current hash, and verify
   `pnpm --filter @pixsame/website readme:check` and `pnpm --filter @pixsame/website build`.
6. **Keep `reviewed: false`.** Only a native speaker flips it (and `meta.reviewed` in the JSON). Never set it yourself.
7. Commit the English change and all four translations together so no commit leaves CI red.

## Rules that are easy to break

- Code, commands, option names, identifiers and URLs stay identical to English; only prose and `//`, `#` comments are
  translated.
- Headings must match the English count and order (anchor ids are assigned by position, the build fails otherwise).
  In-page links keep the English id (`#reducing-cross-os-rendering-noise`).
- Placeholders keep their exact names and count (`{count}`, `{'@'}`, `@:nav.home`).
- German is Sie only. Polish is impersonal, no "ty" forms. "pixsame" stays Latin in every locale.
- Do not translate a feature that is "coming soon" into wording that says it is available.
- A new term goes into `glossary.json` first, then into the text.

## Don't

- Don't bump `source:` without redoing the text; the hash exists to prove the translation was redone.
- Don't split README edits and translation updates into separate PRs.
- Don't relax `translation-lint.mjs` or `readme-translations.mjs` to get green.
- Don't paste unpublished or private content into DeepL or Gemini free tiers (their free inputs can be used for
  product improvement). Site copy and public docs are fine.
