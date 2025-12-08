import * as d3 from 'd3';
import { getColumnTypes, getSupportedChartTypes } from './adapterUtils';

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
