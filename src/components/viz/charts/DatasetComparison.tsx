import { useMemo } from 'react';
import SearchableSelect from '../../layout/SearchableSelect';
import * as d3 from 'd3';
import useChartOption from '../../../hooks/useChartOption';
import { tTestTwoSample } from 'simple-statistics';
import useDataStore from '../../../store/useDataStore';

interface DatasetComparisonProps {
  datasets: GameData[];
  chartId: string;
}

const measures = {
  pValue: 'p-value',
  diff: 'Difference',
};

const DatasetComparison: React.FC<DatasetComparisonProps> = ({
  datasets,
  chartId,
}) => {
  const [feature, setFeature] = useChartOption<string>(chartId, 'feature', '');
  const { getFilteredDataset } = useDataStore();

  const dataset1 = datasets[0];
  const dataset2 = datasets[1];

  // Get filtered datasets from centralized store
  const filteredDataset1 = getFilteredDataset(dataset1.id);
  const filteredDataset2 = getFilteredDataset(dataset2.id);
  const data1 = filteredDataset1?.data || [];
  const data2 = filteredDataset2?.data || [];

  const stats = useMemo(() => {
    if (
      !feature ||
      datasets.length !== 2 ||
      !data1.length ||
      !data2.length ||
      !data1[0]
    )
      return {};
    // Extract numeric values for the selected feature
    const values1: number[] = data1
      .map((d) => (d as Record<string, any>)[feature])
      .filter((value) => typeof value === 'number' && !isNaN(value));
    const values2: number[] = data2
      .map((d) => (d as Record<string, any>)[feature])
      .filter((value) => typeof value === 'number' && !isNaN(value));

    const pValue = tTestTwoSample(values1, values2);
    const diff = (d3.mean(values1) ?? 0) - (d3.mean(values2) ?? 0);

    // Calculate p-value and difference
    return {
      pValue,
      diff,
    };
  }, [feature, data1, data2]);

  const getFeatureOptions = () => {
    return Object.fromEntries(
      Object.entries(dataset1.columnTypes)
        .filter(([_, value]) => value === 'Numeric')
        .map(([key]) => [key, key]),
    );
  };

  return (
    <div className="flex flex-col gap-2 p-2 h-full ">
      <div className="flex flex-row gap-2">
        <SearchableSelect
          className="w-full max-w-sm"
          label="Feature"
          placeholder="Select a feature..."
          value={feature}
          onChange={(value) => setFeature(value)}
          options={getFeatureOptions()}
        />
      </div>
      <div className="flex flex-row gap-2 w-full justify-center h-full">
        {feature && (
          <div className="flex flex-col h-full justify-center items-center gap-6">
            <span className="text-lg">
              <strong>p-value: {stats.pValue}</strong>
            </span>
            <span className="text-lg">
              <strong>Difference: {stats.diff}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatasetComparison;
