import React, { useCallback, useEffect, useState } from 'react';
import useDataStore from '../../../store/useDataStore';
import * as d3 from 'd3';
import Select from '../../layout/Select';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import { Minus, Plus } from 'lucide-react';
import Input from '../../layout/Input';
import useChartOption from '../../../hooks/useChartOption';

interface HistogramProps {
  gameDataId: string;
  chartId: string;
}

export const Histogram: React.FC<HistogramProps> = ({
  gameDataId,
  chartId,
}) => {
  const { getDatasetByID, hasHydrated } = useDataStore();
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

  const dataset = getDatasetByID(gameDataId);

  if (!dataset) {
    return hasHydrated ? (
      <div>Dataset not found</div>
    ) : (
      <div>Loading dataset...</div>
    );
  }

  const { data } = dataset;

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

      // Create histogram generator
      const histogram = d3
        .bin()
        .domain(d3.extent(values) as [number, number])
        .thresholds(
          d3.ticks(d3.min(values) || 0, d3.max(values) || 0, binCount),
        );

      const bins = histogram(values);

      // X scale (linear)
      const xScale = d3
        .scaleLinear()
        .domain([bins[0].x0 || 0, bins[bins.length - 1].x1 || 0])
        .range([0, width]);

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
        .attr('fill', '#ff8e38')
        .attr('rx', 1);

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

      // Add X axis
      const xAxis = d3.axisBottom(xScale);
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
    [feature, binCount, data, rangeFilter],
  );

  const { svgRef, containerRef } = useResponsiveChart(renderChart);

  const getFeatureOptions = () => {
    return Object.fromEntries(
      Object.entries(dataset.columnTypes)
        .filter(([_, value]) => value === 'number')
        .map(([key]) => [key, key]),
    );
  };

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      <div className="flex gap-2 items-end">
        <Select
          className="flex-1 max-w-sm"
          label="Feature"
          value={feature}
          onChange={(value) => setFeature(value)}
          options={getFeatureOptions()}
        />
        <Select
          className="w-24"
          label="Bins"
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

      <div ref={containerRef} className="flex-1 min-h-0">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};
