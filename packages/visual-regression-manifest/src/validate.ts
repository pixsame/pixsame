/**
 * A small JSON Schema interpreter covering exactly the keywords `schema.json`
 * uses, so the reader validates against the shipped schema without pulling a
 * full validator into every consumer. The test suite cross-checks it against
 * Ajv on valid and broken manifests.
 */
export type ValidationIssue = {
  /** JSON pointer-ish path of the offending value, `(root)` for the document. */
  path: string;
  message: string;
};

export type JsonSchema = {
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  pattern?: string;
  [keyword: string]: unknown;
};

const typeOf = (value: unknown) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const matchesType = (value: unknown, type: string) => {
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number')
    return typeof value === 'number' && !Number.isNaN(value);
  return typeOf(value) === type;
};

const describe = (value: unknown) => {
  const type = typeOf(value);
  return type === 'object' || type === 'array' ? type : JSON.stringify(value);
};

const resolveRef = (root: JsonSchema, ref: string): JsonSchema => {
  const match = ref.match(/^#\/\$defs\/([^/]+)$/);
  const target = match && root.$defs?.[match[1]];
  if (!target) throw new Error(`Unsupported $ref: ${ref}`);
  return target;
};

const join = (path: string, key: string | number) =>
  path === '(root)' ? String(key) : `${path}.${key}`;

const validateAt = (
  root: JsonSchema,
  schema: JsonSchema,
  value: unknown,
  path: string,
  issues: ValidationIssue[],
) => {
  if (schema.$ref) {
    validateAt(root, resolveRef(root, schema.$ref), value, path, issues);
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) {
      issues.push({
        path,
        message: `expected ${types.join(' or ')}, got ${describe(value)}`,
      });
      return;
    }
  }
  if ('const' in schema && value !== schema.const) {
    issues.push({
      path,
      message: `expected ${JSON.stringify(schema.const)}, got ${describe(value)}`,
    });
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    issues.push({
      path,
      message: `expected one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}, got ${describe(value)}`,
    });
    return;
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      issues.push({ path, message: `must be >= ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      issues.push({ path, message: `must be <= ${schema.maximum}` });
    }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push({ path, message: 'must not be empty' });
    }
    if (
      schema.pattern !== undefined &&
      !new RegExp(schema.pattern).test(value)
    ) {
      issues.push({ path, message: `must match ${schema.pattern}` });
    }
  }
  if (typeOf(value) === 'object') {
    const record = value as Record<string, unknown>;
    // like JSON, an `undefined` property is no property at all
    for (const key of schema.required ?? []) {
      if (record[key] === undefined) {
        issues.push({ path: join(path, key), message: 'is required' });
      }
    }
    for (const [key, subSchema] of Object.entries(schema.properties ?? {})) {
      if (record[key] !== undefined) {
        validateAt(root, subSchema, record[key], join(path, key), issues);
      }
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) =>
      validateAt(root, schema.items as JsonSchema, item, join(path, i), issues),
    );
  }
  for (const subSchema of schema.allOf ?? []) {
    validateAt(root, subSchema, value, path, issues);
  }
  if (schema.anyOf) {
    const attempts = schema.anyOf.map((subSchema) => {
      const branch: ValidationIssue[] = [];
      validateAt(root, subSchema, value, path, branch);
      return branch;
    });
    if (!attempts.some((branch) => branch.length === 0)) {
      // report the branch that got inside the value before failing; when
      // every branch failed on the value itself, no branch is "the" right one
      const inside = attempts.filter((branch) =>
        branch.some((issue) => issue.path !== path),
      );
      if (inside.length === 0) {
        issues.push({
          path,
          message: `does not match any allowed shape, got ${describe(value)}`,
        });
      } else {
        issues.push(...inside.reduce((a, b) => (b.length < a.length ? b : a)));
      }
    }
  }
};

/** Validates `value` against `schema` (JSON Schema, subset) and returns every issue found. */
export const validateAgainst = (
  schema: JsonSchema,
  value: unknown,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  validateAt(schema, schema, value, '(root)', issues);
  return issues;
};
