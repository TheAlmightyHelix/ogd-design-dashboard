import { useMemo, useState } from 'react';
import useDataStore from '../../../store/useDataStore';
import Dialog from '../../layout/Dialog';
import Input from '../../layout/Input';
import Select from '../../layout/Select';
import SearchableSelect from '../../layout/SearchableSelect';
import * as d3 from 'd3';

const DatasetSplitter = ({
  datasetIdToSplit,
  setDatasetIdToSplit,
}: {
  datasetIdToSplit: string | null;
  setDatasetIdToSplit: (datasetId: string | null) => void;
}) => {
  const [featureToSplitBy, setFeatureToSplitBy] = useState<string>('');
  const [splitAtValue, setSplitAtValue] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { datasets, addDataset } = useDataStore();

  const range = useMemo(() => {
    if (!datasetIdToSplit) return [];
    const dataset = datasets[datasetIdToSplit];
    if (!featureToSplitBy) return [];

    const columnType = dataset.columnTypes[featureToSplitBy];
    if (columnType !== 'Numeric') return [];

    // Extract numeric values for the selected feature
    const values: number[] = dataset.data
      .map((d) => (d as Record<string, any>)[featureToSplitBy])
      .filter((value) => typeof value === 'number' && !isNaN(value));

    return d3.extent(values);
  }, [featureToSplitBy, datasetIdToSplit, datasets]);

  const categories = useMemo(() => {
    if (!datasetIdToSplit) return {};
    const dataset = datasets[datasetIdToSplit];
    if (!featureToSplitBy) return {};

    const columnType = dataset.columnTypes[featureToSplitBy];
    if (columnType !== 'Categorical') return {};

    // Extract unique categories for the selected feature
    const uniqueCategories = Array.from(
      new Set(
        dataset.data
          .map((d) => (d as Record<string, any>)[featureToSplitBy])
          .filter((value) => value !== null && value !== undefined)
          .map(String),
      ),
    );

    return Object.fromEntries(
      uniqueCategories.map((category) => [category, category]),
    );
  }, [featureToSplitBy, datasetIdToSplit, datasets]);

  if (!datasetIdToSplit) return null;
  const dataset = datasets[datasetIdToSplit];

  const getFeatureOptions = () => {
    return Object.fromEntries(
      Object.entries(dataset.columnTypes)
        .filter(([_, value]) => value === 'Numeric' || value === 'Categorical' || value === 'Ordinal')
        .map(([key]) => [key, key]),
    );
  };

  const isNumericalFeature = () => {
    return dataset.columnTypes[featureToSplitBy] === 'Numeric';
  };

  const isCategoricalFeature = () => {
    return dataset.columnTypes[featureToSplitBy] === 'Categorical';
  };

  const splitDataset = () => {
    if (isNumericalFeature()) {
      const splitAtValueNumber = parseFloat(splitAtValue);
      if (splitAtValueNumber === undefined) {
        alert('Value must be a number');
        return;
      }
      if (range[0] === undefined || range[1] === undefined) {
        alert('No range found for feature');
        return;
      }
      if (splitAtValueNumber < range[0] || splitAtValueNumber > range[1]) {
        alert(
          `Split at value must be within the range of the feature: ${range[0]} to ${range[1]}`,
        );
        return;
      }

      addDataset({
        ...dataset,
        id: `${datasetIdToSplit}-${featureToSplitBy} < ${splitAtValueNumber}`,
        data: Object.assign(
          dataset.data.filter(
            (d) =>
              (d as Record<string, any>)[featureToSplitBy] < splitAtValueNumber,
          ),
          { columns: dataset.data.columns },
        ),
        additionalDetails: {
          split: `${featureToSplitBy} < ${splitAtValueNumber}`,
        },
      });

      addDataset({
        ...dataset,
        id: `${datasetIdToSplit}-${featureToSplitBy} >= ${splitAtValueNumber}`,
        data: Object.assign(
          dataset.data.filter(
            (d) =>
              (d as Record<string, any>)[featureToSplitBy] >=
              splitAtValueNumber,
          ),
          { columns: dataset.data.columns },
        ),
        additionalDetails: {
          split: `${featureToSplitBy} >= ${splitAtValueNumber}`,
        },
      });
    } else if (isCategoricalFeature()) {
      if (selectedCategories.length === 0) {
        alert('Please select at least one category');
        return;
      }

      addDataset({
        ...dataset,
        id: `${datasetIdToSplit}-${featureToSplitBy} in [${selectedCategories.join(', ')}]`,
        data: Object.assign(
          dataset.data.filter((d) =>
            selectedCategories.includes(
              String((d as Record<string, any>)[featureToSplitBy]),
            ),
          ),
          { columns: dataset.data.columns },
        ),
        additionalDetails: {
          split: `${featureToSplitBy} in [${selectedCategories.join(', ')}]`,
        },
      });

      addDataset({
        ...dataset,
        id: `${datasetIdToSplit}-${featureToSplitBy} not in [${selectedCategories.join(', ')}]`,
        data: Object.assign(
          dataset.data.filter(
            (d) =>
              !selectedCategories.includes(
                String((d as Record<string, any>)[featureToSplitBy]),
              ),
          ),
          { columns: dataset.data.columns },
        ),
        additionalDetails: {
          split: `${featureToSplitBy} not in [${selectedCategories.join(', ')}]`,
        },
      });
    }

    setDatasetIdToSplit(null);
  };

  const handleFeatureChange = (value: string) => {
    setFeatureToSplitBy(value);
    setSplitAtValue('');
    setSelectedCategories([]);
  };

  const canSplit = () => {
    if (!featureToSplitBy) return false;
    if (isNumericalFeature()) {
      return splitAtValue !== '';
    } else if (isCategoricalFeature()) {
      return selectedCategories.length > 0;
    }
    return false;
  };

  return (
    <Dialog
      title={`Splitting dataset ${datasetIdToSplit}`}
      open={datasetIdToSplit !== null}
      onClose={() => {
        setDatasetIdToSplit(null);
        setFeatureToSplitBy('');
        setSplitAtValue('');
        setSelectedCategories([]);
      }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Select
            label="Split by feature"
            value={featureToSplitBy}
            onChange={handleFeatureChange}
            options={getFeatureOptions()}
          />
          {isNumericalFeature() && featureToSplitBy && (
            <div className="text-sm text-gray-700">
              Values range from <b>{range[0]}</b> to <b>{range[1]}</b>
            </div>
          )}
        </div>

        {isNumericalFeature() && (
          <Input
            label="Split at value"
            value={splitAtValue}
            onChange={setSplitAtValue}
          />
        )}

        {isCategoricalFeature() && (
          <SearchableSelect
            label="Select categories for first split"
            placeholder="Select categories..."
            value={selectedCategories}
            onChange={setSelectedCategories}
            options={categories}
            selectMultiple
          />
        )}

        <button
          disabled={!canSplit()}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-400 text-white rounded-md font-medium cursor-pointer shadow hover:bg-blue-500 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={splitDataset}
        >
          Split
        </button>
      </div>
    </Dialog>
  );
};

export default DatasetSplitter;
