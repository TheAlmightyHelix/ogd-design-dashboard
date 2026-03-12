import { VizTypeKey } from '../constants/vizTypes';
import { isGraphFeature } from '../utils/graphFeatureUtils';

export const getColumnTypes = (extractedData: d3.DSVParsedArray<object>) => {
  const columnTypes: Record<string, ColumnType> = {};
  if (Object.hasOwn(extractedData, '0')) {
    const firstRow = extractedData[0];
    for (const [key, value] of Object.entries(firstRow)) {
      if (isGraphFeature(value)) {
        columnTypes[key] = 'Graph';
      } else {
        columnTypes[key] =
          typeof value === 'number' ? 'Numeric' : 'Categorical';
      }
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

  const forceDirectedGraphSupported = Object.values(extractedData[0]).some(
    (column) => isGraphFeature(column),
  );

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
