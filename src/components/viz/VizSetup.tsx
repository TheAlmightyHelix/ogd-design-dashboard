import { useState } from 'react';
import { useEffect } from 'react';
import useDataStore from '../../store/useDataStore';
import Select from '../layout/Select';
import { VizType, VizTypeKey } from '../../constants/vizTypes';

interface VizSetupProps {
  gameDataIds: string[];
  setGameDataIds: (gameDataIds: string[]) => void;
  vizType: VizTypeKey;
  setVizType: (vizType: VizTypeKey) => void;
  setContainerMode: (containerMode: 'settings' | 'viz') => void;
}

const VizSetup = ({
  gameDataIds,
  setGameDataIds,
  vizType,
  setVizType,
  setContainerMode,
}: VizSetupProps) => {
  const { datasets, hasHydrated } = useDataStore();
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
  }, [gameDataIds, datasets]);

  const visualize = () => {
    if (gameDataIds.length) {
      setContainerMode('viz');
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 justify-center items-start p-4">
      {!hasHydrated && <div>Loading datasets...</div>}
      <Select
        className="w-full"
        label="Dataset"
        value={gameDataIds[0]}
        onChange={(value) => setGameDataIds([value as string])}
        options={Object.fromEntries(
          Object.entries(datasets).map(([key]) => [key, key]),
        )}
      />
      <Select
        className="w-full"
        label="Chart Type"
        value={vizType}
        onChange={(value) => setVizType(value as VizTypeKey)}
        options={Object.fromEntries(
          supportedChartTypes.map((type) => [type, VizType[type]]),
        )}
      />
      {vizType === 'datasetComparison' && (
        <Select
          className="w-full"
          label="Dataset 2  "
          value={gameDataIds[1]}
          onChange={(value) =>
            setGameDataIds([gameDataIds[0], value as string])
          }
          options={Object.fromEntries(
            Object.entries(datasets).map(([key]) => [key, key]),
          )}
        />
      )}
      <button
        disabled={
          !gameDataIds.length ||
          !vizType ||
          (vizType === 'datasetComparison' && !gameDataIds[1])
        }
        className="px-2 py-1 bg-gray-700 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
        onClick={visualize}
      >
        Apply
      </button>
    </div>
  );
};

export default VizSetup;
