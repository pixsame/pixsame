import fs from 'fs';
import path from 'path';
import schema from './schema.json';
import { isManifestFileName } from './constants';
import type { Manifest } from './types';
import {
  validateAgainst,
  type JsonSchema,
  type ValidationIssue,
} from './validate';

/** The JSON Schema (draft 2020-12) of the manifest format, also shipped as `schema.json`. */
export const manifestSchema: JsonSchema = schema;

export class ManifestParseError extends Error {
  constructor(
    /** What was being parsed: a file path, an artifact entry, ... */
    readonly where: string,
    readonly issues: ValidationIssue[],
  ) {
    const shown = issues
      .slice(0, 5)
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join('; ');
    const more = issues.length > 5 ? ` (+${issues.length - 5} more)` : '';
    super(`Invalid manifest ${where}: ${shown}${more}`);
    this.name = 'ManifestParseError';
  }
}

/** Every way `json` deviates from the schema; empty for a valid manifest. */
export const validateManifest = (json: unknown): ValidationIssue[] =>
  validateAgainst(manifestSchema, json);

export const isManifest = (json: unknown): json is Manifest =>
  validateManifest(json).length === 0;

/** Checks `json` against the schema and returns it typed; throws `ManifestParseError` otherwise. */
export const parseManifest = (json: unknown, where = 'manifest'): Manifest => {
  const issues = validateManifest(json);
  if (issues.length > 0) throw new ManifestParseError(where, issues);
  return json as Manifest;
};

/** `parseManifest` for the raw file contents. */
export const parseManifestJson = (
  text: string,
  where = 'manifest',
): Manifest => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new ManifestParseError(where, [
      {
        path: '(root)',
        message: `not valid JSON (${(error as Error).message})`,
      },
    ]);
  }
  return parseManifest(json, where);
};

export const readManifestFile = (file: string): Manifest =>
  parseManifestJson(fs.readFileSync(file, 'utf8'), file);

export type FindManifestFilesOptions = {
  /** Directory names never descended into. */
  ignore?: readonly string[];
};

/** Every manifest file below `dir` (see `isManifestFileName`), sorted, as absolute paths. */
export const findManifestFiles = (
  dir: string,
  { ignore = ['node_modules', '.git'] }: FindManifestFilesOptions = {},
): string[] => {
  const found: string[] = [];
  const walk = (current: string) => {
    for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        if (!ignore.includes(dirent.name)) walk(full);
      } else if (dirent.isFile() && isManifestFileName(dirent.name)) {
        found.push(full);
      }
    }
  };
  walk(path.resolve(dir));
  return found.sort();
};

export type ReadManifest = { file: string; manifest: Manifest };

/** Finds and parses every manifest below `dir`; the first invalid file throws. */
export const readManifestFiles = (
  dir: string,
  options?: FindManifestFilesOptions,
): ReadManifest[] =>
  findManifestFiles(dir, options).map((file) => ({
    file,
    manifest: readManifestFile(file),
  }));
