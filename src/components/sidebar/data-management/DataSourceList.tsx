import useDataStore from '../../../store/useDataStore';
import { useState } from 'react';
import DatasetSplitter from './DatasetSplitter';
import DatasetTSVPicker from './DatasetTSVPicker';
import DatasetItem from './DatasetItem';

const DataSourceList = () => {
  const { datasets, removeDataset, hasHydrated } = useDataStore();
  const [datasetIdToSplit, setDatasetIdToSplit] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <div className="my-2">
        <DatasetTSVPicker />
      </div>
      {!hasHydrated && <div>Loading datasets...</div>}
      {hasHydrated && Object.keys(datasets).length === 0 && (
        <div className="text-sm text-gray-500">No datasets loaded</div>
      )}
      {hasHydrated && Object.keys(datasets).length > 0 && (
        <div className="flex flex-col gap-2 overflow-y-auto">
          {Object.values(datasets).map((dataset) => (
            <DatasetItem
              key={dataset.id}
              dataset={dataset}
              onSplit={setDatasetIdToSplit}
              onRemove={removeDataset}
            />
          ))}
        </div>
      )}
      <DatasetSplitter
        datasetIdToSplit={datasetIdToSplit}
        setDatasetIdToSplit={setDatasetIdToSplit}
      />
    </div>
  );
};

export default DataSourceList;
