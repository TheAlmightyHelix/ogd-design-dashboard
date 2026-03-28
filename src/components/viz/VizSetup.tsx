import { useState } from 'react';
import { useEffect } from 'react';
import useDataStore from '../../store/useDataStore';
import Select from '../layout/select/Select';
import { VizType, VizTypeKey } from '../../constants/vizTypes';
import Input from '../layout/Input';
import { trackEvent } from '../../lib/analytics';

interface VizSetupProps {
  gameDataIds: string[];
  setGameDataIds: (gameDataIds: string[]) => void;
  vizType: VizTypeKey;
  setVizType: (vizType: VizTypeKey) => void;
  setContainerMode: (containerMode: 'settings' | 'viz') => void;
  title: string;
  setTitle: (title: string) => void;
}

const VizSetup = ({
  gameDataIds,
  setGameDataIds,
  vizType,
  setVizType,
  setContainerMode,
  title,
  setTitle,
}: VizSetupProps) => {
  const { datasets, hasHydrated, getFilteredDataset } = useDataStore();
  const [supportedChartTypes, setSupportedChartTypes] = useState<VizTypeKey[]>(
    [],
  );

  useEffect(() => {
    if (!gameDataIds.length) return;
    const dataset = datasets[gameDataIds[0]];
    if (!dataset) return;
    const supportedChartTypes = dataset.supportedChartTypes;
    if (supportedChartTypes) {
      setSupportedChartTypes(supportedChartTypes);
    }
    if (!supportedChartTypes.includes(vizType)) {
      setVizType(supportedChartTypes[0]);
    }
    if (!title) {
      setTitle(
        `${dataset?.game} ${dataset?.startDate}-${dataset?.endDate} ${dataset?.featureLevel} ${dataset?.additionalDetails?.split ?? ''}` ||
          '',
      );
    }
  }, [gameDataIds, datasets]);

  const visualize = () => {
    trackEvent('chart_applied', {
      viz_type: vizType,
      dataset_id: gameDataIds.join(', '),
    });

    if (gameDataIds.length) {
      setContainerMode('viz');
    }
  };

  // Get filter info for the selected dataset
  const selectedDataset = gameDataIds[0]
    ? getFilteredDataset(gameDataIds[0])
    : null;
  const filterInfo = selectedDataset?.filterInfo;

  return (
    <div className="h-full flex flex-col gap-6 justify-center items-start p-4">
      {!hasHydrated && (
        <div className="text-sm text-gray-500">Loading datasets...</div>
      )}
      <div className="w-full space-y-3">
        <Select
          className="w-full"
          label="Dataset"
          value={gameDataIds[0]}
          onChange={(value) => setGameDataIds([value as string])}
          options={Object.fromEntries(
            Object.entries(datasets).map(([key]) => [key, key]),
          )}
        />

        {/* Filter status indicator */}
        {filterInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <div className="font-medium">Dataset Filters Applied</div>
            <div>
              Showing {filterInfo.filteredRows.toLocaleString()} of{' '}
              {filterInfo.totalRows.toLocaleString()} rows
              {filterInfo.filterCount > 0 && (
                <span>
                  {' '}
                  ({filterInfo.filterCount} filter
                  {filterInfo.filterCount !== 1 ? 's' : ''} active)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      <Select
        className="w-full"
        label="Chart Type"
        value={vizType}
        onChange={(value) => setVizType(value as VizTypeKey)}
        options={Object.fromEntries(
          supportedChartTypes.map((type) => [type, VizType[type]]),
        )}
      />
      <Input
        label="Title"
        placeholder="Type..."
        value={title}
        onChange={(value) => setTitle(value)}
        debounce
      />
      {vizType === 'datasetComparison' && (
        <div className="w-full space-y-3">
          <Select
            className="w-full"
            label="Dataset 2"
            value={gameDataIds[1]}
            onChange={(value) =>
              setGameDataIds([gameDataIds[0], value as string])
            }
            options={Object.fromEntries(
              Object.entries(datasets).map(([key]) => [key, key]),
            )}
          />

          {/* Filter status indicator for Dataset 2 */}
          {gameDataIds[1] &&
            (() => {
              const dataset2 = getFilteredDataset(gameDataIds[1]);
              const filterInfo2 = dataset2?.filterInfo;
              return filterInfo2 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <div className="font-medium">Dataset 2 Filters Applied</div>
                  <div>
                    Showing {filterInfo2.filteredRows.toLocaleString()} of{' '}
                    {filterInfo2.totalRows.toLocaleString()} rows
                    {filterInfo2.filterCount > 0 && (
                      <span>
                        {' '}
                        ({filterInfo2.filterCount} filter
                        {filterInfo2.filterCount !== 1 ? 's' : ''} active)
                      </span>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
        </div>
      )}
      <button
        disabled={
          !gameDataIds.length ||
          !vizType ||
          (vizType === 'datasetComparison' && !gameDataIds[1])
        }
        className="px-4 py-2 bg-blue-400 text-white rounded-md font-medium cursor-pointer shadow hover:bg-blue-500 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
        onClick={visualize}
      >
        Apply
      </button>
    </div>
  );
};

export default VizSetup;
