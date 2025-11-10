import React, { useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import SearchableSelect from '../../layout/select/SearchableSelect';
import useChartOption from '../../../hooks/useChartOption';
import useDataStore from '../../../store/useDataStore';
import FeatureSelect from '../../layout/select/FeatureSelect';

interface BarChartProps {
  dataset: GameData;
  chartId: string;
}

export const BarChart: React.FC<BarChartProps> = ({ dataset, chartId }) => {
  const [feature, setFeature] = useChartOption<string>(chartId, 'feature', '');
  const [filter, setFilter] = useChartOption<string[]>(chartId, 'filter', []);
  const { getFilteredDataset } = useDataStore();

  const isOrdinal = dataset?.columnTypes[feature] === 'Ordinal';

  // Get filtered dataset from centralized store
  const filteredDataset = getFilteredDataset(dataset.id);
  const data = filteredDataset?.data || [];

  const renderChart = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      dimensions: { width: number; height: number },
    ) => {
      // Clear any existing content
      svg.selectAll('*').remove();

      if (!feature || !data.length) {
        // Render empty chart with placeholder text
        svg
          .append('text')
          .attr('x', dimensions.width / 2)
          .attr('y', dimensions.height / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#6b7280')
          .text(
            !feature
              ? 'Select a feature to display chart'
              : 'No data available',
          );
        return;
      }

      // Get unique values and their counts for the selected feature
      const valueCounts = d3.rollup(
        data,
        (v) => v.length,
        (d) => (d as Record<string, any>)[feature],
      );

      const chartData = Array.from(valueCounts.entries())
        .map(([value, count]) => ({
          value: String(value),
          count,
        }))
        .filter((d) => filter.length === 0 || filter.includes(d.value));

      // Sort data based on feature type
      if (isOrdinal) {
        // For ordinal data, sort by the actual values (assuming they can be compared)
        chartData.sort((a, b) => {
          const aNum = parseFloat(a.value);
          const bNum = parseFloat(b.value);

          // If both values are numbers, sort numerically
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }

          // Otherwise, sort alphabetically
          return a.value.localeCompare(b.value);
        });
      } else {
        // For categorical data, sort by count descending
        chartData.sort((a, b) => b.count - a.count);
      }

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

      // X scale (categorical)
      const xScale = d3
        .scaleBand()
        .domain(chartData.map((d) => d.value))
        .range([0, width])
        .padding(0.1);

      // Y scale (linear)
      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(chartData, (d) => d.count) || 0])
        .range([height, 0]);

      // Add bars
      chartGroup
        .selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => xScale(d.value) || 0)
        .attr('y', (d) => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) => height - yScale(d.count))
        .attr('fill', '#3b82f6')
        .attr('rx', 2);

      // Add bar labels (only if there's enough space)
      if (chartData.length <= 20) {
        // Limit labels to prevent overcrowding
        chartGroup
          .selectAll('.bar-label')
          .data(chartData)
          .enter()
          .append('text')
          .attr('class', 'bar-label')
          .attr('x', (d) => (xScale(d.value) || 0) + xScale.bandwidth() / 2)
          .attr('y', (d) => yScale(d.count) - 5)
          .attr('text-anchor', 'middle')
          .attr('font-size', Math.max(8, Math.min(10, height / 40)))
          .attr('fill', '#374151')
          .text((d) => d.count);
      }

      // Add X axis
      const xAxis = d3.axisBottom(xScale);
      chartGroup
        .append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-30)')
        .style('text-anchor', 'end')
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
        .text('Count');

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
    },
    [feature, data, filter],
  );

  const { svgRef, containerRef } = useResponsiveChart(renderChart);

  const filterOptions = useMemo(() => {
    if (!feature || !dataset) return {};
    const categories = Array.from(
      new Set(
        data
          .map((d) => (d as Record<string, any>)[feature])
          .filter((value) => value != null)
          .map((value) => value.toString()),
      ),
    );
    return Object.fromEntries(
      categories.map((category) => [category, category]),
    );
  }, [feature, data, dataset]);

  const getFeatureOptions = () => {
    return Object.fromEntries(
      Object.entries(dataset.columnTypes)
        .filter(([_, value]) => value === 'Categorical' || value === 'Ordinal')
        .map(([key]) => [key, key]),
    );
  };

  const handleFeatureChange = (value: string) => {
    if (value === feature) return;
    setFeature(value);
    setFilter([]);
  };

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      {/* <SearchableSelect
        className="w-full max-w-sm"
        label="Feature"
        placeholder="Select a feature..."
        value={feature}
        onChange={handleFeatureChange}
        options={getFeatureOptions()}
      /> */}
      <FeatureSelect
        feature={feature}
        handleFeatureChange={handleFeatureChange}
        featureOptions={getFeatureOptions()}
      />
      {feature && (
        <SearchableSelect
          className="w-full max-w-sm"
          label="Categories to include"
          placeholder="All"
          value={filter}
          onChange={(value) => setFilter(value)}
          options={filterOptions}
          selectMultiple
        />
      )}

      <div ref={containerRef} className="flex-1 min-h-0">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};
