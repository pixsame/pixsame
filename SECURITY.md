# Security policy

This policy covers every package in this repository: `@pixsame/cypress-plugin-visual-regression-diff`, the run manifest package and the GitHub App.

## Supported versions

| Version                                        | Support                                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| Latest major (`latest` dist-tag)               | yes, security fixes ship as patch releases                |
| Pre-releases (`beta` dist-tag)                 | yes, ongoing; fixes land in the next pre-release          |
| Previous major                                 | six months after the new major ships on `latest`          |
| Anything older than the previous major         | no, please upgrade                                        |

After a new major ships on the `latest` (stable) channel, the previous major keeps getting security fixes for six months.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use one of these instead:

- [Report a vulnerability](https://github.com/pixsame/cypress-plugin-visual-regression-diff/security/advisories/new) through GitHub's private reporting on this repository (preferred; it keeps the discussion, the fix and the advisory in one place).
- Email [jakub@frsource.org](mailto:jakub@frsource.org) with "security" in the subject.

Include what you found, how to reproduce it and which version you tested. A proof of concept helps but is not required.

## What to expect

- An acknowledgement within three business days.
- A fix in a patch release, or an explanation of why it is not a vulnerability, within 30 days for anything that affects users in practice. Harder cases get a status update at least every two weeks.
- Credit in the release notes and the advisory, unless you prefer to stay anonymous.

## Scope notes

- The plugin runs inside your Cypress process and writes files under your project; it makes no network requests of its own.
- The GitHub App serves screenshots from CI artifacts through signed, expiring links. Reports about that link scheme, the artifact extraction (zip handling, path checks) and the approval commit path are especially welcome.
- Findings in third-party dependencies are best reported to those projects; a note here that we should bump a dependency is welcome too.
