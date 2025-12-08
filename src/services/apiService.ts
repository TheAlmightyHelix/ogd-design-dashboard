import axios from 'axios';
import { DSVParsedArray } from 'd3';

const BASE_URL =
  // 'https://ogd-staging.fielddaylab.wisc.edu/wsgi-bin/opengamedata/apis/ogd-api-files/main/app.wsgi';
  'https://ogd-staging.fielddaylab.wisc.edu/wsgi-bin/opengamedata/apis/ogd-api-files/issue/63-update-structure-for-file-content-endpoint/app.wsgi';

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
interface DatasetMetadataResponse {
  type: string;
  val: {
    first_year: number;
    first_month: number;
    last_year: number;
    last_month: number;
    raw_file: string;
    events_file: string | null;
    sessions_file: string;
    players_file: string;
    population_file: string;
    events_template: string;
    sessions_template: string;
    players_template: string;
    population_template: string;
    events_codespace: string;
    sessions_codespace: string;
    players_codespace: string;
    detectors_link: string;
    features_link: string;
    found_matching_range: boolean;
  };
  msg: string;
}
export interface DatasetResponse {
  type: string;
  val: {
    rows: object[];
    columns: string[];
  };
  msg: string;
}

const apiService = {
  getGames: async () => {
    const response = await axios.get(`${BASE_URL}/games/list`);
    return response.data as GamesResponse;
  },
  getDatasets: async (gameId: string) => {
    const response = await axios.get(
      `${BASE_URL}/games/${gameId}/datasets/list`,
    );
    return response.data as DatasetsResponse;
  },
  // getDatasetMetadata: async (gameId: string, month: string, year: string) => {
  //   const response = await axios.get(
  //     `${BASE_URL}/games/${gameId}/datasets/${month}/${year}/files`,
  //   );
  //   return response.data as DatasetMetadataResponse;
  // },
  getDataset: async (
    gameId: string,
    month: string,
    year: string,
    level: string,
  ) => {
    const response = await axios.get(
      `${BASE_URL}/games/${gameId}/datasets/${month}/${year}/files/${level}`,
    );
    return response.data as DatasetResponse;
  },
};

export default apiService;
