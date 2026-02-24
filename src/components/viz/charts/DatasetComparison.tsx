import { useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import useChartOption from '../../../hooks/useChartOption';
import { tTestTwoSample } from 'simple-statistics';
import tCdf from '@stdlib/stats-base-dists-t-cdf';
import useDataStore from '../../../store/useDataStore';
import FeatureSelect from '../../layout/select/FeatureSelect';
import SearchableSelect from '../../layout/select/SearchableSelect';
import { CollapsibleChartConfig } from '../CollapsibleChartConfig';

export type TTestTail = 'two' | 'left' | 'right';

/** Compute p-value from t-statistic given degrees of freedom and tail type */
function tTestPValue(t: number, df: number, tail: TTestTail): number {
  if (df <= 0 || !Number.isFinite(t) || !Number.isFinite(df)) return NaN;

  if (tail === 'two') {
    return 2 * (1 - tCdf(Math.abs(t), df));
  }
  if (tail === 'right') {
    return 1 - tCdf(t, df);
  }
  return tCdf(t, df); // left
}

const TAIL_OPTIONS: Record<TTestTail, string> = {
  two: 'Two-tailed',
  left: 'Left-tailed',
  right: 'Right-tailed',
};

interface DatasetComparisonProps {
  datasets: GameData[];
  chartId: string;
}

const DatasetComparison: React.FC<DatasetComparisonProps> = ({
  datasets,
  chartId,
}) => {
  const [feature, setFeature] = useChartOption<string>(chartId, 'feature', '');
  const [tail, setTail] = useChartOption<TTestTail>(chartId, 'tail', 'two');
  const { getFilteredDataset } = useDataStore();

  // prevent invalid feature selection
  useEffect(() => {
    if (feature && !getFeatureOptions()[feature]) {
      setFeature('');
    }
  }, [feature]);

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

    // tTestTwoSample returns the t-statistic, not the p-value
    const tStatistic = tTestTwoSample(values1, values2);
    const df = values1.length + values2.length - 2;
    const pValue =
      tStatistic != null ? tTestPValue(tStatistic, df, tail) : undefined;
    const diff = (d3.mean(values1) ?? 0) - (d3.mean(values2) ?? 0);

    return {
      pValue,
      diff,
    };
  }, [feature, data1, data2, tail]);

  const getFeatureOptions = () => {
    return Object.fromEntries(
      Object.entries(dataset1.columnTypes)
        .filter(([_, value]) => value === 'Numeric')
        .map(([key]) => [key, key]),
    );
  };

  return (
    <div className="flex flex-col gap-2 px-2 pb-2 h-full">
      <CollapsibleChartConfig
        chartId={chartId}
        collapsedLabel={feature || 'Dataset Comparison'}
      >
        <div className="flex flex-col gap-2">
          <FeatureSelect
            feature={feature}
            handleFeatureChange={(value) => setFeature(value)}
            featureOptions={getFeatureOptions()}
          />
          <SearchableSelect
            label="Tail"
            value={tail}
            onChange={(value) => setTail(value as TTestTail)}
            options={TAIL_OPTIONS}
            placeholder="Select tail..."
          />
        </div>
      </CollapsibleChartConfig>
      <div className="flex flex-row gap-2 w-full justify-center h-full">
        {feature && (
          <div className="flex flex-col h-full justify-center items-center gap-6">
            <span className="text-lg">
              <strong>
                p-value{' '}
                {tail === 'two'
                  ? ' (two-tailed)'
                  : tail === 'left'
                    ? ' (left-tailed)'
                    : ' (right-tailed)'}
                :{' '}
                {stats.pValue != null && Number.isFinite(stats.pValue)
                  ? stats.pValue.toFixed(4)
                  : '—'}
              </strong>
            </span>
            <span className="text-lg">
              <strong>
                Difference:{' '}
                {stats.diff != null && Number.isFinite(stats.diff)
                  ? stats.diff.toFixed(4)
                  : '—'}
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatasetComparison;
