import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Layout } from 'react-grid-layout';
import { VizTypeKey } from '../constants/vizTypes';
import { v4 as uuidv4 } from 'uuid';

interface ChartConfig {
  id: string;
  datasetIds: string[];
  vizType: VizTypeKey;
  options: Record<string, any>;
}

interface DashboardLayout {
  layout: Layout[];
  charts: Record<string, ChartConfig>;
}

interface DashboardLayoutWithMeta extends DashboardLayout {
  id: string;
  name: string;
}

interface LayoutState {
  layouts: Record<string, DashboardLayoutWithMeta>;
  currentLayout: string | null; // stores the layout ID
  hasHydrated: boolean;
  createLayout: () => void;
  deleteLayout: (id: string) => void;
  setCurrentLayout: (id: string) => void;
  saveCurrentLayout: (
    layout: Layout[],
    charts: Record<string, ChartConfig>,
  ) => void;
  updateChartConfig: (chartId: string, config: Partial<ChartConfig>) => void;
  setChartOption: (chartId: string, key: string, value: any) => void;
  getChartOption: (chartId: string, key: string) => any;
  getLayoutIdByName: (name: string) => string | undefined;
  updateLayoutName: (id: string, name: string) => void;
  serializeLayout: (layout: DashboardLayoutWithMeta) => string;
  loadLayout: (serializedLayout: string) => DashboardLayoutWithMeta;
}

const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      layouts: {},
      currentLayout: null,
      hasHydrated: false,
      createLayout: () => {
        const id = uuidv4();
        set((state) => ({
          layouts: {
            ...state.layouts,
            [id]: { id, name: 'New Dashboard', layout: [], charts: {} },
          },
          currentLayout: id,
        }));
      },
      deleteLayout: (id: string) => {
        set((state) => {
          const newLayouts = { ...state.layouts };
          delete newLayouts[id];
          let newCurrent = state.currentLayout;
          if (state.currentLayout === id) {
            // Get all layout IDs in insertion order
            const layoutIds = Object.keys(state.layouts);
            const idx = layoutIds.indexOf(id);
            // Try to select the layout above (previous in the list)
            if (idx > 0) {
              newCurrent = layoutIds[idx - 1];
            } else if (layoutIds.length > 1) {
              // If no previous, select the next one (since current is being deleted)
              newCurrent = layoutIds[1];
            } else {
              // No layouts left
              newCurrent = null;
            }
          }
          return { layouts: newLayouts, currentLayout: newCurrent };
        });
      },
      setCurrentLayout: (id: string) => set({ currentLayout: id }),
      saveCurrentLayout: (
        layout: Layout[],
        charts: Record<string, ChartConfig>,
      ) => {
        const { currentLayout } = get();
        if (!currentLayout) return;
        set((state) => ({
          layouts: {
            ...state.layouts,
            [currentLayout]: {
              ...state.layouts[currentLayout],
              layout,
              charts,
            },
          },
        }));
      },
      updateChartConfig: (chartId: string, config: Partial<ChartConfig>) => {
        const { currentLayout } = get();
        if (!currentLayout) return;
        set((state) => {
          const layout = state.layouts[currentLayout];
          if (!layout) return state;
          const current = layout.charts[chartId];
          if (!current) return state;
          return {
            layouts: {
              ...state.layouts,
              [currentLayout]: {
                ...layout,
                charts: {
                  ...layout.charts,
                  [chartId]: {
                    ...current,
                    ...config,
                    options: { ...current.options, ...config.options },
                  },
                },
              },
            },
          };
        });
      },
      setChartOption: (chartId: string, key: string, value: any) => {
        const { currentLayout } = get();
        if (!currentLayout) return;
        set((state) => {
          const layout = state.layouts[currentLayout];
          if (!layout) return state;
          const chart = layout.charts[chartId];
          if (!chart) return state;
          return {
            layouts: {
              ...state.layouts,
              [currentLayout]: {
                ...layout,
                charts: {
                  ...layout.charts,
                  [chartId]: {
                    ...chart,
                    options: { ...chart.options, [key]: value },
                  },
                },
              },
            },
          };
        });
      },
      getChartOption: (chartId: string, key: string) => {
        const { currentLayout, layouts } = get();
        if (!currentLayout) return undefined;
        return layouts[currentLayout]?.charts[chartId]?.options?.[key];
      },
      getLayoutIdByName: (name: string) => {
        const { layouts } = get();
        return Object.values(layouts).find((l) => l.name === name)?.id;
      },
      updateLayoutName: (id: string, name: string) => {
        set((state) => {
          const layout = state.layouts[id];
          if (!layout) return state;
          return {
            layouts: {
              ...state.layouts,
              [id]: {
                ...layout,
                name,
              },
            },
          };
        });
      },
      serializeLayout: (layout: DashboardLayoutWithMeta): string => {
        const layoutJson = {
          id: layout.id,
          name: layout.name,
          layout: layout.layout,
          charts: layout.charts,
        };
        return JSON.stringify(layoutJson);
      },
      loadLayout: (serializedLayout: string): DashboardLayoutWithMeta => {
        const layout = JSON.parse(serializedLayout);
        // Validate if the parsed layout is of type DashboardLayoutWithMeta
        if (
          typeof layout !== 'object' ||
          layout === null ||
          typeof layout.id !== 'string' ||
          typeof layout.name !== 'string' ||
          typeof layout.layout !== 'object' ||
          layout.layout === null ||
          typeof layout.charts !== 'object' ||
          layout.charts === null
        ) {
          throw new Error(
            'Invalid layout format: not a DashboardLayoutWithMeta',
          );
        }

        set((state) => ({
          layouts: { ...state.layouts, [layout.id]: layout },
        }));

        return layout;
      },
    }),
    {
      name: 'ogd-layout-store',
      version: 1,
      partialize: (state) => ({
        layouts: state.layouts,
        currentLayout: state.currentLayout,
        hasHydrated: state.hasHydrated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    },
  ),
);

export type { ChartConfig, DashboardLayoutWithMeta, LayoutState };
export default useLayoutStore;
