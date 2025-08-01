import { useEffect, useState } from 'react';

interface InputProps {
  className?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: boolean;
  autoFocus?: boolean;
}

const Input = ({
  className,
  label,
  value,
  onChange,
  placeholder,
  debounce = false,
  autoFocus = false,
}: InputProps) => {
  const [internalValue, setInternalValue] = useState(value);

  // Sync internal value with prop when parent changes it
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounce only user input
  useEffect(() => {
    if (internalValue === value) return; // Don't call onChange if value is from parent
    const timer = setTimeout(
      () => {
        onChange(internalValue);
      },
      debounce ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [internalValue, debounce]);

  return (
    <div className={'flex flex-col justify-start items-start ' + className}>
      {label && (
        <label className="text-sm text-gray-700" htmlFor={label}>
          {label}
        </label>
      )}
      <input
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-2 py-1 :bg-gray-700 "
        type="text"
        id={label}
        value={internalValue}
        placeholder={placeholder ?? 'Type...'}
        onChange={(e) => setInternalValue(e.target.value)}
        onBlur={() => onChange(internalValue)}
        autoFocus={autoFocus}
      />
    </div>
  );
};

export default Input;
