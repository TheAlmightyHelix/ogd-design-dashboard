import { formatStatValue } from './formatStatValue';
import {
  formatDatetime,
  formatTimedeltaSeconds,
  parsePythonDatetimeString,
  parsePythonTimedeltaString,
} from './temporalUtils';

export function formatChartNumericValue(
  value: number | undefined | null,
  columnType: ColumnType | undefined,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (columnType === 'Timedelta') return formatTimedeltaSeconds(value);
  if (columnType === 'Datetime') return formatDatetime(new Date(value));
  return formatStatValue(value);
}

export function createNumericAxisFormatter(
  columnType: ColumnType | undefined,
): (value: d3.NumberValue) => string {
  return (value) => {
    const numericValue =
      typeof value === 'number' ? value : value.valueOf();
    return formatChartNumericValue(numericValue, columnType);
  };
}

export function isNumericChartColumn(
  columnType: ColumnType | undefined,
): boolean {
  return columnType === 'Numeric' || columnType === 'Timedelta';
}

export function isDatetimeChartColumn(
  columnType: ColumnType | undefined,
): boolean {
  return columnType === 'Datetime';
}

export function isBarChartColumn(
  columnType: ColumnType | undefined,
): boolean {
  return columnType === 'Categorical' || columnType === 'Ordinal';
}

export function getNumericFeatureValue(
  row: Record<string, unknown>,
  feature: string,
  columnType: ColumnType | undefined,
): number | null {
  const raw = row[feature];
  if (columnType === 'Numeric') {
    if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (columnType === 'Timedelta') {
    return parsePythonTimedeltaString(raw);
  }
  return null;
}

export function getDatetimeFeatureValue(
  row: Record<string, unknown>,
  feature: string,
  columnType: ColumnType | undefined,
): Date | null {
  if (columnType !== 'Datetime') return null;
  return parsePythonDatetimeString(row[feature]);
}

export function getNumericFeatureValues(
  data: Array<Record<string, unknown>>,
  feature: string,
  columnType: ColumnType | undefined,
): number[] {
  return data
    .map((row) => getNumericFeatureValue(row, feature, columnType))
    .filter((value): value is number => value != null && !Number.isNaN(value));
}

export function getFeatureOptionsForColumnTypes(
  columnTypes: Record<string, ColumnType>,
  allowedTypes: ColumnType[],
): Record<string, string> {
  const allowed = new Set(allowedTypes);
  return Object.fromEntries(
    Object.entries(columnTypes)
      .filter(([, type]) => allowed.has(type))
      .map(([key]) => [key, key]),
  );
}

export function getFilterNumericValues(
  data: Array<Record<string, unknown>>,
  feature: string,
  columnType: ColumnType | undefined,
): number[] {
  if (columnType === 'Datetime') {
    return data
      .map((row) => getDatetimeFeatureValue(row, feature, columnType)?.getTime())
      .filter((value): value is number => value != null && !Number.isNaN(value));
  }
  return getNumericFeatureValues(data, feature, columnType);
}

export function isNumericFilterColumn(
  columnType: ColumnType | undefined,
): boolean {
  return (
    columnType === 'Numeric' ||
    columnType === 'Timedelta' ||
    columnType === 'Datetime'
  );
}

export function isFilterableColumn(
  columnType: ColumnType | undefined,
): boolean {
  return (
    columnType === 'Categorical' ||
    columnType === 'Ordinal' ||
    isNumericFilterColumn(columnType)
  );
}
