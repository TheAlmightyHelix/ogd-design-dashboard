import { variance } from 'd3';
import { useEffect, useState } from 'react';

interface InputProps {
  className?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  debounce?: boolean;
  autoFocus?: boolean;
  variant?: 'default' | 'subtle';
}

const Input = ({
  className,
  label,
  value,
  onChange,
  onEnter,
  placeholder,
  debounce = false,
  autoFocus = false,
  variant = 'default',
}: InputProps) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // Sync from parent when not focused; while focused, parent value can lag (e.g. debounce) — syncing would reset the caret.
  // Exception: parent-driven clear (e.g. submit) must still empty the field while focus stays on the input.
  useEffect(() => {
    if (!isFocused) {
      setInternalValue(value);
      return;
    }
    if (value === '') {
      setInternalValue('');
    }
  }, [value, isFocused]);

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
    <div
      className={
        'flex min-w-0 flex-col justify-start items-stretch w-full ' +
        (className ?? '')
      }
    >
      {label && (
        <label className="text-sm text-gray-700" htmlFor={label}>
          {label}
        </label>
      )}
      <input
        className={`min-w-0 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full px-2 py-1 overflow-hidden text-ellipsis ${variant === 'subtle' ? 'border-none focus:ring-0 focus:border-0 focus:outline-none' : 'bg-gray-50 focus:ring-blue-500 focus:border-blue-500 :bg-gray-700'}`}
        type="text"
        id={label}
        value={internalValue}
        placeholder={placeholder ?? 'Type...'}
        onChange={(e) => setInternalValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          onChange(internalValue);
          setIsFocused(false);
        }}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onEnter?.();
          }
        }}
      />
    </div>
  );
};

export default Input;
