import { VizTypeKey } from '../../constants/vizTypes';

export type NumericRange = { min: number; max: number };

export type BarChartOptions = {
  feature: string;
  filter?: string[];
  showConfig?: boolean;
};

export type HistogramChartOptions = {
  feature: string;
  binCount?: number;
  showConfig?: boolean;
};

export type ScatterChartOptions = {
  xFeature: string;
  yFeature: string;
  xRangeFilter?: NumericRange;
  yRangeFilter?: NumericRange;
  regressionLine?: 'none' | 'linear' | 'quadratic' | 'exponential' | 'logarithmic';
  showConfig?: boolean;
};

export type BoxPlotChartOptions = {
  feature: string;
  showConfig?: boolean;
};

export type DescriptiveStatisticsChartOptions = {
  feature: string;
  measureSelected?: string;
  showConfig?: boolean;
};

export type GraphChartOptions = {
  feature?: string;
  edgeMode?: string;
  dataSourceMode?: string;
  showConfig?: boolean;
};

export type ChartOptionsByVizType = {
  bar: BarChartOptions;
  histogram: HistogramChartOptions;
  scatter: ScatterChartOptions;
  boxPlot: BoxPlotChartOptions;
  descriptiveStatistics: DescriptiveStatisticsChartOptions;
  forceDirectedGraph: GraphChartOptions;
  jobGraph: GraphChartOptions;
  sankey: GraphChartOptions;
};

const SUPPORTED_VIZ_TYPES: VizTypeKey[] = [
  'bar',
  'histogram',
  'scatter',
  'boxPlot',
  'descriptiveStatistics',
  'forceDirectedGraph',
  'jobGraph',
  'sankey',
];

export function isSupportedAiVizType(vizType: string): vizType is VizTypeKey {
  return SUPPORTED_VIZ_TYPES.includes(vizType as VizTypeKey);
}

export function defaultOptionsForVizType(
  vizType: VizTypeKey,
  partial: Record<string, unknown>,
): Record<string, unknown> {
  const base = { showConfig: false, ...partial };
  switch (vizType) {
    case 'bar':
      return { filter: [], ...base };
    case 'histogram':
      return { binCount: 10, ...base };
    case 'scatter':
      return {
        xRangeFilter: { min: -Infinity, max: Infinity },
        yRangeFilter: { min: -Infinity, max: Infinity },
        regressionLine: 'none',
        ...base,
      };
    case 'descriptiveStatistics':
      return { measureSelected: 'mean', ...base };
    default:
      return base;
  }
}
