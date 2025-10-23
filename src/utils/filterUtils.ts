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

      if (filter.filterType === 'categorical') {
        return filter.selectedCategories?.includes(value.toString()) ?? true;
      } else if (filter.filterType === 'numeric') {
        const numValue = Number(value);
        if (isNaN(numValue)) return false;

        const min = filter.range?.min ?? -Infinity;
        const max = filter.range?.max ?? Infinity;
        return numValue >= min && numValue <= max;
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
