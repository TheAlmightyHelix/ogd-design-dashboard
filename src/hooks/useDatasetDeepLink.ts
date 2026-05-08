import { useEffect, useRef, useState } from 'react';
import api from '../services/apiService';
import { normalizeApiResponse } from '../adapters/apiAdapter';
import useDataStore from '../store/useDataStore';
import useLayoutStore from '../store/useLayoutStore';
import type { DatasetUrlParams } from './useDatasetFromUrl';

export type DeepLinkStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseDatasetDeepLinkResult {
  status: DeepLinkStatus;
  error: Error | null;
}

/**
 * This hook is used to deep link to a dataset.
 * It will add the dataset to the data store and create a new layout if needed.
 * It will also update the chart config to use the new dataset.
 * @param urlParams - The URL parameters from the deep link.
 * @returns The status and error of the deep link.
 */
export function useDatasetDeepLink(
  urlParams: DatasetUrlParams | null,
): UseDatasetDeepLinkResult {
  const [status, setStatus] = useState<DeepLinkStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const hasProcessedRef = useRef(false);
  const {
    addDataset,
    hasDataset,
    hasHydrated: dataStoreHydrated,
  } = useDataStore();
  const {
    layouts,
    currentLayout,
    createLayout,
    updateChartConfig,
    hasHydrated: layoutStoreHydrated,
  } = useLayoutStore();

  useEffect(() => {
    if (!urlParams || !urlParams.isValid) return;
    if (!dataStoreHydrated || !layoutStoreHydrated) return;

    const { game, year, month, level, datasetId } = urlParams;
    const dataset = `${year}/${month}`;

    const wireChartToDataset = () => {
      const layoutData = currentLayout ? layouts[currentLayout] : null;
      if (!layoutData?.layout?.length || !layoutData?.charts) return;

      const chartEntries = Object.entries(layoutData.charts);
      const emptyChart = chartEntries.find(
        ([_, config]) => !config.datasetIds?.length,
      );
      if (!emptyChart) return;

      const [chartId] = emptyChart;
      const datasetRecord = useDataStore.getState().datasets[datasetId];
      if (!datasetRecord) return;

      const vizType =
        datasetRecord.supportedChartTypes?.[0] ?? 'descriptiveStatistics';
      updateChartConfig(chartId, {
        datasetIds: [datasetId],
        vizType,
      });
    };

    const needsNewLayout = (): boolean => {
      if (!currentLayout || !layouts[currentLayout]) return false;
      const { layout, charts } = layouts[currentLayout];
      if (!layout?.length || !Object.keys(charts).length) return false;

      const allChartsHaveData = Object.values(charts).every(
        (c) => c.datasetIds?.length > 0,
      );
      return allChartsHaveData;
    };

    const run = async () => {
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      try {
        if (!hasDataset(datasetId)) {
          setStatus('loading');
          const response = await api.getDataset(game, month, year, level);
          if (response) {
            addDataset(normalizeApiResponse(response, game, dataset, level));
          }
        }

        if (needsNewLayout()) {
          createLayout();
        }

        wireChartToDataset();
        setStatus('success');
        setError(null);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err : new Error(String(err)));
        hasProcessedRef.current = false;
      }
    };

    run();
  }, [
    urlParams,
    dataStoreHydrated,
    layoutStoreHydrated,
    layouts,
    currentLayout,
    addDataset,
    hasDataset,
    createLayout,
    updateChartConfig,
  ]);

  useEffect(() => {
    if (!urlParams || !urlParams.isValid) return;
    if (!dataStoreHydrated || !layoutStoreHydrated) return;
    if (status !== 'success') return;

    const { datasetId } = urlParams;
    const layoutData = currentLayout ? layouts[currentLayout] : null;
    if (!layoutData?.charts) return;

    const hasEmptyChart = Object.values(layoutData.charts).some(
      (c) => !c.datasetIds?.length,
    );
    if (!hasEmptyChart) return;

    const layoutDataChartEntries = Object.entries(layoutData.charts);
    const emptyChart = layoutDataChartEntries.find(
      ([_, config]) => !config.datasetIds?.length,
    );
    if (!emptyChart) return;

    const [chartId] = emptyChart;
    const datasetRecord = useDataStore.getState().datasets[datasetId];
    if (!datasetRecord) return;

    const vizType =
      datasetRecord.supportedChartTypes?.[0] ?? 'descriptiveStatistics';
    updateChartConfig(chartId, {
      datasetIds: [datasetId],
      vizType,
    });
  }, [
    urlParams,
    status,
    dataStoreHydrated,
    layoutStoreHydrated,
    layouts,
    currentLayout,
    updateChartConfig,
  ]);

  return { status, error };
}
