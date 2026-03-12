/**
 * Shared utilities for graph feature data (nodes, links, encodings format).
 * Used by ForceDirectedGraph, Sankey, and adapterUtils.
 */

export function isGraphFeature(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value);
    return ['nodes', 'links', 'encodings'].every((key) => key in parsed);
  } catch {
    return false;
  }
}

export interface GraphFeature {
  nodes: { id: string; [key: string]: unknown }[];
  links: { source: string; target: string; [key: string]: unknown }[];
  encodings: {
    nodeLabel?: string;
    nodeColor?: string | null;
    nodeSize?: string | null;
    nodeTooltip?: string | null;
    linkWidth?: string;
    [key: string]: unknown;
  };
}

export interface SankeyData {
  nodes: { id: string; name: string; value?: number }[];
  links: { source: string; target: string; value: number }[];
}

export function parseGraphFeature(cellValue: unknown): GraphFeature | null {
  if (!isGraphFeature(cellValue)) return null;
  try {
    const parsed = JSON.parse(cellValue as string) as GraphFeature;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.links) || !parsed.encodings) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function graphFeatureToSankey(graph: GraphFeature): SankeyData {
  const linkWidth = graph.encodings?.linkWidth ?? 'link_count';

  const getNodeName = (n: Record<string, unknown>) =>
    String(n.node_name ?? n.id ?? '');

  const nodes = graph.nodes.map((n) => ({
    id: n.id,
    name: getNodeName(n),
  }));

  const nodeIds = new Set(nodes.map((n) => n.id));

  const links = graph.links
    .filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target))
    .map((l) => ({
      source: l.source,
      target: l.target,
      value: Number(l[linkWidth] ?? (l as Record<string, unknown>).link_count ?? 1),
    }));

  return { nodes, links };
}
