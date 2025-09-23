import React, { useState } from 'react';
import GridLayout from '../components/layout/GridLayout';
import DataSourceList from '../components/data-management/DataSourceList';
import CollapsibleSidePanel from '../components/sidebar/CollapsibleSidePanel';
import LayoutManager from '../components/sidebar/LayoutManager';
import FloatingHelpIcon from '../components/layout/FloatingHelpIcon';

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Main Content */}
      <div className="overflow-hidden h-full">
        {/* <h1 className="text-2xl font-light text-gray-900 mb-1">
          Open Game Data
        </h1> */}
        <GridLayout />
      </div>

      {/* Collapsible Side Panels */}
      <CollapsibleSidePanel>
        <div className="flex flex-col h-full">
          <div className="border-b border-gray-200">
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
          </div>
          <div className="flex-1 mt-2">
            {activeTab === 0 && <DataSourceList />}
            {activeTab === 1 && <LayoutManager />}
          </div>
        </div>
      </CollapsibleSidePanel>

      {/* Floating Help Icon */}
      <FloatingHelpIcon></FloatingHelpIcon>
    </div>
  );
};

export default HomePage;
