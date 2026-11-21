# Changelog

## 0.1.0 (2026-11-21)


### Features

* **cli:** add the `pixsame` command line, with `pixsame baselines --update` to [give old baselines their layout](https://pixsame.com/docs/getting-started/old-baselines) and `pixsame review` to look at failed comparisons and replace baselines ([25b0fb7](https://github.com/pixsame/pixsame/commit/25b0fb76aa433453ba6132ba928c8dc282ad8122))
* describe moves from a layout snapshot of the page, stored in the baseline PNG. Baselines saved before this have no layout and only get one when replaced: [give old baselines their layout](https://pixsame.com/docs/getting-started/old-baselines) ([25b0fb7](https://github.com/pixsame/pixsame/commit/25b0fb76aa433453ba6132ba928c8dc282ad8122))
* **playwright:** attach failures in the names Playwright's image viewer groups, and a copyable `npx pixsame review` ([25b0fb7](https://github.com/pixsame/pixsame/commit/25b0fb76aa433453ba6132ba928c8dc282ad8122))
* tell once per run, and in the UI, when a baseline has no page layout ([how to fix](https://pixsame.com/docs/getting-started/old-baselines)) ([25b0fb7](https://github.com/pixsame/pixsame/commit/25b0fb76aa433453ba6132ba928c8dc282ad8122))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @pixsame/analysis bumped to 0.1.0
