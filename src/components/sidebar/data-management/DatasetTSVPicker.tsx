import { Upload } from 'lucide-react';
import { useRef } from 'react';
import useDataStore from '../../../store/useDataStore';
import { parseTSV } from '../../../adapters/tsvAdapter';

const DatasetTSVPicker = () => {
  const { addDataset } = useDataStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileChange called', e.target.files);

    const target = e.target;
    const newFiles = Array.from(target.files || []);

    if (newFiles.length === 0) {
      console.log('No files selected');
      return;
    }

    // Capture files before resetting
    const filesToProcess = [...newFiles];

    // Reset input value after capturing files so onChange fires again on re-selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!validateFiles(filesToProcess)) {
      return;
    }

    // Process files sequentially to avoid race conditions
    try {
      for (const file of filesToProcess) {
        console.log('Processing file:', file.name);
        const dataset = await parseTSV(file);
        addDataset(dataset);
      }
    } catch (error) {
      console.error('Error parsing TSV file:', error);
      alert('Error parsing file. Please check the file format.');
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
    <div className="flex flex-col gap-2 w-full">
      <label
        htmlFor="ogd-tsv-file-upload"
        onClick={(e) => {
          // Ensure the label click triggers the input
          e.preventDefault();
          fileInputRef.current?.click();
        }}
        className="inline-flex items-center justify-center px-4 py-2 bg-gray-400 text-white rounded-md font-medium cursor-pointer shadow hover:bg-gray-500 transition-colors text-sm"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Open Game Data TSV files
      </label>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        id="ogd-tsv-file-upload"
        className="hidden"
        onChange={handleFileChange}
        accept=".tsv,text/tab-separated-values,text/tsv"
      />
    </div>
  );
};

export default DatasetTSVPicker;
