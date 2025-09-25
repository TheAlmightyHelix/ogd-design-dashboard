import { ScissorsLineDashed, X } from 'lucide-react';

interface DatasetItemProps {
  dataset: GameData;
  onSplit: (datasetId: string) => void;
  onRemove: (datasetId: string) => void;
}

const DatasetItem = ({ dataset, onSplit, onRemove }: DatasetItemProps) => {
  return (
    <div
      key={dataset.id}
      className="p-3 bg-gray-50 rounded-lg border border-gray-100 transition-all duration-200 hover:bg-gray-100 hover:border-gray-200 "
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-800">
            {dataset.game}
          </div>
          <div className="text-xs text-gray-600">
            {dataset.startDate} to {dataset.endDate}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {dataset.featureLevel}
          </div>
          {dataset.additionalDetails?.split && (
            <div className="text-xs text-gray-500 mt-1">
              {dataset.additionalDetails.split}
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
    </div>
  );
};

export default DatasetItem;
