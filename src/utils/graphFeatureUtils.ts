/**
 * Shared utilities for graph feature data (nodes, links, encodings format).
 * Used by ForceDirectedGraph, Sankey, and adapterUtils.
 */

export function isGraphFeature(value: unknown): boolean {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{')) return false;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return false;
    }
  }
  if (parsed === null || typeof parsed !== 'object') return false;
  return ['nodes', 'links', 'encodings'].every(
    (key) => key in (parsed as Record<string, unknown>),
  );
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
    const parsed = (
      typeof cellValue === 'string'
        ? JSON.parse(cellValue)
        : cellValue
    ) as GraphFeature;
    if (
      !Array.isArray(parsed.nodes) ||
      !Array.isArray(parsed.links) ||
      !parsed.encodings
    ) {
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
      value: Number(
        l[linkWidth] ?? (l as Record<string, unknown>).link_count ?? 1,
      ),
    }));

  return { nodes, links };
}

export function aggregateGraphFeatures(
  rows: object[],
  featureColumn: string,
): GraphFeature | null {
  const nodeMap = new Map<string, { id: string; [key: string]: unknown }>();
  const linkMap = new Map<
    string,
    { source: string; target: string; [key: string]: unknown }
  >();
  let encodings: GraphFeature['encodings'] | null = null;
  let linkWidthKey = 'link_count';

  for (const row of rows) {
    const cell = (row as Record<string, unknown>)[featureColumn];
    const graph = parseGraphFeature(cell);
    if (!graph) continue;

    if (!encodings) {
      encodings = graph.encodings;
      linkWidthKey = graph.encodings?.linkWidth ?? 'link_count';
    }

    for (const node of graph.nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, { ...node });
      }
    }

    for (const link of graph.links) {
      const key = `${link.source}\0${link.target}`;
      const linkValue = Number(
        link[linkWidthKey] ??
          (link as Record<string, unknown>).link_count ??
          1,
      );
      if (linkMap.has(key)) {
        const existing = linkMap.get(key)!;
        const existingValue = Number(
          existing[linkWidthKey] ??
            (existing as Record<string, unknown>).link_count ??
            0,
        );
        existing[linkWidthKey] = existingValue + linkValue;
      } else {
        linkMap.set(key, {
          source: link.source,
          target: link.target,
          [linkWidthKey]: linkValue,
        });
      }
    }
  }

  if (!encodings || nodeMap.size === 0) return null;

  return {
    nodes: Array.from(nodeMap.values()),
    links: Array.from(linkMap.values()),
    encodings,
  };
}
