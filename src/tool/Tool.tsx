import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Button, ErrorBox, Panel, TextArea, Toolbar } from '@mmoall/tool-kit';
import { parseJsonInput } from './json-parse';
import { buildErrorExcerpt, type ErrorExcerpt } from './parse-error';
import { computeJsonStats, utf8ByteSize, type JsonStats } from './json-stats';
import { validateAgainstSchema, type SchemaValidationOutcome } from './json-schema-validate';
import { SAMPLE_JSON, SAMPLE_SCHEMA } from './sample';

interface EmptyState {
  kind: 'empty';
}

interface InvalidState {
  kind: 'invalid';
  message: string;
  line: number | null;
  column: number | null;
}

interface ValidDataState {
  kind: 'valid';
  value: unknown;
  stats: JsonStats;
}

interface ParsedSchemaState {
  kind: 'parsed';
  value: unknown;
}

type DataState = EmptyState | InvalidState | ValidDataState;
type SchemaState = EmptyState | InvalidState | ParsedSchemaState;

function computeDataState(input: string, lenient: boolean): DataState {
  if (input.trim() === '') return { kind: 'empty' };
  const result = parseJsonInput(input, { lenient });
  if (result.ok) {
    return { kind: 'valid', value: result.value, stats: computeJsonStats(result.value, input) };
  }
  return { kind: 'invalid', message: result.message, line: result.line, column: result.column };
}

function computeSchemaState(input: string, lenient: boolean): SchemaState {
  if (input.trim() === '') return { kind: 'empty' };
  const result = parseJsonInput(input, { lenient });
  if (result.ok) {
    return { kind: 'parsed', value: result.value };
  }
  return { kind: 'invalid', message: result.message, line: result.line, column: result.column };
}

function ParseErrorDetails({ input, state }: { input: string; state: InvalidState }) {
  const excerpt: ErrorExcerpt | null =
    state.line !== null ? buildErrorExcerpt(input, state.line, state.column) : null;

  return (
    <div className="flex flex-col gap-2">
      <ErrorBox>
        {state.message}
        {state.line !== null && state.column !== null
          ? ` (line ${state.line}, column ${state.column})`
          : ''}
      </ErrorBox>
      {excerpt && (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] font-mono text-xs">
          {excerpt.lines.map((line) => (
            <div
              key={line.lineNumber}
              className={`flex gap-3 px-2 py-0.5 ${
                line.isErrorLine ? 'bg-[var(--color-danger-bg)]' : ''
              }`}
            >
              <span className="w-8 shrink-0 select-none text-right text-[var(--color-muted)]">
                {line.lineNumber}
              </span>
              <span
                className={`whitespace-pre ${
                  line.isErrorLine ? 'text-[var(--color-danger)]' : ''
                }`}
              >
                {line.text.length > 0 ? line.text : ' '}
              </span>
            </div>
          ))}
          {excerpt.column !== null && (
            <div className="flex gap-3 px-2 py-0.5">
              <span className="w-8 shrink-0" aria-hidden="true" />
              <span className="whitespace-pre text-[var(--color-danger)]" aria-hidden="true">
                {' '.repeat(Math.max(0, excerpt.column - 1))}^
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className="text-sm font-semibold text-[var(--color-fg)]">{value}</div>
    </div>
  );
}

function SuccessBox({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-fg)]"
    >
      {children}
    </div>
  );
}

function SchemaValidationView({
  dataState,
  outcome,
}: {
  dataState: DataState;
  outcome: SchemaValidationOutcome;
}) {
  if (dataState.kind !== 'valid') {
    return <ErrorBox>Fix the JSON data error above before schema validation can run.</ErrorBox>;
  }
  if (!outcome.ok) {
    return <ErrorBox>Schema error: {outcome.message}</ErrorBox>;
  }
  if (outcome.result.valid) {
    return <SuccessBox>✓ Data matches schema</SuccessBox>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {outcome.result.errors.map((error, index) => (
        <li
          key={`${error.instancePath}-${index}`}
          className="rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]"
        >
          <code className="font-mono">{error.instancePath}</code> — {error.message}
        </li>
      ))}
    </ul>
  );
}

export function Tool() {
  const [dataInput, setDataInput] = useState('');
  const [schemaInput, setSchemaInput] = useState('');
  const [lenient, setLenient] = useState(false);

  const dataState = useMemo(() => computeDataState(dataInput, lenient), [dataInput, lenient]);
  const schemaState = useMemo(
    () => computeSchemaState(schemaInput, lenient),
    [schemaInput, lenient],
  );

  const schemaOutcome = useMemo<SchemaValidationOutcome | null>(() => {
    if (dataState.kind === 'empty' || schemaState.kind !== 'parsed') return null;
    if (dataState.kind !== 'valid') return null;
    return validateAgainstSchema(dataState.value, schemaState.value);
  }, [dataState, schemaState]);

  const dataBytes = useMemo(() => utf8ByteSize(dataInput), [dataInput]);
  const schemaBytes = useMemo(() => utf8ByteSize(schemaInput), [schemaInput]);

  const handleClearAll = useCallback(() => {
    setDataInput('');
    setSchemaInput('');
  }, []);

  const handleLoadSampleData = useCallback(() => {
    setDataInput(SAMPLE_JSON);
  }, []);

  const handleLoadSampleSchema = useCallback(() => {
    setSchemaInput(SAMPLE_SCHEMA);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Toolbar>
        <label className="flex items-center gap-1.5 text-sm text-[var(--color-fg)]">
          <input
            type="checkbox"
            checked={lenient}
            onChange={(event) => setLenient(event.target.checked)}
          />
          Allow lenient JSON (JSON5-ish)
        </label>
        <Button variant="ghost" onClick={handleClearAll}>
          Clear all
        </Button>
      </Toolbar>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel
          title="JSON data"
          actions={
            <>
              <span className="text-xs text-[var(--color-muted)]">{dataBytes} bytes</span>
              <Button variant="ghost" onClick={handleLoadSampleData}>
                Load sample
              </Button>
            </>
          }
        >
          <TextArea
            aria-label="JSON data input"
            value={dataInput}
            onChange={(event) => setDataInput(event.target.value)}
            placeholder="Paste JSON here…"
            className="min-h-[220px]"
          />
        </Panel>

        <Panel
          title="JSON Schema (optional)"
          actions={
            <>
              <span className="text-xs text-[var(--color-muted)]">{schemaBytes} bytes</span>
              <Button variant="ghost" onClick={handleLoadSampleSchema}>
                Load sample
              </Button>
            </>
          }
        >
          <TextArea
            aria-label="JSON Schema input"
            value={schemaInput}
            onChange={(event) => setSchemaInput(event.target.value)}
            placeholder="Paste a JSON Schema here to validate the data above against it…"
            className="min-h-[220px]"
          />
        </Panel>
      </div>

      {dataState.kind === 'invalid' && <ParseErrorDetails input={dataInput} state={dataState} />}

      {dataState.kind === 'valid' && (
        <div className="flex flex-col gap-2">
          <SuccessBox>✓ Valid JSON</SuccessBox>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Type" value={dataState.stats.type} />
            <StatTile
              label={dataState.stats.type === 'array' ? 'Elements' : 'Keys'}
              value={dataState.stats.count ?? '—'}
            />
            <StatTile label="Max depth" value={dataState.stats.maxDepth} />
            <StatTile label="Size" value={`${dataState.stats.byteSize} bytes`} />
          </div>
        </div>
      )}

      {schemaState.kind === 'invalid' && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-fg)]">Schema validation</h2>
          <ParseErrorDetails input={schemaInput} state={schemaState} />
        </div>
      )}

      {schemaOutcome && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-fg)]">Schema validation</h2>
          <SchemaValidationView dataState={dataState} outcome={schemaOutcome} />
        </div>
      )}
    </div>
  );
}
