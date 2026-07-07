import {
  columnHasDatetimeValues,
  columnHasTimedeltaValues,
  formatDatetime,
  formatTimedeltaSeconds,
  isPythonDatetimeString,
  isPythonTimedeltaString,
  parsePythonDatetimeString,
  parsePythonTimedeltaString,
} from './temporalUtils';

describe('temporalUtils', () => {
  describe('isPythonTimedeltaString', () => {
    it('accepts HMS and days-comma-time formats from BLOOM', () => {
      expect(isPythonTimedeltaString('0:20:09.847000')).toBe(true);
      expect(isPythonTimedeltaString('0:00:00')).toBe(true);
      expect(isPythonTimedeltaString('-14 days, 16:54:00.097000')).toBe(true);
      expect(isPythonTimedeltaString('1 day, 21:22:57.180000')).toBe(true);
      expect(isPythonTimedeltaString('30 days, 12:42:01.603000')).toBe(true);
    });

    it('rejects non-timedelta strings', () => {
      expect(isPythonTimedeltaString('IN_PROGRESS')).toBe(false);
      expect(isPythonTimedeltaString('1298.361')).toBe(false);
      expect(isPythonTimedeltaString('2024-01-15 10:30:00.123456')).toBe(false);
    });
  });

  describe('isPythonDatetimeString', () => {
    it('accepts Python datetime str format', () => {
      expect(isPythonDatetimeString('2024-01-15 10:30:00.123456')).toBe(true);
      expect(isPythonDatetimeString('2026-05-01 00:00:00')).toBe(true);
    });

    it('accepts ISO 8601 datetime strings from event logs', () => {
      expect(
        isPythonDatetimeString('2025-09-29T23:07:23.842000+00:00'),
      ).toBe(true);
      expect(
        isPythonDatetimeString('2025-09-30T15:19:15.482000+00:00'),
      ).toBe(true);
      expect(isPythonDatetimeString('2025-09-30T10:19:19+00:00')).toBe(true);
      expect(isPythonDatetimeString('2025-09-30T10:19:19Z')).toBe(true);
    });

    it('rejects non-datetime strings', () => {
      expect(isPythonDatetimeString('click_new_game')).toBe(false);
      expect(isPythonDatetimeString('25092917072021073')).toBe(false);
    });
  });

  describe('parsePythonTimedeltaString', () => {
    it('parses HMS values to seconds', () => {
      expect(parsePythonTimedeltaString('0:20:09.847000')).toBeCloseTo(
        1209.847,
        3,
      );
      expect(parsePythonTimedeltaString('0:00:00')).toBe(0);
    });

    it('parses negative and multi-day timedeltas', () => {
      expect(parsePythonTimedeltaString('1 day, 21:22:57.180000')).toBeCloseTo(
        163377.18,
        2,
      );
      expect(parsePythonTimedeltaString('-14 days, 16:54:00.097000')).toBeLessThan(
        0,
      );
    });
  });

  describe('parsePythonDatetimeString', () => {
    it('parses Python datetime strings', () => {
      const date = parsePythonDatetimeString('2024-01-15 10:30:00.123456');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });

    it('parses ISO 8601 datetime strings', () => {
      const date = parsePythonDatetimeString('2025-09-29T23:07:23.842000+00:00');
      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString()).toBe('2025-09-29T23:07:23.842Z');
    });

    it('accepts Date objects from d3 autoType', () => {
      const input = new Date('2025-09-29T23:07:23.842Z');
      expect(parsePythonDatetimeString(input)).toBe(input);
      expect(isPythonDatetimeString(input)).toBe(true);
    });
  });

  describe('formatters', () => {
    it('formats timedelta seconds back to readable durations', () => {
      expect(formatTimedeltaSeconds(1209.847)).toBe('0:20:09.847');
      expect(formatTimedeltaSeconds(86400 + 3729.847)).toBe(
        '1 day, 1:02:09.847',
      );
    });

    it('formats datetime values', () => {
      const formatted = formatDatetime(new Date(2024, 0, 15, 10, 30, 0, 123));
      expect(formatted).toBe('2024-01-15 10:30:00.123000');
    });
  });

  describe('column detection', () => {
    function makeParsedData(rows: object[]) {
      return Object.assign(rows, {
        columns: Object.keys(rows[0] ?? {}),
      }) as unknown as Parameters<typeof columnHasTimedeltaValues>[0];
    }

    it('detects timedelta columns across rows', () => {
      const data = makeParsedData([
        { ActiveTime: '0:00:00' },
        { ActiveTime: '0:20:09.847000' },
      ]);
      expect(columnHasTimedeltaValues(data, 'ActiveTime')).toBe(true);
    });

    it('detects datetime columns', () => {
      const data = makeParsedData([
        { EventTime: '2024-01-15 10:30:00.123456' },
        { EventTime: '2026-05-01 00:00:00' },
      ]);
      expect(columnHasDatetimeValues(data, 'EventTime')).toBe(true);
    });

    it('detects ISO datetime columns from event logs', () => {
      const data = makeParsedData([
        { timestamp: '2025-09-29T23:07:23.842000+00:00' },
        { timestamp: '2025-09-30T15:19:15.482000+00:00' },
      ]);
      expect(columnHasDatetimeValues(data, 'timestamp')).toBe(true);
    });

    it('rejects mixed columns', () => {
      const data = makeParsedData([
        { Mixed: '0:20:09.847000' },
        { Mixed: 'beginner' },
      ]);
      expect(columnHasTimedeltaValues(data, 'Mixed')).toBe(false);
    });
  });
});
