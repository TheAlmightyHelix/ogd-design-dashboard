import { Filter, ChevronRight, ScissorsLineDashed, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import Select from '../../layout/Select';
import useDataStore from '../../../store/useDataStore';
import SearchableSelect from '../../layout/SearchableSelect';
import Input from '../../layout/Input';
import DatasetFilter from './DatasetFilter';

interface DatasetItemProps {
  dataset: GameData;
  onSplit: (datasetId: string) => void;
  onRemove: (datasetId: string) => void;
}

const DatasetItem = ({ dataset, onSplit, onRemove }: DatasetItemProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const { updateDatasetColumnType, getFilteredDataset } = useDataStore();
  const filteredDataset = getFilteredDataset(dataset.id);

  const getColumnTypeOptions = (feature: string) => {
    const permittedTypes = {
      Categorical: 'Categorical',
      Ordinal: 'Ordinal',
    } as Record<string, string>;

    const TSparseResult = typeof (dataset.data[0] as any)[feature];
    if (TSparseResult === 'number') {
      return { ...permittedTypes, Numeric: 'Numeric' } as Record<
        string,
        ColumnType
      >;
    }

    return permittedTypes;
  };

  const ItemDetails = () => {
    return (
      <div className="w-full mt-2 px-4">
        <hr className="border-gray-200 my-2" />

        <DatasetFilter dataset={dataset} />

        <hr className="border-gray-200 my-2" />
        <div className="font-bold text-sm text-gray-800 p-2">Features</div>
        <div>
          {Object.entries(dataset.columnTypes).map(([feature, columnType]) => (
            <div
              className="grid grid-cols-4 gap-2 items-center px-2 py-1 w-full hover:bg-gray-100 rounded-md transition-all duration-200"
              key={feature}
            >
              <div className="text-sm col-span-3">{feature}</div>
              <Select
                value={columnType}
                onChange={(value) =>
                  updateDatasetColumnType(dataset.id, feature, value)
                }
                options={getColumnTypeOptions(feature)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      key={dataset.id}
      className="p-3 bg-gray-50 rounded-lg border border-gray-100 transition-all duration-200 "
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex gap-2 items-center">
            <ChevronRight
              className={`w-4 h-4 hover:text-blue-500 transition-colors ${showDetails && 'rotate-90'}  transition-transform duration-100 `}
              onClick={() => setShowDetails(!showDetails)}
            />
            <div className="font-medium text-sm text-gray-800 select-none">
              {dataset.game}
            </div>
            <div className="text-xs text-gray-600 select-none">
              {dataset.startDate} to {dataset.endDate}
            </div>
            <div className="text-xs text-gray-500 select-none">
              {dataset.featureLevel}
            </div>
            {dataset.additionalDetails?.split && (
              <div className="text-xs text-gray-500 select-none">
                {dataset.additionalDetails.split}
              </div>
            )}
          </div>
          {filteredDataset?.filterInfo && (
            <div className="flex gap-1 items-center ml-6">
              <Filter className="w-3 h-3" />
              <div className="text-xs text-gray-500 select-none">
                {filteredDataset.filterInfo?.filterCount} filter(s) applied (
                {filteredDataset.filterInfo?.filteredRows} of{' '}
                {filteredDataset.filterInfo?.totalRows} rows)
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => onSplit(dataset.id)}
          className="ml-2 p-1 text-gray-400 hover:text-blue-500 transition-colors"
          title="Split dataset"
        >
          <ScissorsLineDashed className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRemove(dataset.id)}
          className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove dataset"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showDetails && <ItemDetails />}
    </div>
  );
};

export default DatasetItem;
