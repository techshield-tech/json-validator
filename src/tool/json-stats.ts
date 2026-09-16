// Pure stats computed for a successfully-parsed JSON value. Tool-specific.

export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JsonStats {
  /** The JSON type of the root value. */
  type: JsonValueType;
  /** Key count for an object root, element count for an array root; null otherwise. */
  count: number | null;
  /** Maximum nesting depth. A scalar root is depth 0; an empty object/array is depth 1. */
  maxDepth: number;
  /** UTF-8 byte length of the raw input string (not the parsed value). */
  byteSize: number;
}

function typeOfJsonValue(value: unknown): JsonValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'null';
  }
}

function maxDepthOf(value: unknown): number {
  if (Array.isArray(value)) {
    if (value.length === 0) return 1;
    let deepest = 0;
    for (const item of value) {
      const depth = maxDepthOf(item);
      if (depth > deepest) deepest = depth;
    }
    return 1 + deepest;
  }
  if (value !== null && typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>);
    if (values.length === 0) return 1;
    let deepest = 0;
    for (const item of values) {
      const depth = maxDepthOf(item);
      if (depth > deepest) deepest = depth;
    }
    return 1 + deepest;
  }
  return 0;
}

/** UTF-8 byte length of a string (not its character/UTF-16 code unit length). */
export function utf8ByteSize(input: string): number {
  return new TextEncoder().encode(input).length;
}

/** Computes display stats for a successfully-parsed JSON value. */
export function computeJsonStats(value: unknown, rawInput: string): JsonStats {
  const type = typeOfJsonValue(value);
  let count: number | null = null;
  if (type === 'object') {
    count = Object.keys(value as Record<string, unknown>).length;
  } else if (type === 'array') {
    count = (value as unknown[]).length;
  }
  return {
    type,
    count,
    maxDepth: maxDepthOf(value),
    byteSize: utf8ByteSize(rawInput),
  };
}
