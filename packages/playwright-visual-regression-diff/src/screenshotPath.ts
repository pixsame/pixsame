import path from 'path';
import sanitize from 'sanitize-filename';
import { PATH_VARIABLES, WINDOWS_LIKE_DRIVE_REGEX } from './constants';

/** What `{platform}`, `{os}` and `{browser}` expand to. `browser` is the browser that rendered the screenshot. */
export type PathVariables = { os: string; browser: string };

const toPathToken = (value: string) => sanitize(value) || 'unknown';

const replaceToken = (text: string, token: string, value: string) =>
  text.split(token).join(value);

/** Expands `{platform}`, `{os}` and `{browser}` anywhere in a segment; unknown `{...}` stay literal. */
export const expandPathVariables = (
  pathPart: string,
  { os, browser }: PathVariables,
) => {
  const osToken = toPathToken(os);
  const browserToken = toPathToken(browser);
  return [
    [PATH_VARIABLES.platform, `${osToken}-${browserToken}`],
    [PATH_VARIABLES.os, osToken],
    [PATH_VARIABLES.browser, browserToken],
  ].reduce(
    (result, [token, value]) => replaceToken(result, token, value),
    pathPart,
  );
};

export type ImagesDirInput = {
  /** The `imagesPath` option, always with `/` separators. */
  imagesPath: string;
  /** Test file path relative to `rootDir`, with `/` separators. */
  specPath: string;
  /** Playwright's `config.rootDir`; relative `imagesPath` values resolve against it. */
  rootDir: string;
  pathVariables: PathVariables;
};

/**
 * Resolves `imagesPath` to an absolute directory. `{spec_path}` has to be a
 * whole segment (it expands to several); the other tokens can sit anywhere.
 * Absolute unix (`/x`) and windows (`C:/x`) paths are kept absolute.
 */
export const resolveImagesDir = ({
  imagesPath,
  specPath,
  rootDir,
  pathVariables,
}: ImagesDirInput) => {
  const parts = imagesPath.split('/').map((part, i) => {
    if (part === PATH_VARIABLES.specPath) return path.dirname(specPath);
    if (i === 0 && !part) return path.sep; // unix-like absolute path
    if (i === 0 && WINDOWS_LIKE_DRIVE_REGEX.test(part))
      return `${part}${path.sep}`;
    return expandPathVariables(part, pathVariables);
  });
  const joined = path.join(...parts);
  return path.isAbsolute(joined) ? joined : path.resolve(rootDir, joined);
};

/**
 * Hands out `<title>_#n` names, counting repeated titles within one test
 * attempt like the Cypress plugin does within one spec.
 */
export class ScreenshotNamer {
  private readonly counters = new Map<string, number>();

  next(dir: string, title: string) {
    const stem = path.join(dir, sanitize(title));
    const n = (this.counters.get(stem) ?? -1) + 1;
    this.counters.set(stem, n);
    return `${sanitize(title)}_#${n}`;
  }
}
