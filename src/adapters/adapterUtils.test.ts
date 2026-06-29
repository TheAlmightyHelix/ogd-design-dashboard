import { getColumnTypes, getSupportedChartTypes } from './adapterUtils';

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

describe('getColumnTypes', () => {
  it('assigns Graph when graph data appears after the first row', () => {
    const data = makeParsedData([
      { PlayerProgression: null, Score: 1 },
      { PlayerProgression: graphCell, Score: 2 },
    ]);
    expect(getColumnTypes(data).PlayerProgression).toBe('Graph');
    expect(getColumnTypes(data).Score).toBe('Numeric');
  });

  it('assigns Graph for any column with nodes/links/encodings structure', () => {
    const data = makeParsedData([{ SessionGraph: graphCell }]);
    expect(getColumnTypes(data).SessionGraph).toBe('Graph');
  });

  it('uses columns metadata when present', () => {
    const rows = [{ Score: 1 }] as object[];
    const data = Object.assign(rows, {
      columns: ['Score', 'PlayerProgression'],
    }) as unknown as Parameters<typeof getColumnTypes>[0];
    data.push({ Score: 2, PlayerProgression: graphCell });
    expect(getColumnTypes(data).PlayerProgression).toBe('Graph');
  });
});

describe('getSupportedChartTypes', () => {
  it('includes graph charts when graph data is not in row 0', () => {
    const data = makeParsedData([
      { PlayerProgression: null },
      { PlayerProgression: graphCell },
    ]);
    const types = getSupportedChartTypes(data, 'player');
    expect(types).toContain('forceDirectedGraph');
    expect(types).toContain('sankey');
  });

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
