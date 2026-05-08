import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { openDB } from 'idb';
import { applyFilters } from '../components/sidebar/data-management/filterUtils';

interface DataStore {
  // states
  datasets: Record<string, GameData>;
  gameManifests: {
    [gameId: string]: { [year: string]: { [month: string]: GameManifest } };
  };
  hasHydrated: boolean;
  // actions
  addDataset: (dataset: GameData) => void;
  getGameManifest: (
    gameId: string,
    year: string,
    month: string,
  ) => GameManifest | undefined;
  removeDataset: (id: string) => void;
  getDatasetByID: (id: string) => GameData | undefined;
  addGameManifest: (
    gameId: string,
    year: string,
    month: string,
    manifest: GameManifest,
  ) => void;
  getFilteredDataset: (id: string) => GameData | undefined;
  hasDataset: (id: string) => boolean;
  lookupDatasets: (
    game?: string,
    startDate?: string,
    endDate?: string,
    featureLevel?: string,
  ) => GameData[];
  setHasHydrated: (value: boolean) => void;
  updateDatasetColumnType: (
    id: string,
    feature: string,
    datatype: string,
  ) => void;
  // Filter management
  addFilter: (
    datasetId: string,
    featureName: string,
    filter: FeatureFilter,
  ) => void;
  removeFilter: (datasetId: string, featureName: string) => void;
  updateFilter: (
    datasetId: string,
    featureName: string,
    filter: FeatureFilter,
  ) => void;
}

// IndexedDB storage for larger datasets - only initialize in browser
const dbPromise =
  typeof window !== 'undefined'
    ? openDB('ogd-data-store', 1, {
        upgrade(db) {
          db.createObjectStore('store');
        },
      })
    : null;

type PersistedDataSlice = Pick<
  DataStore,
  'datasets' | 'gameManifests' | 'hasHydrated'
>;

const idbStorage: PersistStorage<PersistedDataSlice> = {
  getItem: async (name: string) => {
    if (!dbPromise) return null;
    try {
      const db = await dbPromise;
      const item = await db.get('store', name);
      console.log(
        '🔍 Attempting to load from idb:',
        name,
        item ? 'Found data' : 'No data found',
      );
      return item ?? null;
    } catch (error) {
      console.warn('Failed to read from idb:', error);
      return null;
    }
  },
  setItem: async (name: string, value: any) => {
    if (!dbPromise) return;
    try {
      const db = await dbPromise;
      await db.put('store', value, name);
      console.log('✅ Successfully saved to idb');
    } catch (error) {
      console.error('Failed to write to idb:', error);
    }
  },
  removeItem: async (name: string) => {
    if (!dbPromise) return;
    try {
      const db = await dbPromise;
      await db.delete('store', name);
    } catch (error) {
      console.warn('Failed to remove from idb:', error);
    }
  },
};

const useDataStore = create<DataStore>()(
  persist(
    (set, get) => ({
      // states
      datasets: {},
      gameManifests: {},
      hasHydrated: false,
      // actions
      addDataset: (dataset: GameData) => {
        console.log('➕ Adding dataset:', dataset.id);
        set((state) => ({
          datasets: { ...state.datasets, [dataset.id]: dataset },
        }));
      },
      addGameManifest: (
        gameId: string,
        year: string,
        month: string,
        manifest: GameManifest,
      ) => {
        set((state) => ({
          gameManifests: {
            ...state.gameManifests,
            [gameId]: {
              ...state.gameManifests[gameId],
              [year]: {
                ...(state.gameManifests[gameId]?.[year] ?? {}),
                [month]: manifest,
              },
            },
          },
        }));
      },
      removeDataset: (id: string) => {
        console.log('➖ Removing dataset:', id);
        set((state) => ({
          datasets: Object.fromEntries(
            Object.entries(state.datasets).filter(([key]) => key !== id),
          ) as Record<string, GameData>,
        }));
      },
      getDatasetByID: (id: string) => get().datasets[id],
      getGameManifest: (gameId: string, year: string, month: string) =>
        get().gameManifests[gameId]?.[year]?.[month],
      getFilteredDataset: (id: string) => {
        const dataset = get().datasets[id];
        if (!dataset) return undefined;

        // No filters = return original dataset
        if (!dataset.filters || Object.keys(dataset.filters).length === 0) {
          return dataset;
        }

        // Has filters = apply filtering
        const filteredData = applyFilters(dataset.data, dataset.filters);
        // Maintain DSVRowArray structure
        const filteredDataWithColumns = Object.assign(filteredData, {
          columns: dataset.data.columns,
        }) as any;

        return {
          ...dataset,
          data: filteredDataWithColumns,
          originalData: dataset.data,
          isFiltered: true,
          filterInfo: {
            totalRows: dataset.data.length,
            filteredRows: filteredData.length,
            filterCount: Object.keys(dataset.filters).length,
          },
        };
      },
      hasDataset: (id: string) => !!get().datasets[id],
      lookupDatasets: (
        game?: string,
        startDate?: string,
        endDate?: string,
        featureLevel?: string,
      ) =>
        Object.values(get().datasets).filter((dataset) => {
          if (game && dataset.game !== game) return false;
          if (startDate && dataset.startDate !== startDate) return false;
          if (endDate && dataset.endDate !== endDate) return false;
          if (featureLevel && dataset.featureLevel !== featureLevel)
            return false;
          return true;
        }),
      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),
      updateDatasetColumnType: (
        id: string,
        feature: string,
        datatype: string,
      ) => {
        if (
          datatype !== 'Categorical' &&
          datatype !== 'Numeric' &&
          datatype !== 'Ordinal' &&
          datatype !== 'Time-series'
        )
          return;
        set((state) => ({
          datasets: {
            ...state.datasets,
            [id]: {
              ...state.datasets[id],
              columnTypes: {
                ...state.datasets[id].columnTypes,
                [feature]: datatype,
              },
            },
          },
        }));
      },
      // Filter management methods
      addFilter: (
        datasetId: string,
        featureName: string,
        filter: FeatureFilter,
      ) => {
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...state.datasets[datasetId],
              filters: {
                ...state.datasets[datasetId].filters,
                [featureName]: filter,
              },
            },
          },
        }));
      },
      removeFilter: (datasetId: string, featureName: string) => {
        set((state) => {
          const dataset = state.datasets[datasetId];
          if (!dataset?.filters) return state;

          const newFilters = { ...dataset.filters };
          delete newFilters[featureName];

          return {
            datasets: {
              ...state.datasets,
              [datasetId]: {
                ...dataset,
                filters:
                  Object.keys(newFilters).length > 0 ? newFilters : undefined,
              },
            },
          };
        });
      },
      updateFilter: (
        datasetId: string,
        featureName: string,
        filter: FeatureFilter,
      ) => {
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...state.datasets[datasetId],
              filters: {
                ...state.datasets[datasetId].filters,
                [featureName]: filter,
              },
            },
          },
        }));
      },
    }),
    {
      name: 'ogd-data-store',
      version: 1,
      storage: idbStorage,
      partialize: (state) => ({
        datasets: state.datasets,
        gameManifests: state.gameManifests,
        hasHydrated: state.hasHydrated,
      }),
      onRehydrateStorage: (state) => {
        return () => {
          state?.setHasHydrated(true);
        };
      },
    },
  ),
);

export default useDataStore;
