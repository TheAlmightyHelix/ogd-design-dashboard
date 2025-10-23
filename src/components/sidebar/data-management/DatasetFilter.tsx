import { useState, useMemo } from 'react';
import SearchableSelect from '../../layout/select/SearchableSelect';
import Input from '../../layout/Input';
import useDataStore from '../../../store/useDataStore';
import { X, Plus } from 'lucide-react';
import * as d3 from 'd3';

export default function DatasetFilter({ dataset }: { dataset: GameData }) {
  const { addFilter, removeFilter, updateFilter } = useDataStore();
  const [showAddFilter, setShowAddFilter] = useState(false);

  const handleAddFilter = () => {
    setShowAddFilter(true);
  };

  const handleRemoveFilter = (featureName: string) => {
    removeFilter(dataset.id, featureName);
  };

  const handleUpdateFilter = (featureName: string, filter: FeatureFilter) => {
    updateFilter(dataset.id, featureName, filter);
  };

  return (
    <div className="space-y-3 mb-3">
      <div className="font-bold text-sm text-gray-800 px-3 pt-2">
        Filters
        {Object.keys(dataset.filters ?? {}).length > 0 && (
          <span className="ml-2 text-xs text-gray-500 font-normal">
            ({Object.keys(dataset.filters ?? {}).length} applied)
          </span>
        )}
      </div>

      <div className="px-3 space-y-3">
        {Object.entries(dataset.filters ?? {}).map(([feature, filter]) => (
          <FilterItem
            key={feature}
            dataset={dataset}
            feature={feature}
            filter={filter}
            onRemove={handleRemoveFilter}
            onUpdate={handleUpdateFilter}
          />
        ))}

        {showAddFilter && (
          <AddFilterItem
            dataset={dataset}
            onAdd={(featureName, filter) => {
              addFilter(dataset.id, featureName, filter);
              setShowAddFilter(false);
            }}
            onCancel={() => setShowAddFilter(false)}
          />
        )}

        {!showAddFilter && (
          <button
            onClick={handleAddFilter}
            className=" inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg font-medium cursor-pointer shadow-sm hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Filter
          </button>
        )}
      </div>
    </div>
  );
}

interface FilterItemProps {
  dataset: GameData;
  feature: string;
  filter: FeatureFilter;
  onRemove: (featureName: string) => void;
  onUpdate: (featureName: string, filter: FeatureFilter) => void;
}

const FilterItem = ({
  dataset,
  feature,
  filter,
  onRemove,
  onUpdate,
}: FilterItemProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    filter.selectedCategories ?? [],
  );
  const [rangeMin, setRangeMin] = useState<string>(
    filter.range?.min?.toString() ?? '',
  );
  const [rangeMax, setRangeMax] = useState<string>(
    filter.range?.max?.toString() ?? '',
  );

  const columnType = dataset.columnTypes[feature];
  const isNumeric = columnType === 'Numeric';
  const isCategorical =
    columnType === 'Categorical' || columnType === 'Ordinal';

  const getCategoriesOptions = () => {
    if (!feature) return {};
    return Object.fromEntries(
      Array.from(
        new Set(
          dataset.data.map((d) =>
            (d as Record<string, any>)[feature].toString(),
          ),
        ),
      ).map((category) => [category, category]),
    );
  };

  const range = useMemo(() => {
    if (!dataset || !feature) return [];
    if (columnType !== 'Numeric') return [];

    // Extract numeric values for the selected feature
    const values: number[] = dataset.data
      .map((d) => (d as Record<string, any>)[feature])
      .filter((value) => typeof value === 'number' && !isNaN(value));

    return d3.extent(values);
  }, [feature, dataset, columnType]);

  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategories(categories);
    const newFilter: FeatureFilter = {
      filterType: 'categorical',
      selectedCategories: categories,
    };
    onUpdate(feature, newFilter);
  };

  const handleRangeChange = (min: string, max: string) => {
    setRangeMin(min);
    setRangeMax(max);
    const newFilter: FeatureFilter = {
      filterType: 'numeric',
      range: {
        min: min ? Number(min) : undefined,
        max: max ? Number(max) : undefined,
      },
    };
    onUpdate(feature, newFilter);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-800">{feature}</div>
          <div className="text-xs text-gray-500 capitalize">{columnType}</div>
        </div>
        <button
          onClick={() => onRemove(feature)}
          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
          title="Remove filter"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isNumeric && (
        <div className="space-y-3">
          <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
            <span className="font-medium">Data range:</span> {range[0]} to{' '}
            {range[1]}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Minimum value"
              value={rangeMin}
              onChange={(value) => handleRangeChange(value, rangeMax)}
              placeholder="Enter min value"
            />
            <Input
              label="Maximum value"
              value={rangeMax}
              onChange={(value) => handleRangeChange(rangeMin, value)}
              placeholder="Enter max value"
            />
          </div>
        </div>
      )}

      {isCategorical && (
        <div className="space-y-2">
          <SearchableSelect
            label="Selected categories"
            placeholder="Choose categories to include..."
            value={selectedCategories}
            onChange={handleCategoryChange}
            options={getCategoriesOptions()}
            selectMultiple
          />
          {selectedCategories.length > 0 && (
            <div className="text-xs text-gray-600">
              {selectedCategories.length} category
              {selectedCategories.length !== 1 ? 'ies' : 'y'} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface AddFilterItemProps {
  dataset: GameData;
  onAdd: (featureName: string, filter: FeatureFilter) => void;
  onCancel: () => void;
}

const AddFilterItem = ({ dataset, onAdd, onCancel }: AddFilterItemProps) => {
  const [selectedFeature, setSelectedFeature] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [rangeMin, setRangeMin] = useState<string>('');
  const [rangeMax, setRangeMax] = useState<string>('');

  const availableFeatures = useMemo(() => {
    // Only show features that don't already have filters
    const existingFilters = Object.keys(dataset.filters ?? {});
    return Object.fromEntries(
      Object.entries(dataset.columnTypes)
        .filter(([key]) => !existingFilters.includes(key))
        .map(([key]) => [key, key]),
    );
  }, [dataset.columnTypes, dataset.filters]);

  const getCategoriesOptions = () => {
    if (!selectedFeature) return {};
    return Object.fromEntries(
      Array.from(
        new Set(
          dataset.data.map((d) =>
            (d as Record<string, any>)[selectedFeature].toString(),
          ),
        ),
      ).map((category) => [category, category]),
    );
  };

  const range = useMemo(() => {
    if (!dataset || !selectedFeature) return [];
    const columnType = dataset.columnTypes[selectedFeature];
    if (columnType !== 'Numeric') return [];

    const values: number[] = dataset.data
      .map((d) => (d as Record<string, any>)[selectedFeature])
      .filter((value) => typeof value === 'number' && !isNaN(value));

    return d3.extent(values);
  }, [selectedFeature, dataset]);

  const columnType = selectedFeature
    ? dataset.columnTypes[selectedFeature]
    : null;
  const isNumeric = columnType === 'Numeric';
  const isCategorical =
    columnType === 'Categorical' || columnType === 'Ordinal';

  const handleAdd = () => {
    if (!selectedFeature) return;

    let filter: FeatureFilter;
    if (isNumeric) {
      filter = {
        filterType: 'numeric',
        range: {
          min: rangeMin ? Number(rangeMin) : undefined,
          max: rangeMax ? Number(rangeMax) : undefined,
        },
      };
    } else if (isCategorical) {
      filter = {
        filterType: 'categorical',
        selectedCategories: selectedCategories,
      };
    } else {
      return; // Invalid filter type
    }

    onAdd(selectedFeature, filter);
  };

  const canAdd =
    selectedFeature &&
    ((isNumeric && (rangeMin || rangeMax)) ||
      (isCategorical && selectedCategories.length > 0));

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="space-y-4">
        <div>
          <SearchableSelect
            label="Select feature to filter"
            value={selectedFeature}
            onChange={setSelectedFeature}
            options={availableFeatures}
            placeholder="Choose a feature..."
          />
        </div>

        {selectedFeature && (
          <div className="space-y-3">
            {isNumeric && (
              <div className="space-y-3">
                <div className="text-xs text-gray-600 bg-white px-3 py-2 rounded border">
                  <span className="font-medium">Data range:</span> {range[0]} to{' '}
                  {range[1]}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Minimum value"
                    value={rangeMin}
                    onChange={setRangeMin}
                    placeholder="Enter min value"
                  />
                  <Input
                    label="Maximum value"
                    value={rangeMax}
                    onChange={setRangeMax}
                    placeholder="Enter max value"
                  />
                </div>
              </div>
            )}

            {isCategorical && (
              <div className="space-y-2">
                <SearchableSelect
                  label="Select categories to include"
                  placeholder="Choose categories..."
                  value={selectedCategories}
                  onChange={setSelectedCategories}
                  options={getCategoriesOptions()}
                  selectMultiple
                />
                {selectedCategories.length > 0 && (
                  <div className="text-xs text-gray-600">
                    {selectedCategories.length} category
                    {selectedCategories.length !== 1 ? 'ies' : 'y'} selected
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
          >
            Add Filter
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
