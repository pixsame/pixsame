/** The environment variable the `pixsame` CLI sets to refresh baselines for one run. */
export const UPDATE_IMAGES_ENV = 'PIXSAME_UPDATE_IMAGES';

/**
 * `updateImages` from the environment: `true`, or `failures-only`; anything
 * else (including unset) is no override. It wins over the config, so a single
 * run can refresh baselines without editing it.
 */
export const updateImagesFromEnv = (
  env: Record<string, string | undefined> = process.env,
): boolean | 'failures-only' | undefined => {
  const value = env[UPDATE_IMAGES_ENV]?.trim().toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'failures-only') return 'failures-only';
  return undefined;
};
