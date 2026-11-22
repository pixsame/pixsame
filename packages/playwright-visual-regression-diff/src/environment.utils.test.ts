import { describe, expect, it } from 'vitest';
import { environmentFor } from './environment.utils';

describe('environmentFor', () => {
  it('is the machine the test runs on for a native browser', () => {
    expect(
      environmentFor(
        { backend: 'native', browser: 'chromium', browserVersion: '147.0' },
        'darwin',
      ),
    ).toEqual({ os: 'darwin', browser: 'chromium', browserVersion: '147.0' });
  });

  it('is Linux for a Docker renderer, whatever runs the test', () => {
    expect(
      environmentFor(
        {
          backend: 'docker',
          browser: 'chromium',
          browserVersion: '147.0',
          rendererVersion: '1.63.0',
          imageDigest: 'sha256:abc',
        },
        'darwin',
      ),
    ).toEqual({
      os: 'linux',
      browser: 'chromium',
      browserVersion: '147.0',
      renderer: 'docker:sha256:abc',
    });
  });
});
