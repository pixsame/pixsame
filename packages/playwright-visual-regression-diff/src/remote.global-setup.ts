import { REMOTE_INFO_ENV_KEY } from './constants';
import {
  readResolvedRemote,
  RemoteBrowserError,
  startRemoteBrowser,
} from './remote';

/** `globalSetup` for `playwright.config`: starts the remote browser configured by `remoteBrowser()`. */
export default async function globalSetup() {
  const remote = readResolvedRemote();
  if (!remote) {
    throw new RemoteBrowserError(
      'NOT_CONFIGURED',
      'The remote browser global setup ran, but remoteBrowser() was not called in playwright.config.',
      'Call `const remote = remoteBrowser()` in the config and use `remote.globalSetup`.',
    );
  }
  const info = await startRemoteBrowser(remote, (message) =>
    process.stderr.write(`[visual-regression] ${message}\n`),
  );
  process.env[REMOTE_INFO_ENV_KEY] = JSON.stringify(info);
}
