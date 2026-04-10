import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PanelSide = 'left' | 'right';

interface CollapsibleSidePanelProps {
  children: React.ReactNode;
  title?: string;
  /** Dock side: `left` = panel on the left of the viewport, rail against the main content. */
  side?: PanelSide;
  /** Shown as vertical text on the collapse rail (open or closed). */
  collapsedLabel?: string;
  /** When false, the body is a flex column with overflow hidden so children can own scrolling. */
  scrollBody?: boolean;
  defaultOpen?: boolean;
  /** Applied to both animated shell and inner column (e.g. `w-[min(42rem,40vw)]`). */
  widthClassName?: string;
}

const CollapsibleSidePanel: React.FC<CollapsibleSidePanelProps> = ({
  children,
  side = 'right',
  collapsedLabel,
  scrollBody = true,
  defaultOpen = true,
  widthClassName = 'w-[min(42rem,40vw)]',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const bodyClassName = scrollBody
    ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2'
    : 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-2';

  const railWidth = collapsedLabel ? 'w-10' : 'w-8';
  const ariaLabel = collapsedLabel
    ? isOpen
      ? `Collapse ${collapsedLabel} panel`
      : `Expand ${collapsedLabel} panel`
    : isOpen
      ? 'Close panel'
      : 'Open panel';

  const isRight = side === 'right';
  const asideEdgeBorder = isRight ? 'border-l' : 'border-r';
  const railEdgeBorder = isRight ? 'border-r' : 'border-l';

  const rail = (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={`flex ${railWidth} shrink-0 flex-col items-center self-stretch ${railEdgeBorder} border-gray-200 bg-white py-3 hover:bg-gray-50 transition-colors`}
      aria-label={ariaLabel}
    >
      <span className="flex shrink-0 flex-col items-center">
        {isOpen ? (
          isRight ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )
        ) : isRight ? (
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-600" />
        )}
      </span>
      {collapsedLabel ? (
        <span className="mt-3 flex min-h-0 flex-1 items-center justify-start select-none text-xs font-semibold tracking-wide text-gray-600 [text-orientation:mixed] [writing-mode:vertical-rl]">
          {collapsedLabel}
        </span>
      ) : null}
    </button>
  );

  const body = (
    <div
      className={`flex min-h-0 flex-col transition-[width,opacity] duration-300 ease-in-out ${
        isOpen
          ? `h-full ${widthClassName} opacity-100`
          : 'h-full w-0 overflow-hidden opacity-0'
      }`}
    >
      <div
        className={`flex h-full min-h-0 min-w-0 flex-col ${widthClassName}`}
      >
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>
  );

  return (
    <aside
      className={`flex h-full min-h-0 shrink-0 flex-row ${asideEdgeBorder} border-gray-200 bg-white shadow-sm`}
    >
      {isRight ? (
        <>
          {rail}
          {body}
        </>
      ) : (
        <>
          {body}
          {rail}
        </>
      )}
    </aside>
  );
};

export default CollapsibleSidePanel;
