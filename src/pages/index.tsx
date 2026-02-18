import React, { useRef, useState } from 'react';
import GridLayout from '../components/layout/GridLayout';
import DataSourceList from '../components/sidebar/data-management/DataSourceList';
import CollapsibleSidePanel from '../components/sidebar/CollapsibleSidePanel';
import LayoutManager from '../components/sidebar/LayoutManager';
import FloatingHelpIcon from '../components/layout/FloatingHelpIcon';
import DatasetDeepLinkProvider from '../components/providers/DatasetDeepLinkProvider';
import { Upload } from 'lucide-react';
import useDataStore from '../store/useDataStore';
import useLayoutStore from '../store/useLayoutStore';

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
      } else {
        // Legacy format - use old method
        const layout = loadLayout(importJson);
        setCurrentLayout(layout.id);
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <DatasetDeepLinkProvider>
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Main Content */}
        <div className="overflow-hidden h-full">
          <GridLayout />
        </div>

        {/* Collapsible Side Panels */}
        <CollapsibleSidePanel>
          <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 flex items-center justify-between">
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
                    <Upload className="w-4 h-4 mr-2" />
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
            <div className="flex-1 mt-2">
              {activeTab === 0 && <DataSourceList />}
              {activeTab === 1 && <LayoutManager />}
            </div>
          </div>
        </CollapsibleSidePanel>

        {/* Floating Help Icon */}
        <FloatingHelpIcon />
      </div>
    </DatasetDeepLinkProvider>
  );
};

export default HomePage;
