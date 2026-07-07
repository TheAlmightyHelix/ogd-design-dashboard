import { useEffect, useMemo } from 'react';
import Select from '../../layout/select/Select';
import * as d3 from 'd3';
import useChartOption from '../../../hooks/useChartOption';
import useDataStore from '../../../store/useDataStore';
import FeatureSelect from '../../layout/select/FeatureSelect';
import { CollapsibleChartConfig } from '../CollapsibleChartConfig';
import {
  formatChartNumericValue,
  getFeatureOptionsForColumnTypes,
  getNumericFeatureValues,
  isNumericChartColumn,
} from '../../../utils/columnValueUtils';

interface DescriptiveStatisticsProps {
  dataset: GameData;
  chartId: string;
}

const measures = {
  count: 'Count',
  unique: 'Unique Values',
  mean: 'Mean',
  median: 'Median',
  mode: 'Mode',
  range: 'Range',
  quartiles: 'Quartiles',
  variance: 'Variance',
  standardDeviation: 'Std. Dev.',
};

const DescriptiveStatistics: React.FC<DescriptiveStatisticsProps> = ({
  dataset,
  chartId,
}) => {
  const [feature, setFeature] = useChartOption<string>(chartId, 'feature', '');
  const [measureSelected, setMeasureSelected] = useChartOption<
    keyof typeof measures
  >(chartId, 'measureSelected', 'mean');
  const { getFilteredDataset } = useDataStore();

  // Get filtered dataset from centralized store
  const filteredDataset = getFilteredDataset(dataset.id);
  const data = filteredDataset?.data || [];

  const stats = useMemo(() => {
    if (!feature || !data.length) return {};
    const columnType = dataset.columnTypes[feature];
    const values = getNumericFeatureValues(
      data as Array<Record<string, unknown>>,
      feature,
      columnType,
    );

    // Calculate the mean, median, mode, range, variance, standard deviation, skewness, and kurtosis
    const count = data.length;
    const unique = new Set(values).size;
    const mean = d3.mean(values);
    const median = d3.median(values);
    const mode = d3.mode(values);
    const range = d3.extent(values);
    const quartiles = [
      d3.quantile(values, 0.25),
      d3.quantile(values, 0.5),
      d3.quantile(values, 0.75),
    ];
    const variance = d3.variance(values);
    const standardDeviation = d3.deviation(values);
    // const skewness =
    // const kurtosis = d3.kurtosis(values);

    return {
      count,
      unique,
      mean,
      median,
      mode,
      range,
      quartiles,
      variance,
      standardDeviation,
    };
  }, [feature, data, dataset.columnTypes]);

  // prevent invalid feature selection
  useEffect(() => {
    if (feature && !getFeatureOptions()[feature]) {
      setFeature('');
    }
  }, [feature]);

  const getFeatureOptions = () => {
    if (dataset.featureLevel === 'population') {
      return Object.fromEntries(
        Object.entries(dataset.columnTypes)
          .filter(([, type]) => type !== 'Timedelta' && type !== 'Datetime')
          .map(([key]) => [key, key]),
      );
    }

    return getFeatureOptionsForColumnTypes(dataset.columnTypes, [
      'Numeric',
      'Timedelta',
    ]);
  };

  const formatMeasureDisplay = (
    measure: keyof typeof measures,
    value: unknown,
  ): string => {
    const columnType = dataset.columnTypes[feature];
    if (
      (measure === 'range' || measure === 'quartiles') &&
      Array.isArray(value)
    ) {
      return value
        .map((entry) => formatChartNumericValue(entry as number, columnType))
        .join(' ~ ');
    }
    if (typeof value === 'number') {
      return formatChartNumericValue(value, columnType);
    }
    return value != null ? String(value) : '';
  };

  const jumbotron = () => {
    if (!feature) return <></>;

    if (dataset.featureLevel !== 'population' && measureSelected) {
      return (
        <>
          <span className="text-6xl font-bold">
            {formatMeasureDisplay(measureSelected, stats[measureSelected])}
          </span>
          <span className="text-lg">
            <strong>
              {measures[measureSelected as keyof typeof measures]}
            </strong>
            {' of '}
            <strong>{feature}</strong>
          </span>
        </>
      );
    }

    if (dataset.featureLevel === 'population' && data.length) {
      const columnType = dataset.columnTypes[feature];
      const displayValue = isNumericChartColumn(columnType)
        ? formatChartNumericValue(
            getNumericFeatureValues(
              data as Array<Record<string, unknown>>,
              feature,
              columnType,
            )[0],
            columnType,
          )
        : (data[0] as Record<string, any>)[feature];
      return (
        <>
          <span className="text-6xl font-bold">{displayValue}</span>
          <span className="text-lg">{feature}</span>
        </>
      );
    }

    return <></>;
  };

  return (
    <div className="flex flex-col gap-2 px-2 pb-2 h-full">
      <CollapsibleChartConfig
        chartId={chartId}
        collapsedLabel={
          feature
            ? `${feature} (${measures[measureSelected]})`
            : 'Descriptive Statistics'
        }
      >
        <div className="flex flex-col gap-2">
          <FeatureSelect
            feature={feature}
            handleFeatureChange={(value) => setFeature(value)}
            featureOptions={getFeatureOptions()}
          />
          {dataset.featureLevel !== 'population' && (
            <Select
              className="w-full max-w-sm"
              label="Measure"
              value={measureSelected}
              onChange={(value) =>
                setMeasureSelected(value as keyof typeof measures)
              }
              options={measures}
            />
          )}
        </div>
      </CollapsibleChartConfig>
      <div className="flex-grow flex flex-row gap-2 w-full justify-center overflow-y-auto">
        <div className="flex flex-col justify-center items-center gap-6 h-full ">
          {jumbotron()}
        </div>
      </div>
    </div>
  );
};

export default DescriptiveStatistics;
