import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDatasetFromUrl } from '../../hooks/useDatasetFromUrl';
import { useDatasetDeepLink } from '../../hooks/useDatasetDeepLink';

interface DatasetDeepLinkProviderProps {
  children: React.ReactNode;
}

export default function DatasetDeepLinkProvider({
  children,
}: DatasetDeepLinkProviderProps) {
  const urlParams = useDatasetFromUrl();
  const { status, error } = useDatasetDeepLink(urlParams);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    setIsBannerDismissed(false);
  }, [status]);

  const showLoadingBanner = status === 'loading' && !isBannerDismissed;
  const showErrorBanner = status === 'error' && error && !isBannerDismissed;

  return (
    <>
      {showLoadingBanner && (
        <div
          className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800 flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={() => setIsBannerDismissed(true)}
            className="p-0.5 rounded hover:bg-blue-100 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <div
            className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
            aria-hidden
          />
          Loading dataset from link...
        </div>
      )}
      {showErrorBanner && (
        <div
          className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-800 flex items-center justify-between gap-4"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              className="p-0.5 rounded hover:bg-red-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <span>Failed to load dataset: {error.message}</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-red-600 underline font-medium hover:text-red-800 shrink-0"
          >
            Retry
          </button>
        </div>
      )}
      {children}
    </>
  );
}
