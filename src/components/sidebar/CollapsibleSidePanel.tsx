import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapsibleSidePanelProps {
  children: React.ReactNode;
  title?: string;
}

const CollapsibleSidePanel: React.FC<CollapsibleSidePanelProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside className="flex h-full min-h-0 shrink-0 flex-row border-l border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-8 shrink-0 flex-col items-center justify-start self-stretch border-r border-gray-200 bg-white py-3 hover:bg-gray-50 transition-colors"
        aria-label={isOpen ? 'Close panel' : 'Open panel'}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        )}
      </button>

      <div
        className={`flex min-h-0 flex-col transition-[width,opacity] duration-300 ease-in-out ${
          isOpen
            ? 'h-full w-[min(42rem,40vw)] opacity-100'
            : 'h-full w-0 overflow-hidden opacity-0'
        }`}
      >
        <div className="flex h-full min-h-0 w-[min(42rem,40vw)] min-w-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CollapsibleSidePanel;
