import * as d3 from 'd3';
import { getColumnTypes, getSupportedChartTypes } from './adapterUtils';
import { parseTsvFileToDsv } from './tsvFileParser';
import {
  clearParseTSVTraces,
  formatBytes,
  formatParseTSVTraces,
  getParseTSVTraces,
  ParseTSVError,
  peekTsvHeader,
  traceParseTSV,
} from './tsvAdapterDebug';

function getFeatureLevel(
  feature: string | undefined,
): GameData['featureLevel'] {
  if (!feature) {
    return 'unknown';
  }
  if (feature.includes('population')) {
    return 'population';
  }
  if (feature.includes('player')) {
    return 'player';
  }
  if (feature.includes('session')) {
    return 'session';
  }
  return 'unknown';
}

function parseOGDFilename(fileName: string) {
  const baseName = fileName.replace(/\.tsv$/i, '');
  const parts = baseName.split('_');
  if (parts.length < 6 || parts[2] !== 'to') {
    return null;
  }

  const [game, startDate, , endDate, OGDVersion, ...featureParts] = parts;
  const feature = featureParts.join('_');
  if (!feature) {
    return null;
  }

  return {
    game,
    startDate,
    endDate,
    OGDVersion,
    feature,
    featureLevel: getFeatureLevel(feature),
    filenameParts: parts,
  };
}

function throwParseError(message: string): never {
  const traceLog = formatParseTSVTraces();
  console.error('[parseTSV] FAILED:', message);
  console.log('[parseTSV] trace log:\n' + traceLog);
  console.groupEnd();
  throw new ParseTSVError(`${message}\n\n--- parseTSV trace ---\n${traceLog}`, [
    ...getParseTSVTraces(),
  ]);
}

export async function parseTSV(file: File) {
  clearParseTSVTraces();
  console.group('[parseTSV] parse run');
  traceParseTSV('start', {
    fileName: file.name,
    fileSize: file.size,
    fileSizeLabel: formatBytes(file.size),
    fileType: file.type || '(empty)',
    lastModified: file.lastModified
      ? new Date(file.lastModified).toISOString()
      : null,
  });

  const metadata = parseOGDFilename(file.name);
  if (!metadata) {
    const baseName = file.name.replace(/\.tsv$/i, '');
    traceParseTSV('filename_parse_failed', {
      baseName,
      parts: baseName.split('_'),
      expected:
        'GAME_YYYYMMDD_to_YYYYMMDD_HASH_feature.tsv (minimum 6 underscore segments)',
    });
    throwParseError(
      'Invalid OGD filename. Expected format: GAME_YYYYMMDD_to_YYYYMMDD_HASH_feature.tsv',
    );
  }

  const {
    game,
    startDate,
    endDate,
    OGDVersion,
    feature,
    featureLevel,
    filenameParts,
  } = metadata;
  const id = `${game}_${startDate}_to_${endDate}_${OGDVersion}_${featureLevel}`;

  traceParseTSV('filename_parsed', {
    game,
    startDate,
    endDate,
    OGDVersion,
    feature,
    featureLevel,
    datasetId: id,
    filenameParts,
  });

  const headerPeek = await peekTsvHeader(file);
  traceParseTSV('file_header_peek', headerPeek);

  if (file.size === 0) {
    throwParseError('TSV file is empty (0 bytes).');
  }

  if (!headerPeek.hasDataLineInPeek && file.size > 0) {
    traceParseTSV('warning_header_only_or_no_tabs', {
      hint: 'Peek found no data line after header. File may be header-only or not tab-separated.',
    });
  }

  const LARGE_FILE_BYTES = 100 * 1024 * 1024;
  if (file.size >= LARGE_FILE_BYTES) {
    traceParseTSV('large_file_warning', {
      fileSizeLabel: formatBytes(file.size),
      hint: 'Large files may take several minutes to load and can exceed browser memory limits.',
    });
  }

  let extractedData: d3.DSVParsedArray<object>;
  try {
    extractedData = await parseTsvFileToDsv(file);
  } catch (error) {
    throwParseError(
      `Failed to parse TSV file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!extractedData.length) {
    traceParseTSV('empty_parse_result', {
      columnsFromD3: extractedData.columns ?? [],
      headerPeek,
      hints: [
        'Parser returned 0 rows despite non-empty file header',
        'Check that the file uses tab separators and has a header row',
        'Very large files may fail during in-memory parsing',
      ],
    });
    throwParseError(
      'TSV file contains no data rows after parse. See console [parseTSV] trace for details.',
    );
  }

  traceParseTSV('inferring_column_types', { rowCount: extractedData.length });
  const columnTypes = getColumnTypes(extractedData);
  traceParseTSV('column_types_inferred', {
    columnCount: Object.keys(columnTypes).length,
    columnTypes,
  });

  const supportedChartTypes = getSupportedChartTypes(
    extractedData,
    featureLevel,
  );
  traceParseTSV('supported_charts_resolved', { supportedChartTypes });

  const dataset: GameData = {
    id,
    game,
    featureLevel,
    startDate,
    endDate,
    OGDVersion,
    source: 'file',
    data: extractedData,
    columnTypes: columnTypes as Record<string, ColumnType>,
    supportedChartTypes: supportedChartTypes,
  };

  traceParseTSV('success', {
    datasetId: id,
    rowCount: extractedData.length,
    featureLevel,
  });
  console.groupEnd();

  return dataset;
}

export { getFeatureLevel, parseOGDFilename };
