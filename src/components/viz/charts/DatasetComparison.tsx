import { useMemo } from 'react';
import useDataStore from '../../../store/useDataStore';
import Select from '../../layout/Select';
import * as d3 from 'd3';
import useChartOption from '../../../hooks/useChartOption';
import { tTestTwoSample } from 'simple-statistics';

interface DescriptiveStatisticsProps {
  gameDataIds: string[];
  chartId: string;
}

const measures = {
  pValue: 'p-value',
  diff: 'Difference',
};

const DescriptiveStatistics: React.FC<DescriptiveStatisticsProps> = ({
  gameDataIds,
  chartId,
}) => {
  const { getDatasetByID, hasHydrated } = useDataStore();
  const [feature, setFeature] = useChartOption<string>(chartId, 'feature', '');

  const dataset1 = getDatasetByID(gameDataIds[0]);
  const dataset2 = getDatasetByID(gameDataIds[1]);
  if (!dataset1 || !dataset2)
    return hasHydrated ? (
      <div>Dataset(s) not found</div>
    ) : (
      <div>Loading dataset...</div>
    );
  const { data: data1 } = dataset1;
  const { data: data2 } = dataset2;

  const stats = useMemo(() => {
    if (
      !feature ||
      gameDataIds.length !== 2 ||
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
        .filter(([_, value]) => value === 'number')
        .map(([key]) => [key, key]),
    );
  };

  return (
    <div className="flex flex-col gap-2 p-2 h-full ">
      <div className="flex flex-row gap-2">
        <Select
          className="w-full max-w-sm"
          label="Feature"
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

export default DescriptiveStatistics;
