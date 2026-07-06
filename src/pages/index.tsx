import React, { useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import GridLayout from '../components/layout/GridLayout';
import AppChatPanel from '../components/chat/AppChatPanel';
import DataSourceList from '../components/sidebar/data-management/DataSourceList';
import CollapsibleSidePanel from '../components/sidebar/CollapsibleSidePanel';
import LayoutManager from '../components/sidebar/LayoutManager';
import TopBar from '../components/layout/TopBar';
import DatasetDeepLinkProvider from '../components/providers/DatasetDeepLinkProvider';
import useDataStore from '../store/useDataStore';
import useLayoutStore from '../store/useLayoutStore';
import { trackEvent } from '../lib/analytics';
import { isAssistantEnabled } from '../lib/ai/assistantFeature';

type HomePageProps = {
  assistantEnabled: boolean;
};

const HomePage: React.FC<HomePageProps> = ({ assistantEnabled }) => {
  const [activeTab, setActiveTab] = useState(0);
  const { setCurrentLayout, loadLayout } = useLayoutStore();
  const layoutDataStoreJsonFileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (file: File) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      const importJson = e.target?.result as string;
      const importData = JSON.parse(importJson);

      // Check if it's the new format (version 2+)
      if (importData.version >= 2) {
        // Restore the specific layout
        if (importData.layout) {
          useLayoutStore.setState((state) => ({
            layouts: {
              ...state.layouts,
              [importData.layout.id]: importData.layout,
            },
          }));
          setCurrentLayout(importData.layout.id);
        }

        // Restore only the relevant datasets
        if (importData.datasets) {
          useDataStore.setState((state) => ({
            datasets: { ...state.datasets, ...importData.datasets },
          }));
        }
        trackEvent('layout_import');
      } else {
        // Legacy format - use old method
        const layout = loadLayout(importJson);
        setCurrentLayout(layout.id);
        trackEvent('layout_import');
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <DatasetDeepLinkProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50">
        <TopBar />

        <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
          <CollapsibleSidePanel side="left" collapsedLabel="Data">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200">
                <nav className="flex space-x-2" aria-label="Tabs">
                  <button
                    className={`px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none border-b-2 transition-colors ${
                      activeTab === 0 ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => setActiveTab(0)}
                    aria-selected={activeTab === 0}
                  >
                    Data Sources
                  </button>
                  <button
                    className={`px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none border-b-2 transition-colors ${
                      activeTab === 1 ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => setActiveTab(1)}
                    aria-selected={activeTab === 1}
                  >
                    Dashboards
                  </button>
                </nav>
              </div>
              <div className="mt-2 flex-1">
                {activeTab === 0 && <DataSourceList />}
                {activeTab === 1 && (
                  <LayoutManager
                    onImportClick={() => layoutDataStoreJsonFileInputRef.current?.click()}
                  />
                )}
                <input
                  id="layout-data-store-json-file-upload"
                  ref={layoutDataStoreJsonFileInputRef}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.type === 'application/json') {
                      handleImport(file);
                    }
                  }}
                  className="hidden"
                  accept="application/json"
                />
              </div>
            </div>
          </CollapsibleSidePanel>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <GridLayout />
          </div>

          {assistantEnabled && (
            <CollapsibleSidePanel
              side="right"
              collapsedLabel="Assistant"
              scrollBody={false}
              defaultOpen={false}
              widthClassName="w-[min(28rem,34vw)]"
            >
              <div className="flex h-full min-h-0 flex-col gap-2">
                <h2 className="shrink-0 text-sm font-semibold text-gray-800">
                  Assistant
                </h2>
                <div className="min-h-0 flex-1">
                  <AppChatPanel />
                </div>
              </div>
            </CollapsibleSidePanel>
          )}
        </div>
      </div>
    </DatasetDeepLinkProvider>
  );
};

export default HomePage;

export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => ({
  props: {
    assistantEnabled: isAssistantEnabled(),
  },
});
