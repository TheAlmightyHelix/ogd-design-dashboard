import * as d3 from 'd3';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }

  interface GameData {
    id: string;
    game: string;
    featureLevel: 'population' | 'player' | 'session' | 'unknown';
    startDate: string;
    endDate: string;
    OGDVersion: string;
    source: 'file' | 'api';
    data: d3.DSVRowArray<Object>;
    columnTypes: Record<string, ColumnType>;
    supportedChartTypes: VizTypeKey[];
    filters?: Record<string, FeatureFilter>;
    additionalDetails?: Record<string, any>;
    // Filtered dataset properties (added by getFilteredDataset)
    originalData?: d3.DSVRowArray<Object>;
    isFiltered?: boolean;
    filterInfo?: {
      totalRows: number;
      filteredRows: number;
      filterCount: number;
    };
  }

  type ColumnType =
    | 'Categorical'
    | 'Numeric'
    | 'Ordinal'
    | 'Time-series'
    | 'Graph';

  interface FeatureFilter {
    filterType: 'categorical' | 'numeric';
    // For categorical filters
    selectedCategories?: string[];
    // For numeric filters - multiple ranges (e.g., selected bins in histogram)
    ranges?: Array<{
      min: number;
      max: number;
    }>;
  }

  interface GameManifest {
    game_id: string;
    population: Record<string, any>;
    output: Record<string, any>;
    versioning: Record<string, any>;
    game_state: Record<string, any>;
    events: {
      event_name: string;
      description: string;
      event_data: Record<string, any>;
      module?: string;
    }[];
    features: {
      feature_name: string;
      module: string;
      description: string;
      return_type: string;
      aggregation_levels: string[];
    }[];
  }
}
