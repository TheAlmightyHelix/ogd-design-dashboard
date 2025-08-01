import { Upload } from 'lucide-react';
import useDataStore from '../../store/useDataStore';
import { parseTSV } from '../../adapters/tsvAdapter';

const DatasetTSVPicker = () => {
  const { addDataset } = useDataStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (validateFiles(newFiles)) {
      newFiles.forEach(async (file) => {
        const dataset = await parseTSV(file);
        addDataset(dataset);
      });
    }
  };

  const validateFiles = (files: File[]) => {
    if (
      !files.every(
        (file) =>
          file.type === 'text/tab-separated-values' ||
          file.type === 'text/tsv' ||
          file.name.toLowerCase().endsWith('.tsv'),
      )
    ) {
      console.log(files);
      alert('Please upload valid Open Game Data TSV files');
      return false;
    }
    return true;
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="file-upload"
        className="inline-flex items-center justify-center px-4 py-2 bg-blue-400 text-white rounded-md font-medium cursor-pointer shadow hover:bg-blue-500 transition-colors text-sm"
      >
        <Upload className="w-4 h-4 mr-2" />
        Select Open Game Data TSV files
      </label>
      <input
        type="file"
        multiple
        id="file-upload"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default DatasetTSVPicker;
