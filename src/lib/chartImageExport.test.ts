import {
  buildChartImageFilename,
  CHART_EXPORT_EXCLUDE_ATTR,
  shouldIncludeInChartExport,
} from './chartImageExport';

describe('buildChartImageFilename', () => {
  it('uses a sanitized title when provided', () => {
    expect(
      buildChartImageFilename('My Chart: Test', 'bar', 'chart-123'),
    ).toBe('My Chart Test.png');
  });

  it('falls back to viz type and chart id when title is empty', () => {
    expect(buildChartImageFilename('', 'histogram', 'abcdef12-3456')).toBe(
      'chart-histogram-abcdef12.png',
    );
  });

  it('strips invalid filesystem characters', () => {
    expect(
      buildChartImageFilename('bad/name?*', 'scatter', 'chart-123'),
    ).toBe('badname.png');
  });
});

describe('shouldIncludeInChartExport', () => {
  it('includes regular elements', () => {
    const element = document.createElement('div');
    expect(shouldIncludeInChartExport(element)).toBe(true);
  });

  it('excludes elements marked with the export exclude attribute', () => {
    const element = document.createElement('div');
    element.setAttribute(CHART_EXPORT_EXCLUDE_ATTR, '');
    expect(shouldIncludeInChartExport(element)).toBe(false);
  });

  it('excludes descendants of marked export exclude containers', () => {
    const container = document.createElement('div');
    container.setAttribute(CHART_EXPORT_EXCLUDE_ATTR, '');
    const child = document.createElement('span');
    container.appendChild(child);
    expect(shouldIncludeInChartExport(child)).toBe(false);
  });

  it('includes non-element nodes', () => {
    const text = document.createTextNode('label');
    expect(shouldIncludeInChartExport(text)).toBe(true);
  });
});
