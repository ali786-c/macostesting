'use client';

import { Search, Filter } from 'lucide-react';
import { ReactNode } from 'react';

interface SearchBarWithFilterProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onFilterClick?: () => void;
  showFilterButton?: boolean;
  filterButtonTitle?: string;
  className?: string;
  inputClassName?: string;
  children?: ReactNode; // Filtres additionnels à afficher
}

export default function SearchBarWithFilter({
  placeholder = 'Rechercher...',
  value,
  onChange,
  onFilterClick,
  showFilterButton = true,
  filterButtonTitle,
  className = '',
  inputClassName = '',
  children
}: SearchBarWithFilterProps) {
  return (
    <div className={`mb-3 md:mb-4 ${className}`}>
      <div className="relative flex gap-1.5 md:gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 md:text-orange-500 w-3.5 h-3.5 md:w-4 md:h-4 z-10" />
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full pl-8 md:pl-10 pr-3 py-1.5 md:py-2.5 text-xs md:text-sm border border-gray-300 md:border-orange-200 rounded-lg focus:ring-1 md:focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none cursor-pointer bg-white shadow-sm hover:shadow transition-all duration-200 text-gray-900 font-normal md:font-medium ${inputClassName}`}
          />
        </div>
        {showFilterButton && (
          <button
            onClick={onFilterClick}
            className="md:hidden w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors duration-200 cursor-pointer"
            title={filterButtonTitle || 'Filtres'}
          >
            <Filter className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

