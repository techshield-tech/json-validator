// Unifies strict (`JSON.parse`) and lenient parsing behind one result type,
// so the UI doesn't need to know which parser ran. Tool-specific.

import { JsonParseError, parseLenient } from './lenient-json';
import { describeStrictJsonError } from './parse-error';

export interface JsonParseOptions {
  /** When true, accepts trailing commas, comments, single-quoted strings, and unquoted keys. */
  lenient: boolean;
}

export interface JsonParseSuccess {
  ok: true;
  value: unknown;
}

export interface JsonParseFailure {
  ok: false;
  message: string;
  /** 1-based line number, or null if it could not be determined. */
  line: number | null;
  /** 1-based column number, or null if it could not be determined. */
  column: number | null;
}

export type JsonParseResult = JsonParseSuccess | JsonParseFailure;

/** Parses `input` as JSON, either strictly (standard `JSON.parse`) or leniently. */
export function parseJsonInput(input: string, options: JsonParseOptions): JsonParseResult {
  if (options.lenient) {
    try {
      return { ok: true, value: parseLenient(input) };
    } catch (error) {
      if (error instanceof JsonParseError) {
        return { ok: false, message: error.message, line: error.line, column: error.column };
      }
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        line: null,
        column: null,
      };
    }
  }

  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    const info = describeStrictJsonError(error, input);
    return { ok: false, message: info.message, line: info.line, column: info.column };
  }
}
