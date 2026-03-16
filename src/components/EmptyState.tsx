'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  iconColor?: string;
}

const iconSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  iconSize = 'md',
  iconColor = 'text-gray-400'
}: EmptyStateProps) {
  return (
    <div className={`bg-white rounded-lg md:rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 text-center ${className}`}>
      <div className="flex flex-col items-center">
        <div className={`${iconSizes[iconSize]} ${iconColor} mb-4`}>
          <Icon className="w-full h-full" />
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm md:text-base text-gray-600 max-w-md mx-auto mb-6">
            {description}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

