/**
 * Apply filters to a dataset
 * @param data - The dataset to filter
 * @param filters - Object containing filters by feature name
 * @returns Filtered dataset
 */
export const applyFilters = (
  data: any[],
  filters: Record<string, FeatureFilter>,
): any[] => {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }

  return data.filter((row) => {
    return Object.entries(filters).every(([featureName, filter]) => {
      const value = (row as Record<string, any>)[featureName];

      if (
        filter.filterType === 'categorical' &&
        (filter.selectedCategories?.length ?? 0) > 0
      ) {
        return filter.selectedCategories?.includes(value.toString()) ?? true;
      } else if (filter.filterType === 'numeric') {
        const numValue = Number(value);
        if (isNaN(numValue)) return false;

        // Support multiple ranges (for histogram bin selection)
        if (filter.ranges && filter.ranges.length > 0) {
          return filter.ranges.some(
            (range) => numValue >= range.min && numValue <= range.max,
          );
        }

        return true;
      }

      return true;
    });
  });
};

/**
 * Check if a feature has an active filter
 * @param featureName - Name of the feature to check
 * @param filters - Object containing filters by feature name
 * @returns True if feature has an active filter
 */
export const hasFilter = (
  featureName: string,
  filters: Record<string, FeatureFilter>,
): boolean => {
  return filters?.[featureName] !== undefined;
};

/**
 * Get the filter for a specific feature
 * @param featureName - Name of the feature
 * @param filters - Object containing filters by feature name
 * @returns The filter for the feature, or undefined if none exists
 */
export const getFilter = (
  featureName: string,
  filters: Record<string, FeatureFilter>,
): FeatureFilter | undefined => {
  return filters?.[featureName];
};

/**
 * Count how many rows would be returned after applying filters
 * @param data - The dataset to count
 * @param filters - Object containing filters by feature name
 * @returns Number of rows that would pass the filters
 */
export const getFilteredRowCount = (
  data: any[],
  filters: Record<string, FeatureFilter>,
): number => {
  return applyFilters(data, filters).length;
};

/**
 * Compare two arrays
 * @param a - First array
 * @param b - Second array
 * @returns True if arrays are equal
 */
export const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
};

/**
 * Compare two ranges arrays
 * @param a - First ranges array
 * @param b - Second ranges array
 * @returns True if ranges arrays are equal
 */
export const rangesEqual = (
  a: Array<{ min: number; max: number }>,
  b: Array<{ min: number; max: number }>,
) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.min - y.min || x.max - y.max);
  const sortedB = [...b].sort((x, y) => x.min - y.min || x.max - y.max);
  return sortedA.every(
    (range, i) => range.min === sortedB[i].min && range.max === sortedB[i].max,
  );
};
