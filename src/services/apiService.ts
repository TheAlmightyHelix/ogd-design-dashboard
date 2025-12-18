import axios from 'axios';
import { DSVParsedArray } from 'd3';

const BASE_URL =
  'https://ogd-staging.fielddaylab.wisc.edu/wsgi-bin/opengamedata/apis/ogd-api-files/main/app.wsgi';

interface GamesResponse {
  type: string;
  val: {
    game_ids: string[];
  };
  msg: string;
}
interface DatasetsResponse {
  type: string;
  val: {
    game_id: string;
    datasets: {
      year: number;
      month: number;
      total_sessions: number;
      sessions_file: string | null;
      players_file: string | null;
      population_file: string | null;
    }[];
  };
  msg: string;
}
export interface DatasetResponse {
  type: string;
  val: {
    rows: Record<string, any>[];
    columns: string[];
  };
  msg: string;
}

const apiService = {
  getGames: async () => {
    const response = await axios.get(`${BASE_URL}/games`);
    return response.data as GamesResponse;
  },
  getDatasets: async (gameId: string) => {
    const response = await axios.get(`${BASE_URL}/games/${gameId}/datasets`);
    return response.data as DatasetsResponse;
  },
  getDataset: async (
    gameId: string,
    month: string,
    year: string,
    level: string,
  ) => {
    const response = await axios.get(
      `${BASE_URL}/games/${gameId}/datasets/${year}/${month}/${level}`,
    );
    return response.data as DatasetResponse;
  },
};

export default apiService;
