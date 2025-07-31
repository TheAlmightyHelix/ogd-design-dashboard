export const VizType = {
  bar: 'Bar Chart',
  histogram: 'Histogram',
  scatter: 'Scatter Plot',
  timeline: 'Timeline',
  jobGraph: 'Job Graph',
  descriptiveStatistics: 'Descriptive Statistics',
  boxPlot: 'Box Plot',
  sankey: 'Sankey Diagram',
  datasetComparison: 'Dataset Comparison',
} as const;

export type VizTypeKey = keyof typeof VizType;
