import React from 'react';
import { ChevronUp, Wrench } from 'lucide-react';
import useChartOption from '../../hooks/useChartOption';

interface CollapsibleChartConfigProps {
  chartId: string;
  collapsedLabel: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Reusable collapsible panel for chart configuration.
 * State is persisted per chart via useChartOption.
 */
export const CollapsibleChartConfig: React.FC<CollapsibleChartConfigProps> = ({
  chartId,
  collapsedLabel,
  children,
}) => {
  const [showConfig, setShowConfig] = useChartOption<boolean>(
    chartId,
    'showConfig',
    true,
  );

  return (
    <>
      {!showConfig && (
        <div
          className="group flex gap-0.5 items-center cursor-pointer hover:underline"
          onClick={() => setShowConfig(true)}
          onKeyDown={(e) => e.key === 'Enter' && setShowConfig(true)}
          role="button"
          tabIndex={0}
        >
          <span className="text-sm font-medium">{collapsedLabel}</span>
          <button
            type="button"
            className="w-6 h-6 cursor-pointer group-hover:opacity-100 opacity-0 rounded transition-opacity duration-200 focus:outline-none"
            title={showConfig ? 'Hide configuration' : 'Show configuration'}
          >
            <Wrench size={14} className="text-gray-600" />
          </button>
        </div>
      )}
      <div
        className={`transition-[max-height] duration-200 ease-in-out flex flex-col gap-2 ${
          !showConfig && 'h-0 overflow-hidden'
        }`}
      >
        {children}
        <button
          type="button"
          className="px-2 py-1 flex gap-1 items-center justify-center text-blue-800 hover:text-blue-900 rounded cursor-pointer transition-opacity duration-200 focus:outline-none self-start"
          onClick={() => setShowConfig(false)}
          title="Hide configuration"
        >
          <ChevronUp size={16} />
          <span className="text-sm underline">Hide configuration</span>
        </button>
      </div>
    </>
  );
};
