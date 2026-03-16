'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Car, Box, Warehouse, Calendar, MapPin, Filter, X, Check, User, UserCircle2, ChevronDown, ChevronLeft, ChevronRight, BookOpen, Heart, MessageSquare, Settings, LogOut, Globe, CheckCircle, Gift, FileText, BarChart3, Menu, SlidersHorizontal, Ruler, Lock, Key, Shield, Ban, Lightbulb, Wrench, Package, Navigation } from 'lucide-react';
import { cn, capitalizeFirstPerLine } from '@/lib/utils';
import { removeItem } from '@/lib/storage';
import { useSearch } from '@/contexts/SearchContext';
import { isCapacitor, handleCapacitorLinkClick } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { registerModalClose, unregisterModalClose } from '@/lib/capacitor-modal-back';
import { messagesAPI, placesAPI, AvailableFilters, rentoallUsersAPI, locationsAPI, getBaseURLForOAuth2, UserDTO } from '@/services/api';
import AdvancedFilters from '@/components/sections/AdvancedFilters';
import AlertModal from '@/components/ui/alert-modal';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderNavigationProps {
  onSearchClick?: () => void;
  /** Label pour la barre de recherche mobile (ex: "Destination", "Paris", "À proximité") */
  searchDestinationLabel?: string;
  /** Callback pour ouvrir les filtres avancés sur mobile */
  onFilterClick?: () => void;
  /** Indique si des filtres sont actifs (style bouton) */
  hasActiveFilters?: boolean;
  /** Nombre de filtres actifs (pour la pastille) — utilisé quand la page contrôle les filtres (ex: search-parkings) */
  activeFilterCount?: number;
}

export default function HeaderNavigation({ onSearchClick, searchDestinationLabel, onFilterClick, hasActiveFilters, activeFilterCount }: HeaderNavigationProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const { 
    city,
    setCity,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedTypes,
    setSelectedTypes,
    setSelectedCityCoords: setContextCityCoords
  } = useSearch();
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showClientSpaceMenu, setShowClientSpaceMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearchFilters, setShowMobileSearchFilters] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMode, setUserMode] = useState<'client' | 'host'>('client'); // Mode par défaut : client
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [hasPlaces, setHasPlaces] = useState(false); // Indique si l'utilisateur a au moins un bien
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  const [bankingInfoNeeded, setBankingInfoNeeded] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [priceUnit, setPriceUnit] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [instantBooking, setInstantBooking] = useState<boolean | null>(null);
  const [freeCancellation, setFreeCancellation] = useState<boolean | null>(null);
  const [noDeposit, setNoDeposit] = useState<boolean | null>(null);
  const [selectedCharacteristics, setSelectedCharacteristics] = useState<Record<string, string[]>>({});
  const [searchRadius, setSearchRadius] = useState<'none' | 5 | 10 | 20 | 50>('none'); // Rayon de recherche en km
  
  // États pour la recherche refactorisée
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [availableCities, setAvailableCities] = useState<Array<{ name: string; postalCode: string; lat?: number; lng?: number }>>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [titleSearchPlaces, setTitleSearchPlaces] = useState<Array<{ id: number; description?: string; city?: string; pricePerHour?: number; pricePerDay?: number; type?: string }>>([]); // Biens trouvés par titre si aucune ville
  const [selectedPlaceType, setSelectedPlaceType] = useState<'PARKING' | 'CAVE' | 'STORAGE_SPACE' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showGeoAlert, setShowGeoAlert] = useState(false);
  const [geoAlertMessage, setGeoAlertMessage] = useState('');
  const [selectedCityCoords, setSelectedCityCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Champ de saisie libre mobile (comme sur le web) : permet de taper directement sans ouvrir le dropdown Ville
  const [mobileSearchText, setMobileSearchText] = useState('');
  // Mobile ou Capacitor : logo et liens vers search-parkings ou /host/my-places (pas de homepage)
  const [isMobileOrCap, setIsMobileOrCap] = useState(() =>
    typeof window !== 'undefined' && (window.innerWidth < 768 || isCapacitor())
  );
  const mobileSearchFiltersCloseRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!showMobileSearchFilters || typeof window === 'undefined') return;
    const handler = () => setShowMobileSearchFilters(false);
    mobileSearchFiltersCloseRef.current = handler;
    registerModalClose(handler);
    return () => {
      if (mobileSearchFiltersCloseRef.current) {
        unregisterModalClose(mobileSearchFiltersCloseRef.current);
        mobileSearchFiltersCloseRef.current = null;
      }
    };
  }, [showMobileSearchFilters]);

  useEffect(() => {
    const check = () => setIsMobileOrCap(window.innerWidth < 768 || isCapacitor());
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Vérifier l'état de connexion et le mode utilisateur
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        const loggedIn = localStorage.getItem('finalIsLoggedIn') === 'true';
        setIsLoggedIn(!!token || loggedIn);
        
        // Récupérer le mode utilisateur depuis localStorage
        const savedMode = localStorage.getItem('userMode') as 'client' | 'host' | null;
        if (savedMode === 'client' || savedMode === 'host') {
          setUserMode(savedMode);
        } else {
          // Par défaut, mode client
          setUserMode('client');
          localStorage.setItem('userMode', 'client');
        }
      }
    };

    checkAuth();
    
    // Écouter les changements de localStorage (depuis d'autres onglets)
    const handleStorageChange = () => checkAuth();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('logout', handleStorageChange);
    
    // Écouter les changements de mode utilisateur (même page)
    const handleUserModeChange = () => checkAuth();
    window.addEventListener('userModeChanged', handleUserModeChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('logout', handleStorageChange);
      window.removeEventListener('userModeChanged', handleUserModeChange);
    };
  }, []);

  // Charger les biens de l'utilisateur pour déterminer le texte du bouton
  useEffect(() => {
    const loadUserPlaces = async () => {
      if (!isLoggedIn) {
        setHasPlaces(false);
        return;
      }
      
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setHasPlaces(false);
          return;
        }
        
        // Récupérer les biens de l'utilisateur
        const userIdNum = parseInt(userId, 10);
        const places = await placesAPI.getOwnerCalendarOverview(userIdNum);
        setHasPlaces(places && places.length > 0);
      } catch (error) {
        console.error('Erreur lors du chargement des biens:', error);
        setHasPlaces(false);
      }
    };

    loadUserPlaces();
  }, [isLoggedIn]);

  // Charger la photo de profil de l'utilisateur
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isLoggedIn) {
        console.log('🔵 [HEADER] Utilisateur non connecté, pas de photo de profil');
        setUserProfilePicture(null);
        return;
      }
      
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.log('🔵 [HEADER] Pas de userId dans localStorage');
          setUserProfilePicture(null);
          return;
        }
        
        const userIdNum = parseInt(userId, 10);
        console.log('🔵 [HEADER] Chargement de la photo de profil pour userId:', userIdNum);
        const userProfile = await rentoallUsersAPI.getProfile(userIdNum);
        if (!userProfile) {
          setUserProfilePicture(null);
          return;
        }
        console.log('🔵 [HEADER] Profil récupéré complet:', userProfile);
        console.log('🔵 [HEADER] Détails photo:', {
          hasProfilePicture: !!userProfile?.profilePicture,
          profilePicture: userProfile?.profilePicture,
          profilePictureType: typeof userProfile?.profilePicture,
          hasPhoto: !!userProfile?.photo,
          photoUrl: userProfile?.photo?.url,
          photoType: typeof userProfile?.photo
        });
        
        // Vérifier les différents formats possibles : profilePicture (string) ou photo.url (PhotoDTO)
        let profilePictureUrl: string | null = null;
        
        // Priorité 1: profilePicture direct (string)
        if (userProfile?.profilePicture) {
          if (typeof userProfile.profilePicture === 'string' && userProfile.profilePicture.trim() !== '') {
            profilePictureUrl = userProfile.profilePicture;
          }
        }
        
        // Priorité 2: photo.url (PhotoDTO)
        if (!profilePictureUrl && userProfile?.photo) {
          if (typeof userProfile.photo === 'object' && userProfile.photo.url) {
            if (typeof userProfile.photo.url === 'string' && userProfile.photo.url.trim() !== '') {
              profilePictureUrl = userProfile.photo.url;
            }
          }
        }
        
        // Si l'URL est relative, essayer de construire l'URL complète
        if (profilePictureUrl && !profilePictureUrl.startsWith('http') && !profilePictureUrl.startsWith('data:')) {
          // Si c'est une URL relative, essayer de la compléter avec l'URL de base de l'API
          const baseURL = getBaseURLForOAuth2();
          if (profilePictureUrl.startsWith('/')) {
            profilePictureUrl = `${baseURL}${profilePictureUrl}`;
          } else {
            profilePictureUrl = `${baseURL}/${profilePictureUrl}`;
          }
        }
        
        if (profilePictureUrl) {
          console.log('✅ [HEADER] Photo de profil trouvée et définie:', profilePictureUrl);
          setUserProfilePicture(profilePictureUrl);
        } else {
          console.log('⚠️ [HEADER] Aucune photo de profil valide dans le profil utilisateur');
          setUserProfilePicture(null);
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          console.warn('⚠️ [HEADER] Profil utilisateur non trouvé (404), photo non affichée.');
        } else {
          console.error('❌ [HEADER] Erreur lors du chargement de la photo de profil:', error);
        }
        setUserProfilePicture(null);
      }
    };

    loadUserProfile();
    
    // Écouter les événements de mise à jour du profil
    const handleProfileUpdate = () => {
      console.log('🔄 [HEADER] Événement de mise à jour du profil détecté');
      loadUserProfile();
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [isLoggedIn]);

  // En mode hôte : badge "infos bancaires à compléter" sur le lien Paramètres
  useEffect(() => {
    const loadBankingStatus = async () => {
      if (!isLoggedIn || userMode !== 'host') {
        setBankingInfoNeeded(false);
        return;
      }
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setBankingInfoNeeded(false);
        return;
      }
      try {
        const profile = await rentoallUsersAPI.getProfile(parseInt(userId, 10)) as UserDTO & { stripeAccountId?: string };
        const stripeAccountId = profile.stripeAccountId;
        const iban = profile.iban;
        const stripeOk = !!stripeAccountId;
        const ibanOk = typeof iban === 'string' && iban.trim().length > 0;
        setBankingInfoNeeded(!(stripeOk && ibanOk));
      } catch {
        setBankingInfoNeeded(false);
      }
    };

    loadBankingStatus();
    const onBankingUpdated = () => loadBankingStatus();
    window.addEventListener('bankingInfoUpdated', onBankingUpdated);
    return () => window.removeEventListener('bankingInfoUpdated', onBankingUpdated);
  }, [isLoggedIn, userMode]);

  // Charger le compteur de messages non lus
  useEffect(() => {
    // Vérifier l'état de connexion directement dans le useEffect pour éviter les dépendances qui changent
    const checkAndLoadUnreadCount = async () => {
      const token = localStorage.getItem('authToken');
      const loggedIn = localStorage.getItem('finalIsLoggedIn') === 'true';
      const actuallyLoggedIn = !!token || loggedIn;
      
      if (!actuallyLoggedIn) {
        setUnreadMessagesCount(0);
        return;
      }
      
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const count = await messagesAPI.getUnreadCount(parseInt(userId, 10));
          setUnreadMessagesCount(count);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du compteur de messages:', error);
      }
    };

    // Charger immédiatement seulement si connecté
    const token = localStorage.getItem('authToken');
    const loggedIn = localStorage.getItem('finalIsLoggedIn') === 'true';
    if (!!token || loggedIn) {
      checkAndLoadUnreadCount();
    } else {
      setUnreadMessagesCount(0);
    }
    
    // Écouter l'événement quand les messages sont lus pour mettre à jour immédiatement
    let messagesReadTimeout: NodeJS.Timeout | null = null;
    const handleMessagesRead = () => {
      if (messagesReadTimeout) {
        clearTimeout(messagesReadTimeout);
      }
      // Court délai pour laisser le backend persister, puis rafraîchir le compteur
      messagesReadTimeout = setTimeout(() => {
        checkAndLoadUnreadCount();
      }, 800);
    };
    
    window.addEventListener('messagesRead', handleMessagesRead);

    // Recharger le compteur quand l'utilisateur revient sur l'onglet (après refresh ou changement d'onglet)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndLoadUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Rafraîchir toutes les 60 secondes seulement si connecté
    let interval: NodeJS.Timeout | null = null;
    if (!!token || loggedIn) {
      interval = setInterval(checkAndLoadUnreadCount, 60000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (messagesReadTimeout) {
        clearTimeout(messagesReadTimeout);
      }
      window.removeEventListener('messagesRead', handleMessagesRead);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Pas de dépendances pour éviter les boucles

  // Fonction pour basculer entre les modes
  const toggleUserMode = () => {
    const newMode = userMode === 'client' ? 'host' : 'client';
    if (typeof window !== 'undefined') {
      localStorage.setItem('userMode', newMode);
      setUserMode(newMode);
      window.dispatchEvent(new Event('userModeChanged'));
      // Mobile/Capacitor : pas de homepage — host → annonces, client → search
      const target = isMobileOrCap
        ? (newMode === 'host' ? '/host/my-places' : '/search-parkings')
        : '/home';
      router.push(target);
    }
  };
  
  // Types de biens disponibles (enum du back)
  const placeTypes = [
    { value: 'PARKING' as const, label: t('parking.type.parking'), icon: Car },
    { value: 'STORAGE_SPACE' as const, label: t('parking.type.storage'), icon: Box },
    { value: 'CAVE' as const, label: t('parking.type.cellar'), icon: Warehouse }
  ];

  // Rechercher des villes via l'API, puis fallback recherche par titre si aucune ville
  useEffect(() => {
    const searchCitiesAndFallback = async () => {
      if (!citySearchQuery || citySearchQuery.length < 2) {
        setAvailableCities([]);
        setTitleSearchPlaces([]);
        return;
      }

      setIsLoadingCities(true);
      setTitleSearchPlaces([]);
      try {
        const results = await locationsAPI.searchCities(citySearchQuery);
        const cities = results.map(result => ({
          name: result.cityName || result.cityNameNormalized || '',
          postalCode: result.postalCode || '',
          lat: result.latitude ?? result.lat,
          lng: result.longitude ?? result.lng,
        })).filter(c => c.name);
        setAvailableCities(cities);

        // Si aucune ville trouvée : fallback sur la recherche par titre/description des biens
        if (cities.length === 0) {
          try {
            const places = await placesAPI.search({ title: citySearchQuery, size: 20 });
            setTitleSearchPlaces(Array.isArray(places) ? places : []);
          } catch {
            setTitleSearchPlaces([]);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la recherche de villes:', error);
        setAvailableCities([]);
        setTitleSearchPlaces([]);
      } finally {
        setIsLoadingCities(false);
      }
    };

    const timeoutId = setTimeout(searchCitiesAndFallback, 300); // Debounce de 300ms
    return () => clearTimeout(timeoutId);
  }, [citySearchQuery]);
  
  // Refs pour les menus
  const cityPickerRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const typePickerRef = useRef<HTMLDivElement>(null);
  const clientSpaceMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // Fermer les menus quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (cityPickerRef.current && !cityPickerRef.current.contains(target)) {
        setShowCityPicker(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setShowDatePicker(false);
      }
      if (typePickerRef.current && !typePickerRef.current.contains(target)) {
        setShowTypePicker(false);
      }
      if (clientSpaceMenuRef.current && !clientSpaceMenuRef.current.contains(target)) {
        setShowClientSpaceMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target) && !(target as Element).closest('[data-mobile-menu-trigger]')) {
        setShowMobileMenu(false);
      }
    };
    
    if (showCityPicker || showDatePicker || showTypePicker || showClientSpaceMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCityPicker, showDatePicker, showTypePicker, showClientSpaceMenu, showMobileMenu]);

  // Empêcher le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileMenu]);

  // Réinitialiser le type du header quand la page search-parkings réinitialise tous les filtres
  useEffect(() => {
    const onSearchFiltersReset = () => {
      setSelectedPlaceType(null);
    };
    window.addEventListener('searchFiltersReset', onSearchFiltersReset);
    return () => window.removeEventListener('searchFiltersReset', onSearchFiltersReset);
  }, []);

  const formatDateRange = () => {
    if (!startDate && !endDate) return t('header.dates');
    if (startDate && !endDate) {
      return `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }
    return 'Dates';
  };

  const formatTypeDisplay = () => {
    if (!selectedPlaceType) return 'Type';
    const type = placeTypes.find(t => t.value === selectedPlaceType);
    return type?.label || 'Type';
  };

  const handleDateSelect = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Première sélection ou nouvelle sélection : définir startDate et réinitialiser endDate
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Deuxième sélection : définir endDate
      if (date < startDate) {
        // Si la date sélectionnée est avant startDate, inverser les dates
        setEndDate(startDate);
        setStartDate(date);
      } else {
        // Sinon, définir endDate normalement
        setEndDate(date);
      }
      // Fermer le date picker et ouvrir le type après avoir sélectionné la deuxième date
      setShowDatePicker(false);
      setShowTypePicker(true);
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
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    // Si on a déjà une date de début et qu'on sélectionne la date de fin, 
    // la date de fin doit être >= date de début
    if (startDate && !endDate) {
      const startDateOnly = new Date(startDate);
      startDateOnly.setHours(0, 0, 0, 0);
      return dateOnly >= startDateOnly && dateOnly >= today;
    }
    
    // Sinon, la date doit juste être >= aujourd'hui
    return dateOnly >= today;
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

  // Fonction pour construire les paramètres de recherche (réutilisable)
  // cityOverride : utilisé sur mobile quand l'utilisateur tape dans le champ de recherche libre
  // placeTypeOverride : utilisé quand on lance la recherche depuis le sélecteur de type (évite closure stale)
  const buildSearchParams = (cityOverride?: string, placeTypeOverride?: 'PARKING' | 'CAVE' | 'STORAGE_SPACE' | null, coordsOverride?: { lat: number; lng: number }) => {
    const urlParams = new URLSearchParams();
    const effectiveCity = (cityOverride !== undefined && cityOverride !== null ? cityOverride : city)?.trim();
    const effectiveType = placeTypeOverride !== undefined ? placeTypeOverride : selectedPlaceType;

      // ========== 1. CRITÈRES CLASSIQUES ==========
      
      // Ville (recherche textuelle) - pas de ville quand "À proximité" (coordsOverride)
      if (effectiveCity && !coordsOverride) {
        urlParams.set('city', effectiveCity);
        console.log('🔍 [HEADER SEARCH] Ville:', effectiveCity);
      }

      // Type de bien
      if (effectiveType) {
        urlParams.set('type', effectiveType);
        console.log('🔍 [HEADER SEARCH] Type:', effectiveType);
      }

      // Dates (format YYYY-MM-DD pour ISO)
      if (startDate) {
        const availableFrom = startDate.toISOString().split('T')[0];
        urlParams.set('availableFrom', availableFrom);
        console.log('🔍 [HEADER SEARCH] Date début:', availableFrom);
      }
      if (endDate) {
        const availableTo = endDate.toISOString().split('T')[0];
        urlParams.set('availableTo', availableTo);
        console.log('🔍 [HEADER SEARCH] Date fin:', availableTo);
      }

      // Prix maximum (maxPrice en décimal)
      if (priceRange[1] < 500) {
        urlParams.set('maxPrice', priceRange[1].toString());
        console.log('🔍 [HEADER SEARCH] Prix max:', priceRange[1]);
      }

      // ========== 2. RECHERCHE GÉOGRAPHIQUE ==========
      // Si on a les coordonnées (À proximité ou ville sélectionnée), utiliser la recherche géographique (prioritaire)
      const coords = coordsOverride ?? (!cityOverride && selectedCityCoords ? selectedCityCoords : null);
      const useCoords = coords && coords.lat != null && coords.lng != null;
      console.log('🔍 [HEADER SEARCH] Vérification des coordonnées:', {
        coords,
        cityOverride: cityOverride ?? null,
        useCoords
      });
      
      if (useCoords && coords) {
        urlParams.set('lat', coords.lat.toString());
        urlParams.set('lng', coords.lng.toString());
        // Rayon 50 km par défaut pour afficher les biens les plus proches (comportement Airbnb)
        const radius = searchRadius !== 'none' ? searchRadius : 50;
        urlParams.set('radius', radius.toString());
        console.log('🔍 [HEADER SEARCH] ✅ Coordonnées + rayon ajoutés à l\'URL:', {
          lat: coords.lat,
          lng: coords.lng,
          radius
        });
        // Note: Le backend ignorera 'city' si lat/lng sont présents
      } else {
        console.warn('🔍 [HEADER SEARCH] ⚠️ Pas de coordonnées disponibles, recherche textuelle uniquement');
      }
      
      if (effectiveCity && searchRadius !== 'none' && !useCoords) {
        // Si on a seulement la ville (sans coordonnées) et un rayon, envoyer city + radius
        // Le backend fera le géocodage automatiquement
        urlParams.set('radius', searchRadius.toString());
        console.log('🔍 [HEADER SEARCH] Recherche par ville avec rayon:', {
          city: effectiveCity,
          radius: searchRadius
        });
      }

      // ========== 3. FILTRES TRANSVERSES (BOOLÉENS) ==========
      
      // Réservation instantanée
      if (instantBooking === true) {
        urlParams.set('instantBooking', 'true');
        console.log('🔍 [HEADER SEARCH] Réservation instantanée: true');
      } else if (instantBooking === false) {
        urlParams.set('instantBooking', 'false');
        console.log('🔍 [HEADER SEARCH] Réservation instantanée: false');
      }

      // Annulation gratuite
      if (freeCancellation === true) {
        urlParams.set('freeCancellation', 'true');
        console.log('🔍 [HEADER SEARCH] Annulation gratuite: true');
      } else if (freeCancellation === false) {
        urlParams.set('freeCancellation', 'false');
        console.log('🔍 [HEADER SEARCH] Annulation gratuite: false');
      }

      // Pas de caution (via deposit=0 ou caractéristique)
      if (noDeposit === true) {
        // Envoyer comme caractéristique si le backend le supporte
        urlParams.set('deposit', '0');
        console.log('🔍 [HEADER SEARCH] Sans caution: true');
      }

      // ========== 4. CARACTÉRISTIQUES DYNAMIQUES ==========
      // Format: KEY=VALUE directement dans les query params (selon spec backend)
      // Les caractéristiques sont stockées comme: { type: ['KEY_OPTION', 'KEY_VALUE', ...] }
      // Exemples de format stocké:
      // - "VEHICLE_TYPE_Moto" → doit devenir VEHICLE_TYPE=Moto
      // - "ELECTRIC_CHARGING_STATION_Oui" → doit devenir ELECTRIC_CHARGING_STATION=Oui
      // - "VIDEO_SURVEILLANCE" → doit devenir VIDEO_SURVEILLANCE=true (booléen)
      
      Object.entries(selectedCharacteristics).forEach(([type, values]) => {
        if (values && values.length > 0) {
          values.forEach((value: string) => {
            if (value.includes('_')) {
              // Caractéristique avec valeur (format: KEY_OPTION ou KEY_VALUE)
              // Split sur le dernier underscore pour séparer la clé de la valeur
              const lastUnderscoreIndex = value.lastIndexOf('_');
              const keyPart = value.substring(0, lastUnderscoreIndex);
              const valuePart = value.substring(lastUnderscoreIndex + 1);
              
              // Envoyer "Oui" ou "Non" (exactement) au backend pour les booléens
              let finalValue = valuePart;
              if (valuePart === 'Oui' || valuePart === 'Yes' || valuePart === 'true') {
                finalValue = 'Oui';
              } else if (valuePart === 'Non' || valuePart === 'No' || valuePart === 'false') {
                finalValue = 'Non';
              }
              
              // Ajouter directement comme query param (le backend les traitera comme caractéristiques)
              urlParams.set(keyPart, finalValue);
              console.log(`🔍 [HEADER SEARCH] Caractéristique: ${keyPart}=${finalValue}`);
            } else {
              // Caractéristique simple (booléenne, valeur par défaut: Oui)
              urlParams.set(value, 'Oui');
              console.log(`🔍 [HEADER SEARCH] Caractéristique booléenne: ${value}=Oui`);
            }
          });
        }
      });

      // ========== 5. PAGINATION (optionnel, valeurs par défaut backend) ==========
      // Le backend utilise page=0 et size=20 par défaut
      // On peut les laisser vides ou les définir explicitement si besoin
      // urlParams.set('page', '0');
      // urlParams.set('size', '20');

    console.log('🔍 [HEADER SEARCH] ========================================');
    console.log('🔍 [HEADER SEARCH] URL finale:', `/search-parkings?${urlParams.toString()}`);
    console.log('🔍 [HEADER SEARCH] Paramètres:', Object.fromEntries(urlParams.entries()));
    console.log('🔍 [HEADER SEARCH] ========================================');

    return urlParams;
  };

  const handleSearch = async (mobileCityOverride?: string, placeTypeOverride?: 'PARKING' | 'CAVE' | 'STORAGE_SPACE' | null) => {
    setIsSearching(true);
    try {
      console.log('🔍 [HEADER SEARCH] ========================================');
      console.log('🔍 [HEADER SEARCH] Début de la recherche');
      console.log('🔍 [HEADER SEARCH] ========================================');

      const urlParams = buildSearchParams(mobileCityOverride, placeTypeOverride);

      // Naviguer vers la page de résultats
      router.push(`/search-parkings?${urlParams.toString()}`);
    } catch (error) {
      console.error('❌ [HEADER SEARCH] Erreur lors de la recherche:', error);
      // TODO: Afficher un message d'erreur à l'utilisateur
    } finally {
      setIsSearching(false);
    }
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
        setCity('À proximité');
        setSelectedCityCoords({ lat, lng });
        setContextCityCoords({ lat, lng });
        const urlParams = buildSearchParams('', undefined, { lat, lng });
        setShowCityPicker(false);
        router.push(`/search-parkings?${urlParams.toString()}`);
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

  // Fonction pour appliquer les filtres depuis le modal AdvancedFilters
  const handleApplyFilters = () => {
    const urlParams = buildSearchParams(undefined);
    // Naviguer vers la page de résultats avec les filtres
    router.push(`/search-parkings?${urlParams.toString()}`);
    // Fermer le modal
    setShowAdvancedFilters(false);
  };

  // Déclencher automatiquement la recherche quand la ville, la date ou le type change
  // mais seulement si on est déjà sur la page de recherche
  // IMPORTANT: Ne pas exécuter quand on est sur /search-parkings car la page gère elle-même l'URL et les filtres
  // (sinon on écrase instantBooking et autres filtres avec l'état du header qui n'est pas synchronisé)
  const prevSearchParamsRef = useRef<string>('');
  useEffect(() => {
    const isSearchPage = pathname === '/search-parkings' || pathname === '/search' || pathname?.startsWith('/search');
    if (pathname === '/search-parkings') return; // La page search-parkings gère l'URL elle-même
    if (isSearchPage && (city || selectedPlaceType || startDate || endDate)) {
      // Construire les paramètres de recherche
      const urlParams = buildSearchParams(undefined);
      const searchParamsString = urlParams.toString();
      
      // Éviter les boucles infinies en vérifiant si les paramètres ont changé
      if (searchParamsString !== prevSearchParamsRef.current) {
        prevSearchParamsRef.current = searchParamsString;
        // Déclencher la recherche automatiquement
        router.push(`/search-parkings?${searchParamsString}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, selectedPlaceType, startDate, endDate, pathname]);

  // Déterminer si on doit afficher le header sur mobile
  // Le header est toujours visible sur desktop, mais masqué sur mobile sauf pour les pages de recherche et home
  const isSearchPage = pathname === '/search-parkings' || pathname === '/search' || pathname?.startsWith('/search');
  const isHomePage = pathname === '/home';
  
  // Si c'est une page de recherche ou la page home, le header est toujours visible
  // Sinon, le header est masqué sur mobile (hidden) mais visible sur desktop (md:block)
  const headerClasses = (isSearchPage || isHomePage)
    ? 'fixed top-0 left-0 right-0 z-50 bg-white font-sans text-slate-900 shadow-sm border-b border-slate-200'
    : 'fixed top-0 left-0 right-0 z-50 bg-white font-sans text-slate-900 shadow-sm border-b border-slate-200 hidden md:block';

  return (
    <>
    <header className={headerClasses} style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}>
      <div className="flex flex-col w-full">
        
        {/* Top Navigation Row - Bien dimensionné sur mobile, aéré */}
        <div className={cn("relative z-10 flex w-full items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8 py-3 bg-white", (isSearchPage || isHomePage) ? "min-h-[56px] md:h-20 md:py-0 md:min-h-0" : "min-h-[56px] md:min-h-[64px]")}>
          
          {/* Logo Section - Mobile: toujours vers search-parkings (pas de homepage) */}
          <div className="flex items-center justify-start flex-shrink-0">
            <Link href={isMobileOrCap ? "/search-parkings" : (isLoggedIn ? "/home" : "/")} prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, isMobileOrCap ? "/search-parkings" : (isLoggedIn ? "/home" : "/"), router)} className="flex items-center transition-opacity hover:opacity-90">
              <Image
                src="/logoren.png"
                alt="RENTTOALL.COM"
                width={180}
                height={60}
                className={cn((isSearchPage || isHomePage) ? "h-9 sm:h-11 md:h-14" : "h-10 sm:h-12 md:h-14", "w-auto")}
                priority
              />
            </Link>
          </div>

          {/* Search Bar - Visible pour tous (connectés ou non) sauf en mode hôte connecté - Champs directement sans bloc */}
          {(!isLoggedIn || userMode === 'client') && (
          <div className="hidden md:flex flex-1 max-w-3xl mx-3 lg:mx-6 items-center gap-2 lg:gap-2.5">
              {/* Lieu - Dropdown avec API */}
              <div className="relative flex-1 min-w-0" ref={cityPickerRef}>
                <button
                  onClick={() => {
                    setShowCityPicker(!showCityPicker);
                    setShowDatePicker(false);
                    setShowTypePicker(false);
                    if (!showCityPicker) {
                      setCitySearchQuery(city || '');
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 md:px-3 md:py-2.5 bg-white rounded-lg border transition-all text-left cursor-pointer",
                    showCityPicker 
                      ? "border-emerald-300 shadow-md ring-2 ring-emerald-100" 
                      : "border-slate-200/80 hover:border-emerald-200 hover:shadow-sm"
                  )}
                >
                  <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="flex-1 text-xs md:text-sm font-medium text-slate-800 truncate">{city || t('header.city')}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${showCityPicker ? 'rotate-180' : ''}`} />
                </button>
                
                {showCityPicker && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-lg z-50 max-h-80 overflow-y-auto min-w-[280px]">
                    <div className="p-2">
                      <div className="relative mb-2">
                        <input
                          type="text"
                          placeholder={t('header.searchCity')}
                          value={citySearchQuery}
                          onChange={(e) => {
                            setCitySearchQuery(e.target.value);
                          }}
                          className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-300 text-sm"
                          autoFocus
                        />
                        {citySearchQuery.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCitySearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            aria-label="Effacer"
                          >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleNearby}
                        disabled={isGettingLocation}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-700 font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isGettingLocation ? (
                          <>
                            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            <span>Position en cours...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                            <span>À proximité</span>
                          </>
                        )}
                      </button>
                      {isLoadingCities && (
                        <div className="px-3 py-2 text-sm text-slate-500 text-center">
                          {t('header.loadingCities')}
                        </div>
                      )}
                      {!isLoadingCities && availableCities.length === 0 && citySearchQuery.length >= 2 && (
                        <div className="p-2 space-y-1">
                          {titleSearchPlaces.length > 0 ? (
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                              {titleSearchPlaces.map((place) => {
                                const typeLabel = place.type === 'PARKING' ? 'Parking' : place.type === 'STORAGE_SPACE' ? 'Stockage' : 'Cave et Divers';
                                const displayTitle = capitalizeFirstPerLine(place.description?.split('.').slice(0, 1).join('.') || `${typeLabel} - ${place.city || ''}`);
                                const priceVal = place.pricePerHour ?? place.pricePerDay;
                                const priceStr = priceVal != null ? `${priceVal}€` : '-';
                                return (
                                  <CapacitorDynamicLink
                                    key={place.id}
                                    href={`/parking/${place.id}/`}
                                    onClick={() => {
                                      setShowCityPicker(false);
                                      setShowMobileSearchFilters(false);
                                    }}
                                    className="block w-full text-left px-3 py-2.5 hover:bg-emerald-50 rounded-xl text-sm text-slate-700 transition-colors cursor-pointer"
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
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-500 text-center">
                              {t('header.noCityFound')}
                            </div>
                          )}
                        </div>
                      )}
                      {!isLoadingCities && availableCities.length > 0 && (
                        <div className="space-y-1">
                          {availableCities.map((cityData, index) => (
                            <button
                              key={`${cityData.name}-${cityData.postalCode}-${index}`}
                              onClick={() => {
                                console.log('🏙️ [HEADER] ========================================');
                                console.log('🏙️ [HEADER] ⚡⚡⚡ VILLE SÉLECTIONNÉE DANS LE HEADER ⚡⚡⚡');
                                console.log('🏙️ [HEADER] Ville:', cityData.name);
                                console.log('🏙️ [HEADER] Coordonnées disponibles:', { lat: cityData.lat, lng: cityData.lng });
                                
                                setCity(cityData.name);
                                setCitySearchQuery(cityData.name);
                                // Sauvegarder les coordonnées dans le contexte pour que la carte puisse zoomer
                                if (cityData.lat !== undefined && cityData.lng !== undefined) {
                                  setSelectedCityCoords({ lat: cityData.lat, lng: cityData.lng });
                                  setContextCityCoords({ lat: cityData.lat, lng: cityData.lng });
                                  console.log('🏙️ [HEADER] ✅ Coordonnées stockées dans le contexte:', { lat: cityData.lat, lng: cityData.lng });
                                  console.log('🏙️ [HEADER] La carte sera notifiée pour zoomer automatiquement');
                                  // Mener sur la carte (search-parkings) avec ville + rayon 50 km si on n'y est pas déjà
                                  if (pathname !== '/search-parkings') {
                                    const urlParams = buildSearchParams(cityData.name, undefined, { lat: cityData.lat, lng: cityData.lng });
                                    router.push(`/search-parkings?${urlParams.toString()}`);
                                  }
                                } else {
                                  setSelectedCityCoords(null);
                                  setContextCityCoords(null);
                                  console.warn('🏙️ [HEADER] ⚠️ Aucune coordonnée disponible pour cette ville');
                                }
                                setShowCityPicker(false);
                                setShowDatePicker(true);
                                console.log('🏙️ [HEADER] ========================================');
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 rounded-xl text-sm text-slate-700 transition-colors cursor-pointer"
                            >
                              {cityData.name ? cityData.name.charAt(0).toUpperCase() + cityData.name.slice(1).toLowerCase() : cityData.name} {cityData.postalCode ? `(${cityData.postalCode})` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="relative flex-1 min-w-0" ref={datePickerRef}>
                <button
                  onClick={() => {
                    setShowDatePicker(!showDatePicker);
                    setShowCityPicker(false);
                    setShowTypePicker(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 md:px-3 md:py-2.5 bg-white rounded-lg border transition-all text-left cursor-pointer",
                    showDatePicker 
                      ? "border-emerald-300 shadow-md ring-2 ring-emerald-100" 
                      : "border-slate-200/80 hover:border-emerald-200 hover:shadow-sm"
                  )}
                >
                  <Calendar className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="flex-1 text-xs md:text-sm font-medium text-slate-800 truncate">{formatDateRange()}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${showDatePicker ? 'rotate-180' : ''}`} />
                </button>
                
                {showDatePicker && (
                  <div className="absolute top-full right-0 sm:right-auto sm:left-0 sm:w-80 mt-2 bg-white rounded-2xl border border-slate-100 shadow-lg p-5 z-50">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h3>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
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
                      {days.map((date, idx) => {
                        if (!date) {
                          return <div key={idx} className="aspect-square" />;
                        }
                        const isSelectable = isDateSelectable(date);
                        const isInRange = isDateInRange(date);
                        const isStart = startDate && date.getTime() === startDate.getTime();
                        const isEnd = endDate && date.getTime() === endDate.getTime();
                        const isSameDate = isStart && isEnd; // Si startDate et endDate sont identiques
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => isSelectable && handleDateSelect(date)}
                            disabled={!isSelectable}
                            className={cn(
                              "aspect-square flex items-center justify-center text-xs rounded transition-colors",
                              !isSelectable && "text-slate-300 bg-slate-50 cursor-not-allowed opacity-50",
                              isSelectable && !isInRange && !isStart && !isEnd && "hover:bg-slate-100 text-slate-700 cursor-pointer",
                              isInRange && !isStart && !isEnd && "bg-emerald-100 text-emerald-700 cursor-pointer",
                              isSameDate && "bg-emerald-600 text-white rounded-full cursor-pointer",
                              isStart && !isEnd && "bg-emerald-600 text-white rounded-l-full cursor-pointer",
                              isEnd && !isStart && "bg-emerald-600 text-white rounded-r-full cursor-pointer"
                            )}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Type - Dropdown avec enum du back */}
              <div className="relative flex-1 min-w-0" ref={typePickerRef}>
                <button
                  onClick={() => {
                    setShowTypePicker(!showTypePicker);
                    setShowCityPicker(false);
                    setShowDatePicker(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 md:px-3 md:py-2.5 bg-white rounded-lg border transition-all text-left cursor-pointer",
                    showTypePicker 
                      ? "border-emerald-300 shadow-md ring-2 ring-emerald-100" 
                      : "border-slate-200/80 hover:border-emerald-200 hover:shadow-sm"
                  )}
                >
                  <Filter className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="flex-1 text-xs md:text-sm font-medium text-slate-800 truncate">{formatTypeDisplay()}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${showTypePicker ? 'rotate-180' : ''}`} />
                </button>
                
                {showTypePicker && (
                  <div className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-lg z-50 min-w-[220px] p-1">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setSelectedPlaceType(null);
                          setShowTypePicker(false);
                          handleSearch(undefined, null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 rounded-xl text-sm text-slate-700 transition-colors cursor-pointer"
                      >
                        <span className="flex-1 text-left">Tous les types</span>
                        {!selectedPlaceType && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                      {placeTypes.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => {
                            setSelectedPlaceType(value);
                            setShowTypePicker(false);
                            handleSearch(undefined, value);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 rounded-xl text-sm text-slate-700 transition-colors cursor-pointer"
                        >
                          <Icon className="w-4 h-4 text-emerald-500" />
                          <span className="flex-1 text-left">{label}</span>
                          {selectedPlaceType === value && (
                            <Check className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton Filtres Avancés */}
              {(() => {
                const usePageFilters = typeof hasActiveFilters === 'boolean';
                const activeCount = usePageFilters && typeof activeFilterCount === 'number'
                  ? activeFilterCount
                  : selectedEquipment.length + (instantBooking !== null ? 1 : 0) + (freeCancellation !== null ? 1 : 0) + (noDeposit !== null ? 1 : 0) + Object.keys(selectedCharacteristics).length + (priceRange[0] > 0 || priceRange[1] < 500 ? 1 : 0);
                const isActive = usePageFilters ? hasActiveFilters : activeCount > 0;
                return (
                  <button
                    onClick={() => setShowAdvancedFilters(true)}
                    className={cn(
                      "p-2 md:p-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0",
                      isActive
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
                        : "bg-white border-slate-200/80 text-slate-600 hover:border-emerald-200 hover:text-slate-800 hover:shadow-sm"
                    )}
                    title={t('header.advancedFilters')}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {activeCount > 0 && (
                      <span className="hidden sm:inline text-xs font-semibold bg-emerald-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                        {activeCount}
                      </span>
                    )}
                  </button>
                );
              })()}

              {/* Bouton Rechercher */}
              <button
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white text-xs md:text-sm font-semibold rounded-lg transition-colors cursor-pointer flex-shrink-0 shadow-sm"
                title="Rechercher"
              >
                <Search className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Rechercher</span>
              </button>

          </div>
          )}

          {/* User Profile Menu (Right) */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
            {/* Mobile Menu Button - Masqué sur mobile car remplacé par footer */}
            {/* <button
              data-mobile-menu-trigger
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer touch-manipulation flex-shrink-0"
              aria-label="Menu"
            >
              {showMobileMenu ? (
                <X className="w-6 h-6" strokeWidth={2.5} />
              ) : (
                <Menu className="w-6 h-6" strokeWidth={2.5} />
              )}
            </button> */}
            {isLoggedIn ? (
              <>
                {/* Bouton de basculement Mode Client / Mode Hôte - Hidden on mobile */}
                <button
                  onClick={toggleUserMode}
                  className={cn(
                    "hidden md:flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors border-2 cursor-pointer min-h-[44px] flex-shrink-0 whitespace-nowrap",
                    userMode === 'host'
                      ? "text-emerald-700 bg-emerald-50 border-emerald-600 hover:bg-emerald-100"
                      : "text-slate-700 hover:bg-slate-100 border-emerald-600"
                  )}
                  title={userMode === 'client' ? 'Passer en mode hôte' : 'Passer en mode client'}
                >
                  <UserCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" strokeWidth={2} />
                  <span className="hidden sm:inline lg:inline">
                    {userMode === 'client' ? t('header.mode.host') : t('header.mode.client')}
                  </span>
                  <span className="sm:hidden">
                    {userMode === 'client' ? t('header.mode.host').split(' ')[1] : t('header.mode.client').split(' ')[1]}
                  </span>
                </button>

                {/* Calendrier - Visible uniquement en mode hôte */}
                {userMode === 'host' && (
                  <Link 
                    href="/mon-calendrier" 
                    className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap"
                  >
                    <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                    <span className="hidden lg:inline">{t('nav.calendar')}</span>
                  </Link>
                )}
                
                {/* Espace client/hôte button with dropdown - Hidden on mobile */}
                <div className="relative hidden md:block flex-shrink-0" ref={clientSpaceMenuRef}>
                  <button
                    onClick={() => {
                      setShowClientSpaceMenu(!showClientSpaceMenu);
                      setShowLanguageMenu(false);
                      setShowUserMenu(false);
                    }}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[44px] whitespace-nowrap relative"
                  >
                    <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden flex-shrink-0 border-2 border-slate-300 bg-slate-100">
                      <Image
                        src={userProfilePicture || '/logoR.png'}
                        alt="Photo de profil"
                        fill
                        className="object-cover"
                        sizes="28px"
                        unoptimized={userProfilePicture?.startsWith('http://localhost') || userProfilePicture?.startsWith('data:') || userProfilePicture?.startsWith('http://') || !userProfilePicture}
                        onError={(e) => {
                          console.error('❌ [HEADER] Erreur de chargement de l\'image:', userProfilePicture);
                          // En cas d'erreur, utiliser le logo par défaut
                          const target = e.target as HTMLImageElement;
                          if (target.src !== `${window.location.origin}/logoR.png`) {
                            target.src = '/logoR.png';
                          }
                        }}
                      />
                    </div>
                    <span className="hidden sm:inline lg:inline">
                      {userMode === 'client' ? t('header.mode.client') : t('header.mode.host')}
                    </span>
                    <span className="sm:hidden">
                      {userMode === 'client' ? t('header.mode.client').split(' ')[1] : t('header.mode.host').split(' ')[1]}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${showClientSpaceMenu ? 'rotate-180' : ''}`} />
                    {/* Notification sur le parent (Mode client / Mode hôte) quand il y a des messages non lus */}
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white" aria-label={`${unreadMessagesCount} message(s) non lu(s)`}>
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Client Space Dropdown Menu */}
                  {showClientSpaceMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowClientSpaceMenu(false)}
                      />
                      <div 
                        className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-[60] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-2">
                          {userMode === 'host' && (
                            <>
                              <Link
                                href={isMobileOrCap ? "/host/my-places" : "/home"}
                                prefetch={false}
                                onClick={(e) => {
                                  handleCapacitorLinkClick(e, isMobileOrCap ? "/host/my-places" : "/home", router);
                                  setShowClientSpaceMenu(false);
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block w-full"
                              >
                                <BarChart3 className="w-5 h-5 text-slate-600" strokeWidth={2} />
                                <span className="font-medium">{t('header.dashboard')}</span>
                              </Link>
                              <Link
                                href="/host/my-places"
                                prefetch={false}
                                onClick={(e) => {
                                  handleCapacitorLinkClick(e, '/host/my-places', router);
                                  setShowClientSpaceMenu(false);
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block w-full"
                              >
                                <FileText className="w-5 h-5 text-slate-600" strokeWidth={2} />
                                <span className="font-medium">{t('nav.myAnnouncements')}</span>
                              </Link>
                              <Link
                                href="/host/referrals"
                                prefetch={false}
                                onClick={(e) => {
                                  handleCapacitorLinkClick(e, '/host/referrals', router);
                                  setShowClientSpaceMenu(false);
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block w-full"
                              >
                                <Gift className="w-5 h-5 text-slate-600" strokeWidth={2} />
                                <span className="font-medium">{t('nav.referrals')}</span>
                              </Link>
                            </>
                          )}
                          <Link
                            href="/reservations"
                            prefetch={false}
                            onClick={(e) => {
                              handleCapacitorLinkClick(e, '/reservations', router);
                              setShowClientSpaceMenu(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block w-full"
                          >
                            <BookOpen className="w-5 h-5 text-slate-600" strokeWidth={2} />
                            <span className="font-medium">{t('nav.reservations')}</span>
                          </Link>
                          {/* Favoris - Visible uniquement en mode client */}
                          {userMode === 'client' && (
                            <Link
                              href="/favoris"
                              prefetch={false}
                              onClick={(e) => {
                                handleCapacitorLinkClick(e, '/favoris', router);
                                setShowClientSpaceMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block w-full"
                            >
                              <Heart className="w-5 h-5 text-slate-600" strokeWidth={2} />
                              <span className="font-medium">{t('header.favorites')}</span>
                            </Link>
                          )}
                          <Link
                            href="/messages"
                            prefetch={false}
                            onClick={(e) => {
                              handleCapacitorLinkClick(e, '/messages', router);
                              setShowClientSpaceMenu(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block w-full relative"
                          >
                            <MessageSquare className="w-5 h-5 text-slate-600 flex-shrink-0" strokeWidth={2} />
                            <span className="font-medium">{t('header.messages')}</span>
                            {unreadMessagesCount > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center flex-shrink-0">
                                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                              </span>
                            )}
                          </Link>
                          <Link
                            href="/parametres"
                            prefetch={false}
                            onClick={(e) => {
                              handleCapacitorLinkClick(e, '/parametres', router);
                              setShowClientSpaceMenu(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block w-full relative"
                          >
                            <Settings className="w-5 h-5 text-slate-600 flex-shrink-0" strokeWidth={2} />
                            <span className="font-medium">{t('header.settings')}</span>
                            {userMode === 'host' && bankingInfoNeeded && (
                              <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center flex-shrink-0">
                                !
                              </span>
                            )}
                          </Link>
                          <div className="border-t border-slate-200 my-1" />
                          {/* Sélecteur de langue */}
                          <div className="px-4 py-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Globe className="w-4 h-4 text-slate-600" strokeWidth={2} />
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('header.language') || 'Langue'}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLanguage('fr');
                                  setShowClientSpaceMenu(false);
                                }}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                                  language === 'fr'
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                )}
                              >
                                {language === 'fr' && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
                                <span>Français</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLanguage('en');
                                  setShowClientSpaceMenu(false);
                                }}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                                  language === 'en'
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                )}
                              >
                                {language === 'en' && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
                                <span>English</span>
                              </button>
                            </div>
                          </div>
                          <div className="border-t border-slate-200 my-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowClientSpaceMenu(false);
                              // Logique de déconnexion
                              if (typeof window !== 'undefined') {
                                removeItem('finalIsLoggedIn');
                                removeItem('finalUserType');
                                removeItem('authToken');
                                removeItem('userName');
                                router.push('/');
                              }
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                          >
                            <LogOut className="w-5 h-5 text-red-600" strokeWidth={2} />
                            <span className="font-medium">{t('header.logout')}</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Mettre mon espace en ligne - Visible uniquement en mode hôte */}
                {userMode === 'host' && (
                  <Link 
                    href="/host/create" 
                    onClick={() => {
                      // Réinitialiser le formulaire en effaçant le brouillon sauvegardé
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('host_create_draft');
                        console.log('🔄 [HEADER] Brouillon de création réinitialisé');
                      }
                    }}
                    className="hidden md:block px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex-shrink-0 whitespace-nowrap"
                  >
                    <span className="hidden lg:inline">Mettre mon espace en ligne</span>
                    <span className="lg:hidden">Publier</span>
                  </Link>
                )}
              </>
            ) : (
              <>
                {/* Sélecteur de langue pour utilisateurs non connectés - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 px-2 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <Globe className="w-4 h-4 text-slate-600" strokeWidth={2} />
                  <button
                    onClick={() => setLanguage('fr')}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                      language === 'fr'
                        ? "bg-emerald-600 text-white"
                        : "text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    FR
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                      language === 'en'
                        ? "bg-emerald-600 text-white"
                        : "text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    EN
                  </button>
                </div>
                {/* Boutons Connexion/Inscription pour utilisateurs non connectés - Hidden on mobile */}
                <Link 
                  href="/auth/login" 
                  className="hidden md:flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px]"
                >
                  {t('header.login') || 'Connexion'}
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="hidden md:flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm min-h-[44px]"
                >
                  {t('header.signup') || 'Inscription'}
                </Link>
              </>
            )}
          </div>

          {/* Search Bar Mobile - Barre épurée : Destination + Filtres (ou Rechercher si page home) - visible non connecté ou mode client */}
          {(!isLoggedIn || userMode === 'client') && (
            <div className="md:hidden flex items-center gap-2.5 flex-1 min-w-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onSearchClick) {
                    onSearchClick();
                  } else {
                    const willOpen = !showMobileSearchFilters;
                    if (willOpen && city) setMobileSearchText(city);
                    setShowMobileSearchFilters(!showMobileSearchFilters);
                  }
                }}
                className={cn(
                  "flex-1 min-w-0 flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl transition-all cursor-pointer touch-manipulation text-left border",
                  "bg-slate-50 border-slate-200 hover:bg-white hover:border-emerald-200 active:bg-white shadow-sm"
                )}
                aria-label={t('header.search')}
              >
                <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0" strokeWidth={2} />
                <span className="flex-1 text-sm text-slate-800 font-medium truncate text-left">
                  {searchDestinationLabel ?? (showMobileSearchFilters ? 'Masquer' : t('header.search'))}
                </span>
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" strokeWidth={2} />
              </button>
              {onFilterClick && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onFilterClick();
                  }}
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl border transition-all touch-manipulation shadow-sm",
                    hasActiveFilters
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-emerald-200"
                  )}
                  aria-label={t('header.advancedFilters')}
                >
                  <SlidersHorizontal className="w-5 h-5" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <>
            {/* Backdrop avec animation */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden animate-in fade-in duration-300"
              onClick={() => setShowMobileMenu(false)}
            />
            
            {/* Mobile Menu Panel avec animation slide-in */}
            <div 
              ref={mobileMenuRef}
              className="fixed top-0 left-0 right-0 bottom-0 bg-white z-[70] md:hidden overflow-y-auto overscroll-contain shadow-2xl animate-in slide-in-from-left duration-300"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="flex flex-col h-full">
                {/* Header du menu mobile avec logo et bouton fermer */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 sm:py-4">
                    <Link 
                      href={isMobileOrCap ? "/search-parkings" : (isLoggedIn ? "/home" : "/")}
                      prefetch={false}
                      onClick={(e) => { handleCapacitorLinkClick(e, isMobileOrCap ? "/search-parkings" : (isLoggedIn ? "/home" : "/"), router); setShowMobileMenu(false); }}
                      className="flex items-center"
                    >
                      <Image
                        src="/logoren.png"
                        alt="RENTTOALL.COM"
                        width={140}
                        height={50}
                        className="h-8 sm:h-10 w-auto"
                        priority
                      />
                    </Link>
                    <button
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer touch-manipulation"
                      aria-label="Fermer le menu"
                    >
                      <X className="w-6 h-6" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Mobile Search Filters Section - Masqué en mode hôte connecté */}
                {(!isLoggedIn || userMode === 'client') && showMobileSearchFilters && (
                <div className="border-b border-slate-200 bg-white p-3">
                  <div className="space-y-2.5">
                    {/* Header avec titre et bouton fermer */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-slate-900">Recherche</h3>
                      <button
                        onClick={() => setShowMobileSearchFilters(false)}
                        className="p-1.5 min-w-[44px] min-h-[44px] hover:bg-slate-100 rounded-full transition-colors touch-manipulation flex items-center justify-center"
                      >
                        <X className="w-5 h-5 text-slate-500" />
                      </button>
                    </div>
                    {/* Champ de saisie libre (comme sur le web) : taper directement une ville ou un mot-clé */}
                    <div className="mb-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder={t('header.searchCity')}
                          value={mobileSearchText}
                          onChange={(e) => setMobileSearchText(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 min-h-[44px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base text-slate-900 placeholder:text-slate-400 bg-white shadow-sm"
                          autoComplete="off"
                          enterKeyHint="search"
                        />
                        {mobileSearchText.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => setMobileSearchText('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation"
                            aria-label="Effacer"
                          >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                      {/* Lieu Mobile - Dropdown avec API */}
                      <div className="relative" ref={cityPickerRef}>
                        <button
                          onClick={() => {
                            setShowCityPicker(!showCityPicker);
                            setShowDatePicker(false);
                            setShowTypePicker(false);
                            if (!showCityPicker) {
                              setCitySearchQuery(city || '');
                            }
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 min-h-[44px] bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-left cursor-pointer touch-manipulation shadow-sm hover:shadow"
                        >
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" strokeWidth={2} />
                          <span className="flex-1 text-sm text-slate-600 font-medium">{city || t('header.city')}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${showCityPicker ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showCityPicker && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-[80] max-h-64 overflow-y-auto">
                            <div className="p-2">
                              <div className="relative mb-2">
                                <input
                                  type="text"
                                  placeholder={t('header.searchCity')}
                                  value={citySearchQuery}
                                  onChange={(e) => {
                                    setCitySearchQuery(e.target.value);
                                  }}
                                  className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                                  autoFocus
                                />
                                {citySearchQuery.trim().length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setCitySearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation"
                                    aria-label="Effacer"
                                  >
                                    <X className="w-4 h-4" strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                              {isLoadingCities && (
                                <div className="px-3 py-2 text-sm text-slate-500 text-center">
                                  Recherche en cours...
                                </div>
                              )}
                              {!isLoadingCities && availableCities.length === 0 && citySearchQuery.length >= 2 && (
                                <div className="p-2 space-y-1">
                                  {titleSearchPlaces.length > 0 ? (
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                      {titleSearchPlaces.map((place) => {
                                        const typeLabel = place.type === 'PARKING' ? 'Parking' : place.type === 'STORAGE_SPACE' ? 'Stockage' : 'Cave et Divers';
                                        const displayTitle = capitalizeFirstPerLine(place.description?.split('.').slice(0, 1).join('.') || `${typeLabel} - ${place.city || ''}`);
                                        const priceVal = place.pricePerHour ?? place.pricePerDay;
                                        const priceStr = priceVal != null ? `${priceVal}€` : '-';
                                        return (
                                          <CapacitorDynamicLink
                                            key={place.id}
                                            href={`/parking/${place.id}/`}
                                            onClick={() => {
                                              setShowCityPicker(false);
                                              setShowMobileSearchFilters(false);
                                            }}
                                            className="block w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-emerald-50 rounded-lg text-sm text-slate-700 transition-colors cursor-pointer border-b border-slate-100 last:border-b-0 touch-manipulation"
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
                                  ) : (
                                    <div className="px-3 py-2 text-sm text-slate-500 text-center">
                                      {t('header.noCityFound')}
                                    </div>
                                  )}
                                </div>
                              )}
                              {!isLoadingCities && availableCities.length > 0 && (
                                <div className="space-y-1">
                                  {availableCities.map((cityData, index) => (
                                    <button
                                      key={`${cityData.name}-${cityData.postalCode}-${index}`}
                                      onClick={() => {
                                        console.log('🏙️ [HEADER MOBILE] ========================================');
                                        console.log('🏙️ [HEADER MOBILE] ⚡⚡⚡ VILLE SÉLECTIONNÉE DANS LE HEADER (MOBILE) ⚡⚡⚡');
                                        console.log('🏙️ [HEADER MOBILE] Ville:', cityData.name);
                                        console.log('🏙️ [HEADER MOBILE] Coordonnées disponibles:', { lat: cityData.lat, lng: cityData.lng });
                                        
                                        setCity(cityData.name);
                                        setCitySearchQuery(cityData.name);
                                        setMobileSearchText(cityData.name);
                                        // Sauvegarder les coordonnées dans le contexte pour que la carte puisse zoomer
                                        if (cityData.lat !== undefined && cityData.lng !== undefined) {
                                          setSelectedCityCoords({ lat: cityData.lat, lng: cityData.lng });
                                          setContextCityCoords({ lat: cityData.lat, lng: cityData.lng });
                                          console.log('🏙️ [HEADER MOBILE] ✅ Coordonnées stockées dans le contexte:', { lat: cityData.lat, lng: cityData.lng });
                                          console.log('🏙️ [HEADER MOBILE] La carte sera notifiée pour zoomer automatiquement');
                                          // Mener sur la carte (search-parkings) avec ville + rayon 50 km si on n'y est pas déjà
                                          if (pathname !== '/search-parkings') {
                                            const urlParams = buildSearchParams(cityData.name, undefined, { lat: cityData.lat, lng: cityData.lng });
                                            router.push(`/search-parkings?${urlParams.toString()}`);
                                          }
                                        } else {
                                          setSelectedCityCoords(null);
                                          setContextCityCoords(null);
                                          console.warn('🏙️ [HEADER MOBILE] ⚠️ Aucune coordonnée disponible pour cette ville');
                                        }
                                        setShowCityPicker(false);
                                        setShowDatePicker(true);
                                        console.log('🏙️ [HEADER MOBILE] ========================================');
                                      }}
                                      className="w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-slate-50 rounded-lg text-sm text-slate-700 transition-colors cursor-pointer touch-manipulation"
                                    >
                                      {cityData.name ? cityData.name.charAt(0).toUpperCase() + cityData.name.slice(1).toLowerCase() : cityData.name} {cityData.postalCode ? `(${cityData.postalCode})` : ''}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Dates Mobile */}
                      <div className="relative" ref={datePickerRef}>
                        <button
                          onClick={() => {
                            setShowDatePicker(!showDatePicker);
                            setShowCityPicker(false);
                            setShowTypePicker(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 min-h-[44px] bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-left cursor-pointer touch-manipulation shadow-sm hover:shadow"
                        >
                          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" strokeWidth={2} />
                          <span className="flex-1 text-sm text-slate-600 font-medium">{formatDateRange()}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${showDatePicker ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showDatePicker && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-[80]">
                            <div className="flex items-center justify-between mb-4">
                              <button
                                onClick={() => navigateMonth('prev')}
                                className="p-2 min-w-[44px] min-h-[44px] hover:bg-slate-100 rounded transition-colors cursor-pointer touch-manipulation flex items-center justify-center"
                              >
                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                              </button>
                              <h3 className="font-semibold text-slate-900 text-sm">
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                              </h3>
                              <button
                                onClick={() => navigateMonth('next')}
                                className="p-2 min-w-[44px] min-h-[44px] hover:bg-slate-100 rounded transition-colors cursor-pointer touch-manipulation flex items-center justify-center"
                              >
                                <ChevronRight className="w-5 h-5 text-slate-600" />
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
                              {days.map((date, idx) => {
                                if (!date) {
                                  return <div key={idx} className="aspect-square" />;
                                }
                                const isSelectable = isDateSelectable(date);
                                const isInRange = isDateInRange(date);
                                const isStart = startDate && date.getTime() === startDate.getTime();
                                const isEnd = endDate && date.getTime() === endDate.getTime();
                                const isSameDate = isStart && isEnd; // Si startDate et endDate sont identiques
                                
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => isSelectable && handleDateSelect(date)}
                                    disabled={!isSelectable}
                                    className={cn(
                                      "aspect-square flex items-center justify-center text-xs rounded transition-colors min-h-[36px] touch-manipulation",
                                      !isSelectable && "text-slate-300 bg-slate-50 cursor-not-allowed opacity-50",
                                      isSelectable && !isInRange && !isStart && !isEnd && "hover:bg-slate-100 text-slate-700 cursor-pointer",
                                      isInRange && !isStart && !isEnd && "bg-emerald-100 text-emerald-700 cursor-pointer",
                                      isSameDate && "bg-emerald-600 text-white rounded-full cursor-pointer",
                                      isStart && !isEnd && "bg-emerald-600 text-white rounded-l-full cursor-pointer",
                                      isEnd && !isStart && "bg-emerald-600 text-white rounded-r-full cursor-pointer"
                                    )}
                                  >
                                    {date.getDate()}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Type Mobile - Dropdown avec enum du back */}
                      <div className="relative" ref={typePickerRef}>
                        <button
                          onClick={() => {
                            setShowTypePicker(!showTypePicker);
                            setShowCityPicker(false);
                            setShowDatePicker(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 min-h-[44px] bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all text-left cursor-pointer touch-manipulation shadow-sm hover:shadow"
                        >
                          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" strokeWidth={2} />
                          <span className="flex-1 text-sm text-slate-600 font-medium">{formatTypeDisplay()}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${showTypePicker ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showTypePicker && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-[80]">
                            <div className="p-2">
                              <button
                                onClick={() => {
                                  setSelectedPlaceType(null);
                                  setShowTypePicker(false);
                                  handleSearch(undefined, null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] hover:bg-slate-50 rounded-lg text-sm text-slate-700 transition-colors cursor-pointer touch-manipulation"
                              >
                                <span className="flex-1 text-left">Tous les types</span>
                                {!selectedPlaceType && (
                                  <Check className="w-5 h-5 text-emerald-600" />
                                )}
                              </button>
                              {placeTypes.map(({ value, label, icon: Icon }) => (
                                <button
                                  key={value}
                                  onClick={() => {
                                    setSelectedPlaceType(value);
                                    setShowTypePicker(false);
                                    handleSearch(undefined, value);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] hover:bg-slate-50 rounded-lg text-sm text-slate-700 transition-colors cursor-pointer touch-manipulation"
                                >
                                  <Icon className="w-5 h-5 text-slate-500" />
                                  <span className="flex-1 text-left">{label}</span>
                                  {selectedPlaceType === value && (
                                    <Check className="w-5 h-5 text-emerald-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                    {/* Boutons d'action - Identiques au header web */}
                    <div className="flex gap-2 pt-1">
                      {/* Bouton Filtres Avancés - Même style que web */}
                      {(() => {
                        const usePageFilters = typeof hasActiveFilters === 'boolean';
                        const activeCount = usePageFilters && typeof activeFilterCount === 'number'
                          ? activeFilterCount
                          : selectedEquipment.length + (instantBooking !== null ? 1 : 0) + (freeCancellation !== null ? 1 : 0) + (noDeposit !== null ? 1 : 0) + Object.keys(selectedCharacteristics).length + (priceRange[0] > 0 || priceRange[1] < 500 ? 1 : 0);
                        const isActive = usePageFilters ? hasActiveFilters : activeCount > 0;
                        return (
                          <button
                            onClick={() => {
                              setShowAdvancedFilters(true);
                              setShowMobileMenu(false);
                            }}
                            className={`px-3.5 py-2.5 min-h-[44px] border-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation flex-shrink-0 ${
                              isActive
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                            title={t('header.advancedFilters')}
                          >
                            <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
                            {activeCount > 0 && (
                              <span className="text-xs font-semibold bg-emerald-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                                {activeCount}
                              </span>
                            )}
                          </button>
                        );
                      })()}
                      
                      {/* Bouton Recherche - Toujours cliquable sur mobile (jamais grisé) */}
                      <button
                        onClick={async () => {
                          const searchValue = mobileSearchText.trim();
                          await handleSearch(searchValue || undefined);
                          if (searchValue) setCity(searchValue);
                          setShowMobileMenu(false);
                          setShowMobileSearchFilters(false);
                        }}
                        className="flex-1 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation shadow-md hover:shadow-lg text-sm"
                      >
                        {isSearching ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Recherche...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" strokeWidth={2.5} />
                            <span>Rechercher</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                )}

                {/* Mobile Navigation Links */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  {isLoggedIn ? (
                    <>
                      {/* User Info Card - Amélioré */}
                      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 sm:p-5 mb-5 shadow-lg">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white/30">
                            <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base sm:text-lg font-bold text-white mb-1">
                              {userMode === 'client' ? 'Mode Hôte' : 'Mode Client'}
                            </p>
                            <button
                              onClick={toggleUserMode}
                              className="text-xs sm:text-sm text-white/90 font-medium hover:text-white transition-colors underline underline-offset-2 touch-manipulation min-h-[44px]"
                            >
                              Basculer vers {userMode === 'client' ? 'Mode Hôte' : 'Mode Client'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Links - Amélioré */}
                      <div className="space-y-2">
                        {userMode === 'host' && (
                          <>
                            <Link
                              href={isMobileOrCap ? "/host/my-places" : "/home"}
                              prefetch={false}
                              onClick={(e) => { handleCapacitorLinkClick(e, isMobileOrCap ? "/host/my-places" : "/home", router); setShowMobileMenu(false); }}
                              className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                            >
                              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                              </div>
                              <span className="font-semibold text-base sm:text-lg">{t('header.dashboard')}</span>
                            </Link>
                            <Link
                              href="/host/my-places"
                              prefetch={false}
                              onClick={(e) => { handleCapacitorLinkClick(e, '/host/my-places', router); setShowMobileMenu(false); }}
                              className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                            >
                              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                              </div>
                              <span className="font-semibold text-base sm:text-lg">{t('nav.myAnnouncements')}</span>
                            </Link>
                            <Link
                              href="/host/referrals"
                              prefetch={false}
                              onClick={(e) => { handleCapacitorLinkClick(e, '/host/referrals', router); setShowMobileMenu(false); }}
                              className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                            >
                              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                                <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                              </div>
                              <span className="font-semibold text-base sm:text-lg">{t('nav.referrals')}</span>
                            </Link>
                            <Link
                              href="/mon-calendrier"
                              prefetch={false}
                              onClick={(e) => { handleCapacitorLinkClick(e, '/mon-calendrier', router); setShowMobileMenu(false); }}
                              className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                            >
                              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                              </div>
                              <span className="font-semibold text-base sm:text-lg">{t('nav.calendar')}</span>
                            </Link>
                            <Link
                              href="/host/create"
                              prefetch={false}
                              onClick={(e) => {
                                if (typeof window !== 'undefined') {
                                  localStorage.removeItem('host_create_draft');
                                }
                                handleCapacitorLinkClick(e, '/host/create', router);
                                setShowMobileMenu(false);
                              }}
                              className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl transition-all cursor-pointer touch-manipulation font-bold shadow-lg hover:shadow-xl group"
                            >
                              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
                              </div>
                              <span className="text-base sm:text-lg">Mettre mon espace en ligne</span>
                            </Link>
                          </>
                        )}
                        
                        <Link
                          href="/reservations"
                          prefetch={false}
                          onClick={(e) => { handleCapacitorLinkClick(e, '/reservations', router); setShowMobileMenu(false); }}
                          className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                        >
                          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-base sm:text-lg">Réservations</span>
                        </Link>
                        
                        {userMode === 'client' && (
                          <Link
                            href="/favoris"
                            prefetch={false}
                            onClick={(e) => { handleCapacitorLinkClick(e, '/favoris', router); setShowMobileMenu(false); }}
                            className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                          >
                            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                              <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                            </div>
                            <span className="font-semibold text-base sm:text-lg">Favoris</span>
                          </Link>
                        )}
                        
                        <Link
                          href="/messages"
                          prefetch={false}
                          onClick={(e) => { handleCapacitorLinkClick(e, '/messages', router); setShowMobileMenu(false); }}
                          className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200 relative"
                        >
                          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 relative">
                            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                            {unreadMessagesCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-base sm:text-lg">Messagerie</span>
                          {unreadMessagesCount > 0 && (
                            <span className="ml-2 px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full min-w-[24px] text-center flex-shrink-0">
                              {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                            </span>
                          )}
                        </Link>
                        
                        <Link
                          href="/parametres"
                          prefetch={false}
                          onClick={(e) => { handleCapacitorLinkClick(e, '/parametres', router); setShowMobileMenu(false); }}
                          className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                        >
                          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 relative">
                            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                            {userMode === 'host' && bankingInfoNeeded && (
                              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                !
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-base sm:text-lg">Paramètres</span>
                        </Link>
                        
                        <div className="border-t border-slate-200 my-4" />
                        
                        {/* Sélecteur de langue mobile */}
                        <div className="px-4 sm:px-5 py-3.5 sm:py-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" strokeWidth={2.5} />
                            <span className="text-sm font-semibold text-slate-700">{t('header.language') || 'Langue'}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setLanguage('fr');
                                setShowMobileMenu(false);
                              }}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors cursor-pointer touch-manipulation min-h-[44px]",
                                language === 'fr'
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {language === 'fr' && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
                              <span>Français</span>
                            </button>
                            <button
                              onClick={() => {
                                setLanguage('en');
                                setShowMobileMenu(false);
                              }}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors cursor-pointer touch-manipulation min-h-[44px]",
                                language === 'en'
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              )}
                            >
                              {language === 'en' && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
                              <span>English</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="border-t border-slate-200 my-4" />
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMobileMenu(false);
                            if (typeof window !== 'undefined') {
                              removeItem('finalIsLoggedIn');
                              removeItem('finalUserType');
                              removeItem('authToken');
                              removeItem('userName');
                              router.push('/');
                            }
                          }}
                          className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer touch-manipulation text-left group border border-transparent hover:border-red-200"
                        >
                          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-red-50 group-hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                            <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-base sm:text-lg">Déconnexion</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Non-logged in navigation - Amélioré */}
                      <div className="space-y-3">
                        {/* Sélecteur de langue mobile pour utilisateurs non connectés */}
                        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" strokeWidth={2.5} />
                            <span className="text-sm font-semibold text-slate-700">{t('header.language') || 'Langue'}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setLanguage('fr');
                                setShowMobileMenu(false);
                              }}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors cursor-pointer touch-manipulation min-h-[44px]",
                                language === 'fr'
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                              )}
                            >
                              {language === 'fr' && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
                              <span>Français</span>
                            </button>
                            <button
                              onClick={() => {
                                setLanguage('en');
                                setShowMobileMenu(false);
                              }}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors cursor-pointer touch-manipulation min-h-[44px]",
                                language === 'en'
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                              )}
                            >
                              {language === 'en' && <CheckCircle className="w-4 h-4" strokeWidth={2} />}
                              <span>English</span>
                            </button>
                          </div>
                        </div>
                        <Link
                          href="/auth/login"
                          prefetch={false}
                          onClick={(e) => { handleCapacitorLinkClick(e, '/auth/login', router); setShowMobileMenu(false); }}
                          className="flex items-center justify-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer touch-manipulation font-semibold text-base sm:text-lg border border-slate-200 hover:border-slate-300 shadow-sm"
                        >
                          <User className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                          <span>{t('header.login') || 'Connexion'}</span>
                        </Link>
                        <Link
                          href="/auth/signup"
                          prefetch={false}
                          onClick={(e) => { handleCapacitorLinkClick(e, '/auth/signup', router); setShowMobileMenu(false); }}
                          className="flex items-center justify-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 min-h-[52px] text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl transition-all cursor-pointer touch-manipulation font-bold text-base sm:text-lg shadow-lg hover:shadow-xl"
                        >
                          <UserCircle2 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                          <span>{t('header.signup') || 'Inscription'}</span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Modal Filtres Avancés */}
      {showAdvancedFilters && (
        <AdvancedFilters
          selectedTypes={selectedPlaceType ? [selectedPlaceType.toLowerCase()] : []}
          onTypesChange={(types) => {
            if (types.length > 0) {
              const type = types[0].toUpperCase() as 'PARKING' | 'CAVE' | 'STORAGE_SPACE';
              setSelectedPlaceType(type);
            } else {
              setSelectedPlaceType(null);
            }
          }}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          priceUnit={priceUnit}
          onPriceUnitChange={setPriceUnit}
          selectedEquipment={selectedEquipment}
          onEquipmentChange={setSelectedEquipment}
          instantBooking={instantBooking}
          onInstantBookingChange={setInstantBooking}
          freeCancellation={freeCancellation}
          onFreeCancellationChange={setFreeCancellation}
          noDeposit={noDeposit}
          onNoDepositChange={setNoDeposit}
          selectedCharacteristics={selectedCharacteristics}
          onCharacteristicsChange={setSelectedCharacteristics}
          searchRadius={searchRadius}
          onSearchRadiusChange={setSearchRadius}
          onClose={() => {
            setShowAdvancedFilters(false);
          }}
          onApplyFilters={handleApplyFilters}
          filteredListingsCount={0}
        />
      )}
    </header>
    <AlertModal
      isOpen={showGeoAlert}
      onClose={() => setShowGeoAlert(false)}
      title="Géolocalisation"
      message={geoAlertMessage}
      buttonText="OK"
    />
    </>
  );
}
