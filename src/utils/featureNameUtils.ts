/**
 * OGD player/session feature columns use `{iteration}_{feature}` (e.g. cty0_ActiveTime).
 * Event logs use snake_case names (e.g. event_name) that should not be grouped as iterations.
 */
export function getIteratedFeatureMap(
  columnNames: string[],
): Record<string, string[]> {
  const candidates: Record<string, string[]> = {};

  for (const key of columnNames) {
    const underscoreIndex = key.indexOf('_');
    if (underscoreIndex <= 0 || underscoreIndex === key.length - 1) continue;

    const baseFeature = key.slice(underscoreIndex + 1);
    if (!baseFeature) continue;

    if (!candidates[baseFeature]) {
      candidates[baseFeature] = [];
    }
    candidates[baseFeature].push(key);
  }

  const iterated: Record<string, string[]> = {};
  for (const [baseFeature, keys] of Object.entries(candidates)) {
    if (keys.length < 2) continue;

    iterated[baseFeature] = [...keys];
    if (
      columnNames.includes(baseFeature) &&
      !iterated[baseFeature].includes(baseFeature)
    ) {
      iterated[baseFeature].push(baseFeature);
    }
  }

  return iterated;
}

export function isIteratedBaseFeature(
  baseFeature: string,
  iteratedFeatureMap: Record<string, string[]>,
): boolean {
  return (iteratedFeatureMap[baseFeature]?.length ?? 0) > 1;
}

export function getBaseFeatureFromKey(featureKey: string): string | null {
  const underscoreIndex = featureKey.indexOf('_');
  if (underscoreIndex <= 0 || underscoreIndex === featureKey.length - 1) {
    return null;
  }
  return featureKey.slice(underscoreIndex + 1);
}
