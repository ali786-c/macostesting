'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  badge?: ReactNode;
}

interface TabsNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  containerClassName?: string;
}

export default function TabsNavigation({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  containerClassName = ''
}: TabsNavigationProps) {
  return (
    <div className={`bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-1.5 md:p-2 mb-4 md:mb-6 ${containerClassName}`}>
      <div className={`flex items-center gap-1 md:gap-2 ${className}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer flex-1 justify-center group ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {Icon && (
                <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-300 ${
                  isActive ? 'text-white' : 'text-gray-500 group-hover:text-orange-500'
                }`} />
              )}
              <span className="whitespace-nowrap font-semibold">{tab.label}</span>
              {(tab.count !== undefined || tab.badge) && (
                <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold min-w-[20px] md:min-w-[24px] text-center transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/25 text-white border border-white/30' 
                    : 'bg-orange-50 text-orange-600 border border-orange-200 group-hover:bg-orange-100 group-hover:border-orange-300'
                }`}>
                  {tab.badge || tab.count}
                </span>
              )}
              {/* Indicateur de sélection - ligne en bas pour l'onglet actif */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/50 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

