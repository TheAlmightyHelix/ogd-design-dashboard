import React, { useCallback, useMemo, useState } from 'react';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import Select from '../../layout/Select';
import {
  EdgeMode,
  getNodes,
  getEdges,
  detectGraphCycles,
} from './progressionGraphsUtil';
import useChartOption from '../../../hooks/useChartOption';
import useDataStore from '../../../store/useDataStore';

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

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export const Sankey: React.FC<SankeyProps> = ({ dataset, chartId }) => {
  const [edgeMode, setEdgeMode] = useChartOption<keyof typeof EdgeMode>(
    chartId,
    'edgeMode',
    'TopJobCompletionDestinations',
  );
  const { getFilteredDataset } = useDataStore();

  // Get filtered dataset from centralized store
  const filteredDataset = getFilteredDataset(dataset.id);
  const data = filteredDataset?.data || [];

  const sankeyData = useMemo(() => {
    return processDataForSankey(data[0], edgeMode);
  }, [data, edgeMode]);

  const renderChart = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      dimensions: { width: number; height: number },
    ) => {
      if (!sankeyData || sankeyData.nodes.length === 0) return;

      // Clear previous content
      svg.selectAll('*').remove();

      // Create margins
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      const width = dimensions.width - margin.left - margin.right;
      const height = dimensions.height - margin.top - margin.bottom;

      // Create a group for all chart elements
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Create custom tooltip
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

      // Create color scale
      const color = d3.scaleOrdinal(d3.schemeCategory10);

      // Create Sankey layout
      const sankeyLayout = sankey<SankeyNode, SankeyLink>()
        .nodeId((d) => d.id)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([
          [1, 1],
          [width - 1, height - 1],
        ]);

      // Process data for Sankey
      const { nodes, links } = sankeyLayout({
        nodes: sankeyData.nodes.map((d) => ({ ...d })),
        links: sankeyData.links.map((d) => ({ ...d })),
      });

      // Create links
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

      // Create nodes
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

      // Add node rectangles
      node
        .append('rect')
        .attr('x', (d: any) => d.x0 || 0)
        .attr('y', (d: any) => d.y0 || 0)
        .attr('height', (d: any) => (d.y1 || 0) - (d.y0 || 0))
        .attr('width', (d: any) => (d.x1 || 0) - (d.x0 || 0))
        .attr('fill', (d: any) => color(d.id))
        .attr('stroke', '#000');

      // Add node labels
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

      // Drag functions
      function dragstarted(this: SVGGElement, event: any, d: any) {
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

      function dragended(this: SVGGElement, event: any, d: any) {
        d3.select(this).attr('stroke', null);
      }

      // Return cleanup function
      return () => {
        d3.selectAll('.tooltip').remove();
      };
    },
    [sankeyData],
  );

  const { svgRef, containerRef } = useResponsiveChart(renderChart);

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      <Select
        className="w-full max-w-sm"
        label="Edge Mode"
        value={edgeMode}
        onChange={(value) => setEdgeMode(value as keyof typeof EdgeMode)}
        options={Object.fromEntries(
          Object.entries(EdgeMode).map(([key, value]) => [key, value]),
        )}
      />
      <div ref={containerRef} className="flex-1 min-h-0">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};

/**
 * Process data for Sankey diagram using the existing getNodes and getEdges functions
 */
function processDataForSankey(
  data: any,
  edgeMode: keyof typeof EdgeMode,
): SankeyData {
  // Get nodes and edges using the existing utility functions
  const rawNodes = getNodes(data);
  const rawEdges = getEdges(data, edgeMode);

  // Use utility to check for cycles
  if (detectGraphCycles(rawNodes, rawEdges)) {
    console.error('Graph contains a cycle (circular links detected)');
    alert('Graph contains a cycle (circular links detected)');
    return { nodes: [], links: [] };
  }

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // Convert nodes to Sankey format
  Object.values(rawNodes).forEach((node: any) => {
    if (node.id) {
      nodes.push({
        id: node.id,
        name: node.id,
        value: node['JobsAttempted-avg-time-per-attempt'] || 0,
      });
    }
  });

  // Convert edges to Sankey format
  rawEdges.forEach((edge: any) => {
    links.push({
      source: edge.source,
      target: edge.target,
      value: edge.value,
    });
  });

  return { nodes, links };
}
