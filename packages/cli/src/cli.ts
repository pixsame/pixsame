import { findBaselines, type Report } from './baselines';

const HELP = `pixsame <command>

Commands:
  baselines [dir...]   Find baselines that lack the page layout of this version
                       (default: the current directory)
    --json             Print the report as JSON
    --check            Exit with 1 when any baseline lacks it

Replacing a baseline adds the layout: run your tests once with
pluginVisualRegressionUpdateImages (Cypress) or --update-snapshots (Playwright).
Baselines that still pass are only replaced with 'true', not 'failures-only'.
`;

const text = ({ analysisVersion, counts, baselines }: Report) => {
  const stale = baselines.filter(({ status }) => status !== 'current');
  const total = baselines.length;
  if (total === 0) return 'No baselines found.';
  if (stale.length === 0)
    return `All ${total} baselines have the page layout (version ${analysisVersion}).`;
  return [
    `${stale.length} of ${total} baselines lack the page layout (version ${analysisVersion}): ${counts.missing} without one, ${counts.outdated} from another version.`,
    ...stale.map(
      ({ file, status, version }) =>
        `  ${file}  ${status === 'missing' ? 'no layout' : `layout v${version}`}`,
    ),
    '',
    'They still compare. They get the layout when the update option replaces them:',
    "  Cypress     pluginVisualRegressionUpdateImages=true  (or 'failures-only' for failing ones)",
    '  Playwright  --update-snapshots',
  ].join('\n');
};

/** Runs the CLI; returns the exit code. */
export const run = async (
  argv: string[],
  out: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
  cwd = process.cwd(),
): Promise<number> => {
  const [command, ...rest] = argv;
  if (command !== 'baselines') {
    out(HELP);
    return command === undefined || command === '--help' || command === '-h'
      ? 0
      : 1;
  }
  const flags = rest.filter((arg) => arg.startsWith('--'));
  const unknown = flags.find((flag) => flag !== '--json' && flag !== '--check');
  if (unknown) {
    out(`Unknown option ${unknown}\n\n${HELP}`);
    return 1;
  }
  const dirs = rest.filter((arg) => !arg.startsWith('--'));
  const report = await findBaselines(dirs.length > 0 ? dirs : ['.'], cwd);
  out(
    flags.includes('--json') ? JSON.stringify(report, null, 2) : text(report),
  );
  const stale = report.counts.missing + report.counts.outdated;
  return flags.includes('--check') && stale > 0 ? 1 : 0;
};
