import useLayoutStore from '../../store/useLayoutStore';

export interface DashboardContext {
  layoutId: string | null;
  layoutName: string | null;
  chartCount: number;
}

export function getDashboardContext(): DashboardContext {
  const { currentLayout, layouts } = useLayoutStore.getState();
  if (!currentLayout || !layouts[currentLayout]) {
    return { layoutId: null, layoutName: null, chartCount: 0 };
  }
  const layout = layouts[currentLayout];
  return {
    layoutId: currentLayout,
    layoutName: layout.name,
    chartCount: Object.keys(layout.charts).length,
  };
}

export function formatDashboardContextForPrompt(
  context: DashboardContext,
): string {
  if (!context.layoutId || !context.layoutName) {
    return 'The user has no dashboard tab selected (or it is still loading).';
  }
  const chartLabel =
    context.chartCount === 1 ? '1 chart' : `${context.chartCount} charts`;
  return `The user's open dashboard is "${context.layoutName}" (${chartLabel}).`;
}
