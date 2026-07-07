/**
 * Python default str() formats for timedelta and datetime from the OGD pipeline.
 * timedelta: "H:MM:SS.ffffff" or "DD day(s), H:MM:SS.ffffff"
 * datetime:  "YYYY-MM-DD HH:MM:SS.ffffff" or ISO 8601 "YYYY-MM-DDTHH:MM:SS[.ffffff][Z|±offset]"
 */

const PYTHON_TIMEDELTA_HMS =
  /^(-?\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/;
const PYTHON_TIMEDELTA_DAYS =
  /^(-?\d+) days?, (-?\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/;
const PYTHON_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/;
const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

const NULLISH = new Set(['', 'null', 'None', 'undefined']);
const INFERENCE_MAX_ROWS = 2000;

function iterateInferenceRows(
  extractedData: d3.DSVParsedArray<object>,
  visit: (row: Record<string, unknown>) => boolean | void,
): boolean {
  const length = extractedData.length;
  if (!length) return false;

  const limit = Math.min(length, INFERENCE_MAX_ROWS);
  for (let i = 0; i < limit; i++) {
    if (visit(extractedData[i] as Record<string, unknown>) === false) {
      return false;
    }
  }

  if (length > limit) {
    const stride = Math.max(1, Math.floor((length - limit) / limit));
    for (let i = limit; i < length; i += stride) {
      if (visit(extractedData[i] as Record<string, unknown>) === false) {
        return false;
      }
    }
  }

  return true;
}

function isNullish(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') {
    return NULLISH.has(value.trim());
  }
  return false;
}

function fractionalSeconds(fraction: string | undefined): number {
  if (!fraction) return 0;
  const normalized = fraction.padEnd(6, '0').slice(0, 6);
  return Number(normalized) / 1_000_000;
}

function hmsToSeconds(
  hours: number,
  minutes: number,
  seconds: number,
  fraction: string | undefined,
): number {
  const sign = hours < 0 || minutes < 0 || seconds < 0 ? -1 : 1;
  const absHours = Math.abs(hours);
  const absMinutes = Math.abs(minutes);
  const absSeconds = Math.abs(seconds);
  return (
    sign *
    (absHours * 3600 + absMinutes * 60 + absSeconds + fractionalSeconds(fraction))
  );
}

export function isPythonTimedeltaString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    PYTHON_TIMEDELTA_HMS.test(trimmed) || PYTHON_TIMEDELTA_DAYS.test(trimmed)
  );
}

export function isPythonDatetimeString(value: unknown): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return PYTHON_DATETIME.test(trimmed) || ISO_DATETIME.test(trimmed);
}

export function isDatetimeValue(value: unknown): boolean {
  return isPythonDatetimeString(value);
}

export function parsePythonTimedeltaString(value: unknown): number | null {
  if (!isPythonTimedeltaString(value)) return null;
  const trimmed = (value as string).trim();

  const daysMatch = trimmed.match(PYTHON_TIMEDELTA_DAYS);
  if (daysMatch) {
    const days = Number(daysMatch[1]);
    const hours = Number(daysMatch[2]);
    const minutes = Number(daysMatch[3]);
    const seconds = Number(daysMatch[4]);
    const fraction = daysMatch[5];
    return days * 86_400 + hmsToSeconds(hours, minutes, seconds, fraction);
  }

  const hmsMatch = trimmed.match(PYTHON_TIMEDELTA_HMS);
  if (!hmsMatch) return null;
  const hours = Number(hmsMatch[1]);
  const minutes = Number(hmsMatch[2]);
  const seconds = Number(hmsMatch[3]);
  const fraction = hmsMatch[4];
  return hmsToSeconds(hours, minutes, seconds, fraction);
}

export function parsePythonDatetimeString(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (!isPythonDatetimeString(value)) return null;
  const trimmed = (value as string).trim();

  if (ISO_DATETIME.test(trimmed)) {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  const match = trimmed.match(PYTHON_DATETIME);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  const seconds = Number(match[6]);
  const fraction = match[7];
  const ms = fraction
    ? Math.round(fractionalSeconds(fraction) * 1000)
    : 0;

  const date = new Date(year, month - 1, day, hours, minutes, seconds, ms);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function padFraction(value: number, digits = 6): string {
  const fraction = Math.abs(value % 1);
  const scaled = Math.round(fraction * 10 ** digits);
  return scaled.toString().padStart(digits, '0').replace(/0+$/, '') || '0';
}

function formatHms(
  totalSeconds: number,
  includeFraction = true,
): string {
  const sign = totalSeconds < 0 ? '-' : '';
  let remaining = Math.abs(totalSeconds);
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const fraction = remaining % 1;

  let result = `${sign}${hours}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
  if (includeFraction && fraction > 0) {
    result += `.${padFraction(fraction)}`;
  }
  return result;
}

export function formatTimedeltaSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';

  const sign = seconds < 0 ? '-' : '';
  const absSeconds = Math.abs(seconds);
  const days = Math.floor(absSeconds / 86_400);
  const remainder = absSeconds - days * 86_400;

  if (days === 0) {
    return formatHms(seconds);
  }

  const dayLabel = days === 1 || days === -1 ? 'day' : 'days';
  const hms = formatHms(sign === '-' ? -remainder : remainder);
  return `${sign}${days} ${dayLabel}, ${hms.replace(/^-/, '')}`;
}

export function formatDatetime(date: Date): string {
  if (Number.isNaN(date.getTime())) return '—';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = date.getMilliseconds();
  if (ms > 0) {
    const fraction = String(ms).padStart(3, '0').padEnd(6, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${fraction}`;
  }
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function columnHasTimedeltaValues(
  extractedData: d3.DSVParsedArray<object>,
  column: string,
): boolean {
  if (!extractedData || typeof extractedData.length !== 'number') {
    return false;
  }

  let hasValue = false;
  const isValid = iterateInferenceRows(extractedData, (row) => {
    const value = row[column];
    if (isNullish(value)) return;
    if (typeof value === 'number') return false;
    if (!isPythonTimedeltaString(value)) return false;
    hasValue = true;
  });
  return isValid && hasValue;
}

export function columnHasDatetimeValues(
  extractedData: d3.DSVParsedArray<object>,
  column: string,
): boolean {
  if (!extractedData || typeof extractedData.length !== 'number') {
    return false;
  }

  let hasValue = false;
  const isValid = iterateInferenceRows(extractedData, (row) => {
    const value = row[column];
    if (isNullish(value)) return;
    if (typeof value === 'number') return false;
    if (!isDatetimeValue(value)) return false;
    hasValue = true;
  });
  return isValid && hasValue;
}
