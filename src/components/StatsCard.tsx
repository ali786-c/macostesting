import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'red';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const colorClasses = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  orange: 'text-orange-500',
  purple: 'text-purple-500',
  red: 'text-red-500'
};

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  trend,
  className = ''
}: StatsCardProps) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="font-medium">
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-gray-500">vs mois dernier</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gray-50 ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
