// Pure wrapper around `ajv` for validating parsed JSON data against a JSON
// Schema, supporting both draft-07 and 2020-12. Tool-specific.

import Ajv, { type ErrorObject, type Schema } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';

export interface SchemaValidationError {
  instancePath: string;
  message: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}

export type SchemaValidationOutcome =
  | { ok: true; result: SchemaValidationResult }
  | { ok: false; message: string };

function schemaDialect(schema: unknown): string {
  if (schema !== null && typeof schema === 'object' && '$schema' in schema) {
    const value = (schema as Record<string, unknown>).$schema;
    if (typeof value === 'string') return value;
  }
  return '';
}

/** Picks a draft-07 or 2020-12 Ajv instance based on the schema's `$schema`. Ajv itself defaults to draft-07 when `$schema` is unspecified. */
function createAjvInstance(schema: unknown): Ajv | Ajv2020 {
  const dialect = schemaDialect(schema);
  if (dialect.includes('2020-12')) {
    return new Ajv2020({ allErrors: true, strict: false });
  }
  return new Ajv({ allErrors: true, strict: false });
}

/** Validates `data` against `schema`. Returns a compile/schema error separately from validation errors. */
export function validateAgainstSchema(data: unknown, schema: unknown): SchemaValidationOutcome {
  let ajv: Ajv | Ajv2020;
  try {
    ajv = createAjvInstance(schema);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }

  let validate;
  try {
    validate = ajv.compile(schema as Schema);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }

  let valid: boolean;
  try {
    valid = Boolean(validate(data));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }

  const rawErrors: ErrorObject[] = validate.errors ?? [];
  const errors: SchemaValidationError[] = rawErrors.map((error) => ({
    instancePath: error.instancePath === '' ? '/' : error.instancePath,
    message: error.message ?? 'Invalid value',
  }));

  return { ok: true, result: { valid, errors } };
}
