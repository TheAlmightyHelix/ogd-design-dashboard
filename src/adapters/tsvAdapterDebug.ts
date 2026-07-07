export interface ParseTSVTraceEntry {
  step: string;
  at: string;
  detail?: Record<string, unknown>;
}

const traces: ParseTSVTraceEntry[] = [];

export function clearParseTSVTraces(): void {
  traces.length = 0;
}

export function traceParseTSV(
  step: string,
  detail?: Record<string, unknown>,
): ParseTSVTraceEntry {
  const entry: ParseTSVTraceEntry = {
    step,
    at: new Date().toISOString(),
    ...(detail ? { detail } : {}),
  };
  traces.push(entry);
  if (detail) {
    console.log(`[parseTSV] ${step}`, detail);
  } else {
    console.log(`[parseTSV] ${step}`);
  }
  return entry;
}

export function getParseTSVTraces(): ParseTSVTraceEntry[] {
  return [...traces];
}

export function formatParseTSVTraces(): string {
  return traces
    .map((entry) => {
      const detail = entry.detail
        ? ` ${JSON.stringify(entry.detail)}`
        : '';
      return `[${entry.at}] ${entry.step}${detail}`;
    })
    .join('\n');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function analyzeTsvPeekText(
  text: string,
  fileSize: number,
  bytesPeeked: number,
): Record<string, unknown> {
  const lines = text.split(/\r?\n/).filter((line, index, all) => {
    if (line.length > 0) return true;
    return index < all.length - 1;
  });

  const headerLine = lines[0] ?? '';
  const firstDataLine = lines[1] ?? '';
  const tabCount = (headerLine.match(/\t/g) ?? []).length;

  return {
    fileSize,
    fileSizeLabel: formatBytes(fileSize),
    bytesPeeked,
    linesInPeek: lines.length,
    headerColumnCount: tabCount > 0 ? tabCount + 1 : headerLine ? 1 : 0,
    headerPreview: headerLine.slice(0, 240),
    firstDataPreview: firstDataLine.slice(0, 240),
    peekEndsMidLine:
      fileSize > bytesPeeked && !text.endsWith('\n') && !text.endsWith('\r'),
    hasDataLineInPeek: lines.length > 1 && firstDataLine.length > 0,
  };
}

export function validateTsvTextRead(
  fileSize: number,
  textLength: number,
): string | null {
  if (textLength === 0) {
    return 'File read returned empty text.';
  }

  // ASCII-heavy TSV bytes should map ~1:1 to string length.
  if (fileSize > 1024 && textLength < fileSize * 0.5) {
    return `File read appears incomplete (read ${textLength} characters of ${formatBytes(fileSize)}).`;
  }

  return null;
}

export async function readTsvFileText(
  file: File,
  trace: (step: string, detail?: Record<string, unknown>) => void,
): Promise<string> {
  const readStartedAt = performance.now();
  trace('file_text_read_start', {
    method: 'File.text()',
    fileSize: file.size,
    fileSizeLabel: formatBytes(file.size),
  });

  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    trace('file_text_read_failed', {
      durationMs: Math.round(performance.now() - readStartedAt),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const readValidationError = validateTsvTextRead(file.size, text.length);
  trace('file_text_read_complete', {
    durationMs: Math.round(performance.now() - readStartedAt),
    textLength: text.length,
    textLengthLabel: formatBytes(text.length),
    fileSize: file.size,
    lengthRatio:
      file.size > 0 ? Number((text.length / file.size).toFixed(4)) : 1,
    readValidationError,
  });

  if (readValidationError) {
    throw new Error(readValidationError);
  }

  return text;
}

export const DEFAULT_FILE_CHUNK_SIZE_BYTES = 16 * 1024 * 1024;

export async function readTsvFileTextChunked(
  file: File,
  trace: (step: string, detail?: Record<string, unknown>) => void,
  chunkSize = DEFAULT_FILE_CHUNK_SIZE_BYTES,
): Promise<string> {
  const readStartedAt = performance.now();
  const estimatedChunks = Math.ceil(file.size / chunkSize);

  trace('file_text_read_start', {
    method: 'File.slice().arrayBuffer() chunked',
    fileSize: file.size,
    fileSizeLabel: formatBytes(file.size),
    chunkSize,
    chunkSizeLabel: formatBytes(chunkSize),
    estimatedChunks,
    note: 'File.text() can return empty on very large files; reading in slices instead',
  });

  const parts: string[] = [];
  let offset = 0;
  let chunkIndex = 0;
  let lastChunkTraceAt = readStartedAt;

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const slice = file.slice(offset, end);
    const buffer = await slice.arrayBuffer();
    const chunkText = new TextDecoder('utf-8').decode(buffer);

    if (chunkText.length === 0 && end > offset) {
      throw new Error(
        `Chunk ${chunkIndex} (bytes ${offset}-${end}) decoded to empty text.`,
      );
    }

    parts.push(chunkText);
    offset = end;
    chunkIndex += 1;

    const now = performance.now();
    if (chunkIndex === 1 || now - lastChunkTraceAt >= 2000) {
      lastChunkTraceAt = now;
      trace('file_chunk_read', {
        chunkIndex,
        chunksRead: chunkIndex,
        bytesRead: offset,
        bytesReadLabel: formatBytes(offset),
        progressPct: Number(((offset / file.size) * 100).toFixed(1)),
      });
    }
  }

  const text = parts.join('');
  const readValidationError = validateTsvTextRead(file.size, text.length);
  trace('file_text_read_complete', {
    durationMs: Math.round(performance.now() - readStartedAt),
    method: 'chunked',
    chunksRead: chunkIndex,
    textLength: text.length,
    textLengthLabel: formatBytes(text.length),
    fileSize: file.size,
    lengthRatio:
      file.size > 0 ? Number((text.length / file.size).toFixed(4)) : 1,
    readValidationError,
  });

  if (readValidationError) {
    throw new Error(readValidationError);
  }

  return text;
}

export async function peekTsvHeader(
  file: File,
  maxBytes = 8192,
): Promise<Record<string, unknown>> {
  const bytesToRead = Math.min(file.size, maxBytes);
  const slice = file.slice(0, bytesToRead);
  const text =
    typeof slice.text === 'function'
      ? await slice.text()
      : (await file.text()).slice(0, bytesToRead);

  return analyzeTsvPeekText(text, file.size, bytesToRead);
}

export class ParseTSVError extends Error {
  readonly traces: ParseTSVTraceEntry[];

  constructor(message: string, traces: ParseTSVTraceEntry[]) {
    super(message);
    this.name = 'ParseTSVError';
    this.traces = traces;
  }
}
