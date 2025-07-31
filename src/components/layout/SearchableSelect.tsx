import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface BaseSearchableSelectProps {
  className?: string;
  label: string;
  options: Record<string, string>;
  placeholder?: string;
}

interface SingleSelectProps extends BaseSearchableSelectProps {
  selectMultiple?: false;
  value: string;
  onChange: (value: string) => void;
}

interface MultiSelectProps extends BaseSearchableSelectProps {
  selectMultiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

type SearchableSelectProps = SingleSelectProps | MultiSelectProps;

const SearchableSelect = ({
  label,
  value,
  placeholder = 'Select...',
  selectMultiple = false,
  onChange,
  options,
  className,
}: SearchableSelectProps) => {
  const [search, setSearch] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  useEffect(() => {
    const filtered = Object.entries(options).filter(
      ([key, displayName]) =>
        displayName.toLowerCase().includes(search.toLowerCase()) ||
        key.toLowerCase().includes(search.toLowerCase()),
    );
    setFilteredOptions(Object.fromEntries(filtered));
  }, [search, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedKey: string) => {
    if (selectMultiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(selectedKey)
        ? currentValues.filter((v) => v !== selectedKey)
        : [...currentValues, selectedKey];
      (onChange as (value: string[]) => void)(newValues);
    } else {
      (onChange as (value: string) => void)(selectedKey);
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleRemove = (keyToRemove: string) => {
    if (selectMultiple && Array.isArray(value)) {
      (onChange as (value: string[]) => void)(
        value.filter((v) => v !== keyToRemove),
      );
    }
  };

  const getDisplayValue = () => {
    if (selectMultiple && Array.isArray(value)) {
      return value
        .map((key) => options[key])
        .filter(Boolean)
        .join(', ');
    }
    return value ? options[value as string] || value : '';
  };

  const selectedValues = selectMultiple && Array.isArray(value) ? value : [];

  return (
    <div className={'flex flex-col justify-start items-start ' + className}>
      <label className="text-sm text-gray-700" htmlFor={label}>
        {label}
      </label>
      <div className="relative w-full" ref={dropdownRef}>
        <div
          className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full px-2 py-1 pr-10 cursor-pointer min-h-[32px] flex items-center"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectMultiple && Array.isArray(value) && value.length > 0 ? (
            <div className="flex flex-wrap gap-1 flex-1">
              {value.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
                >
                  {options[key]}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(key);
                    }}
                  />
                </span>
              ))}
            </div>
          ) : (
            <span
              className={getDisplayValue() ? 'text-gray-900' : 'text-gray-500'}
            >
              {getDisplayValue() || placeholder}
            </span>
          )}
        </div>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {Object.entries(filteredOptions).length > 0 ? (
                Object.entries(filteredOptions).map(([key, displayName]) => (
                  <div
                    key={key}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                      (selectMultiple &&
                        Array.isArray(value) &&
                        value.includes(key)) ||
                      (!selectMultiple && value === key)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-900'
                    }`}
                    onClick={() => handleSelect(key)}
                  >
                    {displayName}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableSelect;
