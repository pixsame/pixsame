import type { Environment } from '@pixsame/analysis';
import type { ManifestRenderer } from 'visual-regression-manifest';

/**
 * What renders the screenshots of a test, for the analysis: where a Docker
 * renderer draws, that is Linux, whatever machine runs the test.
 */
export const environmentFor = (
  renderer: ManifestRenderer,
  platform: string = process.platform,
): Environment => ({
  os: renderer.backend === 'docker' ? 'linux' : platform,
  ...(renderer.browser && { browser: renderer.browser }),
  ...(renderer.browserVersion && { browserVersion: renderer.browserVersion }),
  ...(renderer.backend === 'docker' && {
    renderer: `docker${renderer.imageDigest ? `:${renderer.imageDigest}` : ''}`,
  }),
});
