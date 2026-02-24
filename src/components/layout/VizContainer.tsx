import React, { useState, useEffect } from 'react';
import { Move, Minus, Copy, Database, Loader2 } from 'lucide-react';
import { BarChart } from '../viz/charts/BarChart';
import { Histogram } from '../viz/charts/Histogram';
import { ScatterPlot } from '../viz/charts/ScatterPlot';
import { Timeline } from '../viz/charts/Timeline';
import { JobGraph } from '../viz/charts/JobGraph';
import { ForceDirectedGraph } from '../viz/charts/ForceDirectedGraph';
import { Sankey } from '../viz/charts/Sankey';
import VizSetup from '../viz/VizSetup';
import DescriptiveStatistics from '../viz/charts/DescriptiveStatistics';
import BoxPlot from '../viz/charts/BoxPlot';
import { VizType, VizTypeKey } from '../../constants/vizTypes';
import useLayoutStore from '../../store/useLayoutStore';
import DatasetComparison from '../viz/charts/DatasetComparison';
import useDataStore from '../../store/useDataStore';
import DatasetNotFound from '../viz/DatasetNotFound';
import { ErrorBoundary } from './ErrorBoundary';
import Input from './Input';

interface VizContainerProps {
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  chartId: string;
  onRemove: (chartId: string) => void;
  onDuplicate: (chartId: string) => void;
  children?: React.ReactNode;
}

/**
 * VizContainer represents a single chart item in the grid layout with built-in visualization content.
 * It provides drag handles, settings, and remove buttons, while also managing the chart content.
 */
const VizContainer = React.forwardRef<HTMLDivElement, VizContainerProps>(
  (
    {
      style = {},
      className = '',
      onMouseDown,
      onMouseUp,
      onTouchEnd,
      chartId,
      onRemove,
      onDuplicate,
      children,
    },
    ref,
  ) => {
    const chartConfig = useLayoutStore((state) => {
      const cur = state.currentLayout;
      return cur ? state.layouts[cur]?.charts[chartId] : undefined;
    });
    const { getDatasetByID, hasHydrated } = useDataStore();
    const updateChartConfig = useLayoutStore(
      (state) => state.updateChartConfig,
    );
    const setChartTitle = useLayoutStore((state) => state.setChartTitle);
    const [containerMode, setContainerMode] = useState<'settings' | 'viz'>(
      chartConfig?.vizType && chartConfig?.datasetIds?.length
        ? 'viz'
        : 'settings',
    );
    const [vizType, setVizType] = useState<VizTypeKey>(
      chartConfig?.vizType || 'descriptiveStatistics',
    );
    const [gameDataIds, setGameDataIds] = useState<string[]>(
      chartConfig?.datasetIds || [],
    );
    const dataset = getDatasetByID(gameDataIds[0]);
    const [title, setTitle] = useState<string>(chartConfig?.title || '');

    useEffect(() => {
      updateChartConfig(chartId, { vizType });
    }, [vizType]);

    useEffect(() => {
      updateChartConfig(chartId, { datasetIds: gameDataIds });
    }, [gameDataIds]);

    useEffect(() => {
      if (title !== chartConfig?.title) {
        setChartTitle(chartId, title);
      }
    }, [title]);

    const renderChartContent = () => {
      if (containerMode === 'settings') {
        return (
          <VizSetup
            gameDataIds={gameDataIds}
            setGameDataIds={setGameDataIds}
            vizType={vizType}
            setVizType={setVizType}
            title={title}
            setTitle={setTitle}
            setContainerMode={setContainerMode}
          />
        );
      }

      if (!dataset && hasHydrated) {
        return <DatasetNotFound gameDataId={gameDataIds[0]} />;
      }

      if (!dataset) {
        return (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        );
      }

      return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-shrink-0 min-w-0 w-full">
            <Input
              value={title}
              onChange={(value) => setTitle(value)}
              variant="subtle"
              className="min-w-0 font-bold text-gray-600"
              placeholder="Title..."
              debounce
            />
          </div>
          <div className="min-h-0 flex-1">
            {vizType === 'bar' && (
              <BarChart key={chartId} chartId={chartId} dataset={dataset} />
            )}
            {vizType === 'histogram' && (
              <Histogram key={chartId} chartId={chartId} dataset={dataset} />
            )}
            {vizType === 'scatter' && (
              <ScatterPlot key={chartId} chartId={chartId} dataset={dataset} />
            )}
            {vizType === 'timeline' && (
              <Timeline key={chartId} chartId={chartId} dataset={dataset} />
            )}
            {vizType === 'jobGraph' && (
              <JobGraph key={chartId} chartId={chartId} dataset={dataset} />
            )}
            {vizType === 'forceDirectedGraph' && (
              <ForceDirectedGraph
                key={chartId}
                chartId={chartId}
                dataset={dataset}
              />
            )}
            {vizType === 'sankey' && (
              <Sankey key={chartId} chartId={chartId} dataset={dataset} />
            )}
            {vizType === 'descriptiveStatistics' && (
              <DescriptiveStatistics
                key={chartId}
                chartId={chartId}
                dataset={dataset}
              />
            )}
            {vizType === 'boxPlot' && (
              <BoxPlot key={chartId} chartId={chartId} dataset={dataset} />
            )}
            {vizType === 'datasetComparison' &&
              (() => {
                const datasets = gameDataIds
                  .map((id) => getDatasetByID(id))
                  .filter((dataset): dataset is GameData => Boolean(dataset));

                if (datasets.length !== 2) {
                  return (
                    <div>Please select exactly 2 datasets for comparison</div>
                  );
                }

                return (
                  <DatasetComparison
                    key={chartId}
                    chartId={chartId}
                    datasets={datasets}
                  />
                );
              })()}
          </div>
        </div>
      );
    };

    return (
      <div
        ref={ref}
        style={style}
        className={`${className} group relative`}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag Handle and Control Buttons */}
        <div className="absolute bottom-2 left-2 h-6 flex items-center justify-start gap-2">
          <button
            className="drag-handle w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center cursor-move z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ pointerEvents: 'auto' }}
            title="Drag to move"
          >
            <Move size={14} className="text-gray-600" />
          </button>
          <button
            className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none"
            onClick={() => onDuplicate(chartId)}
            type="button"
            title="Duplicate chart"
          >
            <Copy size={14} className="text-gray-600" />
          </button>
          {containerMode === 'viz' && (
            <button
              className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none"
              onClick={() => setContainerMode('settings')}
              type="button"
              title="Change dataset / chart type"
            >
              <Database size={14} className="text-gray-600" />
            </button>
          )}
          <button
            className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none"
            onClick={() => onRemove(chartId)}
            type="button"
            title="Remove chart"
          >
            <Minus size={14} className="text-gray-600" />
          </button>
        </div>

        {/* Chart content - flex so title + chart fit without overflow */}
        <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
          <ErrorBoundary resetKeys={[chartId, vizType, gameDataIds.join(',')]}>
            {renderChartContent()}
          </ErrorBoundary>
        </div>
        {children /* needed for the resize handle */}
      </div>
    );
  },
);

VizContainer.displayName = 'VizContainer';

export default VizContainer;
