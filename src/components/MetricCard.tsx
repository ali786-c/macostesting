'use client';

import { LucideIcon, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
  iconGradient?: string;
  growth?: {
    value: number;
    isPositive?: boolean;
  };
  className?: string;
  animationDelay?: string;
}

export default function MetricCard({
  value,
  label,
  icon: Icon,
  iconGradient = 'from-blue-500 to-blue-600',
  growth,
  className = '',
  animationDelay = ''
}: MetricCardProps) {
  return (
    <div className={`card-glass p-1.5 md:p-3 animate-fade-in hover:scale-105 transition-all duration-300 ${animationDelay} ${className}`}>
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center gap-3">
        <div className={`w-10 h-10 bg-gradient-to-r ${iconGradient} rounded-lg flex items-center justify-center shadow-md flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-gray-900">{value}</h3>
            {growth && (
              <span className={`badge badge-success flex items-center text-xs flex-shrink-0`}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {growth.isPositive !== false ? '+' : ''}{growth.value}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{label}</p>
        </div>
      </div>
      
      {/* Mobile Layout */}
      <div className="md:hidden flex items-center gap-1.5">
        <div className={`w-5 h-5 bg-gradient-to-r ${iconGradient} rounded flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <h3 className="text-xs font-bold text-gray-900">{value}</h3>
            {growth && (
              <span className={`text-[8px] ${growth.isPositive !== false ? 'text-green-600' : 'text-red-600'} font-medium`}>
                {growth.isPositive !== false ? '+' : ''}{growth.value}%
              </span>
            )}
          </div>
          <p className="text-[8px] text-gray-600 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

