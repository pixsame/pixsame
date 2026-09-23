import {
  readRemoteInfo,
  readResolvedRemote,
  stopRemoteBrowser,
} from './remote';

/** `globalTeardown` for `playwright.config`: stops the container unless `keepAlive` is set. */
export default async function globalTeardown() {
  const remote = readResolvedRemote();
  const info = readRemoteInfo();
  if (!remote || !info || remote.keepAlive) return;
  await stopRemoteBrowser(info);
}
