import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import Dialog from './Dialog';

const FloatingHelpIcon: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* Floating Help Icon */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 left-6 z-40 hover:bg-blue-100  rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Help Modal */}
      <Dialog open={isOpen} onClose={handleClose}>
        <div className="space-y-6 max-h-[90vh] overflow-y-auto">
          {/* Welcome Section */}
          <div className="pb-6">
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-gray-800">
                Open Game Data Dashboard
              </h1>
              <p className="text-gray-600 text-lg mb-4">
                Welcome! Here's a quick tutorial on how to use the app:
              </p>
            </div>

            {/* Video Tutorial */}
            <div className="space-y-3">
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '54.545454545454554%',
                  height: '0',
                }}
              >
                <iframe
                  src="https://www.loom.com/embed/de3cc8e32df44e5699b23f772cf7c602?sid=ad7ecaba-cd4f-4f2f-b286-a6e177f0b21f"
                  frameBorder="0"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                ></iframe>
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-blue-200 pb-2">
              Tips
            </h2>

            {/* File Upload Section */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-700">
                What files do I upload?
              </h3>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                <p className="text-gray-700">
                  You can upload <strong>Open Game Data TSV files</strong> to
                  the app. Make sure the TSV files follow the naming convention:
                </p>
                <code className="block mt-2 p-2 bg-gray-100 rounded text-sm font-mono text-gray-800">
                  GAMENAME_STARTDATE_to_ENDDATE_VERSION_FEATURE-LEVEL.tsv
                </code>
              </div>
            </div>

            {/* Chart Creation Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-700">
                What charts can I create?
              </h3>
              <p className="text-gray-700">
                The app allows you to visualize features in OGD datasets. The
                type of visualization supported depends on the{' '}
                <strong>feature level</strong> of the uploaded TSV file and the{' '}
                <strong>data type</strong> of the specific feature:
              </p>

              {/* Chart Types List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Bar Chart
                  </h4>
                  <p className="text-sm text-gray-600">
                    Used for textual/categorical data (e.g. Job, Population)
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Histogram
                  </h4>
                  <p className="text-sm text-gray-600">
                    Used for visualizing the distribution of numerical data
                    (e.g. Active Time)
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Dataset Comparison
                  </h4>
                  <p className="text-sm text-gray-600">
                    Used for comparing two numerical features
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Scatter Plot
                  </h4>
                  <p className="text-sm text-gray-600">
                    Used for comparing two numerical features
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Box Plot</h4>
                  <p className="text-sm text-gray-600">
                    Used for visualizing the distribution of numerical data
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Descriptive Statistics
                  </h4>
                  <p className="text-sm text-gray-600">
                    Used for displaying descriptive statistics (mean, median,
                    mode, standard deviation, etc.) of numerical features
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Sankey Diagram
                  </h4>
                  <p className="text-sm text-gray-600">
                    Used for visualizing player progression and burndown
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Job Graph
                  </h4>
                  <p className="text-sm text-gray-600">
                    Used for visualizing player progression
                  </p>
                </div>
              </div>
            </div>

            {/* Compatibility Table */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-700">
                Chart Compatibility
              </h3>
              <div className="overflow-x-auto">
                <table className="table-auto border-collapse border border-gray-300 w-full bg-white shadow-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                        Feature Level
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                        Data Type
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                        Visualizations Supported
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium text-gray-800">
                        Session/Player
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        Textual/Categorical
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        Bar Chart
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-gray-500 italic">
                        (same as above)
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        Numerical
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        Descriptive Statistics, Histogram, Dataset Comparison,
                        Scatter Plot, Box Plot
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium text-gray-800">
                        Population
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        Any
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        Descriptive Statistics, Sankey Diagram, Job Graph
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default FloatingHelpIcon;
