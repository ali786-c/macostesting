import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  className?: string;
  isVisible?: boolean;
  delay?: number;
}

export default function SectionHeader({
  title,
  subtitle,
  description,
  icon: Icon,
  badge,
  className = '',
  isVisible = true,
  delay = 0
}: SectionHeaderProps) {
  return (
    <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {badge && (
        <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-6">
          {Icon && <Icon className="w-4 h-4 mr-2" />}
          {badge}
        </div>
      )}
      
      <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
        {subtitle && (
          <span className="block text-2xl lg:text-3xl text-gray-600 mb-2">
            {subtitle}
          </span>
        )}
        <span className="bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
          {title}
        </span>
      </h2>
      
      {description && (
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
