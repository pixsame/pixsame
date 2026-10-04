# Changelog

## [4.2.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v4.2.0...@frsource/cypress-plugin-visual-regression-diff-v4.2.1) (2026-10-02)


### Bug Fixes

* Remove stale .diff files once the comparison no longer fails ([#426](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/426)) ([0ea0356](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/0ea0356c7ce47f5a674ee4a3d9ea8e154bb27c09))
* restore screenshot counters correctly on test retry  ([#426](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/426)) ([0ea0356](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/0ea0356c7ce47f5a674ee4a3d9ea8e154bb27c09))
* declare the Node engine as >=20.9 - sharp dependency has required that since 4.0.2 ([#426](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/426)) ([0ea0356](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/0ea0356c7ce47f5a674ee4a3d9ea8e154bb27c09))

## [4.2.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v4.1.1...@frsource/cypress-plugin-visual-regression-diff-v4.2.0) (2026-09-20)


### Features

* add Batch Review Mode (pluginVisualRegressionBatchReviewMode) with batch image review UI ([#374](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/374)) ([7d8e975](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/7d8e97548e3a3771657d82f667d4721f7f51f7de))


### Bug Fixes

* add plugin metadata to .actual.png so approved or renamed baselines are not rewritten ([#404](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/404)) ([5ed7ebe](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/5ed7ebe2c7dddfc394cbfe4e42bbe67ca9cb1b08))
* **deps:** update all non-major dependency bump ([#401](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/401)) ([f442275](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/f442275bd8409b753798abcda259f0fa3cd424b8))
* **deps:** update dependency @frsource/base64 to v1.0.221 ([#386](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/386)) ([3aa16e6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/3aa16e6db761b934c46647229ad45a3571b32749))
* **deps:** update dependency @frsource/base64 to v1.0.223 ([#389](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/389)) ([0ed6003](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/0ed600379711cffc79caaf12095e53c88608b0ba))
* **deps:** update dependency @frsource/base64 to v1.0.226 ([#394](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/394)) ([caa95ff](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/caa95ffdca080ce6d2e78d8d998f04f2a657094e))
* **deps:** update dependency @frsource/base64 to v1.0.228 ([#395](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/395)) ([df44a6f](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/df44a6f8416a1203235767a4f56250a8a2c6bba4))
* **deps:** update dependency @frsource/base64 to v1.0.237 ([#406](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/406)) ([d1029c1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/d1029c1a9f81cec51000d0244bf6d83830aad876))
* **deps:** update dependency sharp to v0.35.4 [security] ([#399](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/399)) ([6ef06d1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/6ef06d137add50bff62e05e34d1a32854d5451dd))

## [4.1.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v4.1.0...@frsource/cypress-plugin-visual-regression-diff-v4.1.1) (2026-07-05)


### Bug Fixes

* **deps:** update dependency sharp to v0.35.3 ([#379](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/379)) ([42a6d12](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/42a6d12b101dc7c3ab120d0d0c86793509c04941))

## [4.1.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v4.0.2...@frsource/cypress-plugin-visual-regression-diff-v4.1.0) (2026-07-02)


### Features

* migrate plugin options from Cypress.env() to Cypress.expose() in preparation for Cypress 16 ([#376](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/376)) ([2b71557](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/2b7155700bcddbbef92c5c42d0e5fe05beb3fa00)), closes [#375](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/375). For migration guide, go to this link: https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/blob/main/packages/cypress-plugin-visual-regression-diff/MIGRATION.md#40x---41x

## [4.0.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v4.0.1...@frsource/cypress-plugin-visual-regression-diff-v4.0.2) (2026-06-28)


### Bug Fixes

* **deps:** update all minor dependency bump ([#256](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/256)) ([a30132c](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/a30132c18ff9d7f08804ca97166dd3383c1185b5))
* **deps:** update all non-major dependency bump ([#356](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/356)) ([a6c31f2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/a6c31f2905be58833c03fcc01b010c23ca3f2265))
* **deps:** update dependency glob to v13 ([#368](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/368)) ([1a40d42](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/1a40d42776324817147906b87870a449cf7aeb76))
* **deps:** update dependency move-file to v4 ([#369](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/369)) ([6fdfbb8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/6fdfbb82bcbb0dbac17a69fdae934ef23d7ccec9))
* **deps:** update dependency pixelmatch to v7 ([#370](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/370)) ([19f0d77](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/19f0d77686171918dbe7c17b6c0afef697da6790))

## [4.0.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v4.0.0...@frsource/cypress-plugin-visual-regression-diff-v4.0.1) (2026-06-26)


### Bug Fixes

* README file ([ee60440](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/ee60440fd594c4f60aade1d541f10ec302829d82))

## [4.0.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v3.3.10...@frsource/cypress-plugin-visual-regression-diff-v4.0.0) (2026-06-26)


### ⚠ BREAKING CHANGES

* Cypress minimum version raised to 13
* Node.js minimum version raised to 14
* Attempt separator changed: space → underscore (resolves [#196](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/196))
The number appended to snapshot filenames on retried attempts is now separated by an underscore instead of a space.

| Before | After |
|---|---|
| `test name #0.png` | `test name_#0.png` |

**Migration:** regenerate your baseline snapshots, or batch-rename existing files:

```bash
# Example rename (macOS/Linux)
find . -name "* #*.png" | while read f; do
  mv "$f" "${f/ #/_#}"
done
```

# `imagesDir` option removed

The `imagesDir` option was deprecated in v3 and has been fully removed. Use `imagesPath` instead.

```diff
- pluginVisualRegressionImagesDir: 'cypress/__image_snapshots__'
+ pluginVisualRegressionImagesPath: 'cypress/__image_snapshots__'
```

For migration, look to the end of release note.

### Features

* next example ([#254](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/254)) ([247a20a](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/247a20ac85d197333a3652ad354319b0fd9501a5))

* `updateImages: 'failures-only'` (resolves [#204](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/204))

A new value for the existing `updateImages` option. When set, baselines are only overwritten when the diff exceeds the configured threshold — unchanged screenshots are left as-is. This is particularly useful for CI jobs that capture screenshots on a reference platform: images that haven't changed are skipped, speeding up the run.

```js
cy.matchImage({ updateImages: 'failures-only' });
// or as a global default in cypress.config.js:
pluginVisualRegressionUpdateImages: 'failures-only'
```

* `processImgPath` task hook (closes [#179](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/179), resolves [#106](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/106))

A new `cypressPluginVisualRegressionDiff:processImgPath` Cypress task is called after every screenshot, giving you full control over where the file ends up. By default it is a no-op, but you can override it in `setupNodeEvents` to integrate with reporters such as [cypress-mochawesome-reporter](https://github.com/LironEr/cypress-mochawesome-reporter):

```js
// cypress.config.js
on('task', {
  'cypressPluginVisualRegressionDiff:processImgPath'({ imgPath }) {
    // return a modified path, or return imgPath unchanged
    return imgPath;
  },
});
```


### Bug Fixes

* "Update screenshot" button now respects `matchAgainstPath` (resolves [#259](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/259), [#282](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/282))
* Auto-cleanup no longer deletes snapshots from the other testing type (fixes [#178](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/178))

### Dependency Upgrades

| Dependency | Old | New | Notes |
|---|---|---|---|
| Cypress (peer) | ≥ 10 | ≥ 13 | |
| sharp | 0.32.x | 0.33.5 | Resolves CVE-2023-4863 (libwebp vulnerability) |
| Node.js (engine) | ≥ 12 | ≥ 14 | Aligned with Cypress 13 |
| Vitest | 1.x | 2.x | Internal — does not affect plugin consumers |

* **deps:** update all non-major dependency bump ([#260](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/260)) ([da9f52c](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/da9f52c77e9a60379d51e73205ff6a314eb093b3))
* **deps:** update all non-major dependency bump ([#268](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/268)) ([4bc8247](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/4bc8247be85176b18aa2cb9cfa819a44692764c8))
* **deps:** update all non-major dependency bump ([#274](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/274)) ([3ff8d88](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/3ff8d88f5d5b4256cce23d0544d114e2c0748526))
* **deps:** update all non-major dependency bump ([#283](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/283)) ([a2d7379](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/a2d737956fa311b84ec6d96b6986108309c0f43d))
* **deps:** update all non-major dependency bump ([#285](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/285)) ([aea122c](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/aea122ceb6232a3c5be6a57edcc962383019d82c))
* **deps:** update all non-major dependency bump ([#297](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/297)) ([6ac55f0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/6ac55f01625aba2b60938492380bbeac4db74bde))
* **deps:** update all non-major dependency bump ([#298](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/298)) ([2181dcf](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/2181dcf6b1f0146d20d72ee9f31f7630d5a19538))
* **deps:** update all non-major dependency bump ([#312](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/312)) ([e265d7b](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/e265d7b73886824e38362c8054a571702c6728bc))
* **deps:** update dependency @frsource/base64 to v1.0.26 ([#288](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/288)) ([36aafcd](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/36aafcd1fac9534981df2069d07c0bc9165afeb2))

### Documentation

New FAQ entries have been added covering:

- **Screenshot size differences between `cypress run` and `cypress open`** ([#294](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/294)) — use `forceDeviceScaleFactor: true` to normalise the device pixel ratio.
- **Composing with other plugins that also register `setupNodeEvents`** ([#302](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/302)) — use [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix) to avoid handlers overwriting each other.
- **Integrating diff images with mochawesome** ([#106](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/106)) — use the new `processImgPath` hook to point the reporter at the correct path.
- Answers to several long-standing community discussions: [#96](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/96), [#189](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/189), [#214](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/214), [#226](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/226), [#309](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/309).

## [3.3.10](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v3.3.9...@frsource/cypress-plugin-visual-regression-diff-v3.3.10) (2023-06-17)


### Bug Fixes

* **deps:** update dependency @frsource/base64 to v1.0.17 ([#244](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/244)) ([d55c677](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/d55c67734d8526172bc1231128eb9faa8e39d51b))

## [3.3.9](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.3.8...v3.3.9) (2023-06-12)

## [3.3.8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.3.7...v3.3.8) (2023-06-05)

## [3.3.7](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.3.6...v3.3.7) (2023-06-05)

## [3.3.6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.3.5...v3.3.6) (2023-06-05)

## [3.3.5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.3.4...v3.3.5) (2023-05-29)

## [3.3.4](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.3.3...v3.3.4) (2023-05-29)

## [3.3.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.3.2...v3.3.3) (2023-05-29)

## [3.3.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.3.1...v3.3.2) (2023-05-29)

## [3.3.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.3.0...v3.3.1) (2023-05-21)


### Bug Fixes

* **deps:** update all non-major dependency bump ([#228](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/228)) ([845590e](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/845590e25edc8c0372fcf25333454ec03e5f167b))

# [3.3.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.15...v3.3.0) (2023-05-21)


### Bug Fixes

* **deps:** update dependency pngjs to v7 ([#215](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/215)) ([af71297](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/af71297f3d2ab180798bb64a46145919a6924c74))


### Features

* createMissingImages option ([#222](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/222)) ([2aef358](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/2aef35840e00299783ddede6f240c6005ac5bfcb)), closes [#204](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/204)
* separate versioning for images ([#221](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/221)) ([b2a7434](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/b2a74340fc2616aa16d54a4dfbd43ddbfdd24eb1)), closes [#197](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/197)

## [3.2.15](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.14...v3.2.15) (2023-05-21)

## [3.2.14](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.13...v3.2.14) (2023-03-26)

## [3.2.13](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.12...v3.2.13) (2023-03-26)

## [3.2.12](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.11...v3.2.12) (2023-03-26)


### Bug Fixes

* import meta-png cjs dependency ([#209](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/209)) ([41aeee5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/41aeee52c362e4a1817a9e364963c4aff1407d0a)), closes [#207](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/207)

## [3.2.11](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.10...v3.2.11) (2023-03-26)


### Bug Fixes

* treat maxDiffThreshold 0 as valid value ([f4d3ec9](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/f4d3ec946547d648d1ec8ea9ccf9369540255adf))

## [3.2.10](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.9...v3.2.10) (2023-03-26)


### Bug Fixes

* add missing forceDeviceScaleFactor option ([ba7d2f1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/ba7d2f15b57390bb1ef69de6f7ed979438155444))

## [3.2.9](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.8...v3.2.9) (2023-03-26)

## [3.2.8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.7...v3.2.8) (2022-12-18)

## [3.2.7](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.6...v3.2.7) (2022-12-14)

## [3.2.6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.5...v3.2.6) (2022-12-11)

## [3.2.5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.4...v3.2.5) (2022-12-09)

## [3.2.4](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.3...v3.2.4) (2022-12-04)

## [3.2.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.2...v3.2.3) (2022-11-30)


### Bug Fixes

* **deps:** update all non-major dependencies ([#191](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/191)) ([26e6d8b](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/26e6d8bce436243020dbc645e32d70fbdaca993b))

## [3.2.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.1...v3.2.2) (2022-11-29)


### Bug Fixes

* return launchOptions so they are applied ([#186](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/186)) ([b1b9056](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/b1b905613c899af6d14af920e34290533c26c545))

## [3.2.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.2.0...v3.2.1) (2022-11-29)


### Bug Fixes

* update images via GUI in Cypress 11 ([#193](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/193)) ([bdebca2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/bdebca28aea1dea63473243679a5a71e6b21f165)), closes [#187](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/187)

# [3.2.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.1.7...v3.2.0) (2022-11-29)


### Features

* support Cypress 11 ([#192](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/192)) ([7bd1a24](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/7bd1a24bcc5f38531d91845c141dd9a5713dec7e)), closes [#187](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/187)

## [3.1.7](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.1.6...v3.1.7) (2022-11-23)

## [3.1.6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.1.5...v3.1.6) (2022-11-19)

## [3.1.5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.1.4...v3.1.5) (2022-11-12)

## [3.1.4](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.1.3...v3.1.4) (2022-11-10)

## [3.1.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.1.2...v3.1.3) (2022-11-09)

## [3.1.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.1.1...v3.1.2) (2022-11-07)


### Bug Fixes

* **deps:** update dependency sharp to v0.31.2 ([#174](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/174)) ([c2bce9d](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/c2bce9dda3a70635270375f99c17d458f4cf39b8))

## [3.1.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.1.0...v3.1.1) (2022-11-04)


### Bug Fixes

* new image prefix starts at -1 ([#172](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/172)) ([8279208](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/8279208c2ec6dbbbf7dd846463f684f19dfe0df6))

# [3.1.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.0.4...v3.1.0) (2022-11-03)


### Features

* support Cypress retries functionality ([#171](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/171)) ([7d7d010](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/7d7d010938ee124e694e8cf0270aa99c89db59df)), closes [#168](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/168)

## [3.0.4](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.0.3...v3.0.4) (2022-11-03)


### Bug Fixes

* typings for older typescript ([#170](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/170)) ([96499ec](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/96499ecc2959bab8c39b599ba7eb87fbd79ceec3)), closes [#167](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/167)

## [3.0.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.0.2...v3.0.3) (2022-11-01)


### Bug Fixes

* ts declaration generation ([1a1e0cc](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/1a1e0ccd4c442d3e4d45f4d899139a08963e0c85))

## [3.0.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.0.1...v3.0.2) (2022-10-27)


### Bug Fixes

* **deps:** update all non-major dependencies ([#165](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/165)) ([602640f](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/602640fcca6e8173930efa116244258549aa5264))

## [3.0.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v3.0.0...v3.0.1) (2022-10-26)


### Bug Fixes

* reset name cache after tests run ([bfbf138](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/bfbf138fa52de06072db32a0181821b56ca5230f))

# [3.0.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.12...v3.0.0) (2022-10-26)


### Bug Fixes

* security vulnerability ([d6f849c](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/d6f849cb017e452d9f121866a6429d4bee4b5f18))


### Features

* add matchAgainstPath option ([#146](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/146)) ([7a5e3a8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/7a5e3a8ec5aa766e38ee372e11a6d1c155105126)), closes [#88](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/88)
* auto clean unused files ([#124](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/124)) ([38679a7](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/38679a730edc4083b4bc751b19bc161bbb72d159)), closes [#118](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/118)
* introduce imagesPath option ([#152](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/152)) ([961e137](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/961e137099ba22aa9f0b6d36e6e73d495196a764)), closes [#147](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/147)


### BREAKING CHANGES

* deprecate imagesDir option in favor of imagesPath - see docs for additional information
* To use autocleanup feature you need to update all of the screenshots, best do it by running your test suite with cypress env 'pluginVisualRegressionUpdateImages' set to true.
* matchImage returns object containing comparison details from now on (previously was returning subject element from a chain)

## [2.3.12](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.11...v2.3.12) (2022-10-22)

## [2.3.11](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.10...v2.3.11) (2022-10-19)

## [2.3.10](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.9...v2.3.10) (2022-10-15)

## [2.3.9](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.8...v2.3.9) (2022-10-14)

## [2.3.8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.7...v2.3.8) (2022-10-12)

## [2.3.7](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.6...v2.3.7) (2022-10-12)

## [2.3.6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.5...v2.3.6) (2022-10-12)


### Bug Fixes

* **deps:** update dependency @frsource/base64 to v1.0.3 ([#144](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/144)) ([09ecbd8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/09ecbd81c9978161de2a782cf3bc735ce8d6ca3f))

## [2.3.5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.4...v2.3.5) (2022-10-10)

## [2.3.4](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.3...v2.3.4) (2022-10-10)

## [2.3.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.2...v2.3.3) (2022-10-10)

## [2.3.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.1...v2.3.2) (2022-10-09)

## [2.3.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.3.0...v2.3.1) (2022-10-06)


### Bug Fixes

* security vulnerabilities ([d0bda44](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/d0bda44d3055cd578381406a06607bfba48ff447))

# [2.3.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.12...v2.3.0) (2022-10-06)


### Features

* show comparison for successful tests ([#137](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/137)) ([c09bab3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/c09bab3ef805de24fc7cbcc8c738137c35e3fe18)), closes [#104](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/104)

## [2.2.12](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.11...v2.2.12) (2022-10-06)


### Bug Fixes

* **deps:** update dependency sharp to v0.31.1 ([#132](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/132)) ([15f0f5d](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/15f0f5d2824cba32d4611289442abd637d8438f5))

## [2.2.11](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.10...v2.2.11) (2022-09-28)


### Bug Fixes

* **deps:** update dependency vue to v3.2.40 ([#131](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/131)) ([537fd16](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/537fd16c4507c394998c0c7f0da7cff18e2d35c5))

## [2.2.10](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.9...v2.2.10) (2022-09-28)

## [2.2.9](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.8...v2.2.9) (2022-09-27)

## [2.2.8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.7...v2.2.8) (2022-09-26)

## [2.2.7](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.6...v2.2.7) (2022-09-26)

## [2.2.6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.5...v2.2.6) (2022-09-25)


### Bug Fixes

* remove alias leftovers from dist bundles ([407ce79](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/407ce79c6a6e00b509fd504f4cf615b3e3c504c3))

## [2.2.5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.4...v2.2.5) (2022-09-24)

## [2.2.4](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.3...v2.2.4) (2022-09-24)

## [2.2.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.2...v2.2.3) (2022-09-24)

## [2.2.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.1...v2.2.2) (2022-09-24)

## [2.2.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.2.0...v2.2.1) (2022-09-24)

# [2.2.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.1.0...v2.2.0) (2022-09-23)


### Features

* migrate to @frsource/base64 package ([e4f3a14](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/e4f3a14575648b76d4f41eeb5984b853b968c974))

# [2.1.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.0.3...v2.1.0) (2022-09-23)


### Features

* provide modern exports ([5c911a1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/5c911a113624cea79e8b09eba2e643954a04a057))

## [2.0.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.0.2...v2.0.3) (2022-09-23)

## [2.0.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.0.1...v2.0.2) (2022-09-22)

## [2.0.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v2.0.0...v2.0.1) (2022-09-17)

# [2.0.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.21...v2.0.0) (2022-09-15)


### Features

* img diff when resolution differs ([#108](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/108)) ([c8a5044](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/c8a504480d09f6ffd34321163bf14b1a2f0e7bb0)), closes [#94](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/94)


### BREAKING CHANGES

* different resolution doesn't fail test immediately - img diff is being done

## [1.9.21](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.20...v1.9.21) (2022-09-14)


### Bug Fixes

* btoa utf8 encoding/decoding error ([#114](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/114)) ([0137014](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/01370148094f3152a374f4e612e75ef5fd2bc3d8))

## [1.9.20](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.19...v1.9.20) (2022-09-13)

## [1.9.19](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.18...v1.9.19) (2022-09-12)

## [1.9.18](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.17...v1.9.18) (2022-09-09)

## [1.9.17](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.16...v1.9.17) (2022-09-08)


### Bug Fixes

* **deps:** update dependency vue to v3.2.39 ([#110](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/110)) ([8a7f055](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/8a7f0555b1d664b83c7de64d93796408646704eb))

## [1.9.16](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.15...v1.9.16) (2022-09-05)

## [1.9.15](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.14...v1.9.15) (2022-09-03)

## [1.9.14](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.13...v1.9.14) (2022-09-02)


### Bug Fixes

* image diff calculation ([529cb22](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/529cb22a22200af234bdbc1399b6f97880001d12)), closes [#107](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/107)

## [1.9.13](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.12...v1.9.13) (2022-08-31)


### Bug Fixes

* **deps:** update dependency vue to v3.2.38 ([#101](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/101)) ([e2d3c82](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/e2d3c823822ecb6738202599500435cf59f2f6d1))

## [1.9.12](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.11...v1.9.12) (2022-08-30)

## [1.9.11](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.10...v1.9.11) (2022-08-30)

## [1.9.10](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.9...v1.9.10) (2022-08-27)

## [1.9.9](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.8...v1.9.9) (2022-08-26)

## [1.9.8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.7...v1.9.8) (2022-08-25)

## [1.9.7](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.6...v1.9.7) (2022-08-23)

## [1.9.6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.5...v1.9.6) (2022-08-22)

## [1.9.5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.4...v1.9.5) (2022-08-22)

## [1.9.4](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.3...v1.9.4) (2022-08-21)

## [1.9.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.2...v1.9.3) (2022-08-17)

## [1.9.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.1...v1.9.2) (2022-08-09)

## [1.9.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.9.0...v1.9.1) (2022-08-09)

# [1.9.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.10...v1.9.0) (2022-08-09)


### Features

* add title option to matchImage command ([#81](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/81)) ([4d03866](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/4d03866f7f171473b16b4a7c869fbca02d5f46d1))

## [1.8.10](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.9...v1.8.10) (2022-08-02)

## [1.8.9](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.8...v1.8.9) (2022-08-01)

## [1.8.8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.7...v1.8.8) (2022-07-19)

## [1.8.7](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.6...v1.8.7) (2022-07-17)

## [1.8.6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.5...v1.8.6) (2022-07-12)


### Bug Fixes

* **deps:** pin dependency vue to 3.2.37 ([#68](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/68)) ([d09a762](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/d09a762bbcf0f6e9bb886f80e4d01724bf0e3367))

## [1.8.5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.4...v1.8.5) (2022-07-07)

## [1.8.4](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.3...v1.8.4) (2022-07-04)

## [1.8.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.2...v1.8.3) (2022-06-29)

## [1.8.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.1...v1.8.2) (2022-06-27)

## [1.8.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.8.0...v1.8.1) (2022-06-27)


### Bug Fixes

* remove automated screenshots update ([acb3ef0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/acb3ef08fb8ec5129bee9883431361dd804d23f3))

# [1.8.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.7.8...v1.8.0) (2022-06-27)


### Bug Fixes

* **deps:** update dependency move-file to v3 ([#62](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/62)) ([4f6eaf6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/4f6eaf64a0f3db6e54190ef7532059a451ad384f))


### Features

* make library cypress 10 compatible ([b26beb3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/b26beb391cf440d2d4b01261271b7acffa6f600e))
* make plugin Cypress 10 compatible ([a03a17d](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/a03a17d7295dd811969c10ad562dda26795fd8f2))

## [1.7.8](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.7.7...v1.7.8) (2022-06-24)

## [1.7.7](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.7.6...v1.7.7) (2022-06-24)

## [1.7.6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.7.5...v1.7.6) (2022-06-24)


### Bug Fixes

* **deps:** update dependency pixelmatch to v5.3.0 ([#55](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/55)) ([ca5d278](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/ca5d2784a5fffb60bebe7643f8beced6ad9979bd))

## [1.7.5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.7.4...v1.7.5) (2022-06-24)

## [1.7.4](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.7.3...v1.7.4) (2022-06-24)

## [1.7.3](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.7.2...v1.7.3) (2022-06-23)

## [1.7.2](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.7.1...v1.7.2) (2022-06-23)

## [1.7.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.7.0...v1.7.1) (2022-03-15)


### Bug Fixes

* sanitize screenshot filenames ([fc57380](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/fc57380d40e72eec51d5fdf2615226a358efa070))

# [1.7.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.6.0...v1.7.0) (2022-03-01)


### Features

* don't override screenshots if not needed ([9066017](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/90660179d05f4de1c803888fb66f8e1c240f7c37))

# [1.6.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.5.0...v1.6.0) (2022-02-25)


### Features

* show scrollbar for overflowing images ([de994b9](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/de994b98ad3dea233aee70b0142992a309476e38))

# [1.5.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.4.0...v1.5.0) (2022-02-24)


### Features

* add forceDeviceFactor option ([8d69632](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/8d6963222f924d73fc0aed08adecdb361104c2dc))

# [1.4.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.3.1...v1.4.0) (2022-02-21)


### Features

* add possibility to change images dirname ([b831e94](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/b831e94677df906f0cbd889f7ce0994e1e8a7783))

## [1.3.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.3.0...v1.3.1) (2021-11-23)


### Bug Fixes

* create missing dirs when renaming screenshot files ([38e5ff5](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/38e5ff5d5f7c2a8d9b971deb13af821773815f66))

# [1.3.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.2.0...v1.3.0) (2021-11-09)


### Bug Fixes

* text overflowing when image is small ([3b04f8e](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/3b04f8e1782754c4c48e946ebdb2f43ccfec9461))


### Features

* externalize important APIs ([9f94086](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/9f9408657e7970bdad5dfc7a599943a34a779ab7))

# [1.2.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.1.0...v1.2.0) (2021-10-26)


### Features

* stop logging all of the tasks ([573e728](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/573e7282799c802b0f6e9ecbe66501d043745ac3))

# [1.1.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.0.1...v1.1.0) (2021-10-25)


### Features

* add queue flushing in after block ([70f828f](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/70f828ff68c4de276dd10c64ab61fece573d305f))

## [1.0.1](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/v1.0.0...v1.0.1) (2021-10-25)


### Bug Fixes

* proper readme info ([dd87e19](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/dd87e19429fe232bd9027737ff7e218c52d8eb06))

# 1.0.0 (2021-10-25)


### Features

* add typings ([0a0e8e6](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/0a0e8e63ba1df0f95cf81ba6b0b34a095a0b69be))
* first implementation ([388cccf](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/388cccf5f033010e4de9f88294f5fca30c6d0cd1))
