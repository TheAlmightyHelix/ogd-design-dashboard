import { useCallback } from 'react';
import useDataStore from '../../../store/useDataStore';
import Select from '../../layout/Select';
import * as d3 from 'd3';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import useChartOption from '../../../hooks/useChartOption';

interface BoxPlotProps {
  gameDataId: string;
  chartId: string;
}

const BoxPlot: React.FC<BoxPlotProps> = ({ gameDataId, chartId }) => {
  const { getDatasetByID, hasHydrated } = useDataStore();
  const [feature, setFeature] = useChartOption<string>(chartId, 'feature', '');

  const dataset = getDatasetByID(gameDataId);

  // Create a safe data reference that won't cause issues if dataset is null
  const data = dataset?.data || [];

  const renderChart = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      dimensions: { width: number; height: number },
    ) => {
      if (!feature || !data.length) return;

      // Calculate box plot statistics
      const values = data
        .map((d) => (d as Record<string, any>)[feature])
        .filter((v) => v !== null && v !== undefined);
      if (values.length === 0) return;

      const sortedValues = values.sort((a, b) => a - b);
      const q1 = d3.quantile(sortedValues, 0.25) || 0;
      const q2 = d3.quantile(sortedValues, 0.5) || 0;
      const q3 = d3.quantile(sortedValues, 0.75) || 0;
      const iqr = q3 - q1;
      const lowerWhisker = Math.max(q1 - 1.5 * iqr, d3.min(sortedValues) || 0);
      const upperWhisker = Math.min(q3 + 1.5 * iqr, d3.max(sortedValues) || 0);

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

      // Y scale (for the numerical values)
      const yScale = d3
        .scaleLinear()
        .domain([
          lowerWhisker - (upperWhisker - lowerWhisker) * 0.1,
          upperWhisker + (upperWhisker - lowerWhisker) * 0.1,
        ])
        .range([height, 0]);

      // X scale (for positioning the box plot)
      const xScale = d3
        .scaleBand()
        .domain([feature])
        .range([0, width])
        .padding(0.3);

      const boxWidth = xScale.bandwidth() * 0.8;
      const boxX = (xScale(feature) || 0) + (xScale.bandwidth() - boxWidth) / 2;

      // Draw whiskers
      chartGroup
        .append('line')
        .attr('x1', boxX + boxWidth / 2)
        .attr('x2', boxX + boxWidth / 2)
        .attr('y1', yScale(upperWhisker))
        .attr('y2', yScale(lowerWhisker))
        .attr('stroke', '#374151')
        .attr('stroke-width', 2);

      // Draw upper whisker
      chartGroup
        .append('line')
        .attr('x1', boxX + boxWidth / 2 - 10)
        .attr('x2', boxX + boxWidth / 2 + 10)
        .attr('y1', yScale(upperWhisker))
        .attr('y2', yScale(upperWhisker))
        .attr('stroke', '#374151')
        .attr('stroke-width', 2);

      // Draw lower whisker
      chartGroup
        .append('line')
        .attr('x1', boxX + boxWidth / 2 - 10)
        .attr('x2', boxX + boxWidth / 2 + 10)
        .attr('y1', yScale(lowerWhisker))
        .attr('y2', yScale(lowerWhisker))
        .attr('stroke', '#374151')
        .attr('stroke-width', 2);

      // Draw box
      chartGroup
        .append('rect')
        .attr('x', boxX)
        .attr('y', yScale(q3))
        .attr('width', boxWidth)
        .attr('height', yScale(q1) - yScale(q3))
        .attr('fill', '#3b82f6')
        .attr('stroke', '#374151')
        .attr('stroke-width', 1);

      // Draw median line
      chartGroup
        .append('line')
        .attr('x1', boxX)
        .attr('x2', boxX + boxWidth)
        .attr('y1', yScale(q2))
        .attr('y2', yScale(q2))
        .attr('stroke', '#1f2937')
        .attr('stroke-width', 2);

      // Add outliers
      const outliers = sortedValues.filter(
        (v) => v < lowerWhisker || v > upperWhisker,
      );
      if (outliers.length > 0) {
        chartGroup
          .selectAll('.outlier')
          .data(outliers)
          .enter()
          .append('circle')
          .attr('class', 'outlier')
          .attr('cx', boxX + boxWidth / 2)
          .attr('cy', (d) => yScale(d))
          .attr('r', 3)
          .attr('fill', '#ef4444')
          .attr('stroke', '#dc2626')
          .attr('stroke-width', 1);
      }

      // Add Y axis
      const yAxis = d3.axisLeft(yScale);
      chartGroup
        .append('g')
        .call(yAxis)
        .attr('font-size', Math.max(10, Math.min(12, height / 30)));

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
      chartGroup
        .append('text')
        .attr('x', width - 10)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(10, Math.min(12, height / 35)))
        .attr('fill', '#6b7280')
        .text(`Q1: ${q1.toFixed(2)}`);

      chartGroup
        .append('text')
        .attr('x', width - 10)
        .attr('y', 35)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(10, Math.min(12, height / 35)))
        .attr('fill', '#6b7280')
        .text(`Q2: ${q2.toFixed(2)}`);

      chartGroup
        .append('text')
        .attr('x', width - 10)
        .attr('y', 50)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(10, Math.min(12, height / 35)))
        .attr('fill', '#6b7280')
        .text(`Q3: ${q3.toFixed(2)}`);

      chartGroup
        .append('text')
        .attr('x', width - 10)
        .attr('y', 65)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(10, Math.min(12, height / 35)))
        .attr('fill', '#6b7280')
        .text(`IQR: ${iqr.toFixed(2)}`);
    },
    [feature, data],
  );

  const { svgRef, containerRef } = useResponsiveChart(renderChart);

  if (!dataset) {
    return hasHydrated ? (
      <div>Dataset not found</div>
    ) : (
      <div>Loading dataset...</div>
    );
  }

  const getFeatureOptions = () => {
    return Object.fromEntries(
      Object.entries(dataset.columnTypes)
        .filter(([_, value]) => value === 'number')
        .map(([key]) => [key, key]),
    );
  };

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      <Select
        className="w-full max-w-sm"
        label="Feature"
        value={feature}
        onChange={(value) => setFeature(value)}
        options={getFeatureOptions()}
      />

      <div ref={containerRef} className="flex-1 min-h-0">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};

export default BoxPlot;
