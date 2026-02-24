import useLayoutStore from '../store/useLayoutStore';

const useChartOption = <T,>(chartId: string, key: string, initial: T): [T, (v: T) => void] => {
  // Subscribe to the actual stored value so external updates (e.g. from GridLayout
  // toggle) trigger re-renders. Selecting getChartOption/setChartOption would
  // never re-render because those are stable function references.
  const storedValue = useLayoutStore((state) => {
    const { currentLayout, layouts } = state;
    if (!currentLayout) return undefined;
    const val = layouts[currentLayout]?.charts[chartId]?.options?.[key];
    return val !== undefined ? (val as T) : undefined;
  });

  const setOption = useLayoutStore((state) => state.setChartOption);

  const value = storedValue !== undefined ? storedValue : initial;

  const setValue = (v: T) => {
    setOption(chartId, key, v);
  };

  return [value, setValue];
};

export default useChartOption;
