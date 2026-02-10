import React, { useCallback, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import Select from '../../layout/select/Select';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import Input from '../../layout/Input';
import useChartOption from '../../../hooks/useChartOption';
import useDataStore from '../../../store/useDataStore';
import FeatureSelect from '../../layout/select/FeatureSelect';
import { applyFilters } from '../../sidebar/data-management/filterUtils';

interface HistogramProps {
  dataset: GameData;
  chartId: string;
}

export const Histogram: React.FC<HistogramProps> = ({ dataset, chartId }) => {
  const [feature, setFeature] = useChartOption<string>(chartId, 'feature', '');
  const [binCount, setBinCount] = useChartOption<number>(
    chartId,
    'binCount',
    10,
  );
  const [rangeFilter, setRangeFilter] = useChartOption<{
    min: number;
    max: number;
  }>(chartId, 'rangeFilter', { min: -Infinity, max: Infinity });
  const { addFilter, removeFilter } = useDataStore();
  const datasetRecord = useDataStore(
    useCallback((state) => state.datasets[dataset.id], [dataset.id]),
  );

  // Get filtered dataset excluding current feature's filter
  const filtersExcludingFeature = useMemo(() => {
    if (!datasetRecord?.filters) return undefined;
    const { [feature]: _ignored, ...rest } = datasetRecord.filters;
    return Object.keys(rest).length > 0 ? rest : undefined;
  }, [datasetRecord?.filters, feature]);

  const data = useMemo(() => {
    if (!datasetRecord?.data) return [];
    if (!filtersExcludingFeature) {
      return datasetRecord.data;
    }
    const filteredData = applyFilters(
      datasetRecord.data,
      filtersExcludingFeature,
    );
    return Object.assign(filteredData, {
      columns: datasetRecord.data.columns,
    }) as typeof datasetRecord.data;
  }, [datasetRecord?.data, filtersExcludingFeature]);

  const getFeatureOptions = () => {
    return Object.fromEntries(
      Object.entries(dataset.columnTypes)
        .filter(([_, value]) => value === 'Numeric')
        .map(([key]) => [key, key]),
    );
  };

  // prevent invalid feature selection
  useEffect(() => {
    if (feature && !getFeatureOptions()[feature]) {
      setFeature('');
    }
  }, [feature]);

  // Derive selectedBins directly from store (single source of truth)
  const selectedBins = useMemo(() => {
    if (!feature) return [];
    const storeFilter = datasetRecord?.filters?.[feature];
    return storeFilter?.filterType === 'numeric' && storeFilter.ranges
      ? storeFilter.ranges
      : [];
  }, [datasetRecord?.filters, feature]);

  // Handle bin clicks - update store directly
  const handleBinToggle = useCallback(
    (binRange: { min: number; max: number }) => {
      if (!feature) return;

      const isSelected = selectedBins.some(
        (r) => r.min === binRange.min && r.max === binRange.max,
      );
      const nextSelected = isSelected
        ? selectedBins.filter(
            (r) => !(r.min === binRange.min && r.max === binRange.max),
          )
        : [...selectedBins, binRange];

      if (nextSelected.length > 0) {
        addFilter(dataset.id, feature, {
          filterType: 'numeric',
          ranges: nextSelected,
        });
      } else {
        removeFilter(dataset.id, feature);
      }
    },
    [addFilter, dataset.id, feature, removeFilter, selectedBins],
  );

  const handleClearSelection = useCallback(() => {
    if (!feature) return;
    removeFilter(dataset.id, feature);
  }, [dataset.id, feature, removeFilter]);

  const renderChart = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      dimensions: { width: number; height: number },
    ) => {
      if (!feature || !data.length) return;

      // Extract numeric values for the selected feature
      const safeMin =
        typeof rangeFilter.min === 'number' ? rangeFilter.min : -Infinity;
      const safeMax =
        typeof rangeFilter.max === 'number' ? rangeFilter.max : Infinity;
      const values = data
        .map((d) => (d as Record<string, any>)[feature])
        .filter(
          (value) =>
            typeof value === 'number' &&
            !isNaN(value) &&
            value >= safeMin &&
            value <= safeMax,
        );

      if (values.length === 0) return;

      // Chart dimensions with responsive margins
      const margin = {
        top: 20,
        right: 20,
        bottom: 60,
        left: 60,
      };
      const width = dimensions.width - margin.left - margin.right;
      const height = dimensions.height - margin.top - margin.bottom;

      const chartGroup = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Create histogram generator (count-based thresholds so D3 avoids zero-width last bin)
      const histogram = d3.bin().thresholds(binCount);
      const bins = histogram(values);
      const xExtent = [
        bins[0]?.x0 ?? 0,
        bins[bins.length - 1]?.x1 ?? 0,
      ] as [number, number];

      // Helper to check if a bin is selected
      const isBinSelected = (bin: d3.Bin<number, number>) => {
        const binMin = bin.x0 ?? -Infinity;
        const binMax = bin.x1 ?? Infinity;
        return selectedBins.some(
          (range) => range.min === binMin && range.max === binMax,
        );
      };

      // X scale (linear) - use bin boundaries for proper alignment
      const xScale = d3.scaleLinear().domain(xExtent).range([0, width]);

      // Y scale (linear)
      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (d) => d.length) || 0])
        .range([height, 0]);

      // Add bars
      chartGroup
        .selectAll('.bar')
        .data(bins)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => xScale(d.x0 || 0))
        .attr('y', (d) => yScale(d.length))
        .attr('width', (d) =>
          Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1),
        )
        .attr('height', (d) => height - yScale(d.length))
        .attr('fill', (d) => {
          const selected = isBinSelected(d);
          const hasSelection = selectedBins.length > 0;
          return hasSelection && !selected ? '#d1d5db' : '#ff8e38';
        })
        .attr('rx', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this).transition().duration(200).style('opacity', 0.8);
        })
        .on('mouseout', function () {
          d3.select(this).transition().duration(200).style('opacity', 1);
        })
        .on('click', (_, d) => {
          const binMin = d.x0 ?? -Infinity;
          const binMax = d.x1 ?? Infinity;
          const binRange = { min: binMin, max: binMax };
          handleBinToggle(binRange);
        });

      // Add bar labels (only if there's enough space and not too many bins)
      if (bins.length <= 15) {
        chartGroup
          .selectAll('.bar-label')
          .data(bins)
          .enter()
          .append('text')
          .attr('class', 'bar-label')
          .attr(
            'x',
            (d) =>
              xScale(d.x0 || 0) + (xScale(d.x1 || 0) - xScale(d.x0 || 0)) / 2,
          )
          .attr('y', (d) => yScale(d.length) - 5)
          .attr('text-anchor', 'middle')
          .attr('font-size', Math.max(8, Math.min(10, height / 40)))
          .attr('fill', '#374151')
          .text((d) => d.length);
      }

      // Add X axis with ticks aligned to bin boundaries
      const binBoundaries = bins
        .flatMap((bin) => [bin.x0, bin.x1])
        .filter((value): value is number => value !== undefined)
        .filter((value, index, array) => array.indexOf(value) === index)
        .sort((a, b) => a - b);
      const xAxis = d3.axisBottom(xScale).tickValues(binBoundaries);

      chartGroup
        .append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .attr('font-size', Math.max(10, Math.min(12, width / 50)));

      // Add Y axis
      const yAxis = d3.axisLeft(yScale);
      chartGroup
        .append('g')
        .call(yAxis)
        .attr('font-size', Math.max(10, Math.min(12, height / 30)));

      // Add axis labels
      chartGroup
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .attr('font-size', Math.max(12, Math.min(14, height / 25)))
        .attr('fill', '#374151')
        .text('Frequency');

      chartGroup
        .append('text')
        .attr(
          'transform',
          `translate(${width / 2}, ${height + margin.bottom - 10})`,
        )
        .style('text-anchor', 'middle')
        .attr('font-size', Math.max(12, Math.min(14, height / 25)))
        .attr('fill', '#374151')
        .text(feature);

      // Add statistics info
      const mean = d3.mean(values) || 0;
      const std = d3.deviation(values) || 0;
      const median = d3.median(values) || 0;
      const mode = d3.mode(values) || 0;

      chartGroup
        .append('text')
        .attr('x', width - 10)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(10, Math.min(12, height / 35)))
        .attr('fill', '#6b7280')
        .text(`Mean: ${mean.toFixed(2)}`);

      chartGroup
        .append('text')
        .attr('x', width - 10)
        .attr('y', 35)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(10, Math.min(12, height / 35)))
        .attr('fill', '#6b7280')
        .text(`Std: ${std.toFixed(2)}`);

      chartGroup
        .append('text')
        .attr('x', width - 10)
        .attr('y', 50)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(10, Math.min(12, height / 35)))
        .attr('fill', '#6b7280')
        .text(`Median: ${median.toFixed(2)}`);

      chartGroup
        .append('text')
        .attr('x', width - 10)
        .attr('y', 65)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(10, Math.min(12, height / 35)))
        .attr('fill', '#6b7280')
        .text(`Mode: ${mode.toFixed(2)}`);
    },
    [feature, binCount, data, rangeFilter, selectedBins, handleBinToggle],
  );

  const { svgRef, containerRef } = useResponsiveChart(renderChart);

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      <div className="flex gap-2 items-end">
        {/* <SearchableSelect
          className="flex-1 max-w-sm"
          label="Feature"
          placeholder="Select a feature..."
          value={feature}
          onChange={(value) => setFeature(value)}
          options={getFeatureOptions()}
          /> */}
        <FeatureSelect
          feature={feature}
          handleFeatureChange={(value) => setFeature(value)}
          featureOptions={getFeatureOptions()}
        />
        <Select
          className="w-24"
          label="Bins"
          helpText="Controls how granularly the data is divided"
          value={binCount.toString()}
          onChange={(value) => setBinCount(parseInt(value))}
          options={Object.fromEntries(
            ['5', '10', '15', '20', '25', '30'].map((binCount) => [
              binCount,
              binCount,
            ]),
          )}
        />
      </div>
      <div className="flex gap-2 items-end">
        <Input
          label="Min"
          value={
            rangeFilter.min === -Infinity || rangeFilter.min == null
              ? ''
              : rangeFilter.min.toString()
          }
          onChange={(value) =>
            setRangeFilter({
              ...rangeFilter,
              min: value === '' ? -Infinity : parseFloat(value),
            })
          }
          debounce
        />
        <Input
          label="Max"
          value={
            rangeFilter.max === Infinity || rangeFilter.max == null
              ? ''
              : rangeFilter.max.toString()
          }
          onChange={(value) =>
            setRangeFilter({
              ...rangeFilter,
              max: value === '' ? Infinity : parseFloat(value),
            })
          }
          debounce
        />
      </div>

      <div ref={containerRef} className="relative flex-1 min-h-0">
        {selectedBins.length > 0 && (
          <button
            type="button"
            className="absolute right-2 top-2 z-10 rounded bg-gray-100/70 px-2 py-1 text-xs text-slate-600 backdrop-blur transition hover:border-slate-400 hover:text-slate-800"
            onClick={handleClearSelection}
          >
            Clear selection
          </button>
        )}
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};
