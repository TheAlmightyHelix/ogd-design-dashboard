import { Plus, Save, X, Pencil, Download } from 'lucide-react';
import useLayoutStore, {
  DashboardLayoutWithMeta,
} from '../../store/useLayoutStore';
import useDataStore from '../../store/useDataStore';
import { useState } from 'react';
import Input from '../layout/Input';
import { trackEvent } from '../../lib/analytics';

const LayoutManager = () => {
  const {
    layouts,
    currentLayout,
    createLayout,
    deleteLayout,
    setCurrentLayout,
    updateLayoutName,
  } = useLayoutStore();

  const { datasets } = useDataStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = () => {
    trackEvent('dashboard_created');
    createLayout();
  };

  const handleRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleRenameSave = (id: string) => {
    if (editingName.trim()) {
      updateLayoutName(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleExport = (layout: DashboardLayoutWithMeta) => {
    // Get dataset IDs used in this specific layout
    const usedDatasetIds = new Set<string>();
    Object.values(layout.charts).forEach((chart) => {
      chart.datasetIds.forEach((id) => usedDatasetIds.add(id));
    });

    // Filter datasets to only include those used in this layout
    const relevantDatasets: Record<string, GameData> = {};
    usedDatasetIds.forEach((datasetId) => {
      if (datasets[datasetId]) {
        relevantDatasets[datasetId] = datasets[datasetId];
      }
    });

    // Export only the specific layout and relevant datasets
    const exportData = {
      version: 2,
      layout: layout,
      datasets: relevantDatasets,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layout.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('layout_export');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 my-2 justify-between">
          <button
            onClick={handleCreate}
            className="max-w-sm inline-flex flex-1 items-center justify-center px-4 py-2 bg-primary text-white rounded-md font-medium cursor-pointer hover:bg-primary/80 transition-colors text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Dashboard
          </button>
        </div>
        {Object.entries(layouts).map(([id, layout]) => (
          <div
            key={id}
            className={`p-3 rounded-lg border border-gray-100 transition-colors ${
              currentLayout === id
                ? 'bg-primary/20'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => {
              setCurrentLayout(id);
              trackEvent('dashboard_switch', {
                layout_id: id,
                layout_name: layout.name,
              });
            }}
          >
            <div className="w-full flex justify-between items-center gap-2">
              {editingId === id ? (
                <>
                  <Input
                    className="w-full"
                    value={editingName}
                    onChange={setEditingName}
                    placeholder="Layout name"
                    debounce={false}
                    autoFocus={true}
                  />
                  <button
                    className="text-primary hover:text-primary/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameSave(id);
                    }}
                    title="Save name"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 font-medium text-sm text-gray-800 w-full">
                    {layout.name}
                    <span className="text-xs text-gray-500">
                      {currentLayout === id ? '(current)' : ''}
                    </span>
                  </div>
                  <button
                    className="text-gray-500 hover:text-primary mr-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(layout);
                    }}
                    title="Export dashboard as JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    className="text-gray-500 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(id, layout.name);
                    }}
                    title="Rename dashboard"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              )}
              {Object.keys(layouts).length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayout(id);
                  }}
                  className="ml-2 text-gray-500 hover:hover:text-red-500 transition-colors"
                  title="Remove dashboard"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayoutManager;
