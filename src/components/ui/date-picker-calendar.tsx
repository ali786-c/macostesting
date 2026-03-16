'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fromApiDateTime, toLocalDateString } from '@/lib/datetime';

export const DatePickerCalendar = ({
  selectedDate,
  onSelectDate,
  onClearDate,
  minDate,
  maxDate,
  currentMonth,
  onMonthChange,
  excludedDateRanges,
  availableDates,
  onClose,
  closeLabel = 'Fermer',
}: {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onClearDate?: () => void;
  minDate: Date;
  maxDate?: Date;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  excludedDateRanges?: Array<{ start: string; end: string }>;
  availableDates?: Set<string>; // Set de dates disponibles au format "YYYY-MM-DD"
  onClose?: () => void;
  closeLabel?: string;
}) => {
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Jours du mois précédent
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Vérifier si une date est dans une période exclue (pour compatibilité)
  const isDateExcluded = (date: Date): boolean => {
    if (!excludedDateRanges || excludedDateRanges.length === 0) return false;
    
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    return excludedDateRanges.some(range => {
      // Plages potentiellement en UTC (API) → parser avec fromApiDateTime pour comparaison en local
      const startDate = fromApiDateTime(range.start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = fromApiDateTime(range.end);
      endDate.setHours(23, 59, 59, 999);
      
      return dateOnly >= startDate && dateOnly <= endDate;
    });
  };

  // Vérifier si une date est disponible (nouvelle logique)
  const isDateAvailable = (date: Date): boolean => {
    if (availableDates && availableDates.size > 0) {
      const dateStr = toLocalDateString(date);
      return availableDates.has(dateStr);
    }
    // Si pas de availableDates défini, utiliser l'ancienne logique avec excludedDateRanges
    return !isDateExcluded(date);
  };

  const isDateSelectable = (date: Date) => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const minDateOnly = new Date(minDate);
    minDateOnly.setHours(0, 0, 0, 0);
    if (maxDate) {
      const maxDateOnly = new Date(maxDate);
      maxDateOnly.setHours(23, 59, 59, 999);
      if (dateOnly > maxDateOnly) return false;
    }
    // Si availableDates est défini, n'afficher QUE les dates disponibles
    if (availableDates && availableDates.size > 0) {
      return dateOnly >= minDateOnly && isDateAvailable(date);
    }
    
    // Sinon, utiliser l'ancienne logique : la date doit être >= minDate ET ne pas être dans une période exclue
    return dateOnly >= minDateOnly && !isDateExcluded(date);
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth.getMonth() - 1);
    } else {
      newDate.setMonth(currentMonth.getMonth() + 1);
    }
    onMonthChange(newDate);
  };

  return (
    <div className="w-full">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
        </button>
        <div className="flex items-center gap-2">
          <select
            value={currentMonth.getMonth()}
            onChange={(e) => {
              const newDate = new Date(currentMonth);
              newDate.setMonth(parseInt(e.target.value));
              onMonthChange(newDate);
            }}
            className="text-sm font-semibold text-slate-900 bg-transparent border-none outline-none cursor-pointer"
          >
            {monthNames.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
          <select
            value={currentMonth.getFullYear()}
            onChange={(e) => {
              const newDate = new Date(currentMonth);
              newDate.setFullYear(parseInt(e.target.value));
              onMonthChange(newDate);
            }}
            className="text-sm font-semibold text-slate-900 bg-transparent border-none outline-none cursor-pointer"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 text-slate-900" />
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-slate-600 py-1 sm:py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={idx} className="aspect-square min-w-0" />;
          }
          
          const selectable = isDateSelectable(date);
          const selected = isSelected(date);
          const todayDate = isToday(date);
          
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (selectable) {
                  onSelectDate(date);
                }
              }}
              disabled={!selectable}
              title={!isDateAvailable(date) ? 'Cette date n\'est pas disponible' : ''}
              className={`
                aspect-square min-w-0 rounded-lg text-[11px] sm:text-sm font-medium transition-colors
                max-md:min-h-[28px] max-md:min-w-0
                ${!selectable 
                  ? !isDateAvailable(date)
                    ? 'text-slate-400 bg-slate-100 cursor-not-allowed opacity-70 border border-slate-300' 
                    : 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
                  : selected
                  ? 'bg-emerald-600 text-white shadow-md font-bold cursor-pointer hover:bg-emerald-700 max-md:scale-100 sm:hover:scale-105'
                  : todayDate
                  ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-400 hover:bg-emerald-100 font-semibold cursor-pointer'
                  : 'text-slate-900 bg-white hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer border border-transparent hover:border-emerald-200 max-md:active:bg-emerald-50'
                }
              `}
            >
              {/* N'afficher le numéro du jour que pour les dates disponibles (comme sur la fiche bien) */}
              {selectable ? date.getDate() : (availableDates && availableDates.size > 0 ? '' : date.getDate())}
            </button>
          );
        })}
      </div>

      {/* Boutons d'action : Aujourd'hui, Effacer et Fermer sur la même ligne */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isDateSelectable(today)) {
              onSelectDate(today);
            }
          }}
          className="flex-1 min-w-0 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Aujourd&apos;hui
        </button>
        <button
          type="button"
          onClick={() => {
            if (onClearDate) {
              onClearDate();
            }
          }}
          className="flex-1 min-w-0 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Effacer
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-0 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {closeLabel}
          </button>
        )}
      </div>
    </div>
  );
};

