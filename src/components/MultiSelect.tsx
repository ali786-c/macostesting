'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  icon: React.ReactNode;
  className?: string;
}

export default function MultiSelect({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  icon,
  className = ''
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter(v => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  };

  const removeOption = (value: string) => {
    onSelectionChange(selectedValues.filter(v => v !== value));
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option ? option.label : placeholder;
    }
    return `${selectedValues.length} sélectionnés`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition-all duration-300 bg-white hover:bg-orange-50/50 shadow-sm hover:shadow font-medium flex items-center justify-between ${
          selectedValues.length > 0 ? 'border-orange-300 bg-orange-50/30' : ''
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className="text-orange-500">{icon}</div>
          <span className="text-gray-700 text-sm">{getDisplayText()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
          <div className="p-2">
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-2 bg-orange-50 rounded-lg">
                {selectedValues.map(value => {
                  const option = options.find(opt => opt.value === value);
                  return (
                    <span
                      key={value}
                      className="inline-flex items-center space-x-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                    >
                      <span>{option?.label}</span>
                      <button
                        onClick={() => removeOption(value)}
                        className="hover:bg-orange-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            
            {options.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-orange-50 rounded-md transition-colors duration-200"
                >
                <span className="text-gray-700">{option.label}</span>
                {selectedValues.includes(option.value) && (
                  <Check className="w-5 h-5 text-orange-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
