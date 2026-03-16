'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconBgColor?: string;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showSubtitleOnMobile?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconBgColor = 'from-orange-500 to-orange-600',
  actions,
  className = '',
  titleClassName = '',
  subtitleClassName = '',
  showSubtitleOnMobile = false
}: PageHeaderProps) {
  return (
    <div className={`mb-4 md:mb-8 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
          {Icon && (
            <div className={`hidden md:flex w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r ${iconBgColor} rounded-xl items-center justify-center shadow-md flex-shrink-0`}>
              <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent ${titleClassName}`}>
              {title}
            </h1>
            {subtitle && (
              <p className={`hidden ${showSubtitleOnMobile ? 'sm:block' : 'md:block'} text-sm md:text-base text-gray-600 mt-1 md:mt-2 ${subtitleClassName}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

