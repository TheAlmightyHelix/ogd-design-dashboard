export const EdgeMode = {
  ActiveJobs: 'Still in progress',
  TopJobCompletionDestinations: 'Completed the job',
  TopJobSwitchDestinations: 'Switched to another job',
} as const;

/**
 * Create the edges for the graph
 * @param data - The data to get the edges from
 * @param edgeMode - The edge mode to use
 * @returns The edges
 */
export const getEdges = (data: any, edgeMode: keyof typeof EdgeMode) => {
  let edges = [];

  const rawLinks: Record<string, Record<string, string[]>> = JSON.parse(
    data[edgeMode],
  );

  switch (edgeMode) {
    case 'TopJobCompletionDestinations':
    case 'TopJobSwitchDestinations':
      for (const [sourceKey, targets] of Object.entries(rawLinks)) {
        for (const [targetKey, players] of Object.entries(targets)) {
          if (sourceKey === targetKey) continue; // omit self-pointing jobs
          edges.push({
            source: sourceKey,
            sourceName: sourceKey,
            target: targetKey,
            targetName: targetKey,
            value: players.length,
            players: players,
          });
        }
      }
      break;
    case 'ActiveJobs':
      const activeJobs = Object.keys(rawLinks);
      for (let i = 1; i < activeJobs.length; i++) {
        const target = activeJobs[i];
        edges.push({
          source: activeJobs[0],
          sourceName: activeJobs[0],
          target: target,
          targetName: target,
          value: 1, // Default value for ActiveJobs edges
        });
      }
      break;
    default:
      alert('Something went wrong. Plase refresh the page and try again');
      break;
  }
  return edges;
};

/**
 * Create the nodes for the graph
 * @param data - The data to get the nodes from
 * @returns The nodes
 */
export const getNodes = (data: any) => {
  let nodes: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      key.substring(0, 3) !== 'job' &&
      key.substring(0, 6) !== 'county' &&
      key.substring(0, 7) !== 'mission' &&
      key.substring(0, 6) !== 'puzzle'
    )
      continue;

    const [jobNumber, jobFeature] = key.split('_');

    if (!nodes.hasOwnProperty(jobNumber)) nodes[jobNumber] = {}; // create node pbject
    if (jobFeature === 'JobsAttempted-job-name')
      nodes[jobNumber].id = value; // store job name as node id
    else if (jobFeature === 'JobsAttempted') continue;
    else nodes[jobNumber][jobFeature] = value;

    // AQUALAB specific: parse job difficulty json
    if (jobFeature === 'JobsAttempted-job-difficulties') {
      nodes[jobNumber][jobFeature] = JSON.parse(nodes[jobNumber][jobFeature]);
    }
  }
  return nodes;
};

/**
 * Detect cycles in a directed graph (for Sankey)
 * Logs errors for direct self-links and longer cycles
 * Returns true if a cycle is found, false otherwise
 */
export function detectGraphCycles(
  nodes: Record<string, any>,
  links: { source: string; target: string }[],
): boolean {
  // For each node in nodes, transform the key to the value.id
  if (nodes && typeof nodes === 'object') {
    const newNodes: Record<string, any> = {};
    for (const [key, value] of Object.entries(nodes)) {
      if (value && typeof value === 'object' && value.id !== undefined) {
        newNodes[value.id] = value;
      } else {
        newNodes[key] = value;
      }
    }
    nodes = newNodes;
  }

  // 1. Direct self-links
  let hasDirectSelfLink = false;
  links.forEach((link) => {
    if (link.source === link.target) {
      hasDirectSelfLink = true;
      console.error('Direct self-link (circular):', link);
    }
  });

  // 2. Longer cycles (simple DFS for small graphs)
  const adj = new Map<string, string[]>();
  Object.keys(nodes).forEach((n) => adj.set(n, []));
  links.forEach((l) => adj.get(l.source)?.push(l.target));
  const visited = new Set<string>(); // track visited nodes
  const stack = new Set<string>(); // track nodes in current path

  function dfs(node: string): boolean {
    if (stack.has(node)) return true; // cycle found
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    for (const neighbor of adj.get(node) || []) {
      if (dfs(neighbor)) return true;
    }
    stack.delete(node);
    return false;
  }

  let hasLongerCycle = false;
  for (const n of Object.keys(nodes)) {
    if (dfs(n)) {
      hasLongerCycle = true;
      break;
    }
  }

  return hasDirectSelfLink || hasLongerCycle;
}
