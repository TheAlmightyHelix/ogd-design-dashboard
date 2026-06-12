import React, { useCallback, useMemo } from 'react';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import SearchableSelect from '../../layout/select/SearchableSelect';
import { detectGraphCycles } from './jobGraphUtil';
import useChartOption from '../../../hooks/useChartOption';
import useDataStore from '../../../store/useDataStore';
import { CollapsibleChartConfig } from '../CollapsibleChartConfig';
import {
  aggregateGraphFeatures,
  graphFeatureToSankey,
  type SankeyData as GraphSankeyData,
} from '../../../utils/graphFeatureUtils';

interface SankeyProps {
  dataset: GameData;
  chartId: string;
}

interface SankeyNode {
  id: string;
  name: string;
  value?: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export const Sankey: React.FC<SankeyProps> = ({ dataset, chartId }) => {
  const graphColumns = useMemo(
    () =>
      Object.entries(dataset.columnTypes)
        .filter(([, value]) => value === 'Graph')
        .map(([key]) => key),
    [dataset.columnTypes],
  );

  const [feature, setFeature] = useChartOption<string>(
    chartId,
    'feature',
    graphColumns[0] ?? '',
  );
  const { getFilteredDataset } = useDataStore();

  const filteredDataset = getFilteredDataset(dataset.id);
  const data = filteredDataset?.data || [];

  const sankeyData = useMemo((): GraphSankeyData | null => {
    if (!feature || data.length === 0) return null;
    const aggregated = aggregateGraphFeatures(data, feature);
    if (!aggregated) return null;
    const transformed = graphFeatureToSankey(aggregated);
    const nodeRecord = Object.fromEntries(
      transformed.nodes.map((n) => [n.id, n]),
    );
    if (detectGraphCycles(nodeRecord, transformed.links)) {
      console.error('Graph contains a cycle (circular links detected)');
      alert('Data in feature contains a cycle (circular links detected)');
      return { nodes: [], links: [] };
    }
    return transformed;
  }, [data, feature]);

  const renderChart = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      dimensions: { width: number; height: number },
    ) => {
      svg.selectAll('*').remove();

      if (!sankeyData || sankeyData.nodes.length === 0) {
        const message = !feature
          ? 'Select a feature to display chart'
          : 'No data available';
        svg
          .append('text')
          .attr('x', dimensions.width / 2)
          .attr('y', dimensions.height / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#6b7280')
          .text(message);
        return;
      }

      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      const width = dimensions.width - margin.left - margin.right;
      const height = dimensions.height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('font-family', 'monospace')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('white-space', 'pre-line')
        .style('opacity', 0);

      const color = d3.scaleOrdinal(d3.schemeCategory10);

      const sankeyLayout = sankey<SankeyNode, SankeyLink>()
        .nodeId((d) => d.id)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([
          [1, 1],
          [width - 1, height - 1],
        ]);

      const { nodes, links } = sankeyLayout({
        nodes: sankeyData.nodes.map((d) => ({ ...d })),
        links: sankeyData.links.map((d) => ({ ...d })),
      });

      const link = g
        .append('g')
        .selectAll('.link')
        .data(links)
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', sankeyLinkHorizontal())
        .attr('stroke', (d: any) => color(d.source.id))
        .attr('stroke-width', (d: any) => Math.max(1, d.width || 1))
        .attr('fill', 'none')
        .attr('opacity', 0.7)
        .on('mouseover', function (event: any, d: any) {
          const tooltipContent = `${d.source.name} → ${d.target.name}\nValue: ${d.value}`;

          tooltip
            .style('opacity', 1)
            .html(tooltipContent)
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 10 + 'px');
        })
        .on('mouseout', function () {
          tooltip.style('opacity', 0);
        })
        .on('mousemove', function (event: any) {
          tooltip
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 10 + 'px');
        });

      const node = g
        .append('g')
        .selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .call(
          d3
            .drag<SVGGElement, any>()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended),
        );

      node
        .append('rect')
        .attr('x', (d: any) => d.x0 || 0)
        .attr('y', (d: any) => d.y0 || 0)
        .attr('height', (d: any) => (d.y1 || 0) - (d.y0 || 0))
        .attr('width', (d: any) => (d.x1 || 0) - (d.x0 || 0))
        .attr('fill', (d: any) => color(d.id))
        .attr('stroke', '#000');

      node
        .append('text')
        .attr('x', (d: any) =>
          (d.x0 || 0) < width / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6,
        )
        .attr('y', (d: any) => ((d.y1 || 0) + (d.y0 || 0)) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d: any) =>
          (d.x0 || 0) < width / 2 ? 'start' : 'end',
        )
        .attr('font-size', Math.max(10, Math.min(12, height / 40)))
        .text((d: any) => d.name)
        .attr('fill', '#333');

      function dragstarted(this: SVGGElement) {
        d3.select(this).raise().attr('stroke', '#000');
      }

      function dragged(this: SVGGElement, event: any, d: any) {
        d.x0 = event.x;
        d.y0 = event.y;

        d3.select(this)
          .select('rect')
          .attr('x', d.x0)
          .attr('y', d.y0)
          .attr('width', (d.x1 || 0) - d.x0)
          .attr('height', (d.y1 || 0) - d.y0);

        d3.select(this)
          .select('text')
          .attr('x', d.x0 < width / 2 ? (d.x1 || 0) + 6 : d.x0 - 6)
          .attr('y', ((d.y1 || 0) + d.y0) / 2);

        link.attr('d', sankeyLinkHorizontal());
      }

      function dragended(this: SVGGElement) {
        d3.select(this).attr('stroke', null);
      }

      return () => {
        d3.selectAll('.tooltip').remove();
      };
    },
    [sankeyData, feature],
  );

  const { svgRef, containerRef } = useResponsiveChart(renderChart);

  const getFeatureOptions = () =>
    Object.fromEntries(graphColumns.map((key) => [key, key]));

  return (
    <div className="flex flex-col gap-2 px-2 pb-2 h-full">
      <CollapsibleChartConfig
        chartId={chartId}
        collapsedLabel={feature || 'Sankey'}
      >
        <SearchableSelect
          className="w-full max-w-sm"
          label="Feature"
          placeholder="Select a feature..."
          value={feature}
          onChange={setFeature}
          options={getFeatureOptions()}
        />
      </CollapsibleChartConfig>
      <div ref={containerRef} className="flex-1 min-h-0">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};
