import * as d3 from 'd3';
import Papa from 'papaparse';
import {
  formatBytes,
  readTsvFileText,
  readTsvFileTextChunked,
  traceParseTSV,
  validateTsvTextRead,
} from './tsvAdapterDebug';

/** Above this size, browsers often return empty text from File.text(). */
export const CHUNKED_READ_THRESHOLD_BYTES = 16 * 1024 * 1024;

/** Above this size, stream-parse with Papa to avoid a giant intermediate string. */
export const STREAM_PARSE_THRESHOLD_BYTES = 16 * 1024 * 1024;

export function autoTypeRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const typed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    typed[key] =
      typeof value === 'string' || value == null
        ? d3.autoType(value as string)
        : value;
  }
  return typed;
}

function parseTsvText(text: string): d3.DSVParsedArray<object> {
  return d3.tsvParse(text, d3.autoType);
}

async function readFullTsvText(file: File): Promise<string> {
  if (file.size > CHUNKED_READ_THRESHOLD_BYTES) {
    return readTsvFileTextChunked(file, traceParseTSV);
  }
  return readTsvFileText(file, traceParseTSV);
}

async function parseTsvViaText(file: File): Promise<d3.DSVParsedArray<object>> {
  const text = await readFullTsvText(file);
  const parseStartedAt = performance.now();
  try {
    const extractedData = parseTsvText(text);
    traceParseTSV('d3.tsvParse_complete', {
      method: 'd3.tsvParse',
      durationMs: Math.round(performance.now() - parseStartedAt),
      textLength: text.length,
      rowCount: extractedData.length,
      columnCount: extractedData.columns?.length ?? 0,
      columns: extractedData.columns ?? [],
    });
    return extractedData;
  } catch (error) {
    traceParseTSV('d3.tsvParse_threw', {
      durationMs: Math.round(performance.now() - parseStartedAt),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function parseTsvViaPapaStream(
  file: File,
): Promise<d3.DSVParsedArray<object>> {
  const parseStartedAt = performance.now();
  const chunkReadSize = 4 * 1024 * 1024;

  traceParseTSV('papa_stream_parse_start', {
    method: 'Papa.parse(file) streaming',
    fileSize: file.size,
    fileSizeLabel: formatBytes(file.size),
    chunkSize: chunkReadSize,
    chunkSizeLabel: formatBytes(chunkReadSize),
    note: 'Reads file in chunks via FileReader — avoids File.text() limits on huge files',
  });

  return new Promise((resolve, reject) => {
    const rows: object[] = [];
    let columns: string[] = [];
    let chunksProcessed = 0;
    let lastChunkTraceAt = performance.now();

    Papa.parse(file, {
      delimiter: '\t',
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      chunkSize: chunkReadSize,
      chunk(results, parser) {
        chunksProcessed += 1;
        if (columns.length === 0 && results.meta.fields?.length) {
          columns = results.meta.fields;
        }

        for (const row of results.data as Record<string, unknown>[]) {
          if (!row || Object.keys(row).length === 0) continue;
          rows.push(autoTypeRow(row));
        }

        const now = performance.now();
        if (chunksProcessed === 1 || now - lastChunkTraceAt >= 2000) {
          lastChunkTraceAt = now;
          traceParseTSV('papa_stream_chunk', {
            chunksProcessed,
            rowsSoFar: rows.length,
            elapsedMs: Math.round(now - parseStartedAt),
          });
        }

        if (results.errors.length > 0) {
          const firstError = results.errors[0];
          parser.abort();
          reject(
            new Error(
              `TSV parse error at row ${firstError.row ?? '?'}: ${firstError.message}`,
            ),
          );
        }
      },
      complete() {
        const data = Object.assign(rows, { columns }) as d3.DSVParsedArray<object>;
        traceParseTSV('papa_stream_parse_complete', {
          durationMs: Math.round(performance.now() - parseStartedAt),
          chunksProcessed,
          rowCount: data.length,
          columnCount: columns.length,
          columns,
        });
        resolve(data);
      },
      error(error: Error) {
        traceParseTSV('papa_stream_parse_failed', {
          durationMs: Math.round(performance.now() - parseStartedAt),
          error: error.message,
        });
        reject(error);
      },
    });
  });
}

export async function parseTsvFileToDsv(
  file: File,
): Promise<d3.DSVParsedArray<object>> {
  if (file.size > STREAM_PARSE_THRESHOLD_BYTES) {
    return parseTsvViaPapaStream(file);
  }
  return parseTsvViaText(file);
}
