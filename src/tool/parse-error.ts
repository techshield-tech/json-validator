// Shared, framework-free helpers for turning a parse failure into a
// 1-based line/column and a highlighted source excerpt. Tool-specific.

export interface LineColumn {
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  column: number;
}

/** Converts a 0-based character offset into `input` to a 1-based line/column. */
export function lineColumnAtOffset(input: string, offset: number): LineColumn {
  const end = Math.max(0, Math.min(offset, input.length));
  let line = 1;
  let column = 1;
  for (let i = 0; i < end; i++) {
    if (input[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

export interface StrictErrorInfo {
  /** The raw error message. */
  message: string;
  /** 1-based line number, or null if it could not be determined. */
  line: number | null;
  /** 1-based column number, or null if it could not be determined. */
  column: number | null;
}

/**
 * Extracts line/column info from a strict `JSON.parse` `SyntaxError`.
 *
 * V8-based engines throw messages like:
 *   "Unexpected token o in JSON at position 4"
 *   "Unexpected non-whitespace character after JSON at position 10 (line 2 column 1)"
 * Newer V8 versions already include "(line X column Y)"; that's used
 * directly when present, and otherwise the `position` offset is converted
 * into a 1-based line/column by scanning `input`. Engines whose message
 * contains neither are handled gracefully by returning null line/column
 * alongside the raw message.
 */
export function describeStrictJsonError(error: unknown, input: string): StrictErrorInfo {
  const message = error instanceof Error ? error.message : String(error);

  const lineColumnMatch = message.match(/line (\d+) column (\d+)/i);
  if (lineColumnMatch) {
    return {
      message,
      line: Number(lineColumnMatch[1]),
      column: Number(lineColumnMatch[2]),
    };
  }

  const positionMatch = message.match(/position (\d+)/i);
  if (positionMatch) {
    const { line, column } = lineColumnAtOffset(input, Number(positionMatch[1]));
    return { message, line, column };
  }

  return { message, line: null, column: null };
}

export interface ExcerptLine {
  lineNumber: number;
  text: string;
  isErrorLine: boolean;
}

export interface ErrorExcerpt {
  lines: ExcerptLine[];
  /** 1-based column the caret marker should point at, if known. */
  column: number | null;
}

/**
 * Builds a small window of source lines around `line`, for display with the
 * error line highlighted and a caret marker under `column`.
 */
export function buildErrorExcerpt(
  input: string,
  line: number,
  column: number | null,
  contextLines = 2,
): ErrorExcerpt {
  const allLines = input.split('\n');
  const start = Math.max(1, line - contextLines);
  const end = Math.min(allLines.length, line + contextLines);
  const lines: ExcerptLine[] = [];
  for (let lineNumber = start; lineNumber <= end; lineNumber++) {
    lines.push({
      lineNumber,
      text: allLines[lineNumber - 1] ?? '',
      isErrorLine: lineNumber === line,
    });
  }
  return { lines, column };
}
