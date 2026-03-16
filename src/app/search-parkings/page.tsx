'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Star, Heart, Car, Box, Warehouse, MapPin, Euro, Shield, Clock, X, CheckCircle, Calendar, Filter, Search, ChevronLeft, ChevronRight, Zap, ChevronDown, SlidersHorizontal, Sparkles, Navigation } from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import AdvancedFilters from '@/components/sections/AdvancedFilters';
import AlertModal from '@/components/ui/alert-modal';
import LoadingLogo from '@/components/ui/loading-logo';
import AnimatedLoadingText from '@/components/ui/animated-loading-text';
import dynamic from 'next/dynamic';
import { rentoallFavoritesAPI, PlaceDTO, placesAPI, locationsAPI, LocationSearchResult, AvailableFilters } from '@/services/api';
import { epureAddress, capitalizeFirstPerLine, getDefaultPlaceImage, getValidPhoto } from '@/lib/utils';
import axios from 'axios';
import type { Property, PropertiesMapMapLibreRef } from '@/components/map/PropertiesMapMapLibre';
import { useSearch } from '@/contexts/SearchContext';
import { registerModalClose, unregisterModalClose } from '@/lib/capacitor-modal-back';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';

// Import dynamique pour éviter le SSR
const PropertiesMap = dynamic(() => import('@/components/map/PropertiesMapMapLibre'), {
  ssr: false,
});
const FeaturedSpacesSection = dynamic(() => import('@/components/sections/featured-spaces-section'), {
  ssr: false,
});

/** Comparaison stricte pour la carte mobile : re-render uniquement si les données carte ou la sélection changent (pas au scroll liste / drawer). */
function searchMapMobilePropsAreEqual(
  prev: { mapProperties: Property[]; mapCenter?: { lat: number; lng: number; zoom?: number }; selectedListingId: number | null; skipGeolocationOnLoad: boolean },
  next: { mapProperties: Property[]; mapCenter?: { lat: number; lng: number; zoom?: number }; selectedListingId: number | null; skipGeolocationOnLoad: boolean }
) {
  if (prev.mapProperties !== next.mapProperties) {
    console.log('[MAP-MEMO] ❌ mapProperties changed → map WILL re-render', { prevLen: prev.mapProperties.length, nextLen: next.mapProperties.length });
    return false;
  }
  if (prev.selectedListingId !== next.selectedListingId) {
    console.log('[MAP-MEMO] ❌ selectedListingId changed', prev.selectedListingId, '→', next.selectedListingId);
    return false;
  }
  if (prev.skipGeolocationOnLoad !== next.skipGeolocationOnLoad) {
    console.log('[MAP-MEMO] ❌ skipGeolocationOnLoad changed', prev.skipGeolocationOnLoad, '→', next.skipGeolocationOnLoad);
    return false;
  }
  if (prev.mapCenter !== next.mapCenter) {
    console.log('[MAP-MEMO] ❌ mapCenter ref changed → map WILL re-render', { prev: prev.mapCenter, next: next.mapCenter });
    return false;
  }
  console.log('[MAP-MEMO] ✅ props equal → map skipped re-render');
  return true;
}

/** Wrapper mémoïsé pour la carte mobile : ne re-rend pas quand seul le drawer (scroll liste) change. Ref transmise pour le bouton "Ma position". */
const SearchMapMobile = React.memo(React.forwardRef<PropertiesMapMapLibreRef, {
  mapProperties: Property[];
  mapCenter: { lat: number; lng: number; zoom?: number } | undefined;
  selectedListingId: number | null;
  skipGeolocationOnLoad: boolean;
  onPropertyClick: (id: number) => void;
  onPropertyHover: (id: number | null) => void;
  onMapMoveEnd?: (center: { lat: number; lng: number }) => void;
}>(function SearchMapMobile(props, ref) {
  const { mapProperties, mapCenter, selectedListingId, skipGeolocationOnLoad, onPropertyClick, onPropertyHover, onMapMoveEnd } = props;
  const renderCount = React.useRef(0);
  React.useEffect(() => {
    renderCount.current += 1;
    console.log(`[MAP-RENDER] SearchMapMobile render #${renderCount.current} | propsCount=${mapProperties.length} | selectedListingId=${selectedListingId} | mapCenter=${mapCenter ? `${mapCenter.lat.toFixed(4)},${mapCenter.lng.toFixed(4)}` : 'undef'}`);
  });
  return (
    <PropertiesMap
      ref={ref}
      key="search-map-mobile"
      properties={mapProperties}
      selectedPropertyId={selectedListingId ?? undefined}
      center={mapCenter}
      skipGeolocationOnLoad={skipGeolocationOnLoad}
      onPropertyClick={onPropertyClick}
      onPropertyHover={onPropertyHover}
      onMapMoveEnd={onMapMoveEnd}
    />
  );
}), searchMapMobilePropsAreEqual);

/**
 * Fonction de géocodage de secours utilisant l'API MapTiler
 * pour obtenir les coordonnées d'une ville quand elles ne sont pas disponibles depuis le backend
 */
async function geocodeCity(cityName: string, postalCode?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || process.env.VITE_MAPTILER_KEY;
    if (!mapTilerKey) {
      console.warn('⚠️ [GEOCODE] Clé MapTiler non configurée, impossible de géocoder');
      return null;
    }

    // Construire la requête de recherche
    const query = postalCode ? `${cityName}, ${postalCode}, France` : `${cityName}, France`;
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${mapTilerKey}&limit=1&country=fr`;
    
    console.log('🗺️ [GEOCODE] ========================================');
    console.log('🗺️ [GEOCODE] Tentative de géocodage pour:', query);
    console.log('🗺️ [GEOCODE] URL:', url);
    
    const response = await axios.get(url);
    
    if (response.data?.features?.length) {
      const feature = response.data.features[0];
      const coords = feature?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const [lng, lat] = coords;
      
      console.log('🗺️ [GEOCODE] ✅ Coordonnées trouvées:', { lat, lng });
      console.log('🗺️ [GEOCODE] ========================================');
      
      return { lat, lng };
    }
    
    console.warn('⚠️ [GEOCODE] Aucun résultat trouvé pour:', query);
    console.log('🗺️ [GEOCODE] ========================================');
    return null;
  } catch (error) {
    console.error('❌ [GEOCODE] Erreur lors du géocodage:', error);
    return null;
  }
}

interface Listing {
  id: number;
  title: string;
  location: string;
  city: string;
  address: string;
  priceDaily?: number;
  priceHourly?: number;
  priceMonthly?: number;
  priceWeekly?: number;
  type: 'parking' | 'storage' | 'cellar';
  image: string;
  rating?: string;
  reviewsCount?: number;
  features?: string[];
  deposit?: number;
  instantBooking?: boolean;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
}

function SearchResults() {
  // Log au montage du composant
  console.log('🚀🚀🚀 COMPOSANT SearchResults MONTÉ 🚀🚀🚀');
  console.log('🚀 [MOUNT] Timestamp:', new Date().toISOString());
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setCity, setStartDate, setEndDate, setSelectedTypes: setHeaderSelectedTypes, city: contextCity, selectedCityCoords: contextCityCoords, setSelectedCityCoords: setContextCityCoords } = useSearch();
  const [isLiked, setIsLiked] = useState<Record<number, boolean>>({});
  const [isToggling, setIsToggling] = useState<Record<number, boolean>>({});
  const [places, setPlaces] = useState<PlaceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const loadMoreSentinelRef = React.useRef<HTMLDivElement>(null);
  const loadMoreSentinelDesktopRef = React.useRef<HTMLDivElement>(null);
  const mobileDrawerScrollRef = React.useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = React.useRef(false);
  const hasMoreRef = React.useRef(hasMore);
  const lastSearchKeyRef = React.useRef<string | null>(null);
  /** Clé de la dernière recherche terminée (promise résolue) — évite le flash "Aucun bien trouvé" avant que le callback ait mis à jour la page */
  const lastCompletedSearchKeyRef = React.useRef<string | null>(null);
  /** Ref vers loadPlaces pour éviter de relancer la recherche quand seule l'identité du callback change (ex: sync URL → state). */
  const loadPlacesRef = React.useRef<(page: number, append: boolean) => Promise<void>>(() => Promise.resolve());

  const PAGE_SIZE = 24;
  const [suggestedPlaces, setSuggestedPlaces] = useState<PlaceDTO[]>([]);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);
  /** Biens populaires affichés quand la recherche ne retourne aucun résultat (neuromarketing) */
  const [popularSuggestionsPlaces, setPopularSuggestionsPlaces] = useState<PlaceDTO[]>([]);
  const [isLoadingPopularSuggestions, setIsLoadingPopularSuggestions] = useState(false);
  const noResultsPopularFetchedRef = React.useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => {
    const typeParam = searchParams.get('type');
    if (!typeParam) return [];
    // ✅ FIX: Convertir le type backend (STORAGE_SPACE, PARKING, CAVE) en format frontend (storage, parking, cellar)
    const typeMap: Record<string, string> = {
      'PARKING': 'parking',
      'STORAGE_SPACE': 'storage',
      'CAVE': 'cellar',
      'BOX': 'storage',
      'WAREHOUSE': 'storage'
    };
    const frontendType = typeMap[typeParam.toUpperCase()] || typeParam.toLowerCase();
    return [frontendType];
  });
  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    return [
      minPriceParam ? parseInt(minPriceParam) : 0,
      maxPriceParam ? parseInt(maxPriceParam) : 500
    ];
  });
  
  // États locaux pour les valeurs d'input (permet de vider les champs pendant la saisie)
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  
  // Ajuster les valeurs max du filtre de prix selon l'unité
  const getMaxPriceForUnit = (unit: 'hour' | 'day' | 'week' | 'month') => {
    switch (unit) {
      case 'hour':
        return 50; // Max 50€/heure
      case 'day':
        return 500; // Max 500€/jour
      case 'week':
        return 2000; // Max 2000€/semaine
      case 'month':
        return 5000; // Max 5000€/mois
      default:
        return 500;
    }
  };
  
  const [instantBooking, setInstantBooking] = useState<boolean | null>(() => {
    const param = searchParams.get('instantBooking');
    return param === 'true' || param === 'Oui' ? true : param === 'false' || param === 'Non' ? false : null;
  });
  const [freeCancellation, setFreeCancellation] = useState<boolean | null>(() => {
    const param = searchParams.get('freeCancellation');
    return param === 'true' || param === 'Oui' ? true : param === 'false' || param === 'Non' ? false : null;
  });
  const [noDeposit, setNoDeposit] = useState<boolean | null>(() => {
    const param = searchParams.get('noDeposit');
    return param === 'true' || param === 'Oui' ? true : param === 'false' || param === 'Non' ? false : null;
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtersResetKey, setFiltersResetKey] = useState(0);
  const [selectedListingId, setSelectedListingId] = useState<number | undefined>();
  const [hoveredListingId, setHoveredListingId] = useState<number | null>(null);
  const [sortBy] = useState<string>(searchParams.get('sort') || 'default');
  const [minRating, setMinRating] = useState<number>(0);
  const [priceUnit, setPriceUnit] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  
  // Garder hasMoreRef à jour pour éviter les boucles de dépendances
  hasMoreRef.current = hasMore;

  // Ajuster le prix max si l'unité change
  useEffect(() => {
    const maxPrice = getMaxPriceForUnit(priceUnit);
    if (priceRange[1] > maxPrice) {
      setPriceRange([priceRange[0], maxPrice]);
    }
  }, [priceUnit, priceRange]);
  
  const typeFilter = searchParams.get('type');
  const cityFilter = searchParams.get('city');
  const titleFilter = searchParams.get('title');
  // Supporter à la fois les anciens noms (startDate/endDate) et les nouveaux (availableFrom/availableTo)
  const startDateParam = searchParams.get('availableFrom') || searchParams.get('startDate');
  const endDateParam = searchParams.get('availableTo') || searchParams.get('endDate');
  // Coordonnées géographiques passées par le header (recommandé par le backend)
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const radiusParam = searchParams.get('radius');

  const [showMobileFiltersPopup, setShowMobileFiltersPopup] = useState(false);
  const [showMobileSearchFilters, setShowMobileSearchFilters] = useState(false);

  // Capacitor Android : fermer les overlays plein écran au bouton retour
  const mobileSearchCloseRef = React.useRef<(() => void) | null>(null);
  const mobileFiltersCloseRef = React.useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!showMobileSearchFilters || typeof window === 'undefined') return;
    const handler = () => setShowMobileSearchFilters(false);
    mobileSearchCloseRef.current = handler;
    registerModalClose(handler);
    return () => {
      if (mobileSearchCloseRef.current) {
        unregisterModalClose(mobileSearchCloseRef.current);
        mobileSearchCloseRef.current = null;
      }
    };
  }, [showMobileSearchFilters]);
  useEffect(() => {
    if (!showMobileFiltersPopup || typeof window === 'undefined') return;
    const handler = () => setShowMobileFiltersPopup(false);
    mobileFiltersCloseRef.current = handler;
    registerModalClose(handler);
    return () => {
      if (mobileFiltersCloseRef.current) {
        unregisterModalClose(mobileFiltersCloseRef.current);
        mobileFiltersCloseRef.current = null;
      }
    };
  }, [showMobileFiltersPopup]);

  // Sur mobile : afficher direct la carte + liste (le formulaire s'ouvre en tapant sur la barre Rechercher)
  const [showMobileCityPicker, setShowMobileCityPicker] = useState(false);
  const [showMobileDatePicker, setShowMobileDatePicker] = useState(false);
  const [showMobileTypePicker, setShowMobileTypePicker] = useState(false);
  // État pour le volet déroulable mobile
  const [drawerPosition, setDrawerPosition] = useState<number>(0.4); // 40% = carte visible, liste en bas
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const lastScrollTopRef = React.useRef(0);
  /** Évite de refermer le drawer juste après l’avoir ouvert au scroll (reflow peut remettre scrollTop à 0). */
  const lastExpandByScrollAtRef = React.useRef(0);
  const hasExpandedByScrollRef = React.useRef(false);
  const searchMapRef = React.useRef<PropertiesMapMapLibreRef>(null);

  // Bouton "Rechercher dans cette zone" après déplacement de la carte (mobile + desktop)
  const [showSearchAreaButton, setShowSearchAreaButton] = useState(false);
  const [pendingMapCenter, setPendingMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Désactiver le pull-to-refresh natif (Safari/iOS WebView) pour éviter reload quand on déroule la liste vers le haut
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overscrollBehaviorY;
    const prevBody = body.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = 'none';
    body.style.overscrollBehaviorY = 'none';
    return () => {
      html.style.overscrollBehaviorY = prevHtml;
      body.style.overscrollBehaviorY = prevBody;
    };
  }, []);

  // Bloquer le pull-to-refresh natif iOS avec un listener passif:false sur le conteneur de la liste.
  // Sans ce listener, iOS WebView intercepte le geste "tirer vers le bas en haut du scroll"
  // comme un pull-to-refresh et recharge toute la page — même avec overscroll-behavior sur html/body.
  React.useEffect(() => {
    const el = mobileDrawerScrollRef.current;
    if (!el) {
      console.log('[PTR-BLOCK] mobileDrawerScrollRef not ready, PTR block NOT attached');
      return;
    }
    console.log('[PTR-BLOCK] PTR block listeners attached on drawer scroll container');
    let startY = 0;
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onMove = (e: TouchEvent) => {
      const dy = (e.touches[0]?.clientY ?? 0) - startY;
      if (el.scrollTop <= 0 && dy > 0) {
        console.log(`[PTR-BLOCK] Blocking PTR | scrollTop=${el.scrollTop} | dy=${dy.toFixed(0)}`);
        e.preventDefault();
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
    };
  }, []);

  // Callbacks stables pour la carte mobile
  const onMapPropertyClick = useCallback((id: number) => {
    const listingId = typeof id === 'number' ? id : parseInt(String(id), 10);
    setSelectedListingId(listingId);
  }, []);
  const onMapPropertyHover = useCallback((id: number | null) => {
    setHoveredListingId(id != null ? (typeof id === 'number' ? id : parseInt(String(id), 10)) : null);
  }, []);

  const [mobileCityInput, setMobileCityInput] = useState(cityFilter || '');
  const [mobileStartDate, setMobileStartDate] = useState<Date | null>(startDateParam ? new Date(startDateParam) : null);
  const [mobileEndDate, setMobileEndDate] = useState<Date | null>(endDateParam ? new Date(endDateParam) : null);
  const [mobileCalendarMonth, setMobileCalendarMonth] = useState(new Date());
  
  // États pour l'auto-complétion des villes/codes postaux (mobile)
  const [citySuggestions, setCitySuggestions] = useState<LocationSearchResult[]>([]);
  const [mobileTitleSearchPlaces, setMobileTitleSearchPlaces] = useState<PlaceDTO[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isSelectingCityRef = React.useRef<boolean>(false); // Flag pour éviter la réouverture après sélection
  
  // États pour l'auto-complétion des villes/codes postaux (desktop)
  const [desktopCityInput, setDesktopCityInput] = useState(cityFilter || '');
  const [desktopCitySuggestions, setDesktopCitySuggestions] = useState<LocationSearchResult[]>([]);
  const [isLoadingDesktopSuggestions, setIsLoadingDesktopSuggestions] = useState(false);
  const [showDesktopCityPicker, setShowDesktopCityPicker] = useState(false);
  const desktopSearchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // État pour la géolocalisation "À proximité"
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showGeoAlert, setShowGeoAlert] = useState(false);
  const [geoAlertMessage, setGeoAlertMessage] = useState('');
  
  // État pour le rayon de recherche (distance)
  const [searchRadius, setSearchRadius] = useState<'none' | 5 | 10 | 20 | 50>(() => {
    const radiusParam = searchParams.get('radius');
    if (!radiusParam) return 'none';
    const radius = parseFloat(radiusParam);
    if (radius === 5 || radius === 10 || radius === 20 || radius === 50) {
      return radius as 5 | 10 | 20 | 50;
    }
    return 'none';
  });
  
  // État pour stocker les coordonnées de la ville sélectionnée (depuis l'API ou le contexte)
  // Priorité au contexte (venant du header), sinon depuis l'URL, sinon depuis les suggestions
  const [selectedCityCoords, setSelectedCityCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Synchroniser avec le contexte (venant du header) - SAUF quand une ville est dans l'URL
  // Quand l'utilisateur sélectionne une ville dans le header : mettre à jour l'URL (city, lat, lng, radius=50) et lancer la recherche sans cliquer sur "Rechercher"
  useEffect(() => {
    if (cityFilter || latParam || lngParam) return;
    if (!contextCityCoords || !contextCity) return;
    console.log('🗺️ [CONTEXT-SYNC] Ville + coords du header:', { city: contextCity, coords: contextCityCoords });
    setSelectedCityCoords(contextCityCoords);
    setSearchRadius(50);
    const params = new URLSearchParams(searchParams.toString());
    params.set('city', contextCity);
    params.set('lat', String(contextCityCoords.lat));
    params.set('lng', String(contextCityCoords.lng));
    params.set('radius', '50');
    router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
    setMobileCityInput(contextCity);
    setDesktopCityInput(contextCity);
  }, [contextCityCoords, contextCity, cityFilter, latParam, lngParam, router, searchParams]);
  
  // État pour les caractéristiques sélectionnées (initialisé depuis l'URL pour que le 1er appel back les envoie)
  const [selectedCharacteristics, setSelectedCharacteristics] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');
    const typeMap: Record<string, string> = {
      'PARKING': 'parking',
      'STORAGE_SPACE': 'storage',
      'CAVE': 'cellar',
      'BOX': 'storage',
      'WAREHOUSE': 'storage',
    };
    const frontendType = typeParam ? (typeMap[typeParam.toUpperCase()] || typeParam.toLowerCase()) : 'parking';
    const reserved = new Set([
      'type', 'city', 'title', 'availableFrom', 'availableTo', 'startDate', 'endDate',
      'lat', 'lng', 'radius', 'minPrice', 'maxPrice', 'sort', 'instantBooking',
      'freeCancellation', 'noDeposit', 'page', 'size', '_rsc',
    ]);
    const charSpecs: string[] = [];
    params.forEach((value, key) => {
      if (!reserved.has(key)) charSpecs.push(`${key}_${value}`);
    });
    if (charSpecs.length === 0) return {};
    return { [frontendType]: charSpecs };
  });
  
  // Clé de recherche actuelle (URL) : pour afficher le chargement dès que l'URL change et éviter le flash "Aucun bien trouvé"
  const currentSearchKey = useMemo(() => JSON.stringify({
    typeFilter,
    cityFilter,
    startDateParam,
    endDateParam,
    priceRange,
    selectedCharacteristics,
    instantBooking,
    freeCancellation,
    noDeposit,
    latParam,
    lngParam,
    radiusParam,
    searchRadius,
    selectedCityCoordsLat: selectedCityCoords?.lat,
    selectedCityCoordsLng: selectedCityCoords?.lng,
  }), [
    typeFilter, cityFilter, startDateParam, endDateParam,
    priceRange, selectedCharacteristics,
    instantBooking, freeCancellation, noDeposit,
    latParam, lngParam, radiusParam, searchRadius,
    selectedCityCoords?.lat, selectedCityCoords?.lng,
  ]);
  // Chargement effectif : en cours OU la recherche pour la clé actuelle n'a pas encore terminé (évite le flash "Aucun bien trouvé")
  const effectiveLoading = isLoading || (currentSearchKey !== lastCompletedSearchKeyRef.current);
  
  // État pour les filtres disponibles depuis le backend
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters | null>(null);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  
  // État pour les caractéristiques dynamiques chargées depuis le backend
  const [dynamicCharacteristics, setDynamicCharacteristics] = useState<Record<string, Array<{ key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[]; required?: boolean }>>>({});
  const [isLoadingCharacteristics, setIsLoadingCharacteristics] = useState<Record<string, boolean>>({});
  const [showTypeSpecs, setShowTypeSpecs] = useState<Record<string, boolean>>({});
  
  // Charger les filtres disponibles depuis le backend
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setIsLoadingFilters(true);
        console.log('🔵 [SEARCH] Chargement des filtres disponibles depuis le backend...');
        const filters = await placesAPI.getAvailableFilters();
        console.log('✅ [SEARCH] Filtres disponibles chargés:', filters);
        setAvailableFilters(filters);
      } catch (error) {
        console.error('❌ [SEARCH] Erreur lors du chargement des filtres:', error);
      } finally {
        setIsLoadingFilters(false);
      }
    };
    
    loadFilters();
  }, []);
  
  // Mapping des caractéristiques en français (aligné sur AdvancedFilters — ne jamais afficher les clés backend)
  const CHARACTERISTIC_MAPPING: Record<string, { label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[] }> = {
    'LENGTH': { label: 'Longueur (m)', type: 'number', placeholder: 'Ex: 5,0' },
    'WIDTH': { label: 'Largeur (m)', type: 'number', placeholder: 'Ex: 2,5' },
    'MAX_HEIGHT': { label: 'Hauteur maximale (m)', type: 'number', placeholder: 'Ex: 2,1' },
    'VOLUME': { label: 'Volume (m³)', type: 'number', placeholder: 'Ex: 15,0' },
    'SURFACE': { label: 'Surface (m²)', type: 'number', placeholder: 'Ex: 6,0' },
    'VEHICLE_TYPE': { label: 'Types de véhicules acceptés', type: 'select', options: ['Moto', 'Voiture', 'Camion', 'Caravane', 'Camping car'] },
    'MIN_HOURS': { label: 'Durée minimale (heures)', type: 'number', placeholder: 'Ex: 1' },
    'MIN_DAYS': { label: 'Durée minimale (jours)', type: 'number', placeholder: 'Ex: 1' },
    'RESERVATION_FREQUENCY_FROM': { label: 'Fréquence réservation - Début', type: 'text', placeholder: 'Ex: 08:00' },
    'RESERVATION_FREQUENCY_TO': { label: 'Fréquence réservation - Fin', type: 'text', placeholder: 'Ex: 18:00' },
    'LEVEL': { label: 'Étage', type: 'select', options: Array.from({ length: 21 }, (_, i) => String(i - 10)) },
    'SPACE_TYPE': { label: 'Type d\'espace', type: 'select', options: ['Ouvert', 'Couvert', 'Garage clos'] },
    'PARKING_TYPE': { label: 'Type de parking', type: 'select', options: ['En épi', 'Bataille', 'Créneau'] },
    'LIGHTING': { label: 'Éclairage', type: 'select', options: ['Oui', 'Non'] },
    'VIDEO_SURVEILLANCE': { label: 'Vidéo surveillance', type: 'select', options: ['Oui', 'Non'] },
    'SECURITY_GUARD': { label: 'Gardien de sécurité', type: 'select', options: ['Oui', 'Non'] },
    'AUTOMATIC_BARRIER': { label: 'Barrière automatique', type: 'select', options: ['Oui', 'Non'] },
    'SECURED_GATE': { label: 'Portail sécurisé', type: 'select', options: ['Oui', 'Non'] },
    'ACCESS_TYPE': { label: 'Type d\'accès', type: 'select', options: ['Accès libre', 'Accueil', 'Boite à clef', 'Code', 'Smartphone', 'Badge', 'Télécommande', 'Clé', 'Digicode'] },
    'ELECTRIC_CHARGING_STATION': { label: 'Station de recharge électrique', type: 'select', options: ['Oui', 'Non'] },
    'ELECTRIC_CHARGING_POWER': { label: 'Puissance de recharge (kW)', type: 'number', placeholder: 'Ex: 22' },
    'STOP_PARKING': { label: 'Arceau', type: 'select', options: ['Oui', 'Non'] },
    'NUMBERED_SPACE': { label: 'Place numérotée', type: 'select', options: ['Oui', 'Non'] },
    'ELECTRIC_PLUG': { label: 'Prise électrique', type: 'select', options: ['Oui', 'Non'] },
    'WATER_POINT': { label: 'Point d\'eau', type: 'select', options: ['Oui', 'Non'] },
    'PMR_ELEVATOR': { label: 'Ascenseur PMR', type: 'select', options: ['Oui', 'Non'] },
    'PMR_EQUIPMENT': { label: 'Équipement PMR', type: 'select', options: ['Oui', 'Non'] },
    'GPL_ALLOWED': { label: 'GPL autorisé', type: 'select', options: ['Oui', 'Non'] },
    'EXCLUSIVITY_24_7': { label: 'Exclusivité 24/7', type: 'select', options: ['Oui', 'Non'] },
    'TIME_RESTRICTIONS': { label: 'Restrictions horaires', type: 'text', placeholder: 'Ex: 22h-06h interdit' },
    'AIRPORT_SHUTTLE': { label: 'Navette aéroport', type: 'select', options: ['Oui', 'Non'] },
    'STATION_SHUTTLE': { label: 'Navette gare', type: 'select', options: ['Oui', 'Non'] },
    'CLEANING': { label: 'Nettoyage', type: 'select', options: ['Oui', 'Non', 'Payant'] },
    'CHILD_SEAT': { label: 'Siège enfant', type: 'select', options: ['Oui', 'Non'] },
    'BUS_STOP_DISTANCE': { label: 'Distance arrêt de bus (m)', type: 'number', placeholder: 'Ex: 100' },
    'TRAIN_STATION_DISTANCE': { label: 'Distance gare (m)', type: 'number', placeholder: 'Ex: 500' },
    'AIRPORT_DISTANCE': { label: 'Distance aéroport (m)', type: 'number', placeholder: 'Ex: 15000' },
    'ELECTRIC_CHARGING_STATION_DISTANCE': { label: 'Distance borne électrique (m)', type: 'number', placeholder: 'Ex: 200' },
    'BEACH_DISTANCE': { label: 'Distance plage (m)', type: 'number', placeholder: 'Ex: 500' },
    'DOOR_TYPE': { label: 'Type de porte', type: 'select', options: ['Basculante', 'Sectionnelle', 'Battante'] },
    'LOCK_TYPE': { label: 'Type de serrure', type: 'select', options: ['Code', 'Cadenas', 'Haute sécurité', 'Clé', 'Badge', 'Biométrique'] },
    'FLOOR_QUALITY': { label: 'Qualité du sol', type: 'select', options: ['Béton', 'Résine', 'Métal', 'Bois'] },
    'INTERIOR_LIGHT': { label: 'Éclairage intérieur', type: 'select', options: ['Oui', 'Non'] },
    'HEATED_DEGREE': { label: 'Degré de chauffage', type: 'text', placeholder: 'Ex: Tempéré, Chauffé, Non chauffé' },
    'AUTHORIZED_USAGE': { label: 'Usage autorisé', type: 'select', options: ['Stockage seul', 'Bricolage', 'Véhicule motorisé', 'Autre'] },
    'FREIGHT_ELEVATOR': { label: 'Monte-charge', type: 'select', options: ['Oui', 'Non'] },
    'HAND_TRUCK': { label: 'Diable', type: 'select', options: ['Oui', 'Non'] },
    'STORAGE_RACK': { label: 'Rack', type: 'select', options: ['Oui', 'Non'] },
    'SHELVES': { label: 'Étagères', type: 'select', options: ['Oui', 'Non'] },
    'TRUCK_ACCESS_DISTANCE': { label: 'Distance accès camion (m)', type: 'number', placeholder: 'Ex: 50' },
    'FLAMMABLE_PROHIBITED': { label: 'Inflammables interdits', type: 'select', options: ['Oui', 'Non'] },
    'GAS_BOTTLE_PROHIBITED': { label: 'Bouteilles de gaz interdites', type: 'select', options: ['Oui', 'Non'] },
    'CHEMICAL_PROHIBITED': { label: 'Produits chimiques interdits', type: 'select', options: ['Oui', 'Non'] },
    'HUMIDITY': { label: 'Humidité', type: 'select', options: ['Sec', 'Sain', 'Risque humidité'] },
    'VENTILATION': { label: 'Ventilation', type: 'select', options: ['VMC', 'Naturelle', 'Mécanique', 'Aucune'] },
    'NUMBERED_ZONE': { label: 'Zone numérotée', type: 'select', options: ['Oui', 'Non'] },
  };
  
  const translateCharacteristicName = (name: string): string => {
    const mapping = CHARACTERISTIC_MAPPING[name];
    if (mapping) {
      return mapping.label;
    }
    const words = name.split('_');
    const translatedWords = words.map(word => {
      const upperWord = word.toUpperCase();
      if (upperWord === 'PMR') return 'PMR';
      if (upperWord === 'GPL') return 'GPL';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    return translatedWords.join(' ');
  };

  /** Libellé français pour un badge de filtre caractéristique (jamais la clé backend brute). */
  const getCharacteristicBadgeLabel = (spec: string): string => {
    const charKey = String(spec).includes('_') ? String(spec).substring(0, String(spec).lastIndexOf('_')) : spec;
    const optionValue = String(spec).includes('_') ? String(spec).substring(String(spec).lastIndexOf('_') + 1) : '';
    const label = CHARACTERISTIC_MAPPING[charKey]?.label ?? translateCharacteristicName(charKey);
    if (optionValue) return `${label} : ${optionValue}`;
    return label;
  };
  
  // Charger les caractéristiques depuis l'API pour chaque type sélectionné
  useEffect(() => {
    const loadCharacteristicsForTypes = async () => {
      const typesToLoad = selectedTypes.filter(type => !dynamicCharacteristics[type] && !isLoadingCharacteristics[type]);
      
      if (typesToLoad.length === 0) return;

      for (const type of typesToLoad) {
        setIsLoadingCharacteristics(prev => ({ ...prev, [type]: true }));
        
        try {
          // Mapper les types frontend vers les types backend
          const apiType = type === 'parking' ? 'PARKING' : type === 'storage' ? 'STORAGE_SPACE' : 'CAVE';
          
          console.log('🔵 [SEARCH] Chargement des caractéristiques pour:', type, '->', apiType);
          
          const characteristicsData = await placesAPI.getCharacteristics(apiType);
          const dataArray = Array.isArray(characteristicsData) ? characteristicsData : [];
          
          const firstItem = dataArray[0];
          const hasFullMetadata = firstItem != null && typeof firstItem === 'object' && 'key' in firstItem && 'label' in firstItem;
          
          let characteristics: Array<{ key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[]; required?: boolean }>;
          
          if (hasFullMetadata) {
            characteristics = dataArray.map((item: string | { key?: string; name?: string; label?: string; type?: string; placeholder?: string; options?: string[]; required?: boolean }) => {
              const obj = typeof item === 'object' && item ? item : {};
              return {
                key: String(obj.key ?? obj.name ?? ''),
                label: String(obj.label ?? ''),
                type: (obj.type === 'number' || obj.type === 'select' ? obj.type : 'text') as 'text' | 'number' | 'select',
                placeholder: obj.placeholder,
                options: obj.options,
                required: Boolean(obj.required)
              };
            });
          } else {
            console.log('⚠️ [SEARCH] Backend retourne seulement les noms, utilisation du mapping local');
            characteristics = dataArray.map((item: string | { key?: string; name?: string }) => {
              const name = typeof item === 'string' ? item : String(item?.key ?? item?.name ?? '');
              const mapping = name ? CHARACTERISTIC_MAPPING[name] : undefined;
              if (mapping) {
                return {
                  key: name,
                  label: mapping.label,
                  type: mapping.type,
                  placeholder: mapping.placeholder,
                  options: mapping.options,
                  required: false
                };
              }
              return {
                key: name,
                label: translateCharacteristicName(name),
                type: 'text' as const,
                required: false
              };
            });
          }
          
          console.log('✅ [SEARCH] Caractéristiques chargées pour', type, ':', characteristics.length);
          
          setDynamicCharacteristics(prev => ({
            ...prev,
            [type]: characteristics
          }));
        } catch (error) {
          console.error(`❌ [SEARCH] Erreur lors du chargement des caractéristiques pour ${type}:`, error);
        } finally {
          setIsLoadingCharacteristics(prev => ({ ...prev, [type]: false }));
        }
      }
    };

    loadCharacteristicsForTypes();
  }, [selectedTypes, dynamicCharacteristics, isLoadingCharacteristics]);
  
  // Log au montage initial
  useEffect(() => {
    console.log('🚀🚀🚀 useEffect MONTAGE INITIAL 🚀🚀🚀');
    console.log('🚀 [MOUNT] Composant monté avec succès');
    console.log('🚀 [MOUNT] mobileCityInput initial:', mobileCityInput);
    console.log('🚀 [MOUNT] ========================================');
  }, []); // Seulement au montage
  
  // Log à chaque render pour debug
  useEffect(() => {
    console.log('🎬 [COMPONENT] ========================================');
    console.log('🎬 [COMPONENT] SearchResults component RENDERED');
    console.log('🎬 [COMPONENT] Timestamp:', new Date().toISOString());
    console.log('🎬 [COMPONENT] mobileCityInput value:', mobileCityInput);
    console.log('🎬 [COMPONENT] ========================================');
  });
  
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  // Générer les équipements depuis le backend
  
  // Fonctions pour le calendrier mobile
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
  
  const navigateMobileMonth = (direction: 'prev' | 'next') => {
    setMobileCalendarMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };
  
  const isDateSelectable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };
  
  const isDateInRange = (date: Date) => {
    if (!mobileStartDate) return false;
    if (mobileStartDate && mobileEndDate) {
      return date >= mobileStartDate && date <= mobileEndDate;
    }
    return date.getTime() === mobileStartDate.getTime();
  };
  
  const handleMobileDateSelect = (date: Date) => {
    if (!mobileStartDate || (mobileStartDate && mobileEndDate)) {
      setMobileStartDate(date);
      setMobileEndDate(null);
    } else if (mobileStartDate && !mobileEndDate) {
      if (date < mobileStartDate) {
        setMobileEndDate(mobileStartDate);
        setMobileStartDate(date);
      } else {
        setMobileEndDate(date);
      }
    }
  };
  
  const formatMobileDateRange = () => {
    if (!mobileStartDate && !mobileEndDate) return 'Dates';
    if (mobileStartDate && !mobileEndDate) {
      return `À partir du ${mobileStartDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }
    if (mobileStartDate && mobileEndDate) {
      return `${mobileStartDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${mobileEndDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }
    return 'Dates';
  };
  
  const formatMobileTypeDisplay = () => {
    if (selectedTypes.length === 0) return 'Type';
    if (selectedTypes.length === 1) {
      const labels: { [key: string]: string } = {
        'parking': 'Parking',
        'storage': 'Box',
        'cellar': 'Cave'
      };
      return labels[selectedTypes[0]] || 'Type';
    }
    return `${selectedTypes.length} types`;
  };

  // Fonction pour formater le titre (première lettre en majuscule)
  const formatTitle = (title: string): string => {
    if (!title) return '';
    return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  };

  // Fonction pour formater la ville (première lettre en majuscule, reste en minuscule)
  const formatCity = (city: string): string => {
    if (!city) return '';
    return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  };

  // Convertir PlaceDTO en Listing pour l'affichage
  const convertPlaceToListing = (place: PlaceDTO | null | undefined): Listing | null => {
    if (!place) return null;
    const typeMap: Record<string, 'parking' | 'storage' | 'cellar'> = {
      'PARKING': 'parking',
      'STORAGE_SPACE': 'storage',
      'CAVE': 'cellar',
      'BOX': 'storage',
      'WAREHOUSE': 'storage'
    };

    const photos = Array.isArray(place.photos) ? place.photos : [];
    const placeType = typeMap[place.type] || 'parking';

    const rawTitle = (place.title && String(place.title).trim()) || place.description?.split?.('.')?.[0] || `${placeType} - ${place.city ?? ''}`;
    const formattedTitle = capitalizeFirstPerLine(rawTitle);
    const formattedCity = formatCity(place.city);

    return {
      id: place.id ?? 0,
      title: formattedTitle,
      location: (() => { const e = epureAddress(place.address ?? ''); return formattedCity && !e.includes(formattedCity) ? `${e}, ${formattedCity}` : e; })(),
      city: formattedCity,
      address: epureAddress(place.address ?? ''),
      // N'afficher que les prix activés par l'utilisateur
      priceDaily: place.dayPriceActive && place.pricePerDay && place.pricePerDay > 0 ? place.pricePerDay : undefined,
      priceHourly: place.hourPriceActive && place.pricePerHour && place.pricePerHour > 0 ? place.pricePerHour : undefined,
      priceWeekly: place.weekPriceActive && place.pricePerWeek && place.pricePerWeek > 0 ? place.pricePerWeek : undefined,
      priceMonthly: place.monthPriceActive && place.pricePerMonth && place.pricePerMonth > 0 ? place.pricePerMonth : undefined,
      type: placeType,
      image: getValidPhoto(photos, placeType),
      rating: '4.5', // TODO: Récupérer depuis les reviews
      reviewsCount: 0, // TODO: Récupérer depuis les reviews
      deposit: (typeof place.deposit === 'number' && place.deposit > 0) ? place.deposit : undefined,
      instantBooking: place.instantBooking !== undefined && place.instantBooking !== null ? Boolean(place.instantBooking) : false,
      features: place.characteristics?.map(c => {
        if (!c) return '';
        if (c.value && c.name) {
          return (typeof c.value === 'string' && c.value.length > 20) ? c.value : `${c.name}: ${c.value}`;
        }
        return String(c.value ?? c.name ?? '');
      }).filter(Boolean) ?? [],
      dimensions: {
        length: (() => {
          const length = place.characteristics?.find(c => c.name === 'LENGTH')?.value;
          return length ? (length.includes('m') ? length : `${length}m`) : '5m';
        })(),
        width: (() => {
          const width = place.characteristics?.find(c => c.name === 'WIDTH')?.value;
          return width ? (width.includes('m') ? width : `${width}m`) : '2.5m';
        })(),
        height: (() => {
          const height = place.characteristics?.find(c => c.name === 'MAX_HEIGHT')?.value;
          return height ? (height.includes('m') ? height : `${height}m`) : '2m';
        })()
      }
    };
  };

  // Charger les places depuis l'API (page: numéro de page 0-based, append: true = ajouter aux résultats existants)
  const loadPlaces = React.useCallback(async (page: number = 0, append: boolean = false) => {
    if (append) {
      if (isLoadingMoreRef.current || !hasMoreRef.current) return;
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
      setPlaces([]);
      setCurrentPage(0);
      setHasMore(true);
    }

    try {
      // Toujours utiliser l'endpoint de recherche si on a au moins un paramètre de recherche
      // (city, type, startDate, endDate, coords du header) - ce qui est le cas quand on vient du header
      const hasSearchParams =
        typeFilter ||
        cityFilter ||
        (desktopCityInput && desktopCityInput.trim().length > 0) ||
        (mobileCityInput && mobileCityInput.trim().length > 0) ||
        selectedCityCoords != null ||
        selectedTypes.length > 0 ||
        titleFilter ||
        startDateParam ||
        endDateParam ||
        latParam ||
        lngParam;
      
      if (hasSearchParams || priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit)) {
        const searchParamsAPI: {
          city?: string;
          type?: 'PARKING' | 'CAVE' | 'STORAGE_SPACE' | 'BOX' | 'WAREHOUSE';
          availableFrom?: string;
          availableTo?: string;
          minPrice?: number;
          maxPrice?: number;
          priceType?: 'HOUR' | 'DAY';
          characteristics?: Record<string, string>;
          lat?: number;
          lng?: number;
          radius?: number; // Rayon de recherche en kilomètres
          instantBooking?: boolean;
          freeCancellation?: boolean;
          deposit?: number;
          [key: string]: string | number | boolean | Record<string, string> | string[] | undefined; // Pour les caractéristiques dynamiques et vehicleTypes
        } = {};
        
        const effectiveCity =
          cityFilter ||
          (contextCity && contextCity.trim().length > 0 ? contextCity.trim() : '') ||
          (desktopCityInput && desktopCityInput.trim().length > 0
            ? desktopCityInput.trim()
            : '') ||
          (mobileCityInput && mobileCityInput.trim().length > 0
            ? mobileCityInput.trim()
            : '');
        if (effectiveCity) {
          searchParamsAPI.city = effectiveCity;
        }

        if (titleFilter) {
          searchParamsAPI.title = titleFilter;
        }
        
        // Type (priorité URL, sinon état selectedTypes)
        if (typeFilter && typeFilter !== 'all') {
          // Convertir le type du front vers le format backend
          const typeMap: Record<string, 'PARKING' | 'CAVE' | 'STORAGE_SPACE' | 'BOX' | 'WAREHOUSE'> = {
            'parking': 'PARKING',
            'storage': 'STORAGE_SPACE',
            'cellar': 'CAVE'
          };
          const backendType = typeMap[typeFilter];
          if (backendType) {
            searchParamsAPI.type = backendType;
          } else {
            // Si le type n'est pas dans le map, essayer de le convertir en uppercase
            const upperType = typeFilter.toUpperCase() as 'PARKING' | 'CAVE' | 'STORAGE_SPACE' | 'BOX' | 'WAREHOUSE';
            if (['PARKING', 'CAVE', 'STORAGE_SPACE', 'BOX', 'WAREHOUSE'].includes(upperType)) {
              searchParamsAPI.type = upperType;
            }
          }
        } else if (selectedTypes.length > 0) {
          const typeMap: Record<string, 'PARKING' | 'CAVE' | 'STORAGE_SPACE'> = {
            parking: 'PARKING',
            storage: 'STORAGE_SPACE',
            cellar: 'CAVE',
          };
          const backendType = typeMap[selectedTypes[0]];
          if (backendType) {
            searchParamsAPI.type = backendType;
          }
        }
        
        if (startDateParam) {
          // Si la date est déjà au format YYYY-MM-DD, l'utiliser directement
          // Sinon, la convertir
          if (startDateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
            searchParamsAPI.availableFrom = startDateParam;
          } else {
            const date = new Date(startDateParam);
            searchParamsAPI.availableFrom = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
          }
        }
        
        if (endDateParam) {
          // Si la date est déjà au format YYYY-MM-DD, l'utiliser directement
          // Sinon, la convertir
          if (endDateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
            searchParamsAPI.availableTo = endDateParam;
          } else {
            const date = new Date(endDateParam);
            searchParamsAPI.availableTo = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
          }
        }
        
        if (priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit)) {
          searchParamsAPI.minPrice = priceRange[0];
          searchParamsAPI.maxPrice = priceRange[1];
          // Backend : priceType=HOUR compare pricePerHour, priceType=DAY compare pricePerDay (plus d'estimation 8h×prix/h)
          searchParamsAPI.priceType = priceUnit === 'hour' ? 'HOUR' : 'DAY';
        }
        
        // Ajouter les filtres booléens (query params directs selon spec backend)
        if (instantBooking === true) {
          searchParamsAPI.instantBooking = true;
        } else if (instantBooking === false) {
          searchParamsAPI.instantBooking = false;
        }
        
        if (freeCancellation === true) {
          searchParamsAPI.freeCancellation = true;
        } else if (freeCancellation === false) {
          searchParamsAPI.freeCancellation = false;
        }
        
        // Pas de caution : paramètre explicite backend deposit=0
        if (noDeposit === true) {
          searchParamsAPI.deposit = 0;
        }
        
        // Types de véhicules acceptés (filtre recherche: param vehicleTypes, énum backend MOTO, VOITURE, ...)
        const VEHICLE_TYPE_DISPLAY_TO_API: Record<string, string> = {
          Moto: 'MOTO',
          Voiture: 'VOITURE',
          Camion: 'CAMION',
          Caravane: 'CARAVANE',
          'Camping car': 'CAMPING_CAR',
        };
        const vehicleTypesFromFilters: string[] = [];
        
        // Ajouter les caractéristiques sélectionnées aux paramètres de recherche
        const characteristics: Record<string, string> = {};
        Object.entries(selectedCharacteristics).forEach(([, specs]) => {
          (Array.isArray(specs) ? specs : []).forEach((spec: string) => {
            // Format stocké: "KEY_OPTION" ou "KEY_VALUE" ou juste "KEY"
            // Exemples: "VEHICLE_TYPE_Moto", "ELECTRIC_CHARGING_STATION_Oui", "VIDEO_SURVEILLANCE"
            if (spec.includes('_')) {
              const lastUnderscoreIndex = spec.lastIndexOf('_');
              const charKey = spec.substring(0, lastUnderscoreIndex);
              const option = spec.substring(lastUnderscoreIndex + 1);
              
              if (charKey === 'VEHICLE_TYPE') {
                const apiVal = VEHICLE_TYPE_DISPLAY_TO_API[option];
                if (apiVal && !vehicleTypesFromFilters.includes(apiVal)) vehicleTypesFromFilters.push(apiVal);
                return;
              }
              
              let finalValue = option;
              if (option === 'Oui' || option === 'Yes' || option === 'true') {
                finalValue = 'Oui';
              } else if (option === 'Non' || option === 'No' || option === 'false') {
                finalValue = 'Non';
              }
              characteristics[charKey] = finalValue;
            } else {
              characteristics[spec] = 'Oui';
            }
          });
        });
        
        if (vehicleTypesFromFilters.length > 0) {
          searchParamsAPI.vehicleTypes = vehicleTypesFromFilters;
        }
        
        if (Object.keys(characteristics).length > 0) {
          searchParamsAPI.characteristics = characteristics;
        }
        
        // PRIORITÉ 1: Recherche par rayon géographique (comme Airbnb) - biens les plus proches
        // Quand une ville est sélectionnée (header ou page), utiliser lat/lng/radius=50 pour afficher les biens dans un rayon de 50km
        const parsedLat = latParam ? parseFloat(latParam) : selectedCityCoords?.lat;
        const parsedLng = lngParam ? parseFloat(lngParam) : selectedCityCoords?.lng;
        const parsedRadius = radiusParam ? parseFloat(radiusParam) : (selectedCityCoords || cityFilter ? 50 : undefined);

        if (!isNaN(parsedLat ?? NaN) && !isNaN(parsedLng ?? NaN)) {
          searchParamsAPI.lat = parsedLat as number;
          searchParamsAPI.lng = parsedLng as number;
          // Rayon 50km par défaut quand une ville est sélectionnée (affiche les biens les plus proches)
          searchParamsAPI.radius = !isNaN(parsedRadius ?? NaN) && parsedRadius !== undefined
            ? (parsedRadius as number)
            : (selectedCityCoords || cityFilter ? 50 : undefined);
          if (searchParamsAPI.radius) {
            console.log('🔵 [SEARCH] Recherche géographique (lat/lng/radius):', {
              lat: searchParamsAPI.lat,
              lng: searchParamsAPI.lng,
              radius: searchParamsAPI.radius,
              source: selectedCityCoords ? 'ville sélectionnée' : 'URL'
            });
          }
        } else if (cityFilter && searchRadius !== 'none') {
          // Fallback: ville + rayon (backend fera le géocodage si supporté)
          searchParamsAPI.radius = searchRadius;
          console.log('🔵 [SEARCH] Recherche par ville avec rayon:', { city: cityFilter, radius: searchRadius });
        } else if (cityFilter && searchRadius === 'none') {
          console.log('🔵 [SEARCH] Recherche textuelle par ville (sans rayon):', cityFilter);
        }

        searchParamsAPI.page = page;
        searchParamsAPI.size = PAGE_SIZE;
        console.log('🔵 [SEARCH] Recherche avec paramètres:', searchParamsAPI);
        const results = (await placesAPI.search(searchParamsAPI)) ?? [];
        console.log('✅ [SEARCH] Résultats API reçus:', results);
        console.log('✅ [SEARCH] Nombre de résultats:', Array.isArray(results) ? results.length : 0);
        // Trier par ID (ordre croissant)
        const sortedResults = [...(Array.isArray(results) ? results : [])].sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
        console.log('✅ [SEARCH] Résultats triés:', sortedResults.length);
        if (append) {
          setPlaces(prev => [...prev, ...sortedResults]);
        } else {
          setPlaces(sortedResults);
        }
        setHasMore(sortedResults.length >= PAGE_SIZE);
        setCurrentPage(page);
      } else {
        // Sinon, utiliser l'endpoint de liste par défaut
        console.log('🔵 [SEARCH] Chargement de tous les biens');
        const results = (await placesAPI.getAll({ page, size: PAGE_SIZE })) ?? [];
        // Trier par ID (ordre croissant)
        const sortedResults = [...(Array.isArray(results) ? results : [])].sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
        if (append) {
          setPlaces(prev => [...prev, ...sortedResults]);
        } else {
          setPlaces(sortedResults);
        }
        setHasMore(sortedResults.length >= PAGE_SIZE);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('❌ [SEARCH] Erreur lors du chargement:', err);
      if (!append) {
        setError('Erreur lors du chargement des biens');
        setPlaces([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [
    typeFilter, cityFilter, titleFilter, startDateParam, endDateParam, priceRange, selectedCharacteristics,
    instantBooking, freeCancellation, noDeposit, latParam, lngParam, radiusParam, searchRadius,
    desktopCityInput, mobileCityInput, selectedTypes,
    selectedCityCoords,
    contextCity,
    priceUnit,
  ]);

  loadPlacesRef.current = loadPlaces;

  // Synchroniser selectedTypes avec l'URL (type=STORAGE_SPACE → Stockage, etc.)
  const typeParamFromUrl = searchParams.get('type');
  useEffect(() => {
    if (!typeParamFromUrl) {
      setSelectedTypes([]);
      return;
    }
    const typeMap: Record<string, string> = {
      'PARKING': 'parking',
      'STORAGE_SPACE': 'storage',
      'CAVE': 'cellar',
      'BOX': 'storage',
      'WAREHOUSE': 'storage',
    };
    const frontendType = typeMap[typeParamFromUrl.toUpperCase()] || typeParamFromUrl.toLowerCase();
    setSelectedTypes((prev) => {
      if (prev.length === 1 && prev[0] === frontendType) return prev;
      return [frontendType];
    });
  }, [typeParamFromUrl]);

  // Synchroniser les caractéristiques depuis l'URL quand l'URL change (ex: VIDEO_SURVEILLANCE=true)
  const RESERVED_SEARCH_PARAMS = new Set([
    'type', 'city', 'title', 'availableFrom', 'availableTo', 'startDate', 'endDate',
    'lat', 'lng', 'radius', 'minPrice', 'maxPrice', 'sort', 'instantBooking',
    'freeCancellation', 'noDeposit', 'page', 'size', '_rsc',
  ]);
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const typeMap: Record<string, string> = {
      'PARKING': 'parking',
      'STORAGE_SPACE': 'storage',
      'CAVE': 'cellar',
      'BOX': 'storage',
      'WAREHOUSE': 'storage',
    };
    const frontendType = typeParam ? (typeMap[typeParam.toUpperCase()] || typeParam.toLowerCase()) : null;
    if (!frontendType) {
      setSelectedCharacteristics((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    const charSpecs: string[] = [];
    searchParams.forEach((value, key) => {
      if (!RESERVED_SEARCH_PARAMS.has(key)) charSpecs.push(`${key}_${value}`);
    });
    charSpecs.sort();
    setSelectedCharacteristics((prev) => {
      const prevSpecs = (prev[frontendType] && Array.isArray(prev[frontendType]) ? prev[frontendType] : []).slice().sort();
      const sameContent = prevSpecs.length === charSpecs.length && prevSpecs.every((s, i) => s === charSpecs[i]);
      const prevKeys = Object.keys(prev);
      const onlyThisType = prevKeys.length === 1 && prevKeys[0] === frontendType;
      if (sameContent && onlyThisType) return prev;
      return { [frontendType]: charSpecs };
    });
  }, [searchParams]);
  
  // Synchroniser les dates mobiles avec l'URL
  useEffect(() => {
    if (startDateParam) {
      setMobileStartDate(new Date(startDateParam));
    } else {
      setMobileStartDate(null);
    }
    if (endDateParam) {
      setMobileEndDate(new Date(endDateParam));
    } else {
      setMobileEndDate(null);
    }
  }, [startDateParam, endDateParam]);
  
  // Synchroniser la ville mobile avec l'URL (seulement si différent pour éviter les boucles)
  useEffect(() => {
    const currentValue = mobileCityInput || '';
    const filterValue = cityFilter || '';
    
    console.log('🔄 [SYNC] ========================================');
    console.log('🔄 [SYNC] 🔄 useEffect SYNC DÉCLENCHÉ 🔄');
    console.log('🔄 [SYNC] currentValue (mobileCityInput):', currentValue);
    console.log('🔄 [SYNC] filterValue (cityFilter):', filterValue);
    console.log('🔄 [SYNC] Sont-ils différents?', currentValue !== filterValue);
    
    // Ne mettre à jour que si les valeurs sont différentes pour éviter les boucles infinies
    if (currentValue !== filterValue) {
      console.log('🔄 [SYNC] ✅ Synchronisation nécessaire - setMobileCityInput appelé');
      console.log('🔄 [SYNC] Synchronisation mobileCityInput avec cityFilter:', {
        currentValue,
        filterValue,
        willUpdate: true
      });
      setMobileCityInput(filterValue);
    } else {
      console.log('🔄 [SYNC] ⏭️ Pas de synchronisation nécessaire (valeurs identiques):', {
        currentValue,
        filterValue
      });
    }
    console.log('🔄 [SYNC] ========================================');
  }, [cityFilter]); // Ne pas inclure mobileCityInput dans les dépendances pour éviter les boucles

  // Synchroniser la ville desktop avec l'URL (seulement si différent pour éviter les boucles)
  useEffect(() => {
    const currentValue = desktopCityInput || '';
    const filterValue = cityFilter || '';
    
    if (currentValue !== filterValue) {
      console.log('🔄 [DESKTOP SYNC] Synchronisation nécessaire - setDesktopCityInput appelé');
      setDesktopCityInput(filterValue);
    }
  }, [cityFilter]); // Ne pas inclure desktopCityInput dans les dépendances pour éviter les boucles

  // Recherche de villes/codes postaux - Système simplifié et fonctionnel
  useEffect(() => {
    console.log('🔍 [SEARCH] ========================================');
    console.log('🔍 [SEARCH] ⚡⚡⚡ useEffect DÉCLENCHÉ ⚡⚡⚡');
    console.log('🔍 [SEARCH] mobileCityInput:', mobileCityInput);
    console.log('🔍 [SEARCH] Type:', typeof mobileCityInput);
    console.log('🔍 [SEARCH] Longueur:', mobileCityInput?.length || 0);
    console.log('🔍 [SEARCH] Timestamp:', new Date().toISOString());
    console.log('🔍 [SEARCH] isSelectingCityRef:', isSelectingCityRef.current);
    
    // Si on vient de sélectionner une ville, ne pas rouvrir le dropdown
    if (isSelectingCityRef.current) {
      console.log('🔍 [SEARCH] ⏭️ Sélection en cours - Ignorer le useEffect');
      isSelectingCityRef.current = false; // Réinitialiser le flag
      console.log('🔍 [SEARCH] ========================================');
      return;
    }
    
    // Nettoyer le timeout précédent
    if (searchTimeoutRef.current) {
      console.log('🔍 [SEARCH] 🧹 Nettoyage du timeout précédent');
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Si le champ est vide, vider les suggestions
    if (!mobileCityInput || mobileCityInput.trim().length === 0) {
      console.log('🔍 [SEARCH] ⚠️ Champ vide - Arrêt de la recherche');
      setCitySuggestions([]);
      setMobileTitleSearchPlaces([]);
      setIsLoadingSuggestions(false);
      setShowMobileCityPicker(false);
      console.log('🔍 [SEARCH] ========================================');
      return;
    }

    const inputValue = mobileCityInput.trim();
    
    // Si vide après trim, arrêter
    if (inputValue.length === 0) {
      console.log('🔍 [SEARCH] ⚠️ Champ vide après trim - Arrêt de la recherche');
      setCitySuggestions([]);
      setIsLoadingSuggestions(false);
      setShowMobileCityPicker(false);
      console.log('🔍 [SEARCH] ========================================');
      return;
    }

    // Détecter si c'est un code postal (que des chiffres, 5 caractères exactement)
    const isOnlyDigits = /^\d+$/.test(inputValue);
    const isPostalCode = isOnlyDigits && inputValue.length === 5;

    console.log('🔍 [SEARCH] Détection:', {
      value: inputValue,
      length: inputValue.length,
      isOnlyDigits,
      isPostalCode
    });

    // Pour les codes postaux de 5 chiffres, déclencher l'appel rapidement (100ms)
    // Pour les recherches de villes, garder un debounce de 300ms
    const debounceDelay = isPostalCode ? 100 : 300;

    console.log('🔍 [SEARCH] Configuration de la recherche:');
    console.log('🔍 [SEARCH] - Délai de debounce:', debounceDelay, 'ms');
    console.log('🔍 [SEARCH] - Type de recherche:', isPostalCode ? 'Code postal' : 'Ville');

    setIsLoadingSuggestions(true);
    setShowMobileCityPicker(true);

    // Fonction pour effectuer la recherche
    const performSearch = async () => {
      console.log('🔵 [SEARCH] ========================================');
      console.log('🔵 [SEARCH] ⚡⚡⚡ RECHERCHE DÉCLENCHÉE ⚡⚡⚡');
      console.log('🔵 [SEARCH] Valeur recherchée:', inputValue);
      console.log('🔵 [SEARCH] Type:', isPostalCode ? '(code postal)' : '(ville)');
      console.log('🔵 [SEARCH] Timestamp:', new Date().toISOString());
      
      try {
        let results: LocationSearchResult[] = [];
        
        if (isPostalCode) {
          // Recherche par code postal
          console.log('🔵 [SEARCH] 📮📮📮 APPEL API CODE POSTAL 📮📮📮');
          console.log('🔵 [SEARCH] Code postal:', inputValue);
          console.log('🔵 [SEARCH] Appel de locationsAPI.searchByPostalCode...');
          results = await locationsAPI.searchByPostalCode(inputValue);
          console.log('✅ [SEARCH] ✅✅✅ RÉPONSE REÇUE ✅✅✅');
          console.log('✅ [SEARCH] Nombre de résultats code postal:', results.length);
          console.log('✅ [SEARCH] Résultats:', results);
        } else {
          // Recherche par nom de ville
          console.log('🔵 [SEARCH] 🏙️🏙️🏙️ APPEL API VILLE 🏙️🏙️🏙️');
          console.log('🔵 [SEARCH] Nom de ville:', inputValue);
          console.log('🔵 [SEARCH] Appel de locationsAPI.searchCities...');
          results = await locationsAPI.searchCities(inputValue);
          console.log('✅ [SEARCH] ✅✅✅ RÉPONSE REÇUE ✅✅✅');
          console.log('✅ [SEARCH] Nombre de résultats ville:', results.length);
          console.log('✅ [SEARCH] Résultats:', results);
        }

        console.log('🔵 [SEARCH] Mise à jour citySuggestions avec', results.length, 'résultats');
        setCitySuggestions(results);
        // Si aucune ville trouvée : fallback sur la recherche par titre (comme la version web)
        if (results.length === 0 && inputValue.length >= 2) {
          try {
            const places = await placesAPI.search({ title: inputValue, size: 20 });
            setMobileTitleSearchPlaces(Array.isArray(places) ? places : []);
          } catch {
            setMobileTitleSearchPlaces([]);
          }
        } else {
          setMobileTitleSearchPlaces([]);
        }
        console.log('🔵 [SEARCH] ========================================');
      } catch (error) {
        console.error('❌ [SEARCH] ========================================');
        console.error('❌ [SEARCH] ❌❌❌ ERREUR LORS DE LA RECHERCHE ❌❌❌');
        console.error('❌ [SEARCH] Erreur:', error);
        if (error instanceof Error) {
          console.error('❌ [SEARCH] Message:', error.message);
          console.error('❌ [SEARCH] Stack:', error.stack);
        }
        console.error('❌ [SEARCH] ========================================');
        setCitySuggestions([]);
        setMobileTitleSearchPlaces([]);
      } finally {
        setIsLoadingSuggestions(false);
        console.log('🔵 [SEARCH] isLoadingSuggestions mis à false');
      }
    };

    // Déclencher la recherche avec le debounce approprié
    console.log('⏱️ [SEARCH] Programmation setTimeout avec délai', debounceDelay, 'ms');
    console.log('⏱️ [SEARCH] Le timeout sera déclenché dans', debounceDelay, 'ms');
    searchTimeoutRef.current = setTimeout(() => {
      console.log('⏱️ [SEARCH] ⏰⏰⏰ TIMEOUT DÉCLENCHÉ ⏰⏰⏰');
      console.log('⏱️ [SEARCH] Appel de performSearch maintenant...');
      performSearch();
    }, debounceDelay);
    console.log('⏱️ [SEARCH] Timeout ID:', searchTimeoutRef.current);

    // Cleanup
    return () => {
      console.log('🧹 [SEARCH] Cleanup du useEffect - Annulation du timeout');
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
        console.log('🧹 [SEARCH] Timeout annulé');
      }
      console.log('🔍 [SEARCH] ========================================');
    };
  }, [mobileCityInput]);

  // Recherche de villes/codes postaux pour DESKTOP - Système simplifié et fonctionnel
  useEffect(() => {
    console.log('🖥️ [DESKTOP SEARCH] ========================================');
    console.log('🖥️ [DESKTOP SEARCH] ⚡⚡⚡ useEffect DESKTOP DÉCLENCHÉ ⚡⚡⚡');
    console.log('🖥️ [DESKTOP SEARCH] desktopCityInput:', desktopCityInput);
    
    // Nettoyer le timeout précédent
    if (desktopSearchTimeoutRef.current) {
      console.log('🖥️ [DESKTOP SEARCH] 🧹 Nettoyage du timeout précédent');
      clearTimeout(desktopSearchTimeoutRef.current);
      desktopSearchTimeoutRef.current = null;
    }

    // Si le champ est vide, vider les suggestions
    if (!desktopCityInput || desktopCityInput.trim().length === 0) {
      console.log('🖥️ [DESKTOP SEARCH] ⚠️ Champ vide - Arrêt de la recherche');
      setDesktopCitySuggestions([]);
      setIsLoadingDesktopSuggestions(false);
      setShowDesktopCityPicker(false);
      console.log('🖥️ [DESKTOP SEARCH] ========================================');
      return;
    }

    const inputValue = desktopCityInput.trim();
    
    if (inputValue.length === 0) {
      console.log('🖥️ [DESKTOP SEARCH] ⚠️ Champ vide après trim - Arrêt de la recherche');
      setDesktopCitySuggestions([]);
      setIsLoadingDesktopSuggestions(false);
      setShowDesktopCityPicker(false);
      console.log('🖥️ [DESKTOP SEARCH] ========================================');
      return;
    }

    // Détecter si c'est un code postal (que des chiffres, 5 caractères exactement)
    const isOnlyDigits = /^\d+$/.test(inputValue);
    const isPostalCode = isOnlyDigits && inputValue.length === 5;

    console.log('🖥️ [DESKTOP SEARCH] Détection:', {
      value: inputValue,
      length: inputValue.length,
      isOnlyDigits,
      isPostalCode
    });

    const debounceDelay = isPostalCode ? 100 : 300;

    console.log('🖥️ [DESKTOP SEARCH] Configuration de la recherche:');
    console.log('🖥️ [DESKTOP SEARCH] - Délai de debounce:', debounceDelay, 'ms');
    console.log('🖥️ [DESKTOP SEARCH] - Type de recherche:', isPostalCode ? 'Code postal' : 'Ville');

    setIsLoadingDesktopSuggestions(true);
    setShowDesktopCityPicker(true);

    // Fonction pour effectuer la recherche
    const performDesktopSearch = async () => {
      console.log('🖥️ [DESKTOP SEARCH] ========================================');
      console.log('🖥️ [DESKTOP SEARCH] ⚡⚡⚡ RECHERCHE DESKTOP DÉCLENCHÉE ⚡⚡⚡');
      console.log('🖥️ [DESKTOP SEARCH] Valeur recherchée:', inputValue);
      console.log('🖥️ [DESKTOP SEARCH] Type:', isPostalCode ? '(code postal)' : '(ville)');
      
      try {
        let results: LocationSearchResult[] = [];
        
        if (isPostalCode) {
          // Recherche par code postal
          console.log('🖥️ [DESKTOP SEARCH] 📮 Appel API code postal:', inputValue);
          results = await locationsAPI.searchByPostalCode(inputValue);
          console.log('🖥️ [DESKTOP SEARCH] ✅ Résultats code postal:', results.length);
        } else {
          // Recherche par nom de ville
          console.log('🖥️ [DESKTOP SEARCH] 🏙️ Appel API ville:', inputValue);
          results = await locationsAPI.searchCities(inputValue);
          console.log('🖥️ [DESKTOP SEARCH] ✅ Résultats ville:', results.length);
        }

        console.log('🖥️ [DESKTOP SEARCH] Mise à jour desktopCitySuggestions avec', results.length, 'résultats');
        setDesktopCitySuggestions(results);
        console.log('🖥️ [DESKTOP SEARCH] ========================================');
      } catch (error) {
        console.error('🖥️ [DESKTOP SEARCH] ❌ Erreur:', error);
        setDesktopCitySuggestions([]);
      } finally {
        setIsLoadingDesktopSuggestions(false);
        console.log('🖥️ [DESKTOP SEARCH] isLoadingDesktopSuggestions mis à false');
      }
    };

    // Déclencher la recherche avec le debounce approprié
    console.log('🖥️ [DESKTOP SEARCH] Programmation setTimeout avec délai', debounceDelay, 'ms');
    desktopSearchTimeoutRef.current = setTimeout(() => {
      console.log('🖥️ [DESKTOP SEARCH] ⏰ TIMEOUT DÉCLENCHÉ - Appel performDesktopSearch');
      performDesktopSearch();
    }, debounceDelay);

    // Cleanup
    return () => {
      console.log('🖥️ [DESKTOP SEARCH] Cleanup du useEffect - Annulation du timeout');
      if (desktopSearchTimeoutRef.current) {
        clearTimeout(desktopSearchTimeoutRef.current);
        desktopSearchTimeoutRef.current = null;
      }
      console.log('🖥️ [DESKTOP SEARCH] ========================================');
    };
  }, [desktopCityInput]);

  // Log quand les suggestions changent pour vérifier l'affichage du dropdown
  useEffect(() => {
    console.log('📱 [DROPDOWN] ========================================');
    console.log('📱 [DROPDOWN] 📱📱📱 ÉTAT DU DROPDOWN 📱📱📱');
    console.log('📱 [DROPDOWN] showMobileCityPicker:', showMobileCityPicker);
    console.log('📱 [DROPDOWN] mobileCityInput:', mobileCityInput);
    console.log('📱 [DROPDOWN] mobileCityInput.trim().length:', mobileCityInput?.trim().length || 0);
    console.log('📱 [DROPDOWN] isLoadingSuggestions:', isLoadingSuggestions);
    console.log('📱 [DROPDOWN] citySuggestions.length:', citySuggestions.length);
    console.log('📱 [DROPDOWN] Condition d\'affichage:', showMobileCityPicker && mobileCityInput && mobileCityInput.trim().length > 0);
    if (showMobileCityPicker && mobileCityInput && mobileCityInput.trim().length > 0) {
      if (isLoadingSuggestions) {
        console.log('📱 [DROPDOWN] 🔄 Dropdown affiché: Chargement en cours...');
      } else if (citySuggestions.length > 0) {
        console.log('📱 [DROPDOWN] ✅ Dropdown affiché: ' + citySuggestions.length + ' résultat(s) disponible(s)');
      } else {
        console.log('📱 [DROPDOWN] ⚠️ Dropdown affiché: Aucun résultat');
      }
    } else {
      console.log('📱 [DROPDOWN] ❌ Dropdown masqué');
    }
    console.log('📱 [DROPDOWN] ========================================');
  }, [showMobileCityPicker, mobileCityInput, isLoadingSuggestions, citySuggestions]);
  
  // Fermer les popups au clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event?.target as HTMLElement | null;
      if (!target) return;
      // Ne pas fermer si on clique sur un élément de l'autocomplétion des villes (mobile)
      if (target.closest('[data-city-autocomplete]')) {
        return;
      }
      // Ne pas fermer si on clique sur un élément de l'autocomplétion des villes (desktop)
      if (target.closest('[data-desktop-city-autocomplete]')) {
        return;
      }
      // Ne pas fermer le calendrier si on clique sur une date (sélection début puis fin)
      if (target.closest('[data-mobile-date-picker]')) {
        return;
      }
      // Ne pas fermer le type picker si on clique sur une option (Parking, Box, Cave)
      if (target.closest('[data-mobile-type-picker]')) {
        return;
      }
      if (!target.closest('.mobile-popup-container')) {
        setShowMobileCityPicker(false);
        setShowMobileDatePicker(false);
        setShowMobileTypePicker(false);
        setShowMobileFiltersPopup(false);
      }
      // Fermer le dropdown desktop si on clique en dehors
      if (!target.closest('[data-desktop-city-autocomplete]') && !target.closest('.relative.flex-shrink-0.z-50')) {
        setShowDesktopCityPicker(false);
      }
    };
    
    if (showMobileCityPicker || showMobileDatePicker || showMobileTypePicker || showMobileFiltersPopup || showDesktopCityPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      // Bloquer le scroll du body seulement pour les modals mobile
      if (showMobileCityPicker || showMobileDatePicker || showMobileTypePicker || showMobileFiltersPopup) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        // Réactiver le scroll seulement si aucune modal mobile n'est ouverte
        if (!showMobileCityPicker && !showMobileDatePicker && !showMobileTypePicker && !showMobileFiltersPopup) {
          document.body.style.overflow = '';
        }
      };
    } else {
      // Réactiver le scroll si aucune modal n'est ouverte
      document.body.style.overflow = '';
    }
  }, [showMobileCityPicker, showMobileDatePicker, showMobileTypePicker, showMobileFiltersPopup, showDesktopCityPicker]);

  // Synchroniser noDeposit, instantBooking, freeCancellation avec les paramètres URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let hasChanges = false;
    
    const currentNoDeposit = searchParams.get('noDeposit') === 'true' || searchParams.get('noDeposit') === 'Oui';
    if (noDeposit === true && !currentNoDeposit) {
      params.set('noDeposit', 'true');
      hasChanges = true;
    } else if (noDeposit !== true && currentNoDeposit) {
      params.delete('noDeposit');
      hasChanges = true;
    }
    
    const currentInstantBooking = searchParams.get('instantBooking') === 'true' || searchParams.get('instantBooking') === 'Oui';
    if (instantBooking === true && !currentInstantBooking) {
      params.set('instantBooking', 'true');
      hasChanges = true;
    } else if (instantBooking !== true && currentInstantBooking) {
      params.delete('instantBooking');
      hasChanges = true;
    }
    
    const currentFreeCancellation = searchParams.get('freeCancellation') === 'true' || searchParams.get('freeCancellation') === 'Oui';
    if (freeCancellation === true && !currentFreeCancellation) {
      params.set('freeCancellation', 'true');
      hasChanges = true;
    } else if (freeCancellation !== true && currentFreeCancellation) {
      params.delete('freeCancellation');
      hasChanges = true;
    }
    
    // Mettre à jour l'URL seulement si quelque chose a changé
    if (hasChanges) {
      router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
    }
  }, [noDeposit, instantBooking, freeCancellation, router, searchParams]);

  // Synchroniser searchRadius avec l'URL
  useEffect(() => {
    const radiusParam = searchParams.get('radius');
    if (radiusParam) {
      const radius = parseFloat(radiusParam);
      if (radius === 5 || radius === 10 || radius === 20 || radius === 50) {
        if (searchRadius !== radius) {
          setSearchRadius(radius as 5 | 10 | 20 | 50);
        }
      }
    } else if (searchRadius !== 'none') {
      setSearchRadius('none');
    }
  }, [searchParams, searchRadius]);

  // Fonction pour appliquer les filtres et mettre à jour l'URL
  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    
    // Ville
    if (cityFilter) {
      params.set('city', cityFilter);
    }
    
    // Type (convertir vers le format backend)
    if (selectedTypes.length > 0) {
      const typeMap: Record<string, string> = {
        'parking': 'PARKING',
        'storage': 'STORAGE_SPACE',
        'cellar': 'CAVE'
      };
      const backendType = typeMap[selectedTypes[0]] || selectedTypes[0].toUpperCase();
      params.set('type', backendType);
    }
    
    // Dates
    if (startDateParam) {
      params.set('availableFrom', startDateParam);
    }
    if (endDateParam) {
      params.set('availableTo', endDateParam);
    }
    
    // Coordonnées géographiques
    if (latParam) params.set('lat', latParam);
    if (lngParam) params.set('lng', lngParam);
    if (radiusParam) params.set('radius', radiusParam);
    
    // Prix min / max (tous les infos des filtres avancés vers l'URL et le back)
    if (priceRange[0] > 0) {
      params.set('minPrice', priceRange[0].toString());
    }
    if (priceRange[1] < getMaxPriceForUnit(priceUnit)) {
      params.set('maxPrice', priceRange[1].toString());
    }
    
    // Filtres booléens
    if (instantBooking === true) {
      params.set('instantBooking', 'true');
    } else if (instantBooking === false) {
      params.set('instantBooking', 'false');
    }
    
    if (freeCancellation === true) {
      params.set('freeCancellation', 'true');
    } else if (freeCancellation === false) {
      params.set('freeCancellation', 'false');
    }
    
    if (noDeposit === true) {
      params.set('noDeposit', 'true');
    }
    
    // Rayon de recherche
    if (searchRadius !== 'none') {
      params.set('radius', searchRadius.toString());
    }
    
    // Caractéristiques (les ajouter comme query params directs)
    Object.entries(selectedCharacteristics).forEach(([, specs]) => {
      (Array.isArray(specs) ? specs : []).forEach((spec: string) => {
        if (spec.includes('_')) {
          const lastUnderscoreIndex = spec.lastIndexOf('_');
          const charKey = spec.substring(0, lastUnderscoreIndex);
          const option = spec.substring(lastUnderscoreIndex + 1);
          
          // Gérer les cas spéciaux pour les booléens (Oui/Non → true/false)
          let finalValue = option;
          if (option === 'Oui' || option === 'Yes' || option === 'true') {
            finalValue = 'true';
          } else if (option === 'Non' || option === 'No' || option === 'false') {
            finalValue = 'false';
          }
          
          params.set(charKey, finalValue);
        } else {
          params.set(spec, 'true');
        }
      });
    });
    
    // ✅ OPTIMISATION: Utiliser replace avec scroll: false pour éviter le rechargement complet de la page
    router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
    
    // Fermer le modal
    setShowAdvancedFilters(false);

    // UX: le clic sur "Afficher les espaces" doit déclencher une requête
    // (même si l'URL ne change pas ou si le modal masque les résultats).
    loadPlaces(0, false);
  };

  /** Retirer un type et toutes les caractéristiques attachées à ce type (badge ou panneau). */
  const removeTypeAndItsCharacteristics = useCallback((typeToRemove: string) => {
    const newTypes = selectedTypes.filter(t => t !== typeToRemove);
    setSelectedTypes(newTypes);
    const newCharacteristics = { ...selectedCharacteristics };
    delete newCharacteristics[typeToRemove];
    setSelectedCharacteristics(newCharacteristics);
    const params = new URLSearchParams(searchParams.toString());
    if (newTypes.length === 0) {
      params.delete('type');
    } else {
      const typeMap: Record<string, string> = { parking: 'PARKING', storage: 'STORAGE_SPACE', cellar: 'CAVE' };
      params.set('type', typeMap[newTypes[0]] || newTypes[0].toUpperCase());
    }
    (selectedCharacteristics[typeToRemove] || []).forEach((spec: string) => {
      const charKey = String(spec).includes('_') ? String(spec).substring(0, String(spec).lastIndexOf('_')) : spec;
      params.delete(charKey);
    });
    router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
  }, [selectedTypes, selectedCharacteristics, searchParams, router]);

  // Fonction pour réinitialiser tous les filtres
  const handleResetAllFilters = () => {
    setSelectedTypes([]);
    setPriceRange([0, getMaxPriceForUnit(priceUnit)]);
    setInstantBooking(null);
    setFreeCancellation(null);
    setNoDeposit(null);
    setSearchRadius('none');
    setSelectedCharacteristics({});
    setDesktopCityInput('');
    setMobileCityInput('');
    setMobileStartDate(null);
    setMobileEndDate(null);
    setSelectedCityCoords(null);
    
    // Réinitialiser les valeurs d'input de prix
    setMinPriceInput('');
    setMaxPriceInput('');
    
    // Forcer la popup Filtres avancés à tout décocher (état interne)
    setFiltersResetKey(k => k + 1);
    
    // Réinitialiser le contexte de recherche (header : ville, dates, type)
    setCity?.('');
    setStartDate(null);
    setEndDate(null);
    setHeaderSelectedTypes([]);
    setContextCityCoords?.(null);
    
    // Notifier le header de réinitialiser son type (dropdown Type)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('searchFiltersReset'));
    }
    
    // Réinitialiser l'URL en supprimant tous les paramètres
    router.replace('/search-parkings', { scroll: false });
  };

  // Charger les places au montage et quand les filtres changent — pas de call tant que la fenêtre de filtres est ouverte
  useEffect(() => {
    if (showAdvancedFilters || showMobileFiltersPopup) return;
    const searchKey = JSON.stringify({
      typeFilter,
      cityFilter,
      startDateParam,
      endDateParam,
      priceRange,
      selectedCharacteristics,
      instantBooking,
      freeCancellation,
      noDeposit,
      latParam,
      lngParam,
      radiusParam,
      searchRadius,
      // Relancer la recherche quand les coordonnées de la ville arrivent (géocodage async)
      selectedCityCoordsLat: selectedCityCoords?.lat,
      selectedCityCoordsLng: selectedCityCoords?.lng,
    });
    if (lastSearchKeyRef.current === searchKey) return;
    lastSearchKeyRef.current = searchKey;
    noResultsPopularFetchedRef.current = false; // permettre de recharger les espaces populaires si cette recherche retourne 0 résultat
    // Mettre immédiatement en état de chargement pour éviter le flash "Aucun bien trouvé"
    setIsLoading(true);
    setError(null);
    setPlaces([]);
    loadPlacesRef.current(0, false).finally(() => {
      // Ne marquer comme terminée que si c'est encore la recherche en cours (évite de rester en chargement quand une ancienne recherche finit après une plus récente)
      if (lastSearchKeyRef.current === searchKey) {
        lastCompletedSearchKeyRef.current = searchKey;
      }
    });
  }, [
    typeFilter, cityFilter, startDateParam, endDateParam,
    priceRange, selectedCharacteristics,
    instantBooking, freeCancellation, noDeposit,
    latParam, lngParam, radiusParam, searchRadius,
    selectedCityCoords?.lat, selectedCityCoords?.lng,
    showAdvancedFilters,
    showMobileFiltersPopup,
  ]);

  // Quand la recherche ne retourne aucun résultat : charger des espaces populaires pour inspirer l'utilisateur (neuromarketing)
  useEffect(() => {
    if (places.length > 0) {
      setPopularSuggestionsPlaces([]);
      noResultsPopularFetchedRef.current = false;
      return;
    }
    if (isLoading || noResultsPopularFetchedRef.current) return;
    noResultsPopularFetchedRef.current = true;
    let cancelled = false;
    setIsLoadingPopularSuggestions(true);
    placesAPI.search({ size: 12 })
      .then((result) => {
        if (cancelled || !Array.isArray(result)) return;
        setPopularSuggestionsPlaces(result.slice(0, 12));
      })
      .catch(() => {
        if (!cancelled) setPopularSuggestionsPlaces([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPopularSuggestions(false);
      });
    return () => { cancelled = true; };
  }, [isLoading, places.length]);

  // IntersectionObserver pour infinite scroll (mobile + desktop)
  useEffect(() => {
    const callback = (entries: IntersectionObserverEntry[]) => {
      if (!entries.some(e => e.isIntersecting) || isLoadingMoreRef.current || !hasMore || effectiveLoading) return;
      loadPlaces(currentPage + 1, true);
    };
    const opts = { rootMargin: '200px', threshold: 0 };
    const observers: IntersectionObserver[] = [];
    // Mobile: root = conteneur scroll du drawer (scroll imbriqué)
    if (loadMoreSentinelRef.current && mobileDrawerScrollRef.current) {
      const obsMobile = new IntersectionObserver(callback, { ...opts, root: mobileDrawerScrollRef.current });
      obsMobile.observe(loadMoreSentinelRef.current);
      observers.push(obsMobile);
    }
    // Desktop: root = viewport (scroll de la page)
    if (loadMoreSentinelDesktopRef.current) {
      const obsDesktop = new IntersectionObserver(callback, { ...opts, root: null });
      obsDesktop.observe(loadMoreSentinelDesktopRef.current);
      observers.push(obsDesktop);
    }
    return () => observers.forEach(o => o.disconnect());
  }, [loadPlaces, hasMore, effectiveLoading, currentPage]);

  // Filtrer les places côté client - mémoïsé pour éviter recalc au scroll (stabilité ref pour carte mobile)
  const filteredListings = useMemo(() => {
    return places
    .map(convertPlaceToListing)
    .filter((listing): listing is Listing => listing != null)
    .filter(listing => {
    let matches = true;
    
    // Type filter
    if (selectedTypes.length > 0) {
      const typeMatches = selectedTypes.includes(listing.type);
      if (!typeMatches) {
        console.log('🔍 [FILTER] Type filtré:', { listingType: listing.type, selectedTypes, listingId: listing.id });
      }
      matches = matches && typeMatches;
    } else if (typeFilter && typeFilter !== 'all') {
      const typeMatches = listing.type === typeFilter;
      if (!typeMatches) {
        console.log('🔍 [FILTER] Type filtré (typeFilter):', { listingType: listing.type, typeFilter, listingId: listing.id });
      }
      matches = matches && typeMatches;
    }
    
    // City filter: ne pas filtrer par nom de ville quand on fait une recherche géographique (lat/lng/radius)
    // car l'API retourne déjà les biens dans le rayon — ex: Beauvais affiche Tillé à côté
    const isGeoSearch = selectedCityCoords ?? (latParam && lngParam);
    if (cityFilter && cityFilter !== '' && !isGeoSearch) {
      const cityMatches = (listing.city ?? '').toLowerCase().includes((cityFilter ?? '').toLowerCase());
      if (!cityMatches) {
        console.log('🔍 [FILTER] Ville filtrée:', { listingCity: listing.city, cityFilter, listingId: listing.id });
      }
      matches = matches && cityMatches;
    }
    
    // Price range filter - selon l'unité sélectionnée
    let listingPrice = 0;
    if (priceUnit === 'hour') {
      listingPrice = listing.priceHourly || 0;
    } else if (priceUnit === 'day') {
      listingPrice = listing.priceDaily || 0;
    } else if (priceUnit === 'week') {
      // Utiliser le prix hebdomadaire s'il existe, sinon calculer à partir du prix journalier
      listingPrice = listing.priceWeekly || (listing.priceDaily ? listing.priceDaily * 7 : 0);
    } else if (priceUnit === 'month') {
      // Utiliser le prix mensuel s'il existe, sinon calculer à partir du prix journalier
      listingPrice = listing.priceMonthly || (listing.priceDaily ? listing.priceDaily * 30 : 0);
    }
    const priceMatches = listingPrice >= priceRange[0] && listingPrice <= priceRange[1];
    if (!priceMatches) {
      console.log('🔍 [FILTER] Prix filtré:', { listingPrice, priceRange, priceUnit, listingId: listing.id });
    }
    matches = matches && priceMatches;
    
    // Rating filter - notes de 5 à 10
    if (minRating > 0 && listing.rating) {
      const listingRating = parseFloat(String(listing.rating).replace(',', '.')) * 2;
      matches = matches && listingRating >= minRating;
    }
    
    // No deposit filter
    // No deposit filter - vérifier que deposit est null, undefined, ou égal à 0
    if (noDeposit === true) {
      const depositMatches = (listing.deposit ?? 0) === 0;
      if (!depositMatches) {
        console.log('🔍 [FILTER] Dépôt filtré:', { depositValue: listing.deposit ?? 0, listingId: listing.id });
      }
      matches = matches && depositMatches;
    }
    
    if (!matches) {
      console.log('❌ [FILTER] Listing filtré:', { listingId: listing.id, title: listing.title, type: listing.type, city: listing.city });
    }
    
    return matches;
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- convertPlaceToListing stable, éviter recalc au scroll
  }, [places, selectedTypes, typeFilter, cityFilter, selectedCityCoords, latParam, lngParam, priceRange, priceUnit, minRating, noDeposit]);
  
  // Log pour déboguer
  useEffect(() => {
    console.log('🔍 [FILTER DEBUG] ========================================');
    console.log('🔍 [FILTER DEBUG] Places chargées:', places.length);
    console.log('🔍 [FILTER DEBUG] selectedTypes:', selectedTypes);
    console.log('🔍 [FILTER DEBUG] typeFilter:', typeFilter);
    console.log('🔍 [FILTER DEBUG] cityFilter:', cityFilter);
    console.log('🔍 [FILTER DEBUG] priceRange:', priceRange);
    console.log('🔍 [FILTER DEBUG] priceUnit:', priceUnit);
    console.log('🔍 [FILTER DEBUG] filteredListings:', filteredListings.length);
    console.log('🔍 [FILTER DEBUG] ========================================');
  }, [places.length, selectedTypes, typeFilter, cityFilter, priceRange, priceUnit, filteredListings.length]);

  // Charger des espaces suggérés (comme sur la page d'accueil) quand aucun résultat
  useEffect(() => {
    if (!effectiveLoading && filteredListings.length === 0) {
      let cancelled = false;
      setIsLoadingSuggested(true);
      placesAPI.getAll({ page: 0, size: 20 })
        .then((results) => {
          if (!cancelled) {
            const arr = Array.isArray(results) ? results : [];
            const sorted = [...arr].sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
            setSuggestedPlaces(sorted.slice(0, 12));
          }
        })
        .catch(() => {
          if (!cancelled) setSuggestedPlaces([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingSuggested(false);
        });
      return () => { cancelled = true; };
    } else {
      setSuggestedPlaces([]);
    }
  }, [effectiveLoading, filteredListings.length]);

  // Sort listings based on selected sort option - mémoïsé pour éviter nouvelle ref au scroll (carte ne se refresh pas)
  const sortedListings = useMemo(() => {
    return [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        const priceA = a.priceHourly || a.priceDaily || a.priceWeekly || a.priceMonthly || 0;
        const priceB = b.priceHourly || b.priceDaily || b.priceWeekly || b.priceMonthly || 0;
        return priceA - priceB;
      case 'price-desc':
        const priceA2 = a.priceHourly || a.priceDaily || a.priceWeekly || a.priceMonthly || 0;
        const priceB2 = b.priceHourly || b.priceDaily || b.priceWeekly || b.priceMonthly || 0;
        return priceB2 - priceA2;
      case 'size-asc':
        const sizeA = (a.dimensions ? (parseFloat(a.dimensions.length ?? '0') || 0) * (parseFloat(a.dimensions.width ?? '0') || 0) : 0);
        const sizeB = (b.dimensions ? (parseFloat(b.dimensions.length ?? '0') || 0) * (parseFloat(b.dimensions.width ?? '0') || 0) : 0);
        return sizeA - sizeB;
      case 'size-desc':
        const sizeA2 = (a.dimensions ? (parseFloat(a.dimensions.length ?? '0') || 0) * (parseFloat(a.dimensions.width ?? '0') || 0) : 0);
        const sizeB2 = (b.dimensions ? (parseFloat(b.dimensions.length ?? '0') || 0) * (parseFloat(b.dimensions.width ?? '0') || 0) : 0);
        return sizeB2 - sizeA2;
      case 'rating-desc':
        const ratingA = a.rating ? (parseFloat(String(a.rating).replace(',', '.')) || 0) : 0;
        const ratingB = b.rating ? (parseFloat(String(b.rating).replace(',', '.')) || 0) : 0;
        return ratingB - ratingA;
      case 'reviews-desc':
        return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      case 'instant-booking':
        const aInstant = (a.features?.some(f => f && (f.toLowerCase().includes('24h') || f.toLowerCase().includes('instantané')))) ? 1 : 0;
        const bInstant = (b.features?.some(f => f && (f.toLowerCase().includes('24h') || f.toLowerCase().includes('instantané')))) ? 1 : 0;
        return bInstant - aInstant;
      default:
        return 0;
    }
  });
  }, [filteredListings, sortBy]);

  // Coordonnées approximatives pour les villes françaises (fallback si pas de lat/lng)
  const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'Lyon': { lat: 45.7640, lng: 4.8357 },
    'Marseille': { lat: 43.2965, lng: 5.3698 },
    'Toulouse': { lat: 43.6047, lng: 1.4442 },
    'Nice': { lat: 43.7102, lng: 7.2620 },
    'Nantes': { lat: 47.2184, lng: -1.5536 },
    'Strasbourg': { lat: 48.5734, lng: 7.7521 },
    'Montpellier': { lat: 43.6108, lng: 3.8767 },
    'Bordeaux': { lat: 44.8378, lng: -0.5792 },
    'Lille': { lat: 50.6292, lng: 3.0573 },
    'Rennes': { lat: 48.1173, lng: -1.6778 },
    'Reims': { lat: 49.2583, lng: 4.0317 },
    'Le Havre': { lat: 49.4944, lng: 0.1079 },
    'Saint-Étienne': { lat: 45.4397, lng: 4.3872 },
    'Toulon': { lat: 43.1242, lng: 5.9280 },
    'Grenoble': { lat: 45.1885, lng: 5.7245 },
    'Dijon': { lat: 47.3220, lng: 5.0415 },
    'Angers': { lat: 47.4739, lng: -0.5517 },
    'Nîmes': { lat: 43.8367, lng: 4.3601 },
    'Villeurbanne': { lat: 45.7719, lng: 4.8902 },
    'Saint-Denis': { lat: 48.9356, lng: 2.3539 },
    'Le Mans': { lat: 48.0061, lng: 0.1996 },
    'Aix-en-Provence': { lat: 43.5297, lng: 5.4474 },
    'Clermont-Ferrand': { lat: 45.7772, lng: 3.0870 },
    'Brest': { lat: 48.3904, lng: -4.4861 },
    'Tours': { lat: 47.3941, lng: 0.6848 },
    'Limoges': { lat: 45.8354, lng: 1.2622 },
    'Amiens': { lat: 49.8942, lng: 2.2957 },
    'Beauvais': { lat: 49.4290, lng: 2.0955 },
    'Perpignan': { lat: 42.6887, lng: 2.8947 },
    'Metz': { lat: 49.1193, lng: 6.1757 },
    'Besançon': { lat: 47.2378, lng: 6.0241 },
  };

  // Convertir les places en propriétés pour la carte - mémoïsé pour éviter refresh carte au scroll mobile
  const mapProperties: Property[] = useMemo(() => {
    return sortedListings.map((listing) => {
    // Utiliser les coordonnées réelles du backend si disponibles
    // Le backend fournit directement latitude et longitude dans le PlaceDTO
    const place = places.find(p => p.id === listing.id);
    
    // PRIORITÉ 1 : Utiliser latitude et longitude du backend (champs standards)
    // Le backend calcule automatiquement ces coordonnées via le GeocodingService
    let lat: number | null = null;
    let lng: number | null = null;
    
    if (place) {
      // Le backend envoie latitude et longitude directement dans le PlaceDTO
      lat = typeof place.latitude === 'number' ? place.latitude : 
            (typeof place.latitude === 'string' ? parseFloat(place.latitude) : null);
      lng = typeof place.longitude === 'number' ? place.longitude : 
            (typeof place.longitude === 'string' ? parseFloat(place.longitude) : null);
      
      // Vérifier que les coordonnées sont valides
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        console.log(`✅ [MAP] Bien ${listing.id} (${listing.city}): Coordonnées du backend utilisées`, { lat, lng });
      } else {
        // Log de débogage si les coordonnées ne sont pas trouvées
        console.log(`🔍 [MAP] Bien ${listing.id} (${listing.city}): Coordonnées non disponibles dans le backend`, {
          latitude: place.latitude,
          longitude: place.longitude,
          placeKeys: Object.keys(place).filter(k => 
            k.toLowerCase().includes('lat') || 
            k.toLowerCase().includes('lng') || 
            k.toLowerCase().includes('lon') ||
            k.toLowerCase().includes('coord')
          )
        });
      }
    }
    
    // FALLBACK : Si pas de coordonnées dans le backend, utiliser les coordonnées de la ville
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      const cityCoords = CITY_COORDINATES[listing.city];
      if (cityCoords) {
        lat = cityCoords.lat;
        lng = cityCoords.lng;
        console.log(`📍 [MAP] Bien ${listing.id} (${listing.city}): Utilisation des coordonnées de la ville (fallback)`, { lat, lng });
      } else {
        // Fallback final sur Paris si la ville n'est pas dans la liste
        lat = CITY_COORDINATES['Paris'].lat;
        lng = CITY_COORDINATES['Paris'].lng;
        console.warn(`⚠️ [MAP] Bien ${listing.id} (${listing.city}): Ville non trouvée dans CITY_COORDINATES, utilisation de Paris (fallback final)`, { 
          lat, 
          lng,
          availableCities: Object.keys(CITY_COORDINATES).slice(0, 10)
        });
      }
    }

    // Déterminer le prix principal à afficher
    const price = listing.priceDaily || listing.priceHourly || listing.priceWeekly || listing.priceMonthly || 0;

    // S'assurer que les coordonnées sont valides avant de créer la propriété
    const finalLat = Number(lat);
    const finalLng = Number(lng);
    
    if (isNaN(finalLat) || isNaN(finalLng)) {
      console.warn('⚠️ [MAP] Coordonnées invalides pour le bien:', {
        id: listing.id,
        title: listing.title,
        city: listing.city,
        lat,
        lng
      });
      // Utiliser Paris en dernier recours
        return {
        id: listing.id,
        title: listing.title ?? '',
        lat: CITY_COORDINATES['Paris'].lat,
        lng: CITY_COORDINATES['Paris'].lng,
        price,
        address: listing.address ?? '',
        status: 'available' as const,
        placeId: listing.id,
        image: listing.image ?? getDefaultPlaceImage(listing.type),
      };
    }

    return {
      id: listing.id,
      title: listing.title ?? '',
      lat: finalLat,
      lng: finalLng,
      price,
      address: listing.address ?? '',
      status: 'available' as const,
      placeId: listing.id,
      image: listing.image ?? getDefaultPlaceImage(listing.type),
    };
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- CITY_COORDINATES est un objet littéral stable, pas de recalc au scroll
  }, [sortedListings, places]);

  // Logs pour vérifier que tous les biens sont bien sur la carte
  useEffect(() => {
    console.log('🗺️ [MAP] ========================================');
    console.log('🗺️ [MAP] Vérification des biens sur la carte:');
    console.log('🗺️ [MAP] - Total places chargées:', places.length);
    console.log('🗺️ [MAP] - Biens filtrés (filteredListings):', filteredListings.length);
    console.log('🗺️ [MAP] - Biens triés (sortedListings):', sortedListings.length);
    console.log('🗺️ [MAP] - Biens sur la carte (mapProperties):', mapProperties.length);
    
    if (sortedListings.length !== mapProperties.length) {
      const manquants = sortedListings.length - mapProperties.length;
      console.warn('⚠️ [MAP] ATTENTION:', manquants, 'bien(s) manquant(s) sur la carte!');
      
      // Identifier les biens manquants
      const idsSurCarte = new Set(mapProperties.map(p => p.id));
      const biensManquants = sortedListings.filter(l => !idsSurCarte.has(l.id));
      console.warn('⚠️ [MAP] Biens manquants:', biensManquants.map(l => ({ id: l.id, title: l.title, city: l.city })));
    } else {
      console.log('✅ [MAP] Tous les biens sont sur la carte!');
    }
    console.log('🗺️ [MAP] ========================================');
  }, [places.length, filteredListings.length, sortedListings.length, mapProperties.length]);

  // Initialiser les coordonnées depuis l'URL si disponibles (passées par le header)
  useEffect(() => {
    if (latParam && lngParam) {
      const parsedLat = parseFloat(latParam);
      const parsedLng = parseFloat(lngParam);
      
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        const coords = { lat: parsedLat, lng: parsedLng };
        console.log('🗺️ [URL-COORDS] ========================================');
        console.log('🗺️ [URL-COORDS] Coordonnées trouvées dans l\'URL:', coords);
        console.log('🗺️ [URL-COORDS] Initialisation de selectedCityCoords depuis l\'URL');
        setSelectedCityCoords(coords);
        if (!cityFilter) {
          setCity('À proximité');
          setContextCityCoords?.(coords);
        }
        console.log('🗺️ [URL-COORDS] ========================================');
      }
    }
  }, [latParam, lngParam, cityFilter, setCity, setContextCityCoords]);

  // Réinitialiser les coordonnées sélectionnées si la ville est supprimée (mais pas si on vient de sélectionner une ville)
  useEffect(() => {
    if (!cityFilter && !latParam && !lngParam && selectedCityCoords) {
      // Petit délai pour éviter de réinitialiser pendant la sélection
      const timeoutId = setTimeout(() => {
        setSelectedCityCoords(null);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [cityFilter, latParam, lngParam, selectedCityCoords]);

  // Géocoder automatiquement la ville depuis l'URL si elle n'a pas de coordonnées
  useEffect(() => {
    if (cityFilter && !selectedCityCoords) {
      console.log('🗺️ [AUTO-GEOCODE] ========================================');
      console.log('🗺️ [AUTO-GEOCODE] Ville détectée dans l\'URL:', cityFilter);
      console.log('🗺️ [AUTO-GEOCODE] selectedCityCoords est null, géocodage nécessaire');
      
      // Chercher dans les suggestions récentes pour obtenir le code postal et les coordonnées
      const allSuggestions = [...citySuggestions, ...desktopCitySuggestions];
      console.log('🗺️ [AUTO-GEOCODE] Nombre de suggestions disponibles:', allSuggestions.length);
      
      const recentSuggestion = allSuggestions.find(
        loc => (loc.cityName ?? '').toLowerCase() === (cityFilter ?? '').toLowerCase()
      );
      
      if (recentSuggestion) {
        console.log('🗺️ [AUTO-GEOCODE] Suggestion récente trouvée:', recentSuggestion);
        // Si on a une suggestion récente, utiliser ses coordonnées ou géocoder
        const lat = recentSuggestion.latitude ?? recentSuggestion.lat;
        const lng = recentSuggestion.longitude ?? recentSuggestion.lng;
        
        console.log('🗺️ [AUTO-GEOCODE] Coordonnées extraites:', { lat, lng });
        
        if (lat !== null && lat !== undefined && lng !== null && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
          console.log('🗺️ [AUTO-GEOCODE] ✅ Utilisation des coordonnées de la suggestion:', { lat, lng });
          setSelectedCityCoords({ lat: Number(lat), lng: Number(lng) });
        } else {
          // Géocoder avec le code postal si disponible
          console.log('🗺️ [AUTO-GEOCODE] Coordonnées manquantes, géocodage avec code postal:', recentSuggestion.postalCode);
          geocodeCity(cityFilter ?? '', recentSuggestion.postalCode ?? undefined).then(coords => {
            if (coords) {
              console.log('🗺️ [AUTO-GEOCODE] ✅ Coordonnées obtenues via géocodage:', coords);
              setSelectedCityCoords(coords);
            } else {
              console.warn('🗺️ [AUTO-GEOCODE] ⚠️ Géocodage échoué');
            }
          });
        }
      } else {
        // Sinon, géocoder directement avec le nom de la ville
        console.log('🗺️ [AUTO-GEOCODE] Aucune suggestion trouvée, géocodage direct de la ville');
        geocodeCity(cityFilter).then(coords => {
          if (coords) {
            console.log('🗺️ [AUTO-GEOCODE] ✅ Coordonnées obtenues via géocodage direct:', coords);
            setSelectedCityCoords(coords);
          } else {
            console.warn('🗺️ [AUTO-GEOCODE] ⚠️ Géocodage direct échoué');
          }
        });
      }
      console.log('🗺️ [AUTO-GEOCODE] ========================================');
    }
  }, [cityFilter, selectedCityCoords, citySuggestions, desktopCitySuggestions]);
  
  // Utiliser les coordonnées des suggestions dès qu'elles sont disponibles
  useEffect(() => {
    if (cityFilter && !selectedCityCoords) {
      const allSuggestions = [...citySuggestions, ...desktopCitySuggestions];
      const matchingSuggestion = allSuggestions.find(
        loc => (loc.cityName ?? '').toLowerCase() === (cityFilter ?? '').toLowerCase()
      );
      
      if (matchingSuggestion) {
        const lat = matchingSuggestion.latitude ?? matchingSuggestion.lat;
        const lng = matchingSuggestion.longitude ?? matchingSuggestion.lng;
        
        if (lat !== null && lat !== undefined && lng !== null && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
          console.log('🗺️ [SUGGESTION-SYNC] ✅ Coordonnées trouvées dans les suggestions, mise à jour:', { lat, lng });
          setSelectedCityCoords({ lat: Number(lat), lng: Number(lng) });
        }
      }
    }
  }, [citySuggestions, desktopCitySuggestions, cityFilter, selectedCityCoords]);

  // Calculer le centre de la carte basé sur la ville recherchée
  // ✅ FIX: Utiliser les valeurs primitives dans les dépendances pour garantir la détection
  const mapCenter = useMemo(() => {
    // PRIORITÉ ABSOLUE: coordonnées de la ville sélectionnée depuis l'API
    if (selectedCityCoords && selectedCityCoords.lat && selectedCityCoords.lng) {
      const center = { lat: selectedCityCoords.lat, lng: selectedCityCoords.lng, zoom: 10 };
      console.log(`[MAP-CENTER] source=selectedCityCoords | ${center.lat.toFixed(4)},${center.lng.toFixed(4)}`);
      return center;
    }
    
    if (!cityFilter) return undefined;
    
    // PRIORITÉ 2: Chercher dans les coordonnées prédéfinies avec le nom exact de la ville
    const cityCoords = CITY_COORDINATES[cityFilter];
    if (cityCoords) {
      return { lat: cityCoords.lat, lng: cityCoords.lng, zoom: 12 };
    }
    
    // PRIORITÉ 3: Chercher dans les coordonnées prédéfinies avec une correspondance partielle (insensible à la casse)
    const cityFilterLower = cityFilter.toLowerCase();
    const matchingCity = Object.keys(CITY_COORDINATES).find(
      city => city.toLowerCase() === cityFilterLower || city.toLowerCase().includes(cityFilterLower)
    );
    if (matchingCity) {
      const coords = CITY_COORDINATES[matchingCity];
      return { lat: coords.lat, lng: coords.lng, zoom: 12 };
    }
    
    // PRIORITÉ 4: Si on a des propriétés trouvées, utiliser le centre de ces propriétés
    // Note: on utilise uniquement mapProperties (pas sortedListings) pour ne pas recomputer le centre
    // quand la liste est triée/filtrée (évite de recréer l'objet mapCenter → remonte la carte)
    if (mapProperties.length > 0) {
      const cityProperties = mapProperties.filter(p =>
        (p.address ?? '').toLowerCase().includes(cityFilterLower)
      );
      const propertiesToUse = cityProperties.length > 0 ? cityProperties : mapProperties;
      const avgLat = propertiesToUse.reduce((sum, p) => sum + p.lat, 0) / propertiesToUse.length;
      const avgLng = propertiesToUse.reduce((sum, p) => sum + p.lng, 0) / propertiesToUse.length;
      return { lat: avgLat, lng: avgLng, zoom: 12 };
    }
    
    console.log('[MAP-CENTER] retourne undefined');
    return undefined;
  }, [cityFilter, selectedCityCoords?.lat, selectedCityCoords?.lng, mapProperties]); // sortedListings retiré : évite re-render carte au tri/filtre

  // Réinitialiser le bouton "Rechercher dans cette zone" quand la recherche change (ville, lat/lng, etc.)
  useEffect(() => {
    setShowSearchAreaButton(false);
    setPendingMapCenter(null);
  }, [latParam, lngParam, cityFilter, selectedCityCoords?.lat, selectedCityCoords?.lng]);

  // Callback quand l'utilisateur a déplacé la carte : afficher "Rechercher dans cette zone" si le centre a changé
  const handleMapMoveEnd = useCallback((center: { lat: number; lng: number }) => {
    const refLat = latParam != null ? parseFloat(latParam) : mapCenter?.lat;
    const refLng = lngParam != null ? parseFloat(lngParam) : mapCenter?.lng;
    const threshold = 0.005; // ~500 m
    const isDifferent = refLat == null || refLng == null ||
      Math.abs(center.lat - refLat) > threshold ||
      Math.abs(center.lng - refLng) > threshold;
    if (isDifferent) {
      setPendingMapCenter(center);
      setShowSearchAreaButton(true);
    }
  }, [latParam, lngParam, mapCenter?.lat, mapCenter?.lng]);

  // Lancer la recherche sur la zone visible (centre de la carte après déplacement)
  const handleSearchAreaClick = useCallback(() => {
    if (!pendingMapCenter) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('lat', String(pendingMapCenter.lat));
    params.set('lng', String(pendingMapCenter.lng));
    params.set('radius', '10');
    params.delete('city');
    router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
    setShowSearchAreaButton(false);
    setPendingMapCenter(null);
    // La recherche sera relancée par l'effet qui dépend de latParam/lngParam
  }, [pendingMapCenter, router, searchParams]);

  // Charger les favoris au chargement de la page
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          // Si pas connecté, tous les favoris sont à false
          setIsLiked({});
          return;
        }

        const userIdNum = parseInt(userId, 10);
        const favorites = await rentoallFavoritesAPI.getFavorites(userIdNum);
        
        const favoritesMap: Record<number, boolean> = {};
        (Array.isArray(favorites) ? favorites : []).forEach(fav => {
          if (fav?.id != null) favoritesMap[fav.id] = true;
        });
        
        setIsLiked(favoritesMap);
      } catch (error) {
        console.error('❌ [SEARCH] Erreur lors du chargement des favoris:', error);
        // En cas d'erreur, on garde l'état actuel
      }
    };

    loadFavorites();
  }, []);

  // Fonction pour basculer l'état favori
  const toggleLike = async (id: number) => {
    // Vérifier si l'utilisateur est connecté
    const userId = localStorage.getItem('userId');
    if (!userId) {
      // Rediriger vers la page de connexion de manière non intrusive
      // L'utilisateur peut revenir facilement
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      router.push('/auth/login');
      return;
    }

    // Empêcher les clics multiples
    if (isToggling[id]) return;

    setIsToggling(prev => ({ ...prev, [id]: true }));
    const previousState = isLiked[id] || false;

    // Mise à jour optimiste
    setIsLiked(prev => ({ ...prev, [id]: !prev[id] }));

    try {
      const userIdNum = parseInt(userId, 10);
      
      if (previousState) {
        // Retirer des favoris
        await rentoallFavoritesAPI.removeFavorite(userIdNum, id);
        console.log('✅ [SEARCH] Favori retiré');
      } else {
        // Ajouter aux favoris
        await rentoallFavoritesAPI.addFavorite(userIdNum, id);
        console.log('✅ [SEARCH] Favori ajouté');
      }
    } catch (error) {
      console.error('❌ [SEARCH] Erreur lors de la modification:', error);
      // Revenir à l'état précédent en cas d'erreur
      setIsLiked(prev => ({ ...prev, [id]: previousState }));
    } finally {
      setIsToggling(prev => ({ ...prev, [id]: false }));
    }
  };

  // Fonction pour gérer la recherche mobile
  // Fonction pour réinitialiser tous les filtres
  const handleResetFilters = () => {
    // Réinitialiser tous les états locaux
    setSelectedTypes([]);
    setPriceRange([0, getMaxPriceForUnit(priceUnit)]);
    setMinRating(0);
    setInstantBooking(null);
    setFreeCancellation(null);
    setNoDeposit(null);
    setSelectedCharacteristics({});
    
    // Forcer la popup Filtres avancés à tout décocher (état interne)
    setFiltersResetKey(k => k + 1);
    
    // Réinitialiser les villes (locales et contexte header)
    setMobileCityInput('');
    setDesktopCityInput('');
    setCitySuggestions([]);
    setDesktopCitySuggestions([]);
    setShowMobileCityPicker(false);
    setShowDesktopCityPicker(false);
    setCity?.(''); // Réinitialiser le contexte du header
    
    // Réinitialiser le rayon de recherche - TEMPORAIREMENT DÉSACTIVÉ
    // setSearchRadius(10);
    
    // Réinitialiser les dates (locales et contexte header)
    setMobileStartDate(null);
    setMobileEndDate(null);
    setStartDate(null); // Réinitialiser le contexte du header
    setEndDate(null); // Réinitialiser le contexte du header
    
    // Réinitialiser les types dans le contexte du header
    setHeaderSelectedTypes([]);
    
    // Réinitialiser les coordonnées ville du contexte header
    setContextCityCoords?.(null);
    
    // Notifier le header de réinitialiser son type (dropdown Type)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('searchFiltersReset'));
    }
    
    // Fermer tous les pickers
    setShowMobileDatePicker(false);
    setShowMobileTypePicker(false);
    
    // Naviguer vers l'URL sans paramètres
    router.push('/search-parkings');
  };

  const handleMobileSearch = () => {
    // Partir de l'URL actuelle pour préserver les filtres (instantBooking, freeCancellation, etc.)
    const params = new URLSearchParams(searchParams.toString());
    params.delete('_rsc'); // paramètre technique Next.js
    params.delete('page'); // on repart de la page 1
    
    if (mobileCityInput.trim()) {
      params.set('city', mobileCityInput.trim());
    } else {
      params.delete('city');
    }
    
    if (mobileStartDate) {
      params.set('startDate', mobileStartDate.toISOString().split('T')[0]);
      params.set('availableFrom', mobileStartDate.toISOString().split('T')[0]);
    } else {
      params.delete('startDate');
      params.delete('availableFrom');
    }
    
    if (mobileEndDate) {
      params.set('endDate', mobileEndDate.toISOString().split('T')[0]);
      params.set('availableTo', mobileEndDate.toISOString().split('T')[0]);
    } else {
      params.delete('endDate');
      params.delete('availableTo');
    }
    
    if (selectedTypes.length > 0) {
      const typeMap: Record<string, string> = {
        'parking': 'PARKING',
        'storage': 'STORAGE_SPACE',
        'cellar': 'CAVE'
      };
      params.set('type', typeMap[selectedTypes[0]] || selectedTypes[0].toUpperCase());
    } else {
      params.delete('type');
    }
    
    setShowMobileCityPicker(false);
    setShowMobileDatePicker(false);
    setShowMobileTypePicker(false);
    
    router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
  };

  const handleNearby = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoAlertMessage('La géolocalisation n\'est pas disponible sur votre appareil.');
      setShowGeoAlert(true);
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords = { lat, lng };
        setSelectedCityCoords(coords);
        setContextCityCoords?.(coords);
        setCity('À proximité');
        setMobileCityInput('');
        const params = new URLSearchParams(window.location.search);
        params.set('lat', String(lat));
        params.set('lng', String(lng));
        params.set('radius', '50');
        params.delete('city');
        setShowMobileCityPicker(false);
        setShowMobileSearchFilters(false);
        router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
        setIsGettingLocation(false);
      },
      (err) => {
        setIsGettingLocation(false);
        const msg = err.code === 1
          ? 'Accès à la position refusé. Autorisez la géolocalisation dans les paramètres.'
          : 'Impossible d\'obtenir votre position. Vérifiez votre connexion.';
        setGeoAlertMessage(msg);
        setShowGeoAlert(true);
      }
    );
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden flex flex-col">
      <HeaderNavigation
        onSearchClick={() => setShowMobileSearchFilters(!showMobileSearchFilters)}
        searchDestinationLabel={latParam && lngParam && !cityFilter ? 'À proximité' : (mobileCityInput || cityFilter) || 'Destination'}
        onFilterClick={() => setShowMobileFiltersPopup(true)}
        hasActiveFilters={selectedTypes.length > 0 || priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit) || instantBooking !== null || freeCancellation !== null || noDeposit !== null || Object.keys(selectedCharacteristics).length > 0}
        activeFilterCount={
          (selectedTypes.length > 0 ? 1 : 0) +
          (priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit) ? 1 : 0) +
          (instantBooking !== null ? 1 : 0) +
          (freeCancellation !== null ? 1 : 0) +
          (noDeposit !== null ? 1 : 0) +
          Object.keys(selectedCharacteristics).length
        }
      />
      
      {/* Mobile Search Filters Panel - Plein écran, sans bloc blanc */}
      {showMobileSearchFilters && (
        <div 
          className="fixed inset-0 z-40 bg-white md:hidden overflow-y-auto" 
          style={{ 
            top: 0, 
            paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 3rem), 3rem)',
            paddingBottom: 'max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5rem))'
          }}
        >
          <div className="p-4 pb-8 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Rechercher</h2>
              <button
                onClick={() => setShowMobileSearchFilters(false)}
                className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-slate-200/80 active:bg-slate-300/80 rounded-xl transition-colors cursor-pointer touch-manipulation flex items-center justify-center text-slate-500"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Champ : Destination (ville, code postal ou mot-clé) - même logique que le web */}
            <div className="relative" data-city-autocomplete>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Destination</label>
              <div className="relative flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 min-h-[52px] focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 shadow-sm">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" strokeWidth={2} />
                <input
                  type="text"
                  value={mobileCityInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMobileCityInput(value);
                    if (value.trim().length > 0) {
                      setShowMobileCityPicker(true);
                      setShowMobileDatePicker(false);
                      setShowMobileTypePicker(false);
                    } else {
                      setShowMobileCityPicker(false);
                      setCitySuggestions([]);
                      setMobileTitleSearchPlaces([]);
                    }
                  }}
                  onFocus={() => {
                    if (mobileCityInput.trim().length > 0) setShowMobileCityPicker(true);
                  }}
                  placeholder="Ville, code postal ou mot-clé..."
                  className="flex-1 bg-transparent border-0 outline-none text-base text-slate-900 placeholder-slate-400 min-w-0 pr-8"
                  autoComplete="off"
                />
                {mobileCityInput.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileCityInput('');
                      setShowMobileCityPicker(false);
                      setCitySuggestions([]);
                      setMobileTitleSearchPlaces([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation"
                    aria-label="Effacer la recherche"
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              {/* Bouton À proximité */}
              <button
                type="button"
                onClick={handleNearby}
                disabled={isGettingLocation}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200/80 border border-emerald-200 rounded-2xl text-emerald-700 font-medium transition-colors touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGettingLocation ? (
                  <>
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span>Position en cours...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                    <span>À proximité</span>
                  </>
                )}
              </button>
              {/* Dropdown suggestions */}
              {showMobileCityPicker && mobileCityInput.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-lg z-50 max-h-64 overflow-y-auto" data-city-autocomplete>
                  <div className="p-2">
                    {isLoadingSuggestions ? (
                      <div className="px-4 py-6 text-slate-500 flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Recherche...</span>
                      </div>
                    ) : citySuggestions.length > 0 ? (
                      <div className="space-y-1">
                        {citySuggestions.map((location, idx) => (
                          <button
                            key={`${location.id ?? location.postalCode ?? idx}-${location.cityName ?? ''}`}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { e.stopPropagation();
                              isSelectingCityRef.current = true;
                              setShowMobileCityPicker(false);
                              setCitySuggestions([]);
                              setMobileTitleSearchPlaces([]);
                              setMobileCityInput(location.cityName ?? '');
                              const lat = location.latitude ?? location.lat;
                              const lng = location.longitude ?? location.lng;
                              if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                                const coords = { lat: Number(lat), lng: Number(lng) };
                                setSelectedCityCoords(coords);
                                setContextCityCoords?.(coords);
                              } else {
                                geocodeCity(location.cityName ?? '', location.postalCode).then((coords) => {
                                  if (coords) {
                                    setSelectedCityCoords(coords);
                                    setContextCityCoords?.(coords);
                                  }
                                });
                              }
                              const params = new URLSearchParams(window.location.search);
                              params.set('city', location.cityName ?? '');
                              if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                                params.set('lat', String(lat));
                                params.set('lng', String(lng));
                                params.set('radius', '50'); // Rayon 50 km pour afficher les biens les plus proches
                              }
                              router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
                            }}
                            className="w-full text-left px-4 py-3 min-h-[48px] hover:bg-slate-50 active:bg-slate-100 rounded-xl text-slate-800 font-medium cursor-pointer touch-manipulation"
                          >
                            <span>{location.cityName}</span>
                            {location.postalCode && <span className="text-slate-500 text-sm ml-2">({location.postalCode})</span>}
                          </button>
                        ))}
                      </div>
                    ) : mobileTitleSearchPlaces.length > 0 ? (
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {mobileTitleSearchPlaces.map((place) => {
                          const typeLabel = place.type === 'PARKING' ? 'Parking' : place.type === 'STORAGE_SPACE' ? 'Stockage' : 'Cave et Divers';
                          const displayTitle = capitalizeFirstPerLine((place.title && String(place.title).trim()) || place.description?.split('.').slice(0, 1).join('.') || `${typeLabel} - ${place.city ?? ''}`);
                          const priceVal = place.pricePerHour ?? place.pricePerDay;
                          const priceStr = priceVal != null ? `${priceVal}€` : '-';
                          return (
                            <CapacitorDynamicLink
                              key={place.id}
                              href={`/parking/${place.id}/`}
                              onClick={() => {
                                setShowMobileCityPicker(false);
                                setMobileTitleSearchPlaces([]);
                              }}
                              className="block w-full text-left px-4 py-3 min-h-[48px] hover:bg-emerald-50 active:bg-emerald-100 rounded-xl text-slate-800 font-medium cursor-pointer touch-manipulation"
                            >
                              <div className="font-medium text-slate-900 truncate">{displayTitle}</div>
                              <div className="flex items-center justify-between gap-2 mt-0.5">
                                <span className="text-xs text-slate-500 truncate">{place.city || ''}</span>
                                <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">{priceStr}</span>
                              </div>
                            </CapacitorDynamicLink>
                          );
                        })}
                      </div>
                    ) : !isLoadingSuggestions ? (
                      <div className="px-4 py-6 text-slate-500 text-sm text-center">
                        Aucun résultat pour &quot;{mobileCityInput}&quot;
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="relative mobile-popup-container">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Dates</label>
              <button
                onClick={() => {
                  setShowMobileDatePicker(!showMobileDatePicker);
                  setShowMobileCityPicker(false);
                  setShowMobileTypePicker(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 min-h-[52px] bg-white hover:bg-slate-50/80 border rounded-2xl transition-all text-left cursor-pointer touch-manipulation shadow-sm ${
                  mobileStartDate || mobileEndDate ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'
                }`}
              >
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" strokeWidth={2} />
                <span className="flex-1 text-sm text-slate-600 font-medium">
                  {mobileStartDate && mobileEndDate
                    ? `${mobileStartDate.getDate()}/${mobileStartDate.getMonth() + 1} - ${mobileEndDate.getDate()}/${mobileEndDate.getMonth() + 1}`
                    : mobileStartDate
                    ? `À partir du ${mobileStartDate.getDate()}/${mobileStartDate.getMonth() + 1}`
                    : 'Dates'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${showMobileDatePicker ? 'rotate-180' : ''}`} />
              </button>

              {/* Calendrier */}
              {showMobileDatePicker && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-lg z-50 p-4 max-h-[85vh] overflow-y-auto" data-mobile-date-picker>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-slate-900">Sélectionner les dates</h3>
                    <button
                      onClick={() => setShowMobileDatePicker(false)}
                      className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-slate-100 rounded-xl transition-colors touch-manipulation flex items-center justify-center text-slate-500"
                    >
                      <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>
                  {/* Affichage date de début / date de fin */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`p-3 rounded-2xl border ${mobileStartDate ? 'border-emerald-500 bg-emerald-50/80' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="text-xs text-slate-500 mb-0.5">Date de début</div>
                      <div className={`text-sm font-semibold ${mobileStartDate ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {mobileStartDate
                          ? mobileStartDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                          : 'Choisir'}
                      </div>
                    </div>
                    <div className={`p-3 rounded-2xl border ${mobileEndDate ? 'border-emerald-500 bg-emerald-50/80' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="text-xs text-slate-500 mb-0.5">Date de fin</div>
                      <div className={`text-sm font-semibold ${mobileEndDate ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {mobileEndDate
                          ? mobileEndDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                          : 'Choisir'}
                      </div>
                    </div>
                  </div>
                  {/* Grille du mois */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => navigateMobileMonth('prev')}
                      className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-slate-100 rounded-xl transition-colors touch-manipulation flex items-center justify-center text-slate-600"
                    >
                      <ChevronLeft className="w-5 h-5" strokeWidth={2} />
                    </button>
                    <span className="font-semibold text-slate-900 text-sm">
                      {monthNames[mobileCalendarMonth.getMonth()]} {mobileCalendarMonth.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigateMobileMonth('next')}
                      className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-slate-100 rounded-xl transition-colors touch-manipulation flex items-center justify-center text-slate-600"
                    >
                      <ChevronRight className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day) => (
                      <div key={day} className="text-center text-xs font-semibold text-slate-500 py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(mobileCalendarMonth).map((date, idx) => {
                      if (!date) {
                        return <div key={`empty-${idx}`} className="aspect-square" />;
                      }
                      const isSelectable = isDateSelectable(date);
                      const isInRange = isDateInRange(date);
                      const isStart = mobileStartDate && date.getTime() === mobileStartDate.getTime();
                      const isEnd = mobileEndDate && date.getTime() === mobileEndDate.getTime();
                      return (
                        <button
                          key={date.getTime()}
                          type="button"
                          onClick={() => isSelectable && handleMobileDateSelect(date)}
                          disabled={!isSelectable}
                          className={`aspect-square rounded-xl text-sm font-medium touch-manipulation min-h-[44px] flex items-center justify-center ${
                            !isSelectable
                              ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                              : isStart || isEnd
                              ? 'bg-emerald-600 text-white shadow-md'
                              : isInRange
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileStartDate(null);
                        setMobileEndDate(null);
                      }}
                      className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl min-h-[48px] touch-manipulation"
                    >
                      Effacer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMobileDatePicker(false)}
                      className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl min-h-[48px] touch-manipulation"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Type */}
            <div className="relative mobile-popup-container">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Type d&apos;espace</label>
              <button
                onClick={() => {
                  setShowMobileTypePicker(!showMobileTypePicker);
                  setShowMobileCityPicker(false);
                  setShowMobileDatePicker(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 min-h-[52px] bg-white hover:bg-slate-50/80 border rounded-2xl transition-all text-left cursor-pointer touch-manipulation shadow-sm ${
                  selectedTypes.length > 0 ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'
                }`}
              >
                <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" strokeWidth={2} />
                <span className="flex-1 text-sm text-slate-600 font-medium">
                  {selectedTypes.length === 0
                    ? 'Type'
                    : selectedTypes.length === 1
                    ? selectedTypes[0] === 'parking'
                      ? 'Parking'
                      : selectedTypes[0] === 'storage'
                      ? 'Box'
                      : 'Cave'
                    : `${selectedTypes.length} types`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${showMobileTypePicker ? 'rotate-180' : ''}`} />
              </button>

              {/* Liste des 3 types */}
              {showMobileTypePicker && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-lg z-50 p-4" data-mobile-type-picker>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-slate-900">Type d&apos;espace</h3>
                    <button
                      type="button"
                      onClick={() => setShowMobileTypePicker(false)}
                      className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-slate-100 rounded-xl transition-colors touch-manipulation flex items-center justify-center text-slate-500"
                    >
                      <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Sélectionnez un ou plusieurs types</p>
                  <div className="space-y-2">
                    {[
                      { value: 'parking', label: 'Parking', icon: Car, description: 'Place de stationnement' },
                      { value: 'storage', label: 'Box', icon: Box, description: 'Espace de stockage' },
                      { value: 'cellar', label: 'Cave', icon: Warehouse, description: 'Cave ou cellier' }
                    ].map((type) => {
                      const Icon = type.icon;
                      const isSelected = selectedTypes.includes(type.value);
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={() => {
                            if (isSelected) {
                              removeTypeAndItsCharacteristics(type.value);
                            } else {
                              setSelectedTypes([...selectedTypes, type.value]);
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all min-h-[56px] touch-manipulation text-left ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-500'
                              : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className={`p-2.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                            <Icon className={`w-6 h-6 ${isSelected ? 'text-emerald-600' : 'text-slate-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-sm ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>
                              {type.label}
                            </div>
                            <div className={`text-xs truncate ${isSelected ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {type.description}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTypes([]);
                        setSelectedCharacteristics({});
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete('type');
                        searchParams.forEach((_, key) => {
                          if (!RESERVED_SEARCH_PARAMS.has(key)) params.delete(key);
                        });
                        router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
                      }}
                      className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl min-h-[48px] touch-manipulation"
                    >
                      Effacer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMobileTypePicker(false)}
                      className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl min-h-[48px] touch-manipulation"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  handleMobileSearch();
                  setShowMobileSearchFilters(false);
                }}
                className="flex-1 px-5 py-3.5 min-h-[52px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation shadow-sm text-base"
              >
                <Search className="w-5 h-5" strokeWidth={2.5} />
                <span>Rechercher</span>
              </button>
              <button
                onClick={() => setShowMobileFiltersPopup(true)}
                className={`px-4 py-3.5 min-h-[52px] border rounded-2xl transition-all flex items-center justify-center cursor-pointer touch-manipulation shadow-sm ${
                  priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit) || instantBooking !== null || freeCancellation !== null || noDeposit !== null
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <main
        className="w-full px-0 pb-20 md:pb-0 overflow-x-hidden flex-1 mobile-page-main search-page-main pt-0"
      >

        {/* Mobile: pas de bloc blanc - Destination + Filtres sont dans le header */}
        {/* Le layout racine fournit déjà pt-14 md:pt-20 pour le header fixe — pas de double padding ici */}

        {/* Espaceur pour la barre de filtres fixe desktop (évite que le contenu passe en dessous) */}
        {(selectedTypes.length > 0 || priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit) || instantBooking !== null || freeCancellation !== null || noDeposit !== null || Object.keys(selectedCharacteristics).length > 0 || searchRadius !== 'none') && (
          <div className="hidden md:block min-h-[40px] shrink-0" aria-hidden />
        )}

        {/* Barre de filtres - Desktop : fixée juste sous le header (toute la largeur, collée) */}
        {(selectedTypes.length > 0 || priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit) || instantBooking !== null || freeCancellation !== null || noDeposit !== null || Object.keys(selectedCharacteristics).length > 0 || searchRadius !== 'none') && (
          <>
            <div
              className="fixed left-0 right-0 z-40 bg-white border-b border-slate-200 overflow-x-hidden hidden md:block min-h-[40px] flex items-center"
              style={{ top: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)' }}
            >
              <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-2 w-full flex items-center min-h-[40px]">
            {/* Desktop: Filtres compacts en scroll horizontal */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide -mx-2 sm:-mx-4 md:mx-0 px-2 sm:px-4 md:px-0 touch-pan-x">
              {/* Sélecteur de distance - Desktop */}
              {/* Sélecteur de distance - Desktop - TEMPORAIREMENT DÉSACTIVÉ */}
              {/* {desktopCityInput && desktopCityInput.trim().length > 0 && (
                <div className="relative flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-300 px-2 py-1.5 flex-shrink-0 min-w-[100px]">
                  <span className="text-xs text-slate-600 whitespace-nowrap hidden sm:inline">Rayon:</span>
                  <select
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    className="bg-transparent border-0 outline-none text-xs sm:text-sm text-slate-900 font-medium cursor-pointer appearance-none pr-6 flex-1"
                  >
                    <option value={1}>1 km</option>
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={20}>20 km</option>
                    <option value={50}>50 km</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2" />
                </div>
              )} */}
              
              {/* Badges des filtres sélectionnés */}
              {(selectedTypes.length > 0 || priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit) || instantBooking !== null || freeCancellation !== null || noDeposit !== null || Object.keys(selectedCharacteristics).length > 0 || searchRadius !== 'none') && (
                <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                  {selectedTypes.map((type) => {
                    const typeLabels: Record<string, string> = {
                      'parking': 'Parking',
                      'storage': 'Stockage',
                      'cellar': 'Cave'
                    };
                    return (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200"
                      >
                        {typeLabels[type] || type}
                        <button
                          onClick={() => {
                            removeTypeAndItsCharacteristics(type);
                          }}
                          className="ml-1 hover:text-emerald-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  
                  {(priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit)) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">
                      Prix: {priceRange[0]}€ - {priceRange[1]}€
                      <button
                        onClick={() => {
                          setPriceRange([0, getMaxPriceForUnit(priceUnit)]);
                          const params = new URLSearchParams(searchParams.toString());
                          params.delete('maxPrice');
                          // ✅ OPTIMISATION: Utiliser replace avec scroll: false
                          router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
                        }}
                        className="ml-1 hover:text-emerald-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  
                  {instantBooking === true && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">
                      Réservation instantanée
                      <button
                        onClick={() => {
                          setInstantBooking(null);
                          const params = new URLSearchParams(searchParams.toString());
                          params.delete('instantBooking');
                          // ✅ OPTIMISATION: Utiliser replace avec scroll: false
                          router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
                        }}
                        className="ml-1 hover:text-emerald-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  
                  {freeCancellation === true && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">
                      Annulation gratuite
                      <button
                        onClick={() => {
                          setFreeCancellation(null);
                          const params = new URLSearchParams(searchParams.toString());
                          params.delete('freeCancellation');
                          // ✅ OPTIMISATION: Utiliser replace avec scroll: false
                          router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
                        }}
                        className="ml-1 hover:text-emerald-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  
                  {noDeposit === true && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">
                      Sans caution
                      <button
                        onClick={() => {
                          setNoDeposit(null);
                          const params = new URLSearchParams(searchParams.toString());
                          params.delete('noDeposit');
                          // ✅ OPTIMISATION: Utiliser replace avec scroll: false
                          router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
                        }}
                        className="ml-1 hover:text-emerald-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  
                  {searchRadius !== 'none' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">
                      Rayon: {searchRadius}km
                      <button
                        onClick={() => {
                          setSearchRadius('none');
                          const params = new URLSearchParams(searchParams.toString());
                          params.delete('radius');
                          // ✅ OPTIMISATION: Utiliser replace avec scroll: false
                          router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
                        }}
                        className="ml-1 hover:text-emerald-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  
                  {Object.entries(selectedCharacteristics).flatMap(([type, specs]) => 
                    (Array.isArray(specs) ? specs : []).filter(Boolean).map((spec) => {
                      const charKey = String(spec).includes('_') ? String(spec).substring(0, String(spec).lastIndexOf('_')) : spec;
                      const badgeLabel = getCharacteristicBadgeLabel(spec);
                      return (
                        <span
                          key={`${type}-${spec}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200"
                        >
                          {badgeLabel}
                          <button
                              onClick={() => {
                              const newCharacteristics = { ...selectedCharacteristics };
                              newCharacteristics[type] = (Array.isArray(specs) ? specs : []).filter(s => s !== spec);
                              if (newCharacteristics[type].length === 0) {
                                delete newCharacteristics[type];
                              }
                              setSelectedCharacteristics(newCharacteristics);
                              // Mettre à jour l'URL en retirant ce filtre
                              const params = new URLSearchParams(searchParams.toString());
                              params.delete(charKey);
                              // ✅ OPTIMISATION: Utiliser replace avec scroll: false
                              router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
                            }}
                            className="ml-1 hover:text-emerald-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })
                  )}
                  
                  {/* Bouton pour réinitialiser tous les filtres */}
                  <button
                    onClick={handleResetAllFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>Réinitialiser</span>
                  </button>
                </div>
              )}
            </div>
              </div>
            </div>
            {/* Espaceur pour que le contenu ne passe pas sous la barre fixe */}
            <div className="h-[40px] flex-shrink-0 hidden md:block" aria-hidden="true" />
          </>
        )}

        {/* Mobile Filters Popup : même composant que le web (AdvancedFilters) */}
        {showMobileFiltersPopup && (
          <div 
            className="fixed inset-0 z-50 bg-black/50 flex items-end md:hidden" 
            onClick={(e) => { if (e.target === e.currentTarget) setShowMobileFiltersPopup(false); }}
          >
            <div 
              className="mobile-popup-container w-full rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col bg-transparent overscroll-contain"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <AdvancedFilters
                embedInContainer
                selectedTypes={selectedTypes}
                onTypesChange={setSelectedTypes}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                priceUnit={priceUnit}
                onPriceUnitChange={setPriceUnit}
                instantBooking={instantBooking}
                onInstantBookingChange={setInstantBooking}
                freeCancellation={freeCancellation}
                onFreeCancellationChange={setFreeCancellation}
                noDeposit={noDeposit}
                onNoDepositChange={setNoDeposit}
                selectedCharacteristics={selectedCharacteristics}
                onCharacteristicsChange={setSelectedCharacteristics}
                searchRadius={searchRadius}
                onSearchRadiusChange={(radius) => {
                  setSearchRadius(radius);
                  const params = new URLSearchParams(searchParams.toString());
                  if (radius === 'none') params.delete('radius');
                  else params.set('radius', radius.toString());
                  router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
                }}
                onClose={() => setShowMobileFiltersPopup(false)}
                onApplyFilters={() => {
                  handleApplyFilters();
                  setShowMobileFiltersPopup(false);
                }}
                filteredListingsCount={filteredListings.length}
                resetKey={filtersResetKey}
              />
            </div>
            {/* Espace réservé pour la barre de menu fixe en bas (ne jamais passer derrière) */}
            <div 
              className="flex-shrink-0 bg-white md:hidden" 
              style={{ height: 'max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5rem))' }} 
              aria-hidden 
            />
          </div>
        </div>
        )}

        {/* Advanced Filters Modal - Desktop */}
        {showAdvancedFilters && (
          <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-6 hidden md:block">
            <AdvancedFilters
              selectedTypes={selectedTypes}
              onTypesChange={setSelectedTypes}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              priceUnit={priceUnit}
              instantBooking={instantBooking}
              onInstantBookingChange={setInstantBooking}
              freeCancellation={freeCancellation}
              onFreeCancellationChange={setFreeCancellation}
              noDeposit={noDeposit}
              onNoDepositChange={setNoDeposit}
              selectedCharacteristics={selectedCharacteristics}
              onCharacteristicsChange={setSelectedCharacteristics}
              searchRadius={searchRadius}
              onSearchRadiusChange={(radius) => {
                setSearchRadius(radius);
                // Mettre à jour l'URL avec le nouveau rayon
                const params = new URLSearchParams(searchParams.toString());
                if (radius === 'none') {
                  params.delete('radius');
                } else {
                  params.set('radius', radius.toString());
                }
                // ✅ OPTIMISATION: Utiliser replace avec scroll: false
                router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
              }}
              onClose={() => {
                setShowAdvancedFilters(false);
                const params = new URLSearchParams(searchParams.toString());
                params.delete('showFilters');
                // ✅ OPTIMISATION: Utiliser replace avec scroll: false
                router.replace(`/search-parkings?${params.toString()}`, { scroll: false });
              }}
              onApplyFilters={handleApplyFilters}
              filteredListingsCount={filteredListings.length}
              resetKey={filtersResetKey}
            />
          </div>
        )}

        {/* Spacing après les filtres / avant le contenu - minimal pour éviter bloc blanc */}
        <div
          className={
            showAdvancedFilters
              ? 'pt-4'
              : (selectedTypes.length > 0 || priceRange[0] > 0 || priceRange[1] < getMaxPriceForUnit(priceUnit) || instantBooking !== null || freeCancellation !== null || noDeposit !== null || Object.keys(selectedCharacteristics).length > 0 || searchRadius !== 'none')
                ? 'pt-2'
                : 'pt-0'
          }
        />

        {effectiveLoading ? (
          <div className="text-center py-16 px-4 min-h-[60vh] flex flex-col items-center justify-center">
            <LoadingLogo size="md" />
            <AnimatedLoadingText label="Chargement des biens..." className="mt-4" />
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <div className="text-red-400 mb-4">
              <MapPin className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadPlaces(0, false)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 pb-12">
            {/* Message neuromarketing + Réinitialiser */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6 sm:py-8 border-b border-slate-100">
              <div className="max-w-xl">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                  Aucun espace ne correspond à vos critères pour le moment
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  Pas d&apos;inquiétude : des milliers d&apos;espaces vous attendent. Élargissez votre recherche, essayez d&apos;autres filtres ou découvrez ci‑dessous les espaces les plus plébiscités — vous trouverez l&apos;espace qu&apos;il vous faut.
                </p>
              </div>
              <button
                onClick={handleResetAllFilters}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer flex-shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                Réinitialiser les filtres
              </button>
            </div>
            {/* Espaces populaires pour inspirer (neuromarketing) */}
            <div className="pt-6 sm:pt-8">
              {isLoadingPopularSuggestions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : popularSuggestionsPlaces.length > 0 ? (
                <>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
                    Découvrez des espaces plébiscités par la communauté
                  </h3>
                  <FeaturedSpacesSection
                    title="Espaces populaires"
                    listings={popularSuggestionsPlaces}
                    maxItems={12}
                  />
                </>
              ) : (
                <p className="text-sm text-slate-500 py-4">
                  Réinitialisez les filtres ou essayez une autre destination pour voir plus d&apos;espaces.
                </p>
              )}
            </div>
          </div>
          ) : (
          <>
            {/* Mobile: Carte + volet fixés sous le header (aligné avec la hauteur réelle du header: safe-area + 56px) */}
            <div className="lg:hidden" style={{ minHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - 3.5rem)' }} aria-hidden="true" />
            <div
              className="lg:hidden fixed left-0 right-0 bottom-0 z-[15]"
              style={{
                top: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
                height: 'calc(100vh - env(safe-area-inset-top, 0px) - 3.5rem)',
              }}
            >
              {/* Carte mobile : pas de re-render au scroll (memo + areEqual). Conteneur isolé pour éviter repaints au mouvement du drawer. */}
              <div
                className="absolute inset-0 z-10"
                style={{ contain: 'layout paint', willChange: 'transform', transform: 'translateZ(0)' }}
              >
                {mapProperties.length > 0 ? (
                  <SearchMapMobile
                    ref={searchMapRef}
                    mapProperties={mapProperties}
                    mapCenter={mapCenter ?? undefined}
                    selectedListingId={selectedListingId ?? null}
                    skipGeolocationOnLoad={!!(cityFilter || latParam || lngParam)}
                    onPropertyClick={onMapPropertyClick}
                    onPropertyHover={onMapPropertyHover}
                    onMapMoveEnd={handleMapMoveEnd}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-100/95">
                    <div className="text-center text-slate-500 p-8">
                      <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                      <p className="text-sm font-medium">Aucun résultat à afficher</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton position — icône seule, au-dessus du drawer (mobile) */}
              {mapProperties.length > 0 && typeof navigator !== 'undefined' && 'geolocation' in navigator && (
                <div className="absolute top-3 right-3 z-30 pointer-events-none">
                  <button
                    style={{ pointerEvents: 'auto' }}
                    type="button"
                    onClick={() => searchMapRef.current?.goToMyPosition(true)}
                    className="flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/80 hover:bg-white hover:border-emerald-300 active:scale-95 transition-all cursor-pointer touch-manipulation"
                    aria-label="Centrer sur ma position"
                    title="Ma position"
                  >
                    <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                  </button>
                </div>
              )}

              {/* Volet déroulable - scroll haut = couvre la carte (jusqu'au header), scroll bas = retrouve la carte */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 will-change-[height]"
                style={{
                  height: `${Math.max(drawerPosition * 100, 38)}%`,
                  maxHeight: '98%',
                  minHeight: '38%',
                  // Pas de transition pendant le drag (fluidité), transition uniquement pour le snap final
                  transition: isDragging ? 'none' : 'height 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
              >
                {/* Handle pour tirer - drag uniquement sur le handle pour ne pas bloquer le scroll de la liste */}
                <div
                  className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-manipulation"
                  onTouchStart={(e) => {
                    const touch = e.touches?.[0];
                    if (!touch) return;
                    e.stopPropagation();
                    setIsDragging(true);
                    setDragStartY(touch.clientY);
                    setDragStartPosition(drawerPosition);
                    console.log(`[DRAWER] touchStart | startY=${touch.clientY.toFixed(0)} | drawerPos=${drawerPosition.toFixed(2)}`);
                  }}
                  onTouchMove={(e) => {
                    if (!isDragging) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const touch = e.touches?.[0];
                    if (!touch) return;
                    const currentY = touch.clientY;
                    const deltaY = dragStartY - currentY;
                    const windowHeight = window.innerHeight;
                    const newPosition = Math.max(0.38, Math.min(0.98, dragStartPosition + (deltaY / windowHeight)));
                    setDrawerPosition(newPosition);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    setIsDragging(false);
                    const snapTo = drawerPosition < 0.55 ? 0.38 : 0.98;
                    console.log(`[DRAWER] touchEnd | drawerPos=${drawerPosition.toFixed(2)} | snapTo=${snapTo}`);
                    if (snapTo === 0.38) {
                      hasExpandedByScrollRef.current = false;
                      setDrawerPosition(0.38);
                    } else {
                      hasExpandedByScrollRef.current = true;
                      setDrawerPosition(0.98);
                    }
                  }}
                >
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
                </div>

                {/* Liste : scroll natif uniquement (pas de preventDefault) pour rester stable sur iOS */}
              <div
                  ref={mobileDrawerScrollRef}
                  className="h-full overscroll-y-contain overscroll-x-none touch-pan-y pb-mobile-footer overflow-y-auto"
                  style={{
                    height: 'calc(100% - 2rem)',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehaviorY: 'contain',
                    scrollBehavior: 'auto',
                  }}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const scrollTop = el.scrollTop;
                    const prev = lastScrollTopRef.current;
                    lastScrollTopRef.current = scrollTop;
                    // Ouvrir le drawer quand l’utilisateur a scrollé > 60px dans la liste
                    if (scrollTop > 60 && !hasExpandedByScrollRef.current) {
                      hasExpandedByScrollRef.current = true;
                      lastExpandByScrollAtRef.current = Date.now();
                      setDrawerPosition(0.98);
                    }

                    // Refermer si l’utilisateur remonte tout en haut (garde 800ms anti-fermeture immédiate)
                    if (
                      scrollTop <= 2 &&
                      prev > 20 &&
                      drawerPosition > 0.5 &&
                      Date.now() - lastExpandByScrollAtRef.current > 800
                    ) {
                      hasExpandedByScrollRef.current = false;
                      setDrawerPosition(0.38);
                    }
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-1">
                    {effectiveLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm text-slate-500">Chargement...</p>
                        </div>
                      </div>
                    ) : sortedListings.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <MapPin className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                          <p className="text-sm text-slate-500">Aucun bien trouvé</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5">
                        {sortedListings.map((listing) => {
                        const TypeIcon = listing.type === 'parking' ? Car : listing.type === 'storage' ? Box : Warehouse;
                        const typeLabel = listing.type === 'parking' ? 'Parking' : listing.type === 'storage' ? 'Stockage' : 'Cave';

                        const listingHref = `/parking/${listing.id}/`;
                        return (
                          <CapacitorDynamicLink
                            key={listing.id}
                            href={listingHref}
                            data-testid="listing-card"
                            data-listing-id={listing.id}
                            aria-label={`Voir le bien ${(listing.title || listing.city || '').slice(0, 50)}`}
                            className={`group block rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer touch-manipulation active:scale-[0.99] min-h-[88px] ${
                              isLiked[listing.id]
                                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            {/* Title and Price */}
                            <div className="p-1.5 pb-1">
                              <div className="flex items-start justify-between gap-2 mb-0.5">
                                <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 flex-1 leading-snug">
                                  {formatTitle((listing.title ?? '').split(' - ')[0])}
                                </h3>
                                {(() => {
                                  let mainPrice: number | undefined;
                                  let mainPriceLabel: string;
                                  
                                  if (listing.type === 'parking') {
                                    mainPrice = listing.priceHourly;
                                    mainPriceLabel = 'h';
                                  } else {
                                    mainPrice = listing.priceDaily;
                                    mainPriceLabel = 'j';
                                  }
                                  
                                  if (!mainPrice) return null;
                                  
                                  return (
                                    <div className="flex items-baseline gap-0.5 shrink-0">
                                      <Euro className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                      <span className="text-sm font-bold text-emerald-600">
                                        {mainPrice}
                                      </span>
                                      <span className="text-[9px] text-emerald-600 ml-0.5">
                                        /{mainPriceLabel}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                              {/* Caution */}
                              {typeof listing.deposit === 'number' && listing.deposit > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Shield className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                  <span className="text-[9px] text-slate-600">
                                    Caution: <strong className="font-semibold">{listing.deposit.toFixed(2)} €</strong>
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Image */}
                            <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                              <Image
                                src={listing.image}
                                alt={listing.title}
                                fill
                                className="object-cover"
                                sizes="100vw"
                              />
                              
                              {/* Type Badge */}
                              <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full shadow-md flex items-center gap-1 border border-white/20">
                                <TypeIcon className="w-3 h-3 text-emerald-600 flex-shrink-0" strokeWidth={2.5} />
                                <span className="text-[9px] font-semibold text-slate-900">
                                  {typeLabel}
                                </span>
                              </div>

                              {/* Instant Booking Badge */}
                              {listing.instantBooking && (
                                <div className="absolute top-2 right-12 z-10 bg-emerald-500/95 backdrop-blur-md px-1.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-emerald-400/30" title="Réservation instantanée">
                                  <Zap className="w-3 h-3 text-white fill-white flex-shrink-0" strokeWidth={2.5} />
                                </div>
                              )}

                              {/* Favorite Button */}
                              <button
                                id={`btn-toggle-favorite-${listing.id}-search`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleLike(listing.id);
                                }}
                                disabled={isToggling[listing.id]}
                                className="absolute top-2 right-2 z-10 p-2 min-w-[44px] min-h-[44px] bg-white/90 backdrop-blur-md rounded-full shadow-md transition-all active:scale-95 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation flex items-center justify-center"
                                aria-label={isLiked[listing.id] ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                              >
                                <Heart
                                  className={`w-3 h-3 transition-all duration-200 ${
                                    isLiked[listing.id]
                                      ? 'fill-emerald-600 stroke-emerald-600 text-emerald-600'
                                      : 'fill-none stroke-slate-700 text-slate-700'
                                  }`}
                                  strokeWidth={2}
                                />
                              </button>
                            </div>

                            {/* Location and Rating */}
                            <div className="p-1.5 pt-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 text-xs text-slate-600 flex-1 min-w-0">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="line-clamp-1 truncate font-medium">{formatCity(listing.city)}</span>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {listing.reviewsCount && listing.reviewsCount > 0 ? (
                                    <>
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                                      <span className="text-[9px] font-semibold text-slate-900">{listing.rating ? (parseFloat(listing.rating.replace(',', '.')) * 2).toFixed(1).replace('.', ',') : '0'}/10</span>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full shadow-sm">
                                      <Zap className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600 flex-shrink-0" />
                                      <span className="text-[9px] font-bold text-emerald-700 whitespace-nowrap">Nouveau</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CapacitorDynamicLink>
                        );
                      })}
                      </div>
                    )}
                    {/* Sentinel infinite scroll - mobile */}
                    {hasMore && <div ref={loadMoreSentinelRef} className="h-4" aria-hidden />}
                    {isLoadingMore && (
                      <div className="flex justify-center py-4">
                        <LoadingLogo size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Layout classique avec liste à gauche et carte à droite */}
            <div className="hidden lg:grid lg:grid-cols-[3fr_2fr] gap-0 relative">
            {/* Listings Grid - Desktop: avec carte à droite */}
            <div className="px-4 lg:px-6 py-4 lg:py-6 overflow-visible">
              {/* Grille responsive avec cartes plus compactes - 3 colonnes max */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 w-full max-w-full">
              {sortedListings.map((listing) => {
              const TypeIcon = listing.type === 'parking' ? Car : listing.type === 'storage' ? Box : Warehouse;
              const typeLabel = listing.type === 'parking' ? 'Parking' : listing.type === 'storage' ? 'Stockage' : 'Cave';

              return (
                        <CapacitorDynamicLink
                          key={listing.id}
                          href={`/parking/${listing.id}/`}
                          data-testid="listing-card"
                          data-listing-id={listing.id}
                          onMouseEnter={() => setHoveredListingId(listing.id)}
                          onMouseLeave={() => setHoveredListingId(null)}
                          className={`group block rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 cursor-pointer touch-manipulation ${
                            isLiked[listing.id]
                              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:border-emerald-300'
                              : 'bg-white border-slate-200 hover:border-emerald-300'
                          } ${
                            hoveredListingId === listing.id
                              ? 'ring-2 ring-emerald-500 ring-offset-2'
                              : ''
                          }`}
                        >
                  {/* Title and Price - Top - Mobile: Compact - Padding réduit */}
                  <div className="p-2 sm:p-3 pb-1.5 sm:pb-2">
                    <div className="flex items-start justify-between gap-2 mb-1 sm:mb-1.5">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors flex-1 leading-snug">
                        {formatTitle((listing.title ?? '').split(' - ')[0])}
                      </h3>
                      {(() => {
                        // Prix par défaut selon le type : parking = heure, autres = jour
                        let mainPrice: number | undefined;
                        let mainPriceLabel: string;
                        
                        if (listing.type === 'parking') {
                          // Pour les parkings : prix à l'heure par défaut
                          mainPrice = listing.priceHourly;
                          mainPriceLabel = 'h';
                        } else {
                          // Pour les autres types (storage, cellar) : prix par jour par défaut
                          mainPrice = listing.priceDaily;
                          mainPriceLabel = 'j';
                        }
                        
                        if (!mainPrice) return null;
                        
                        return (
                          <div className="flex items-baseline gap-0.5 shrink-0">
                            <Euro className="w-3 h-3 sm:w-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="text-sm sm:text-base font-bold text-emerald-600">
                              {mainPrice}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-emerald-600 ml-0.5">
                              /{mainPriceLabel}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Caution - Affichage si présente */}
                    {typeof listing.deposit === 'number' && listing.deposit > 0 && (
                      <div className="flex items-center gap-1 mt-1 sm:mt-1.5">
                        <Shield className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="text-[9px] sm:text-[10px] text-slate-600">
                          Caution: <strong className="font-semibold">{listing.deposit.toFixed(2)} €</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Image Container - Taille réduite */}
                  <div className="relative aspect-[16/9] sm:aspect-[2/1] overflow-hidden bg-slate-100">
                    <Image
                      src={listing.image}
                      alt={listing.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    />
                    
                    {/* Type Badge - Mobile: Compact - Taille réduite */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 bg-white/95 backdrop-blur-md px-2 sm:px-2.5 py-1 sm:py-1 rounded-full shadow-md flex items-center gap-1 sm:gap-1.5 border border-white/20">
                      <TypeIcon className="w-3 h-3 sm:w-3 text-emerald-600 flex-shrink-0" strokeWidth={2.5} />
                      <span className="text-[9px] sm:text-[10px] font-semibold text-slate-900">
                        {typeLabel}
                      </span>
                    </div>

                    {/* Mini Icons - Security & 24h & Instant Booking - Mobile: Compact - Taille réduite */}
                    <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-10 flex items-center gap-1.5 sm:gap-2">
                      {listing.instantBooking && (
                        <div className="bg-emerald-500/95 backdrop-blur-md px-1.5 sm:px-1.5 py-1 rounded-lg shadow-md border border-emerald-400/30" title="Réservation instantanée">
                          <Zap className="w-3 h-3 sm:w-3 text-white fill-white" />
                        </div>
                      )}
                      {listing.features && listing.features.some(f => f.toLowerCase().includes('sécurisé') || f.toLowerCase().includes('surveillance')) && (
                        <div className="bg-white/95 backdrop-blur-md px-1.5 sm:px-1.5 py-1 rounded-lg shadow-md border border-white/20" title="Sécurisé">
                          <Shield className="w-3 h-3 sm:w-3 text-emerald-600" />
                        </div>
                      )}
                      {listing.features && listing.features.some(f => f.toLowerCase().includes('24h')) && (
                        <div className="bg-white/95 backdrop-blur-md px-1.5 sm:px-1.5 py-1 rounded-lg shadow-md border border-white/20" title="Accès 24h/24">
                          <Clock className="w-3 h-3 sm:w-3 text-emerald-600" />
                        </div>
                      )}
                    </div>

                    {/* Favorite Button - Mobile: Compact - Taille réduite */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleLike(listing.id);
                      }}
                      disabled={isToggling[listing.id]}
                      className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 bg-white/90 backdrop-blur-md rounded-full shadow-md transition-all hover:scale-110 active:scale-95 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation flex items-center justify-center"
                      aria-label={isLiked[listing.id] ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Heart
                        className={`w-3 h-3 sm:w-3.5 transition-all duration-200 ${
                          isLiked[listing.id]
                            ? 'fill-emerald-600 stroke-emerald-600 text-emerald-600 scale-110'
                            : 'fill-none stroke-slate-700 text-slate-700 hover:stroke-emerald-600'
                        }`}
                        strokeWidth={2}
                      />
                    </button>
                  </div>

                  {/* Location and Rating - Bottom - Mobile: Compact - Texte réduit */}
                  <div className="p-2 sm:p-3 pt-1.5 sm:pt-2">
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-600 flex-1 min-w-0">
                        <MapPin className="w-3 h-3 sm:w-3 shrink-0" />
                        <span className="line-clamp-1 truncate font-medium">{formatCity(listing.city)}</span>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        {listing.reviewsCount && listing.reviewsCount > 0 ? (
                          <>
                            <Star className="w-3 h-3 sm:w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-900">{listing.rating ? (parseFloat(listing.rating.replace(',', '.')) * 2).toFixed(1).replace('.', ',') : '0'}/10</span>
                            <span className="text-[9px] sm:text-[10px] text-slate-500 hidden sm:inline">({listing.reviewsCount})</span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-50 border border-emerald-200 rounded-full shadow-sm">
                            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 fill-emerald-600 flex-shrink-0" />
                            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 whitespace-nowrap">Nouveau</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CapacitorDynamicLink>
              );
            })}
              </div>
              {/* Sentinel infinite scroll - desktop */}
              {hasMore && <div ref={loadMoreSentinelDesktopRef} className="h-4 min-h-4" aria-hidden />}
              {isLoadingMore && (
                <div className="flex justify-center py-6 col-span-full">
                  <LoadingLogo size="sm" />
                </div>
              )}
            </div>

            {/* Carte Leaflet - Panneau de droite - Sticky pour rester visible pendant le scroll */}
            <div 
              className="hidden lg:block bg-slate-50 border-l border-slate-200 z-30 relative" 
              style={{ 
                position: 'sticky',
                top: '5.5rem', // En dessous du header (4rem) + filtres sticky (~1.5rem)
                height: 'calc(100vh - 5.5rem)',
                maxHeight: 'calc(100vh - 5.5rem)',
                overflow: 'hidden', 
                pointerEvents: 'auto',
                alignSelf: 'flex-start'
              }}
            >
              {/* Bouton "Rechercher dans cette zone" après déplacement de la carte (desktop) */}
              {showSearchAreaButton && mapProperties.length > 0 && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
                  <button
                    type="button"
                    onClick={handleSearchAreaClick}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg border border-emerald-700/50 transition-all cursor-pointer"
                    aria-label="Rechercher les biens dans cette zone"
                  >
                    <Search className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                    <span>Rechercher dans cette zone</span>
                  </button>
                </div>
              )}
              {mapProperties.length > 0 ? (
                <PropertiesMap
                  key="search-map-desktop" // ✅ OPTIMISATION: Clé stable pour éviter le remontage complet
                  properties={mapProperties}
                  selectedPropertyId={selectedListingId}
                  center={mapCenter}
                  skipGeolocationOnLoad={!!(cityFilter || latParam || lngParam)}
                  onMapMoveEnd={handleMapMoveEnd}
                  onPropertyClick={(id) => {
                    const listingId = typeof id === 'number' ? id : parseInt(String(id), 10);
                    setSelectedListingId(listingId);
                    // Ne pas faire de scroll automatique, juste sélectionner le bien
                  }}
                  onPropertyHover={(id) => {
                    setHoveredListingId(id ? (typeof id === 'number' ? id : parseInt(String(id), 10)) : null);
                  }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-100/95">
                  <div className="text-center text-slate-500 p-8">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-sm font-medium">Aucun résultat à afficher</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </main>

      <FooterNavigation />

      <AlertModal
        isOpen={showGeoAlert}
        onClose={() => setShowGeoAlert(false)}
        title="Géolocalisation"
        message={geoAlertMessage}
        buttonText="OK"
      />
    </div>
  );
}

export default function SearchParkingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
