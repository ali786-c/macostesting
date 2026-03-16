'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { geocodeAPI, AddressSuggestionDTO } from '@/services/api';
import { epureAddress } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestionDTO) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  onBlur?: () => void;
  // Callbacks pour remplir automatiquement les autres champs
  onCityChange?: (city: string) => void;
  onZipCodeChange?: (zipCode: string) => void;
  onLatLngChange?: (lat: number, lng: number) => void;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Saisissez une adresse...",
  className = "",
  id,
  disabled = false,
  onBlur,
  onCityChange,
  onZipCodeChange,
  onLatLngChange,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const justSelectedRef = useRef(false);

  // Debounce pour éviter trop d'appels API
  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        setIsLoading(false);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await geocodeAPI.autocomplete(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Erreur lors de l\'autocomplétion:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 400); // Debounce de 400ms
  }, []);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (value) {
      debouncedSearch(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, debouncedSearch]);

  const handleSelect = (suggestion: AddressSuggestionDTO) => {
    justSelectedRef.current = true;
    const display = suggestion.houseNumber && suggestion.road
      ? `${suggestion.houseNumber} ${suggestion.road}`
      : epureAddress(suggestion.label);
    onChange(display);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Remplir automatiquement les autres champs si les callbacks sont fournis
    if (onSelect) {
      onSelect(suggestion);
    }
    
    if (suggestion.city && onCityChange) {
      onCityChange(suggestion.city);
    }
    
    if (suggestion.postcode && onZipCodeChange) {
      onZipCodeChange(suggestion.postcode);
    }
    
    if (suggestion.lat && suggestion.lng && onLatLngChange) {
      onLatLngChange(suggestion.lat, suggestion.lng);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Délai pour permettre le clic sur une suggestion
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        if (onBlur) {
          onBlur();
        }
      }
    }, 200);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.label}-${index}`}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                index === selectedIndex ? 'bg-slate-50' : ''
              } ${index === 0 ? 'rounded-t-lg' : ''} ${
                index === suggestions.length - 1 ? 'rounded-b-lg' : ''
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">
                  {suggestion.houseNumber && suggestion.road
                    ? `${suggestion.houseNumber} ${suggestion.road}`
                    : suggestion.label.split(',')[0]}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {suggestion.city && suggestion.postcode
                    ? `${suggestion.postcode} ${suggestion.city}`
                    : suggestion.label}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
