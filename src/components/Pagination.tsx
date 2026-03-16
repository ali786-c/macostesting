'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showLabels?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  showLabels = true
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2"
      >
        <ChevronLeft className="w-4 h-4" />
        {showLabels && <span>Précédent</span>}
      </button>
      
      <div className="flex items-center space-x-1">
        {[...Array(totalPages)].map((_, index) => {
          const page = index + 1;
          if (
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
                  currentPage === page
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            );
          } else if (page === currentPage - 2 || page === currentPage + 2) {
            return <span key={page} className="px-2 text-gray-500">...</span>;
          }
          return null;
        })}
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2"
      >
        {showLabels && <span>Suivant</span>}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

