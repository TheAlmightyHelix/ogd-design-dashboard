import { VizTypeKey } from '../constants/vizTypes';

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

const isGraphFeature = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;

  try {
    const parsed = JSON.parse(value);
    return ['nodes', 'links', 'encodings'].every((key) => key in parsed);
  } catch {
    return false;
  }
};
