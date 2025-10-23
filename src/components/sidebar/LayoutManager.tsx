import { Plus, Save, X, Pencil, Download, Upload } from 'lucide-react';
import useLayoutStore, {
  DashboardLayoutWithMeta,
} from '../../store/useLayoutStore';
import useDataStore from '../../store/useDataStore';
import { useState } from 'react';
import Input from '../layout/Input';

const LayoutManager = () => {
  const {
    serializeLayout,
    loadLayout,
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
  };

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 my-2 justify-between">
          <button
            onClick={handleCreate}
            className="inline-flex flex-1 items-center justify-center px-4 py-2 bg-blue-400 text-white rounded-md font-medium cursor-pointer shadow hover:bg-blue-500 transition-colors text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="file-upload"
                className="inline-flex items-center justify-center px-4 py-2 bg-gray-400 text-white rounded-md font-medium cursor-pointer shadow hover:bg-gray-500 transition-colors text-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </label>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.type === 'application/json') {
                    handleImport(file);
                  }
                }}
                id="file-upload"
                className="hidden"
              />
            </div>
          </div>
        </div>
        {Object.entries(layouts).map(([id, layout]) => (
          <div
            key={id}
            className={`p-3 hover:bg-blue-50 rounded-lg border border-gray-100 transition-colors ${
              currentLayout === id ? 'bg-blue-100' : 'bg-gray-50'
            }`}
            onClick={() => setCurrentLayout(id)}
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
                    className="text-blue-500 hover:text-blue-700"
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
                    className="text-gray-400 hover:text-blue-500 mr-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(layout);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    className="text-gray-400 hover:text-blue-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(id, layout.name);
                    }}
                    title="Rename layout"
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
                  className="ml-2  text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove dataset"
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
