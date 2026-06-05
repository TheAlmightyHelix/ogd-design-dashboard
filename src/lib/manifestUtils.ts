export type GameManifests = {
  [gameId: string]: { [year: string]: { [month: string]: GameManifest } };
};

const EMPTY_FEATURE_DESCRIPTIONS: Record<string, string> = {};

const descriptionsByManifest = new WeakMap<
  GameManifest,
  Map<string, Record<string, string>>
>();

export function getManifestLookupParams(
  dataset: GameData,
): { year: string; month: string } | null {
  if (dataset.source === 'api') {
    const [year, month] = dataset.startDate.split('/');
    if (year && month) return { year, month };
  }

  if (/^\d{8}$/.test(dataset.startDate)) {
    return {
      year: dataset.startDate.slice(0, 4),
      month: String(Number(dataset.startDate.slice(4, 6))),
    };
  }

  return null;
}

export function normalizeManifestMonth(month: string): string {
  return String(Number(month));
}

export function datasetReferencesManifest(
  dataset: GameData,
  gameId: string,
  year: string,
  month: string,
): boolean {
  if (dataset.game !== gameId) return false;

  const params = getManifestLookupParams(dataset);
  if (!params) return false;

  return (
    params.year === year &&
    normalizeManifestMonth(params.month) === normalizeManifestMonth(month)
  );
}

export function removeManifest(
  gameManifests: GameManifests,
  gameId: string,
  year: string,
  month: string,
): GameManifests {
  const gameEntry = gameManifests[gameId];
  const yearEntry = gameEntry?.[year];
  if (!yearEntry) return gameManifests;

  const monthKey =
    Object.keys(yearEntry).find(
      (key) => normalizeManifestMonth(key) === normalizeManifestMonth(month),
    ) ?? null;
  if (!monthKey) return gameManifests;

  const remainingMonths = Object.fromEntries(
    Object.entries(yearEntry).filter(([key]) => key !== monthKey),
  );

  if (Object.keys(remainingMonths).length > 0) {
    return {
      ...gameManifests,
      [gameId]: {
        ...gameEntry,
        [year]: remainingMonths,
      },
    };
  }

  const remainingYears = Object.fromEntries(
    Object.entries(gameEntry).filter(([key]) => key !== year),
  );

  if (Object.keys(remainingYears).length > 0) {
    return {
      ...gameManifests,
      [gameId]: remainingYears,
    };
  }

  return Object.fromEntries(
    Object.entries(gameManifests).filter(([key]) => key !== gameId),
  );
}

export function removeOrphanedManifestForDataset(
  gameManifests: GameManifests,
  datasets: Record<string, GameData>,
  removedDataset: GameData,
): GameManifests {
  const params = getManifestLookupParams(removedDataset);
  if (!params) return gameManifests;

  const { year, month } = params;
  const hasReferencingDataset = Object.values(datasets).some((dataset) =>
    datasetReferencesManifest(dataset, removedDataset.game, year, month),
  );

  if (hasReferencingDataset) return gameManifests;

  return removeManifest(gameManifests, removedDataset.game, year, month);
}

export function resolveGameManifest(
  gameManifests: GameManifests,
  gameId: string,
  year: string,
  month: string,
): GameManifest | undefined {
  const gameManifest = gameManifests[gameId]?.[year];
  if (!gameManifest) return undefined;

  return (
    gameManifest[month] ??
    gameManifest[month.padStart(2, '0')] ??
    gameManifest[String(Number(month))]
  );
}

function buildFeatureDescriptions(
  manifest: GameManifest,
  featureLevel: string,
): Record<string, string> {
  if (!Array.isArray(manifest.features)) {
    return EMPTY_FEATURE_DESCRIPTIONS;
  }

  return manifest.features
    .filter(
      (feature) =>
        feature?.aggregation_levels?.includes(featureLevel) ?? false,
    )
    .reduce<Record<string, string>>((acc, feature) => {
      if (feature?.feature_name) {
        acc[feature.feature_name] = feature.description ?? '';
      }
      return acc;
    }, {});
}

function getCachedFeatureDescriptions(
  manifest: GameManifest,
  featureLevel: string,
): Record<string, string> {
  let levelCache = descriptionsByManifest.get(manifest);
  if (!levelCache) {
    levelCache = new Map();
    descriptionsByManifest.set(manifest, levelCache);
  }

  const cached = levelCache.get(featureLevel);
  if (cached) return cached;

  const descriptions = buildFeatureDescriptions(manifest, featureLevel);
  levelCache.set(featureLevel, descriptions);
  return descriptions;
}

export function getFeatureDescriptionsForDataset(
  gameManifests: GameManifests,
  dataset: GameData,
): Record<string, string> {
  const params = getManifestLookupParams(dataset);
  if (!params) return EMPTY_FEATURE_DESCRIPTIONS;

  const manifest = resolveGameManifest(
    gameManifests,
    dataset.game,
    params.year,
    params.month,
  );
  if (!manifest) return EMPTY_FEATURE_DESCRIPTIONS;

  return getCachedFeatureDescriptions(manifest, dataset.featureLevel);
}
