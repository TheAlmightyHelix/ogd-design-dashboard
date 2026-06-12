import { getSupportedChartTypes } from './adapterUtils';

const graphCell = {
  nodes: [{ id: 'a' }, { id: 'b' }],
  links: [{ source: 'a', target: 'b', link_count: 1 }],
  encodings: { linkWidth: 'link_count' },
};

function makeParsedData(rows: object[]) {
  return Object.assign(rows, {
    columns: Object.keys(rows[0] ?? {}),
  }) as unknown as Parameters<typeof getSupportedChartTypes>[0];
}

describe('getSupportedChartTypes', () => {
  it('includes forceDirectedGraph and sankey for player datasets with graph columns', () => {
    const data = makeParsedData([{ PlayerProgression: graphCell }]);
    const types = getSupportedChartTypes(data, 'player');
    expect(types).toContain('forceDirectedGraph');
    expect(types).toContain('sankey');
  });

  it('includes forceDirectedGraph and sankey for session datasets with graph columns', () => {
    const data = makeParsedData([{ PlayerProgression: graphCell }]);
    const types = getSupportedChartTypes(data, 'session');
    expect(types).toContain('forceDirectedGraph');
    expect(types).toContain('sankey');
  });

  it('still supports legacy population chart types', () => {
    const data = makeParsedData([{ PlayerProgression: graphCell }]);
    const types = getSupportedChartTypes(data, 'population');
    expect(types).toContain('forceDirectedGraph');
    expect(types).toContain('sankey');
  });

  it('does not include graph charts for player datasets without graph columns', () => {
    const data = makeParsedData([{ Score: 10 }]);
    const types = getSupportedChartTypes(data, 'player');
    expect(types).not.toContain('forceDirectedGraph');
    expect(types).not.toContain('sankey');
    expect(types).toContain('bar');
  });
});
