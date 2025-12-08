import { DSVParsedArray } from 'd3';
import { DatasetResponse } from '../services/apiService';
import { getColumnTypes, getSupportedChartTypes } from './adapterUtils';

export function normalizeApiResponse(
  responseBody: DatasetResponse,
  selectedGame: string,
  selectedDataset: string,
  level: 'population' | 'player' | 'session',
) {
  // Convert the rows and columns to a DSVParsedArray
  const data = Object.assign(responseBody.val.rows, {
    columns: responseBody.val.columns,
  }) as DSVParsedArray<object>;

  const dataset: GameData = {
    id: generateAPIDatasetID(selectedGame, selectedDataset, level),
    game: selectedGame,
    featureLevel: level,
    startDate: selectedDataset,
    endDate: selectedDataset,
    OGDVersion: 'api',
    source: 'api',
    data: data,
    columnTypes: getColumnTypes(data),
    supportedChartTypes: getSupportedChartTypes(data, level),
  };

  return dataset;
}

export function generateAPIDatasetID(
  game: string,
  dataset: string,
  level: 'population' | 'player' | 'session',
) {
  return `${game}_${dataset}_${dataset}_api_${level}`;
}
