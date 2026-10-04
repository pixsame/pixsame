# @pixsame/cypress-plugin-visual-regression-diff Contributing Guide

Hey! It’s really exciting for us to see your interest in contributing to this library. Before taking off with your work, please take a moment to read through these guidelines:

- [Code of Conduct](https://github.com/pixsame/pixsame/blob/master/CODE_OF_CONDUCT.md)
- [Questions?](#questions)
- [Reporting an issue or a feature request](#reporing-an-issue-or-a-feature-request)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Setup](#development-setup)

## Questions?

Don’t hesitate to ask a question directly on the [discussions board](https://github.com/pixsame/pixsame/discussions)!

## Reporting an issue or a feature request

- Please always use GitHub Issues tracker with [appropriate template](https://github.com/login?return_to=https%3A%2F%2Fgithub.com%2Fpixsame%2Fcypress-plugin-visual-regression-diff%2Fissues%2Fnew%2Fchoose) to create a new issue or suggestion

## Pull Request Guidelines

- Check if there isn’t a similar PR already in the [GitHub Pull requests](https://github.com/pixsame/pixsame/pulls) - maybe somebody already has covered this topic?

- Checkout the master branch and (after you do your work) file a PR against it

- Read through the [development setup](#development-setup) to learn how to work with this project. Always make sure that `pnpm lint`, `pnpm build` and `pnpm test` pass

- Please use [conventional commits v1.0.0 style guide](https://www.conventionalcommits.org/en/v1.0.0/) for commits and PR names

- We have no preference about number of commits on the PR - they will be all squashed by GitHub while merging

- When creating a new feature/plugin/integration:

  - Make sure the feature is covered by tests
  - Provide a meaningful description. In most cases it would make sens to first open a issue with a suggestion, discuss about it and have it approved before working on it

- When fixing bug:
  - Try to cover the scenario with tests if possible
  - If an issue for this bug already exists, please reference it via (`Refs: #XYZ` - where `XYZ` is an issue number) at the very bottom of your commit message and PR description as proposed by [conventional commits v1.0.0 style guide](https://www.conventionalcommits.org/en/v1.0.0/#commit-message-with-multi-paragraph-body-and-multiple-footers)
  - If there is no issue connected with the bug, please provide a detailed description of the problem in the PR. Live demo preferred ([look for the codeine example project in the bug issue template](https://github.com/pixsame/pixsame/blob/master/.github/ISSUE_TEMPLATE/bug_report.md))

## Development Setup

<!-- textlint-disable spelling -->

You will need [Node.js](https://nodejs.org/en/) **version 16+** and [pnpm](https://pnpm.io/installation).

<!-- textlint-enable -->

After cloning the repository, run:

```bash
pnpm i # installs the project dependencies
```

### Committing Changes

Commit messages should follow the [conventional commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) so that changelogs can be automatically generated. Commit messages will be automatically validated upon commit.

### These npm scripts are available in the repo

When fired in the project root they will run corresponding actions in every nested package at once.

```bash
# build the project for NPM and example usage
$ pnpm build

# run tests once
$ pnpm test

# open cypress component runner from example directory
# requires plugin to be built first via `pnpm build`
$ pnpm test:ct

# open cypress e2e runner from example directory
# requires plugin to be built first via `pnpm build`
$ pnpm test:e2e

# run integration tests once and collect coverage
$ pnpm test:integration:coverage

# run integration tests in watch mode
$ pnpm test:integration:watch

# lint & try to autofix linting errors
$ pnpm fix:lint && pnpm format

# lint files
$ pnpm lint && pnpm format:ci
```

There are some other scripts available in the `scripts` section of the `package.json` file.

### Releases and pre-releases

Stable releases are cut by [release-please](https://github.com/googleapis/release-please) from conventional commits on `main`: it opens one release PR per package, and merging that PR tags, publishes to npm under `latest` and creates the GitHub release. release-please never produces pre-release versions.

Betas are published only by the manually dispatched `Beta release` workflow. Run it from the Actions tab or with:

```sh
$ gh workflow run beta-release.yml -f branch=feat/my-branch -f beta=1
```

It checks out the given branch, builds it and publishes every public package as `<package.json version>-beta.<beta>` under the `beta` dist-tag (`beta` defaults to `0`). Nothing is committed: the version suffix is added on the fly by `scripts/publish.mjs --beta <n>`, and `main` stays untouched. For another cut of the same branch bump `beta`, because npm rejects re-publishing an existing version. Install a beta with `pnpm add -D @pixsame/cypress-plugin-visual-regression-diff@beta`.

Canaries need no action: every commit that lands on `main` and is not itself a release publishes every public package as `<package.json version>-canary-<YYYYMMDD>-<8 random characters>` (for example `4.2.0-canary-20260930-7cjnd4t5`) under the `canary` dist-tag. The exact version is listed in the summary of that commit's CI run. Install the newest one with `pnpm add -D @pixsame/cypress-plugin-visual-regression-diff@canary`.

All three channels publish through [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no npm token in the repository secrets), so every public package needs a trusted publisher on npmjs.com for each of the two workflows: `ci.yml` (stable and canary) and `beta-release.yml` (beta).

## Credits

Many thanks to all the people who have already contributed to @pixsame/cypress-plugin-visual-regression-diff! ❤️
