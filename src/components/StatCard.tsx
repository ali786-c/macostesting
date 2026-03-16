'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface StatCardProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
  iconColor?: 'orange' | 'yellow' | 'blue' | 'green' | 'purple' | 'red' | 'pink';
  borderColor?: 'orange' | 'yellow' | 'blue' | 'green' | 'purple' | 'red' | 'pink';
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  className?: string;
  mobileCompact?: boolean;
}

const colorClasses = {
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-500',
    border: 'border-orange-200'
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-500',
    border: 'border-yellow-200'
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-500',
    border: 'border-blue-200'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-500',
    border: 'border-green-200'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-500',
    border: 'border-purple-200'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-500',
    border: 'border-red-200'
  },
  pink: {
    bg: 'bg-pink-50',
    icon: 'text-pink-500',
    border: 'border-pink-200'
  }
};

export default function StatCard({
  value,
  label,
  icon: Icon,
  iconColor = 'orange',
  borderColor = 'orange',
  trend,
  className = '',
  mobileCompact = true
}: StatCardProps) {
  const colors = colorClasses[iconColor];
  const borderColors = colorClasses[borderColor];

  return (
    <div className={`bg-white rounded-lg md:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border ${borderColors.border} overflow-hidden ${className} relative group h-full min-h-[80px] md:min-h-[90px] flex flex-col`}>
      {/* Effet de brillance subtil au survol */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      <div className="relative z-10 p-3 md:p-4 flex-1 flex flex-col items-center justify-center">
        {/* Mobile: icône à gauche, texte à droite */}
        {mobileCompact && (
          <div className="md:hidden flex items-center gap-2.5 h-full w-full">
            <div className={`${colors.bg} rounded-lg p-2 flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
            </div>
            <div className="flex-1 min-w-0 text-center">
              <p className="text-base font-bold text-gray-900 leading-tight mb-0.5">{value}</p>
              <p className="text-[9px] text-gray-600 leading-tight font-medium">{label}</p>
            </div>
          </div>
        )}
        
        {/* Desktop */}
        <div className={`${mobileCompact ? 'hidden md:flex' : 'flex'} h-full w-full items-center justify-center`}>
          <div className="flex items-center gap-3 md:gap-4 w-full">
            {/* Icône à gauche */}
            <div className={`${colors.bg} rounded-lg p-2 md:p-2.5 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300 flex-shrink-0`}>
              <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${colors.icon}`} />
            </div>
            
            {/* Contenu principal - texte à droite */}
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-lg md:text-xl font-bold text-gray-900 leading-tight mb-0.5 md:mb-1 tracking-tight">
                {value}
              </p>
              <p className="text-[10px] md:text-xs text-gray-600 leading-tight font-medium">
                {label}
              </p>
              {trend && (
                <span className={`text-[10px] md:text-xs font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded-full mt-1 w-fit ${
                  trend.isPositive !== false 
                    ? 'text-green-700 bg-green-50' 
                    : 'text-red-700 bg-red-50'
                }`}>
                  {trend.isPositive !== false ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

