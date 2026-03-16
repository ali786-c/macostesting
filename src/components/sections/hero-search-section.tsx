'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Filter, X, Check, Car, Box, Warehouse } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';

interface HeroSearchSectionProps {
  onFiltersChange?: (filters: {
    type: string | null;
    types?: string[];
    city: string;
    startDate: Date | null;
    endDate: Date | null;
  }) => void;
}

export default function HeroSearchSection({ onFiltersChange }: HeroSearchSectionProps) {
  const { selectedType } = useSearch();
  const [cityInput, setCityInput] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Notifier le parent des changements de filtres
  useEffect(() => {
    if (onFiltersChange) {
      const typeValue = selectedTypes.length === 1 
        ? selectedTypes[0] 
        : (selectedTypes.length > 1 
          ? selectedTypes[0] 
          : (selectedType === 'all' ? null : selectedType));
      onFiltersChange({
        type: typeValue,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        city: cityInput.trim(),
        startDate,
        endDate
      });
    }
  }, [selectedType, selectedTypes, cityInput, startDate, endDate, onFiltersChange]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const formatTypeDisplay = () => {
    if (selectedTypes.length === 0) return 'Tous les types';
    if (selectedTypes.length === 1) {
      const labels: { [key: string]: string } = {
        'parking': 'Parking',
        'storage': 'Stockage',
        'cellar': 'Cave et Divers'
      };
      return labels[selectedTypes[0]] || 'Type';
    }
    return `${selectedTypes.length} types sélectionnés`;
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return 'Dates flexibles';
    if (startDate && !endDate) {
      return `À partir du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }
    return 'Dates flexibles';
  };

  const handleDateSelect = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      setShowDatePicker(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isDateInRange = (date: Date) => {
    if (!startDate) return false;
    if (startDate && endDate) {
      return date >= startDate && date <= endDate;
    }
    return date.getTime() === startDate.getTime();
  };

  const isDateSelectable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const hasActiveFilters = cityInput.trim() || startDate || endDate || selectedTypes.length > 0;

  return (
    <div className="w-full bg-gradient-to-b from-slate-50 via-white to-white py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Hero Title */}
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 tracking-tight">
            Trouvez l'espace
            <span className="block text-emerald-600 mt-2">parfait pour vous</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Des milliers d'espaces de parking, stockage et caves disponibles partout en France
          </p>
        </div>

        {/* Modern Search Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-6 md:p-8 transition-all duration-300 hover:shadow-2xl">
            {/* Main Search Input */}
            <div className="relative mb-6">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par ville, adresse ou code postal..."
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                className="w-full pl-12 pr-4 py-4 text-base border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50 focus:bg-white"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Type Filter */}
              <button
                onClick={() => setShowTypePicker(!showTypePicker)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium text-sm ${
                  selectedTypes.length > 0
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                {formatTypeDisplay()}
              </button>

              {/* Date Filter */}
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium text-sm ${
                  startDate || endDate
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
                {formatDateRange()}
              </button>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setCityInput('');
                    setStartDate(null);
                    setEndDate(null);
                    setSelectedTypes([]);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:border-slate-300 transition-all font-medium text-sm"
                >
                  <X className="w-4 h-4" />
                  Réinitialiser
                </button>
              )}

              {/* Search Button */}
              <button
                className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Search className="w-4 h-4" />
                Rechercher
              </button>
            </div>
          </div>
        </div>

        {/* Type Picker Dropdown */}
        {showTypePicker && (
          <div className="max-w-4xl mx-auto mt-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Type d'Espace</h3>
                <button
                  onClick={() => setShowTypePicker(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'parking', label: 'Parking', icon: Car },
                  { value: 'storage', label: 'Stockage', icon: Box },
                  { value: 'cellar', label: 'Cave et Divers', icon: Warehouse }
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedTypes.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      onClick={() => toggleType(type.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        isSelected ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          isSelected ? 'text-emerald-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <span className="font-medium flex-1 text-left">{type.label}</span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Date Picker Dropdown */}
        {showDatePicker && (
          <div className="max-w-4xl mx-auto mt-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Sélectionnez vos dates</h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-base font-semibold text-slate-900">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </div>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((date, idx) => {
                    if (!date) {
                      return <div key={idx} className="aspect-square" />;
                    }
                    const isInRange = isDateInRange(date);
                    const isSelectable = isDateSelectable(date);
                    const isStart = startDate && date.getTime() === startDate.getTime();
                    const isEnd = endDate && date.getTime() === endDate.getTime();
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => isSelectable && handleDateSelect(date)}
                        disabled={!isSelectable}
                        className={`
                          aspect-square rounded-lg text-sm transition-all font-medium
                          ${!isSelectable 
                            ? 'text-slate-300 cursor-not-allowed' 
                            : isStart || isEnd
                            ? 'bg-emerald-600 text-white font-semibold'
                            : isInRange
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-slate-700 hover:bg-slate-100'
                          }
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Effacer
                </button>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backdrop */}
        {(showDatePicker || showTypePicker) && (
          <div 
            className="fixed inset-0 z-10 bg-black/20 backdrop-blur-sm transition-opacity" 
            onClick={() => {
              setShowDatePicker(false);
              setShowTypePicker(false);
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
