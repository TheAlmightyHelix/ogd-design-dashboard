import {
  buildDashboardFromRecommendations,
  mergeChartsIntoDashboard,
  resolveFeatureColumn,
} from './buildDashboardFromRecommendations';
import type { FeatureRecommendation } from '../ai/schemas';

function makeDataset(overrides: Partial<GameData> = {}): GameData {
  return {
    id: 'test-dataset',
    game: 'test-game',
    featureLevel: 'player',
    startDate: '2024-01',
    endDate: '2024-01',
    OGDVersion: '1',
    source: 'api',
    data: [
      { Score: 10, Level: 'A' },
      { Score: 20, Level: 'B' },
      { Score: 30, Level: 'A' },
    ] as unknown as GameData['data'],
    columnTypes: {
      Score: 'Numeric',
      Level: 'Categorical',
    },
    supportedChartTypes: [
      'bar',
      'histogram',
      'scatter',
      'boxPlot',
      'descriptiveStatistics',
    ],
    ...overrides,
  };
}

describe('resolveFeatureColumn', () => {
  it('matches exact column names', () => {
    expect(resolveFeatureColumn('Score', ['Score', 'Level'])).toBe('Score');
  });

  it('matches iterated column names', () => {
    expect(resolveFeatureColumn('Score', ['1_Score', '2_Score', 'Level'])).toBe(
      '1_Score',
    );
  });

  it('returns null when no match', () => {
    expect(resolveFeatureColumn('Missing', ['Score'])).toBeNull();
  });
});

describe('buildDashboardFromRecommendations', () => {
  const recommendations: FeatureRecommendation[] = [
    {
      featureName: 'Score',
      rationale: 'Shows performance distribution',
      priority: 'primary',
    },
    {
      featureName: 'Level',
      rationale: 'Shows level breakdown',
      priority: 'secondary',
    },
  ];

  it('creates charts for resolved features', () => {
    const dataset = makeDataset();
    const result = buildDashboardFromRecommendations(dataset, recommendations);

    expect(result.chartCount).toBeGreaterThan(0);
    expect(Object.keys(result.charts).length).toBe(result.chartCount);
    expect(result.layout.length).toBe(result.chartCount);

    const chartConfigs = Object.values(result.charts);
    expect(chartConfigs.every((c) => c.datasetIds[0] === 'test-dataset')).toBe(
      true,
    );
    expect(chartConfigs.every((c) => c.options.showConfig === false)).toBe(
      true,
    );
  });

  it('warns when features do not match columns', () => {
    const dataset = makeDataset();
    const result = buildDashboardFromRecommendations(dataset, [
      {
        featureName: 'Nonexistent',
        rationale: 'N/A',
        priority: 'primary',
      },
    ]);

    expect(result.chartCount).toBe(0);
    expect(result.warnings.some((w) => w.includes('Nonexistent'))).toBe(true);
  });

  it('merges new charts after existing layout items', () => {
    const dataset = makeDataset();
    const built = buildDashboardFromRecommendations(dataset, [
      {
        featureName: 'Level',
        rationale: 'Breakdown',
        priority: 'primary',
      },
    ]);

    const merged = mergeChartsIntoDashboard(
      [{ i: 'existing', x: 0, y: 0, w: 4, h: 3 }],
      {
        existing: {
          id: 'existing',
          datasetIds: ['test-dataset'],
          vizType: 'bar',
          options: {},
        },
      },
      built,
    );

    expect(merged.layout).toHaveLength(1 + built.chartCount);
    const newItems = merged.layout.filter((l) => l.i !== 'existing');
    expect(newItems[0].y).toBeGreaterThanOrEqual(0);
    expect(newItems.some((l) => l.x >= 4 || l.y >= 3)).toBe(true);
  });
});
