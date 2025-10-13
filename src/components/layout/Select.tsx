import { ChevronDown, InfoIcon } from 'lucide-react';
import Tooltip from './Tooltip';

interface SelectProps {
  className?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
  helpText?: string;
}

const Select = ({
  label,
  value,
  onChange,
  options,
  className,
  helpText,
}: SelectProps) => {
  return (
    <div className={'flex flex-col justify-start items-start ' + className}>
      <div className="flex items-center gap-1">
        {label && (
          <label className="text-sm text-gray-700" htmlFor={label}>
            {label}
          </label>
        )}
        {helpText && (
          <Tooltip text={helpText}>
            <InfoIcon className="w-4 h-4 text-gray-500 cursor-help hover:text-gray-700 transition-colors duration-200 group" />
          </Tooltip>
        )}
      </div>
      <div className="relative w-full">
        <select
          className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-2 py-1 pr-10 "
          defaultValue={undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {Object.entries(options).map(([key, displayName]) => (
            <option key={key} value={key}>
              {displayName}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
      </div>
    </div>
  );
};

export default Select;
