#!/usr/bin/env node
/**
 * Publishes every public workspace package whose version is not on npm yet.
 *
 * Stable mode (CI on `main`, after release-please cut a release) publishes the
 * versions committed in `package.json` under `latest`.
 *
 * Beta mode (`--beta <n>`, the manually dispatched "Beta release" workflow)
 * rewrites the version of every public package that has no stable release on
 * npm yet to `X.Y.Z-beta.<n>` in the working tree, without committing
 * anything, and publishes under `beta`. A package still at the `0.0.0`
 * placeholder becomes `1.0.0-beta.<n>`; stable and canary runs skip it.
 * Already released packages are left out: their `-beta.<n>` would be a semver
 * downgrade for anyone on `@beta`.
 *
 * Canary mode (`--canary`, CI on every push to `main` that is not a release)
 * does the same with `X.Y.Z-canary-<YYYYMMDD>-<8 random base36 chars>`, e.g.
 * `4.2.0-canary-20260930-7cjnd4t5`, and publishes under `canary`. The date
 * and the random part are generated once per run and shared by every package.
 *
 * release-please never produces prerelease versions; they exist only through
 * these flags. The dist-tag is derived from the version, not from
 * configuration, so a stable run can never land on `beta` or `canary` and a
 * prerelease run can never land on `latest`. A prerelease with an unknown
 * channel is refused.
 *
 * Usage (from the repository root, after `pnpm build`):
 *   node scripts/publish.mjs                 # stable versions -> latest
 *   node scripts/publish.mjs --beta 2        # X.Y.Z-beta.2 -> beta
 *   node scripts/publish.mjs --canary        # X.Y.Z-canary-YYYYMMDD-xxxxxxxx -> canary
 *   node scripts/publish.mjs --dry-run       # only print what would be published
 */

/* global process, console */
/* eslint-disable no-console */

import { execFileSync } from 'child_process';
import { randomBytes } from 'crypto';
import { appendFileSync } from 'fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const canary = args.includes('--canary');
const betaFlag = args.indexOf('--beta');
const beta = betaFlag === -1 ? null : args[betaFlag + 1];

if (betaFlag !== -1 && !/^\d+$/.test(beta ?? '')) {
  console.error(
    `--beta expects a non-negative integer (the N in X.Y.Z-beta.N), got ${JSON.stringify(beta ?? '')}`,
  );
  process.exit(1);
}

if (canary && beta !== null) {
  console.error('--beta and --canary are mutually exclusive');
  process.exit(1);
}

const canarySuffix = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const random = randomBytes(8)
    .readBigUInt64BE()
    .toString(36)
    .padStart(8, '0')
    .slice(-8);
  return `canary-${date}-${random}`;
};

// `-beta.N` or `-canary-YYYYMMDD-xxxxxxxx`; null for a stable run.
const prerelease =
  beta !== null ? `beta.${beta}` : canary ? canarySuffix() : null;

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  });

let packages = JSON.parse(
  run('pnpm', ['-r', 'ls', '--json', '--depth', '-1']),
).filter(
  // `0.0.0` is the placeholder of a package release-please has not released
  // yet. Stable and canary runs skip it, so a sibling cannot reach npm before
  // its own release; only a beta run publishes it, as `1.0.0-beta.<n>`.
  (pkg) =>
    pkg.name &&
    pkg.version &&
    !pkg.private &&
    (pkg.version !== '0.0.0' || beta !== null),
);

const isPublished = (name, version) => {
  try {
    const args = ['view', `${name}@${version}`, 'version'];
    return (
      run('npm', args, { stdio: ['ignore', 'pipe', 'ignore'] }).trim() ===
      version
    );
  } catch {
    // `npm view` exits non-zero when the package or the version does not exist.
    return false;
  }
};

if (prerelease !== null) {
  const prereleases = packages.filter(({ version }) => version.includes('-'));
  if (prereleases.length) {
    console.error(
      `${canary ? '--canary' : '--beta'} needs stable versions in package.json, but found: ${prereleases
        .map(({ name, version }) => `${name}@${version}`)
        .join(', ')}`,
    );
    process.exit(1);
  }
  // A beta of a package whose stable version is already released would be a
  // semver downgrade for everyone on `@beta`, so only unreleased packages
  // (the `0.0.0` placeholder, or a version not on npm yet) get one. Canaries
  // keep rewriting everything: they have a channel of their own.
  if (beta !== null) {
    packages = packages.filter(
      ({ name, version }) => version === '0.0.0' || !isPublished(name, version),
    );
  }
  // Rewrite every sibling before publishing anything: `pnpm publish` resolves
  // `workspace:` ranges from the sibling's package.json at publish time.
  packages = packages.map((pkg) => {
    const base = pkg.version === '0.0.0' ? '1.0.0' : pkg.version;
    const version = `${base}-${prerelease}`;
    console.log(`version ${pkg.name} ${pkg.version} -> ${version}`);
    run('npm', ['pkg', 'set', `version=${version}`], { cwd: pkg.path });
    return { ...pkg, version };
  });
}

const distTag = (version) => {
  if (!version.includes('-')) return 'latest';
  if (/-beta\.\d+$/.test(version)) return 'beta';
  if (/-canary-\d{8}-[0-9a-z]{8}$/.test(version)) return 'canary';
  console.error(
    `${version} is a prerelease of an unknown channel; only -beta.N (beta dist-tag) and -canary-YYYYMMDD-xxxxxxxx (canary dist-tag) are published`,
  );
  process.exit(1);
};

const published = [];
for (const { name, version, path } of packages) {
  const spec = `${name}@${version}`;
  if (isPublished(name, version)) {
    console.log(`skip    ${spec} (already on npm)`);
    continue;
  }
  const tag = distTag(version);
  const args = [
    'publish',
    '--tag',
    tag,
    '--no-git-checks',
    ...(dryRun ? ['--dry-run'] : []),
  ];
  console.log(`publish ${spec} --tag ${tag}${dryRun ? ' (dry run)' : ''}`);
  run('pnpm', args, { cwd: path, stdio: 'inherit' });
  published.push({ name, version, tag });
}

console.log(
  published.length
    ? `published ${published.length} package(s)`
    : 'nothing to publish',
);

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = published.length
    ? published.map(
        ({ name, version, tag }) => `| ${name} | ${version} | ${tag} |`,
      )
    : ['| _nothing to publish_ | | |'];
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      `## Published${dryRun ? ' (dry run)' : ''}`,
      '',
      '| Package | Version | dist-tag |',
      '| --- | --- | --- |',
      ...rows,
      '',
    ].join('\n'),
  );
}
