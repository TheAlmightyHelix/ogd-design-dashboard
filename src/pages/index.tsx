import React, { useRef, useState } from 'react';
import GridLayout from '../components/layout/GridLayout';
import AppChatPanel from '../components/chat/AppChatPanel';
import DataSourceList from '../components/sidebar/data-management/DataSourceList';
import CollapsibleSidePanel from '../components/sidebar/CollapsibleSidePanel';
import LayoutManager from '../components/sidebar/LayoutManager';
import FloatingHelpIcon from '../components/layout/FloatingHelpIcon';
import DatasetDeepLinkProvider from '../components/providers/DatasetDeepLinkProvider';
import { Upload } from 'lucide-react';
import useDataStore from '../store/useDataStore';
import useLayoutStore from '../store/useLayoutStore';
import { trackEvent } from '../lib/analytics';

const HomePage: React.FC = () => {
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
      <>
        <div className="flex h-screen min-h-0 flex-row overflow-hidden bg-gray-50">
          <CollapsibleSidePanel side="left" collapsedLabel="Data">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200">
                <nav className="flex space-x-2" aria-label="Tabs">
                  <button
                    className={`px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none border-b-2 transition-colors ${
                      activeTab === 0 ? 'border-blue-500' : 'border-transparent'
                    }`}
                    onClick={() => setActiveTab(0)}
                    aria-selected={activeTab === 0}
                  >
                    Data Sources
                  </button>
                  <button
                    className={`px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none border-b-2 transition-colors ${
                      activeTab === 1 ? 'border-blue-500' : 'border-transparent'
                    }`}
                    onClick={() => setActiveTab(1)}
                    aria-selected={activeTab === 1}
                  >
                    Dashboards
                  </button>
                </nav>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="layout-data-store-json-file-upload"
                      className="inline-flex items-center justify-center px-4 py-2 text-gray-500 rounded-md font-medium cursor-pointer hover:bg-gray-200 transition-colors text-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        layoutDataStoreJsonFileInputRef.current?.click();
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </label>
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
              </div>
              <div className="mt-2 flex-1">
                {activeTab === 0 && <DataSourceList />}
                {activeTab === 1 && <LayoutManager />}
              </div>
            </div>
          </CollapsibleSidePanel>

          {/* Main: own scroll; panels stay full viewport height */}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <GridLayout />
          </div>

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
        </div>

        <FloatingHelpIcon />
      </>
    </DatasetDeepLinkProvider>
  );
};

export default HomePage;
