// A pragmatic, non-spec-complete "JSON5-ish" lenient parser, used only when
// the user opts into the "Allow lenient JSON" toggle. It accepts a superset
// of strict JSON: `//` and `/* */` comments, trailing commas in objects and
// arrays, single-quoted strings, and unquoted (identifier-style) object
// keys. It does NOT implement the full JSON5 spec (no hex numbers, no
// leading `+`, no multi-line strings, no `Infinity`/`NaN`, etc.) — just the
// handful of leniencies people actually reach for when hand-editing JSON.
//
// This is a small hand-written recursive-descent parser (not a
// preprocessor-then-JSON.parse pipeline) so it can track line/column itself
// and report precise, 1-based error positions.

/** Thrown by `parseLenient` on malformed input, with a 1-based position. */
export class JsonParseError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(message);
    this.name = 'JsonParseError';
    this.line = line;
    this.column = column;
  }
}

interface Cursor {
  input: string;
  pos: number;
  line: number;
  column: number;
}

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$]/;
const DIGIT = /[0-9]/;

function peek(cursor: Cursor): string {
  return cursor.pos < cursor.input.length ? cursor.input[cursor.pos] : '';
}

function advance(cursor: Cursor): string {
  const ch = cursor.input[cursor.pos];
  cursor.pos += 1;
  if (ch === '\n') {
    cursor.line += 1;
    cursor.column = 1;
  } else {
    cursor.column += 1;
  }
  return ch ?? '';
}

function fail(cursor: Cursor, message: string): never {
  throw new JsonParseError(message, cursor.line, cursor.column);
}

function skipWhitespaceAndComments(cursor: Cursor): void {
  for (;;) {
    const ch = peek(cursor);
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      advance(cursor);
      continue;
    }
    if (ch === '/' && cursor.input[cursor.pos + 1] === '/') {
      while (cursor.pos < cursor.input.length && peek(cursor) !== '\n') advance(cursor);
      continue;
    }
    if (ch === '/' && cursor.input[cursor.pos + 1] === '*') {
      advance(cursor);
      advance(cursor);
      let closed = false;
      while (cursor.pos < cursor.input.length) {
        if (peek(cursor) === '*' && cursor.input[cursor.pos + 1] === '/') {
          advance(cursor);
          advance(cursor);
          closed = true;
          break;
        }
        advance(cursor);
      }
      if (!closed) fail(cursor, 'Unterminated comment');
      continue;
    }
    return;
  }
}

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  "'": "'",
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

function parseString(cursor: Cursor, quote: string): string {
  advance(cursor); // opening quote
  let result = '';
  for (;;) {
    if (cursor.pos >= cursor.input.length) fail(cursor, 'Unterminated string literal');
    const ch = peek(cursor);
    if (ch === quote) {
      advance(cursor);
      return result;
    }
    if (ch === '\n') fail(cursor, 'Unterminated string literal');
    if (ch === '\\') {
      advance(cursor); // backslash
      const esc = peek(cursor);
      if (esc === '') fail(cursor, 'Unterminated string literal');
      if (esc === 'u') {
        advance(cursor);
        let hex = '';
        for (let i = 0; i < 4; i++) {
          if (cursor.pos >= cursor.input.length) fail(cursor, 'Invalid unicode escape sequence');
          hex += peek(cursor);
          advance(cursor);
        }
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail(cursor, 'Invalid unicode escape sequence');
        result += String.fromCharCode(parseInt(hex, 16));
        continue;
      }
      const replacement = SIMPLE_ESCAPES[esc];
      if (replacement === undefined) fail(cursor, `Invalid escape character "\\${esc}"`);
      result += replacement;
      advance(cursor);
      continue;
    }
    result += ch;
    advance(cursor);
  }
}

function parseNumber(cursor: Cursor): number {
  const start = cursor.pos;
  if (peek(cursor) === '-') advance(cursor);
  if (peek(cursor) === '0') {
    advance(cursor);
  } else if (DIGIT.test(peek(cursor))) {
    while (DIGIT.test(peek(cursor))) advance(cursor);
  } else {
    fail(cursor, 'Invalid number');
  }
  if (peek(cursor) === '.') {
    advance(cursor);
    if (!DIGIT.test(peek(cursor))) fail(cursor, 'Invalid number');
    while (DIGIT.test(peek(cursor))) advance(cursor);
  }
  if (peek(cursor) === 'e' || peek(cursor) === 'E') {
    advance(cursor);
    if (peek(cursor) === '+' || peek(cursor) === '-') advance(cursor);
    if (!DIGIT.test(peek(cursor))) fail(cursor, 'Invalid number');
    while (DIGIT.test(peek(cursor))) advance(cursor);
  }
  return Number(cursor.input.slice(start, cursor.pos));
}

function consumeLiteral(cursor: Cursor, literal: string): void {
  for (let i = 0; i < literal.length; i++) advance(cursor);
}

function parseKey(cursor: Cursor): string {
  const ch = peek(cursor);
  if (ch === '"' || ch === "'") return parseString(cursor, ch);
  if (IDENTIFIER_START.test(ch)) {
    let key = '';
    while (IDENTIFIER_PART.test(peek(cursor))) key += advance(cursor);
    return key;
  }
  fail(cursor, 'Expected property key');
}

function parseObject(cursor: Cursor): Record<string, unknown> {
  advance(cursor); // {
  const result: Record<string, unknown> = {};
  skipWhitespaceAndComments(cursor);
  if (peek(cursor) === '}') {
    advance(cursor);
    return result;
  }
  for (;;) {
    skipWhitespaceAndComments(cursor);
    const key = parseKey(cursor);
    skipWhitespaceAndComments(cursor);
    if (peek(cursor) !== ':') fail(cursor, 'Expected ":" after property key');
    advance(cursor);
    skipWhitespaceAndComments(cursor);
    result[key] = parseValue(cursor);
    skipWhitespaceAndComments(cursor);
    const next = peek(cursor);
    if (next === ',') {
      advance(cursor);
      skipWhitespaceAndComments(cursor);
      if (peek(cursor) === '}') {
        advance(cursor); // trailing comma
        return result;
      }
      continue;
    }
    if (next === '}') {
      advance(cursor);
      return result;
    }
    fail(cursor, 'Expected "," or "}"');
  }
}

function parseArray(cursor: Cursor): unknown[] {
  advance(cursor); // [
  const result: unknown[] = [];
  skipWhitespaceAndComments(cursor);
  if (peek(cursor) === ']') {
    advance(cursor);
    return result;
  }
  for (;;) {
    skipWhitespaceAndComments(cursor);
    result.push(parseValue(cursor));
    skipWhitespaceAndComments(cursor);
    const next = peek(cursor);
    if (next === ',') {
      advance(cursor);
      skipWhitespaceAndComments(cursor);
      if (peek(cursor) === ']') {
        advance(cursor); // trailing comma
        return result;
      }
      continue;
    }
    if (next === ']') {
      advance(cursor);
      return result;
    }
    fail(cursor, 'Expected "," or "]"');
  }
}

function parseValue(cursor: Cursor): unknown {
  skipWhitespaceAndComments(cursor);
  const ch = peek(cursor);
  if (ch === '{') return parseObject(cursor);
  if (ch === '[') return parseArray(cursor);
  if (ch === '"' || ch === "'") return parseString(cursor, ch);
  if (ch === '-' || DIGIT.test(ch)) return parseNumber(cursor);
  if (cursor.input.startsWith('true', cursor.pos)) {
    consumeLiteral(cursor, 'true');
    return true;
  }
  if (cursor.input.startsWith('false', cursor.pos)) {
    consumeLiteral(cursor, 'false');
    return false;
  }
  if (cursor.input.startsWith('null', cursor.pos)) {
    consumeLiteral(cursor, 'null');
    return null;
  }
  if (ch === '') fail(cursor, 'Unexpected end of input');
  fail(cursor, `Unexpected token "${ch}"`);
}

/** Parses `input` leniently. Throws `JsonParseError` on malformed input. */
export function parseLenient(input: string): unknown {
  const cursor: Cursor = { input, pos: 0, line: 1, column: 1 };
  skipWhitespaceAndComments(cursor);
  if (cursor.pos >= cursor.input.length) fail(cursor, 'Unexpected end of input');
  const value = parseValue(cursor);
  skipWhitespaceAndComments(cursor);
  if (cursor.pos < cursor.input.length) {
    fail(cursor, `Unexpected trailing character "${peek(cursor)}"`);
  }
  return value;
}
