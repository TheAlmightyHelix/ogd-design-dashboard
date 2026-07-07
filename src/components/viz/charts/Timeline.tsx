import { useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import useChartOption from '../../../hooks/useChartOption';
import useDataStore from '../../../store/useDataStore';
import FeatureSelect from '../../layout/select/FeatureSelect';
import { CollapsibleChartConfig } from '../CollapsibleChartConfig';
import {
  getDatetimeFeatureValue,
  getFeatureOptionsForColumnTypes,
} from '../../../utils/columnValueUtils';
import { formatDatetime } from '../../../utils/temporalUtils';

interface TimelineProps {
  dataset: GameData;
  chartId: string;
}

export const Timeline: React.FC<TimelineProps> = ({ dataset, chartId }) => {
  const [feature, setFeature] = useChartOption<string>(chartId, 'feature', '');
  const { getFilteredDataset } = useDataStore();
  const filteredDataset = getFilteredDataset(dataset.id);
  const data = filteredDataset?.data || [];

  const getFeatureOptions = () =>
    getFeatureOptionsForColumnTypes(dataset.columnTypes, ['Datetime']);

  useEffect(() => {
    if (feature && !getFeatureOptions()[feature]) {
      setFeature('');
    }
  }, [feature, dataset.columnTypes]);

  const renderChart = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      dimensions: { width: number; height: number },
    ) => {
      if (!feature || !data.length) return;

      const columnType = dataset.columnTypes[feature];
      const points = data
        .map((row, index) => {
          const record = row as Record<string, unknown>;
          const date = getDatetimeFeatureValue(record, feature, columnType);
          if (!date) return null;
          const label =
            typeof record.PlayerID === 'string'
              ? record.PlayerID
              : typeof record.SessionID === 'string'
                ? record.SessionID
                : `Row ${index + 1}`;
          return { date, label };
        })
        .filter((point): point is { date: Date; label: string } => point != null);

      if (points.length === 0) return;

      const margin = { top: 20, right: 20, bottom: 60, left: 20 };
      const width = Math.max(0, dimensions.width - margin.left - margin.right);
      const height = Math.max(
        0,
        dimensions.height - margin.top - margin.bottom,
      );
      if (width <= 0 || height <= 0) return;

      const chartGroup = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleTime()
        .domain(d3.extent(points, (d) => d.date) as [Date, Date])
        .range([0, width])
        .nice();

      const yCenter = height / 2;
      const jitterSpread = Math.min(24, height / 4);

      chartGroup
        .selectAll('.timeline-point')
        .data(points)
        .enter()
        .append('circle')
        .attr('class', 'timeline-point')
        .attr('cx', (d) => xScale(d.date))
        .attr('cy', (_, index) => yCenter + ((index % 5) - 2) * (jitterSpread / 4))
        .attr('r', 4)
        .attr('fill', '#281d8d')
        .attr('opacity', 0.75)
        .append('title')
        .text((d) => `${d.label}: ${formatDatetime(d.date)}`);

      chartGroup
        .append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yCenter)
        .attr('y2', yCenter)
        .attr('stroke', '#d1d5db')
        .attr('stroke-width', 1);

      const xAxis = d3
        .axisBottom(xScale)
        .ticks(Math.min(8, Math.floor(width / 90)))
        .tickFormat((value) => formatDatetime(value as Date));

      chartGroup
        .append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .attr('font-size', Math.max(10, Math.min(12, width / 50)))
        .selectAll('text')
        .attr('transform', 'rotate(-25)')
        .style('text-anchor', 'end');

      chartGroup
        .append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', Math.max(12, Math.min(14, height / 25)))
        .attr('fill', '#374151')
        .text(feature);
    },
    [feature, data, dataset.columnTypes],
  );

  const { svgRef, containerRef } = useResponsiveChart(renderChart);

  return (
    <div className="flex flex-col gap-2 px-2 pb-2 h-full">
      <CollapsibleChartConfig
        chartId={chartId}
        collapsedLabel={feature || 'Timeline'}
      >
        <FeatureSelect
          feature={feature}
          handleFeatureChange={(value) => setFeature(value)}
          featureOptions={getFeatureOptions()}
        />
      </CollapsibleChartConfig>
      <div ref={containerRef} className="flex-1 min-h-0">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
};
