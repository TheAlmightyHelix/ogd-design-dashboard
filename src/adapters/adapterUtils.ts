import { VizTypeKey } from '../constants/vizTypes';
import { isGraphFeature } from '../utils/graphFeatureUtils';

function columnHasGraphFeature(
  extractedData: d3.DSVParsedArray<object>,
  column: string,
): boolean {
  if (!extractedData || typeof extractedData.length !== 'number') {
    return false;
  }

  for (let i = 0; i < extractedData.length; i++) {
    const row = extractedData[i] as Record<string, unknown>;
    if (isGraphFeature(row[column])) return true;
  }
  return false;
}

function datasetHasGraphFeature(
  extractedData: d3.DSVParsedArray<object>,
): boolean {
  if (!extractedData || typeof extractedData.length !== 'number') {
    return false;
  }

  const columns =
    (extractedData.columns as string[] | undefined) ??
    (extractedData[0] ? Object.keys(extractedData[0]) : []);

  return columns.some((column) =>
    columnHasGraphFeature(extractedData, column),
  );
}

export const getColumnTypes = (extractedData: d3.DSVParsedArray<object>) => {
  const columnTypes: Record<string, ColumnType> = {};
  const columns =
    (extractedData.columns as string[] | undefined) ??
    (extractedData[0] ? Object.keys(extractedData[0]) : []);
  const firstRow = extractedData[0] as Record<string, unknown> | undefined;

  for (const key of columns) {
    if (columnHasGraphFeature(extractedData, key)) {
      columnTypes[key] = 'Graph';
    } else {
      const firstValue = firstRow?.[key];
      columnTypes[key] =
        typeof firstValue === 'number' ? 'Numeric' : 'Categorical';
    }
  }

  return columnTypes;
};

export const getSupportedChartTypes = (
  extractedData: d3.DSVParsedArray<object>,
  featureLevel: GameData['featureLevel'],
) => {
  const supportedChartTypes = ['descriptiveStatistics'] as VizTypeKey[];
  const columns = extractedData.columns as string[];

  // Job Graph specific features
  const jobGraphFeatures = [
    'ActiveJobs',
    'TopJobSwitchDestinations',
    'TopJobCompletionDestinations',
  ];
  const jobGraphSubfeatures = [
    'JobsAttempted-percent-complete',
    'JobsAttempted-num-completes',
    'JobsAttempted-num-starts',
    'JobsAttempted-job-name',
    'JobsAttempted-avg-time-per-attempt',
    'JobsAttempted-std-dev-per-attempt',
  ];

  const jobGraphFeaturesSupported = jobGraphFeatures.some((feature) =>
    columns.some((column) => column.includes(feature)),
  );

  const jobGraphSubfeaturesSupported = jobGraphSubfeatures.every((subfeature) =>
    columns.some((column) => column.includes(subfeature)),
  );

  const forceDirectedGraphSupported = datasetHasGraphFeature(extractedData);

  if (featureLevel === 'population') {
    if (forceDirectedGraphSupported) {
      supportedChartTypes.push('forceDirectedGraph');
    }
    if (jobGraphFeaturesSupported && jobGraphSubfeaturesSupported) {
      supportedChartTypes.push('jobGraph');
    }
    if (forceDirectedGraphSupported || (jobGraphFeaturesSupported && jobGraphSubfeaturesSupported)) {
      supportedChartTypes.push('sankey');
    }
  }

  if (featureLevel === 'player' || featureLevel === 'session') {
    supportedChartTypes.push('bar');
    supportedChartTypes.push('histogram');
    supportedChartTypes.push('scatter');
    supportedChartTypes.push('boxPlot');
    supportedChartTypes.push('datasetComparison');
    if (forceDirectedGraphSupported) {
      supportedChartTypes.push('forceDirectedGraph');
      supportedChartTypes.push('sankey');
    }
  }

  return supportedChartTypes;
};

const JOB_GRAPH_FEATURES = [
  'ActiveJobs',
  'TopJobSwitchDestinations',
  'TopJobCompletionDestinations',
];
const JOB_GRAPH_SUBFEATURES = [
  'JobsAttempted-percent-complete',
  'JobsAttempted-num-completes',
  'JobsAttempted-num-starts',
  'JobsAttempted-job-name',
  'JobsAttempted-avg-time-per-attempt',
  'JobsAttempted-std-dev-per-attempt',
];

export function hasGraphFeatureSupport(dataset: GameData): boolean {
  return Object.values(dataset.columnTypes).includes('Graph');
}

export function hasJobGraphSupport(dataset: GameData): boolean {
  const columns =
    (dataset.data as unknown as { columns?: string[] })?.columns ??
    Object.keys(dataset.columnTypes);
  const featuresSupported = JOB_GRAPH_FEATURES.some((f) =>
    columns.some((c) => c.includes(f)),
  );
  const subfeaturesSupported = JOB_GRAPH_SUBFEATURES.every((s) =>
    columns.some((c) => c.includes(s)),
  );
  return featuresSupported && subfeaturesSupported;
}
