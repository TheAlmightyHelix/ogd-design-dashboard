import useChartOption from '../../../hooks/useChartOption';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import useDataStore from '../../../store/useDataStore';
import SearchableSelect from '../../layout/select/SearchableSelect';
import * as d3 from 'd3';
import { useCallback, useMemo } from 'react';

interface ForceDirectedGraphProps {
  dataset: GameData;
  chartId: string;
}

interface Graph {
  nodes: { id: string; [key: string]: any }[];
  links: { source: string; target: string; [key: string]: any }[];
  encodings: {
    nodeColor: string | null;
    nodeSize: string | null;
    nodeLabel: string;
    nodeTooltip: string | null;
    linkWidth: string;
  };
}

/**
 * ForceDirectedGraph is a chart that displays a graph of a player's progress.
 * This chart type is only compatible with the 'PlayerProgression' feature and its subfeatures in the dataset.
 */
export const ForceDirectedGraph: React.FC<ForceDirectedGraphProps> = ({
  chartId,
  dataset,
}) => {
  const { getFilteredDataset } = useDataStore();
  const filteredDataset = getFilteredDataset(dataset.id);
  const data = filteredDataset?.data || [];
  const [feature, setFeature] = useChartOption<string>(chartId, 'feature', '');

  const { nodes, links, encodings } = useMemo(() => {
    const defaultGraph: Graph = {
      nodes: [],
      links: [],
      encodings: {
        nodeLabel: '',
        linkWidth: '',
        nodeColor: null,
        nodeSize: null,
        nodeTooltip: null,
      },
    };
    if (feature && data.length > 0) {
      try {
        const parsed = JSON.parse((data[0] as any)[feature] as string);
        return {
          nodes: parsed.nodes,
          links: parsed.links,
          encodings: parsed.encodings,
        };
      } catch (error) {
        console.error(error);
      }
    }
    return {
      nodes: defaultGraph.nodes,
      links: defaultGraph.links,
      encodings: defaultGraph.encodings,
    };
  }, [feature, data]);

  const renderChart = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      dimensions: { width: number; height: number },
    ) => {
      // Clear previous content
      svg.selectAll('*').remove();

      if (!feature) {
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

      // Create a group for all graph elements
      const g = svg.append('g');

      // Create custom tooltip div
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

      // Define arrow markers (outside the zoomed group)
      svg
        .append('defs')
        .selectAll('marker')
        .data(['arrow'])
        .enter()
        .append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -.5 1 1')
        .attr('refX', 2)
        .attr('refY', 0)
        .attr('markerWidth', 2)
        .attr('markerHeight', 2)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-.5L1,0L0,.5')
        .attr('fill', '#999');

      // Create zoom behavior
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4]) // Limit zoom between 0.1x and 4x
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      // Apply zoom to svg
      svg.call(zoom);

      // Create color scale for node colors (red to green based on percent complete)
      const nodeColorDatatype = encodings.nodeColor
        ? typeof nodes[0][encodings.nodeColor]
        : null;
      let colorScale:
        | d3.ScaleSequential<string, never>
        | d3.ScaleOrdinal<string, string>
        | undefined;
      if (nodeColorDatatype === 'number') {
        colorScale = d3
          .scaleSequential()
          .domain([0, 100])
          .interpolator(d3.interpolateRdYlGn);
      } else {
        colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      }

      // Create size scale for node radius (based on avg time per attempt)
      const sizeScale = d3
        .scaleLinear()
        .domain([
          0,
          d3.max(Object.values(nodes), (d: any) =>
            encodings.nodeSize ? d[encodings.nodeSize] : 0,
          ) || 100,
        ])
        .range([5, 30]);

      // Create width scale for edges (based on number of players)
      const widthScale = d3
        .scaleLinear()
        .domain([
          0,
          d3.max(links, (d: any) => Number(d[encodings.linkWidth]) || 0) || 1,
        ])
        .range([1, 20]);

      // Create force simulation
      const simulation = d3
        .forceSimulation(nodes as d3.SimulationNodeDatum[])
        .force(
          'link',
          d3
            .forceLink(links)
            .id((d: any) => d.id)
            .distance(100),
        )
        .force('charge', d3.forceManyBody().strength(-300))
        .force(
          'center',
          d3.forceCenter(dimensions.width / 2, dimensions.height / 2),
        )
        .force(
          'collision',
          d3
            .forceCollide()
            .radius(
              (d: any) =>
                sizeScale(encodings.nodeSize ? d[encodings.nodeSize] : 0) + 5,
            ),
        );

      // Create edges
      const link = g
        .append('g')
        .selectAll('path')
        .data(links)
        .enter()
        .append('path')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('marker-end', 'url(#arrow)')
        .attr('stroke-width', (d: any) =>
          widthScale(Number(d[encodings.linkWidth]) || 0),
        )
        .attr('fill', 'none')
        .on('mouseover', function (event, d: any) {
          const tooltipContent = `${d.source.id} → ${d.target.id}\nCount: ${d[encodings.linkWidth] || 0}`;

          tooltip
            .style('opacity', 1)
            .html(tooltipContent)
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 10 + 'px');
        })
        .on('mouseout', function () {
          tooltip.style('opacity', 0);
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 10 + 'px');
        });

      // Create nodes
      const node = g
        .append('g')
        .selectAll('circle')
        .data(Object.values(nodes))
        .enter()
        .append('circle')
        .attr('r', (d: any) =>
          sizeScale(encodings.nodeSize ? d[encodings.nodeSize] : 0),
        )
        .attr('fill', (d: any) =>
          colorScale(encodings.nodeColor ? d[encodings.nodeColor] : 0),
        )
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .on('mouseover', function (event, d: any) {
          if (encodings.nodeTooltip) {
            tooltip
              .style('opacity', 1)
              .html(d[encodings.nodeTooltip])
              .style('left', event.pageX + 10 + 'px')
              .style('top', event.pageY - 10 + 'px');
          }
        })
        .on('mouseout', function () {
          tooltip.style('opacity', 0);
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 10 + 'px');
        });

      // Create node labels
      const label = g
        .append('g')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text((d: any) => d[encodings.nodeLabel])
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .attr('pointer-events', 'none'); // Prevent labels from interfering with drag

      // Add drag behavior
      node.call(
        d3
          .drag<SVGCircleElement, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended),
      );

      // Update positions on simulation tick
      simulation.on('tick', () => {
        link.attr('d', (d: any) => {
          return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
        });

        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

        label
          .attr(
            'x',
            (d: any) =>
              d.x +
              sizeScale(encodings.nodeSize ? d[encodings.nodeSize] : 0) +
              8,
          )
          .attr('y', (d: any) => d.y);
      });

      // Drag functions
      function dragstarted(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      // Return cleanup function to stop simulation when component unmounts or dimensions change
      return () => {
        simulation.stop();
        // Remove custom tooltip
        d3.selectAll('.tooltip').remove();
      };
    },
    [nodes, links, encodings],
  );

  const { svgRef, containerRef } = useResponsiveChart(renderChart);
  const getFeatureOptions = () => {
    return Object.fromEntries(
      Object.entries(dataset.columnTypes)
        .filter(([_, value]) => value === 'Graph')
        .map(([key]) => [key, key]),
    );
  };

  const handleFeatureChange = (value: string) => {
    setFeature(value);
  };

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      <SearchableSelect
        className="w-full max-w-sm"
        label="Feature"
        placeholder="Select a feature..."
        value={feature}
        onChange={handleFeatureChange}
        options={getFeatureOptions()}
      />
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
};
