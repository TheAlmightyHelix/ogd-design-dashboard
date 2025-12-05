import { DatasetResponse } from '../services/apiService';
import { getColumnTypes, getSupportedChartTypes } from './adapterUtils';

export function normalizeApiResponse(
  responseBody: DatasetResponse,
  selectedGame: string,
  selectedDataset: string,
  level: 'population' | 'player' | 'session',
) {
  const extractedData = responseBody.val;

  const dataset: GameData = {
    id: `${selectedGame}_${selectedDataset}_${selectedDataset}_api_${level}`,
    game: selectedGame,
    featureLevel: level,
    startDate: selectedDataset,
    endDate: selectedDataset,
    OGDVersion: 'api',
    source: 'api',
    data: extractedData,
    columnTypes: getColumnTypes(extractedData),
    supportedChartTypes: getSupportedChartTypes(extractedData, level),
  };

  return dataset;
}
