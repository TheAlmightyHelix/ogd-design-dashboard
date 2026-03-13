import React, { useCallback, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import Select from '../../layout/select/Select';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import Input from '../../layout/Input';
import useChartOption from '../../../hooks/useChartOption';
import useDataStore from '../../../store/useDataStore';
import FeatureSelect from '../../layout/select/FeatureSelect';
import { applyFilters } from '../../sidebar/data-management/filterUtils';
import { CollapsibleChartConfig } from '../CollapsibleChartConfig';

/** Get merged "in filter" segments for a bin given selected ranges (left/right in value space) */
function getInSegments(
  binMin: number,
  binMax: number,
  ranges: Array<{ min: number; max: number }>,
): Array<{ start: number; end: number }> {
  const segments: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    const segStart = Math.max(binMin, range.min);
    const segEnd = Math.min(binMax, range.max);
    if (segStart < segEnd) {
      segments.push({ start: segStart, end: segEnd });
    }
  }
  if (segments.length === 0) return [];
  segments.sort((a, b) => a.start - b.start);
  const merged = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const last = merged[merged.length - 1];
    const curr = segments[i];
    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

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
      const xExtent = [bins[0]?.x0 ?? 0, bins[bins.length - 1]?.x1 ?? 0] as [
        number,
        number,
      ];

      // X scale (linear) - use bin boundaries for proper alignment
      const xScale = d3.scaleLinear().domain(xExtent).range([0, width]);

      // Y scale (linear)
      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (d) => d.length) || 0])
        .range([height, 0]);

      const BAR_GAP = 1;
      const HIGHLIGHT = '#ff8e38';
      const DIMMED = '#d1d5db';

      // Add bars (with partial fill when bins span filter thresholds)
      const barGroups = chartGroup
        .selectAll('.bar-group')
        .data(bins)
        .enter()
        .append('g')
        .attr('class', 'bar-group')
        .style('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this)
            .selectAll('rect')
            .transition()
            .duration(200)
            .style('opacity', 0.8);
        })
        .on('mouseout', function () {
          d3.select(this)
            .selectAll('rect')
            .transition()
            .duration(200)
            .style('opacity', 1);
        })
        .on('click', (_, d) => {
          const binMin = d.x0 ?? -Infinity;
          const binMax = d.x1 ?? Infinity;
          handleBinToggle({ min: binMin, max: binMax });
        });

      barGroups.each(function (d) {
        const g = d3.select(this);
        const binMin = d.x0 ?? -Infinity;
        const binMax = d.x1 ?? Infinity;
        const barLeft = xScale(binMin);
        const barRight = xScale(binMax) - BAR_GAP;
        const barWidth = Math.max(0, barRight - barLeft);
        const barY = yScale(d.length);
        const barHeight = height - barY;

        const inSegments =
          selectedBins.length > 0
            ? getInSegments(binMin, binMax, selectedBins)
            : [];

        if (selectedBins.length === 0) {
          g.append('rect')
            .attr('class', 'bar')
            .attr('x', barLeft)
            .attr('y', barY)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .attr('fill', HIGHLIGHT)
            .attr('rx', 1);
        } else if (inSegments.length === 0) {
          g.append('rect')
            .attr('class', 'bar')
            .attr('x', barLeft)
            .attr('y', barY)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .attr('fill', DIMMED)
            .attr('rx', 1);
        } else {
          g.append('rect')
            .attr('class', 'bar bar-base')
            .attr('x', barLeft)
            .attr('y', barY)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .attr('fill', DIMMED)
            .attr('rx', 1);

          const binSpan = binMax - binMin;
          for (const seg of inSegments) {
            const segLeft =
              barLeft + barWidth * (seg.start - binMin) / binSpan;
            const segWidth = barWidth * (seg.end - seg.start) / binSpan;
            g.append('rect')
              .attr('class', 'bar bar-segment')
              .attr('x', segLeft)
              .attr('y', barY)
              .attr('width', Math.max(0, segWidth))
              .attr('height', barHeight)
              .attr('fill', HIGHLIGHT)
              .attr('rx', 0);
          }
        }
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
    <div className="flex flex-col px-2 h-full">
      <CollapsibleChartConfig chartId={chartId} collapsedLabel={feature}>
        <FeatureSelect
          feature={feature}
          handleFeatureChange={(value) => setFeature(value)}
          featureOptions={getFeatureOptions()}
        />
        <div className="flex gap-2">
          <Select
            className="w-full"
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
      </CollapsibleChartConfig>

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
