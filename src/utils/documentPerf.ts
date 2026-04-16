export interface DocumentPerfTrace {
  traceId: string;
  path: string;
  source: string;
  startedAt: number;
  lastAt: number;
}

interface DocumentPerfLogPayload {
  event: string;
  path: string;
  traceId?: string;
  source?: string;
  sinceStartMs?: number;
  sinceLastMs?: number;
  [key: string]: unknown;
}

const PERF_LOG_PREFIX = "[perf:doc]";
const SOURCE_HINT_TTL_MS = 5_000;

const activeDocumentTraces = new Map<string, DocumentPerfTrace>();
const documentSourceHints = new Map<string, { source: string; createdAt: number }>();

let documentTraceSequence = 0;
let documentRequestSequence = 0;

function nowMs() {
  return globalThis.performance?.now() ?? Date.now();
}

function roundMs(value: number) {
  return Number(value.toFixed(2));
}

function emitDocumentPerfLog(payload: DocumentPerfLogPayload) {
  console.info(PERF_LOG_PREFIX, payload);
}

export function createDocumentPerfRequestId() {
  documentRequestSequence += 1;
  return `req-${documentRequestSequence}`;
}

export function setDocumentPerfSourceHint(path: string, source: string) {
  documentSourceHints.set(path, { source, createdAt: nowMs() });
}

export function consumeDocumentPerfSourceHint(path: string) {
  const hint = documentSourceHints.get(path);
  if (!hint) {
    return null;
  }

  documentSourceHints.delete(path);
  if (nowMs() - hint.createdAt > SOURCE_HINT_TTL_MS) {
    return null;
  }

  return hint.source;
}

export function peekDocumentPerfTrace(path: string) {
  return activeDocumentTraces.get(path);
}

export function beginDocumentPerfTrace(path: string, source: string) {
  documentTraceSequence += 1;
  const startedAt = nowMs();
  const trace: DocumentPerfTrace = {
    traceId: `trace-${documentTraceSequence}`,
    path,
    source,
    startedAt,
    lastAt: startedAt,
  };
  activeDocumentTraces.set(path, trace);
  return trace;
}

export function logDocumentPerfStep(
  event: string,
  details: { path: string; trace?: DocumentPerfTrace } & Record<string, unknown>,
) {
  const trace = details.trace ?? activeDocumentTraces.get(details.path);
  const timestamp = nowMs();

  emitDocumentPerfLog({
    event,
    path: details.path,
    traceId: trace?.traceId,
    source: trace?.source,
    sinceStartMs: trace ? roundMs(timestamp - trace.startedAt) : undefined,
    sinceLastMs: trace ? roundMs(timestamp - trace.lastAt) : undefined,
    ...Object.fromEntries(
      Object.entries(details).filter(([key]) => key !== "trace" && key !== "path"),
    ),
  });

  if (trace) {
    trace.lastAt = timestamp;
    activeDocumentTraces.set(trace.path, trace);
  }
}

export function finishDocumentPerfTrace(
  path: string,
  event: string,
  details: Record<string, unknown> = {},
) {
  logDocumentPerfStep(event, { path, ...details });
  activeDocumentTraces.delete(path);
}
