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

  it('assigns Timedelta for Python timedelta strings', () => {
    const data = makeParsedData([
      { ActiveTime: '0:00:00' },
      { ActiveTime: '0:20:09.847000' },
    ]);
    expect(getColumnTypes(data).ActiveTime).toBe('Timedelta');
  });

  it('assigns Timedelta for multi-day timedelta strings', () => {
    const data = makeParsedData([
      { ActiveTime: '-14 days, 16:54:00.097000' },
    ]);
    expect(getColumnTypes(data).ActiveTime).toBe('Timedelta');
  });

  it('assigns Datetime for Python datetime strings', () => {
    const data = makeParsedData([
      { EventTime: '2024-01-15 10:30:00.123456' },
    ]);
    expect(getColumnTypes(data).EventTime).toBe('Datetime');
  });

  it('assigns Datetime for ISO 8601 event timestamps', () => {
    const data = makeParsedData([
      { timestamp: '2025-09-29T23:07:23.842000+00:00' },
      { timestamp: '2025-09-30T15:19:15.482000+00:00' },
    ]);
    expect(getColumnTypes(data).timestamp).toBe('Datetime');
  });

  it('classifies BLOOM event log columns without mislabeling snake_case fields', () => {
    const data = makeParsedData([
      {
        session_id: 25092917072021070,
        app_id: 'BLOOM',
        timestamp: '2025-09-29T23:07:23.842000+00:00',
        event_name: 'click_new_game',
        event_data: '{"http_user_agent": "Mozilla/5.0"}',
        event_source: 'GAME',
        app_version: 10,
        app_branch: null,
        log_version: 2,
        offset: 'UTC-06:00',
        user_id: null,
        user_data: '{}',
        game_state: '{"county_policies": {}}',
        index: 0,
      },
    ]);

    const types = getColumnTypes(data);
    expect(types.timestamp).toBe('Datetime');
    expect(types.event_name).toBe('Categorical');
    expect(types.session_id).toBe('Numeric');
    expect(Object.keys(types)).toHaveLength(14);
  });

  it('keeps numeric seconds columns as Numeric', () => {
    const data = makeParsedData([{ 'ActiveTime-Seconds': 1298.361 }]);
    expect(getColumnTypes(data)['ActiveTime-Seconds']).toBe('Numeric');
  });

  it('keeps ordinary strings as Categorical', () => {
    const data = makeParsedData([{ Status: 'IN_PROGRESS' }]);
    expect(getColumnTypes(data).Status).toBe('Categorical');
  });

  it('prefers Graph over embedded timedelta strings in JSON', () => {
    const data = makeParsedData([
      {
        PlayerProgression: {
          nodes: {
            Forest: {
              node_count: 1,
              percentage_completed: 1,
              time_spent: '0:08:29.168000',
            },
          },
          links: {},
          encodings: {},
        },
      },
    ]);
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

  it('includes timeline when datetime columns are present', () => {
    const data = makeParsedData([
      { EventTime: '2024-01-15 10:30:00.123456' },
    ]);
    const types = getSupportedChartTypes(data, 'player');
    expect(types).toContain('timeline');
  });

  it('does not include timeline without datetime columns', () => {
    const data = makeParsedData([{ ActiveTime: '0:20:09.847000' }]);
    const types = getSupportedChartTypes(data, 'player');
    expect(types).not.toContain('timeline');
  });
});
