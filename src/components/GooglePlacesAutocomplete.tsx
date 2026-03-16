'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
    initGooglePlaces: () => void;
  }
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: {
    address: string;
    city: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Entrez une adresse',
  className = '',
  id = 'google-places-autocomplete',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger le script Google Places API
  useEffect(() => {
    let isMounted = true;
    const handleScriptLoad = () => {
      if (isMounted) setIsScriptLoaded(true);
    };

    // Vérifier si le script est déjà chargé
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      handleScriptLoad();
      return;
    }

    // Vérifier si le script est déjà en cours de chargement
    const existingScript = typeof document !== 'undefined' ? document.querySelector('script[src*="maps.googleapis.com"]') : null;
    if (existingScript) {
      existingScript.addEventListener('load', handleScriptLoad);
      return () => {
        isMounted = false;
        existingScript.removeEventListener('load', handleScriptLoad);
      };
    }

    // Vérifier si la clé API est configurée
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY n\'est pas configurée. L\'autocomplétion Google Places ne fonctionnera pas.');
      return;
    }

    // Charger le script Google Places API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=fr&region=fr`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (isMounted) setIsScriptLoaded(true);
    };

    script.onerror = () => {
      console.error('Erreur lors du chargement de Google Places API. Vérifiez votre clé API.');
    };

    if (typeof document !== 'undefined' && document.head) {
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialiser l'autocomplétion une fois le script chargé
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || isInitialized || typeof window === 'undefined' || !window.google?.maps?.places) return;

    try {
      // Créer l'autocomplétion Google Places
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'fr' }, // Limiter à la France
          fields: ['formatted_address', 'address_components', 'geometry'],
        }
      );

      // Écouter les changements de sélection
      const listener = autocompleteRef.current.addListener('place_changed', () => {
        const ac = autocompleteRef.current;
        if (!ac) return;
        const place = ac.getPlace();
        if (!place?.geometry?.location) {
          console.log('Aucun détail disponible pour cette adresse');
          return;
        }

        // Extraire les composants d'adresse
        let streetNumber = '';
        let route = '';
        let city = '';
        let zipCode = '';
        const components = place.address_components ?? [];
        components.forEach((component: any) => {
          const types = component?.types ?? [];
          if (types.includes('street_number')) streetNumber = component.long_name ?? '';
          else if (types.includes('route')) route = component.long_name ?? '';
          else if (types.includes('locality') || types.includes('postal_town')) city = component.long_name ?? '';
          else if (types.includes('postal_code')) zipCode = component.long_name ?? '';
        });

        const fullAddress = streetNumber && route
          ? `${streetNumber} ${route}`.trim()
          : (place.formatted_address ?? '').split(',')[0]?.trim() ?? '';

        onChange(fullAddress);
        onPlaceSelect({
          address: fullAddress,
          city: city || '',
          zipCode: zipCode || '',
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        });

        setIsInitialized(true);
      });
      listenerRef.current = listener;

      setIsInitialized(true);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Google Places Autocomplete:', error);
    }

    return () => {
      listenerRef.current?.remove?.();
      listenerRef.current = null;
      autocompleteRef.current = null;
    };
  }, [isScriptLoaded, onChange, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
};

export default GooglePlacesAutocomplete;
