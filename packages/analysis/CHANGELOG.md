# Changelog

## 0.1.0 (2026-11-25)


### Features

* **analysis:** say when two screenshots come from different systems, and snapshot large pages faster ([#482](https://github.com/pixsame/pixsame/issues/482)) ([3a82887](https://github.com/pixsame/pixsame/commit/3a82887cd8f8bf3fb769b395790e3808f3c16fbf))
* **cli:** add the `pixsame` command line, with `pixsame baselines --update` to [give old baselines their layout](https://pixsame.com/docs/getting-started/old-baselines) and `pixsame review` to look at failed comparisons and replace baselines ([25b0fb7](https://github.com/pixsame/pixsame/commit/25b0fb76aa433453ba6132ba928c8dc282ad8122))
* describe moves from a layout snapshot of the page, stored in the baseline PNG. Baselines saved before this have no layout and only get one when replaced: [give old baselines their layout](https://pixsame.com/docs/getting-started/old-baselines) ([25b0fb7](https://github.com/pixsame/pixsame/commit/25b0fb76aa433453ba6132ba928c8dc282ad8122))
* **playwright:** attach failures in the names Playwright's image viewer groups, and a copyable `npx pixsame review` ([25b0fb7](https://github.com/pixsame/pixsame/commit/25b0fb76aa433453ba6132ba928c8dc282ad8122))
* say what changed when a screenshot comparison fails ([#475](https://github.com/pixsame/pixsame/issues/475)) ([15c934b](https://github.com/pixsame/pixsame/commit/15c934ba22f0818b6aa07ec9669bd69e14029ba2))
* tell once per run, and in the UI, when a baseline has no page layout ([how to fix](https://pixsame.com/docs/getting-started/old-baselines)) ([25b0fb7](https://github.com/pixsame/pixsame/commit/25b0fb76aa433453ba6132ba928c8dc282ad8122))


### Bug Fixes

* **analysis:** search retina screenshots for moves at a reduced size ([#481](https://github.com/pixsame/pixsame/issues/481)) ([4e8683b](https://github.com/pixsame/pixsame/commit/4e8683b7152bdf68c825c4bc2636c2e184ed52ab))
