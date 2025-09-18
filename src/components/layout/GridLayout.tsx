import { useMemo, useState, useEffect } from 'react';
import { WidthProvider, Layout, Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import VizContainer from './VizContainer';
import { v4 as uuidv4 } from 'uuid';
import useLayoutStore, { ChartConfig } from '../../store/useLayoutStore';

const MAX_COLS = 12;
const DEFAULT_CHART_WIDTH = 4;
const DEFAULT_CHART_HEIGHT = 3;

/**
 * generateLayout is used to generate the initial layout for the grid.
 */
const generateLayout = (): Layout[] => {
  const initialChartId = uuidv4();
  const layout: Layout[] = [];
  layout.push({
    i: initialChartId,
    x: 0,
    y: 0,
    w: DEFAULT_CHART_WIDTH,
    h: DEFAULT_CHART_HEIGHT,
  });
  return layout;
};

/**
 * GridLayout is the main component that renders the grid layout.
 * It is used to display the grid layout and the charts.
 */
const GridLayout: React.FC = () => {
  const Grid = useMemo(() => WidthProvider(Responsive), []);

  // Remove local state for layout and charts
  // const [layout, setLayout] = useState<Layout[]>([]);
  const [spawnPoint, setSpawnPoint] = useState<{ x: number; y: number }>({
    x: DEFAULT_CHART_WIDTH,
    y: 0,
  });
  // const [charts, setCharts] = useState<Record<string, ChartConfig>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Use layout and charts from store
  const {
    layouts,
    currentLayout,
    createLayout,
    saveCurrentLayout,
    hasHydrated,
  } = useLayoutStore();
  const layout =
    currentLayout && layouts[currentLayout]
      ? layouts[currentLayout].layout
      : [];
  const charts =
    currentLayout && layouts[currentLayout]
      ? layouts[currentLayout].charts
      : {};

  // Initialize from persisted layout
  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentLayout) {
      createLayout();
      return;
    }
    const stored = layouts[currentLayout];
    if (!isInitialized && stored) {
      const initialLayout =
        stored.layout.length > 0 ? stored.layout : generateLayout();
      let initialCharts = stored.charts;
      if (Object.keys(initialCharts).length === 0 && initialLayout.length > 0) {
        const firstId = initialLayout[0].i;
        initialCharts = {
          [firstId]: {
            id: firstId,
            datasetIds: [],
            vizType: 'bar' as const,
            options: {},
          },
        };
      }
      saveCurrentLayout(initialLayout, initialCharts);
      updateSpawnPoint(initialLayout);
      setIsInitialized(true);
    }
  }, [hasHydrated, currentLayout, layouts, isInitialized]);

  const addChart = () => {
    const newChartId = uuidv4();
    const newCharts = {
      ...charts,
      [newChartId]: {
        id: newChartId,
        datasetIds: [],
        vizType: 'bar' as const,
        options: {},
      },
    };
    const newLayout = [
      ...layout,
      {
        i: newChartId,
        x: spawnPoint.x,
        y: spawnPoint.y,
        w: DEFAULT_CHART_WIDTH,
        h: DEFAULT_CHART_HEIGHT,
      },
    ];
    saveCurrentLayout(newLayout, newCharts);
    updateSpawnPoint(newLayout);
  };

  const removeChart = (chartId: string) => {
    const newCharts = { ...charts };
    delete newCharts[chartId];
    const newLayout = layout.filter((item) => item.i !== chartId);
    saveCurrentLayout(newLayout, newCharts);
    updateSpawnPoint(newLayout);
  };

  /**
   * updateSpawnPoint is used to update the spawn point for the next chart.
   * It is used to ensure that the next chart is spawned in the correct position.
   */
  const updateSpawnPoint = (layout: Layout[]) => {
    // If no charts exist, set spawn point to origin
    if (layout.length === 0) {
      setSpawnPoint({ x: 0, y: 0 });
      return;
    }

    // Find the bottom row (highest y + h value)
    let bottomRow = 0;
    layout.forEach((item) => {
      const itemBottom = item.y + item.h;
      if (itemBottom > bottomRow) {
        bottomRow = itemBottom;
      }
    });

    // Find the rightmost position on the bottom row
    let rightmostX = 0;
    layout.forEach((item) => {
      const itemBottom = item.y + item.h;
      if (itemBottom === bottomRow) {
        const itemRight = item.x + item.w;
        if (itemRight > rightmostX) {
          rightmostX = itemRight;
        }
      }
    });

    // Calculate next spawn position
    let nextX = rightmostX;
    let nextY = bottomRow;

    // If the next chart would overflow, move to the next row
    if (nextX + DEFAULT_CHART_WIDTH > MAX_COLS) {
      nextX = 0;
      nextY = bottomRow;
    }

    setSpawnPoint({ x: nextX, y: nextY });
  };

  return (
    <div className="min-h-screen mb-10">
      <div className="flex items-center gap-8 mb-2">
        <div className="text-lg font-bold">
          {currentLayout && layouts[currentLayout]?.name}
        </div>
        <button
          className="px-2 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200 focus:outline-none  focus:ring-gray-300"
          onClick={addChart}
          type="button"
        >
          Add Chart
        </button>
      </div>

      <div className="">
        {/* Grid */}
        {isInitialized ? (
          <Grid
            layouts={{ lg: layout, md: layout, sm: layout, xs: layout }}
            cols={{ lg: MAX_COLS, md: MAX_COLS, sm: MAX_COLS, xs: MAX_COLS }}
            draggableHandle=".drag-handle"
            isResizable={true}
            onLayoutChange={(l: Layout[]) => {
              saveCurrentLayout(l, charts);
              updateSpawnPoint(l);
            }}
          >
            {layout.map((item) => {
              const chartConfig = charts[item.i];
              if (!chartConfig) {
                return null;
              }
              return (
                <VizContainer
                  key={item.i}
                  chartId={item.i}
                  className="bg-white border border-gray-200 rounded-md"
                  onRemove={removeChart}
                />
              );
            })}
          </Grid>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Loading...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GridLayout;
