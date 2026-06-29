import { v4 as uuidv4 } from 'uuid';
import type { Layout } from 'react-grid-layout';
import { VizTypeKey } from '../../constants/vizTypes';
import {
  hasGraphFeatureSupport,
} from '../../adapters/adapterUtils';
import type { ChartConfig } from '../../store/useLayoutStore';
import type { FeatureRecommendation } from '../ai/schemas';
import {
  defaultOptionsForVizType,
  isSupportedAiVizType,
  type NumericRange,
} from './chartOptionSchemas';

const MAX_CHARTS = 8;
const MAX_COLS = 12;
const DEFAULT_CHART_WIDTH = 4;
const DEFAULT_CHART_HEIGHT = 3;

export interface BuildDashboardResult {
  layout: Layout[];
  charts: Record<string, ChartConfig>;
  warnings: string[];
  chartCount: number;
}

export function resolveFeatureColumn(
  featureName: string,
  columns: string[],
): string | null {
  if (columns.includes(featureName)) return featureName;

  const suffix = `_${featureName}`;
  const iterated = columns.filter((c) => c.endsWith(suffix) || c === featureName);
  if (iterated.length > 0) {
    return iterated.sort()[0];
  }

  const partial = columns.find(
    (c) =>
      c.includes(featureName) &&
      (c === featureName || c.endsWith(`_${featureName}`)),
  );
  return partial ?? null;
}

function getColumns(dataset: GameData): string[] {
  const dataColumns = (dataset.data as unknown as { columns?: string[] })
    ?.columns;
  if (dataColumns?.length) return dataColumns;
  return Object.keys(dataset.columnTypes);
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function getNumericExtent(
  dataset: GameData,
  column: string,
): NumericRange | null {
  const values: number[] = [];
  for (const row of dataset.data) {
    const v = Number((row as Record<string, unknown>)[column]);
    if (!Number.isNaN(v)) values.push(v);
  }
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const p5 = quantile(sorted, 0.05);
  const p95 = quantile(sorted, 0.95);
  return { min: p5, max: p95 };
}

function pickVizTypeForColumn(
  column: string,
  columnType: ColumnType,
  dataset: GameData,
  returnType?: string,
): VizTypeKey | null {
  const supported = dataset.supportedChartTypes;

  if (
    columnType === 'Graph' &&
    (dataset.featureLevel === 'player' || dataset.featureLevel === 'session')
  ) {
    if (supported.includes('forceDirectedGraph')) return 'forceDirectedGraph';
    if (supported.includes('sankey')) return 'sankey';
  }

  if (columnType === 'Categorical' || columnType === 'Ordinal') {
    if (supported.includes('bar')) return 'bar';
  }

  if (columnType === 'Numeric') {
    const rt = (returnType ?? '').toLowerCase();
    if (rt.includes('distribution') || rt.includes('histogram')) {
      if (supported.includes('histogram')) return 'histogram';
    }
    if (supported.includes('histogram')) return 'histogram';
    if (supported.includes('boxPlot')) return 'boxPlot';
    if (supported.includes('descriptiveStatistics'))
      return 'descriptiveStatistics';
  }

  if (supported.includes('descriptiveStatistics'))
    return 'descriptiveStatistics';

  return null;
}

function buildGridLayout(chartCount: number): Layout[] {
  const layout: Layout[] = [];
  let x = 0;
  let y = 0;

  for (let i = 0; i < chartCount; i++) {
    const id = uuidv4();
    if (x + DEFAULT_CHART_WIDTH > MAX_COLS) {
      x = 0;
      y += DEFAULT_CHART_HEIGHT;
    }
    layout.push({
      i: id,
      x,
      y,
      w: DEFAULT_CHART_WIDTH,
      h: DEFAULT_CHART_HEIGHT,
    });
    x += DEFAULT_CHART_WIDTH;
  }

  return layout;
}

interface PlannedChart {
  vizType: VizTypeKey;
  title: string;
  options: Record<string, unknown>;
}

export function buildDashboardFromRecommendations(
  dataset: GameData,
  recommendations: FeatureRecommendation[],
  manifestReturnTypes?: Record<string, string>,
): BuildDashboardResult {
  const warnings: string[] = [];
  const columns = getColumns(dataset);
  const sorted = [...recommendations].sort((a, b) => {
    if (a.priority === b.priority) return 0;
    return a.priority === 'primary' ? -1 : 1;
  });

  const resolved: Array<{
    rec: FeatureRecommendation;
    column: string;
    columnType: ColumnType;
  }> = [];

  for (const rec of sorted) {
    const column = resolveFeatureColumn(rec.featureName, columns);
    if (!column) {
      warnings.push(`Skipped "${rec.featureName}": no matching column in dataset.`);
      continue;
    }
    const columnType = dataset.columnTypes[column];
    if (!columnType) {
      warnings.push(`Skipped "${rec.featureName}": unknown column type.`);
      continue;
    }
    resolved.push({ rec, column, columnType });
  }

  const planned: PlannedChart[] = [];
  const usedColumns = new Set<string>();

  const numericResolved = resolved.filter((r) => r.columnType === 'Numeric');
  if (
    numericResolved.length >= 2 &&
    dataset.supportedChartTypes.includes('scatter')
  ) {
    const [first, second] = numericResolved;
    if (!usedColumns.has(first.column) && !usedColumns.has(second.column)) {
      const xRange = getNumericExtent(dataset, first.column);
      const yRange = getNumericExtent(dataset, second.column);
      planned.push({
        vizType: 'scatter',
        title: `${first.rec.featureName} vs ${second.rec.featureName}`,
        options: defaultOptionsForVizType('scatter', {
          xFeature: first.column,
          yFeature: second.column,
          ...(xRange ? { xRangeFilter: xRange } : {}),
          ...(yRange ? { yRangeFilter: yRange } : {}),
        }),
      });
      usedColumns.add(first.column);
      usedColumns.add(second.column);
    }
  }

  if (
    (dataset.featureLevel === 'player' ||
      dataset.featureLevel === 'session') &&
    hasGraphFeatureSupport(dataset) &&
    !planned.some((p) => p.vizType === 'forceDirectedGraph')
  ) {
    const graphCol = columns.find((c) => dataset.columnTypes[c] === 'Graph');
    if (graphCol && dataset.supportedChartTypes.includes('forceDirectedGraph')) {
      planned.push({
        vizType: 'forceDirectedGraph',
        title: 'Player progression graph',
        options: defaultOptionsForVizType('forceDirectedGraph', {
          feature: graphCol,
        }),
      });
      usedColumns.add(graphCol);
    }
  }

  for (const { rec, column, columnType } of resolved) {
    if (planned.length >= MAX_CHARTS) break;
    if (usedColumns.has(column)) continue;

    const returnType = manifestReturnTypes?.[rec.featureName];
    const vizType = pickVizTypeForColumn(column, columnType, dataset, returnType);

    if (!vizType || !isSupportedAiVizType(vizType)) {
      warnings.push(`Skipped "${rec.featureName}": no supported chart type.`);
      continue;
    }

    if (!dataset.supportedChartTypes.includes(vizType)) {
      warnings.push(
        `Skipped "${rec.featureName}": chart type "${vizType}" not supported for this dataset.`,
      );
      continue;
    }

    const options: Record<string, unknown> = {};
    if (vizType === 'scatter') {
      continue;
    } else if (vizType === 'bar' || vizType === 'histogram' || vizType === 'boxPlot' || vizType === 'descriptiveStatistics') {
      Object.assign(options, defaultOptionsForVizType(vizType, { feature: column }));
      if (vizType === 'histogram') {
        const range = getNumericExtent(dataset, column);
        if (range) {
          options.rangeFilter = range;
        }
      }
    } else {
      Object.assign(
        options,
        defaultOptionsForVizType(vizType, { feature: column }),
      );
    }

    planned.push({
      vizType,
      title: rec.featureName,
      options,
    });
    usedColumns.add(column);
  }

  const capped = planned.slice(0, MAX_CHARTS);
  const gridLayout = buildGridLayout(capped.length);
  const charts: Record<string, ChartConfig> = {};

  capped.forEach((plan, index) => {
    const gridItem = gridLayout[index];
    charts[gridItem.i] = {
      id: gridItem.i,
      datasetIds: [dataset.id],
      vizType: plan.vizType,
      title: plan.title,
      options: plan.options,
    };
  });

  if (capped.length === 0) {
    warnings.push('No charts could be created from the recommendations.');
  }

  return {
    layout: gridLayout,
    charts,
    warnings,
    chartCount: capped.length,
  };
}

/** Place incoming charts after existing grid items (same rules as GridLayout spawn). */
export function mergeChartsIntoDashboard(
  existingLayout: Layout[],
  existingCharts: Record<string, ChartConfig>,
  incoming: Pick<BuildDashboardResult, 'layout' | 'charts' | 'warnings'>,
): BuildDashboardResult {
  const warnings = [...incoming.warnings];
  let startX = 0;
  let startY = 0;

  if (existingLayout.length > 0) {
    const bottomRow = Math.max(...existingLayout.map((item) => item.y + item.h));
    let rightmostX = 0;
    existingLayout.forEach((item) => {
      if (item.y + item.h === bottomRow) {
        rightmostX = Math.max(rightmostX, item.x + item.w);
      }
    });
    startX = rightmostX;
    startY = bottomRow;
    if (startX + DEFAULT_CHART_WIDTH > MAX_COLS) {
      startX = 0;
      startY = bottomRow;
    }
  }

  let x = startX;
  let y = startY;
  const mergedLayout: Layout[] = [...existingLayout];
  const mergedCharts: Record<string, ChartConfig> = { ...existingCharts };

  for (const item of incoming.layout) {
    const w = item.w ?? DEFAULT_CHART_WIDTH;
    const h = item.h ?? DEFAULT_CHART_HEIGHT;
    if (x + w > MAX_COLS) {
      x = 0;
      y += DEFAULT_CHART_HEIGHT;
    }
    mergedLayout.push({ ...item, x, y, w, h });
    const chart = incoming.charts[item.i];
    if (chart) {
      mergedCharts[item.i] = chart;
    }
    x += w;
  }

  const chartCount = Object.keys(incoming.charts).length;
  return {
    layout: mergedLayout,
    charts: mergedCharts,
    warnings,
    chartCount,
  };
}
