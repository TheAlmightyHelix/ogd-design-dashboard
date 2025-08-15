import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Dialog = ({ open, onClose, title, children }: DialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-4xl w-full relative"
        ref={dialogRef}
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className=" hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Dialog;
