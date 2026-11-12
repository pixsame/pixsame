# Translation style guide

Input to every translation run (Claude agents, DeepL/Gemini review) and to `scripts/translation-lint.mjs`.
Terminology lives in `glossary.json`; this file is the register and the rules. Change either one deliberately,
then re-run `pnpm --filter @pixsame/website translations:lint`.

## All locales

- Source language is English. Translate from English directly, never from another translation.
- Audience: developers and QA engineers evaluating a developer tool. Plain, precise, no marketing fluff added.
- **Never translate**: `pixsame`, Cypress, Playwright, Vitest, GitHub, "Pull Request" (see `doNotTranslate`), option
  names, function names, file paths, CLI commands, URLs, anything in code fences or inline code.
- Placeholders (`{count}`, `{'@'}`, `@:nav.home`) are copied exactly. They may move within the sentence.
- Code blocks are copied exactly. Only full-line and trailing `//` and `#` comments are translated.
- Headings keep the same count and order as English (the site assigns anchor ids by position).
- Keep the meaning, not the sentence structure: split or merge sentences when the language wants it, but never
  drop or add a claim. "Coming soon" stays "coming soon" (a feature is never presented as shipped).
- Use the glossary term every time; do not alternate between synonyms.

## pl (Polish): neutral / impersonal

- No direct address: avoid _ty_, _twój_, _możesz_, _musisz_, _masz_. Prefer impersonal and nominal forms:
  "Plugin można zainstalować...", "Należy dodać...", "Wymagany jest...", headings as nouns ("Instalacja",
  "Dodawanie pakietu") rather than imperatives.
- "baseline" and "diff" are widely used Polish developer loanwords; the glossary accepts _wzorzec_ and _różnice_
  too, but pick one per page and stay with it.
- Cypress/Playwright in running text are not inflected with apostrophes; keep the product name intact.

## de (German): Sie

- Formal address everywhere: _Sie_, _Ihr_, _Ihnen_. Never _du_, _dein_, _dir_, _dich_.
- Established English terms stay (Baseline, Diff, Snapshot, Runner, Manifest, Screenshot); compound them with hyphens
  when needed ("Baseline-Freigabe", "Diff-Analyse").
- Gender-neutral wording where it costs nothing; no gender asterisks or colons in UI strings.

## zh (Simplified Chinese, zh-CN)

- Mainland terminology: 软件, 服务器, 默认, 仓库, 基线, 差异, 阈值, 截图, 快照, 清单, 运行器.
- Full-width punctuation in Chinese sentences, half-width inside code and between Latin tokens.
- A space between Latin/number tokens and Chinese characters.
- "pixsame" stays Latin. No transliteration.

## zh-tw (Traditional Chinese, Taiwan)

- Translate from English, **not** by converting zh-CN. Taiwan terminology: 軟體, 伺服器, 預設, 儲存庫, 基準,
  差異, 門檻, 截圖, 快照, 清單, 迴歸 (not 回歸), 程式碼, 外掛.
- Quotation marks 「」 in prose. Same spacing rule between Latin and Chinese as zh.
- "pixsame" stays Latin. No transliteration.
