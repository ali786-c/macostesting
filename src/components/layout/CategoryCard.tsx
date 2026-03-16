import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  name: string;
  count: string;
  icon: LucideIcon;
  bgColor: string;
  onClick: () => void;
  isVisible?: boolean;
  delay?: number;
}

export default function CategoryCard({
  name,
  count,
  icon: IconComponent,
  bgColor,
  onClick,
  isVisible = true,
  delay = 0
}: CategoryCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group p-6 ${bgColor} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 hover:scale-105 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-16 h-16 bg-white/40 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <IconComponent className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
      </div>
      <h3 className="font-semibold text-white mb-2 group-hover:text-orange-200 transition-colors duration-300">
        {name}
      </h3>
      <p className="text-sm text-white/90 group-hover:text-orange-100 transition-colors duration-300">
        {count}
      </p>
    </div>
  );
}
