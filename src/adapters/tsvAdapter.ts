import * as d3 from 'd3';
import { VizTypeKey } from '../constants/vizTypes';

export async function parseTSV(file: File) {
  // e.g. AQUALAB_20250107_to_20250107_6ee74c3_population-features.tsv
  const [game, startDate, _, endDate, OGDVersion, feature] =
    file.name.split('_');
  const featureLevel = getFeatureLevel(feature);
  const id = `${game}_${startDate}_to_${endDate}_${OGDVersion}_${featureLevel}`;

  const url = URL.createObjectURL(file);
  const extractedData = await d3.tsv(url, d3.autoType);

  const columnTypes = getColumnTypes(extractedData);

  const supportedChartTypes = getSupportedChartTypes(
    extractedData,
    featureLevel,
  );

  const dataset: GameData = {
    id,
    game,
    featureLevel,
    startDate,
    endDate,
    OGDVersion,
    source: 'file',
    data: extractedData,
    // Fix type for columnTypes to match expected type in GameData
    columnTypes: columnTypes as Record<string, ColumnType>,
    supportedChartTypes: supportedChartTypes,
  };

  return dataset;
}

const getFeatureLevel = (feature: string) => {
  if (feature.includes('population')) {
    return 'population';
  } else if (feature.includes('player')) {
    return 'player';
  } else if (feature.includes('session')) {
    return 'session';
  }
  return 'unknown';
};

const getColumnTypes = (extractedData: d3.DSVParsedArray<object>) => {
  const columnTypes: Record<string, ColumnType> = {};
  if (Object.hasOwn(extractedData, '0')) {
    const firstRow = extractedData[0];
    for (const [key, value] of Object.entries(firstRow)) {
      columnTypes[key] = typeof value === 'number' ? 'Numeric' : 'Categorical';
    }
  }
  return columnTypes;
};

const getSupportedChartTypes = (
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

  if (
    featureLevel === 'population' &&
    jobGraphFeaturesSupported &&
    jobGraphSubfeaturesSupported
  ) {
    supportedChartTypes.push('jobGraph');
    supportedChartTypes.push('sankey');
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
