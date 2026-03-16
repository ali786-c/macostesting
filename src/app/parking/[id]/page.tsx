'use client';

import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Share2, MapPin, Car, Box, Warehouse, Shield, MessageCircle, ChevronLeft, ChevronRight, Calendar, Clock, Award, ChevronDown, DoorClosed, ShieldCheck, CreditCard, CheckCircle, FileText, AlertCircle, BarChart3, Filter, HelpCircle, Send, Mail, Instagram, Check, Flag, X, Navigation, Ruler, Lock, Key, Lightbulb, Wrench, Package, Ban, Star, Tag, Search } from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import LoadingLogo from '@/components/ui/loading-logo';
import AnimatedLoadingText from '@/components/ui/animated-loading-text';
import { rentoallReviewsAPI, ReviewDTO, placesAPI, PlaceDTO, PlaceAvailabilityDTO, reservationsAPI, rentoallFavoritesAPI, paymentsAPI, rentoallUsersAPI, reportingAPI, PlaceReportDTO, ReportReason, OccupiedSlotDTO, promoCodesAPI, PromoCodeValidateResponseDTO } from '@/services/api';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getCancellationPolicyText, cn, epureAddress, getDisplayFirstName, getServiceFee, addServiceFee, capitalizeFirstPerLine, getDefaultPlaceImage } from '@/lib/utils';
import { toApiDateTime, fromApiDateTime, utcTimeToLocalTimeString } from '@/lib/datetime';
import { getAppBaseUrl } from '@/lib/app-url';
import { capacitorNavigate, isCapacitor, handleCapacitorLinkClick } from '@/lib/capacitor';
import StripeEmbeddedCheckout from '@/components/StripeEmbeddedCheckout';
import dynamic from 'next/dynamic';
import type { Property } from '@/components/map/PropertiesMapMapLibre';
import { useLanguage } from '@/contexts/LanguageContext';

// Import dynamique pour éviter le SSR
const PropertiesMap = dynamic(() => import('@/components/map/PropertiesMapMapLibre'), {
  ssr: false,
});

const getMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  return { daysInMonth, startingDayOfWeek };
};

// Interface locale pour l'affichage des reviews
interface ReviewDisplay {
  id: number;
  author: string;
  avatar: string;
  date: string;
  dateValue: Date;
  rating: number;
  comment: string;
}

// City coordinates for fallback
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
};

export default function ParkingDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : String(params?.id ?? '');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // État pour gérer l'affichage : -1 = vidéo, 0+ = index de la photo
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(-1);
  const [isLiked, setIsLiked] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [place, setPlace] = useState<PlaceDTO | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingDate, setSelectingDate] = useState<'arrival' | 'departure' | null>(null); // To know which field is being selected
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [reviewSort, setReviewSort] = useState<'best' | 'worst' | 'recent' | 'oldest'>('recent');
  const [startHour, setStartHour] = useState<string>('09:00');
  const [endHour, setEndHour] = useState<string>('18:00');
  const [reviews, setReviews] = useState<ReviewDisplay[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const dayWeekScrollRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const currentDateRef = useRef<Date>(new Date());
  /** Ref sur le haut du contenu pour forcer la page à rester en haut à l'arrivée (éviter focus/scroll sur la carte) */
  const topOfPageRef = useRef<HTMLDivElement>(null);
  /** Colonne visible du strip jour/semaine (0=précédent, 1=actuel, 2=suivant) - évite sauts */
  const scrollStripLastColumnRef = useRef<number>(1);
  /** Scroll programmatique en cours - ne pas mettre à jour currentDate depuis le scroll */
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const [showDateTooltip, setShowDateTooltip] = useState(false);
  const [showCharacteristics, setShowCharacteristics] = useState(false);
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [showReportPlaceModal, setShowReportPlaceModal] = useState(false);
  const [reportPlaceReason, setReportPlaceReason] = useState('');
  const [reportPlaceDescription, setReportPlaceDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [ownerFirstName, setOwnerFirstName] = useState<string>('');
  const [calendarOccupiedSlots, setCalendarOccupiedSlots] = useState<OccupiedSlotDTO[]>([]);
  const [calendarAvailabilities, setCalendarAvailabilities] = useState<PlaceAvailabilityDTO[]>([]);
  const [stripeEmbeddedClientSecret, setStripeEmbeddedClientSecret] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  type PromoValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';
  const [promoValidation, setPromoValidation] = useState<{
    status: PromoValidationStatus;
    data?: PromoCodeValidateResponseDTO;
    error?: string;
  }>({ status: 'idle' });

  // Recalculer si le code dépasse 10 % du montant à chaque changement de dates / période (pour affichage immédiat)
  const [promoExceedsMaxPercent, setPromoExceedsMaxPercent] = useState(false);
  useEffect(() => {
    if (promoValidation.status !== 'valid' || !promoValidation.data) {
      setPromoExceedsMaxPercent(false);
      return;
    }
    const pl = place;
    if (!pl) {
      setPromoExceedsMaxPercent(false);
      return;
    }
    let basePrice = 0;
    if (selectedPeriod === 'hourly') {
      const pricePerHour = (pl.hourPriceActive === true && pl.pricePerHour)
        ? pl.pricePerHour
        : (pl.dayPriceActive === true && pl.pricePerDay)
          ? pl.pricePerDay / 24
          : 0;
      const dur = startHour && endHour
        ? (() => {
            const [sH, sM] = startHour.split(':').map(Number);
            const [eH, eM] = endHour.split(':').map(Number);
            const startMin = sH * 60 + sM;
            const endMin = eH * 60 + eM;
            let diff = endMin - startMin;
            if (diff < 0) diff += 24 * 60;
            return Math.ceil(diff / 60);
          })()
        : 0;
      basePrice = pricePerHour * dur;
    } else if (selectedPeriod === 'daily' && selectedStartDate && selectedEndDate) {
      basePrice = getBasePriceForDailyRange(pl, selectedStartDate, selectedEndDate);
    } else if (selectedPeriod === 'weekly' && selectedStartDate && selectedEndDate) {
      const days = Math.ceil((selectedEndDate.getTime() - selectedStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeks = Math.ceil(days / 7);
      const pricePerWeek = (pl.weekPriceActive === true && pl.pricePerWeek)
        ? pl.pricePerWeek
        : (pl.dayPriceActive === true && pl.pricePerDay) ? pl.pricePerDay * 7 : 0;
      basePrice = pricePerWeek * weeks;
    } else if (selectedPeriod === 'monthly' && selectedStartDate && selectedEndDate) {
      const monthsDiff = (selectedEndDate.getFullYear() - selectedStartDate.getFullYear()) * 12
        + (selectedEndDate.getMonth() - selectedStartDate.getMonth());
      const months = Math.max(1, monthsDiff);
      const pricePerMonth = (pl.monthPriceActive === true && pl.pricePerMonth) ? pl.pricePerMonth : 0;
      basePrice = pricePerMonth * months;
    }
    const totalPrice = addServiceFee(basePrice);
    if (totalPrice <= 0) {
      setPromoExceedsMaxPercent(false);
      return;
    }
    const data = promoValidation.data;
    const amount = data.amount ?? 0;
    const discountEur = data.discountType === 'PERCENTAGE' ? totalPrice * (amount / 100) : amount;
    setPromoExceedsMaxPercent(discountEur > totalPrice * 0.10);
  }, [
    promoValidation.status,
    promoValidation.data,
    place,
    selectedPeriod,
    selectedStartDate,
    selectedEndDate,
    startHour,
    endHour,
  ]);
  
  // Valider le code promo après que l'utilisateur a fini de taper (debounce)
  useEffect(() => {
    const raw = promoCode.trim();
    if (!raw) {
      setPromoValidation({ status: 'idle' });
      return;
    }
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) {
      setPromoValidation({ status: 'idle' });
      return;
    }
    const timer = window.setTimeout(() => {
      setPromoValidation((prev) => ({ ...prev, status: 'validating', error: undefined }));
      promoCodesAPI
        .validate(raw, parseInt(userId, 10))
        .then((data) => {
          setPromoValidation({ status: 'valid', data });
        })
        .catch((err: { response?: { data?: { message?: string; error?: string } }; message?: string }) => {
          const message =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Code invalide ou expiré';
          setPromoValidation({ status: 'invalid', error: message });
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [promoCode]);
  // Get month and day names from translations (must be before conditional returns)
  // Use default values to avoid hydration issues, will update after mount
  const monthNames = useMemo(() => {
    try {
      const translated = t('parking.monthNames') as unknown as string[];
      if (Array.isArray(translated) && translated.length > 0) {
        return translated;
      }
    } catch {
      // Fallback if translation fails
    }
    return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  }, [t]);
  
  const dayNames = useMemo(() => {
    try {
      const translated = t('parking.dayNames') as unknown as string[];
      if (Array.isArray(translated) && translated.length > 0) {
        return translated;
      }
    } catch {
      // Fallback if translation fails
    }
    return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  }, [t]);
  
  // Durée minimum en heures pour la résa à l'heure : 1h si non définie ou 0 (avant early returns pour être utilisée dans les effets)
  const effectiveMinHours = useMemo(() => {
    const raw = place?.minHours;
    if (raw == null) return 1;
    const n = Number(raw);
    return n > 0 ? n : 1;
  }, [place?.minHours]);
  
  // Éviter les erreurs d'hydratation en attendant que le composant soit monté côté client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Rechargement automatique au retour depuis Stripe (ou payment/cancel) : la page peut être en cache (bfcache) et afficher "Page introuvable" ou un état incohérent
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // Garder la ref à jour pour le listener de scroll (évite de recréer le listener à chaque changement de date)
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  // Initialize selected period with first available period on place load
  useEffect(() => {
    if (!place) return;
    
    // Vérifier quelles périodes sont disponibles (uniquement si le booléen d'activation est true)
    const hasHourlyPrice = place.hourPriceActive === true && place.pricePerHour && place.pricePerHour > 0;
    const hasDailyPrice = place.dayPriceActive === true && place.pricePerDay && place.pricePerDay > 0;
    const hasWeeklyPrice = place.weekPriceActive === true && place.pricePerWeek && place.pricePerWeek > 0;
    const hasMonthlyPrice = place.monthPriceActive === true && place.pricePerMonth && place.pricePerMonth > 0;
    
    // Déterminer la première période disponible dans l'ordre de priorité
    let firstAvailablePeriod: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily';
    if (hasHourlyPrice) {
      firstAvailablePeriod = 'hourly';
    } else if (hasDailyPrice) {
      firstAvailablePeriod = 'daily';
    } else if (hasWeeklyPrice) {
      firstAvailablePeriod = 'weekly';
    } else if (hasMonthlyPrice) {
      firstAvailablePeriod = 'monthly';
    }
    
    // Initialiser avec la première période disponible
    setSelectedPeriod(firstAvailablePeriod);
  }, [place?.id]); // Runs only when place changes
  
  // Adjust selected period if it becomes unavailable
  useEffect(() => {
    if (!place) return;
    
    // Vérifier si la période actuelle a un prix disponible (uniquement si le booléen d'activation est true)
    const hasHourlyPrice = place.hourPriceActive === true && place.pricePerHour && place.pricePerHour > 0;
    const hasDailyPrice = place.dayPriceActive === true && place.pricePerDay && place.pricePerDay > 0;
    const hasWeeklyPrice = place.weekPriceActive === true && place.pricePerWeek && place.pricePerWeek > 0;
    const hasMonthlyPrice = place.monthPriceActive === true && place.pricePerMonth && place.pricePerMonth > 0;
    
    // Si la période actuelle n'a pas de prix, changer vers la première disponible
    if (selectedPeriod === 'hourly' && !hasHourlyPrice) {
      if (hasDailyPrice) setSelectedPeriod('daily');
      else if (hasWeeklyPrice) setSelectedPeriod('weekly');
      else if (hasMonthlyPrice) setSelectedPeriod('monthly');
    } else if (selectedPeriod === 'daily' && !hasDailyPrice) {
      if (hasHourlyPrice) setSelectedPeriod('hourly');
      else if (hasWeeklyPrice) setSelectedPeriod('weekly');
      else if (hasMonthlyPrice) setSelectedPeriod('monthly');
    } else if (selectedPeriod === 'weekly' && !hasWeeklyPrice) {
      if (hasHourlyPrice) setSelectedPeriod('hourly');
      else if (hasDailyPrice) setSelectedPeriod('daily');
      else if (hasMonthlyPrice) setSelectedPeriod('monthly');
    } else if (selectedPeriod === 'monthly' && !hasMonthlyPrice) {
      if (hasHourlyPrice) setSelectedPeriod('hourly');
      else if (hasDailyPrice) setSelectedPeriod('daily');
      else if (hasWeeklyPrice) setSelectedPeriod('weekly');
    }
  }, [place, selectedPeriod]);

  // Remettre le calendrier à zéro (sans date de début ni de fin) dès qu'on change le type de résa (Heure/Jour/Semaine/Mois)
  useEffect(() => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setSelectingDate(null);
    setReservationError(null);
  }, [selectedPeriod]);

  // Adjust end time if it becomes invalid when changing start time or hourly mode
  useEffect(() => {
    if (selectedPeriod === 'hourly' && startHour && effectiveMinHours > 0) {
      const [startH, startM] = startHour.split(':').map(Number);
      const minEndTime = new Date();
      minEndTime.setHours(startH + effectiveMinHours, 0, 0, 0);
      
      const [endH, endM] = endHour.split(':').map(Number);
      const currentEndTime = new Date();
      currentEndTime.setHours(endH, endM, 0, 0);
      
      // Si l'heure de fin actuelle est avant l'heure de fin minimum, la corriger
      if (currentEndTime < minEndTime) {
        const newEndHour = `${minEndTime.getHours().toString().padStart(2, '0')}:${minEndTime.getMinutes().toString().padStart(2, '0')}`;
        setEndHour(newEndHour);
        console.log('🕐 [PARKING DETAIL] End time automatically adjusted:', newEndHour, '(min duration:', effectiveMinHours, 'h)');
      }
    }
  }, [startHour, effectiveMinHours, selectedPeriod]);

  // Reset image index when place changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [place?.id]);

  // Check if place is in favorites on load
  // ✅ OPTIMISATION: Ne dépendre que de place.id pour éviter les rechargements inutiles
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!place?.id) return;
      
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setIsLiked(false);
          return;
        }

        const userIdNum = parseInt(userId, 10);
        const favorites = await rentoallFavoritesAPI.getFavorites(userIdNum);
        const isFavorite = favorites.some(fav => fav.id === place.id);
        setIsLiked(isFavorite);
      } catch (error) {
        console.error('❌ [FAVORITES] Error checking favorite status:', error);
        setIsLiked(false);
      }
    };

    checkFavoriteStatus();
  }, [place?.id]); // ✅ OPTIMISATION: Dépendre uniquement de place.id au lieu de tout l'objet place

  // Charger le prénom du propriétaire pour l'affichage (sans l'ID)
  useEffect(() => {
    const fetchOwnerName = async () => {
      if (!place?.ownerId) {
        setOwnerFirstName('');
        return;
      }
      try {
        const owner = await rentoallUsersAPI.getProfile(place.ownerId);
        setOwnerFirstName(owner.firstName || '');
      } catch {
        setOwnerFirstName('');
      }
    };
    fetchOwnerName();
  }, [place?.ownerId]);

  // Handle adding/removing favorites
  const handleToggleFavorite = async () => {
    if (!place || isTogglingFavorite) return;

    const userId = localStorage.getItem('userId');
    if (!userId) {
      // Rediriger vers la page de connexion de manière non intrusive
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      if (isCapacitor()) { capacitorNavigate('/auth/login'); } else { router.push('/auth/login'); }
      return;
    }

    setIsTogglingFavorite(true);
    const previousState = isLiked;

    // Optimistic update
    setIsLiked(!isLiked);

    try {
      const userIdNum = parseInt(userId, 10);
      
      if (previousState) {
        // Remove from favorites
        await rentoallFavoritesAPI.removeFavorite(userIdNum, place.id);
        console.log('✅ [FAVORITES] Favorite removed');
      } else {
        // Add to favorites
        await rentoallFavoritesAPI.addFavorite(userIdNum, place.id);
        console.log('✅ [FAVORITES] Favorite added');
      }
    } catch (error) {
      console.error('❌ [FAVORITES] Error toggling favorite:', error);
      // Revert to previous state on error
      setIsLiked(previousState);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Handle sharing
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${getAppBaseUrl()}/parking/${id}`;
  };

  const copyToClipboard = async (closeMenu: boolean = true) => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      if (closeMenu) {
        setShowShareMenu(false);
      }
      setTimeout(() => setUrlCopied(false), 2000);
      console.log('✅ [SHARE] URL copied to clipboard:', url);
    } catch (error) {
      console.error('❌ [SHARE] Error copying to clipboard:', error);
      // Fallback for browsers that don't support Clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = getShareUrl();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setUrlCopied(true);
      if (closeMenu) {
        setShowShareMenu(false);
      }
      setTimeout(() => setUrlCopied(false), 2000);
    }
  };

  const shareViaEmail = () => {
    const url = getShareUrl();
    const subject = encodeURIComponent(t('parking.shareEmailSubject'));
    const body = encodeURIComponent(t('parking.shareEmailBody', { url }));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShowShareMenu(false);
  };

  const shareViaInstagram = () => {
    // Instagram doesn't allow direct sharing via URL, copy URL
    copyToClipboard();
    // Ouvrir Instagram dans un nouvel onglet
    window.open('https://www.instagram.com/', '_blank');
  };

  const shareViaWhatsApp = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(t('parking.shareWhatsAppText', { url }));
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle menu without automatically copying
    setShowShareMenu(prev => !prev);
  };
  
  // ✅ OPTIMISATION: Utiliser un ref pour éviter les appels multiples simultanés
  const isRefreshingCalendarRef = useRef(false);

  // Function to reload only calendar data (availabilities and occupied slots)
  const refreshCalendarData = async () => {
    if (!place || isRefreshingCalendarRef.current) return;
    
    try {
      isRefreshingCalendarRef.current = true;
      const placeId = parseInt(id, 10);
      console.log('🔄 [CALENDAR] Reloading calendar data for place:', placeId);
      
      // Reload only data needed for calendar
      const placeData = await placesAPI.getById(placeId);
      
      if (placeData) {
        // Update only calendar data without touching the rest
        setPlace(prevPlace => {
          if (!prevPlace) return placeData;
          return {
            ...prevPlace,
            availabilities: placeData.availabilities,
            occupiedSlots: placeData.occupiedSlots,
          };
        });
        console.log('✅ [CALENDAR] Calendar data updated');
      }
    } catch (error) {
      console.error('❌ [CALENDAR] Error reloading calendar data:', error);
    } finally {
      isRefreshingCalendarRef.current = false;
    }
  };

  // Load place from API with all data (availabilities, occupiedSlots)
  useEffect(() => {
    const loadPlace = async () => {
      const placeId = parseInt(id, 10);
      if (!id || isNaN(placeId)) {
        setIsLoadingPlace(false);
        setPlace(null);
        return;
      }
      try {
        setIsLoadingPlace(true);
        console.log('🔵 [PLACE] Loading place:', placeId);
        
        // Use getById to retrieve all data (availabilities, occupiedSlots, etc.)
        const placeData = await placesAPI.getById(placeId);
        
        if (placeData) {
          console.log('✅ [PLACE] Place found:', placeData);
          console.log('✅ [PLACE] Availabilities:', placeData.availabilities);
          console.log('✅ [PLACE] Occupied slots:', placeData.occupiedSlots);
          console.log('✅ [PLACE] Active prices:', {
            hour: placeData.hourPriceActive,
            day: placeData.dayPriceActive,
            week: placeData.weekPriceActive,
            month: placeData.monthPriceActive
          });
          setPlace(placeData);
        } else {
          console.warn('⚠️ [PLACE] Place not found:', placeId);
          setPlace(null);
        }
      } catch (error) {
        console.error('❌ [PLACE] Error loading place:', error);
        setPlace(null);
      } finally {
        setIsLoadingPlace(false);
      }
    };

    loadPlace();
  }, [id]);

  // Fetch calendar (occupiedSlots) via GET /places/{id}/calendar for the date range
  useEffect(() => {
    if (!place || !id) return;
    const placeId = parseInt(id, 10);
    if (isNaN(placeId)) return;

    const fetchCalendar = async () => {
      try {
        const refDate = selectedPeriod === 'hourly' && selectedStartDate
          ? selectedStartDate
          : currentDate;
        const year = refDate.getFullYear();
        const month = refDate.getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        const startStr = toLocalDateString(start);
        const endStr = toLocalDateString(end);

        const calendarData = await placesAPI.getPlaceCalendar(placeId, startStr, endStr);
        setCalendarOccupiedSlots(calendarData.occupiedSlots ?? []);
        setCalendarAvailabilities(calendarData.availabilities ?? []);
      } catch (err) {
        console.error('❌ [CALENDAR] Error fetching calendar:', err);
        setCalendarOccupiedSlots([]);
        setCalendarAvailabilities([]);
      }
    };

    fetchCalendar();
  }, [place, id, selectedPeriod, selectedStartDate, currentDate]);

  // Detect return after payment and update only calendar
  // ✅ OPTIMISATION: Utiliser un ref pour éviter les appels multiples même si place change
  const paymentReturnProcessedRef = useRef(false);
  useEffect(() => {
    const paymentReturn = searchParams.get('paymentReturn');
    // ✅ OPTIMISATION: Vérifier paymentReturn ET que place existe, utiliser le ref pour éviter les doubles appels
    if (paymentReturn === 'true' && place && !paymentReturnProcessedRef.current) {
      paymentReturnProcessedRef.current = true;
      // Update only calendar data without reloading entire page
      refreshCalendarData();
      // Clean URL parameter to avoid repeated reloads
      router.replace(`/parking/${id}`, { scroll: false });
    }
    // Reset le flag si paymentReturn n'est plus présent
    if (paymentReturn !== 'true') {
      paymentReturnProcessedRef.current = false;
    }
  }, [searchParams, place, id, router]); // ✅ OPTIMISATION: Garder place pour détecter quand il est chargé, mais utiliser le ref pour éviter les doubles appels

  // Load reviews from API (must be before conditional returns)
  // ✅ OPTIMISATION: Les reviews ne dépendent que de l'ID, pas de l'objet place complet
  useEffect(() => {
    const loadReviews = async () => {
      if (!id) return;
      
      try {
        setIsLoadingReviews(true);
        const placeId = parseInt(id, 10);
        console.log('🔵 [REVIEWS] Loading reviews for place:', placeId);
        
        const reviewsData: ReviewDTO[] = await rentoallReviewsAPI.getPlaceReviews(placeId);
        console.log('✅ [REVIEWS] Reviews retrieved:', reviewsData);
        
        // Transformer les ReviewDTO en ReviewDisplay pour l'affichage
        const transformedReviews: ReviewDisplay[] = reviewsData.map((review) => {
          const createdAt = review.createdAt ? new Date(review.createdAt) : new Date();
          const now = new Date();
          const diffTime = now.getTime() - createdAt.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          let dateText = '';
          if (diffDays === 0) dateText = t('parking.today');
          else if (diffDays === 1) dateText = t('parking.daysAgo', { days: 1 });
          else if (diffDays < 7) dateText = t('parking.daysAgoPlural', { days: diffDays });
          else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            dateText = weeks > 1 ? t('parking.weeksAgoPlural', { weeks }) : t('parking.weeksAgo', { weeks });
          }
          else if (diffDays < 365) dateText = t('parking.monthsAgo', { months: Math.floor(diffDays / 30) });
          else {
            const years = Math.floor(diffDays / 365);
            dateText = years > 1 ? t('parking.yearsAgoPlural', { years }) : t('parking.yearsAgo', { years });
          }
          
          // Type-safe extraction of author ID
          const reviewWithAuthor = review as ReviewDTO & { authorId?: number; authorName?: string; author?: { id: string; firstName?: string } };
          const authorId = typeof reviewWithAuthor.authorId === 'number' 
            ? reviewWithAuthor.authorId 
            : (typeof reviewWithAuthor.author === 'object' && reviewWithAuthor.author?.id 
              ? parseInt(String(reviewWithAuthor.author.id), 10) 
              : 0);
          
          return {
            id: typeof review.id === 'number' ? review.id : (typeof review.id === 'string' ? parseInt(review.id, 10) : authorId),
            author: getDisplayFirstName(
              (typeof reviewWithAuthor.authorName === 'string' ? reviewWithAuthor.authorName : null) 
                || (typeof reviewWithAuthor.author === 'object' ? reviewWithAuthor.author : null),
              `${t('parking.user')} ${authorId}`
            ),
            avatar: '/logoR.png', // Avatar par défaut
            date: dateText,
            dateValue: createdAt,
            rating: (() => {
              const customRating = (reviewWithAuthor as ReviewDTO & { rating?: number }).rating;
              if (typeof customRating === 'number') return customRating;
              return review.overallRating ?? 0;
            })(),
            comment: (() => {
              const customComment = (reviewWithAuthor as ReviewDTO & { comment?: string }).comment;
              if (typeof customComment === 'string') return customComment;
              return review.generalFeedback || '';
            })(),
          };
        });
        
        setReviews(transformedReviews);
      } catch (error) {
        console.error('❌ [REVIEWS] Error loading reviews:', error);
        // On error, keep empty list rather than crashing
        setReviews([]);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    loadReviews();
  }, [id]); // ✅ OPTIMISATION: Retirer place des dépendances car les reviews ne dépendent que de l'ID


  // Scroll to top of page on load or ID change - NE JAMAIS laisser le focus/scroll descendre sur la carte
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      // Forcer le haut du contenu en vue (contre le scroll anchoring / focus carte)
      topOfPageRef.current?.scrollIntoView({ block: 'start', behavior: 'auto', inline: 'nearest' });
    };

    // Désactiver la restauration automatique du scroll par le navigateur
    const prevScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';

    // Supprimer un éventuel hash (#...) pour éviter un scroll automatique du navigateur
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Forcer le scroll en haut immédiatement
    scrollToTop();

    // Réexécuter après le chargement du bien (la carte MapLibre s'affiche et peut voler le focus)
    const t1 = setTimeout(scrollToTop, 100);
    const t2 = setTimeout(scrollToTop, 400);
    const t3 = setTimeout(scrollToTop, 800);
    const t4 = setTimeout(scrollToTop, 1200);
    const t5 = setTimeout(scrollToTop, 1600);

    return () => {
      history.scrollRestoration = prevScrollRestoration;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [id]);

  // Re-scroll en haut quand le bien est chargé (la carte apparaît et peut déclencher un scroll)
  useEffect(() => {
    if (typeof window === 'undefined' || isLoadingPlace) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    topOfPageRef.current?.scrollIntoView({ block: 'start', behavior: 'auto', inline: 'nearest' });
    const t1 = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      topOfPageRef.current?.scrollIntoView({ block: 'start', behavior: 'auto', inline: 'nearest' });
    }, 300);
    const t2 = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      topOfPageRef.current?.scrollIntoView({ block: 'start', behavior: 'auto', inline: 'nearest' });
    }, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [id, isLoadingPlace]);


  // Handle daily/weekly calendar scroll: update currentDate ONLY when scroll has clearly settled (seuils stricts + debounce long)
  // pour éviter tout saut de jour/semaine et toute double mise à jour.
  useEffect(() => {
    const scrollContainer = dayWeekScrollRef.current;
    if (!scrollContainer || (selectedPeriod !== 'daily' && selectedPeriod !== 'weekly')) return;

    let scrollEndTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (!scrollContainer) return;
      if (isProgrammaticScrollRef.current) return; // ne jamais mettre à jour pendant un scroll programmatique

      isUserScrollingRef.current = true;
      clearTimeout(scrollEndTimeout);

      scrollEndTimeout = setTimeout(() => {
        isUserScrollingRef.current = false;
        if (isProgrammaticScrollRef.current) return;

        const containerWidth = scrollContainer.clientWidth;
        if (containerWidth <= 0) return;

        const scrollLeft = scrollContainer.scrollLeft;
        // Seuils stricts : on ne change de date que si le scroll est clairement dans la colonne précédente ou suivante
        // (pas au milieu), pour éviter les sauts dus à Math.round ou au snap en cours.
        const inLeftColumn = scrollLeft < containerWidth * 0.35;   // première colonne (jour/semaine précédent)
        const inRightColumn = scrollLeft > containerWidth * 1.65; // troisième colonne (jour/semaine suivant)
        if (!inLeftColumn && !inRightColumn) return; // on reste au centre, pas de changement

        const goingToPrevious = inLeftColumn;
        const goingToNext = inRightColumn;
        // Éviter double mise à jour : on ne réagit que si on n'est pas déjà en train d'afficher cette colonne
        if (goingToPrevious && scrollStripLastColumnRef.current === 0) return;
        if (goingToNext && scrollStripLastColumnRef.current === 2) return;

        const baseDate = currentDateRef.current;
        const newDate = new Date(baseDate);
        if (selectedPeriod === 'daily') {
          newDate.setDate(baseDate.getDate() + (goingToPrevious ? -1 : 1));
        } else {
          // Weekly : avancer/reculer d'exactement une semaine (normaliser au lundi pour cohérence)
          const monday = new Date(baseDate);
          monday.setDate(monday.getDate() - monday.getDay() + 1);
          monday.setHours(0, 0, 0, 0);
          newDate.setTime(monday.getTime());
          newDate.setDate(newDate.getDate() + (goingToPrevious ? -7 : 7));
        }

        const newDateStr = toLocalDateString(newDate);
        const currentStr = toLocalDateString(baseDate);
        if (newDateStr === currentStr) return;

        scrollStripLastColumnRef.current = goingToPrevious ? 0 : 2;
        setCurrentDate(newDate);
      }, 500); // debounce long pour laisser le snap et l'inertie se stabiliser
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollEndTimeout);
    };
  }, [selectedPeriod]);

  // Reposition scroll strip au centre (colonne actuelle) quand currentDate change (boutons ou fin de scroll).
  // Scroll instantané + garde programmatique longue pour éviter que le listener de scroll ne réagisse.
  useEffect(() => {
    const scrollContainer = dayWeekScrollRef.current;
    if (!scrollContainer || (selectedPeriod !== 'daily' && selectedPeriod !== 'weekly')) return;
    if (isUserScrollingRef.current) return;

    const timeoutId = setTimeout(() => {
      const columnWidth = scrollContainer.clientWidth;
      if (columnWidth <= 0) return;
      const targetScrollLeft = columnWidth; // colonne du milieu (index 1)
      const currentScrollLeft = scrollContainer.scrollLeft;
      if (Math.abs(currentScrollLeft - targetScrollLeft) <= 20) {
        scrollStripLastColumnRef.current = 1;
        return;
      }
      isProgrammaticScrollRef.current = true;
      scrollStripLastColumnRef.current = 1;
      scrollContainer.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
      // Garde longue pour que tout scroll event déclenché par ce scroll soit ignoré
      setTimeout(() => { isProgrammaticScrollRef.current = false; }, 250);
    }, 80);

    return () => clearTimeout(timeoutId);
  }, [currentDate, selectedPeriod]);

  // Initialize currentMediaIndex to -1 (video) if it exists, otherwise 0 (first photo)
  // IMPORTANT: This useEffect must be BEFORE early returns to respect hook order
  useEffect(() => {
    if (!place) return;
    
    const photos = place.photos && Array.isArray(place.photos) && place.photos.length > 0 
      ? place.photos as string[] 
      : null;
    
    if (place.videoUrl) {
      setCurrentMediaIndex(-1);
    } else if (photos && photos.length > 0) {
      setCurrentMediaIndex(0);
    }
  }, [place?.videoUrl, place?.id]);

  // Create property for map from current place (BEFORE early returns to respect hook order)
  const mapProperty: Property | null = useMemo(() => {
    if (!place) return null;

    // Try multiple ways to retrieve coordinates
    const placeWithCoords = place as PlaceDTO & { latitude?: number; lat?: number; longitude?: number; lng?: number };
    let lat: number | null = placeWithCoords?.latitude ?? placeWithCoords?.lat ?? null;
    let lng: number | null = placeWithCoords?.longitude ?? placeWithCoords?.lng ?? null;
    
    // Convert to number if they are strings
    if (typeof lat === 'string') lat = parseFloat(lat);
    if (typeof lng === 'string') lng = parseFloat(lng);
    
    // If no coordinates in backend or invalid coordinates, use city coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      const cityCoords = CITY_COORDINATES[place.city];
      if (cityCoords) {
        lat = cityCoords.lat;
        lng = cityCoords.lng;
      } else {
        // Fallback to Paris if city is not in list
        lat = CITY_COORDINATES['Paris'].lat;
        lng = CITY_COORDINATES['Paris'].lng;
      }
    }

    // Determine main price to display
    const price = place.pricePerDay || place.pricePerHour || place.pricePerWeek || place.pricePerMonth || 0;

    // Ensure coordinates are valid
    const finalLat = Number(lat);
    const finalLng = Number(lng);
    
    if (isNaN(finalLat) || isNaN(finalLng)) {
      console.warn('⚠️ [MAP] Invalid coordinates for place:', {
        id: place.id,
        city: place.city,
        lat,
        lng
      });
      return null;
    }

    // Get photos for image
    const photos = place.photos && Array.isArray(place.photos) && place.photos.length > 0 
      ? place.photos as string[] 
      : null;

    // Titre à partir de la description ou de l'adresse
    const title = capitalizeFirstPerLine(place.description?.split('.')[0] || `${place.address}, ${place.city}`);

    return {
      id: place.id,
      title: title,
      lat: finalLat,
      lng: finalLng,
      price: price,
      address: `${place.address}, ${place.city}`,
      status: 'available' as const,
      placeId: place.id,
      image: photos && photos.length > 0 ? photos[0] : undefined
    };
  }, [place]);

  // Effective occupied slots: merge calendar API + place.occupiedSlots (dedupe by start) so we never show hours that are taken
  const effectiveOccupiedSlots = useMemo(() => {
    const fromPlace = place?.occupiedSlots ?? [];
    const fromCalendar = calendarOccupiedSlots ?? [];
    const byStart = new Map<string, OccupiedSlotDTO>();
    [...fromPlace, ...fromCalendar].forEach((slot) => {
      const key = slot.start;
      if (!byStart.has(key)) byStart.set(key, slot);
    });
    return Array.from(byStart.values());
  }, [calendarOccupiedSlots, place?.occupiedSlots]);

  // Heures de début/fin pour résa daily/weekly/monthly : depuis RESERVATION_FREQUENCY_FROM / _TO des caractéristiques, sinon 00:00–23:59
  const reservationFrequencyTimes = useMemo(() => {
    const from = place?.characteristics?.find((c) => c.name === 'RESERVATION_FREQUENCY_FROM')?.value?.trim();
    const to = place?.characteristics?.find((c) => c.name === 'RESERVATION_FREQUENCY_TO')?.value?.trim();
    const parseTime = (s: string): { h: number; m: number } => {
      const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
      if (!match) return { h: 0, m: 0 };
      const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
      const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
      return { h, m };
    };
    return {
      start: from ? parseTime(from) : { h: 0, m: 0 },
      end: to ? parseTime(to) : { h: 23, m: 59 },
    };
  }, [place?.characteristics]);

  if (isLoadingPlace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <LoadingLogo size="md" />
          <AnimatedLoadingText
            label={mounted ? t('parking.loading') : 'Chargement...'}
            className="mt-4"
          />
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <HeaderNavigation />
        <main
          className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 mobile-page-main overflow-x-hidden parking-detail-main"
          style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}
        >
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 sm:p-10">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                <Box className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                {mounted ? t('parking.notFound') : 'Espace non trouvé'}
              </h1>
              <p className="text-slate-600 text-sm sm:text-base mb-6">
                Cet espace n&apos;existe pas ou n&apos;est plus disponible. Vous pouvez rechercher d&apos;autres parkings et espaces de stockage.
              </p>
              <Link
                href="/search-parkings"
                onClick={(e) => handleCapacitorLinkClick(e, '/search-parkings', router)}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg"
              >
                <Search className="w-4 h-4" />
                Voir les espaces disponibles
              </Link>
              <p className="mt-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  Retour
                </button>
              </p>
            </div>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  const TypeIcon = place.type === 'PARKING' ? Car : place.type === 'STORAGE_SPACE' ? Box : Warehouse;
  const typeLabel = place.type === 'PARKING' ? t('parking.type.parking') : place.type === 'STORAGE_SPACE' ? t('parking.type.storage') : t('parking.type.cellar');
  
  const displayTitle = capitalizeFirstPerLine(
    place.title
      ? place.title.trim() || `${typeLabel} - ${place.city}`
      : (place.description
        ? place.description.split('.').slice(0, 1).join('.') || `${typeLabel} - ${place.city}`
        : `${typeLabel} - ${place.city}`)
  );
  
  // Image par défaut
  const defaultImage = getDefaultPlaceImage(place?.type);

  // Helper pour obtenir les photos valides (URLs http uniquement, pas les placeholders backend)
  const getPhotos = (): string[] | null => {
    if (!place?.photos || !Array.isArray(place.photos)) return null;
    const valid = (place.photos as string[]).filter(p => typeof p === 'string' && p.startsWith('http'));
    return valid.length > 0 ? valid : null;
  };
  
  const photos = getPhotos();

  // Fonction pour obtenir tous les médias (vidéo + photos)
  const getAllMedia = () => {
    const media: Array<{ type: 'video' | 'photo'; url: string; index: number }> = [];
    
    // Ajouter la vidéo en premier si elle existe
    if (place?.videoUrl) {
      media.push({ type: 'video', url: place.videoUrl, index: -1 });
    }
    
    // Ajouter les photos
    if (photos && photos.length > 0) {
      photos.forEach((photo, index) => {
        media.push({ type: 'photo', url: photo, index });
      });
    }
    
    return media;
  };

  const allMedia = getAllMedia();
  const hasVideo = !!place?.videoUrl;
  const totalMedia = allMedia.length;

  // Navigation vers le média suivant
  const nextMedia = () => {
    if (totalMedia === 0) return;
    setCurrentMediaIndex((prev) => {
      if (prev === -1) {
        // Si on est sur la vidéo, aller à la première photo
        return hasVideo && photos && photos.length > 0 ? 0 : -1;
      } else {
        // Si on est sur une photo, aller à la suivante ou revenir à la vidéo
        const nextIndex = prev + 1;
        if (nextIndex >= (photos?.length || 0)) {
          // Revenir à la vidéo si elle existe, sinon rester sur la dernière photo
          return hasVideo ? -1 : prev;
        }
        return nextIndex;
      }
    });
  };

  // Navigation vers le média précédent
  const prevMedia = () => {
    if (totalMedia === 0) return;
    setCurrentMediaIndex((prev) => {
      if (prev === -1) {
        // Si on est sur la vidéo, aller à la dernière photo
        return hasVideo && photos && photos.length > 0 ? photos.length - 1 : -1;
      } else {
        // Si on est sur une photo, aller à la précédente ou revenir à la vidéo
        if (prev === 0) {
          return hasVideo ? -1 : prev;
        }
        return prev - 1;
      }
    });
  };

  // Fonctions de navigation pour compatibilité
  const nextImage = () => {
    nextMedia();
  };

  const prevImage = () => {
    prevMedia();
  };


  const { daysInMonth, startingDayOfWeek } = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  
  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    // Create normalized date to avoid timezone issues
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return normalizedDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit' });
  };

  // Date en YYYY-MM-DD en heure locale (évite décalage UTC avec toISOString)
  const toLocalDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Slots occupés pour un jour donné (filtrage par date, en date locale)
  const getOccupiedSlotsForDay = (date: Date): OccupiedSlotDTO[] => {
    const dateStr = toLocalDateString(new Date(date));
    return effectiveOccupiedSlots.filter((slot) => {
      const slotStart = fromApiDateTime(slot.start);
      const slotEnd = fromApiDateTime(slot.end);
      const slotStartStr = toLocalDateString(slotStart);
      const slotEndStr = toLocalDateString(slotEnd);
      return dateStr >= slotStartStr && dateStr <= slotEndStr;
    });
  };

  /** En mode horaire : vrai s'il existe au moins un créneau libre d'au moins durationHours sur cette journée. */
  const dayHasFreeSlotForDuration = (date: Date, durationHours: number): boolean => {
    if (durationHours <= 0) return true;
    const dateStr = toLocalDateString(new Date(date));
    const { start: freqStart, end: freqEnd } = reservationFrequencyTimes;
    const windowStartMin = freqStart.h * 60 + freqStart.m;
    const windowEndMin = freqEnd.h * 60 + freqEnd.m;
    if (windowEndMin <= windowStartMin) return true; // fenêtre 24h

    const occupiedMinutes: Array<[number, number]> = [];
    for (const slot of effectiveOccupiedSlots) {
      const slotStart = fromApiDateTime(slot.start);
      const slotEnd = fromApiDateTime(slot.end);
      const slotStartStr = toLocalDateString(slotStart);
      const slotEndStr = toLocalDateString(slotEnd);
      if (dateStr < slotStartStr || dateStr > slotEndStr) continue;
      const slotStartMin = slotStartStr === dateStr
        ? slotStart.getHours() * 60 + slotStart.getMinutes()
        : windowStartMin;
      const slotEndMin = slotEndStr === dateStr
        ? slotEnd.getHours() * 60 + slotEnd.getMinutes()
        : windowEndMin;
      const clampStart = Math.max(windowStartMin, slotStartMin);
      const clampEnd = Math.min(windowEndMin, slotEndMin);
      if (clampEnd > clampStart) occupiedMinutes.push([clampStart, clampEnd]);
    }
    occupiedMinutes.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const [s, e] of occupiedMinutes) {
      if (merged.length && s <= merged[merged.length - 1][1]) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      } else {
        merged.push([s, e]);
      }
    }
    const durationMin = durationHours * 60;
    let freeStart = windowStartMin;
    for (const [s, e] of merged) {
      if (freeStart < s && (s - freeStart) >= durationMin) return true;
      freeStart = Math.max(freeStart, e);
    }
    if ((windowEndMin - freeStart) >= durationMin) return true;
    return false;
  };

  // Vérifie si un créneau horaire (ex: 09:00) est occupé (dans une résa existante)
  const isTimeSlotOccupied = (time: string, date: Date): boolean => {
    const slotsForDay = getOccupiedSlotsForDay(date);
    if (slotsForDay.length === 0) return false;
    const [h, m] = time.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const dateStr = toLocalDateString(new Date(date));
    return slotsForDay.some((slot) => {
      const slotStart = fromApiDateTime(slot.start);
      const slotEnd = fromApiDateTime(slot.end);
      const slotStartStr = toLocalDateString(slotStart);
      const slotEndStr = toLocalDateString(slotEnd);
      if (dateStr < slotStartStr || dateStr > slotEndStr) return false;
      const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
      const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
      return slotMinutes >= slotStartMinutes && slotMinutes < slotEndMinutes;
    });
  };

  // Heures de disponibilité pour un jour (depuis availabilities ou 00:00-23:00)
  const getAvailabilityHoursForDay = (date: Date): { start: string; end: string } => {
    const dateStr = toLocalDateString(new Date(date));
    const av = place?.availabilities?.find((a) => a.date === dateStr);
    if (av?.startTime && av?.endTime) {
      // Back envoie les heures en UTC ; on affiche en timezone utilisateur
      const start = utcTimeToLocalTimeString(dateStr, av.startTime);
      const end = utcTimeToLocalTimeString(dateStr, av.endTime);
      return { start, end };
    }
    return { start: '00:00', end: '23:00' };
  };

  // Pour la résa à l'heure : plage 00:00-23:00 si le jour a des créneaux occupés, pour proposer
  // les trous (ex. 00:00-08:00 et 12:00-23:00 quand 08:00-12:00 est pris). Sinon on garde la dispo du jour.
  const getAvailabilityHoursForHourlyDay = (date: Date): { start: string; end: string } => {
    const slotsForDay = getOccupiedSlotsForDay(date);
    if (slotsForDay.length > 0) return { start: '00:00', end: '23:00' };
    return getAvailabilityHoursForDay(date);
  };

  // Generate time options (only full hours) - pour usage générique
  const generateTimeOptions = () => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      options.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return options;
  };

  // Créneaux de début disponibles pour le jour sélectionné (heures libres : 00:00-08:00 et 12:00-23:00 si 08-12 occupé)
  const generateStartTimeOptions = () => {
    if (!selectedStartDate || selectedPeriod !== 'hourly') return generateTimeOptions();
    return getStartTimeOptionsForDate(selectedStartDate);
  };

  // Helper : options de début pour une date donnée (pour rafraîchir les dropdowns à la sélection du jour)
  const getStartTimeOptionsForDate = (date: Date): string[] => {
    const allOptions = generateTimeOptions();
    if (selectedPeriod !== 'hourly') return allOptions;
    const { start: availStart, end: availEnd } = getAvailabilityHoursForHourlyDay(date);
    const [startH] = availStart.split(':').map(Number);
    const [endH] = availEnd.split(':').map(Number);
    const now = new Date();
    const todayStr = toLocalDateString(now);
    const selectedStr = toLocalDateString(date);
    const isToday = selectedStr === todayStr;
    return allOptions.filter((time) => {
      const [h] = time.split(':').map(Number);
      if (h < startH || h > endH) return false;
      if (isToday) {
        const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0, 0, 0);
        if (slotStart <= now) return false;
      }
      return !isTimeSlotOccupied(time, date);
    });
  };

  // Validation collision : (selectedStart < slotEnd) && (selectedEnd > slotStart)
  const isSlotOccupiedRange = (selectedStart: Date, selectedEnd: Date): boolean => {
    const slotsForDay = selectedStartDate ? getOccupiedSlotsForDay(selectedStartDate) : [];
    if (slotsForDay.length === 0) return false;
    return slotsForDay.some((slot) => {
      const slotStart = fromApiDateTime(slot.start);
      const slotEnd = fromApiDateTime(slot.end);
      return selectedStart.getTime() < slotEnd.getTime() && selectedEnd.getTime() > slotStart.getTime();
    });
  };

  // Generate end time options taking into account minimum duration and occupied slots
  const generateEndTimeOptions = (startHourOverride?: string) => {
    const effectiveStart = startHourOverride ?? startHour;
    if (!effectiveStart || !place) return generateTimeOptions();
    const allOptions = generateTimeOptions();
    if (!selectedStartDate || selectedPeriod !== 'hourly') {
      // Fallback pour mode non-horaire
      const [startH, startM] = effectiveStart.split(':').map(Number);
      const minRequiredHours = effectiveMinHours;
      const minEndTime = new Date();
      minEndTime.setHours(startH + minRequiredHours, 0, 0, 0);
      const minEndHour = minEndTime.getHours();
      const minEndMinute = minEndTime.getMinutes();
      return allOptions.filter((time) => {
        const [h, m] = time.split(':').map(Number);
        const timeDate = new Date();
        timeDate.setHours(h, m, 0, 0);
        const minDate = new Date();
        minDate.setHours(minEndHour, minEndMinute, 0, 0);
        return timeDate >= minDate;
      });
    }

    const [startH, startM] = effectiveStart.split(':').map(Number);
    const minRequiredHours = effectiveMinHours;
    const { end: availEnd } = getAvailabilityHoursForHourlyDay(selectedStartDate);
    const [availEndH] = availEnd.split(':').map(Number);

    const reqStart = new Date(selectedStartDate);
    reqStart.setHours(startH, startM, 0, 0);
    // Heure de fin minimum = début + durée min (heures pleines, pas d'arrondi qui ajouterait 1h)
    const minEndTime = new Date(selectedStartDate);
    minEndTime.setHours(startH + minRequiredHours, 0, 0, 0);

    const now = new Date();
    const todayStr = toLocalDateString(now);
    const selectedStr = toLocalDateString(selectedStartDate);
    const isToday = selectedStr === todayStr;

    return allOptions.filter((time) => {
      const [endH, endM] = time.split(':').map(Number);
      if (endH > availEndH || (endH === availEndH && endM > 0)) return false;
      const reqEnd = new Date(selectedStartDate);
      reqEnd.setHours(endH, endM, 0, 0);
      if (reqEnd < minEndTime) return false; // autoriser l'heure de fin égale à minEndTime (ex. 07:00→08:00)
      if (isToday && reqEnd <= now) return false; // jour en cours : pas d'heure de fin dans le passé
      return !isSlotOccupiedRange(reqStart, reqEnd);
    });
  };

  // Helper : options de fin pour une date et une heure de début (pour rafraîchir les dropdowns à la sélection du jour)
  const getEndTimeOptionsForDate = (date: Date, startHourStr: string): string[] => {
    const allOptions = generateTimeOptions();
    if (!startHourStr || !place || selectedPeriod !== 'hourly') return allOptions;
    const [startH] = startHourStr.split(':').map(Number);
    const minRequiredHours = effectiveMinHours;
    const { end: availEnd } = getAvailabilityHoursForHourlyDay(date);
    const [availEndH] = availEnd.split(':').map(Number);
    const reqStart = new Date(date);
    reqStart.setHours(startH, 0, 0, 0);
    const minEndTime = new Date(date);
    minEndTime.setHours(startH + minRequiredHours, 0, 0, 0);
    const now = new Date();
    const todayStr = toLocalDateString(now);
    const selectedStr = toLocalDateString(date);
    const isToday = selectedStr === todayStr;
    const slotsForDay = getOccupiedSlotsForDay(date);
    const isRangeOccupied = (reqStartD: Date, reqEndD: Date) => {
      if (slotsForDay.length === 0) return false;
      return slotsForDay.some((slot) => {
        const slotStart = fromApiDateTime(slot.start);
        const slotEnd = fromApiDateTime(slot.end);
        return reqStartD.getTime() < slotEnd.getTime() && reqEndD.getTime() > slotStart.getTime();
      });
    };
    return allOptions.filter((time) => {
      const [endH, endM] = time.split(':').map(Number);
      if (endH > availEndH || (endH === availEndH && endM > 0)) return false;
      const reqEnd = new Date(date);
      reqEnd.setHours(endH, endM, 0, 0);
      if (reqEnd < minEndTime) return false;
      if (isToday && reqEnd <= now) return false;
      return !isRangeOccupied(reqStart, reqEnd);
    });
  };

  // Check if a past date has a reservation (to allow modification)
  const hasPastReservation = (date: Date): boolean => {
    if (!effectiveOccupiedSlots.length) return false;
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If date is not past, return false
    if (checkDate >= today) return false;
    
    const checkDateStr = toLocalDateString(checkDate);
    return effectiveOccupiedSlots.some(slot => {
      const slotStart = fromApiDateTime(slot.start);
      const slotEnd = fromApiDateTime(slot.end);
      const slotStartStr = toLocalDateString(slotStart);
      const slotEndStr = toLocalDateString(slotEnd);
      return checkDateStr >= slotStartStr && checkDateStr <= slotEndStr;
    });
  };

  // Check if a date/time is occupied (uses effectiveOccupiedSlots: calendar API or place)
  const isDateTimeOccupied = (date: Date, startTime?: string, endTime?: string): boolean => {
    if (!effectiveOccupiedSlots.length) return false;
    
    const checkDate = new Date(date);
    const checkDateStr = toLocalDateString(checkDate);
    
    if (startTime && endTime) {
      // For hourly reservations, check overlap with occupied slots
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      
      const requestedStartMinutes = startH * 60 + startM;
      const requestedEndMinutes = endH * 60 + endM;
      
      return effectiveOccupiedSlots.some(slot => {
        const slotStart = fromApiDateTime(slot.start);
        const slotEnd = fromApiDateTime(slot.end);
        const slotStartStr = toLocalDateString(slotStart);
        const slotEndStr = toLocalDateString(slotEnd);
        
        if (checkDateStr < slotStartStr || checkDateStr > slotEndStr) return false;
        
        if (slotStartStr !== slotEndStr) {
          if (checkDateStr === slotStartStr) {
            const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
            if (slotEndStr === checkDateStr) {
              const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
              return (requestedStartMinutes < slotEndMinutes && requestedEndMinutes > slotStartMinutes);
            }
            return true;
          } else if (checkDateStr === slotEndStr) {
            const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
            const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
            return (requestedStartMinutes < slotEndMinutes && requestedEndMinutes > slotStartMinutes);
          }
          return true;
        }
        
        const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
        const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
        return (requestedStartMinutes < slotEndMinutes && requestedEndMinutes > slotStartMinutes);
      });
    } else {
      return effectiveOccupiedSlots.some(slot => {
        const slotStart = fromApiDateTime(slot.start);
        const slotEnd = fromApiDateTime(slot.end);
        const slotStartStr = toLocalDateString(slotStart);
        const slotEndStr = toLocalDateString(slotEnd);
        return checkDateStr >= slotStartStr && checkDateStr <= slotEndStr;
      });
    }
  };

  // Check if a date is available according to owner settings
  // Uses calendar availabilities (from GET /places/:id/calendar) first so blocked dates by host are greyed out
  const isDateAvailable = (date: Date): boolean => {
    if (!place) return false;
    
    const dateStr = toLocalDateString(date);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    // Calendar API has per-date availabilities for the visible range (includes host-blocked dates)
    if (calendarAvailabilities.length > 0) {
      const calendarEntry = calendarAvailabilities.find(av => av.date === dateStr);
      if (calendarEntry !== undefined) return calendarEntry.available === true;
    }
    
    // If specific availabilities exist on place, use them
    if (place.availabilities && place.availabilities.length > 0) {
      const entriesForDate = place.availabilities.filter(av => av.date === dateStr);
      if (entriesForDate.length > 0) return entriesForDate.some(av => av.available === true);
      return false;
    }
    
    // If no specific availabilities, check global dates (availableFrom, availableTo)
    if (place.availableFrom && place.availableTo) {
      const fromDate = new Date(place.availableFrom);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(place.availableTo);
      toDate.setHours(23, 59, 59, 999);
      return dateOnly >= fromDate && dateOnly <= toDate;
    }
    
    // If no availability is defined, consider as unavailable for safety
    return false;
  };

  /** En mode horaire : un jour est sélectionnable s'il est dispo OU s'il a au moins un créneau occupé (lieu ouvert ce jour, on choisira les heures libres). */
  const isDateAvailableForHourly = (date: Date): boolean =>
    isDateAvailable(date) || getOccupiedSlotsForDay(date).length > 0;

  // Vérifie que tous les jours entre start et end (inclus) sont disponibles et sans créneau occupé (même partiel).
  const isDateRangeFullyAvailable = (startDate: Date, endDate: Date): boolean => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const check = new Date(start);
    while (check <= end) {
      if (!isDateAvailable(check) || isDateTimeOccupied(check)) return false;
      check.setDate(check.getDate() + 1);
    }
    return true;
  };

  /** Retourne la première date indisponible dans [start, end] (inclus), ou null si tout est disponible. */
  const getFirstUnavailableDateInRange = (startDate: Date, endDate: Date): Date | null => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const check = new Date(start);
    while (check <= end) {
      if (!isDateAvailable(check) || isDateTimeOccupied(check)) return new Date(check);
      check.setDate(check.getDate() + 1);
    }
    return null;
  };

  // Helper function to handle date click (accepts day number or Date object)
  const handleDateClickInternal = (clickedDate: Date) => {
    // Normalize date to midnight to avoid timezone issues
    clickedDate.setHours(0, 0, 0, 0);
    
    // Check if date is available and not occupied
    if (selectedPeriod === 'hourly' ? !isDateAvailableForHourly(clickedDate) : !isDateAvailable(clickedDate)) {
      setReservationError(t('parking.dateNotAvailable'));
      return;
    }
    // Pour jour/semaine/mois : un jour qui a au moins un créneau occupé (même 2h) ne doit pas être sélectionnable
    if (selectedPeriod !== 'hourly' && isDateTimeOccupied(clickedDate)) {
      setReservationError(t('parking.slotReservedTooltip') || 'Ce jour a des créneaux déjà réservés.');
      return;
    }
    
    // For hourly reservations, select single date
    if (selectedPeriod === 'hourly') {
      setSelectedStartDate(clickedDate);
      setSelectedEndDate(null); // No need for end date for hourly reservations
      // Rafraîchir les deux dropdowns d'heure avec les créneaux dispos pour ce jour (après mise à jour du state)
      if (place) {
        const startOpts = getStartTimeOptionsForDate(clickedDate);
        if (startOpts.length > 0) {
          const firstStart = startOpts[0];
          const endOpts = getEndTimeOptionsForDate(clickedDate, firstStart);
          const firstEnd = endOpts.length > 0 ? endOpts[0] : firstStart;
          setStartHour(firstStart);
          setEndHour(firstEnd);
        }
      }
      setShowCalendar(false); // Close calendar after selection
    } else if (selectedPeriod === 'weekly') {
      // For weekly reservations: arrival + departure (multiple of 7 days, même jour de la semaine)
      // Si l'utilisateur a cliqué sur "Départ" et choisit une date → uniquement modifier la date de départ (plusieurs semaines possibles)
      if (selectingDate === 'departure' && selectedStartDate && selectedEndDate) {
        const clickedDateOnly = new Date(clickedDate);
        clickedDateOnly.setHours(0, 0, 0, 0);
        const startDateOnly = new Date(selectedStartDate);
        startDateOnly.setHours(0, 0, 0, 0);
        if (clickedDateOnly <= startDateOnly) {
          setReservationError(t('parking.endDateAfterArrival'));
          return;
        }
        const daysDiff = Math.ceil((clickedDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
          setReservationError(t('parking.weeklyMinDays'));
          return;
        }
        let endDate: Date;
        if (daysDiff % 7 !== 0) {
          const weeks = Math.ceil(daysDiff / 7);
          endDate = new Date(startDateOnly);
          endDate.setDate(endDate.getDate() + weeks * 7);
          endDate.setHours(0, 0, 0, 0);
        } else {
          endDate = new Date(clickedDateOnly);
        }
        if (!isDateRangeFullyAvailable(startDateOnly, endDate)) {
          const firstUnav = getFirstUnavailableDateInRange(startDateOnly, endDate);
          const firstStr = firstUnav ? firstUnav.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
          setReservationError(t('parking.someDatesUnavailable', { date: firstStr }));
          return;
        }
        setSelectedEndDate(endDate);
        setReservationError(null);
        setShowCalendar(false);
        return;
      }
      // Sélection ou modification de la date d'arrivée (première sélection ou clic sur "Arrivée")
      if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
        // First selection: arrival date
        const endDate = new Date(clickedDate);
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(0, 0, 0, 0);
        if (!isDateRangeFullyAvailable(clickedDate, endDate)) {
          const firstUnav = getFirstUnavailableDateInRange(clickedDate, endDate);
          const firstStr = firstUnav ? firstUnav.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
          setReservationError(t('parking.someDatesUnavailable', { date: firstStr }));
          return;
        }
        setSelectedStartDate(clickedDate);
        setSelectedEndDate(endDate);
        setSelectingDate('departure'); // Garder le calendrier en mode départ pour permettre d'étendre (2, 3 semaines...)
        setReservationError(null);
        // Ne pas fermer le calendrier pour permettre de prolonger
      } else if (selectedStartDate && selectedEndDate) {
        // If both dates already selected, allow changing arrival date
        const endDate = new Date(clickedDate);
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(0, 0, 0, 0);
        if (!isDateRangeFullyAvailable(clickedDate, endDate)) {
          const firstUnav = getFirstUnavailableDateInRange(clickedDate, endDate);
          const firstStr = firstUnav ? firstUnav.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
          setReservationError(t('parking.someDatesUnavailable', { date: firstStr }));
          return;
        }
        setSelectedStartDate(clickedDate);
        setSelectedEndDate(endDate);
        setReservationError(null);
      } else {
        // If only start date selected, allow extending by multiples of 7 days
        const clickedDateOnly = new Date(clickedDate);
        clickedDateOnly.setHours(0, 0, 0, 0);
        const startDateOnly = new Date(selectedStartDate);
        startDateOnly.setHours(0, 0, 0, 0);
        
        // Vérifier que la date cliquée est après la date de début
        if (clickedDateOnly <= startDateOnly) {
          setReservationError(t('parking.endDateAfterArrival'));
          return;
        }
        
        // Calculate number of days between two dates
        const daysDiff = Math.ceil((clickedDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check that it's a multiple of 7 days (minimum 7 days)
        if (daysDiff < 7) {
          setReservationError(t('parking.weeklyMinDays'));
          return;
        }
        
        // En tarif semaine : n'accepter que le même jour de la semaine (pas d'arrondi)
        if (daysDiff % 7 !== 0) {
          setReservationError(t('parking.weeklySameWeekday'));
          return;
        }
        
        if (!isDateRangeFullyAvailable(startDateOnly, clickedDateOnly)) {
          const firstUnav = getFirstUnavailableDateInRange(startDateOnly, clickedDateOnly);
          const firstStr = firstUnav ? firstUnav.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
          setReservationError(t('parking.someDatesUnavailable', { date: firstStr }));
          return;
        }
        setSelectedEndDate(clickedDate);
        setReservationError(null);
      }
    } else if (selectedPeriod === 'monthly') {
      // For monthly reservations: arrival + departure (multiple of months)
      // Si l'utilisateur a cliqué sur "Départ" et choisit une date → uniquement modifier la date de départ (2, 3 mois...)
      if (selectingDate === 'departure' && selectedStartDate && selectedEndDate) {
        const clickedDateOnly = new Date(clickedDate);
        clickedDateOnly.setHours(0, 0, 0, 0);
        const startDateOnly = new Date(selectedStartDate);
        startDateOnly.setHours(0, 0, 0, 0);
        if (clickedDateOnly <= startDateOnly) {
          setReservationError(t('parking.endDateAfterArrival'));
          return;
        }
        const monthsDiff = (clickedDateOnly.getFullYear() - startDateOnly.getFullYear()) * 12 +
                          (clickedDateOnly.getMonth() - startDateOnly.getMonth());
        if (monthsDiff < 1) {
          setReservationError(t('parking.monthlyMinMonths'));
          return;
        }
        const endDate = new Date(startDateOnly);
        endDate.setMonth(endDate.getMonth() + monthsDiff);
        endDate.setHours(0, 0, 0, 0);
        if (!isDateRangeFullyAvailable(startDateOnly, endDate)) {
          setReservationError(t('parking.someDatesUnavailable', { date: '' }) || 'Certains jours ont des créneaux déjà réservés.');
          return;
        }
        setSelectedEndDate(endDate);
        setReservationError(null);
        setShowCalendar(false);
        return;
      }
      // Sélection ou modification de la date d'arrivée (première sélection ou clic sur "Arrivée")
      if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
        // Première sélection : date d'arrivée
        const endDate = new Date(clickedDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setHours(0, 0, 0, 0);
        if (!isDateRangeFullyAvailable(clickedDate, endDate)) {
          setReservationError(t('parking.someDatesUnavailable', { date: '' }) || 'Certains jours de ce mois ont des créneaux déjà réservés.');
          return;
        }
        setSelectedStartDate(clickedDate);
        setSelectedEndDate(endDate);
        setSelectingDate('departure'); // Garder le calendrier en mode départ pour permettre d'étendre (2, 3 mois...)
        setReservationError(null);
        // Ne pas fermer le calendrier pour permettre de prolonger
      } else if (selectedStartDate && selectedEndDate) {
        // Si les deux dates sont déjà sélectionnées et on est en mode arrivée : changer la date d'arrivée
        const endDate = new Date(clickedDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setHours(0, 0, 0, 0);
        if (!isDateRangeFullyAvailable(clickedDate, endDate)) {
          setReservationError(t('parking.someDatesUnavailable', { date: '' }) || 'Certains jours de ce mois ont des créneaux déjà réservés.');
          return;
        }
        setSelectedStartDate(clickedDate);
        setSelectedEndDate(endDate);
        setReservationError(null);
      } else {
        // If only start date selected, allow extending by multiples of months
        const clickedDateOnly = new Date(clickedDate);
        clickedDateOnly.setHours(0, 0, 0, 0);
        const startDateOnly = new Date(selectedStartDate);
        startDateOnly.setHours(0, 0, 0, 0);
        
        // Vérifier que la date cliquée est après la date de début
        if (clickedDateOnly <= startDateOnly) {
          setReservationError(t('parking.endDateAfterArrival'));
          return;
        }
        
        // Calculate approximate number of months
        const monthsDiff = (clickedDateOnly.getFullYear() - startDateOnly.getFullYear()) * 12 + 
                          (clickedDateOnly.getMonth() - startDateOnly.getMonth());
        
        // Check that it's at least 1 month
        if (monthsDiff < 1) {
          setReservationError(t('parking.monthlyMinMonths'));
          return;
        }
        
        // En tarif mois : n'accepter que le même jour du mois (ex. 15 → 15)
        const expectedEndDate = new Date(startDateOnly);
        expectedEndDate.setMonth(expectedEndDate.getMonth() + monthsDiff);
        expectedEndDate.setHours(0, 0, 0, 0);
        if (clickedDateOnly.getTime() !== expectedEndDate.getTime()) {
          setReservationError(t('parking.monthlySameDay'));
          return;
        }
        
        if (!isDateRangeFullyAvailable(startDateOnly, expectedEndDate)) {
          setReservationError(t('parking.someDatesUnavailable', { date: '' }) || 'Certains jours ont des créneaux déjà réservés.');
          return;
        }
        setSelectedEndDate(expectedEndDate);
        setReservationError(null);
      }
    } else {
      // For other periods (daily, weekly), keep range selection logic
      // Use selectingDate to know which field is being selected
      if (selectingDate === 'arrival' || !selectedStartDate || (selectedStartDate && selectedEndDate)) {
        // Arrival date selection: can select any available date
        setSelectedStartDate(clickedDate);
        setSelectedEndDate(null);
        setSelectingDate('departure'); // Automatically switch to departure date selection
        setReservationError(null); // Reset error
        // IMPORTANT: Don't close calendar here - it must stay open to allow
        // immediate selection of end date on same calendar
        // Calendar will close only after end date selection (see line 1033)
      } else if (selectingDate === 'departure' || (selectedStartDate && !selectedEndDate)) {
        // Departure date selection: can only select dates after arrival date
        const clickedDateOnly = new Date(clickedDate);
        clickedDateOnly.setHours(0, 0, 0, 0);
        const startDateOnly = new Date(selectedStartDate);
        startDateOnly.setHours(0, 0, 0, 0);
        
        // Prevent selecting end date before start date
        if (clickedDateOnly < startDateOnly) {
          setReservationError(t('parking.departureAfterArrival'));
          return;
        }
        
        // Check minimum duration according to selected period
        // Daily: minDays jours = arrivée J et départ J+(minDays-1) (ex. 2 jours = lundi arrivée, mardi départ)
        if (selectedPeriod === 'daily' && place.minDays != null && place.minDays > 1) {
          const startDateOnly = new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate());
          startDateOnly.setHours(0, 0, 0, 0);
          const minEndDate = new Date(startDateOnly);
          minEndDate.setDate(minEndDate.getDate() + (place.minDays - 1));
          minEndDate.setHours(0, 0, 0, 0);
          
          if (clickedDateOnly < minEndDate) {
            const minDurationKey = place.minDays > 1 ? 'parking.reservationMinDurationPlural' : 'parking.reservationMinDuration';
            const minEndDateStr = minEndDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
            setReservationError(`${t(minDurationKey, { days: place.minDays })}. ${t('parking.minEndDate', { date: minEndDateStr })}`);
            return;
          }
        }
        
        // Check that all dates between start and end date are available
        // Iterate through all dates in range (inclusively)
        const checkDate = new Date(startDateOnly);
        const unavailableDates: Date[] = [];
        
        while (checkDate <= clickedDateOnly) {
          // Check availability of each date in range
          if (!isDateAvailable(checkDate)) {
            unavailableDates.push(new Date(checkDate));
          } else if (isDateTimeOccupied(checkDate)) {
            // Also check if date is occupied (for non-hourly reservations)
            unavailableDates.push(new Date(checkDate));
          }
          
          // Move to next date
          checkDate.setDate(checkDate.getDate() + 1);
        }
        
        // If dates are not available, display error
        if (unavailableDates.length > 0) {
          const firstUnavailable = unavailableDates[0];
          const firstUnavailableStr = firstUnavailable.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
          setReservationError(t('parking.someDatesUnavailable', { date: firstUnavailableStr }));
          return;
        }
        
        // All dates are available, validate selection
        setSelectedEndDate(clickedDate);
        setSelectingDate(null);
        setReservationError(null); // Reset error if selection is valid
        setShowCalendar(false); // Close calendar after departure date selection
      }
    }
  };

  // Wrapper for handleDateClick that accepts day number
  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    handleDateClickInternal(clickedDate);
  };

  /** Nombre de jours calendaires distincts (début et fin inclus). Ex: 7 mars → 8 mars = 2 jours. */
  const getDistinctCalendarDays = (start: Date, end: Date) => {
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return Math.round((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1;
  };

  /** Prix de base pour une résa au jour : pour chaque jour du range, utilise customPricePerDay si dispo, sinon prix par défaut. */
  const getBasePriceForDailyRange = (pl: PlaceDTO | null, start: Date, end: Date): number => {
    if (!pl || !start || !end) return 0;
    const defaultPricePerDay = (pl.dayPriceActive === true && pl.pricePerDay) ? pl.pricePerDay : 0;
    const availabilities = pl.availabilities ?? [];
    let total = 0;
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cur.getTime() <= endDay.getTime()) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const av = availabilities.find((a) => a.date === dateStr);
      const priceForDay =
        av?.customPricePerDay != null && av.customPricePerDay !== undefined
          ? av.customPricePerDay
          : defaultPricePerDay;
      total += priceForDay;
      cur.setDate(cur.getDate() + 1);
    }
    return total;
  };

  // Calculate duration in hours for hourly reservations
  const calculateDuration = () => {
    if (selectedPeriod !== 'hourly' || !startHour || !endHour) return 0;
    
    const [startH, startM] = startHour.split(':').map(Number);
    const [endH, endM] = endHour.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // If end time is before start time, assume it's next day
    let diffMinutes = endMinutes - startMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Add 24 hours
    }
    
    // Round up to next hour
    return Math.ceil(diffMinutes / 60);
  };

  const duration = calculateDuration();
  // Check minimum duration according to selected period
  // For hourly: use minHours (or 1 hour default)
  // For daily/weekly/monthly: use minDays (or 1 day default)
  let minRequired: number;
  let isValidDuration: boolean;
  
  if (selectedPeriod === 'hourly') {
    // For hourly reservations: check minHours only
    minRequired = effectiveMinHours;
    isValidDuration = duration >= minRequired;
  } else {
    // For daily/weekly/monthly reservations: check minDays only (nombre de jours calendaires distincts)
    if (!selectedStartDate || !selectedEndDate) {
      isValidDuration = false;
      minRequired = place?.minDays && place.minDays > 0 ? place.minDays : 1;
    } else {
      const distinctDays = getDistinctCalendarDays(selectedStartDate, selectedEndDate);
      minRequired = place?.minDays && place.minDays > 0 ? place.minDays : 1;
      isValidDuration = distinctDays >= minRequired;
    }
  }

  // Calculate total price according to selected period
  const calculateTotalPrice = () => {
    if (!place) return 0;

    if (selectedPeriod === 'hourly') {
      // Utiliser uniquement le prix horaire si activé, sinon calculer depuis le prix journalier si activé
      const pricePerHour = (place.hourPriceActive === true && place.pricePerHour) 
        ? place.pricePerHour 
        : (place.dayPriceActive === true && place.pricePerDay) 
          ? place.pricePerDay / 24 
          : 0;
      return pricePerHour * duration;
    } else if (selectedPeriod === 'daily') {
      if (!selectedStartDate || !selectedEndDate) return 0;
      return getBasePriceForDailyRange(place, selectedStartDate, selectedEndDate);
    } else if (selectedPeriod === 'weekly') {
      if (!selectedStartDate || !selectedEndDate) return 0;
      const days = Math.ceil((selectedEndDate.getTime() - selectedStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeks = Math.ceil(days / 7);
      const pricePerWeek = (place.weekPriceActive === true && place.pricePerWeek) 
        ? place.pricePerWeek 
        : (place.dayPriceActive === true && place.pricePerDay) 
          ? place.pricePerDay * 7 
          : 0;
      return pricePerWeek * weeks;
    } else if (selectedPeriod === 'monthly') {
      if (!selectedStartDate || !selectedEndDate) return 0;
      // Nombre de mois calendaires (ex. 13/08 → 13/10 = 2 mois), pas days/30 qui donne 3 pour 61 jours
      const monthsDiff = (selectedEndDate.getFullYear() - selectedStartDate.getFullYear()) * 12
        + (selectedEndDate.getMonth() - selectedStartDate.getMonth());
      const months = Math.max(1, monthsDiff);
      const pricePerMonth = (place.monthPriceActive === true && place.pricePerMonth) ? place.pricePerMonth : 0;
      return pricePerMonth * months;
    }
    return 0;
  };

  // Handle reservation creation
  const handleReservation = async () => {
    // Check that dates are selected before continuing
    if (selectedPeriod === 'hourly') {
      if (!selectedStartDate) {
        setShowDateTooltip(true);
        setTimeout(() => setShowDateTooltip(false), 3000); // Masquer après 3 secondes
        setReservationError(t('parking.selectDateToReserve'));
        return;
      }
      if (!isValidDuration) {
        const minDurationKey = minRequired > 1 ? 'parking.minDurationHoursPlural' : 'parking.minDurationHours';
        setReservationError(t(minDurationKey, { hours: minRequired }));
        return;
      }
    } else {
      if (!selectedStartDate || !selectedEndDate) {
        setShowDateTooltip(true);
        setTimeout(() => setShowDateTooltip(false), 3000); // Masquer après 3 secondes
        setReservationError(t('parking.selectDatesToReserve'));
        return;
      }
    }

    try {
      setIsCreatingReservation(true);
      setReservationError(null);
      setShowDateTooltip(false);

      // Pour le mode horaire : durée effective (au cas où state soit désynchronisé)
      let effectiveDuration = duration;
      if (selectedPeriod === 'hourly' && selectedStartDate) {
        const startOpts = generateStartTimeOptions();
        const endOpts = generateEndTimeOptions();
        const effStart = startOpts.length > 0 && startOpts.includes(startHour) ? startHour : (startOpts[0] ?? startHour);
        const effEnd = endOpts.length > 0 && endOpts.includes(endHour) ? endHour : (endOpts[0] ?? endHour);
        const [sH, sM] = effStart.split(':').map(Number);
        const [eH, eM] = effEnd.split(':').map(Number);
        effectiveDuration = Math.ceil(((eH * 60 + eM) - (sH * 60 + sM) + (sH * 60 + sM > eH * 60 + eM ? 24 * 60 : 0)) / 60);
      }

      // Calculate price directly
      const calculateTotalPrice = () => {
        if (!place) return 0;

        if (selectedPeriod === 'hourly') {
          // Utiliser uniquement le prix horaire si activé, sinon calculer depuis le prix journalier si activé
          const pricePerHour = (place.hourPriceActive === true && place.pricePerHour) 
            ? place.pricePerHour 
            : (place.dayPriceActive === true && place.pricePerDay) 
              ? place.pricePerDay / 24 
              : 0;
          return pricePerHour * effectiveDuration;
        } else if (selectedPeriod === 'daily') {
          if (!selectedStartDate || !selectedEndDate) return 0;
          return getBasePriceForDailyRange(place, selectedStartDate, selectedEndDate);
        } else if (selectedPeriod === 'weekly') {
          if (!selectedStartDate || !selectedEndDate) return 0;
          const days = Math.ceil((selectedEndDate.getTime() - selectedStartDate.getTime()) / (1000 * 60 * 60 * 24));
          const weeks = Math.ceil(days / 7);
          const pricePerWeek = (place.weekPriceActive === true && place.pricePerWeek) 
            ? place.pricePerWeek 
            : (place.dayPriceActive === true && place.pricePerDay) 
              ? place.pricePerDay * 7 
              : 0;
          return pricePerWeek * weeks;
        } else if (selectedPeriod === 'monthly') {
          if (!selectedStartDate || !selectedEndDate) return 0;
          const monthsDiff = (selectedEndDate.getFullYear() - selectedStartDate.getFullYear()) * 12
            + (selectedEndDate.getMonth() - selectedStartDate.getMonth());
          const months = Math.max(1, monthsDiff);
          const pricePerMonth = (place.monthPriceActive === true && place.pricePerMonth) ? place.pricePerMonth : 0;
          return pricePerMonth * months;
        }
        return 0;
      };

      const basePrice = calculateTotalPrice();

      // Check that user is logged in
      const userId = localStorage.getItem('userId');
      if (!userId) {
        // Redirect to login page non-intrusively
        const currentPath = window.location.pathname + window.location.search;
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        if (isCapacitor()) { capacitorNavigate('/auth/login'); } else { router.push('/auth/login'); }
        setIsCreatingReservation(false);
        return;
      }

      // Check that place is loaded
      if (!place) {
        setReservationError(t('parking.errorPlaceNotLoaded'));
        return;
      }

      // Check that dates are selected
      if (!selectedStartDate) {
        setReservationError(t('parking.selectStartDate'));
        return;
      }

      // Build start and end dates (same logic as for estimation)
      let startDateTime: Date;
      let endDateTime: Date;
      let reservationType: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

      if (selectedPeriod === 'hourly') {
        // Utiliser les heures effectives (fallback si invalides après chargement du calendrier)
        const startOpts = generateStartTimeOptions();
        const endOpts = generateEndTimeOptions();
        const effectiveStart = startOpts.length > 0 && startOpts.includes(startHour) ? startHour : (startOpts[0] ?? startHour);
        const effectiveEnd = endOpts.length > 0 && endOpts.includes(endHour) ? endHour : (endOpts[0] ?? endHour);
        const [startH, startM] = effectiveStart.split(':').map(Number);
        const [endH, endM] = effectiveEnd.split(':').map(Number);
        
        startDateTime = new Date(selectedStartDate);
        startDateTime.setHours(startH, startM, 0, 0);
        
        endDateTime = new Date(selectedStartDate);
        endDateTime.setHours(endH, endM, 0, 0);
        
        // If end time is before start time, it's next day
        if (endDateTime < startDateTime) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        reservationType = 'HOURLY';
        
        // Check if time slot is already occupied
        const isOccupied = isDateTimeOccupied(selectedStartDate, effectiveStart, effectiveEnd);
        if (isOccupied) {
          setReservationError(t('parking.slotAlreadyReserved'));
          setIsCreatingReservation(false);
          return;
        }
        
        // Check minimum duration in hours for hourly reservations
        if (effectiveMinHours > 0) {
          const hours = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60));
          if (hours < effectiveMinHours) {
            const minHoursKey = effectiveMinHours > 1 ? 'parking.minHoursRequiredPlural' : 'parking.minHoursRequired';
            setReservationError(`${t(minHoursKey, { hours: effectiveMinHours })} ${t('parking.selectLongerPeriod')}`);
            setIsCreatingReservation(false);
            return;
          }
        }
      } else {
        // For other periods (daily/weekly/monthly), use selected dates + heures fréquence résa (RESERVATION_FREQUENCY_FROM/TO) ou 00:00–23:59
        const { start: freqStart, end: freqEnd } = reservationFrequencyTimes;
        startDateTime = new Date(selectedStartDate);
        startDateTime.setHours(freqStart.h, freqStart.m, 0, 0);
        
        endDateTime = selectedEndDate ? new Date(selectedEndDate) : new Date(selectedStartDate);
        if (freqEnd.h === 23 && freqEnd.m === 59) {
          endDateTime.setHours(23, 59, 59, 999);
        } else {
          endDateTime.setHours(freqEnd.h, freqEnd.m, 0, 0);
        }
        
        if (selectedPeriod === 'daily') {
          reservationType = 'DAILY';
        } else if (selectedPeriod === 'weekly') {
          reservationType = 'WEEKLY';
        } else {
          reservationType = 'MONTHLY';
        }
        
        // Check minimum duration according to period
        if (!selectedEndDate) {
          setReservationError(t('parking.selectEndDate'));
          return;
        }
        
        const diffDays = Math.ceil((selectedEndDate.getTime() - selectedStartDate.getTime()) / (1000 * 60 * 60 * 24));
        // Nombre de jours calendaires distincts (arrivée + départ inclus), comme pour le prix et l'affichage
        const distinctCalendarDays = getDistinctCalendarDays(selectedStartDate, selectedEndDate);
        
        if (selectedPeriod === 'weekly') {
          // For weekly: check that it's a multiple of 7 days (minimum 7 days)
          if (diffDays < 7) {
            setReservationError(t('parking.weeklyMin7Days'));
            return;
          }
          if (diffDays % 7 !== 0) {
            setReservationError(t('parking.weeklyMultiple7Days'));
            return;
          }
        } else if (selectedPeriod === 'monthly') {
          // For monthly: check that it's a multiple of months (minimum 1 month)
          const monthsDiff = (selectedEndDate.getFullYear() - selectedStartDate.getFullYear()) * 12 + 
                            (selectedEndDate.getMonth() - selectedStartDate.getMonth());
          if (monthsDiff < 1) {
            setReservationError(t('parking.monthlyMin1Month'));
            return;
          }
          // Check that end date corresponds exactly to a multiple of months
          const expectedEndDate = new Date(selectedStartDate);
          expectedEndDate.setMonth(expectedEndDate.getMonth() + monthsDiff);
          expectedEndDate.setHours(0, 0, 0, 0);
          const selectedEndDateNormalized = new Date(selectedEndDate);
          selectedEndDateNormalized.setHours(0, 0, 0, 0);
          if (expectedEndDate.getTime() !== selectedEndDateNormalized.getTime()) {
            setReservationError(t('parking.monthlyMultipleMonths'));
            return;
          }
        } else if (place.minDays && place.minDays > 0) {
          // For daily: minDays = nombre de jours calendaires distincts (12/03 + 13/03 = 2 jours)
          if (distinctCalendarDays < place.minDays) {
            const minDaysKey = place.minDays > 1 ? 'parking.minDaysRequiredPlural' : 'parking.minDaysRequired';
            setReservationError(`${t(minDaysKey, { days: place.minDays })} ${t('parking.selectLongerPeriod')}`);
            return;
          }
        }
      }

      // Calculate amounts with service fees (8% according to backend)
      // basePrice = base rental amount
      // totalPrice = basePrice + serviceFee (amount paid by client)
      // hostAmount = totalPrice - serviceFee (amount paid to host) — même calcul que partout (utils)
      const serviceFee = getServiceFee(basePrice);
      const totalPrice = addServiceFee(basePrice); // Montant total payé par le client (avant promo)
      const hostAmount = totalPrice - serviceFee; // Montant reversé à l'hôte (hors frais)

      // Appliquer la réduction code promo si valide et ≤ 10 % du total
      let finalTotalPrice = totalPrice;
      let finalServiceFee = serviceFee;
      let finalHostAmount = hostAmount;
      if (promoCode.trim() && promoValidation.status === 'valid' && promoValidation.data && totalPrice > 0) {
        const data = promoValidation.data;
        const amount = data.amount ?? 0;
        const discountEur = data.discountType === 'PERCENTAGE' ? totalPrice * (amount / 100) : amount;
        if (discountEur > totalPrice * 0.10) {
          setReservationError('Ce code ne pourra pas être utilisé : la réduction doit être au maximum de 10 % du montant à payer.');
          setIsCreatingReservation(false);
          return;
        }
        finalTotalPrice = Math.round((totalPrice - discountEur) * 100) / 100;
        finalTotalPrice = Math.max(0, finalTotalPrice);
        // Répartir la réduction proportionnellement entre frais et hôte
        const ratio = totalPrice > 0 ? finalTotalPrice / totalPrice : 1;
        finalServiceFee = Math.round(serviceFee * ratio * 100) / 100;
        finalHostAmount = Math.round(hostAmount * ratio * 100) / 100;
      }

      const totalPriceToUse = finalTotalPrice;
      const serviceFeeToUse = finalServiceFee;
      const hostAmountToUse = finalHostAmount;

      console.log('💰 [PAYMENT] Calculated amounts:', {
        basePrice: basePrice.toFixed(2),
        serviceFee: serviceFeeToUse.toFixed(2),
        totalPrice: totalPriceToUse.toFixed(2),
        hostAmount: hostAmountToUse.toFixed(2),
        ...(promoCode.trim() && { promoCode: promoCode.trim() }),
      });

      // STEP 1: Create reservation first (PENDING status by default)
      console.log('🔵 [RESERVATION] Creating reservation...');
      
      // Backend attend toujours les dates en UTC (ISO 8601)
      const reservationPayload = {
        placeId: place.id,
        clientId: parseInt(userId, 10),
        startDateTime: toApiDateTime(startDateTime),
        endDateTime: toApiDateTime(endDateTime),
        reservationType: reservationType,
        totalPrice: parseFloat(totalPriceToUse.toFixed(2)), // Montant total payé par le client (après promo si applicable)
        serviceFee: parseFloat(serviceFeeToUse.toFixed(2)), // Service fee
        hostAmount: parseFloat(hostAmountToUse.toFixed(2)), // Amount paid to host
        ...(promoCode.trim() && { promoCode: promoCode.trim() }),
      };

      const createdReservation = await reservationsAPI.create(reservationPayload);
      console.log('✅ [RESERVATION] Reservation created:', createdReservation);
      console.log('✅ [RESERVATION] Reservation created with ID:', createdReservation?.id);

      // Check that reservation has an ID
      if (!createdReservation || !createdReservation.id) {
        console.error('❌ [RESERVATION] Created reservation has no ID:', createdReservation);
        setReservationError(t('parking.reservationError'));
        setIsCreatingReservation(false);
        return;
      }

      const reservationId = createdReservation.id.toString();

      // Store reservation information in sessionStorage to retrieve after payment
      const reservationData = {
        reservationId: reservationId,
        placeId: place.id.toString(),
        startDate: toApiDateTime(startDateTime),
        endDate: toApiDateTime(endDateTime),
        city: place.city || '',
        basePrice: basePrice.toFixed(2),
        totalPrice: totalPriceToUse.toFixed(2),
        serviceFee: serviceFeeToUse.toFixed(2),
        hostAmount: hostAmountToUse.toFixed(2),
        reservationType: reservationType,
      };
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingReservation', JSON.stringify(reservationData));
      }

      // STEP 2: Create Stripe checkout session with reservation ID
      console.log('🔵 [PAYMENT] Creating Stripe checkout session...');
      
      // Construire les URLs de retour (getAppBaseUrl = domaine avec Universal Links en app)
      const baseUrl = getAppBaseUrl();
      const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&orderId=${reservationId}`;
      const cancelUrl = `${baseUrl}/payment/cancel?orderId=${reservationId}`;

      // Récupérer l'email de l'utilisateur
      // Essayer d'abord depuis localStorage, sinon récupérer depuis l'API
      let userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        try {
          // Récupérer les informations utilisateur depuis l'API
          const userInfo = await rentoallUsersAPI.getProfile(parseInt(userId, 10));
          userEmail = userInfo?.email || 'client@example.com';
          // Stocker l'email dans localStorage pour les prochaines fois
          if (userEmail && typeof window !== 'undefined') {
            localStorage.setItem('userEmail', userEmail);
          }
        } catch (error) {
          console.warn('⚠️ [PAYMENT] Unable to retrieve user email:', error);
          userEmail = 'client@example.com'; // Fallback
        }
      }

      // Convertir le montant en centimes (montant après promo si code appliqué).
      // La réduction n’est appliquée qu’ici côté front : on envoie déjà totalPriceToUse (après promo)
      // au back et à Stripe. Le back ne doit pas soustraire le promo une seconde fois.
      const amountInCents = Math.round(totalPriceToUse * 100);

      // Appeler l'API pour créer la session de checkout avec tous les champs requis
      const checkoutResponse = await paymentsAPI.createCheckoutSession({
        placeId: place.id, // Obligatoire : ID du bien
        placeTitle: displayTitle, // Titre du bien pour Stripe (au lieu de "Lieu #id")
        clientId: parseInt(userId, 10), // Optionnel mais recommandé : ID de l'utilisateur
        amount: amountInCents, // Montant en centimes
        currency: 'eur', // Devise
        orderId: reservationId, // Optionnel : ID de la réservation en string
        customerEmail: userEmail, // Optionnel : Email du client
        successUrl: successUrl, // URL de succès
        cancelUrl: cancelUrl, // URL d'annulation
        startDateTime: toApiDateTime(startDateTime), // UTC pour le back
        endDateTime: toApiDateTime(endDateTime), // UTC pour le back
        reservationType: reservationType, // Type de réservation (HOURLY, DAILY, WEEKLY, MONTHLY)
        ...(isCapacitor() && { uiMode: 'embedded' }), // Paiement in-app sur iOS/Android
        ...(promoCode.trim() && { promoCode: promoCode.trim() }),
      });

      console.log('✅ [PAYMENT] Checkout session created:', checkoutResponse);

      // Mobile iOS/Android : paiement embarqué dans l'app (pas de redirection)
      if (isCapacitor() && checkoutResponse.clientSecret) {
        setStripeEmbeddedClientSecret(checkoutResponse.clientSecret);
        return;
      }

      // Mobile fallback : ouvrir dans le navigateur in-app (Capacitor Browser)
      if (isCapacitor() && checkoutResponse.url) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: checkoutResponse.url });
        return;
      }

      // Web : redirection classique vers Stripe Checkout
      if (checkoutResponse.url) {
        window.location.href = checkoutResponse.url;
      } else {
        throw new Error(t('parking.checkoutUrlNotReceived'));
      }
    } catch (error: unknown) {
      console.error('❌ [RESERVATION] Error creating reservation:', error);
      const errorObj = error as { message?: string; response?: { data?: { message?: string } } };
      const errorMessage = errorObj?.response?.data?.message || errorObj?.message || t('parking.reservationError');
      setReservationError(errorMessage);
    } finally {
      setIsCreatingReservation(false);
    }
  };

  
  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNavigation />
      <main ref={topOfPageRef} className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pb-20 sm:pb-12 md:pb-16 relative mobile-page-main overflow-x-hidden parking-detail-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8">
          {/* Left Column - Image + Main Content - Mobile: Full width */}
          <div className="lg:col-span-2 space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6 order-1 lg:order-1">
            {/* Titre (h1) + Note (si avis) + Favoris / Partager - compact, pas de bloc arrondi */}
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-[1.35rem] sm:text-xl md:text-2xl font-bold text-slate-900 leading-tight flex-1 min-w-0">
                {displayTitle}
              </h1>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1 flex-shrink-0 text-amber-500" title={t('parking.reviewsTitle')}>
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-500 stroke-amber-500" strokeWidth={2} />
                  <span className="text-base sm:text-base font-semibold text-slate-900">
                    {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1).replace('.', ',')}/5
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  id="btn-toggle-favorite-parking"
                  onClick={handleToggleFavorite}
                  disabled={isTogglingFavorite}
                  className="p-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-50 touch-manipulation"
                  aria-label={isLiked ? t('parking.removeFromFavorites') : t('parking.addToFavorites')}
                >
                  <Heart
                    className={`w-5 h-5 ${isLiked ? 'fill-emerald-600 stroke-emerald-600 text-emerald-600' : 'stroke-slate-600'}`}
                    strokeWidth={2}
                  />
                </button>
                <div className="relative">
                  <button
                    id="btn-share-parking"
                    onClick={handleShareClick}
                    className="p-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors touch-manipulation"
                    aria-label={t('parking.share')}
                  >
                    <Share2 className="w-5 h-5 stroke-slate-600" strokeWidth={2} />
                  </button>
                  {showShareMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} aria-hidden="true" />
                      <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                        <div className="p-2">
                          {urlCopied ? (
                            <div className="flex items-center gap-2 px-4 py-3 text-sm text-emerald-600 bg-emerald-50 rounded-lg">
                              <Check className="w-4 h-4" /><span className="font-medium">{t('parking.urlCopied')}</span>
                            </div>
                          ) : (
                            <>
                              <button id="btn-share-copy-link-parking" onClick={(e) => { e.stopPropagation(); copyToClipboard(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                                <Share2 className="w-4 h-4" /><span>{t('parking.copyLink')}</span>
                              </button>
                              <button id="btn-share-email-parking" onClick={(e) => { e.stopPropagation(); shareViaEmail(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                                <Mail className="w-4 h-4" /><span>{t('parking.shareEmail')}</span>
                              </button>
                              <button id="btn-share-whatsapp-parking" onClick={(e) => { e.stopPropagation(); shareViaWhatsApp(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                                <MessageCircle className="w-4 h-4" /><span>{t('parking.shareWhatsApp')}</span>
                              </button>
                              <button id="btn-share-instagram-parking" onClick={(e) => { e.stopPropagation(); shareViaInstagram(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                                <Instagram className="w-4 h-4" /><span>{t('parking.shareInstagram')}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile uniquement : type + adresse en avant pour une lecture rapide */}
            <div className="lg:hidden mb-3 sm:mb-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5">
                  <TypeIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-base font-semibold text-slate-900">{typeLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-base text-slate-700 truncate">{epureAddress(place.address)}</span>
                  <span className="text-base font-medium text-slate-900 flex-shrink-0">{place.city}</span>
                </div>
              </div>
              <a
                href={(() => {
                  const addr = place.address?.trim() ? `${place.address}, ${place.city}` : place.city;
                  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 active:opacity-80 touch-manipulation"
              >
                <Navigation className="w-4 h-4" />
                Obtenir l&apos;itinéraire
              </a>
            </div>

            {/* Video & Image Gallery - Desktop: Visible uniquement sur desktop */}
            <div className="hidden lg:block">
              <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                {/* Affichage principal : Vidéo ou Photo */}
                {totalMedia > 0 ? (
                  <div className="relative aspect-[4/3] sm:aspect-[16/9] rounded-lg sm:rounded-xl overflow-hidden bg-slate-200 shadow-md group">
                    {/* Afficher la vidéo si currentMediaIndex === -1 */}
                    {currentMediaIndex === -1 && hasVideo && place?.videoUrl ? (
                      <video
                        src={place.videoUrl}
                        controls
                        className="w-full h-full object-contain bg-slate-900"
                        preload="metadata"
                      >
                        {t('parking.browserNoVideo')}
                      </video>
                    ) : (
                      /* Afficher la photo ou l'image par défaut selon le type */
                      <Image
                        src={(photos && photos[currentMediaIndex]) ? photos[currentMediaIndex] : defaultImage}
                        alt={displayTitle}
                        fill
                        className="object-contain transition-transform duration-500 group-hover:scale-105 bg-slate-200"
                        priority={currentMediaIndex === 0}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw"
                        unoptimized={!!(photos && photos[currentMediaIndex]?.startsWith('data:'))}
                      />
                    )}
                    
                    {/* Flèches de navigation (si plusieurs médias) */}
                    {totalMedia > 1 && (
                      <>
                        <button
                          id="btn-media-prev-parking"
                          onClick={prevMedia}
                          className="absolute left-1 sm:left-1.5 md:left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95 opacity-100 lg:opacity-100 z-10 cursor-pointer touch-manipulation"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" strokeWidth={3} />
                        </button>
                        <button
                          id="btn-media-next-parking"
                          onClick={nextMedia}
                          className="absolute right-1 sm:right-1.5 md:right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95 opacity-100 lg:opacity-100 z-10 cursor-pointer touch-manipulation"
                        >
                          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" strokeWidth={3} />
                        </button>
                        
                        {/* Indicateur de média actuel */}
                        <div className="absolute bottom-1 sm:bottom-1.5 md:bottom-2 right-1 sm:right-1.5 md:right-2 bg-black/70 text-white text-xs sm:text-xs md:text-xs px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {currentMediaIndex === -1 ? 1 : currentMediaIndex + (hasVideo ? 2 : 1)} / {totalMedia}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Image par défaut si aucune photo ni vidéo */
                  <div className="relative aspect-[4/3] sm:aspect-[16/9] rounded-lg sm:rounded-xl overflow-hidden bg-slate-200 shadow-md">
                    <Image
                      src={defaultImage}
                      alt={displayTitle}
                      fill
                      className="object-contain transition-transform duration-500 group-hover:scale-105 bg-slate-200"
                      priority
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw"
                    />
                  </div>
                )}

                {/* Miniatures : Vidéo + Photos */}
                {totalMedia > 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1 sm:gap-1.5 md:gap-2">
                    {/* Miniature vidéo (si disponible) */}
                    {hasVideo && place?.videoUrl && (
                      <button
                        onClick={() => setCurrentMediaIndex(-1)}
                        className={`relative aspect-video rounded overflow-hidden border-2 transition-all active:scale-95 touch-manipulation ${
                          currentMediaIndex === -1
                            ? 'border-emerald-600 ring-1 sm:ring-2 ring-emerald-200'
                            : 'border-slate-200 hover:border-slate-300 active:border-slate-400'
                        }`}
                      >
                        <video
                          src={place.videoUrl}
                          className="w-full h-full object-contain bg-slate-900"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center">
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 ml-0.5" strokeWidth={3} />
                          </div>
                        </div>
                      </button>
                    )}
                    
                    {/* Miniatures des photos */}
                    {photos && photos.length > 0 && photos.map((photo, index) => (
                      <button
                        id={`btn-select-photo-thumbnail-${index}-parking`}
                        key={index}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`relative aspect-video rounded overflow-hidden border-2 transition-all active:scale-95 touch-manipulation ${
                          currentMediaIndex === index
                            ? 'border-emerald-600 ring-1 sm:ring-2 ring-emerald-200'
                            : 'border-slate-200 hover:border-slate-300 active:border-slate-400'
                        }`}
                      >
                        <Image
                          src={photo}
                          alt={t('parking.photo', { number: index + 1 })}
                          fill
                          className="object-contain bg-slate-200"
                          unoptimized={photo.startsWith('data:')}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bloc de réservation - Affiché juste après l'image en mobile, masqué en desktop (sera dans la colonne de droite) */}
            <div className="lg:hidden">
              {/* Right Column - Booking Card - Mobile: Full width, non-sticky */}
              <div className="bg-white rounded-lg sm:rounded-xl border-2 border-slate-200 shadow-xl p-2 sm:p-3 md:p-4">
                {/* Video & Image Gallery - Mobile: Ultra Optimisé */}
            <div className="space-y-1 sm:space-y-2 md:space-y-3">
              {/* Affichage principal : Vidéo ou Photo */}
              {totalMedia > 0 ? (
                <div className="relative aspect-[4/3] sm:aspect-[16/9] rounded-lg sm:rounded-xl overflow-hidden bg-slate-200 shadow-md group">
                  {/* Afficher la vidéo si currentMediaIndex === -1 */}
                  {currentMediaIndex === -1 && hasVideo && place?.videoUrl ? (
                    <video
                      src={place.videoUrl}
                      controls
                      className="w-full h-full object-contain bg-slate-900"
                      preload="metadata"
                    >
                      {t('parking.browserNoVideo')}
                    </video>
                  ) : (
                    /* Afficher la photo ou l'image par défaut selon le type */
                    <Image
                      src={(photos && photos[currentMediaIndex]) ? photos[currentMediaIndex] : defaultImage}
                      alt={displayTitle}
                      fill
                      className="object-contain transition-transform duration-500 group-hover:scale-105 bg-slate-200"
                      priority={currentMediaIndex === 0}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw"
                      unoptimized={!!(photos && photos[currentMediaIndex]?.startsWith('data:'))}
                    />
                  )}
                  
                  {/* Flèches de navigation (si plusieurs médias) */}
                  {totalMedia > 1 && (
                    <>
                      <button
                        onClick={prevMedia}
                        className="absolute left-1 sm:left-1.5 md:left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95 opacity-100 z-10 cursor-pointer touch-manipulation"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" strokeWidth={3} />
                      </button>
                      <button
                        onClick={nextMedia}
                        className="absolute right-1 sm:right-1.5 md:right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95 opacity-100 z-10 cursor-pointer touch-manipulation"
                      >
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900" strokeWidth={3} />
                      </button>
                      
                      {/* Indicateur de média actuel */}
                      <div className="absolute bottom-1 sm:bottom-1.5 md:bottom-2 right-1 sm:right-1.5 md:right-2 bg-black/70 text-white text-xs sm:text-xs md:text-xs px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {currentMediaIndex === -1 ? 1 : currentMediaIndex + (hasVideo ? 2 : 1)} / {totalMedia}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Image par défaut si aucune photo ni vidéo */
                <div className="relative aspect-[4/3] sm:aspect-[16/9] rounded-lg sm:rounded-xl overflow-hidden bg-slate-200 shadow-md">
                  <Image
                    src={defaultImage}
                    alt={displayTitle}
                    fill
                    className="object-contain transition-transform duration-500 group-hover:scale-105 bg-slate-200"
                    priority
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw"
                  />
                </div>
              )}

              {/* Miniatures : Vidéo + Photos */}
              {totalMedia > 1 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1 sm:gap-1.5 md:gap-2">
                  {/* Miniature vidéo (si disponible) */}
                  {hasVideo && place?.videoUrl && (
                    <button
                      onClick={() => setCurrentMediaIndex(-1)}
                      className={`relative aspect-video rounded overflow-hidden border-2 transition-all active:scale-95 touch-manipulation ${
                        currentMediaIndex === -1
                          ? 'border-emerald-600 ring-1 sm:ring-2 ring-emerald-200'
                          : 'border-slate-200 hover:border-slate-300 active:border-slate-400'
                      }`}
                    >
                      <video
                        src={place.videoUrl}
                        className="w-full h-full object-contain bg-slate-900"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center">
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 ml-0.5" strokeWidth={3} />
                        </div>
                      </div>
                    </button>
                  )}
                  
                  {/* Miniatures des photos */}
                  {photos && photos.length > 0 && photos.map((photo, index) => (
                    <button
                      id={`btn-select-photo-thumbnail-mobile-${index}-parking`}
                      key={index}
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`relative aspect-video rounded overflow-hidden border-2 transition-all active:scale-95 touch-manipulation ${
                        currentMediaIndex === index
                          ? 'border-emerald-600 ring-1 sm:ring-2 ring-emerald-200'
                          : 'border-slate-200 hover:border-slate-300 active:border-slate-400'
                      }`}
                    >
                      <Image
                        src={photo}
                        alt={t('parking.photo', { number: index + 1 })}
                        fill
                        className="object-contain bg-slate-200"
                        unoptimized={photo.startsWith('data:')}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
              </div>
            </div>
            {/* Bloc de réservation - Affiché juste après l'image en mobile, masqué en desktop */}
            <div className="lg:hidden">
              {/* Booking Card - Mobile: Full width, non-sticky - Dupliqué depuis la colonne de droite */}
              <div className="bg-white rounded-lg sm:rounded-xl border-2 border-slate-200 shadow-xl p-2 sm:p-3 md:p-4">
                {/* Price - Mobile: bien lisible, infos importantes en avant */}
                <div className="mb-2 sm:mb-3 md:mb-4">
                  <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 md:mb-3">
                    <span className="text-2xl sm:text-2xl md:text-2xl font-bold text-slate-900">
                      {selectedPeriod === 'hourly' 
                        ? (place.hourPriceActive === true && place.pricePerHour) 
                          ? `${place.pricePerHour}` 
                          : `${((place.dayPriceActive === true && place.pricePerDay ? place.pricePerDay : 0) / 24).toFixed(2)}`
                        : selectedPeriod === 'daily' 
                          ? `${(place.dayPriceActive === true && place.pricePerDay) ? place.pricePerDay : 0}` 
                          : selectedPeriod === 'weekly' && (place.weekPriceActive === true && place.pricePerWeek)
                            ? `${place.pricePerWeek}` 
                            : `${(place.monthPriceActive === true && place.pricePerMonth) ? place.pricePerMonth : 0}`}
                    </span>
                    <span className="text-base sm:text-base md:text-lg text-slate-600">€</span>
                    <span className="text-slate-500 text-xs sm:text-xs md:text-sm">
                      / {selectedPeriod === 'hourly' ? t('parking.period.hourShort') : 
                         selectedPeriod === 'daily' ? t('parking.period.dayShort') :
                         selectedPeriod === 'weekly' ? t('parking.period.weekShort') : t('parking.period.monthShort')}
                    </span>
                  </div>
                  
                  {/* Affichage du nombre d'heures minimum si défini - Mobile: Ultra Compact */}
                  {place.minHours && place.minHours > 0 && selectedPeriod === 'hourly' && (
                    <div className="mb-1 sm:mb-2 md:mb-3 p-1 sm:p-2 md:p-2.5 bg-amber-50 border border-amber-200 rounded-md sm:rounded-lg">
                      <p className="text-xs sm:text-xs md:text-xs text-amber-900">
                        <strong>⚠️ {t('parking.minDurationLabel')}</strong> {place.minHours} {place.minHours > 1 ? t('parking.hourPlural') : t('parking.hour')}
                      </p>
                    </div>
                  )}
                  
                  {/* Affichage du nombre de jours minimum si défini - Mobile: Ultra Compact */}
                  {place.minDays && place.minDays > 0 && selectedPeriod !== 'hourly' && (
                    <div className="mb-1 sm:mb-2 md:mb-3 p-1 sm:p-2 md:p-2.5 bg-amber-50 border border-amber-200 rounded-md sm:rounded-lg">
                      <p className="text-xs sm:text-xs md:text-xs text-amber-900">
                        <strong>⚠️ {t('parking.minDurationLabel')}</strong> {place.minDays} {place.minDays > 1 ? t('parking.dayPlural') : t('parking.day')}
                      </p>
                    </div>
                  )}

                  {/* Period Selection - Mobile: Ultra Compact, touch-friendly */}
                  <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-3 md:mb-4">
                    {/* Bouton Heure - affiché uniquement si hourPriceActive === true */}
                    {(place.hourPriceActive === true && place.pricePerHour && place.pricePerHour > 0) && (
                      <button
                        id="btn-period-hourly-parking"
                        onClick={() => setSelectedPeriod('hourly')}
                        className={`px-2.5 sm:px-2.5 md:px-3 py-2 sm:py-2 md:py-2.5 text-xs sm:text-xs md:text-sm rounded-lg sm:rounded-xl border-2 font-medium transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          selectedPeriod === 'hourly'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:bg-slate-50'
                        }`}
                      >
                        {t('parking.period.hour')}
                      </button>
                    )}
                    {/* Bouton Jour - affiché uniquement si dayPriceActive === true */}
                    {(place.dayPriceActive === true && place.pricePerDay && place.pricePerDay > 0) && (
                      <button
                        id="btn-period-daily-parking"
                        onClick={() => setSelectedPeriod('daily')}
                        className={`px-2.5 sm:px-2.5 md:px-3 py-2 sm:py-2 md:py-2.5 text-xs sm:text-xs md:text-sm rounded-lg sm:rounded-xl border-2 font-medium transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          selectedPeriod === 'daily'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:bg-slate-50'
                        }`}
                      >
                        {t('parking.period.day')}
                      </button>
                    )}
                    {/* Bouton Semaine - affiché uniquement si weekPriceActive === true */}
                    {(place.weekPriceActive === true && place.pricePerWeek && place.pricePerWeek > 0) && (
                      <button
                        id="btn-period-weekly-parking"
                        onClick={() => setSelectedPeriod('weekly')}
                        className={`px-2.5 sm:px-2.5 md:px-3 py-2 sm:py-2 md:py-2.5 text-xs sm:text-xs md:text-sm rounded-lg sm:rounded-xl border-2 font-medium transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          selectedPeriod === 'weekly'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:bg-slate-50'
                        }`}
                      >
                        {t('parking.period.week')}
                      </button>
                    )}
                    {/* Bouton Mois - affiché uniquement si monthPriceActive === true */}
                    {(place.monthPriceActive === true && place.pricePerMonth && place.pricePerMonth > 0) && (
                      <button
                        id="btn-period-monthly-parking"
                        onClick={() => setSelectedPeriod('monthly')}
                        className={`px-2.5 sm:px-2.5 md:px-3 py-2 sm:py-2 md:py-2.5 text-xs sm:text-xs md:text-sm rounded-lg sm:rounded-xl border-2 font-medium transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          selectedPeriod === 'monthly'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:bg-slate-50'
                        }`}
                      >
                        {t('parking.period.month')}
                      </button>
                    )}
                  </div>

                  {/* Date Selection - Mobile: Compact */}
                  {selectedPeriod === 'hourly' ? (
                    // Sélection pour réservation horaire : une date + plage horaire
                    <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-4">
                      <div className="relative">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">{t('parking.date')}</label>
                        <button
                          id="btn-select-date-parking"
                          onClick={() => setShowCalendar(!showCalendar)}
                          className={cn(
                            "w-full border-2 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 md:p-3 text-left transition-colors bg-white touch-manipulation active:scale-95",
                            !selectedStartDate 
                              ? "border-emerald-500 hover:border-emerald-600" 
                              : "border-slate-200 hover:border-emerald-300"
                          )}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm md:text-sm text-slate-600">
                              {selectedStartDate ? formatDate(selectedStartDate) : t('parking.selectDate')}
                            </span>
                          </div>
                        </button>
                      </div>
                      
                      {/* Plage horaire - Toujours visible quand on est en mode horaire */}
                      <div className="mt-1.5 sm:mt-3 p-1.5 sm:p-2.5 md:p-3 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2.5 md:mb-3 uppercase tracking-wide text-center">{t('parking.timeRange')}</label>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:gap-4 items-end">
                          {/* Heure de début - Dropdown */}
                          <div className="flex flex-col items-stretch">
                            <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1.5 md:mb-2 text-center min-h-[14px] sm:min-h-[16px] md:min-h-[18px]">{t('parking.startTime')}</label>
                            <select
                              id="select-start-hour-parking"
                              value={(() => {
                                const opts = selectedStartDate ? generateStartTimeOptions() : generateTimeOptions();
                                return opts.includes(startHour) ? startHour : (opts[0] ?? startHour);
                              })()}
                              onChange={(e) => {
                                const newStartHour = e.target.value;
                                setStartHour(newStartHour);
                                
                                // Ajuster automatiquement l'heure de fin si elle devient invalide
                                if (effectiveMinHours > 0) {
                                  const [startH, startM] = newStartHour.split(':').map(Number);
                                  const minEndTime = new Date();
                                  minEndTime.setHours(startH, startM, 0, 0);
                                  minEndTime.setHours(minEndTime.getHours() + effectiveMinHours);
                                  
                                  const [endH, endM] = endHour.split(':').map(Number);
                                  const currentEndTime = new Date();
                                  currentEndTime.setHours(endH, endM, 0, 0);
                                  
                                  // Si l'heure de fin actuelle est avant l'heure de fin minimum, la corriger
                                  if (currentEndTime < minEndTime) {
                                    const newEndHour = `${minEndTime.getHours().toString().padStart(2, '0')}:${minEndTime.getMinutes().toString().padStart(2, '0')}`;
                                    setEndHour(newEndHour);
                                  }
                                }
                              }}
                              className="w-full px-1.5 sm:px-3 md:px-4 py-1.5 sm:py-2.5 md:py-3 text-xs sm:text-base font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer touch-manipulation"
                            >
                              {(selectedStartDate ? generateStartTimeOptions() : generateTimeOptions()).map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Heure de fin - Dropdown */}
                          <div className="flex flex-col items-stretch">
                            <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1.5 md:mb-2 text-center min-h-[14px] sm:min-h-[16px] md:min-h-[18px]">
                              {t('parking.endTime')}
                            </label>
                            <select
                              id="select-end-hour-parking"
                              value={(() => {
                                const opts = generateEndTimeOptions();
                                return opts.length > 0 && opts.includes(endHour) ? endHour : (opts[0] ?? endHour);
                              })()}
                              onChange={(e) => setEndHour(e.target.value)}
                              className="w-full px-1.5 sm:px-3 md:px-4 py-1.5 sm:py-2.5 md:py-3 text-xs sm:text-base font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer touch-manipulation"
                            >
                              {generateEndTimeOptions().map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {/* Message minimum centré sous les deux champs */}
                        {effectiveMinHours > 1 && startHour ? (
                          <div className="text-xs sm:text-sm font-bold text-amber-600 mt-1.5 sm:mt-2 md:mt-2.5 text-center">
                            {t('parking.minTime', { time: (() => {
                              const [startH, startM] = startHour.split(':').map(Number);
                              const minEndTime = new Date();
                              minEndTime.setHours(startH, startM, 0, 0);
                              minEndTime.setHours(minEndTime.getHours() + effectiveMinHours);
                              return `${minEndTime.getHours().toString().padStart(2, '0')}:${minEndTime.getMinutes().toString().padStart(2, '0')}`;
                            })() })}
                          </div>
                        ) : null}
                        {generateEndTimeOptions().length === 0 && (
                          <p className="text-xs sm:text-sm text-red-600 mt-1.5 sm:mt-2 text-center">
                            {t('parking.noEndTimeAvailable')}
                          </p>
                        )}
                      </div>
                        
                        {/* Affichage de la durée et validation */}
                        {startHour && endHour && (
                          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                              <span className="text-xs sm:text-sm font-medium text-slate-600">{t('parking.durationTotal')}</span>
                              <span className={`text-xs sm:text-sm font-bold ${isValidDuration ? 'text-emerald-600' : 'text-red-600'}`}>
                                {duration} {duration > 1 ? t('parking.hourPlural') : t('parking.hour')}
                              </span>
                            </div>
                            {!isValidDuration && (
                              <p className="text-xs sm:text-sm text-red-600 mt-0.5 sm:mt-1">
                              ⚠️ {t('parking.minDurationWarning')} {selectedPeriod === 'hourly' 
                                ? `${minRequired} ${minRequired > 1 ? t('parking.hourPlural') : t('parking.hour')}`
                                : `${minRequired} ${minRequired > 1 ? t('parking.dayPlural') : t('parking.day')}`}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                  ) : (
                    // Sélection pour les autres périodes : dates de début et fin
                    <div className="space-y-2 sm:space-y-4 mb-2 sm:mb-4">
                      <div className="relative">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">{t('parking.arrival')}</label>
                        <button
                          id="btn-select-arrival-date-parking"
                          onClick={() => {
                            setSelectingDate('arrival');
                            setShowCalendar(true);
                          }}
                          className={cn(
                            "w-full border-2 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 md:p-3 text-left transition-colors bg-white touch-manipulation active:scale-95",
                            !selectedStartDate 
                              ? "border-emerald-500 hover:border-emerald-600" 
                              : "border-slate-200 hover:border-emerald-300"
                          )}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm md:text-sm text-slate-600">
                              {selectedStartDate ? formatDate(selectedStartDate) : t('parking.select')}
                            </span>
                          </div>
                        </button>
                        {/* Message minimum sous le champ de début */}
                        {place?.minDays && place.minDays > 0 && (
                          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1.5">
                            {t('parking.minDuration')} {place.minDays} {place.minDays > 1 ? t('parking.dayPlural') : t('parking.day')}
                          </p>
                        )}
                      </div>
                      <div className="relative">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">{t('parking.departure')}</label>
                        <button
                          id="btn-select-departure-date-parking"
                          onClick={() => {
                            setSelectingDate('departure');
                            setShowCalendar(true);
                          }}
                          className={cn(
                            "w-full border-2 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 md:p-3 text-left transition-colors bg-white touch-manipulation active:scale-95",
                            !selectedEndDate 
                              ? "border-emerald-500 hover:border-emerald-600" 
                              : "border-slate-200 hover:border-emerald-300"
                          )}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm md:text-sm text-slate-600">
                              {selectedEndDate ? formatDate(selectedEndDate) : t('parking.select')}
                            </span>
                          </div>
                        </button>
                        {/* Message minimum sous le champ de fin */}
                        {place?.minDays && place.minDays > 0 && (
                          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1.5">
                            {t('parking.minDuration')} {place.minDays} {place.minDays > 1 ? t('parking.dayPlural') : t('parking.day')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Calendar - Inline below fields - Référence au calendrier principal */}
                  {showCalendar && (
                    <div className="mb-2 sm:mb-3 w-full max-w-[15rem] sm:max-w-[16rem] min-w-0 bg-white border border-slate-200 rounded-lg p-2 sm:p-2.5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <button id="btn-calendar-prev-month" onClick={prevMonth} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded transition-colors touch-manipulation">
                          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                        </button>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate min-w-0 px-0.5">
                          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <button id="btn-calendar-next-month" onClick={nextMonth} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded transition-colors touch-manipulation">
                          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-px mb-0.5">
                        {dayNames.map((day, idx) => (
                          <div key={idx} className="text-center text-xs sm:text-xs font-medium text-slate-500 truncate">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-px sm:gap-0.5 w-full min-w-0">
                        {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, idx) => (
                          <div key={`empty-${idx}`} className="aspect-square w-full min-h-0" />
                        ))}
                        
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                          const day = idx + 1;
                          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dateOnly = new Date(date);
                          dateOnly.setHours(0, 0, 0, 0);
                          const isPast = dateOnly < today;
                          const hasReservationOnPastDate = isPast && hasPastReservation(date);
                          
                          const normalizedStartDate = selectedStartDate ? new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate()) : null;
                          if (normalizedStartDate) normalizedStartDate.setHours(0, 0, 0, 0);
                          const normalizedEndDate = selectedEndDate ? new Date(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate()) : null;
                          if (normalizedEndDate) normalizedEndDate.setHours(0, 0, 0, 0);
                          
                          let minEndDate: Date | null = null;
                          if (selectedStartDate && selectedPeriod !== 'hourly') {
                            if (selectedPeriod === 'monthly') {
                              minEndDate = new Date(selectedStartDate);
                              minEndDate.setMonth(minEndDate.getMonth() + 1);
                              minEndDate.setHours(0, 0, 0, 0);
                            } else if (selectedPeriod === 'weekly') {
                              minEndDate = new Date(selectedStartDate);
                              minEndDate.setDate(minEndDate.getDate() + 7);
                              minEndDate.setHours(0, 0, 0, 0);
                            } else if (selectedPeriod === 'daily' && place.minDays != null && place.minDays > 1) {
                              // Journalier : 2 jours min = lundi arrivée + mardi départ → on grise uniquement entre lundi et mardi (rien à griser). Premier départ possible = arrivée + (minDays - 1).
                              if (normalizedStartDate) {
                                minEndDate = new Date(normalizedStartDate);
                                minEndDate.setDate(minEndDate.getDate() + (place.minDays - 1));
                                minEndDate.setHours(0, 0, 0, 0);
                              }
                            }
                          }
                          
                          let isValidMultiple = true;
                          if (normalizedStartDate && (selectedPeriod === 'weekly' || selectedPeriod === 'monthly')) {
                            if (selectedPeriod === 'weekly') {
                              const daysDiff = Math.ceil((dateOnly.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                              isValidMultiple = daysDiff >= 7 && daysDiff % 7 === 0;
                            } else if (selectedPeriod === 'monthly') {
                              const monthsDiff = (dateOnly.getFullYear() - normalizedStartDate.getFullYear()) * 12 + 
                                               (dateOnly.getMonth() - normalizedStartDate.getMonth());
                              const expectedEndDate = new Date(normalizedStartDate);
                              expectedEndDate.setMonth(expectedEndDate.getMonth() + monthsDiff);
                              expectedEndDate.setHours(0, 0, 0, 0);
                              isValidMultiple = monthsDiff >= 1 && dateOnly.getTime() === expectedEndDate.getTime();
                            }
                          }
                          
                          const isBeforeStartDate = selectedPeriod !== 'hourly' && 
                                                   (selectingDate === 'departure' || (!selectingDate && normalizedStartDate && !normalizedEndDate)) && 
                                                   normalizedStartDate && dateOnly < normalizedStartDate;
                          const isBetweenStartAndMinEnd = selectedPeriod !== 'hourly' && 
                                                         (selectingDate === 'departure' || (!selectingDate && normalizedStartDate && !normalizedEndDate)) && 
                                                         normalizedStartDate && !normalizedEndDate && minEndDate && 
                                                         dateOnly > normalizedStartDate && dateOnly < minEndDate;
                          const isInvalidMultiple = normalizedStartDate && (selectingDate === 'departure' || !normalizedEndDate) && (selectedPeriod === 'weekly' || selectedPeriod === 'monthly') && !isValidMultiple;
                          const isSelected = (normalizedStartDate && dateOnly.getTime() === normalizedStartDate.getTime()) || 
                                            (normalizedEndDate && dateOnly.getTime() === normalizedEndDate.getTime());
                          const isInRange = normalizedStartDate && normalizedEndDate && 
                                           dateOnly > normalizedStartDate && dateOnly < normalizedEndDate;
                          const isOccupied = selectedPeriod === 'hourly' ? false : isDateTimeOccupied(date);
                          const isNotAvailable = selectedPeriod === 'hourly'
                            ? (!isDateAvailableForHourly(date) || !dayHasFreeSlotForDuration(dateOnly, duration))
                            : !isDateAvailable(date);
                          // En mode semaine, quand on choisit l'arrivée : griser les dates pour lesquelles la semaine [d, d+7] contient des jours indisponibles
                          const isWeekStartUnavailable = selectedPeriod === 'weekly' &&
                            (selectingDate === 'arrival' || (normalizedStartDate && normalizedEndDate)) &&
                            !isPast &&
                            (() => {
                              const weekEnd = new Date(dateOnly);
                              weekEnd.setDate(weekEnd.getDate() + 7);
                              weekEnd.setHours(0, 0, 0, 0);
                              return !isDateRangeFullyAvailable(dateOnly, weekEnd);
                            })();
                          // En mode jour avec durée min : ne proposer que les dates d'arrivée d'où on peut faire minDays jours consécutifs (tous disponibles ET non occupés).
                          const isStartDateBlockedByNextDays = selectedPeriod === 'daily' &&
                            (selectingDate === 'arrival' || (!normalizedStartDate && !normalizedEndDate)) &&
                            !isPast &&
                            (() => {
                              const min = place?.minDays != null && place.minDays > 0 ? place.minDays : 1;
                              const count = min <= 1 ? 1 : min - 1;
                              for (let i = 1; i <= count; i++) {
                                const nextD = new Date(dateOnly);
                                nextD.setDate(nextD.getDate() + i);
                                nextD.setHours(0, 0, 0, 0);
                                if (!isDateAvailable(nextD) || isDateTimeOccupied(nextD)) return true;
                              }
                              return false;
                            })();
                          const isDisabled = Boolean((isPast && !hasReservationOnPastDate) || isBeforeStartDate || isBetweenStartAndMinEnd || isOccupied || isNotAvailable || isInvalidMultiple || isWeekStartUnavailable || isStartDateBlockedByNextDays);
                          
                          const tooltipText = isDisabled && isWeekStartUnavailable
                            ? t('parking.weekHasUnavailableDays') || 'Cette semaine contient des jours déjà réservés ou indisponibles.'
                            : isDisabled && isStartDateBlockedByNextDays && (place?.minDays ?? 0) > 0
                            ? t('parking.minDaysBlockedTooltip', { days: place?.minDays ?? 1 })
                            : undefined;
                          
                          return (
                            <button
                              key={day}
                              disabled={isDisabled}
                              title={tooltipText}
                              onClick={() => handleDateClick(day)}
                              className={`aspect-square min-w-0 w-full flex items-center justify-center text-xs sm:text-xs rounded-md font-medium transition-all ${
                                isDisabled
                                  ? isNotAvailable
                                    ? 'text-slate-300 cursor-not-allowed bg-slate-100 opacity-40 border border-slate-200'
                                    : 'text-slate-300 cursor-not-allowed bg-slate-50 opacity-50'
                                  : isSelected
                                  ? 'bg-emerald-600 text-white shadow cursor-pointer'
                                  : isInRange
                                  ? 'bg-emerald-50 text-emerald-700 cursor-pointer'
                                  : 'hover:bg-emerald-50 text-slate-700 cursor-pointer border border-transparent hover:border-emerald-200'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-1.5 sm:space-y-2">
                  {reservationError && (
                    <div className="mb-2 sm:mb-2 p-3 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{reservationError}</p>
                    </div>
                  )}
                  
                  {/* Prix total à payer */}
                  {(() => {
                    const basePrice = calculateTotalPrice();
                    const serviceFee = getServiceFee(basePrice);
                    const totalPrice = addServiceFee(basePrice);
                    const depositAmount = place?.deposit && place.deposit > 0 ? place.deposit : 0;
                    // Afficher le montant après promo si code valide et ≤ 10 % (même calcul qu’au moment du paiement, une seule fois)
                    let displayTotal = totalPrice;
                    if (promoValidation.status === 'valid' && promoValidation.data && !promoExceedsMaxPercent && totalPrice > 0) {
                      const data = promoValidation.data;
                      const amount = data.amount ?? 0;
                      const discountEur = data.discountType === 'PERCENTAGE' ? totalPrice * (amount / 100) : amount;
                      displayTotal = Math.max(0, Math.round((totalPrice - discountEur) * 100) / 100);
                    }

                    return basePrice > 0 ? (
                      <div className="mb-2 sm:mb-4 p-2 sm:p-3 md:p-4 bg-white border-2 border-slate-200 rounded-lg">
                        {depositAmount > 0 && (
                          <div className="mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-slate-200">
                            <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <Shield className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                                <span className="text-sm sm:text-sm text-slate-700">{t('parking.depositTitle')}</span>
                              </div>
                              <span className="text-sm sm:text-base font-semibold text-slate-900">{depositAmount.toFixed(2)} €</span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                              {t('parking.depositRefund')}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-base sm:text-base font-bold text-slate-900">{t('parking.totalToPay')}</span>
                          <span className="text-right">
                            {displayTotal < totalPrice ? (
                              <>
                                <span className="block text-base sm:text-base font-semibold text-slate-400 line-through">{totalPrice.toFixed(2)} €</span>
                                <span className="block text-xl sm:text-xl font-bold text-emerald-600">{displayTotal.toFixed(2)} €</span>
                              </>
                            ) : (
                              <span className="text-xl sm:text-xl font-bold text-emerald-600">{displayTotal.toFixed(2)} €</span>
                            )}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Politique d&apos;annulation */}
                  {place.cancellationDeadlineDays !== undefined && place.cancellationDeadlineDays !== null && (
                    <div className={`mb-2 sm:mb-4 p-1.5 sm:p-2.5 md:p-3 rounded-lg border ${
                      place.cancellationDeadlineDays === -1 
                        ? 'bg-red-50 border-red-200' 
                        : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-1.5 sm:gap-2">
                        <AlertCircle className={`w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0 ${
                          place.cancellationDeadlineDays === -1 
                            ? 'text-red-600' 
                            : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                            ? 'text-green-600'
                            : 'text-blue-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 ${
                            place.cancellationDeadlineDays === -1 
                              ? 'text-red-900' 
                              : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                              ? 'text-green-900'
                              : 'text-blue-900'
                          }`}>
                            {t('parking.cancellationPolicy')}
                          </p>
                          <p className={`text-xs sm:text-sm leading-relaxed ${
                            place.cancellationDeadlineDays === -1 
                              ? 'text-red-700' 
                              : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                              ? 'text-green-700'
                              : 'text-blue-700'
                          }`}>
                            {getCancellationPolicyText(place.cancellationDeadlineDays, place.cancellationPolicy)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Caution */}
                  {place.deposit !== undefined && place.deposit !== null && place.deposit > 0 && (
                    <div className="mb-2 sm:mb-4 p-1.5 sm:p-2.5 md:p-3 rounded-lg border bg-slate-50 border-slate-200">
                      <div className="flex items-start gap-1.5 sm:gap-2">
                        <Shield className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0 text-slate-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 text-slate-900">
                            Caution
                          </p>
                          <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
                            Une caution de {place.deposit.toFixed(2)} € sera demandée.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Code promo */}
                  <div className="mb-2 sm:mb-4">
                    <label htmlFor="promo-code" className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1">
                      Code promo
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="promo-code"
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Ex: PROMO20"
                        className="w-full pl-8 sm:pl-9 pr-3 py-2 sm:py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition"
                        maxLength={32}
                      />
                    </div>
                    {promoValidation.status === 'validating' && (
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                        <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                        Vérification...
                      </p>
                    )}
                    {promoValidation.status === 'valid' && promoValidation.data && (() => {
                      const data = promoValidation.data!;
                      if (promoExceedsMaxPercent) {
                        return (
                          <p className="mt-1 text-xs font-medium text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            Ce code ne pourra pas être utilisé : la réduction doit être au maximum de 10 % du montant à payer.
                          </p>
                        );
                      }
                      return (
                        <p className="mt-1 text-xs font-medium text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 flex-shrink-0" />
                          {data.type === 'DISCOUNT_BONUS'
                            ? `Bon d'achat valide${data.amount != null ? ` (-${data.amount} €)` : ''}`
                            : `Code promo valide${data.amount != null ? (data.discountType === 'PERCENTAGE' ? ` (-${data.amount} %)` : ` (-${data.amount} €)`) : ''}`}
                        </p>
                      );
                    })()}
                    {promoValidation.status === 'invalid' && promoValidation.error && (
                      <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {promoValidation.error}
                      </p>
                    )}
                  </div>

                  {/* Bouton Réserver */}
                  <div className="relative group">
                    <button
                      id="btn-reserve-parking"
                      data-testid="reserve-button"
                      onClick={handleReservation}
                      disabled={
                        isCreatingReservation ||
                        (selectedPeriod === 'hourly' && (!selectedStartDate || !isValidDuration)) ||
                        (selectedPeriod !== 'hourly' && (!selectedStartDate || !selectedEndDate))
                      }
                      className={`w-full font-semibold py-3 sm:py-3 min-h-[48px] rounded-lg sm:rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-base sm:text-base touch-manipulation active:scale-95 ${
                        isCreatingReservation ||
                        (selectedPeriod === 'hourly' && (!selectedStartDate || !isValidDuration)) ||
                        (selectedPeriod !== 'hourly' && (!selectedStartDate || !selectedEndDate))
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      }`}
                    >
                      {isCreatingReservation ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">{t('parking.creating')}</span>
                        </>
                      ) : (
                        <>
<CreditCard className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span>{t('parking.reserveNow')}</span>
                      </>
                      )}
                    </button>
                  </div>
                  <Link
                    id="link-contact-host-parking"
                    href={`/messages?placeId=${place.id}&userId=${place.ownerId}`}
                    prefetch={false}
                    onClick={(e) => handleCapacitorLinkClick(e, `/messages?placeId=${place.id}&userId=${place.ownerId}`, router)}
                    className="w-full flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-2.5 sm:py-3 min-h-[44px] rounded-lg sm:rounded-xl transition-all cursor-pointer text-base touch-manipulation active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    {t('parking.contactHost')}
                  </Link>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 text-center mt-2 sm:mt-4">
                  {t('parking.paymentOnConfirmation')}
                </p>
              </div>
            </div>
            
            {/* Description - Mobile: lisible, infos en avant */}
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-4 lg:p-6 border border-slate-200 shadow-sm min-w-0">
              <h2 className="text-base sm:text-base md:text-base lg:text-lg font-bold text-slate-900 mb-2 sm:mb-2 md:mb-3 break-words min-w-0">{t('parking.aboutSpace')}</h2>
              <p className="text-slate-700 leading-relaxed text-base sm:text-sm md:text-sm break-words min-w-0">{capitalizeFirstPerLine(place.description) || t('parking.noDescriptionAvailable')}</p>
            </div>

            {/* Localisation + carte - visible uniquement sur mobile (sur desktop c'est dans la colonne de droite). tabIndex=-1 évite que la carte prenne le focus à l'arrivée. */}
            <div className="lg:hidden bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-2">{t('parking.locationSection')}</h2>
              <div className="flex items-start gap-2 mb-3">
                <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-base text-slate-900">{place.city}</p>
                  <p className="text-base text-slate-600 mt-0.5">{epureAddress(place.address)}</p>
                </div>
              </div>
              <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-200 mb-3 focus:outline-none" style={{ overflowAnchor: 'none' }} tabIndex={-1}>
                {mapProperty ? (
                  <PropertiesMap
                    properties={[mapProperty]}
                    selectedPropertyId={mapProperty.id}
                    center={{ lat: mapProperty.lat, lng: mapProperty.lng, zoom: 15 }}
                    showUserLocation={false}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    <MapPin className="w-10 h-10 text-slate-400" />
                  </div>
                )}
              </div>
              <a
                href={(() => {
                  const addr = place.address?.trim() ? `${place.address}, ${place.city}` : place.city;
                  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-base touch-manipulation"
              >
                <Navigation className="w-4 h-4" />
                Obtenir l&apos;itinéraire
              </a>
            </div>

            {/* Informations de confiance & sécurité - Mobile: lisible */}
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-4 lg:p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-6">
                <BarChart3 className="w-5 h-5 md:w-5 md:h-5 lg:w-6 lg:h-6 text-emerald-600 flex-shrink-0" />
                <h2 className="text-lg sm:text-base md:text-lg lg:text-xl font-bold text-slate-900">{t('parking.trustInfo')}</h2>
              </div>

              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                {/* Caractéristiques détaillées - En premier */}
                <div className="w-full">
                  {/* Bouton pour afficher/masquer les caractéristiques */}
                  <button
                    onClick={() => setShowCharacteristics(!showCharacteristics)}
                    className={`w-full flex items-center justify-between p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
                      showCharacteristics 
                        ? 'bg-emerald-50 border-emerald-500' 
                        : 'bg-emerald-50/90 border-emerald-200 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                        <Filter className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 text-emerald-600" />
                      </div>
                      <span className={`text-base sm:text-base md:text-lg font-semibold ${showCharacteristics ? 'text-slate-900' : 'text-emerald-800'}`}>{t('parking.characteristics')}</span>
                    </div>
                    <ChevronDown 
                      className={`w-5 h-5 transition-transform duration-200 ${showCharacteristics ? 'rotate-180 text-slate-600' : 'text-emerald-600'}`}
                    />
                  </button>

                  {/* Bloc des caractéristiques - Affiché/masqué selon l'état */}
                  {showCharacteristics && (
                    <div className="mt-3 sm:mt-4 w-full">
                      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 sm:p-4 mb-2 sm:mb-3 md:mb-4 w-full">
                        <div className="space-y-1.5 sm:space-y-2">
                          {/* Fonction pour obtenir un label lisible depuis le nom de la caractéristique */}
                          {(() => {
                            const getLabel = (name: string): string => {
                              const labelMap: Record<string, string> = {
                                'LENGTH': t('parking.characteristic.length'),
                                'WIDTH': t('parking.characteristic.width'),
                                'MAX_HEIGHT': t('parking.characteristic.maxHeight'),
                                'VOLUME': t('parking.characteristic.volume'),
                                'SURFACE': t('parking.characteristic.surface'),
                                'ACCESS_TYPE': t('parking.characteristic.accessType'),
                                'LIGHTING': t('parking.characteristic.lighting'),
                                'SPACE_TYPE': t('parking.characteristic.spaceType'),
                                'VIDEO_SURVEILLANCE': t('parking.characteristic.videoSurveillance'),
                                'SECURITY_GUARD': t('parking.characteristic.securityGuard'),
                                'SECURED_GATE': t('parking.characteristic.securedGate'),
                                'AUTOMATIC_BARRIER': t('parking.characteristic.automaticBarrier'),
                                'EXCLUSIVITY_24_7': t('parking.access24h'),
                                'VEHICLE_TYPE': t('parking.characteristic.vehicleType'),
                                'LEVEL': t('parking.characteristic.level'),
                                'PARKING_TYPE': t('parking.characteristic.parkingType'),
                                'ELECTRIC_CHARGING_STATION': t('parking.characteristic.electricChargingStation'),
                                'ELECTRIC_CHARGING_POWER': t('parking.characteristic.electricChargingPower'),
                                'STOP_PARKING': t('parking.characteristic.stopParking'),
                                'NUMBERED_SPACE': t('parking.characteristic.numberedSpace'),
                                'ELECTRIC_PLUG': t('parking.characteristic.electricPlug'),
                                'WATER_POINT': t('parking.characteristic.waterPoint'),
                                'PMR_ELEVATOR': t('parking.characteristic.pmrElevator'),
                                'PMR_EQUIPMENT': t('parking.characteristic.pmrEquipment'),
                                'GPL_ALLOWED': t('parking.characteristic.gplAllowed'),
                                'TIME_RESTRICTIONS': t('parking.characteristic.timeRestrictions'),
                                'AIRPORT_SHUTTLE': t('parking.characteristic.airportShuttle'),
                                'STATION_SHUTTLE': t('parking.characteristic.stationShuttle'),
                                'CLEANING': t('parking.characteristic.cleaning'),
                                'CHILD_SEAT': t('parking.characteristic.childSeat'),
                                'BUS_STOP_DISTANCE': t('parking.characteristic.busStopDistance'),
                                'TRAIN_STATION_DISTANCE': t('parking.characteristic.trainStationDistance'),
                                'AIRPORT_DISTANCE': t('parking.characteristic.airportDistance'),
                                'DOOR_TYPE': t('parking.characteristic.doorType'),
                                'LOCK_TYPE': t('parking.characteristic.lockType'),
                                'FLOOR_QUALITY': t('parking.characteristic.floorQuality'),
                                'INTERIOR_LIGHT': t('parking.characteristic.interiorLight'),
                                'HEATED_DEGREE': t('parking.characteristic.heatedDegree'),
                                'AUTHORIZED_USAGE': t('parking.characteristic.authorizedUsage'),
                                'FREIGHT_ELEVATOR': t('parking.characteristic.freightElevator'),
                                'HAND_TRUCK': t('parking.characteristic.handTruck'),
                                'STORAGE_RACK': t('parking.characteristic.storageRack'),
                                'SHELVES': t('parking.characteristic.shelves'),
                                'TRUCK_ACCESS_DISTANCE': t('parking.characteristic.truckAccessDistance'),
                                'ACCESSIBILITY_REMARKS': t('parking.characteristic.accessibilityRemarks'),
                                'HUMIDITY': t('parking.characteristic.humidity'),
                                'VENTILATION': t('parking.characteristic.ventilation'),
                                'ELEVATOR_SIZE': t('parking.characteristic.elevatorSize'),
                                'FREIGHT_ELEVATOR_SIZE': t('parking.characteristic.freightElevatorSize'),
                                'STRAIGHT_STAIRCASE_WIDTH': t('parking.characteristic.straightStaircaseWidth'),
                                'TURNING_STAIRCASE_WIDTH': t('parking.characteristic.turningStaircaseWidth'),
                                'SPIRAL_STAIRCASE_WIDTH': t('parking.characteristic.spiralStaircaseWidth'),
                                'PASSAGE_MIN_WIDTH': t('parking.characteristic.passageMinWidth'),
                                'PASSAGE_MIN_HEIGHT': t('parking.characteristic.passageMinHeight'),
                                'NUMBERED_ZONE': t('parking.characteristic.numberedZone'),
                                'FLAMMABLE_PROHIBITED': t('parking.characteristic.flammableProhibited'),
                                'GAS_BOTTLE_PROHIBITED': t('parking.characteristic.gasBottleProhibited'),
                                'CHEMICAL_PROHIBITED': t('parking.characteristic.chemicalProhibited'),
                              };
                              return labelMap[name] || name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                            };

                            const formatValue = (char: { name: string; value: string }): string => {
                              const notAvailable = t('parking.notAvailable');
                              let value = char.value || notAvailable;
                              
                              // Ajouter les unités si nécessaire
                              if (char.name === 'LENGTH' && value !== notAvailable && !value.includes('m')) {
                                value += 'm';
                              } else if (char.name === 'WIDTH' && value !== notAvailable && !value.includes('m')) {
                                value += 'm';
                              } else if (char.name === 'MAX_HEIGHT' && value !== notAvailable && !value.includes('m')) {
                                value += 'm';
                              } else if (char.name === 'VOLUME' && value !== notAvailable && !value.includes('m³')) {
                                value += 'm³';
                              } else if (char.name === 'SURFACE' && value !== notAvailable && !value.includes('m²')) {
                                value += 'm²';
                              } else if (char.name === 'EXCLUSIVITY_24_7' && value.toLowerCase() === 'oui') {
                                value = t('parking.yes');
                              }
                              return value;
                            };

                            // Collecter toutes les caractéristiques à afficher
                            const characteristicsToShow: Array<{ name: string; value: string; label: string }> = [];
                            
                            // Dimensions communes
                            if (place.characteristics?.find(c => c.name === 'LENGTH')) {
                              const char = place.characteristics.find(c => c.name === 'LENGTH')!;
                              characteristicsToShow.push({ name: char.name, value: formatValue(char), label: getLabel(char.name) });
                            }
                            if (place.characteristics?.find(c => c.name === 'WIDTH')) {
                              const char = place.characteristics.find(c => c.name === 'WIDTH')!;
                              characteristicsToShow.push({ name: char.name, value: formatValue(char), label: getLabel(char.name) });
                            }
                            if (place.characteristics?.find(c => c.name === 'MAX_HEIGHT')) {
                              const char = place.characteristics.find(c => c.name === 'MAX_HEIGHT')!;
                              characteristicsToShow.push({ name: char.name, value: formatValue(char), label: getLabel(char.name) });
                            }
                            if ((place.type === 'STORAGE_SPACE' || place.type === 'CAVE') && place.characteristics?.find(c => c.name === 'VOLUME')) {
                              const char = place.characteristics.find(c => c.name === 'VOLUME')!;
                              characteristicsToShow.push({ name: char.name, value: formatValue(char), label: getLabel(char.name) });
                            }
                            if ((place.type === 'STORAGE_SPACE' || place.type === 'CAVE') && place.characteristics?.find(c => c.name === 'SURFACE')) {
                              const char = place.characteristics.find(c => c.name === 'SURFACE')!;
                              characteristicsToShow.push({ name: char.name, value: formatValue(char), label: getLabel(char.name) });
                            }
                            
                            // Autres caractéristiques (inclure AUTHORIZED_USAGE dans la liste pour les sections)
                            const excludedNames = ['LENGTH', 'WIDTH', 'MAX_HEIGHT', 'VOLUME', 'SURFACE'];
                            
                            place.characteristics
                              ?.filter(c => !excludedNames.includes(c.name))
                              .forEach(char => {
                                if (char.name === 'EXCLUSIVITY_24_7' && char.value.toLowerCase() !== 'oui') {
                                  return;
                                }
                                const formattedValue = formatValue(char);
                                characteristicsToShow.push({ name: char.name, value: formattedValue, label: getLabel(char.name) });
                              });

                            // Types de véhicules : priorité à acceptedVehicleTypes (backend), sinon agréger VEHICLE_TYPE des characteristics
                            const VEHICLE_TYPE_API_TO_DISPLAY: Record<string, string> = {
                              MOTO: 'Moto',
                              VOITURE: 'Voiture',
                              CAMION: 'Camion',
                              CARAVANE: 'Caravane',
                              CAMPING_CAR: 'Camping car',
                            };
                            const vehicleTypeItems = characteristicsToShow.filter(c => c.name === 'VEHICLE_TYPE');
                            if (place.acceptedVehicleTypes && place.acceptedVehicleTypes.length > 0) {
                              const displayValues = place.acceptedVehicleTypes.map((api) => VEHICLE_TYPE_API_TO_DISPLAY[api] || api);
                              const idx = characteristicsToShow.findIndex(c => c.name === 'VEHICLE_TYPE');
                              if (idx >= 0) characteristicsToShow.splice(idx, vehicleTypeItems.length);
                              characteristicsToShow.push({ name: 'VEHICLE_TYPE', value: displayValues.join(', '), label: getLabel('VEHICLE_TYPE') });
                            } else if (vehicleTypeItems.length > 1) {
                              const joinedValue = vehicleTypeItems.map(c => c.value).join(', ');
                              const idx = characteristicsToShow.findIndex(c => c.name === 'VEHICLE_TYPE');
                              characteristicsToShow.splice(idx, vehicleTypeItems.length, { name: 'VEHICLE_TYPE', value: joinedValue, label: getLabel('VEHICLE_TYPE') });
                            }

                            // Regrouper par section (même logique que la création d'annonce)
                            const getSectionForKey = (name: string): string => {
                              const key = name.toUpperCase();
                              if (['LENGTH', 'WIDTH', 'MAX_HEIGHT', 'VOLUME', 'SURFACE', 'HEIGHT'].includes(key)) return 'Dimensions';
                              if (['VIDEO_SURVEILLANCE', 'SECURITY_GUARD', 'SECURED_GATE', 'AUTOMATIC_BARRIER', 'LOCK_TYPE', 'NUMBERED_SPACE'].includes(key)) return 'Sécurité';
                              if (['ACCESS_TYPE', 'LEVEL', 'DOOR_TYPE', 'STAIRS_TYPE', 'STAIRS_WIDTH', 'ELEVATOR_DIMENSIONS', 'PASSAGE_MIN_WIDTH', 'PASSAGE_MIN_HEIGHT', 'FREIGHT_ELEVATOR', 'PMR_ELEVATOR', 'SPACE_TYPE', 'PARKING_TYPE'].includes(key)) return 'Accès';
                              if (['LIGHTING', 'INTERIOR_LIGHT'].includes(key)) return 'Éclairage';
                              if (['ELECTRIC_PLUG', 'WATER_POINT', 'ELECTRIC_CHARGING_STATION', 'ELECTRIC_CHARGING_POWER', 'HAND_TRUCK', 'STORAGE_RACK', 'SHELVES', 'OTHER_EQUIPMENT', 'FLOOR_QUALITY', 'HEATED_DEGREE', 'VENTILATION_TYPE', 'HUMIDITY_STATE', 'STORAGE_TYPE', 'AUTHORIZED_USAGE'].includes(key)) return 'Équipements';
                              if (['CLEANING', 'HANDLING_HELP', 'AIRPORT_SHUTTLE', 'STATION_SHUTTLE', 'CHILD_SEAT', 'OTHER_SERVICES', 'PMR_EQUIPMENT'].includes(key)) return 'Services';
                              if (key.includes('_DISTANCE') || ['BUS_STOP_DISTANCE', 'TRAIN_STATION_DISTANCE', 'AIRPORT_DISTANCE', 'ELECTRIC_CHARGING_STATION_DISTANCE', 'BEACH_DISTANCE', 'TRUCK_ACCESS_DISTANCE'].includes(key)) return 'Distances';
                              if (['TIME_RESTRICTIONS', 'EXCLUSIVITY_24_7', 'STOP_PARKING', 'FLAMMABLE_PROHIBITED', 'GAS_BOTTLE_PROHIBITED', 'GPL_PROHIBITED', 'GPL_ALLOWED', 'MOTORIZED_VEHICLE_PROHIBITED', 'CHEMICAL_PROHIBITED'].includes(key)) return 'Restrictions';
                              return 'Autres';
                            };

                            const sectionOrder = ['Dimensions', 'Sécurité', 'Accès', 'Éclairage', 'Équipements', 'Services', 'Distances', 'Restrictions', 'Autres'] as const;
                            const bySection: Record<string, typeof characteristicsToShow> = {};
                            sectionOrder.forEach(s => { bySection[s] = []; });
                            characteristicsToShow.forEach(char => {
                              const section = getSectionForKey(char.name);
                              if (bySection[section]) bySection[section].push(char);
                            });
                            const groupedSections = sectionOrder
                              .filter(title => bySection[title].length > 0)
                              .map(title => ({ title, items: bySection[title] }));

                            const getSectionIcon = (sectionTitle: string) => {
                              const iconProps = { className: 'w-5 h-5 text-emerald-600' };
                              switch (sectionTitle) {
                                case 'Dimensions': return <Ruler {...iconProps} />;
                                case 'Sécurité': return <Lock {...iconProps} />;
                                case 'Accès': return <Key {...iconProps} />;
                                case 'Éclairage': return <Lightbulb {...iconProps} />;
                                case 'Équipements': return <Wrench {...iconProps} />;
                                case 'Services': return <Package {...iconProps} />;
                                case 'Distances': return <MapPin {...iconProps} />;
                                case 'Restrictions': return <Ban {...iconProps} />;
                                default: return <Shield {...iconProps} />;
                              }
                            };

                            return (
                              <div className="space-y-4 sm:space-y-5">
                                {groupedSections.map((section) => (
                                  <div key={section.title} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                                    <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-slate-100 mb-3 sm:mb-4">
                                      <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                                        {getSectionIcon(section.title)}
                                      </div>
                                      <h3 className="text-lg sm:text-lg font-semibold text-slate-900">
                                        {section.title}
                                      </h3>
                                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                        {section.items.length} champ{section.items.length > 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                                      {section.items.map((char, idx) => (
                                        <div key={`${section.title}-${idx}`} className="flex flex-col gap-0.5 py-2 px-3 rounded-lg bg-slate-50/80 border border-slate-100">
                                          <span className="text-sm font-medium text-slate-500">{char.label}</span>
                                          <span className="text-base font-semibold text-slate-900">{char.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>


                {/* Vérifications hôte - Mobile: Compact */}
                <div className="pb-4 sm:pb-5 md:pb-6 border-b border-slate-200 last:border-0 last:pb-0">
                  <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3 mb-2 sm:mb-3 md:mb-4">
                    <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-base md:text-lg font-semibold text-slate-900 mb-1.5 sm:mb-2">{t('parking.hostVerification')}</h3>
                      <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-xs sm:text-xs md:text-sm text-slate-700">{t('parking.identityVerified')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-xs sm:text-xs md:text-sm text-slate-700">{t('parking.addressVerified')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-xs sm:text-xs md:text-sm text-slate-700">{t('parking.photosCertified')}</span>
                        </div>
                      </div>
                      {false && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-700">{t('parking.superHostVerified')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Règles de l'espace - Données du backend (place + characteristics) */}
                <div className="pb-4 sm:pb-5 md:pb-6 border-b border-slate-200 last:border-0 last:pb-0">
                  <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3 mb-2 sm:mb-3 md:mb-4">
                    <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-base md:text-lg font-semibold text-slate-900 mb-2 sm:mb-2.5 md:mb-3">{t('parking.spaceRules')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                        {/* Horaires d'accès : RESERVATION_FREQUENCY_FROM/TO ou EXCLUSIVITY_24_7 (backend) */}
                        {(() => {
                          const is24_7 = place.characteristics?.find(c => c.name === 'EXCLUSIVITY_24_7')?.value?.toLowerCase() === 'oui';
                          const { start: freqStart, end: freqEnd } = reservationFrequencyTimes;
                          const windowStartMin = freqStart.h * 60 + freqStart.m;
                          const windowEndMin = freqEnd.h * 60 + freqEnd.m;
                          const isFullDay = is24_7 || (windowStartMin === 0 && windowEndMin >= 23 * 60 + 59);
                          const accessHoursText = isFullDay
                            ? t('parking.access24h')
                            : `${t('parking.accessHoursFromTo', { from: `${String(freqStart.h).padStart(2, '0')}:${String(freqStart.m).padStart(2, '0')}`, to: `${String(freqEnd.h).padStart(2, '0')}:${String(freqEnd.m).padStart(2, '0')}` })}`;
                          return (
                            <div className="p-2.5 sm:p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-200">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 md:mb-2">
                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 flex-shrink-0" />
                                <span className="text-sm sm:text-xs md:text-sm font-semibold text-slate-900">{t('parking.accessHoursTitle')}</span>
                              </div>
                              <p className="text-sm sm:text-xs md:text-sm text-slate-600">{accessHoursText}</p>
                            </div>
                          );
                        })()}
                        {/* Dépôt : place.deposit (backend) */}
                        <div className="p-2.5 sm:p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 md:mb-2">
                            <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 flex-shrink-0" />
                            <span className="text-sm sm:text-xs md:text-sm font-semibold text-slate-900">{t('parking.depositGuarantee')}</span>
                          </div>
                          <p className="text-sm sm:text-xs md:text-sm text-slate-600">
                            {place.deposit != null && place.deposit > 0
                              ? t('parking.depositAmount', { amount: place.deposit.toFixed(2) })
                              : t('parking.noDepositRequired')}
                          </p>
                        </div>
                        {/* Règles d'Accès : toujours affiché (comme les 2 blocs ci-dessus), "Non renseigné" si vide */}
                        <div className="p-2.5 sm:p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 md:mb-2">
                            <DoorClosed className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 flex-shrink-0" />
                            <span className="text-sm sm:text-xs md:text-sm font-semibold text-slate-900">{t('parking.accessRules')}</span>
                          </div>
                          <p className="text-sm sm:text-xs md:text-sm text-slate-600">
                            {place.accessibilityRemarks?.trim()
                              ? place.accessibilityRemarks.trim()
                              : (() => {
                                  const accessType = place.characteristics?.find(c => c.name === 'ACCESS_TYPE')?.value?.toLowerCase();
                                  if (accessType?.includes('badge') || accessType === 'badge') return t('parking.accessBadge');
                                  if (accessType?.includes('code') || accessType === 'code') return t('parking.accessCode');
                                  if (accessType?.includes('clé') || accessType?.includes('cle') || accessType === 'key') return t('parking.accessKey');
                                  if (accessType?.includes('distance') || accessType === 'remote') return t('parking.accessRemote');
                                  return accessType ? accessType : t('parking.accessNotSpecified');
                                })()}
                          </p>
                        </div>
                        {place.cancellationDeadlineDays !== undefined && place.cancellationDeadlineDays !== null && (
                          <div className={`p-2.5 sm:p-3 md:p-4 rounded-xl border ${
                            place.cancellationDeadlineDays === -1 
                              ? 'bg-red-50 border-red-200' 
                              : place.cancellationDeadlineDays === 0
                              ? 'bg-green-50 border-green-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 md:mb-2">
                              <AlertCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${
                                place.cancellationDeadlineDays === -1 
                                  ? 'text-red-600' 
                                  : place.cancellationDeadlineDays === 0
                                  ? 'text-green-600'
                                  : 'text-blue-600'
                              }`} />
                              <span className={`text-sm sm:text-xs md:text-sm font-semibold ${
                                place.cancellationDeadlineDays === -1 
                                  ? 'text-red-900' 
                                  : place.cancellationDeadlineDays === 0
                                  ? 'text-green-900'
                                  : 'text-blue-900'
                              }`}>
                                {t('parking.cancellationPolicy')}
                              </span>
                            </div>
                            <p className={`text-sm sm:text-xs md:text-sm leading-relaxed ${
                              place.cancellationDeadlineDays === -1 
                                ? 'text-red-700' 
                                : place.cancellationDeadlineDays === 0
                                ? 'text-green-700'
                                : 'text-blue-700'
                            }`}>
                              {getCancellationPolicyText(place.cancellationDeadlineDays, place.cancellationPolicy)}
                            </p>
                          </div>
                        )}
                        {/* Affichage des durées minimum */}
                        {(place.minHours && place.minHours > 0) || (place.minDays && place.minDays > 0) ? (
                          <div className="p-2.5 sm:p-3 md:p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 md:mb-2">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
                              <span className="text-sm sm:text-xs md:text-sm font-semibold text-amber-900">{t('parking.minDurationTitle')}</span>
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                              {place.minHours && place.minHours > 0 && (
                                <p className="text-sm sm:text-xs md:text-sm text-amber-800">
                                  {t('parking.hourlyMinDurationFull', { hours: place.minHours })}
                                </p>
                              )}
                              {place.minDays && place.minDays > 0 && (
                                <p className="text-sm sm:text-xs md:text-sm text-amber-800">
                                  {t('parking.dailyMinDurationFull', { days: place.minDays })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Reviews Section */}
            {!isLoadingReviews && reviews.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-slate-900">
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1).replace('.', ',')}/5
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {t('parking.basedOnReviews')} <strong>{reviews.length} {t('parking.reviewsCount')}</strong>
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{t('parking.topPercentage', { percentage: 5 })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {[t('parking.cleanliness'), t('parking.accuracy'), t('parking.arrival'), t('parking.communication'), t('parking.location'), t('parking.valueForMoney')].map((label, idx) => (
                    <div key={idx} className="p-2 sm:p-3 rounded-xl bg-slate-50">
                      <div className="text-sm font-medium text-slate-700 mb-1">{label}</div>
                      <div className="text-lg font-bold text-slate-900">10,0/10</div>
                    </div>
                  ))}
                </div>

                {/* Reviews Filter - Mobile: Compact */}
                <div className="flex items-center justify-between mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-slate-200">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900">{t('parking.reviewsTitle')}</h3>
                  <div className="relative">
                    <select
                      value={reviewSort}
                      onChange={(e) => setReviewSort(e.target.value as 'best' | 'worst' | 'recent' | 'oldest')}
                      className="appearance-none bg-white border border-slate-200 rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 pr-6 sm:pr-8 text-sm sm:text-xs md:text-sm font-medium text-slate-700 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer transition-colors touch-manipulation"
                    >
                      <option value="best">{t('parking.sort.best')}</option>
                      <option value="worst">{t('parking.sort.worst')}</option>
                      <option value="recent">{t('parking.sort.recent')}</option>
                      <option value="oldest">{t('parking.sort.oldest')}</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-6">
                  {[...reviews].sort((a, b) => {
                    switch (reviewSort) {
                      case 'best':
                        return b.rating - a.rating;
                      case 'worst':
                        return a.rating - b.rating;
                      case 'recent':
                        return b.dateValue.getTime() - a.dateValue.getTime();
                      case 'oldest':
                        return a.dateValue.getTime() - b.dateValue.getTime();
                      default:
                        return 0;
                    }
                  }).map((review) => (
                    <div key={review.id} className="pb-4 sm:pb-5 md:pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="flex items-start gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                          <Image
                            src={review.avatar}
                            alt={review.author}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                            <span className="font-semibold text-slate-900 text-xs sm:text-sm md:text-base">{review.author}</span>
                            <span className="text-xs sm:text-xs text-slate-500 hidden xs:inline">·</span>
                            <span className="text-xs sm:text-sm md:text-sm text-slate-600">{review.date}</span>
                          </div>
                          <div className="flex items-center gap-1 mb-1 sm:mb-2">
                            <span className="text-xs sm:text-sm font-semibold text-slate-900">{review.rating.toFixed(1)}/5</span>
                          </div>
                          <p className="text-sm sm:text-xs md:text-sm text-slate-700 leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Host Section - Mobile: Compact */}
            <div className="bg-white rounded-xl p-2.5 sm:p-3 md:p-4 lg:p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-slate-200">
                    <Image
                      src="/logoR.png"
                      alt={ownerFirstName ? `${t('parking.owner')} ${ownerFirstName}` : t('parking.owner')}
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 mb-0.5 sm:mb-1">{t('parking.owner')}</h3>
                  {ownerFirstName && (
                    <p className="text-xs sm:text-sm md:text-sm text-slate-600 mb-1 sm:mb-2">{ownerFirstName}</p>
                  )}
                  {/* Temps de réponse de l'hôte */}
                  <div className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-xs md:text-sm">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium text-emerald-700">{t('parking.respondsUsually')}</span>
                  </div>
                </div>
                <Link
                  href={`/messages?placeId=${place.id}&userId=${place.ownerId}`}
                  prefetch={false}
                  onClick={(e) => handleCapacitorLinkClick(e, `/messages?placeId=${place.id}&userId=${place.ownerId}`, router)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:text-emerald-600 transition-all font-medium text-sm sm:text-xs md:text-sm cursor-pointer text-center inline-block touch-manipulation active:scale-95"
                >
                  {t('parking.contact')}
                </Link>
              </div>
            </div>

            {/* Q&A Section - Mobile: lisible */}
            <div className="bg-white rounded-xl p-3 sm:p-4 md:p-4 border border-slate-200 shadow-sm mt-3 sm:mt-4 md:mt-5 lg:mt-6">
              <div className="flex items-center gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4">
                <HelpCircle className="w-5 h-5 md:w-5 md:h-5 text-emerald-600 flex-shrink-0" />
                <h2 className="text-base sm:text-base md:text-lg font-bold text-slate-900">{t('parking.faq')}</h2>
              </div>
              
              <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mb-3 sm:mb-4">
                {[
                  { q: t('parking.accessHours'), a: t('parking.accessHoursAnswer') },
                  { q: t('parking.canCancel'), a: place.cancellationDeadlineDays === -1 ? t('parking.cannotCancel') : t('parking.canCancelYes', { policy: getCancellationPolicyText(place.cancellationDeadlineDays, place.cancellationPolicy).toLowerCase() }) },
                  { q: t('parking.howToAccess'), a: t('parking.howToAccessAnswer') }
                ].map((faq, idx) => (
                  <details key={idx} className="group">
                    <summary className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors touch-manipulation">
                      <span className="font-medium text-slate-900 text-sm sm:text-xs md:text-sm pr-2">{faq.q}</span>
                      <ChevronDown className="w-4 h-4 text-slate-600 transition-transform group-open:rotate-180 flex-shrink-0" />
                    </summary>
                    <div className="p-2 sm:p-2.5 md:p-3 text-sm sm:text-xs md:text-sm text-slate-600 border-t border-slate-200">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>

            </div>
          </div>

          {/* Right Column - Booking Card - Mobile: Hidden, Desktop: Visible */}
          <div className="hidden lg:block lg:col-span-1 lg:sticky lg:top-20 lg:self-start order-2 lg:order-2 min-w-0">
            <div className="bg-white rounded-lg sm:rounded-xl border-2 border-slate-200 shadow-xl p-2.5 sm:p-3 md:p-4 lg:p-5">
              {/* Price - Mobile: Ultra Compact */}
              <div className="mb-2 sm:mb-3 md:mb-4">
                <div className="flex items-baseline gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-2 md:mb-3">
                  <span className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                    {selectedPeriod === 'hourly' 
                      ? (place.hourPriceActive === true && place.pricePerHour) 
                        ? `${place.pricePerHour}` 
                        : `${((place.dayPriceActive === true && place.pricePerDay ? place.pricePerDay : 0) / 24).toFixed(2)}`
                      : selectedPeriod === 'daily' 
                        ? `${(place.dayPriceActive === true && place.pricePerDay) ? place.pricePerDay : 0}` 
                        : selectedPeriod === 'weekly' && (place.weekPriceActive === true && place.pricePerWeek)
                          ? `${place.pricePerWeek}` 
                          : `${(place.monthPriceActive === true && place.pricePerMonth) ? place.pricePerMonth : 0}`}
                  </span>
                  <span className="text-sm sm:text-base md:text-lg text-slate-600">€</span>
                  <span className="text-slate-500 text-sm sm:text-xs md:text-sm">
                    / {selectedPeriod === 'hourly' ? t('parking.period.hourShort') : 
                       selectedPeriod === 'daily' ? t('parking.period.dayShort') :
                       selectedPeriod === 'weekly' ? t('parking.period.weekShort') : t('parking.period.monthShort')}
                  </span>
                </div>
                
                {/* Affichage du nombre d'heures minimum si défini - Mobile: Ultra Compact */}
                {place.minHours && place.minHours > 0 && selectedPeriod === 'hourly' && (
                  <div className="mb-1.5 sm:mb-2 md:mb-3 p-1.5 sm:p-2 md:p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs sm:text-sm md:text-xs text-amber-900">
                      <strong>⚠️ {t('parking.minDurationLabel')}</strong> {place.minHours} {place.minHours > 1 ? t('parking.hourPlural') : t('parking.hour')}
                    </p>
                  </div>
                )}
                
                {/* Affichage du nombre de jours minimum si défini - Mobile: Ultra Compact */}
                {place.minDays && place.minDays > 0 && selectedPeriod !== 'hourly' && (
                  <div className="mb-1.5 sm:mb-2 md:mb-3 p-1.5 sm:p-2 md:p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs sm:text-sm md:text-xs text-amber-900">
                      <strong>⚠️ {t('parking.minDurationLabel')}</strong> {place.minDays} {place.minDays > 1 ? t('parking.dayPlural') : t('parking.day')}
                    </p>
                  </div>
                )}

                {/* Period Selection - Mobile: Ultra Compact, touch-friendly */}
                <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3 md:mb-4">
                  {/* Bouton Heure - affiché uniquement si hourPriceActive === true */}
                  {(place.hourPriceActive === true && place.pricePerHour && place.pricePerHour > 0) && (
                    <button
                      onClick={() => setSelectedPeriod('hourly')}
                      className={`px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 text-sm sm:text-xs md:text-sm rounded-lg sm:rounded-xl border-2 font-medium transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        selectedPeriod === 'hourly'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:bg-slate-50'
                      }`}
                    >
                      {t('parking.period.hour')}
                    </button>
                  )}
                  {/* Bouton Jour - affiché uniquement si dayPriceActive === true */}
                  {(place.dayPriceActive === true && place.pricePerDay && place.pricePerDay > 0) && (
                    <button
                      onClick={() => setSelectedPeriod('daily')}
                      className={`px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 text-sm sm:text-xs md:text-sm rounded-lg sm:rounded-xl border-2 font-medium transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        selectedPeriod === 'daily'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:bg-slate-50'
                      }`}
                    >
                      {t('parking.period.day')}
                    </button>
                  )}
                  {/* Bouton Semaine - affiché uniquement si weekPriceActive === true */}
                  {(place.weekPriceActive === true && place.pricePerWeek && place.pricePerWeek > 0) && (
                    <button
                      onClick={() => setSelectedPeriod('weekly')}
                      className={`px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 text-sm sm:text-xs md:text-sm rounded-lg sm:rounded-xl border-2 font-medium transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        selectedPeriod === 'weekly'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:bg-slate-50'
                      }`}
                    >
                      {t('parking.period.week')}
                    </button>
                  )}
                  {/* Bouton Mois - affiché uniquement si monthPriceActive === true */}
                  {(place.monthPriceActive === true && place.pricePerMonth && place.pricePerMonth > 0) && (
                    <button
                      onClick={() => setSelectedPeriod('monthly')}
                      className={`px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 text-sm sm:text-xs md:text-sm rounded-lg sm:rounded-xl border-2 font-medium transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        selectedPeriod === 'monthly'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:bg-slate-50'
                      }`}
                    >
                      {t('parking.period.month')}
                    </button>
                  )}
                </div>


                {/* Date Selection - Mobile: Compact */}
                {selectedPeriod === 'hourly' ? (
                  // Sélection pour réservation horaire : une date + plage horaire
                  <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                    <div className="relative">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">{t('parking.date')}</label>
                      <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={cn(
                          "w-full border-2 rounded-xl p-2 sm:p-2.5 md:p-3 text-left transition-colors bg-white touch-manipulation active:scale-95",
                          !selectedStartDate 
                            ? "border-emerald-500 hover:border-emerald-600" 
                            : "border-slate-200 hover:border-emerald-300"
                        )}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm sm:text-xs md:text-sm text-slate-600">
                            {selectedStartDate ? formatDate(selectedStartDate) : t('parking.selectDate')}
                          </span>
                        </div>
                      </button>
                    </div>
                    
                    {/* Plage horaire - Toujours visible quand on est en mode horaire */}
                    <div className="mt-2 sm:mt-3 p-2 sm:p-2.5 md:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-2.5 md:mb-3 uppercase tracking-wide text-center">{t('parking.timeRange')}</label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 items-end">
                        {/* Heure de début - Dropdown */}
                        <div className="flex flex-col items-stretch">
                          <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1 sm:mb-1.5 md:mb-2 text-center min-h-[16px] sm:min-h-[18px] md:min-h-[20px]">{t('parking.startTime')}</label>
                          <select
                            value={(() => {
                              const opts = selectedStartDate ? generateStartTimeOptions() : generateTimeOptions();
                              return opts.includes(startHour) ? startHour : (opts[0] ?? startHour);
                            })()}
                            onChange={(e) => {
                              const newStartHour = e.target.value;
                              setStartHour(newStartHour);
                              // Réévaluer les options de fin avec la nouvelle heure de début
                              const nextEndOpts = generateEndTimeOptions(newStartHour);
                              if (nextEndOpts.length > 0 && !nextEndOpts.includes(endHour)) {
                                setEndHour(nextEndOpts[0]);
                              }
                            }}
                            className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer touch-manipulation"
                          >
                            {(selectedStartDate ? generateStartTimeOptions() : generateTimeOptions()).map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Heure de fin - Dropdown */}
                        <div className="flex flex-col items-stretch">
                          <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1 sm:mb-1.5 md:mb-2 text-center min-h-[16px] sm:min-h-[18px] md:min-h-[20px]">
                            {t('parking.endTime')}
                          </label>
                          <select
                            value={(() => {
                              const opts = generateEndTimeOptions();
                              return opts.includes(endHour) ? endHour : (opts[0] ?? endHour);
                            })()}
                            onChange={(e) => setEndHour(e.target.value)}
                            className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer touch-manipulation"
                          >
                            {generateEndTimeOptions().map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* Message minimum centré sous les deux champs */}
                        {effectiveMinHours > 1 && startHour ? (
                          <div className="text-xs sm:text-sm font-bold text-amber-600 mt-1.5 sm:mt-2 md:mt-2.5 text-center">
                            {t('parking.minTime', { time: (() => {
                              const [startH, startM] = startHour.split(':').map(Number);
                              const minEndTime = new Date();
                              minEndTime.setHours(startH, startM, 0, 0);
                              minEndTime.setHours(minEndTime.getHours() + effectiveMinHours);
                              return `${minEndTime.getHours().toString().padStart(2, '0')}:${minEndTime.getMinutes().toString().padStart(2, '0')}`;
                            })() })}
                          </div>
                        ) : null}
                      {generateEndTimeOptions().length === 0 && (
                        <p className="text-xs sm:text-sm text-red-600 mt-1.5 sm:mt-2 text-center">
                          {t('parking.noEndTimeAvailable')}
                        </p>
                      )}
                      
                      {/* Affichage de la durée et validation */}
                      {startHour && endHour && (
                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                            <span className="text-xs sm:text-sm font-medium text-slate-600">{t('parking.durationTotal')}</span>
                            <span className={`text-xs sm:text-sm font-bold ${isValidDuration ? 'text-emerald-600' : 'text-red-600'}`}>
                              {duration} {duration > 1 ? t('parking.hourPlural') : t('parking.hour')}
                            </span>
                          </div>
                          {!isValidDuration && (
                            <p className="text-xs sm:text-sm text-red-600 mt-0.5 sm:mt-1">
                              ⚠️ {t('parking.minDurationWarning')} {selectedPeriod === 'hourly' 
                                ? `${minRequired} ${minRequired > 1 ? t('parking.hourPlural') : t('parking.hour')}`
                                : `${minRequired} ${minRequired > 1 ? t('parking.dayPlural') : t('parking.day')}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Sélection pour les autres périodes : dates de début et fin
                  <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                    <div className="relative">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">{t('parking.arrival')}</label>
                      <button
                        onClick={() => {
                          setSelectingDate('arrival');
                          setShowCalendar(true);
                        }}
                        className={cn(
                          "w-full border-2 rounded-xl p-2 sm:p-2.5 md:p-3 text-left transition-colors bg-white touch-manipulation active:scale-95",
                          !selectedStartDate 
                            ? "border-emerald-500 hover:border-emerald-600" 
                            : "border-slate-200 hover:border-emerald-300"
                        )}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm sm:text-xs md:text-sm text-slate-600">
                            {selectedStartDate ? formatDate(selectedStartDate) : t('parking.select')}
                          </span>
                        </div>
                      </button>
                    </div>
                    <div className="relative">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">{t('parking.departure')}</label>
                      <button
                        onClick={() => {
                          setSelectingDate('departure');
                          setShowCalendar(true);
                        }}
                        className={cn(
                          "w-full border-2 rounded-xl p-2 sm:p-2.5 md:p-3 text-left transition-colors bg-white touch-manipulation active:scale-95",
                          !selectedEndDate 
                            ? "border-emerald-500 hover:border-emerald-600" 
                            : "border-slate-200 hover:border-emerald-300"
                        )}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm sm:text-xs md:text-sm text-slate-600">
                            {selectedEndDate ? formatDate(selectedEndDate) : t('parking.select')}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Calendar - Inline below fields */}
                {showCalendar && (
                  <>
                    {/* Calendrier scrollable pour daily/weekly sur mobile */}
                    {(selectedPeriod === 'daily' || selectedPeriod === 'weekly') && (
                      <div className="mb-4 bg-white border-2 border-slate-200 rounded-xl p-4 md:hidden">
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentDate(prev => {
                                const d = new Date(prev);
                                if (selectedPeriod === 'daily') d.setDate(d.getDate() - 1);
                                else d.setDate(d.getDate() - 7);
                                return d;
                              });
                              scrollStripLastColumnRef.current = 1;
                              isProgrammaticScrollRef.current = true;
                              setTimeout(() => { isProgrammaticScrollRef.current = false; }, 200);
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors touch-manipulation"
                            aria-label={selectedPeriod === 'daily' ? 'Jour précédent' : 'Semaine précédente'}
                          >
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                          </button>
                          <span className="text-sm font-semibold text-slate-900 text-center flex-1 min-w-0">
                            {selectedPeriod === 'daily' 
                              ? currentDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                              : (() => {
                                  const weekStart = new Date(currentDate);
                                  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lundi
                                  const weekEnd = new Date(weekStart);
                                  weekEnd.setDate(weekEnd.getDate() + 6); // Dimanche
                                  return `${weekStart.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                                })()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentDate(prev => {
                                const d = new Date(prev);
                                if (selectedPeriod === 'daily') d.setDate(d.getDate() + 1);
                                else d.setDate(d.getDate() + 7);
                                return d;
                              });
                              scrollStripLastColumnRef.current = 1;
                              isProgrammaticScrollRef.current = true;
                              setTimeout(() => { isProgrammaticScrollRef.current = false; }, 200);
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors touch-manipulation"
                            aria-label={selectedPeriod === 'daily' ? 'Jour suivant' : 'Semaine suivante'}
                          >
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                          </button>
                        </div>
                        
                        <div 
                          ref={dayWeekScrollRef}
                          className="overflow-x-auto scrollbar-hide snap-x snap-mandatory flex"
                          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                        >
                          {/* Afficher 3 jours/semaines : précédent, actuel, suivant */}
                          {Array.from({ length: 3 }).map((_, idx) => {
                            const offset = idx - 1; // -1 = précédent, 0 = actuel, 1 = suivant
                            let displayDate: Date;
                            
                            if (selectedPeriod === 'daily') {
                              displayDate = new Date(currentDate);
                              displayDate.setDate(displayDate.getDate() + offset);
                            } else {
                              // Pour weekly, afficher le lundi de la semaine
                              displayDate = new Date(currentDate);
                              displayDate.setDate(displayDate.getDate() - displayDate.getDay() + 1 + (offset * 7)); // Lundi de la semaine
                            }
                            
                            displayDate.setHours(0, 0, 0, 0);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const dateOnly = new Date(displayDate);
                            dateOnly.setHours(0, 0, 0, 0);
                            const isPast = dateOnly < today;
                            const hasReservationOnPastDate = isPast && hasPastReservation(displayDate);
                            
                            const normalizedStartDate = selectedStartDate ? new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate()) : null;
                            if (normalizedStartDate) normalizedStartDate.setHours(0, 0, 0, 0);
                            const normalizedEndDate = selectedEndDate ? new Date(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate()) : null;
                            if (normalizedEndDate) normalizedEndDate.setHours(0, 0, 0, 0);
                            
                            // Calculer la date de fin minimum selon la période
                            let minEndDate: Date | null = null;
                            if (normalizedStartDate) {
                              if (selectedPeriod === 'weekly') {
                                // Pour weekly : 7 jours minimum
                                minEndDate = new Date(normalizedStartDate);
                                minEndDate.setDate(minEndDate.getDate() + 7);
                                minEndDate.setHours(0, 0, 0, 0);
                              } else if (selectedPeriod === 'daily' && place.minDays != null && place.minDays > 1) {
                                // Journalier : premier départ possible = arrivée + (minDays - 1), pas de jour en plus
                                if (normalizedStartDate) {
                                  minEndDate = new Date(normalizedStartDate);
                                  minEndDate.setDate(minEndDate.getDate() + (place.minDays - 1));
                                  minEndDate.setHours(0, 0, 0, 0);
                                }
                              }
                            }
                            
                            // Pour weekly : vérifier si la date est un multiple de 7 jours
                            let isValidMultiple = true;
                            if (normalizedStartDate && selectedPeriod === 'weekly' && (selectingDate === 'departure' || !normalizedEndDate)) {
                              const daysDiff = Math.ceil((dateOnly.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                              isValidMultiple = daysDiff >= 7 && daysDiff % 7 === 0;
                            }
                            
                            const isBeforeStartDate = (selectingDate === 'departure' || (!selectingDate && normalizedStartDate && !normalizedEndDate)) && 
                                                      normalizedStartDate && dateOnly < normalizedStartDate;
                            const isBetweenStartAndMinEnd = (selectingDate === 'departure' || (!selectingDate && normalizedStartDate && !normalizedEndDate)) && 
                                                           normalizedStartDate && !normalizedEndDate && minEndDate && 
                                                           dateOnly > normalizedStartDate && dateOnly < minEndDate;
                            const isSelected = (normalizedStartDate && dateOnly.getTime() === normalizedStartDate.getTime()) || 
                                              (normalizedEndDate && dateOnly.getTime() === normalizedEndDate.getTime());
                            const isInRange = normalizedStartDate && normalizedEndDate && 
                                             dateOnly > normalizedStartDate && dateOnly < normalizedEndDate;
                            const isOccupied = isDateTimeOccupied(displayDate);
                            const isNotAvailable = !isDateAvailable(displayDate);
                            const isInvalidMultiple = normalizedStartDate && (selectingDate === 'departure' || !normalizedEndDate) && selectedPeriod === 'weekly' && !isValidMultiple;
                            const isWeekStartUnavailable = selectedPeriod === 'weekly' &&
                              (selectingDate === 'arrival' || (normalizedStartDate && normalizedEndDate)) &&
                              !isPast &&
                              (() => {
                                const weekEnd = new Date(dateOnly);
                                weekEnd.setDate(weekEnd.getDate() + 7);
                                weekEnd.setHours(0, 0, 0, 0);
                                return !isDateRangeFullyAvailable(dateOnly, weekEnd);
                              })();
                            // En mode jour avec durée min : ne proposer que les dates d'arrivée d'où on peut faire minDays jours consécutifs (tous disponibles ET non occupés).
                            const isStartDateBlockedByNextDays = selectedPeriod === 'daily' &&
                              (selectingDate === 'arrival' || (!normalizedStartDate && !normalizedEndDate)) &&
                              !isPast &&
                              (() => {
                                const min = place?.minDays != null && place.minDays > 0 ? place.minDays : 1;
                                const count = min <= 1 ? 1 : min - 1;
                                for (let i = 1; i <= count; i++) {
                                  const nextD = new Date(dateOnly);
                                  nextD.setDate(nextD.getDate() + i);
                                  nextD.setHours(0, 0, 0, 0);
                                  if (!isDateAvailable(nextD) || isDateTimeOccupied(nextD)) return true;
                                }
                                return false;
                              })();
                            // Permettre de cliquer sur les dates passées qui ont une réservation (pour modification)
                            // Sinon, désactiver les dates passées sans réservation
                            const isDisabled = Boolean((isPast && !hasReservationOnPastDate) || isBeforeStartDate || isBetweenStartAndMinEnd || isOccupied || isNotAvailable || isInvalidMultiple || isWeekStartUnavailable || isStartDateBlockedByNextDays);
                            
                            if (selectedPeriod === 'daily') {
                              return (
                                <div key={idx} className="flex-shrink-0 w-full snap-center" style={{ minWidth: '100%' }}>
                                  <button
                                    disabled={isDisabled}
                                    onClick={() => {
                                      const clickedDate = new Date(displayDate);
                                      clickedDate.setHours(0, 0, 0, 0);
                                      // Utiliser handleDateClickInternal pour la cohérence avec la logique weekly/monthly
                                      handleDateClickInternal(clickedDate);
                                    }}
                                    className={`w-full p-4 rounded-xl font-medium transition-all text-center ${
                                      isDisabled
                                        ? isNotAvailable
                                          ? 'text-slate-300 cursor-not-allowed bg-slate-100 opacity-40 border border-slate-200'
                                          : 'text-slate-300 cursor-not-allowed bg-slate-50 opacity-50'
                                        : isSelected
                                        ? 'bg-emerald-600 text-white shadow-md cursor-pointer'
                                        : isInRange
                                        ? 'bg-emerald-50 text-emerald-700 cursor-pointer'
                                        : 'hover:bg-emerald-50 text-slate-700 cursor-pointer border border-transparent hover:border-emerald-200'
                                    }`}
                                  >
                                    <div className="text-lg font-bold">{displayDate.getDate()}</div>
                                    <div className="text-xs mt-1">{displayDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' })}</div>
                                  </button>
                                </div>
                              );
                            } else {
                              // Weekly view
                              const weekDays = Array.from({ length: 7 }).map((_, dayIdx) => {
                                const dayDate = new Date(displayDate);
                                dayDate.setDate(dayDate.getDate() + dayIdx);
                                dayDate.setHours(0, 0, 0, 0);
                                return dayDate;
                              });
                              
                              return (
                                <div key={idx} className="flex-shrink-0 w-full snap-center" style={{ minWidth: '100%' }}>
                                  <div className="grid grid-cols-7 gap-1">
                                    {weekDays.map((dayDate, dayIdx) => {
                                      const dayDateOnly = new Date(dayDate);
                                      dayDateOnly.setHours(0, 0, 0, 0);
                                      const dayIsPast = dayDateOnly < today;
                                      const dayHasReservationOnPastDate = dayIsPast && hasPastReservation(dayDate);
                                      
                                      // Calculer minEndDate pour weekly (7 jours minimum) — cette grille est uniquement pour la vue hebdo
                                      let dayMinEndDate: Date | null = null;
                                      if (normalizedStartDate && selectedPeriod === 'weekly') {
                                        dayMinEndDate = new Date(normalizedStartDate);
                                        dayMinEndDate.setDate(dayMinEndDate.getDate() + 7);
                                        dayMinEndDate.setHours(0, 0, 0, 0);
                                      }
                                      
                                      // Pour weekly : vérifier si la date est un multiple de 7 jours
                                      let dayIsValidMultiple = true;
                                      if (normalizedStartDate && selectedPeriod === 'weekly' && !normalizedEndDate) {
                                        const daysDiff = Math.ceil((dayDateOnly.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                                        dayIsValidMultiple = daysDiff >= 7 && daysDiff % 7 === 0;
                                      }
                                      
                                      const dayIsBeforeStartDate = (selectingDate === 'departure' || (!selectingDate && normalizedStartDate && !normalizedEndDate)) && 
                                                                   normalizedStartDate && dayDateOnly < normalizedStartDate;
                                      const dayIsBetweenStartAndMinEnd = (selectingDate === 'departure' || (!selectingDate && normalizedStartDate && !normalizedEndDate)) && 
                                                                         normalizedStartDate && !normalizedEndDate && dayMinEndDate && 
                                                                         dayDateOnly > normalizedStartDate && dayDateOnly < dayMinEndDate;
                                      const dayIsSelected = (normalizedStartDate && dayDateOnly.getTime() === normalizedStartDate.getTime()) || 
                                                           (normalizedEndDate && dayDateOnly.getTime() === normalizedEndDate.getTime());
                                      const dayIsInRange = normalizedStartDate && normalizedEndDate && 
                                                          dayDateOnly > normalizedStartDate && dayDateOnly < normalizedEndDate;
                                      const dayIsOccupied = isDateTimeOccupied(dayDate);
                                      const dayIsNotAvailable = !isDateAvailable(dayDate);
                                      const dayIsInvalidMultiple = normalizedStartDate && (selectingDate === 'departure' || !normalizedEndDate) && selectedPeriod === 'weekly' && !dayIsValidMultiple;
                                      // Permettre de cliquer sur les dates passées qui ont une réservation (pour modification)
                                      // Sinon, désactiver les dates passées sans réservation
                                      const dayIsDisabled = Boolean((dayIsPast && !dayHasReservationOnPastDate) || dayIsBeforeStartDate || dayIsBetweenStartAndMinEnd || dayIsOccupied || dayIsNotAvailable || dayIsInvalidMultiple);
                                      
                                      return (
                                        <button
                                          key={dayIdx}
                                          disabled={dayIsDisabled}
                                          onClick={() => {
                                            const clickedDate = new Date(dayDate);
                                            clickedDate.setHours(0, 0, 0, 0);
                                            if (!isDateAvailable(clickedDate)) {
                                              setReservationError(t('parking.dateNotAvailable'));
                                              return;
                                            }
                                            // Utiliser handleDateClickInternal pour la cohérence avec la logique weekly/monthly
                                            handleDateClickInternal(clickedDate);
                                          }}
                                          className={`aspect-square flex flex-col items-center justify-center text-xs rounded-lg font-medium transition-all ${
                                            dayIsDisabled
                                              ? dayIsNotAvailable
                                                ? 'text-slate-300 cursor-not-allowed bg-slate-100 opacity-40 border border-slate-200'
                                                : 'text-slate-300 cursor-not-allowed bg-slate-50 opacity-50'
                                              : dayIsSelected
                                              ? 'bg-emerald-600 text-white shadow-md cursor-pointer'
                                              : dayIsInRange
                                              ? 'bg-emerald-50 text-emerald-700 cursor-pointer'
                                              : 'hover:bg-emerald-50 text-slate-700 cursor-pointer border border-transparent hover:border-emerald-200'
                                          }`}
                                        >
                                          <div className="text-xs">{dayDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' })}</div>
                                          <div className="text-sm font-bold">{dayDate.getDate()}</div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Calendrier mensuel classique pour monthly et desktop */}
                    <div className={`mb-3 w-full max-w-[15rem] sm:max-w-[16rem] md:max-w-[17rem] min-w-0 bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 shadow-sm ${(selectedPeriod === 'daily' || selectedPeriod === 'weekly') ? 'hidden md:block' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <button onClick={prevMonth} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors touch-manipulation" aria-label="Mois précédent">
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate min-w-0 px-0.5">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                      </span>
                      <button onClick={nextMonth} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors touch-manipulation" aria-label="Mois suivant">
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-px sm:gap-0.5 mb-0.5">
                      {dayNames.map((day, idx) => (
                        <div key={idx} className="text-center text-xs sm:text-xs md:text-xs font-medium text-slate-500 truncate">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-px sm:gap-0.5 w-full min-w-0">
                      {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="aspect-square min-w-0 w-full" />
                      ))}
                      
                      {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const day = idx + 1;
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dateOnly = new Date(date);
                        dateOnly.setHours(0, 0, 0, 0);
                        const isPast = dateOnly < today;
                        const hasReservationOnPastDate = isPast && hasPastReservation(date);
                        
                        // Normaliser les dates sélectionnées pour les comparaisons (avant minEndDate pour daily)
                        const normalizedStartDate = selectedStartDate ? new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), selectedStartDate.getDate()) : null;
                        if (normalizedStartDate) normalizedStartDate.setHours(0, 0, 0, 0);
                        const normalizedEndDate = selectedEndDate ? new Date(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate()) : null;
                        if (normalizedEndDate) normalizedEndDate.setHours(0, 0, 0, 0);
                        
                        // Calculer la date de fin minimum selon la période
                        // IMPORTANT : Ne pas calculer minEndDate pour les réservations horaires (on utilise minHours)
                        let minEndDate: Date | null = null;
                        if (selectedStartDate && selectedPeriod !== 'hourly') {
                          if (selectedPeriod === 'monthly') {
                            // Pour monthly : 1 mois après la date de début
                            minEndDate = new Date(selectedStartDate);
                            minEndDate.setMonth(minEndDate.getMonth() + 1);
                            minEndDate.setHours(0, 0, 0, 0);
                          } else if (selectedPeriod === 'weekly') {
                            // Pour weekly : 7 jours après la date de début (minimum 1 semaine)
                            minEndDate = new Date(selectedStartDate);
                            minEndDate.setDate(minEndDate.getDate() + 7);
                            minEndDate.setHours(0, 0, 0, 0);
                          } else if (selectedPeriod === 'daily' && place.minDays != null && place.minDays > 1) {
                            // Journalier : 2 jours = lundi arrivée, mardi départ → premier départ = arrivée + (minDays - 1), pas de jour en plus
                            if (normalizedStartDate) {
                              minEndDate = new Date(normalizedStartDate);
                              minEndDate.setDate(minEndDate.getDate() + (place.minDays - 1));
                              minEndDate.setHours(0, 0, 0, 0);
                            }
                          }
                        }
                        
                        // Pour weekly et monthly : vérifier si la date est un multiple valide
                        let isValidMultiple = true;
                        if (normalizedStartDate && (selectedPeriod === 'weekly' || selectedPeriod === 'monthly')) {
                          if (selectedPeriod === 'weekly') {
                            // Pour weekly : vérifier que c'est un multiple de 7 jours depuis la date de début
                            const daysDiff = Math.ceil((dateOnly.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                            isValidMultiple = daysDiff >= 7 && daysDiff % 7 === 0;
                          } else if (selectedPeriod === 'monthly') {
                            // Pour monthly : vérifier que c'est un multiple de mois depuis la date de début
                            const monthsDiff = (dateOnly.getFullYear() - normalizedStartDate.getFullYear()) * 12 + 
                                             (dateOnly.getMonth() - normalizedStartDate.getMonth());
                            // Vérifier que la date correspond exactement à un multiple de mois
                            const expectedEndDate = new Date(normalizedStartDate);
                            expectedEndDate.setMonth(expectedEndDate.getMonth() + monthsDiff);
                            expectedEndDate.setHours(0, 0, 0, 0);
                            isValidMultiple = monthsDiff >= 1 && dateOnly.getTime() === expectedEndDate.getTime();
                          }
                        }
                        
                        // Griser les dates avant la date de début seulement quand on sélectionne la date de départ
                        // Permettre de sélectionner n'importe quelle date quand on sélectionne la date d'arrivée
                        // IMPORTANT : Ne pas appliquer ces contraintes pour les réservations horaires
                        const isBeforeStartDate = selectedPeriod !== 'hourly' && 
                                                 (selectingDate === 'departure' || (!selectingDate && normalizedStartDate && !normalizedEndDate)) && 
                                                 normalizedStartDate && dateOnly < normalizedStartDate;
                        const isBetweenStartAndMinEnd = selectedPeriod !== 'hourly' && 
                                                       (selectingDate === 'departure' || (!selectingDate && normalizedStartDate && !normalizedEndDate)) && 
                                                       normalizedStartDate && !normalizedEndDate && minEndDate && 
                                                       dateOnly > normalizedStartDate && dateOnly < minEndDate;
                        // Pour weekly et monthly : désactiver les dates qui ne sont pas des multiples valides
                        const isInvalidMultiple = normalizedStartDate && (selectingDate === 'departure' || !normalizedEndDate) && (selectedPeriod === 'weekly' || selectedPeriod === 'monthly') && !isValidMultiple;
                        const isSelected = (normalizedStartDate && dateOnly.getTime() === normalizedStartDate.getTime()) || 
                                          (normalizedEndDate && dateOnly.getTime() === normalizedEndDate.getTime());
                        const isInRange = normalizedStartDate && normalizedEndDate && 
                                         dateOnly > normalizedStartDate && dateOnly < normalizedEndDate;
                        // Pour les réservations horaires, ne pas griser le jour (on filtre les heures dans les listes).
                        // Pour jour/semaine/mois : griser tout jour ayant au moins un créneau occupé (même partiel, ex. 2h).
                        const isOccupied = selectedPeriod === 'hourly' ? false : isDateTimeOccupied(date);
                        const isNotAvailable = selectedPeriod === 'hourly'
                          ? (!isDateAvailableForHourly(date) || !dayHasFreeSlotForDuration(dateOnly, duration))
                          : !isDateAvailable(date);
                        const isWeekStartUnavailable = selectedPeriod === 'weekly' &&
                          (selectingDate === 'arrival' || (normalizedStartDate && normalizedEndDate)) &&
                          !isPast &&
                          (() => {
                            const weekEnd = new Date(dateOnly);
                            weekEnd.setDate(weekEnd.getDate() + 7);
                            weekEnd.setHours(0, 0, 0, 0);
                            return !isDateRangeFullyAvailable(dateOnly, weekEnd);
                          })();
                        // En mode jour avec durée min : ne proposer que les dates d'arrivée d'où on peut faire minDays jours consécutifs (tous disponibles ET non occupés).
                        const isStartDateBlockedByNextDays = selectedPeriod === 'daily' &&
                          (selectingDate === 'arrival' || (!normalizedStartDate && !normalizedEndDate)) &&
                          !isPast &&
                          (() => {
                            const min = place?.minDays != null && place.minDays > 0 ? place.minDays : 1;
                            const count = min <= 1 ? 1 : min - 1;
                            for (let i = 1; i <= count; i++) {
                              const nextD = new Date(dateOnly);
                              nextD.setDate(nextD.getDate() + i);
                              nextD.setHours(0, 0, 0, 0);
                              if (!isDateAvailable(nextD) || isDateTimeOccupied(nextD)) return true;
                            }
                            return false;
                          })();
                        // Permettre de cliquer sur les dates passées qui ont une réservation (pour modification)
                        // Sinon, désactiver les dates passées sans réservation
                        const isDisabled = Boolean((isPast && !hasReservationOnPastDate) || isBeforeStartDate || isBetweenStartAndMinEnd || isOccupied || isNotAvailable || isInvalidMultiple || isWeekStartUnavailable || isStartDateBlockedByNextDays);
                        
                        return (
                          <button
                            key={day}
                            disabled={isDisabled}
                            onClick={() => handleDateClick(day)}
                            className={`aspect-square min-w-0 w-full flex items-center justify-center text-xs sm:text-xs rounded-md font-medium transition-all ${
                              isDisabled
                                ? isNotAvailable
                                  ? 'text-slate-300 cursor-not-allowed bg-slate-100 opacity-40 border border-slate-200' // Grisé pour dates non disponibles
                                  : 'text-slate-300 cursor-not-allowed bg-slate-50 opacity-50' // Autres cas désactivés
                                : isSelected
                                ? 'bg-emerald-600 text-white shadow cursor-pointer'
                                : isInRange
                                ? 'bg-emerald-50 text-emerald-700 cursor-pointer'
                                : 'hover:bg-emerald-50 text-slate-700 cursor-pointer border border-transparent hover:border-emerald-200'
                            }`}
                            title={
                              isNotAvailable
                                ? t('parking.dateNotAvailableTooltip')
                                : isOccupied 
                                ? t('parking.slotReservedTooltip')
                                : isWeekStartUnavailable
                                ? t('parking.weekHasUnavailableDays')
                                : isStartDateBlockedByNextDays && (place?.minDays ?? 0) > 0
                                ? t('parking.minDaysBlockedTooltip', { days: place?.minDays ?? 1 })
                                : isInvalidMultiple
                                ? selectedPeriod === 'weekly'
                                  ? t('parking.weeklyMultipleTooltip')
                                  : t('parking.monthlyMultipleTooltip')
                                : isBetweenStartAndMinEnd
                                ? selectedPeriod === 'monthly'
                                  ? t('parking.monthlyMinTooltip')
                                  : selectedPeriod === 'weekly'
                                  ? t('parking.weeklyMinTooltip')
                                  : place.minDays && place.minDays > 0
                                  ? (place.minDays > 1 ? t('parking.minDurationTooltipPlural', { days: place.minDays, date: minEndDate ? minEndDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit' }) : '' }) : t('parking.minDurationTooltip', { days: place.minDays, date: minEndDate ? minEndDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit' }) : '' }))
                                  : t('parking.dateUnavailableTooltip')
                                : isBeforeStartDate
                                ? t('parking.endAfterStartTooltip')
                                : isPast && !hasReservationOnPastDate
                                ? t('parking.pastDateNotModifiable')
                                : isPast && hasReservationOnPastDate
                                ? t('parking.pastDateModifiable')
                                : t('parking.dateAvailableTooltip')
                            }
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {reservationError && (
                  <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{reservationError}</p>
                  </div>
                )}
                
                {/* Prix total à payer (frais inclus, non détaillés) */}
                {(() => {
                  const basePrice = calculateTotalPrice();
                  // totalPrice = basePrice + serviceFee (montant payé par le client)
                  const serviceFee = getServiceFee(basePrice);
                  const totalPrice = addServiceFee(basePrice);
                  const depositAmount = place?.deposit && place.deposit > 0 ? place.deposit : 0;
                  // Afficher le montant après promo si code valide et ≤ 10 % (même calcul qu’au paiement, une seule fois)
                  let displayTotal = totalPrice;
                  if (promoValidation.status === 'valid' && promoValidation.data && !promoExceedsMaxPercent && totalPrice > 0) {
                    const data = promoValidation.data;
                    const amount = data.amount ?? 0;
                    const discountEur = data.discountType === 'PERCENTAGE' ? totalPrice * (amount / 100) : amount;
                    displayTotal = Math.max(0, Math.round((totalPrice - discountEur) * 100) / 100);
                  }

                  return basePrice > 0 ? (
                    <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 md:p-4 bg-white border-2 border-slate-200 rounded-lg">
                      {/* Caution - affichée si elle existe */}
                      {depositAmount > 0 && (
                        <div className="mb-3 pb-3 border-b border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-slate-700">{t('parking.depositTitle')}</span>
                            </div>
                            <span className="text-sm sm:text-base font-semibold text-slate-900">{depositAmount.toFixed(2)} €</span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            {t('parking.depositRefund')}
                          </p>
                        </div>
                      )}
                      {/* Total à payer (frais inclus) - Mobile: Compact */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-slate-900">{t('parking.totalToPay')}</span>
                        <span className="text-right">
                          {displayTotal < totalPrice ? (
                            <>
                              <span className="block text-sm sm:text-base font-semibold text-slate-400 line-through">{totalPrice.toFixed(2)} €</span>
                              <span className="block text-lg sm:text-xl font-bold text-emerald-600">{displayTotal.toFixed(2)} €</span>
                            </>
                          ) : (
                            <span className="text-lg sm:text-xl font-bold text-emerald-600">{displayTotal.toFixed(2)} €</span>
                          )}
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Politique d&apos;annulation - Affichée avant le bouton de réservation - Mobile: Compact */}
                {place.cancellationDeadlineDays !== undefined && place.cancellationDeadlineDays !== null && (
                  <div className={`mb-3 sm:mb-4 p-2 sm:p-2.5 md:p-3 rounded-lg border ${
                    place.cancellationDeadlineDays === -1 
                      ? 'bg-red-50 border-red-200' 
                      : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                      ? 'bg-green-50 border-green-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      <AlertCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0 ${
                        place.cancellationDeadlineDays === -1 
                          ? 'text-red-600' 
                          : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                          ? 'text-green-600'
                          : 'text-blue-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 ${
                          place.cancellationDeadlineDays === -1 
                            ? 'text-red-900' 
                            : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                            ? 'text-green-900'
                            : 'text-blue-900'
                        }`}>
                          {t('parking.cancellationPolicy')}
                        </p>
                        <p className={`text-xs sm:text-sm leading-relaxed ${
                          place.cancellationDeadlineDays === -1 
                            ? 'text-red-700' 
                            : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                            ? 'text-green-700'
                            : 'text-blue-700'
                        }`}>
                          {getCancellationPolicyText(place.cancellationDeadlineDays, place.cancellationPolicy)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Code promo - Mobile: Compact */}
                <div className="mb-3">
                  <label htmlFor="promo-code-mobile" className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1">
                    Code promo
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="promo-code-mobile"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Ex: PROMO20"
                      className="w-full pl-8 sm:pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition"
                      maxLength={32}
                    />
                  </div>
                  {promoValidation.status === 'validating' && (
                    <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                      Vérification...
                    </p>
                  )}
                  {promoValidation.status === 'valid' && promoValidation.data && (() => {
                    const data = promoValidation.data!;
                    if (promoExceedsMaxPercent) {
                      return (
                        <p className="mt-1 text-xs font-medium text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Ce code ne pourra pas être utilisé : la réduction doit être au maximum de 10 % du montant à payer.
                        </p>
                      );
                    }
                    return (
                      <p className="mt-1 text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 flex-shrink-0" />
                        {data.type === 'DISCOUNT_BONUS'
                          ? `Bon d'achat valide${data.amount != null ? ` (-${data.amount} €)` : ''}`
                          : `Code promo valide${data.amount != null ? (data.discountType === 'PERCENTAGE' ? ` (-${data.amount} %)` : ` (-${data.amount} €)`) : ''}`}
                      </p>
                    );
                  })()}
                  {promoValidation.status === 'invalid' && promoValidation.error && (
                    <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {promoValidation.error}
                    </p>
                  )}
                </div>

                {/* Bouton Réserver avec tooltip - Mobile: Compact */}
                <div className="relative group">
                  <button
                    data-testid="reserve-button"
                    onClick={handleReservation}
                    disabled={
                      isCreatingReservation ||
                      (selectedPeriod === 'hourly' && (!selectedStartDate || !isValidDuration)) ||
                      (selectedPeriod !== 'hourly' && (!selectedStartDate || !selectedEndDate))
                    }
                    className={`w-full font-semibold py-2.5 sm:py-3 min-h-[48px] rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation active:scale-95 ${
                      isCreatingReservation ||
                      (selectedPeriod === 'hourly' && (!selectedStartDate || !isValidDuration)) ||
                      (selectedPeriod !== 'hourly' && (!selectedStartDate || !selectedEndDate))
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    }`}
                  >
                    {isCreatingReservation ? (
                      <>
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs sm:text-sm">{t('parking.creating')}</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span>{t('parking.reserveNow')}</span>
                      </>
                    )}
                  </button>
                  
                  {/* Tooltip qui s'affiche quand le bouton est désactivé ou au clic si aucune date */}
                  {!isCreatingReservation && (
                    showDateTooltip || (
                      (selectedPeriod === 'hourly' && (!selectedStartDate || !isValidDuration)) ||
                      (selectedPeriod !== 'hourly' && (!selectedStartDate || !selectedEndDate))
                    )
                  ) && (
                    <div className={cn(
                      "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg shadow-xl transition-opacity duration-200 pointer-events-none z-50",
                      showDateTooltip ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <p className="text-center">
                        {selectedPeriod === 'hourly' 
                          ? (!selectedStartDate 
                              ? t('parking.selectDateToReserve')
                              : !isValidDuration
                              ? (minRequired > 1 ? t('parking.minDurationHoursPlural', { hours: minRequired }) : t('parking.minDurationHours', { hours: minRequired }))
                              : t('parking.selectDateAndTime'))
                          : (!selectedStartDate || !selectedEndDate
                              ? t('parking.selectDatesToReserve')
                              : !isValidDuration
                              ? (minRequired > 1 ? t('parking.reservationMinDurationPlural', { days: minRequired }) : t('parking.reservationMinDuration', { days: minRequired }))
                              : t('parking.selectDatesToReserve'))
                        }
                      </p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                    </div>
                  )}
                  
                  {/* Message d'erreur affiché sous le bouton */}
                  {reservationError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-700 text-center">{reservationError}</p>
                    </div>
                  )}
                </div>
                <Link
                  href={`/messages?placeId=${place.id}&userId=${place.ownerId}`}
                  prefetch={false}
                  onClick={(e) => handleCapacitorLinkClick(e, `/messages?placeId=${place.id}&userId=${place.ownerId}`, router)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-3 min-h-[48px] rounded-xl transition-all cursor-pointer touch-manipulation"
                >
                  <MessageCircle className="w-5 h-5" />
                  {t('parking.contactHost')}
                </Link>
              </div>

              <p className="text-xs text-slate-500 text-center mt-4">
                {t('parking.paymentOnConfirmation')}
              </p>
            </div>

            {/* Location - Sticky - Mobile: bien lisible */}
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-slate-200 shadow-xl mt-2 sm:mt-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">{t('parking.locationSection')}</h2>
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4">
                <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm sm:text-base text-slate-900">{place.city}</p>
                  <p className="text-sm text-slate-600 mt-0.5 sm:mt-1">{epureAddress(place.address)}</p>
                </div>
              </div>
              {/* Carte interactive - overflow-anchor: none évite que le navigateur descende le scroll quand la carte charge */}
              <div 
                className="w-full h-48 sm:h-80 rounded-lg sm:rounded-xl overflow-hidden border border-slate-200"
                tabIndex={-1}
                style={{ overflowAnchor: 'none' }}
                onFocus={(e) => {
                  e.currentTarget.blur();
                  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                }}
              >
                {mapProperty ? (
                  <PropertiesMap
                    properties={[mapProperty]}
                    selectedPropertyId={mapProperty.id}
                    center={{ lat: mapProperty.lat, lng: mapProperty.lng, zoom: 15 }}
                    showUserLocation={false}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-1 sm:mb-2" />
                      <p className="text-sm sm:text-sm text-slate-500">{t('parking.loadingMap')}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Fonction pour obtenir l'itinéraire Google Maps */}
              {(() => {
                const handleGetDirections = () => {
                  if (!place) return;
                  
                  const address = place.address && place.address.trim() 
                    ? `${place.address}, ${place.city}` 
                    : place.city;
                  
                  // Encoder l'adresse pour l'URL Google Maps
                  const encodedAddress = encodeURIComponent(address);
                  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
                  
                  // Ouvrir dans un nouvel onglet
                  window.open(googleMapsUrl, '_blank');
                };
                
                return (
                  <button
                    onClick={handleGetDirections}
                    className="mt-3 sm:mt-4 w-full px-3 sm:px-4 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer touch-manipulation"
                  >
                    <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
                    Obtenir l&apos;itinéraire
                  </button>
                );
              })()}
              <button
                onClick={() => setShowReportPlaceModal(true)}
                className="w-full mt-2 sm:mt-4 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95"
              >
                <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
                <span>{t('parking.reportPlace')}</span>
              </button>
            </div>
          </div>
        </div>


        {/* Bloc Conditions d&apos;annulation et Conditions du bien */}
        {place && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  {t('parking.placeConditions')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Conditions d&apos;annulation */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-600" />
                      {t('parking.cancellationConditions')}
                    </h3>
                  
                  {place.cancellationDeadlineDays !== undefined && place.cancellationDeadlineDays !== null ? (
                    <div className={`p-4 rounded-xl border ${
                      place.cancellationDeadlineDays === -1 
                        ? 'bg-red-50 border-red-200' 
                        : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          place.cancellationDeadlineDays === -1 
                            ? 'text-red-600' 
                            : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                            ? 'text-green-600'
                            : 'text-blue-600'
                        }`} />
                        <div className="flex-1">
                          <p className={`font-semibold mb-2 ${
                            place.cancellationDeadlineDays === -1 
                              ? 'text-red-900' 
                              : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                              ? 'text-green-900'
                              : 'text-blue-900'
                          }`}>
                            {t('parking.cancellationPolicy')}
                          </p>
                          <p className={`text-sm leading-relaxed mb-3 ${
                            place.cancellationDeadlineDays === -1 
                              ? 'text-red-700' 
                              : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null
                              ? 'text-green-700'
                              : 'text-blue-700'
                          }`}>
                            {getCancellationPolicyText(place.cancellationDeadlineDays, place.cancellationPolicy)}
                          </p>
                          {place.cancellationDeadlineDays === -1 ? (
                            <p className="text-xs text-red-600">
                              ⚠️ {t('parking.cancellationOnceConfirmed')}
                            </p>
                          ) : place.cancellationDeadlineDays === 0 || place.cancellationDeadlineDays === null ? (
                            <p className="text-xs text-green-700">
                              ✓ {t('parking.cancelAnytime')}
                            </p>
                          ) : (
                            <p className="text-xs text-blue-700">
                              ℹ️ {place.cancellationDeadlineDays > 1 ? t('parking.cancelFreeUntilPlural', { days: place.cancellationDeadlineDays }) : t('parking.cancelFreeUntil', { days: place.cancellationDeadlineDays })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-sm text-slate-600">
                        {t('parking.cancellationNotSpecified')}
                      </p>
                    </div>
                  )}
                </div>

                  <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    {t('parking.generalConditions')}
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-slate-600" />
                        <span className="font-semibold text-slate-900 text-sm">{t('parking.deposit')}</span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {t('parking.noDepositRequired')}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-slate-600" />
                        <span className="font-semibold text-slate-900 text-sm">{t('parking.importantRules')}</span>
                      </div>
                      <ul className="text-sm text-slate-600 space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-600 mt-0.5">•</span>
                          <span>{t('parking.respectAccessHours')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-600 mt-0.5">•</span>
                          <span>{t('parking.leaveAsFound')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-600 mt-0.5">•</span>
                          <span>{t('parking.noSmoking')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-600 mt-0.5">•</span>
                          <span>{t('parking.respectSafety')}</span>
                        </li>
                      </ul>
                    </div>

                    {place.accessType ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DoorClosed className="w-4 h-4 text-slate-600" />
                          <span className="font-semibold text-slate-900 text-sm">{t('parking.access')}</span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {place.accessType === 'KEY' ? t('parking.accessKey') : null}
                          {place.accessType === 'CODE' ? t('parking.accessCode') : null}
                          {place.accessType === 'BADGE' ? t('parking.accessBadge') : null}
                          {place.accessType === 'REMOTE' ? t('parking.accessRemote') : null}
                          {!['KEY', 'CODE', 'BADGE', 'REMOTE'].includes(String(place.accessType)) ? t('parking.accessDetailsLater') : null}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
                </div>

                {/* Note importante */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 text-sm mb-1">{t('parking.importantNote')}</p>
                      <p className="text-sm text-amber-800">
                        {t('parking.importantNoteText')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <FooterNavigation />

      {/* Modal de signalement de bien */}
      {showReportPlaceModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowReportPlaceModal(false);
              setReportPlaceReason('');
              setReportPlaceDescription('');
              setReportSuccess(false);
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-t-2xl md:rounded-xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in-95 duration-300" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-600" />
                {t('parking.reportPlace')}
              </h3>
              <button
                onClick={() => {
                  setShowReportPlaceModal(false);
                  setReportPlaceReason('');
                  setReportPlaceDescription('');
                  setReportSuccess(false);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-slate-900 mb-2">{t('parking.reportSent')}</h4>
                <p className="text-slate-600 mb-6">
                  {t('parking.reportThanks')}
                </p>
                <button
                  onClick={() => {
                    setShowReportPlaceModal(false);
                    setReportPlaceReason('');
                    setReportPlaceDescription('');
                    setReportSuccess(false);
                  }}
                  className="px-6 py-2 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors touch-manipulation"
                >
                  {t('parking.close')}
                </button>
              </div>
            ) : (
              <>
                <p className="text-slate-600 mb-6">
                  {t('parking.helpMaintain')}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      {t('parking.reportReason')} *
                    </label>
                    <select
                      value={reportPlaceReason}
                      onChange={(e) => setReportPlaceReason(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">{t('parking.selectReason')}</option>
                      <option value="INACCURATE_OR_INCORRECT">{t('parking.reportReason_INACCURATE_OR_INCORRECT')}</option>
                      <option value="NOT_A_REAL_ACCOMMODATION">{t('parking.reportReason_NOT_A_REAL_ACCOMMODATION')}</option>
                      <option value="SCAM">{t('parking.reportReason_SCAM')}</option>
                      <option value="SHOCKING_CONTENT">{t('parking.reportReason_SHOCKING_CONTENT')}</option>
                      <option value="ILLEGAL_CONTENT">{t('parking.reportReason_ILLEGAL_CONTENT')}</option>
                      <option value="SPAM">{t('parking.reportReason_SPAM')}</option>
                      <option value="OTHER">{t('parking.reportReason_OTHER')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      {t('parking.description')} {t('parking.optional')}
                    </label>
                    <textarea
                      value={reportPlaceDescription}
                      onChange={(e) => setReportPlaceDescription(e.target.value)}
                      rows={4}
                      placeholder={t('parking.describeProblem')}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowReportPlaceModal(false);
                        setReportPlaceReason('');
                        setReportPlaceDescription('');
                      }}
                      disabled={isSubmittingReport}
                      className="flex-1 px-4 py-2 min-h-[44px] text-slate-700 border-2 border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 touch-manipulation"
                    >
                      {t('parking.cancel')}
                    </button>
                    <button
                      onClick={async () => {
                        if (!reportPlaceReason || !place) return;
                        
                        setIsSubmittingReport(true);
                        try {
                          const userId = localStorage.getItem('userId');
                          const report: PlaceReportDTO = {
                            placeId: place.id,
                            reason: reportPlaceReason as ReportReason,
                            description: reportPlaceDescription || undefined,
                            reporterId: userId ? parseInt(userId, 10) : undefined,
                          };
                          
                          await reportingAPI.reportPlace(report);
                          setReportSuccess(true);
                        } catch (error) {
                          console.error(t('parking.reportError'), error);
                          alert(t('parking.errorOccurred'));
                        } finally {
                          setIsSubmittingReport(false);
                        }
                      }}
                      disabled={!reportPlaceReason || isSubmittingReport}
                      className="flex-1 px-4 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
                    >
                      {isSubmittingReport ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t('parking.sending')}
                        </>
                      ) : (
                        <>
                          <Flag className="w-4 h-4" />
                          {t('parking.reportButton')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal paiement Stripe embarqué - mobile iOS/Android uniquement */}
      {stripeEmbeddedClientSecret && (
        <StripeEmbeddedCheckout
          clientSecret={stripeEmbeddedClientSecret}
          successUrl=""
          showCloseButton
          onClose={() => {
            setStripeEmbeddedClientSecret(null);
            setIsCreatingReservation(false);
          }}
        />
      )}
    </div>
  );
}
