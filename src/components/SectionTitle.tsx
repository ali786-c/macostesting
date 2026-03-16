'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
  showSubtitleOnMobile?: boolean;
}

export default function SectionTitle({
  title,
  subtitle,
  icon: Icon,
  action,
  className = '',
  titleClassName = '',
  showSubtitleOnMobile = false
}: SectionTitleProps) {
  return (
    <div className={`flex items-center justify-between mb-4 md:mb-6 ${className}`}>
      <div className="flex items-center space-x-2 md:space-x-3">
        {Icon && (
          <div className="hidden md:flex w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg items-center justify-center shadow-md flex-shrink-0">
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
        )}
        <div>
          <h2 className={`text-sm md:text-xl font-bold text-gray-900 ${titleClassName}`}>
            {title}
          </h2>
          {subtitle && (
            <p className={`hidden ${showSubtitleOnMobile ? 'sm:block' : 'md:block'} text-xs md:text-sm text-gray-600 mt-1`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

