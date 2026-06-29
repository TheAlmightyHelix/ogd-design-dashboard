import useChartOption from '../../../hooks/useChartOption';
import { useResponsiveChart } from '../../../hooks/useResponsiveChart';
import useDataStore from '../../../store/useDataStore';
import SearchableSelect from '../../layout/select/SearchableSelect';
import * as d3 from 'd3';
import { useCallback, useMemo } from 'react';
import {
  aggregateGraphFeatures,
} from '../../../utils/graphFeatureUtils';
import { CollapsibleChartConfig } from '../CollapsibleChartConfig';

interface ForceDirectedGraphProps {
  dataset: GameData;
  chartId: string;
}

type LegendSwatch =
  | 'colorSequential'
  | 'colorOrdinal'
  | 'nodeSize'
  | 'linkWidth'
  | 'nodeLabel'
  | 'nodeTooltip'
  | 'generic';

interface LegendItem {
  key: string;
  swatch: LegendSwatch;
  label: string;
}

const KNOWN_ENCODING_ORDER = [
  'nodeLabel',
  'nodeColor',
  'nodeSize',
  'nodeTooltip',
  'linkWidth',
] as const;

const ENCODING_DISPLAY_PREFIX: Record<string, string> = {
  nodeLabel: 'Node label',
  nodeColor: 'Node color',
  nodeSize: 'Node size',
  nodeTooltip: 'Node tooltip',
  linkWidth: 'Link width',
};

function isPresentEncodingValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function resolveLegendSwatch(
  encodingKey: string,
  field: string,
  firstNode: Record<string, unknown>,
): LegendSwatch {
  switch (encodingKey) {
    case 'nodeColor':
      return typeof firstNode[field] === 'number'
        ? 'colorSequential'
        : 'colorOrdinal';
    case 'nodeSize':
      return 'nodeSize';
    case 'linkWidth':
      return 'linkWidth';
    case 'nodeLabel':
      return 'nodeLabel';
    case 'nodeTooltip':
      return 'nodeTooltip';
    default:
      return 'generic';
  }
}

const ORDINAL_LEGEND_COLORS = [
  'bg-blue-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-red-500',
] as const;

const LegendSwatch: React.FC<{ swatch: LegendSwatch }> = ({ swatch }) => {
  switch (swatch) {
    case 'colorSequential':
      return (
        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-green-500 flex-shrink-0" />
      );
    case 'colorOrdinal':
      return (
        <div className="w-3 h-3 grid grid-cols-2 gap-0.5 flex-shrink-0">
          {ORDINAL_LEGEND_COLORS.map((color) => (
            <div
              key={color}
              className={`aspect-square w-full rounded-full ${color}`}
            />
          ))}
        </div>
      );
    case 'nodeSize':
      return <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />;
    case 'linkWidth':
      return <div className="w-3 h-0.5 bg-gray-400 flex-shrink-0" />;
    case 'nodeLabel':
      return (
        <div className="w-3 h-3 flex flex-col justify-center gap-0.5 flex-shrink-0">
          <div className="h-px w-full bg-gray-400" />
          <div className="h-px w-2/3 bg-gray-400" />
          <div className="h-px w-full bg-gray-400" />
        </div>
      );
    case 'nodeTooltip':
      return (
        <div className="w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center text-[8px] leading-none font-bold text-gray-500 flex-shrink-0">
          i
        </div>
      );
    case 'generic':
      return (
        <div className="w-3 h-3 rounded border border-gray-300 flex-shrink-0" />
      );
  }
};

/**
 * ForceDirectedGraph displays player progression as a force-directed graph.
 * Aggregates GraphFeature data across all filtered rows in the dataset.
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
    const defaultEncodings = {
      nodeLabel: 'id',
      linkWidth: 'link_count',
      nodeColor: null as string | null,
      nodeSize: null as string | null,
      nodeTooltip: null as string | null,
    };
    if (feature && data.length > 0) {
      const aggregated = aggregateGraphFeatures(data, feature);
      if (aggregated) {
        return {
          nodes: aggregated.nodes,
          links: aggregated.links,
          encodings: { ...defaultEncodings, ...aggregated.encodings },
        };
      }
    }
    return {
      nodes: [],
      links: [],
      encodings: defaultEncodings,
    };
  }, [feature, data]);

  const legendItems = useMemo((): LegendItem[] => {
    if (!feature || nodes.length === 0) return [];

    const firstNode = nodes[0] as Record<string, unknown>;
    const encodingEntries = encodings as Record<string, unknown>;
    const knownSet = new Set<string>(KNOWN_ENCODING_ORDER);

    const orderedKeys = [
      ...KNOWN_ENCODING_ORDER.filter((key) =>
        isPresentEncodingValue(encodingEntries[key]),
      ),
      ...Object.keys(encodingEntries)
        .filter(
          (key) =>
            !knownSet.has(key) && isPresentEncodingValue(encodingEntries[key]),
        )
        .sort(),
    ];

    return orderedKeys.map((key) => {
      const field = encodingEntries[key] as string;
      const prefix = ENCODING_DISPLAY_PREFIX[key] ?? key;
      return {
        key,
        swatch: resolveLegendSwatch(key, field, firstNode),
        label: `${prefix}: ${field}`,
      };
    });
  }, [feature, nodes, encodings]);

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

      const chartContainer = svg.node()?.parentElement;
      if (!chartContainer) return;

      let hideTooltipTimeout: ReturnType<typeof setTimeout> | null = null;

      const showTooltip = (html: string, event: MouseEvent) => {
        if (hideTooltipTimeout) {
          clearTimeout(hideTooltipTimeout);
          hideTooltipTimeout = null;
        }

        const rect = chartContainer.getBoundingClientRect();
        tooltip
          .style('opacity', 1)
          .html(html)
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      };

      const scheduleHideTooltip = () => {
        if (hideTooltipTimeout) clearTimeout(hideTooltipTimeout);
        hideTooltipTimeout = setTimeout(() => {
          tooltip.style('opacity', 0);
          hideTooltipTimeout = null;
        }, 75);
      };

      // Create custom tooltip div scoped to the chart container
      const tooltip = d3
        .select(chartContainer)
        .append('div')
        .attr('class', `force-graph-tooltip-${chartId}`)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('font-family', 'monospace')
        .style('pointer-events', 'none')
        .style('z-index', '10')
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
          showTooltip(tooltipContent, event);
        })
        .on('mouseout', function () {
          scheduleHideTooltip();
        })
        .on('mousemove', function (event) {
          const rect = chartContainer.getBoundingClientRect();
          tooltip
            .style('left', `${event.clientX - rect.left + 10}px`)
            .style('top', `${event.clientY - rect.top - 10}px`);
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
            showTooltip(String(d[encodings.nodeTooltip] ?? ''), event);
          }
        })
        .on('mouseout', function () {
          scheduleHideTooltip();
        })
        .on('mousemove', function (event) {
          const rect = chartContainer.getBoundingClientRect();
          tooltip
            .style('left', `${event.clientX - rect.left + 10}px`)
            .style('top', `${event.clientY - rect.top - 10}px`);
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

      simulation.on('end', () => {
        simulation.stop();
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
        if (hideTooltipTimeout) clearTimeout(hideTooltipTimeout);
        d3.select(chartContainer)
          .select(`.force-graph-tooltip-${chartId}`)
          .remove();
      };
    },
    [nodes, links, encodings, feature, chartId],
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
    <div className="flex flex-col gap-2 px-2 pb-2 h-full">
      <CollapsibleChartConfig
        chartId={chartId}
        collapsedLabel={feature || 'Force-Directed Graph'}
      >
        <SearchableSelect
          className="w-full max-w-sm"
          label="Feature"
          placeholder="Select a feature..."
          value={feature}
          onChange={handleFeatureChange}
          options={getFeatureOptions()}
        />
      </CollapsibleChartConfig>
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <svg ref={svgRef} className="w-full h-full" />
        {legendItems.length > 0 && (
          <div className="absolute bottom-0 right-0 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs">
            <div className="flex flex-col gap-1.5">
              {legendItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <LegendSwatch swatch={item.swatch} />
                  <span className="text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
