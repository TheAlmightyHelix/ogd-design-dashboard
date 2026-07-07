import {
  getNumericFeatureValue,
  isNumericChartColumn,
} from './columnValueUtils';

describe('columnValueUtils', () => {
  it('parses timedelta strings for numeric chart access', () => {
    const row = { ActiveTime: '0:20:09.847000' };
    expect(
      getNumericFeatureValue(row, 'ActiveTime', 'Timedelta'),
    ).toBeCloseTo(1209.847, 3);
  });

  it('returns numeric values for Numeric columns', () => {
    const row = { Score: 12.5 };
    expect(getNumericFeatureValue(row, 'Score', 'Numeric')).toBe(12.5);
  });

  it('identifies numeric chart columns', () => {
    expect(isNumericChartColumn('Numeric')).toBe(true);
    expect(isNumericChartColumn('Timedelta')).toBe(true);
    expect(isNumericChartColumn('Datetime')).toBe(false);
  });
});
