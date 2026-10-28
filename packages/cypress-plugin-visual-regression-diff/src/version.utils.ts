export const supportsExpose = (version: string): boolean => {
  const [major, minor] = version.split('.').map(Number);
  return major > 15 || (major === 15 && minor >= 10);
};

export const getPluginConfig = (
  config: Cypress.PluginConfigOptions,
  key: string,
): unknown => {
  if (supportsExpose(config.version ?? '')) {
    return config.expose?.[key];
  }
  return config.env?.[key];
};
