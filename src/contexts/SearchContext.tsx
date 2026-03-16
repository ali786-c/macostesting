'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SearchContextType {
  selectedType: string;
  setSelectedType: (type: string) => void;
  city: string;
  setCity: (city: string) => void;
  startDate: Date | null;
  setStartDate: (date: Date | null) => void;
  endDate: Date | null;
  setEndDate: (date: Date | null) => void;
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
  selectedCityCoords: { lat: number; lng: number } | null;
  setSelectedCityCoords: (coords: { lat: number; lng: number } | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [city, setCity] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCityCoords, setSelectedCityCoords] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <SearchContext.Provider value={{ 
      selectedType, 
      setSelectedType,
      city,
      setCity,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
      selectedTypes,
      setSelectedTypes,
      selectedCityCoords,
      setSelectedCityCoords
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
