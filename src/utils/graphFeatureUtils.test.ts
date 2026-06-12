import {
  aggregateGraphFeatures,
  parseGraphFeature,
} from './graphFeatureUtils';

const FEATURE = 'PlayerProgression';

function makeGraph(
  links: { source: string; target: string; link_count: number }[],
) {
  return {
    nodes: [
      { id: 'a', node_name: 'A' },
      { id: 'b', node_name: 'B' },
    ],
    links,
    encodings: { linkWidth: 'link_count', nodeLabel: 'node_name' },
  };
}

describe('aggregateGraphFeatures', () => {
  it('returns null for empty rows', () => {
    expect(aggregateGraphFeatures([], FEATURE)).toBeNull();
  });

  it('returns null when no valid graphs exist', () => {
    const rows = [{ [FEATURE]: 'not-json' }, { [FEATURE]: null }];
    expect(aggregateGraphFeatures(rows, FEATURE)).toBeNull();
  });

  it('parses a single row', () => {
    const graph = makeGraph([{ source: 'a', target: 'b', link_count: 3 }]);
    const rows = [{ [FEATURE]: graph }];
    const result = aggregateGraphFeatures(rows, FEATURE);
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(2);
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0].link_count).toBe(3);
    expect(result!.encodings.linkWidth).toBe('link_count');
  });

  it('sums link counts across multiple rows', () => {
    const rows = [
      { [FEATURE]: makeGraph([{ source: 'a', target: 'b', link_count: 2 }]) },
      { [FEATURE]: makeGraph([{ source: 'a', target: 'b', link_count: 3 }]) },
    ];
    const result = aggregateGraphFeatures(rows, FEATURE);
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0].link_count).toBe(5);
  });

  it('merges distinct links and keeps nodes from first occurrence', () => {
    const rows = [
      {
        [FEATURE]: makeGraph([
          { source: 'a', target: 'b', link_count: 1 },
          { source: 'b', target: 'a', link_count: 2 },
        ]),
      },
      {
        [FEATURE]: makeGraph([{ source: 'a', target: 'b', link_count: 4 }]),
      },
    ];
    const result = aggregateGraphFeatures(rows, FEATURE);
    expect(result!.links).toHaveLength(2);
    const ab = result!.links.find((l) => l.source === 'a' && l.target === 'b');
    expect(ab?.link_count).toBe(5);
  });

  it('skips invalid rows and aggregates valid ones', () => {
    const rows = [
      { [FEATURE]: null },
      { [FEATURE]: makeGraph([{ source: 'a', target: 'b', link_count: 1 }]) },
      { [FEATURE]: 'invalid' },
    ];
    const result = aggregateGraphFeatures(rows, FEATURE);
    expect(result!.links[0].link_count).toBe(1);
  });

  it('handles string-encoded graph JSON', () => {
    const graph = makeGraph([{ source: 'a', target: 'b', link_count: 7 }]);
    const rows = [{ [FEATURE]: JSON.stringify(graph) }];
    const result = aggregateGraphFeatures(rows, FEATURE);
    expect(parseGraphFeature(rows[0][FEATURE])).not.toBeNull();
    expect(result!.links[0].link_count).toBe(7);
  });
});
