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
interface GameManifestResponse {
  type: string;
  val: {
    manifest: Record<string, any>;
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
  getGameManifest: async (gameName: string) => {
    // const response = await axios.get(`${BASE_URL}/games/${gameName}/manifest`);
    const response = await axios.get(
      `https://ogd-staging.fielddaylab.wisc.edu/wsgi-bin/opengamedata/apis/ogd-api-files/issue/82-placeholder-endpoint-for-dataset-manifests/app.wsgi/games/AQUALAB/datasets/2025/01/manifest`,
    );
    const manifest = response.data as GameManifestResponse;
    console.log(manifest.val.schema.features);
    return manifest.val.schema.features;
  },
  getDatasets: async (gameName: string) => {
    const response = await axios.get(`${BASE_URL}/games/${gameName}/datasets`);
    return response.data as DatasetsResponse;
  },
  getDataset: async (
    gameName: string,
    month: string,
    year: string,
    level: string,
  ) => {
    const response = await axios.get(
      `${BASE_URL}/games/${gameName}/datasets/${year}/${month}/${level}`,
    );
    return response.data as DatasetResponse;
  },
};

export default apiService;
