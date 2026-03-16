'use client';

import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Eye, MoreVertical, Car, Box, Warehouse, X, Euro, CheckCircle, XCircle, AlertCircle, List, Filter, Plus, MessageSquare, Loader2, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { getDisplayFirstName, capitalizeFirstPerLine, getValidPhoto } from '@/lib/utils';
import { placesAPI, PlaceDTO, PlaceAvailabilityDTO, reservationsAPI } from '@/services/api';
import { fromApiDateTime, utcTimeToLocalTimeString, toLocalDateString } from '@/lib/datetime';

type ViewMode = 'day' | 'week' | 'month' | 'list';
type AvailabilityStatus = 'available' | 'reserved' | 'blocked';

interface Reservation {
  id: string;
  spaceId: number;
  spaceTitle: string;
  date: Date;
  customerId?: number; // ID du client pour le lien "Contacter le client"
  customerName: string;
  customerAvatar: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  status: 'confirmed' | 'pending' | 'completed';
  checkIn?: string;
  checkOut?: string;
  startHour?: number;
  endHour?: number;
  notes?: string;
  totalPrice?: number; // Prix total payé par le client
  serviceFee?: number; // Frais de service (10%)
  hostAmount?: number; // Montant net pour l'hôte
}

interface Space {
  id: number;
  title: string;
  type: 'parking' | 'storage' | 'cellar';
  location: string;
  city: string;
  address: string;
  priceDaily: number;
  priceHourly?: number;
  priceMonthly: number;
  image: string;
  availableFrom?: string; // Date de début de disponibilité globale
  availableTo?: string; // Date de fin de disponibilité globale
  availabilities: Array<{
    date?: string;
    available?: boolean;
    customPrice?: number; // Prix personnalisé (peut venir du backend comme customPrice ou customPricePerDay)
    customPricePerDay?: number; // Alias pour compatibilité avec le DTO backend
    startTime?: string;
    endTime?: string;
  }>;
  occupiedSlots: Array<{
    id?: string | number;
    reservationId?: number;
    clientId?: number;
    date?: string;
    startTime?: string;
    endTime?: string;
    startHour?: number;
    endHour?: number;
    customerName?: string;
    clientName?: string;
    customerAvatar?: string;
    clientAvatar?: string;
    customerEmail?: string;
    clientEmail?: string;
    customerPhone?: string;
    clientPhone?: string;
    totalPrice?: number; // Prix total payé par le client
    serviceFee?: number; // Frais de service (10%)
    hostAmount?: number; // Montant net pour l'hôte
    amount?: number; // Alias pour totalPrice (rétrocompatibilité)
    status?: string;
    startDateTime?: string;
    startDate?: string;
    endDateTime?: string;
    endDate?: string;
    notes?: string;
  }>;
  characteristics: Array<{
    name?: string;
    value?: string;
  }>;
}

export default function MonCalendrierPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  // En mode jour : différer le rendu du tableau pour garder l’onglet réactif (éviter blocage ~10 s)
  const [dayViewReady, setDayViewReady] = useState(false);
  useEffect(() => {
    if (viewMode !== 'day') {
      setDayViewReady(false);
      return;
    }
    const id = setTimeout(() => setDayViewReady(true), 80);
    return () => clearTimeout(id);
  }, [viewMode]);
  // Initialiser avec la date du jour pour toujours commencer sur aujourd'hui
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedSpaces, setSelectedSpaces] = useState<number[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Map qui associe chaque spaceId à un Set de dates bloquées
  const [blockedDates, setBlockedDates] = useState<Map<number, Set<string>>>(new Map());
  
  // Fonction helper pour gérer la sélection de date avec création automatique de plage
  const handleDateSelection = (spaceId: number, date: Date, displayPrice: number) => {
    // Normaliser la date à minuit pour éviter les problèmes de fuseau horaire
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    // Si aucune date n'est sélectionnée OU si on clique sur une autre ligne
    if (!selectedDate && !selectedDateRange) {
      // Première sélection : sélectionner cette date
      setSelectedDate(normalizedDate);
      setSelectedDateRange(null);
      setSelectedSpaceId(spaceId);
      setSelectedReservation(null);
      setModifiedPrice(displayPrice.toString());
    } else if (selectedSpaceId === spaceId) {
      // Même ligne : créer une plage entre la date sélectionnée et la nouvelle date
      if (selectedDate) {
        // Créer une plage avec la date déjà sélectionnée
        const startDate = selectedDate < normalizedDate ? selectedDate : normalizedDate;
        const endDate = selectedDate < normalizedDate ? normalizedDate : selectedDate;
        setSelectedDateRange({ start: startDate, end: endDate });
        setSelectedDate(null);
        setSelectedSpaceId(spaceId);
        setSelectedReservation(null);
        setModifiedPrice(displayPrice.toString());
      } else if (selectedDateRange) {
        // Si une plage existe déjà, créer une nouvelle plage avec la date cliquée
        const startDate = selectedDateRange.start < normalizedDate ? selectedDateRange.start : normalizedDate;
        const endDate = selectedDateRange.start < normalizedDate ? normalizedDate : selectedDateRange.start;
        setSelectedDateRange({ start: startDate, end: endDate });
        setSelectedSpaceId(spaceId);
        setSelectedReservation(null);
        setModifiedPrice(displayPrice.toString());
      }
    } else {
      // Autre ligne : réinitialiser et commencer une nouvelle sélection
      setSelectedDate(normalizedDate);
      setSelectedDateRange(null);
      setSelectedSpaceId(spaceId);
      setSelectedReservation(null);
      setModifiedPrice(displayPrice.toString());
    }
  };
  
  // Helper pour vérifier si une date est bloquée pour un spaceId donné
  const isDateBlocked = (spaceId: number, dateStr: string): boolean => {
    const blockedDatesForSpace = blockedDates.get(spaceId);
    return blockedDatesForSpace ? blockedDatesForSpace.has(dateStr) : false;
  };
  
  // Helper pour obtenir les dates bloquées pour un spaceId donné
  const getBlockedDatesForSpace = (spaceId: number): Set<string> => {
    return blockedDates.get(spaceId) || new Set();
  };
  
  const [modifiedPrice, setModifiedPrice] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const priceInitializedRef = useRef<{ spaceId: number | null; date: string | null }>({ spaceId: null, date: null });
  const shouldScrollToDateRef = useRef<Date | null>(null);
  
  // Fonction utilitaire pour formater une date en YYYY-MM-DD en local (sans conversion UTC)
  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  // Format court pour mobile (ex: 25 fév. 2025)
  const formatDateShort = (date: Date) =>
    date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  // Cache pour stocker le montant total par ID de réservation
  // Cela garantit que tous les jours d'une même réservation utilisent le même montant total
  const reservationTotalPriceCache = useRef<Map<string | number, number>>(new Map());
  const [mySpaces, setMySpaces] = useState<Space[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<number | 'all'>('all');
  const [searchSpaceQuery, setSearchSpaceQuery] = useState('');

  // Convertir PlaceDTO en format compatible avec l'affichage
  const convertPlaceToSpace = (place: PlaceDTO): Space => {
    const typeMap: Record<string, 'parking' | 'storage' | 'cellar'> = {
      'PARKING': 'parking',
      'STORAGE_SPACE': 'storage',
      'CAVE': 'cellar',
      'BOX': 'storage',
      'WAREHOUSE': 'storage'
    };

    const photos = Array.isArray(place.photos) ? place.photos : [];

    // Convertir occupiedSlots de OccupiedSlotDTO[] vers le format attendu (back toujours en UTC → affichage en timezone utilisateur)
    const convertedOccupiedSlots = (place.occupiedSlots || []).map((slot: any) => {
      // Si le slot a déjà date/startTime au format "legacy", normaliser les dates/heures UTC → local pour l'affichage
      if (slot.date || slot.startTime || slot.startHour !== undefined) {
        let displayDate = slot.date;
        let displayStartTime = slot.startTime;
        let displayEndTime = slot.endTime;
        if (slot.date && typeof slot.date === 'string') {
          displayDate = slot.date.includes('T')
            ? toLocalDateString(fromApiDateTime(slot.date))
            : toLocalDateString(fromApiDateTime(slot.date + 'T00:00:00.000Z'));
        }
        if (slot.startTime && typeof slot.startTime === 'string' && !slot.startTime.includes('T')) {
          displayStartTime = utcTimeToLocalTimeString(displayDate || slot.date, slot.startTime);
        }
        if (slot.endTime && typeof slot.endTime === 'string' && !slot.endTime.includes('T')) {
          displayEndTime = utcTimeToLocalTimeString(displayDate || slot.date, slot.endTime);
        }
        return {
          ...slot,
          date: displayDate,
          startTime: displayStartTime ?? slot.startTime,
          endTime: displayEndTime ?? slot.endTime,
          startHour: slot.startHour ?? (displayStartTime ? parseInt(displayStartTime.split(':')[0], 10) : undefined),
          endHour: slot.endHour ?? (displayEndTime ? parseInt(displayEndTime.split(':')[0], 10) : undefined),
          reservationId: slot.reservationId ?? slot.id,
          clientName: slot.clientName || slot.customerName,
          totalPrice: slot.totalPrice || slot.amount,
          serviceFee: slot.serviceFee,
          hostAmount: slot.hostAmount,
        };
      }
      
      // Sinon, convertir depuis OccupiedSlotDTO (start/end en ISO UTC du back → date et heures en timezone utilisateur pour l'affichage)
      if (slot.start && slot.end) {
        const startDate = fromApiDateTime(slot.start);
        const endDate = fromApiDateTime(slot.end);
        return {
          date: toLocalDateString(startDate),
          startTime: startDate.toTimeString().split(' ')[0].substring(0, 5),
          endTime: endDate.toTimeString().split(' ')[0].substring(0, 5),
          startHour: startDate.getHours(),
          endHour: endDate.getHours(),
          startDateTime: slot.start,
          endDateTime: slot.end,
          // Préserver reservationId et clientId pour les liens
          reservationId: slot.reservationId ?? (typeof slot.id === 'number' ? slot.id : undefined),
          clientId: slot.clientId,
          id: slot.id,
          // Inclure les nouveaux champs du backend
          clientName: slot.clientName || slot.customerName,
          totalPrice: slot.totalPrice || slot.amount,
          serviceFee: slot.serviceFee,
          hostAmount: slot.hostAmount,
        };
      }
      
      return slot;
    });

    return {
      id: place.id,
      title: capitalizeFirstPerLine((place.title && place.title.trim()) || place.description?.split('.')[0] || `${typeMap[place.type] || 'parking'} - ${place.city}`),
      type: typeMap[place.type] || 'parking',
      location: `${place.address}, ${place.city}`,
      city: place.city,
      address: place.address,
      priceDaily: place.pricePerDay || 0,
      priceHourly: place.pricePerHour,
      priceMonthly: place.pricePerMonth || 0,
      image: getValidPhoto(photos, place?.type),
      availableFrom: place.availableFrom,
      availableTo: place.availableTo,
      // Convertir les availabilities en préservant customPricePerDay et customPrice (heures back en UTC → local pour l'affichage)
      availabilities: (place.availabilities || []).map((avail: any) => ({
        date: avail.date,
        available: avail.available,
        customPricePerDay: avail.customPricePerDay,
        customPrice: avail.customPrice || avail.customPricePerDay,
        startTime: avail.startTime && typeof avail.startTime === 'string' && !avail.startTime.includes('T')
          ? utcTimeToLocalTimeString(avail.date, avail.startTime)
          : avail.startTime,
        endTime: avail.endTime && typeof avail.endTime === 'string' && !avail.endTime.includes('T')
          ? utcTimeToLocalTimeString(avail.date, avail.endTime)
          : avail.endTime,
      })),
      occupiedSlots: convertedOccupiedSlots,
      characteristics: place.characteristics || []
    };
  };

  // Fonction pour recharger les places du propriétaire
  const reloadSpaces = async (): Promise<Space[]> => {
    try {
      setIsLoadingSpaces(true);
      setLoadError(null);
      
      // Réinitialiser le cache des montants totaux lors du rechargement
      reservationTotalPriceCache.current.clear();
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setLoadError('Vous devez être connecté pour voir votre calendrier');
        setIsLoadingSpaces(false);
        return [];
      }

      const userIdNum = parseInt(userId, 10);
      console.log('🔵 [CALENDAR] Rechargement du calendrier du propriétaire:', userIdNum);
      
      const places = await placesAPI.getOwnerCalendarOverview(userIdNum);
      console.log('✅ [CALENDAR] Places récupérées:', places);
      
      // Enrichir les occupiedSlots avec reservationId pour le lien "Voir les détails complets"
      const enrichedPlaces: PlaceDTO[] = await Promise.all(
        places.map(async (place): Promise<PlaceDTO> => {
          if (!place.occupiedSlots?.length) return place;
          try {
            const reservations = await reservationsAPI.getPlaceReservations(place.id);
            const enrichedSlots = place.occupiedSlots.map((slot) => {
              const slotAny = slot as { start?: string; end?: string; startDateTime?: string; endDateTime?: string; startDate?: string; endDate?: string; [key: string]: unknown };
              const slotStart = slotAny.start || slotAny.startDateTime || slotAny.startDate;
              const slotEnd = slotAny.end || slotAny.endDateTime || slotAny.endDate;
              if (!slotStart || !slotEnd) return slot;
              const slotStartTs = fromApiDateTime(slotStart).getTime();
              const slotEndTs = fromApiDateTime(slotEnd).getTime();
              const match = reservations.find((r) => {
                const rStartTs = fromApiDateTime(r.startDateTime).getTime();
                const rEndTs = fromApiDateTime(r.endDateTime).getTime();
                // Correspondance exacte ou chevauchement (slot peut être un jour d'une résa multi-jours)
                const exactMatch = Math.abs(slotStartTs - rStartTs) < 60000 && Math.abs(slotEndTs - rEndTs) < 60000;
                const overlaps = slotStartTs < rEndTs && slotEndTs > rStartTs;
                return exactMatch || overlaps;
              });
              if (match) {
                return { ...slot, reservationId: match.id, id: match.id, clientId: match.clientId };
              }
              return slot;
            });
            return { ...place, occupiedSlots: enrichedSlots };
          } catch {
            return place;
          }
        })
      );
      
      // Trier par ID (ordre croissant) avant conversion
      const sortedPlaces = [...enrichedPlaces].sort((a, b) => a.id - b.id);
      const convertedSpaces = sortedPlaces.map(convertPlaceToSpace);
      setMySpaces(convertedSpaces);
      
      return convertedSpaces;
    } catch (error) {
      console.error('❌ [CALENDAR] Erreur lors du rechargement:', error);
      setLoadError('Erreur lors du rechargement du calendrier');
      setMySpaces([]);
      return [];
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  // Charger les places du propriétaire
  useEffect(() => {
    reloadSpaces();
  }, []);

  // Recalculer blockedDates à partir de mySpaces chaque fois que mySpaces change
  useEffect(() => {
    const newBlockedDates = new Map<number, Set<string>>();
    mySpaces.forEach(space => {
      const spaceBlockedDates = new Set<string>();
      if (space.availabilities) {
        space.availabilities.forEach(avail => {
          if (avail.date && avail.available === false) {
            spaceBlockedDates.add(avail.date);
          }
        });
      }
      if (spaceBlockedDates.size > 0) {
        newBlockedDates.set(space.id, spaceBlockedDates);
      }
    });
    setBlockedDates(newBlockedDates);
  }, [mySpaces]);

  // Filtrer les espaces selon les sélections
  const filteredSpaces = mySpaces.filter(space => {
    // Filtre par sélection multiple
    if (selectedSpaces.length > 0 && !selectedSpaces.includes(space.id)) {
      return false;
    }
    // Filtre par sélection unique
    if (selectedSpaceFilter !== 'all' && space.id !== selectedSpaceFilter) {
      return false;
    }
    // Filtre par recherche
    if (searchSpaceQuery && !space.title.toLowerCase().includes(searchSpaceQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  // Jours de la semaine commençant par Jeudi (comme sur l'image)
  const dayNames = ['J', 'V', 'S', 'D', 'L', 'M', 'M'];
  const dayNamesFull = ['Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Lundi', 'Mardi', 'Mercredi'];

  // Générer les heures pour le mode jour
  const getHoursToDisplay = () => {
    const hours: number[] = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Interface pour les colonnes jour+heure
  interface DayHourColumn {
    date: Date;
    hour: number;
    dateStr: string;
    hourStr: string;
  }

  // Colonnes jour+heure mémorisées pour éviter de recalculer 3 fois par render (et bloquer le thread)
  const dayHourColumns = useMemo((): DayHourColumn[] => {
    if (viewMode !== 'day') return [];
    const columns: DayHourColumn[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 31; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      for (let h = 0; h < 24; h++) {
        const dateCopy = new Date(date);
        dateCopy.setHours(h, 0, 0, 0);
        columns.push({
          date: dateCopy,
          hour: h,
          dateStr: formatDateToLocalString(date),
          hourStr: `${h.toString().padStart(2, '0')}h`
        });
      }
    }
    return columns;
  }, [viewMode]);

  // Générer les dates à afficher selon le mode
  const getDatesToDisplay = () => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (viewMode === 'day') {
      // En mode jour : 31 jours (au lieu de 365) pour éviter un blocage de ~10 s et garder le scroll utilisable
      const todayForDay = new Date();
      todayForDay.setHours(0, 0, 0, 0);
      for (let i = 0; i < 31; i++) {
        const date = new Date(todayForDay);
        date.setDate(todayForDay.getDate() + i);
        dates.push(date);
      }
    } else if (viewMode === 'week') {
      // En mode semaine : idem, base fixe sur aujourd'hui pour éviter le décalage au release du scroll
      const todayForWeek = new Date();
      todayForWeek.setHours(0, 0, 0, 0);
      for (let i = 0; i < 365; i++) {
        const date = new Date(todayForWeek);
        date.setDate(todayForWeek.getDate() + i);
        dates.push(date);
      }
    } else if (viewMode === 'month') {
      // Pour le mode mois, afficher toutes les dates de la durée de vie de toutes les annonces
      // Trouver la date de début la plus ancienne et la date de fin la plus récente parmi tous les espaces
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let earliestDate = today;
      let latestDate = new Date(today);
      latestDate.setFullYear(today.getFullYear() + 1); // Par défaut, afficher jusqu'à 1 an
      
      // Parcourir tous les espaces pour trouver les dates min/max
      mySpaces.forEach(space => {
        if (space.availableFrom) {
          const fromDate = new Date(space.availableFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (fromDate < earliestDate) {
            earliestDate = fromDate;
          }
        }
        if (space.availableTo) {
          const toDate = new Date(space.availableTo);
          toDate.setHours(0, 0, 0, 0);
          if (toDate > latestDate) {
            latestDate = toDate;
          }
        }
      });
      
      // S'assurer qu'on commence au moins au 1er jour du mois en cours
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      if (earliestDate > firstDayOfCurrentMonth) {
        earliestDate = firstDayOfCurrentMonth;
      }
      
      // Générer toutes les dates de la période
      const currentDate = new Date(earliestDate);
      while (currentDate <= latestDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return dates;
  };

  const datesToDisplay = getDatesToDisplay();

  // Scroller automatiquement vers la colonne de la date du jour au chargement
  useEffect(() => {
    if (calendarScrollRef.current && datesToDisplay.length > 0 && !isLoadingSpaces) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Trouver l'index de la date du jour dans les dates à afficher
      const todayIndex = datesToDisplay.findIndex(date => {
        const dateCopy = new Date(date);
        dateCopy.setHours(0, 0, 0, 0);
        return dateCopy.getTime() === today.getTime();
      });
      
      const scrollToToday = () => {
        if (!calendarScrollRef.current) return;
        
        if (todayIndex >= 0) {
          // En mode jour : chaque jour = 24 colonnes de 60px → position = jour * 24 * 60
          const columnWidth = viewMode === 'month' ? 40 : viewMode === 'week' ? 100 : viewMode === 'day' ? 60 * 24 : 100;
          const targetColumnIndex = Math.max(0, todayIndex - 2);
          const scrollPosition = targetColumnIndex * columnWidth;
          calendarScrollRef.current.scrollLeft = Math.max(0, scrollPosition);
        } else {
          // Si on ne trouve pas la date du jour, scroller au début (index 0)
          calendarScrollRef.current.scrollLeft = 0;
        }
      };
      
      // Utiliser requestAnimationFrame pour s'assurer que le DOM est prêt, puis setTimeout pour un délai supplémentaire
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToToday();
        }, 300);
      });
    }
  }, [viewMode, datesToDisplay.length, isLoadingSpaces]);

  // Mettre à jour automatiquement currentDate lors du scroll du calendrier
  useEffect(() => {
    const scrollContainer = calendarScrollRef.current;
    if (!scrollContainer || datesToDisplay.length === 0) return;

    let scrollTimeout: NodeJS.Timeout;
    let isUpdating = false; // Flag pour éviter les boucles infinies
    let isUserScrolling = false; // Flag pour indiquer que l'utilisateur est en train de scroller
    
    const handleScroll = () => {
      // Marquer que l'utilisateur est en train de scroller
      isUserScrolling = true;
      
      // Délai pour éviter trop de mises à jour pendant le scroll
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!scrollContainer || datesToDisplay.length === 0 || isUpdating) {
          isUserScrolling = false;
          return;
        }

        const scrollLeft = scrollContainer.scrollLeft;
        // En mode jour : chaque colonne = 1 heure (60px), 24 colonnes par jour → le jour visible = scrollLeft / (60*24)
        const columnWidth = viewMode === 'month' ? 40 : viewMode === 'day' ? 60 : 100;
        const visibleIndex =
          viewMode === 'day'
            ? Math.max(0, Math.min(Math.floor(scrollLeft / (60 * 24)), datesToDisplay.length - 1))
            : Math.max(0, Math.min(Math.floor(scrollLeft / columnWidth), datesToDisplay.length - 1));
        const visibleDate = datesToDisplay[visibleIndex];
        
        if (!visibleDate) {
          isUserScrolling = false;
          return;
        }
        
        // Mettre à jour currentDate seulement si c'est différent pour éviter les boucles infinies
        const newDate = new Date(visibleDate);
        newDate.setHours(0, 0, 0, 0);
        const currentDateCopy = new Date(currentDate);
        currentDateCopy.setHours(0, 0, 0, 0);
        
        // Mettre à jour seulement si la date a changé significativement
        if (viewMode === 'month') {
          // En mode mois, mettre à jour si le mois a changé
          if (newDate.getMonth() !== currentDateCopy.getMonth() || 
              newDate.getFullYear() !== currentDateCopy.getFullYear()) {
            isUpdating = true;
            setCurrentDate(newDate);
            // Réinitialiser le flag après un court délai
            setTimeout(() => { 
              isUpdating = false;
              isUserScrolling = false;
            }, 200);
          } else {
            isUserScrolling = false;
          }
        } else if (viewMode === 'day') {
          // En mode jour, mettre à jour si la date a changé
          if (newDate.getTime() !== currentDateCopy.getTime()) {
            isUpdating = true;
            setCurrentDate(newDate);
            // Réinitialiser le flag après un court délai
            setTimeout(() => { 
              isUpdating = false;
              isUserScrolling = false;
            }, 200);
          } else {
            isUserScrolling = false;
          }
        } else if (viewMode === 'week') {
          // En mode semaine, mettre à jour si la semaine a changé (basé sur le premier jour visible)
          const weekStart = new Date(visibleDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const currentWeekStart = new Date(currentDateCopy);
          currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
          
          if (weekStart.getTime() !== currentWeekStart.getTime()) {
            isUpdating = true;
            setCurrentDate(visibleDate);
            // Réinitialiser le flag après un court délai
            setTimeout(() => { 
              isUpdating = false;
              isUserScrolling = false;
            }, 200);
          } else {
            isUserScrolling = false;
          }
        } else {
          isUserScrolling = false;
        }
      }, 150); // Délai de 150ms après la fin du scroll
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [viewMode, datesToDisplay, currentDate]);

  // Scroller automatiquement vers la date cible quand on navigue manuellement
  useEffect(() => {
    // Ne pas scroller automatiquement si l'utilisateur est en train de scroller
    if (!shouldScrollToDateRef.current || !calendarScrollRef.current || datesToDisplay.length === 0) {
      return;
    }
    
    const targetDate = new Date(shouldScrollToDateRef.current);
    if (viewMode === 'month') {
      targetDate.setDate(1); // Premier jour du mois
    }
    targetDate.setHours(0, 0, 0, 0);
    
    const targetIndex = datesToDisplay.findIndex(date => {
      const dateCopy = new Date(date);
      dateCopy.setHours(0, 0, 0, 0);
      if (viewMode === 'month') {
        // En mode mois, comparer le mois et l'année
        return dateCopy.getMonth() === targetDate.getMonth() && 
               dateCopy.getFullYear() === targetDate.getFullYear();
      } else {
        // En mode jour ou semaine, comparer la date exacte
        return dateCopy.getTime() === targetDate.getTime();
      }
    });
    
    if (targetIndex >= 0 && calendarScrollRef.current) {
      // En mode jour : position = index du jour * (24 heures * 60px)
      const columnWidth = viewMode === 'month' ? 40 : viewMode === 'week' ? 100 : viewMode === 'day' ? 60 * 24 : 100;
      const targetColumnIndex = Math.max(0, targetIndex - 2);
      const scrollPosition = targetColumnIndex * columnWidth;
      calendarScrollRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
    
    // Réinitialiser le flag
    shouldScrollToDateRef.current = null;
  }, [datesToDisplay, viewMode]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      // Ne pas aller dans le passé
      if (newDate < today) {
        newDate.setTime(today.getTime());
      }
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      // Ne pas aller dans le passé
      if (newDate < today) {
        newDate.setTime(today.getTime());
      }
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      // Si on va dans le passé, revenir au mois actuel
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const newMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
      if (newMonth < currentMonth) {
        newDate.setTime(currentMonth.getTime());
      }
    }
    // Marquer qu'on doit scroller vers cette date
    shouldScrollToDateRef.current = new Date(newDate);
    setCurrentDate(newDate);
  };

  // Fonction pour revenir à aujourd'hui et scroller vers la date actuelle
  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
    
    // Scroller vers aujourd'hui après un court délai pour laisser le temps au DOM de se mettre à jour
    setTimeout(() => {
      if (calendarScrollRef.current && datesToDisplay.length > 0) {
        const todayIndex = datesToDisplay.findIndex(date => {
          const dateCopy = new Date(date);
          dateCopy.setHours(0, 0, 0, 0);
          return dateCopy.getTime() === today.getTime();
        });
        
        if (todayIndex >= 0) {
          // En mode jour : position = index du jour * (24 heures * 60px)
          const columnWidth = viewMode === 'month' ? 40 : viewMode === 'week' ? 100 : viewMode === 'day' ? 60 * 24 : 100;
          const targetColumnIndex = Math.max(0, todayIndex - 2);
          const scrollPosition = targetColumnIndex * columnWidth;
          calendarScrollRef.current.scrollLeft = Math.max(0, scrollPosition);
        } else {
          calendarScrollRef.current.scrollLeft = 0;
        }
      }
    }, 100);
  };

  const formatDateHeader = () => {
    if (viewMode === 'day') {
      return `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      // Utiliser currentDate pour déterminer la semaine affichée
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Si même mois, afficher seulement une fois le mois
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.getDate()} - ${weekEnd.getDate()} ${monthNames[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
      } else {
        return `${weekStart.getDate()} ${monthNames[weekStart.getMonth()]} - ${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()]} ${weekStart.getFullYear()}`;
      }
    } else {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'parking') return Car;
    if (type === 'storage') return Box;
    return Warehouse;
  };

  const getTypeLabel = (type: string) => {
    if (type === 'parking') return 'Parking';
    if (type === 'storage') return 'Box de stockage';
    return 'Cave et Divers';
  };

  // Fonction helper pour obtenir le prix d'une date (customPricePerDay si existe, sinon prix par défaut)
  const getPriceForDate = (spaceId: number, date: Date): number => {
    const space = mySpaces.find(s => s.id === spaceId);
    if (!space) {
      return 0;
    }

    // Normaliser la date à minuit en local
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = formatDateToLocalString(normalizedDate);
    
    // Chercher dans les disponibilités pour un prix personnalisé
    const availabilities = space.availabilities || [];
    const matchingAvailability = availabilities.find((avail) => {
      // Comparer directement les chaînes de date (format YYYY-MM-DD)
      return avail.date === dateStr;
    });

    // Si un customPricePerDay ou customPrice existe, l'utiliser, sinon utiliser le prix par défaut
    // Le backend peut renvoyer customPrice ou customPricePerDay selon le contexte
    const customPrice = matchingAvailability?.customPricePerDay !== undefined && matchingAvailability.customPricePerDay !== null
      ? matchingAvailability.customPricePerDay
      : (matchingAvailability?.customPrice !== undefined && matchingAvailability.customPrice !== null
        ? matchingAvailability.customPrice
        : null);

    if (customPrice !== null && customPrice !== undefined) {
      return customPrice;
    }
    
    return space.priceDaily || 0;
  };

  // Récupérer les réservations depuis les données du backend
  // Fonction pour vérifier si une date est disponible pour un bien
  const isDateAvailable = (spaceId: number, dateStr: string): boolean => {
    const space = mySpaces.find(s => s.id === spaceId);
    if (!space) {
      return false;
    }

    // Vérifier les disponibilités explicites
    // dateStr est déjà au format YYYY-MM-DD (local), comparer directement
    const availabilities = space.availabilities || [];
    const matchingAvailability = availabilities.find((avail) => {
      return avail.date === dateStr;
    });

    // La date est disponible si elle est dans les availabilities avec available: true
    return matchingAvailability ? (matchingAvailability.available === true) : false;
  };

  const getReservationsForDate = (spaceId: number, date: Date, spaceTitle: string, hour?: number) => {
    const space = mySpaces.find(s => s.id === spaceId);
    if (!space) {
      return { isReserved: false, price: null, reservation: null };
    }

    // Normaliser la date à minuit en local pour éviter les problèmes de fuseau horaire
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = formatDateToLocalString(normalizedDate);
    
    // Vérifier les créneaux occupés (occupiedSlots)
    const occupiedSlots = space.occupiedSlots || [];
    const matchingSlot = occupiedSlots.find((slot) => {
      // Vérifier si la date correspond exactement (slot.date est toujours en YYYY-MM-DD local après conversion)
      let slotDate: string | null = null;
      if (slot.date) {
        slotDate = /^\d{4}-\d{2}-\d{2}$/.test(String(slot.date))
          ? String(slot.date)
          : formatDateToLocalString(new Date(slot.date));
      }
      
      if (slotDate === dateStr) {
        // Date correspond exactement, continuer la vérification
      } else {
        // Vérifier si la date est dans une plage (startDate/endDate ou startDateTime/endDateTime)
        let startDate: string | null = null;
        let endDate: string | null = null;
        
        if (slot.startDate) {
          const startDateObj = fromApiDateTime(slot.startDate);
          startDateObj.setHours(0, 0, 0, 0);
          startDate = formatDateToLocalString(startDateObj);
        } else if (slot.startDateTime) {
          const startDateObj = fromApiDateTime(slot.startDateTime);
          startDateObj.setHours(0, 0, 0, 0);
          startDate = formatDateToLocalString(startDateObj);
        }
        
        if (slot.endDate) {
          const endDateObj = fromApiDateTime(slot.endDate);
          endDateObj.setHours(0, 0, 0, 0);
          endDate = formatDateToLocalString(endDateObj);
        } else if (slot.endDateTime) {
          const endDateObj = fromApiDateTime(slot.endDateTime);
          endDateObj.setHours(0, 0, 0, 0);
          endDate = formatDateToLocalString(endDateObj);
        }
        
        if (startDate && endDate) {
          // Vérifier si la date est dans la plage
          if (dateStr < startDate || dateStr > endDate) {
            return false;
          }
        } else if (slotDate !== dateStr) {
          // Si pas de plage et date ne correspond pas, passer au suivant
          return false;
        }
      }
      
      // En mode jour, vérifier l'heure
      if (viewMode === 'day' && hour !== undefined) {
        let slotStartHour: number | null = null;
        let slotEndHour: number | null = null;
        
        if (slot.startHour !== undefined) {
          slotStartHour = slot.startHour;
        } else if (slot.startTime) {
          // Back peut envoyer ISO (avec 'T') en UTC ou "HH:mm" en UTC → afficher en local
          if (slot.startTime.includes('T')) {
            slotStartHour = fromApiDateTime(slot.startTime).getHours();
          } else {
            const localTimeStr = utcTimeToLocalTimeString(dateStr, slot.startTime);
            slotStartHour = parseInt(localTimeStr.split(':')[0], 10);
          }
        }
        
        if (slot.endHour !== undefined) {
          slotEndHour = slot.endHour;
        } else if (slot.endTime) {
          if (slot.endTime.includes('T')) {
            slotEndHour = fromApiDateTime(slot.endTime).getHours();
          } else {
            const localTimeStr = utcTimeToLocalTimeString(dateStr, slot.endTime);
            slotEndHour = parseInt(localTimeStr.split(':')[0], 10);
          }
        }
        
        if (slotStartHour !== null && slotEndHour !== null) {
          return hour >= slotStartHour && hour < slotEndHour;
        }
      }
      
      return true;
    });

    if (matchingSlot) {
      // Utiliser l'ID réel de la réservation pour le lien "Voir les détails complets"
      const realReservationId = matchingSlot.reservationId ?? (typeof matchingSlot.id === 'number' ? matchingSlot.id : undefined);
      const reservationId = realReservationId != null
        ? String(realReservationId)
        : `res-${spaceId}-${date.getTime()}-${hour || 0}`;
      
      let startHourValue: number | undefined = undefined;
      let endHourValue: number | undefined = undefined;
      
      // Extraire l'heure de début - back en UTC → afficher en local
      if (matchingSlot.startHour !== undefined) {
        startHourValue = matchingSlot.startHour;
      } else if (matchingSlot.startTime) {
        startHourValue = matchingSlot.startTime.includes('T')
          ? fromApiDateTime(matchingSlot.startTime).getHours()
          : parseInt(utcTimeToLocalTimeString(dateStr, matchingSlot.startTime).split(':')[0], 10);
      } else if (matchingSlot.startDateTime) {
        startHourValue = fromApiDateTime(matchingSlot.startDateTime).getHours();
      }
      
      // Extraire l'heure de fin - back en UTC → afficher en local
      if (matchingSlot.endHour !== undefined) {
        endHourValue = matchingSlot.endHour;
      } else if (matchingSlot.endTime) {
        endHourValue = matchingSlot.endTime.includes('T')
          ? fromApiDateTime(matchingSlot.endTime).getHours()
          : parseInt(utcTimeToLocalTimeString(dateStr, matchingSlot.endTime).split(':')[0], 10);
      } else if (matchingSlot.endDateTime) {
        endHourValue = fromApiDateTime(matchingSlot.endDateTime).getHours();
      }
      
      // IMPORTANT: Utiliser uniquement totalPrice (montant total de la réservation complète)
      // Ne pas utiliser space.priceDaily car c'est le prix par jour, pas le montant total
      // Utiliser le cache pour garantir que tous les jours d'une même réservation utilisent le même montant
      const reservationIdForCache = matchingSlot.id || reservationId;
      let reservationAmount = 0;
      
      // Récupérer le montant total depuis le slot (priorité à totalPrice)
      const slotTotalPrice = matchingSlot.totalPrice || matchingSlot.amount || 0;
      
      // Vérifier si on a déjà le montant total en cache pour cette réservation
      if (reservationTotalPriceCache.current.has(reservationIdForCache)) {
        const cachedAmount = reservationTotalPriceCache.current.get(reservationIdForCache)!;
        // Utiliser le montant le plus élevé (c'est probablement le montant total de la réservation complète)
        reservationAmount = Math.max(cachedAmount, slotTotalPrice);
        // Mettre à jour le cache avec le montant le plus élevé
        if (reservationAmount > cachedAmount) {
          reservationTotalPriceCache.current.set(reservationIdForCache, reservationAmount);
        }
      } else {
        // Première fois qu'on rencontre cette réservation, utiliser le montant du slot
        reservationAmount = slotTotalPrice;
        
        // Si on a trouvé un montant, le mettre en cache pour cette réservation
        if (reservationAmount > 0) {
          reservationTotalPriceCache.current.set(reservationIdForCache, reservationAmount);
        }
      }
      
      const reservation: Reservation = {
        id: reservationId,
        spaceId,
        spaceTitle,
        date,
        customerId: matchingSlot.clientId,
        customerName: getDisplayFirstName(matchingSlot.clientName || matchingSlot.customerName || 'Client', 'Client'),
        customerAvatar: matchingSlot.customerAvatar || matchingSlot.clientAvatar || '/logoR.png',
        customerEmail: matchingSlot.customerEmail || matchingSlot.clientEmail || '',
        customerPhone: matchingSlot.customerPhone || matchingSlot.clientPhone || '',
        amount: reservationAmount, // Montant total de la réservation (pas le prix par jour)
        status: (matchingSlot.status || 'confirmed') as 'confirmed' | 'pending' | 'completed',
        checkIn: matchingSlot.startDateTime || matchingSlot.startDate || dateStr,
        checkOut: matchingSlot.endDateTime || matchingSlot.endDate || dateStr,
        startHour: startHourValue,
        endHour: endHourValue,
        notes: matchingSlot.notes || '',
        // Inclure les nouveaux champs du backend
        totalPrice: matchingSlot.totalPrice || reservationAmount,
        serviceFee: matchingSlot.serviceFee,
        hostAmount: matchingSlot.hostAmount
      };

      return {
        isReserved: true,
        price: reservation.amount,
        reservation
      };
    }

    // Vérifier les disponibilités pour déterminer si la date est disponible
    // Comparer directement les chaînes de date (format YYYY-MM-DD)
    const availabilities = space.availabilities || [];
    const matchingAvailability = availabilities.find((avail) => {
      return avail.date === dateStr;
    });

    // Utiliser customPricePerDay ou customPrice si disponible, sinon prix par défaut
    const customPrice = matchingAvailability?.customPricePerDay !== undefined && matchingAvailability.customPricePerDay !== null
      ? matchingAvailability.customPricePerDay
      : (matchingAvailability?.customPrice !== undefined && matchingAvailability.customPrice !== null
        ? matchingAvailability.customPrice
        : null);
    
    const price = customPrice !== null && customPrice !== undefined
      ? customPrice
      : space.priceDaily || null;

    return { 
      isReserved: false, 
      price: price, 
      reservation: null 
    };
  };

  // Calculer les statistiques du mois
  const getMonthStats = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let reservedDays = 0;
    let availableDays = 0;
    let totalRevenue = 0;
    
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);
        const dateStr = formatDateToLocalString(date);
      
      // Note: Les dates bloquées sont maintenant gérées par espace, donc on ne peut plus faire une vérification globale ici
      // On continue avec le calcul des statistiques pour tous les espaces
      
      let hasReservation = false;
      filteredSpaces.forEach(space => {
        const reservationData = getReservationsForDate(space.id, date, space.title);
        if (reservationData.isReserved && reservationData.reservation) {
          hasReservation = true;
          totalRevenue += reservationData.price || 0;
        }
      });
      
      if (hasReservation) {
        reservedDays++;
      } else {
        availableDays++;
      }
    }
    
    return { reservedDays, availableDays, totalRevenue };
  };

  const monthStats = getMonthStats();

  // Obtenir toutes les réservations pour la vue liste
  const getAllReservations = () => {
    const reservations: Reservation[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      filteredSpaces.forEach(space => {
        const reservationData = getReservationsForDate(space.id, date, space.title);
        if (reservationData.isReserved && reservationData.reservation) {
          reservations.push(reservationData.reservation);
        }
      });
    }
    
    return reservations.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
  };

  // Fermer le date picker au clic dehors (géré par l'overlay du portal sur mobile)

  // Initialiser le prix quand un espace est sélectionné (seulement au premier chargement, pas à chaque changement)
  useEffect(() => {
    if (selectedSpaceId && selectedDate) {
      // Normaliser la date à minuit en local
      const normalizedDate = new Date(selectedDate);
      normalizedDate.setHours(0, 0, 0, 0);
      const dateKey = formatDateToLocalString(normalizedDate);
      // Ne réinitialiser que si c'est une nouvelle sélection (espace ou date différent)
      // ET seulement si le champ est vide (pour ne pas écraser ce que l'utilisateur tape)
      if ((priceInitializedRef.current.spaceId !== selectedSpaceId || priceInitializedRef.current.date !== dateKey) && !modifiedPrice) {
        // Utiliser getPriceForDate pour obtenir le prix personnalisé si existe
        const currentPrice = getPriceForDate(selectedSpaceId, selectedDate);
        setModifiedPrice(currentPrice.toString());
        priceInitializedRef.current = { spaceId: selectedSpaceId, date: dateKey };
      } else if (priceInitializedRef.current.spaceId !== selectedSpaceId || priceInitializedRef.current.date !== dateKey) {
        // Mettre à jour la référence même si on ne change pas le prix (pour éviter les réinitialisations futures)
        priceInitializedRef.current = { spaceId: selectedSpaceId, date: dateKey };
      }
    } else {
      // Réinitialiser la référence si rien n'est sélectionné
      priceInitializedRef.current = { spaceId: null, date: null };
    }
  }, [selectedSpaceId, selectedDate]); // Retirer filteredSpaces des dépendances pour éviter les re-renders

  // Réinitialiser à la date du jour quand on change de mode de vue
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Toujours commencer sur la date du jour quand on change de mode
    setCurrentDate(today);
  }, [viewMode]);

  // Variable pour vérifier si la sidebar doit être affichée
  const showSidebar = selectedReservation || selectedDate || selectedDateRange;

  // Bloquer le scroll du body quand la sidebar est ouverte (mobile)
  useEffect(() => {
    if (showSidebar) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSidebar]);

  // Afficher le chargement ou l'erreur
  if (isLoadingSpaces) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HeaderNavigation />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-8 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
            <p className="text-lg text-slate-700">Chargement de votre calendrier...</p>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HeaderNavigation />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-8 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <AlertCircle className="w-12 h-12 text-emerald-500 mb-4" />
            <p className="text-lg text-slate-700 mb-4">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
            >
              Réessayer
            </button>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  // Si aucun espace n'est trouvé, afficher un message pour créer un espace
  if (!isLoadingSpaces && mySpaces.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HeaderNavigation />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-8 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Aucun espace en ligne
              </h2>
              <p className="text-slate-600 mb-6">
                Pour gérer votre calendrier et vos disponibilités, vous devez d&apos;abord créer un espace en ligne.
              </p>
              <Link
                href="/host/create"
                prefetch={false}
                onClick={(e) => handleCapacitorLinkClick(e, '/host/create', router)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Créer mon espace en ligne
              </Link>
            </div>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  return (
    <Fragment>
      <div className="mon-calendrier-page min-h-screen bg-white">
        <HeaderNavigation />
        
        <div className="mon-calendrier-main pt-[max(0.5rem,calc(env(safe-area-inset-top,0px)+0.5rem))] md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 sm:pb-12 bg-white mobile-page-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className={`max-w-[1920px] mx-auto px-4 sm:px-6 ${showSidebar ? 'lg:pr-[400px]' : ''} transition-all duration-300`}>
          
          {/* Header titre - sticky sur mobile, même typo que les autres vues (réservations, etc.) */}
          <div className="sticky z-20 -mx-4 px-4 sm:mx-0 sm:px-0 md:static mb-2 sm:mb-3 bg-white border-b-2 border-emerald-600 shadow-sm md:shadow-none" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
            <div className="flex items-center justify-between py-1 sm:py-1.5 sm:py-2">
              <div className="flex items-center">
                <h1 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900">Calendriers</h1>
              </div>

            </div>

            {/* Onglets professionnels - Mobile: Compact */}
            <div className="flex items-end border-b border-slate-200 bg-white overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setViewMode('day')}
                style={{ cursor: 'pointer' }}
                className={`relative px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-3.5 font-semibold text-xs sm:text-sm transition-all duration-300 rounded-t-lg sm:rounded-t-xl touch-manipulation active:scale-95 flex-shrink-0 cursor-pointer ${
                  viewMode === 'day'
                    ? 'text-emerald-700 bg-gradient-to-b from-emerald-50 to-white border-t-2 border-x-2 border-emerald-600 border-b-0 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] -mb-px z-10'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50 active:bg-slate-100 border-t-2 border-x-2 border-transparent border-b-0'
                }`}
              >
                <span className="relative z-10 whitespace-nowrap">JOUR</span>
                {viewMode === 'day' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-600 to-transparent opacity-50"></div>
                )}
              </button>
              <button
                onClick={() => setViewMode('week')}
                style={{ cursor: 'pointer' }}
                className={`relative px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-3.5 font-semibold text-xs sm:text-sm transition-all duration-300 rounded-t-lg sm:rounded-t-xl touch-manipulation active:scale-95 flex-shrink-0 cursor-pointer ${
                  viewMode === 'week'
                    ? 'text-emerald-700 bg-gradient-to-b from-emerald-50 to-white border-t-2 border-x-2 border-emerald-600 border-b-0 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] -mb-px z-10'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50 active:bg-slate-100 border-t-2 border-x-2 border-transparent border-b-0'
                }`}
              >
                <span className="relative z-10 whitespace-nowrap">SEMAINE</span>
                {viewMode === 'week' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-600 to-transparent opacity-50"></div>
                )}
              </button>
              <button
                onClick={() => setViewMode('month')}
                style={{ cursor: 'pointer' }}
                className={`relative px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-3.5 font-semibold text-xs sm:text-sm transition-all duration-300 rounded-t-lg sm:rounded-t-xl touch-manipulation active:scale-95 flex-shrink-0 cursor-pointer ${
                  viewMode === 'month'
                    ? 'text-emerald-700 bg-gradient-to-b from-emerald-50 to-white border-t-2 border-x-2 border-emerald-600 border-b-0 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] -mb-px z-10'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50 active:bg-slate-100 border-t-2 border-x-2 border-transparent border-b-0'
                }`}
              >
                <span className="relative z-10 whitespace-nowrap">MENSUEL</span>
                {viewMode === 'month' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-600 to-transparent opacity-50"></div>
                )}
              </button>
            </div>
          </div>

          {/* Barre de navigation et recherche - compacte sur mobile */}
          <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 bg-white rounded-lg border border-slate-200 shadow-sm p-2.5 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
              {/* Navigation des dates */}
              <button
                onClick={() => navigateDate('prev')}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer touch-manipulation"
                title="Période précédente"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              </button>
              
              <div className="relative flex-1 min-w-0" ref={datePickerRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer w-full sm:w-auto touch-manipulation"
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{formatDateHeader()}</span>
                </button>
                {showDatePicker && typeof document !== 'undefined' && createPortal(
                  <div 
                    className="fixed inset-0 z-[10060] flex items-end md:items-center justify-center p-0 md:p-4"
                  >
                    <div 
                      className="absolute inset-0 bg-black/40"
                      onClick={() => setShowDatePicker(false)}
                      aria-hidden="true"
                    />
                    <div 
                      className="relative bg-white rounded-t-2xl md:rounded-xl border border-slate-200 shadow-xl p-4 w-full md:max-w-[280px] animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
                      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Choisir le mois</h3>
                      <input
                        type="month"
                        value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
                        onChange={(e) => {
                          const [year, month] = e.target.value.split('-').map(Number);
                          setCurrentDate(new Date(year, month - 1, 1));
                          setShowDatePicker(false);
                        }}
                        className="w-full px-3 py-3 text-base border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>,
                  document.body
                )}
              </div>
              
              <button
                onClick={() => navigateDate('next')}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer touch-manipulation"
                title="Période suivante"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              </button>
              
              {/* Bouton Aujourd'hui */}
              <button
                onClick={goToToday}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs sm:text-sm touch-manipulation"
                title="Revenir à aujourd'hui"
              >
                Aujourd&apos;hui
              </button>
            </div>

            {/* Recherche - plus compacte sur mobile */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="relative flex-1 sm:flex-initial min-w-0">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchSpaceQuery}
                  onChange={(e) => setSearchSpaceQuery(e.target.value)}
                  className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm w-full sm:min-w-[180px] sm:w-auto"
                />
              </div>
            </div>
          </div>

          {/* Vue Tâches */}
          {viewMode === 'list' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {getAllReservations().length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune réservation trouvée</h3>
                  <p className="text-slate-600 mb-6">Commencez par ajouter des disponibilités pour recevoir des réservations !</p>
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors">
                    <Plus className="w-5 h-5" />
                    Créer disponibilité
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Espace</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Montant</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getAllReservations().map((reservation) => {
                        const TypeIcon = getTypeIcon(filteredSpaces.find(s => s.id === reservation.spaceId)?.type || 'parking');
                        return (
                          <tr key={reservation.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">
                                {reservation.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                              {reservation.startHour !== undefined && (
                                <div className="text-xs text-slate-500">
                                  {reservation.startHour}h - {reservation.endHour}h
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <TypeIcon className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm text-slate-900">{reservation.spaceTitle}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200">
                                  <Image
                                    src={reservation.customerAvatar}
                                    alt={reservation.customerName}
                                    width={32}
                                    height={32}
                                    className="object-cover"
                                  />
                                </div>
                                <span className="text-sm text-slate-900">{reservation.customerName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-emerald-600">{reservation.amount}€</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                reservation.status?.toUpperCase() === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : reservation.status?.toUpperCase() === 'PENDING'
                                  ? 'bg-amber-100 text-amber-700'
                                  : reservation.status?.toUpperCase() === 'UPDATE_REQUESTED'
                                  ? 'bg-blue-100 text-blue-700'
                                  : reservation.status?.toUpperCase() === 'UPDATE_ACCEPTED'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : reservation.status?.toUpperCase() === 'UPDATE_REJECTED'
                                  ? 'bg-red-100 text-red-700'
                                  : reservation.status?.toUpperCase() === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {reservation.status?.toUpperCase() === 'CONFIRMED' && 'Confirmée'}
                                {reservation.status?.toUpperCase() === 'PENDING' && 'En attente'}
                                {reservation.status?.toUpperCase() === 'UPDATE_REQUESTED' && 'Modification demandée'}
                                {reservation.status?.toUpperCase() === 'UPDATE_ACCEPTED' && 'Modification acceptée'}
                                {reservation.status?.toUpperCase() === 'UPDATE_REJECTED' && 'Modification refusée'}
                                {reservation.status?.toUpperCase() === 'COMPLETED' && 'Terminée'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReservationClick(reservation)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Voir détails"
                                >
                                  <Eye className="w-4 h-4 text-slate-600" />
                                </button>
                                <button
                                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Contacter"
                                >
                                  <MessageSquare className="w-4 h-4 text-slate-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* Tableau calendrier avec scroll horizontal */}
              <div className="relative">
                <div 
                  ref={calendarScrollRef}
                  className="overflow-x-auto overflow-y-visible calendar-scroll-container touch-manipulation"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#10b981 #f1f5f9',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                {viewMode === 'day' && !dayViewReady ? (
                  <div className="flex items-center justify-center py-24 px-4 text-slate-500 text-sm">
                    <span className="animate-pulse">Chargement du calendrier jour…</span>
                  </div>
                ) : (
                <table className="border-collapse" style={{ minWidth: viewMode === 'month' ? `${datesToDisplay.length * 44}px` : viewMode === 'week' ? `${datesToDisplay.length * 100}px` : viewMode === 'day' ? `${dayHourColumns.length * 60}px` : '100%' }}>
                {/* En-tête avec dates ou heures */}
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-white border-r-2 border-b-2 border-slate-300 p-2 sm:p-3 w-[80px] sm:w-[100px] max-w-[80px] sm:max-w-[100px] text-left">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">Mes espaces</div>
                    </th>
                    {viewMode === 'day' ? (
                      // En mode jour, afficher les colonnes par heure (24h par jour) sur plusieurs jours
                      dayHourColumns.map((column, idx) => {
                        const isToday = column.date.toDateString() === new Date().toDateString();
                        const isCurrentMonth = column.date.getMonth() === currentDate.getMonth();
                        const isWeekend = column.date.getDay() === 0 || column.date.getDay() === 6;
                        const isNewDay = column.hour === 0; // Première heure du jour
                        const minWidth = '60px';
                        const padding = 'p-1';
                        
                        return (
                          <th
                            key={idx}
                            className={`border-b-2 border-r border-slate-300 ${padding} text-center ${
                              isToday ? 'bg-emerald-50' : isWeekend ? 'bg-slate-50' : 'bg-white'
                            } ${!isCurrentMonth ? 'text-slate-400 bg-slate-100' : ''} ${
                              isNewDay ? 'border-l-2 border-l-emerald-600' : ''
                            }`}
                            style={{ minWidth: minWidth }}
                          >
                            {isNewDay && (
                              <>
                                <div className="text-[9px] font-bold text-slate-600 mb-0.5 leading-tight">
                                  {(() => {
                                    const dayIndex = (column.date.getDay() + 4) % 7;
                                    return dayNames[dayIndex];
                                  })()}
                                </div>
                                <div className={`text-[10px] font-bold leading-tight ${isToday ? 'text-emerald-600' : 'text-slate-900'}`}>
                                  {column.date.getDate()}
                                  {column.date.getDate() === 1 && (
                                    <span className="text-[8px] font-normal text-slate-500 ml-1">
                                      {monthNames[column.date.getMonth()].substring(0, 3)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[8px] text-slate-500 mb-0.5">
                                  {column.date.toLocaleDateString('fr-FR', { month: 'short' })}
                                </div>
                              </>
                            )}
                            <div className={`text-[9px] font-semibold ${isToday && isNewDay ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {column.hourStr}
                            </div>
                          </th>
                        );
                      })
                    ) : (
                      // En mode semaine/mois/trimestre, afficher les dates avec colonnes resserrées pour le mois
                      datesToDisplay.map((date, idx) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        // Colonnes plus resserrées en mode mois pour permettre le scroll horizontal
                        // Largeur fixe pour chaque colonne de date pour un scroll fluide
                        const minWidth = viewMode === 'month' ? '40px' : '100px';
                        const padding = viewMode === 'month' ? 'p-0.5' : 'p-1.5';
                        
                        return (
                          <th
                            key={idx}
                            className={`border-b-2 border-r border-slate-300 ${padding} text-center ${
                              isToday ? 'bg-emerald-50' : isWeekend ? 'bg-slate-50' : 'bg-white'
                            } ${!isCurrentMonth && viewMode === 'month' ? 'text-slate-400 bg-slate-100' : ''}`}
                            style={{ minWidth: minWidth }}
                          >
                            <div className="text-[10px] font-bold text-slate-600 mb-0.5 leading-tight">
                              {(() => {
                                // Ajuster pour que jeudi = 0 dans notre tableau
                                const dayIndex = (date.getDay() + 4) % 7;
                                return dayNames[dayIndex];
                              })()}
                            </div>
                            <div className={`text-xs font-bold leading-tight ${isToday ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {date.getDate()}
                              {date.getDate() === 1 && (
                                <span className="text-[10px] font-normal text-slate-500 ml-1">
                                  {monthNames[date.getMonth()].substring(0, 3)}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredSpaces.length === 0 ? (
                    <tr>
                      <td colSpan={(viewMode === 'day' ? dayHourColumns.length : datesToDisplay.length) + 1} className="p-12 text-center">
                        <Filter className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun espace sélectionné</h3>
                        <p className="text-slate-600">Sélectionnez au moins un espace pour afficher le calendrier</p>
                      </td>
                    </tr>
                  ) : filteredSpaces.map((space) => {
                    const TypeIcon = getTypeIcon(space.type);
                    const typeLabel = getTypeLabel(space.type);
                    
                    return (
                      <tr key={space.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {/* Colonne gauche avec info du bien - Style professionnel */}
                        <td className="sticky left-0 z-10 bg-white border-r-2 border-slate-300 p-2 sm:p-3 w-[80px] sm:w-[100px] max-w-[80px] sm:max-w-[100px]">
                          <CapacitorDynamicLink
                            href={`/host/my-places/${space.id}/`}
                            className="flex items-center gap-1.5 cursor-pointer group"
                          >
                            <div className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border border-slate-200">
                              <Image
                                src={space.image}
                                alt={space.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform"
                              />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="font-bold text-[10px] text-slate-900 truncate group-hover:text-emerald-600 transition-colors leading-tight">
                                {space.title}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate mt-0.5">
                                {space.city}
                              </div>
                            </div>
                          </CapacitorDynamicLink>
                        </td>

                        {/* Colonnes calendrier avec prix */}
                        {viewMode === 'day' ? (
                          // En mode jour, afficher par heure (24 colonnes par jour) sur plusieurs jours
                          dayHourColumns.map((column, colIdx) => {
                            const date = new Date(column.date);
                            date.setHours(0, 0, 0, 0);
                            const reservationData = getReservationsForDate(space.id, date, space.title, column.hour);
                            const displayPrice = getPriceForDate(space.id, date);
                            const isToday = column.date.toDateString() === new Date().toDateString();
                            const isCurrentMonth = column.date.getMonth() === currentDate.getMonth();
                            const isWeekend = column.date.getDay() === 0 || column.date.getDay() === 6;
                            const normalizedDate = new Date(column.date);
                            normalizedDate.setHours(0, 0, 0, 0);
                            const dateStr = formatDateToLocalString(normalizedDate);
                            const isBlocked = isDateBlocked(space.id, dateStr);
                            const isAvailable = isDateAvailable(space.id, dateStr);
                            
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isPast = normalizedDate < today || (normalizedDate.getTime() === today.getTime() && column.hour < new Date().getHours());
                            
                            const hasReservation = reservationData.isReserved && reservationData.reservation;
                            const isClickable = !isPast || hasReservation;
                            
                            let isSelected = false;
                            if (selectedSpaceId === space.id && (selectedDate || selectedDateRange)) {
                              if (selectedDateRange) {
                                const dateTime = column.date.getTime();
                                const startTime = selectedDateRange.start.getTime();
                                const endTime = selectedDateRange.end.getTime();
                                isSelected = dateTime >= startTime && dateTime <= endTime;
                              } else if (selectedDate) {
                                const selectedTime = selectedDate.getTime();
                                const dateTime = column.date.getTime();
                                isSelected = dateTime === selectedTime;
                              }
                            }
                            
                            return (
                              <td
                                key={colIdx}
                                className={`border-r border-gray-100 p-0.5 text-center min-w-[60px] ${
                                  isToday ? 'bg-emerald-50' : isWeekend ? 'bg-slate-50' : ''
                                } ${!isCurrentMonth ? 'text-slate-400 bg-slate-100' : ''} ${
                                  column.hour === 0 ? 'border-l-2 border-l-emerald-600' : ''
                                }`}
                              >
                                {reservationData.isReserved && reservationData.reservation ? (
                                  <button
                                    onClick={() => handleReservationClick(reservationData.reservation!)}
                                    className={`w-full text-center text-[9px] font-medium rounded border-0 cursor-pointer transition-all hover:shadow-md py-1 min-h-[36px] touch-manipulation ${
                                      reservationData.isReserved
                                        ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                                        : ''
                                    }`}
                                    title={`Réservé: ${reservationData.reservation.customerName} - ${reservationData.price}€`}
                                  >
                                    {column.hour === 0 ? reservationData.price + '€' : '•'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (isClickable) {
                                        setSelectedSpaceId(space.id);
                                        setSelectedDate(column.date);
                                      }
                                    }}
                                    disabled={!isClickable}
                                    className={`w-full text-center text-[9px] font-medium rounded border-0 cursor-pointer transition-all hover:shadow-md py-1 min-h-[36px] touch-manipulation ${
                                      isSelected
                                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                                        : isBlocked
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                        : isAvailable
                                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                        : isPast
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-[#222222] hover:bg-gray-50'
                                    }`}
                                    title={isClickable ? `${displayPrice}€ - Cliquez pour modifier` : 'Heure passée'}
                                  >
                                    {column.hour === 0 ? displayPrice + '€' : ''}
                                  </button>
                                )}
                              </td>
                            );
                          })
                        ) : (
                          // En mode semaine/mois/trimestre, afficher par date avec design optimisé
                          datesToDisplay.map((date, dateIdx) => {
                            const reservationData = getReservationsForDate(space.id, date, space.title);
                            const displayPrice = getPriceForDate(space.id, date); // Prix à afficher (customPricePerDay si existe, sinon prix par défaut)
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            // Normaliser la date à minuit en local pour éviter les problèmes de fuseau horaire
                            const normalizedDate = new Date(date);
                            normalizedDate.setHours(0, 0, 0, 0);
                            const dateStr = formatDateToLocalString(normalizedDate);
                            const isBlocked = isDateBlocked(space.id, dateStr);
                            const isAvailable = isDateAvailable(space.id, dateStr);
                            
                            // Vérifier si la date est passée (avant aujourd'hui)
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isPast = normalizedDate < today;
                            
                            // Vérifier si on peut cliquer sur cette date :
                            // - Les dates passées sans réservation ne sont pas cliquables (même si bloquées)
                            // - Les dates passées avec réservation sont cliquables (pour voir/modifier)
                            // - Le jour J et les jours suivants sont cliquables (même sans réservation)
                            const hasReservation = reservationData.isReserved && reservationData.reservation;
                            const isClickable = !isPast || hasReservation;
                            
                            // Vérifier si cette case est sélectionnée (même date ET même spaceId) et si le panneau est ouvert
                            let isSelected = false;
                            if (selectedSpaceId === space.id && (selectedDate || selectedDateRange)) {
                              if (selectedDateRange) {
                                // Vérifier si la date est dans la plage sélectionnée
                                const dateTime = date.getTime();
                                const startTime = selectedDateRange.start.getTime();
                                const endTime = selectedDateRange.end.getTime();
                                isSelected = dateTime >= startTime && dateTime <= endTime;
                              } else if (selectedDate) {
                                // Vérifier si c'est exactement la date sélectionnée
                                isSelected = selectedDate.toDateString() === date.toDateString();
                              }
                            }
                            
                            // Style compact pour le mode mois
                            const isCompactMode = viewMode === 'month';
                            const cellPadding = isCompactMode ? 'p-0.5' : 'p-1.5';
                            const cellMinWidth = isCompactMode ? '44px' : '100px';
                            
                            return (
                              <td
                                key={dateIdx}
                                className={`border-r border-slate-200 ${cellPadding} text-center ${
                                  isSelected 
                                    ? selectedDateRange
                                      ? 'bg-blue-100 border-blue-300'
                                      : 'bg-blue-100' 
                                    : isAvailable && isToday
                                    ? 'bg-emerald-50' 
                                    : isAvailable && !isToday
                                    ? 'bg-white'
                                    : isToday
                                    ? 'bg-blue-50'
                                    : isWeekend 
                                    ? 'bg-slate-50' 
                                    : 'bg-slate-100'
                                } ${!isCurrentMonth && isCompactMode ? 'bg-slate-100' : ''}`}
                                style={{ minWidth: cellMinWidth }}
                              >
                                {reservationData.isReserved && reservationData.reservation ? (
                                  <button
                                    onClick={() => handleReservationClick(reservationData.reservation!)}
                                    className={`w-full text-center font-bold rounded border-0 cursor-pointer transition-all hover:shadow-md bg-orange-500 text-white hover:bg-orange-600 flex flex-col items-center justify-center gap-0.5 touch-manipulation ${
                                      isCompactMode ? 'text-[9px] py-1 px-0.5 min-h-[44px]' : 'text-xs py-2 px-1 min-h-[48px]'
                                    }`}
                                    title={`Réservé par ${reservationData.reservation.customerName} - ${reservationData.price}€ - Cliquez pour voir les détails`}
                                    disabled={false}
                                  >
                                    {!isCompactMode && (
                                      <div className="text-[10px] font-bold leading-tight">{reservationData.price}€</div>
                                    )}
                                    <div className={`font-semibold leading-tight truncate w-full px-0.5 ${
                                      isCompactMode ? 'text-[8px]' : 'text-[10px]'
                                    }`}>
                                      {isCompactMode 
                                        ? reservationData.reservation.customerName.split(' ').map(n => n[0]).join('').substring(0, 3)
                                        : reservationData.reservation.customerName.split(' ')[0]
                                      }
                                    </div>
                                    {isCompactMode && (
                                      <div className="text-[8px] font-bold opacity-90">{reservationData.price}€</div>
                                    )}
                                  </button>
                                ) : isBlocked ? (
                                  <button
                                    onClick={() => {
                                      if (!isClickable) return;
                                      handleDateSelection(space.id, date, displayPrice);
                                    }}
                                    disabled={!isClickable}
                                    className={`w-full text-center font-medium rounded border-0 transition-all flex flex-col items-center justify-center gap-0.5 ${
                                      !isClickable
                                        ? 'cursor-not-allowed opacity-50 bg-slate-200 text-slate-400'
                                        : isSelected 
                                        ? selectedDateRange
                                          ? 'bg-blue-500 text-white hover:bg-blue-600 border-2 border-blue-700 shadow-lg cursor-pointer hover:shadow-sm'
                                          : 'bg-blue-500 text-white hover:bg-blue-600 border-2 border-blue-700 shadow-lg cursor-pointer hover:shadow-sm' 
                                        : 'bg-slate-300 text-slate-700 hover:bg-slate-400 cursor-pointer hover:shadow-sm'
                                    } ${isCompactMode ? 'text-[9px] py-1 px-0.5 min-h-[44px] touch-manipulation' : 'text-xs py-1.5 px-1 min-h-[48px]'}`}
                                    title={!isClickable 
                                      ? 'Date passée sans réservation - Non modifiable' 
                                      : `Bloqué - ${displayPrice}€/jour - Cliquez pour modifier`}
                                  >
                                    {isCompactMode ? (
                                      <>
                                        <X className="w-3 h-3 mb-0.5" />
                                        <div className="text-[8px] font-bold leading-tight">{displayPrice}€</div>
                                      </>
                                    ) : (
                                      <>
                                        <X className="w-4 h-4 mb-1" />
                                        <div className="text-xs font-bold">{displayPrice}€</div>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (!isClickable) return;
                                      handleDateSelection(space.id, date, displayPrice);
                                    }}
                                    disabled={!isClickable}
                                    className={`w-full text-center font-semibold rounded border-0 transition-all ${
                                      !isClickable
                                        ? 'cursor-not-allowed opacity-50 bg-slate-100 text-slate-400'
                                        : isSelected
                                        ? selectedDateRange
                                          ? 'bg-blue-500 text-white hover:bg-blue-600 border-2 border-blue-700 shadow-lg cursor-pointer hover:shadow-sm'
                                          : 'bg-blue-500 text-white hover:bg-blue-600 border-2 border-blue-700 shadow-lg cursor-pointer hover:shadow-sm'
                                        : isAvailable
                                        ? isToday
                                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300 cursor-pointer hover:shadow-sm'
                                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer hover:shadow-sm'
                                        : isToday
                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer hover:shadow-sm'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer hover:shadow-sm'
                                    } ${isCompactMode ? 'text-[9px] py-1 px-0.5 min-h-[44px] touch-manipulation' : 'text-xs py-2 px-1 min-h-[48px]'}`}
                                    title={!isClickable 
                                      ? 'Date passée sans réservation - Non modifiable' 
                                      : isAvailable 
                                        ? `Disponible - ${displayPrice}€ - Cliquez pour modifier le prix ou bloquer` 
                                        : `Non disponible - ${displayPrice}€/jour - Cliquez pour ajouter une disponibilité`}
                                  >
                                    {isCompactMode ? (
                                      <div className={`text-[8px] font-bold leading-tight ${isSelected ? 'text-white' : isAvailable ? 'text-emerald-700' : 'text-slate-500'}`}>
                                        {displayPrice}€
                                      </div>
                                    ) : (
                                      <div className={`text-xs font-bold ${isSelected ? 'text-white' : isAvailable ? 'text-emerald-700' : 'text-slate-500'}`}>
                                        {displayPrice}€
                                      </div>
                                    )}
                                  </button>
                                )}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                </table>
                )}
              </div>
            </div>
          </div>
        )}

          {/* Légende - En dessous des espaces - Mobile: Compact */}
          <div className="mt-4 sm:mt-5 md:mt-6 bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-sm p-3 sm:p-3.5 md:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-2.5 md:mb-3">
              <AlertCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-slate-600 flex-shrink-0" />
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Légende</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 bg-emerald-100 border-2 border-emerald-500 rounded flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                </div>
                <span className="text-slate-700 font-medium">Disponible</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 bg-orange-100 border-2 border-orange-500 rounded flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-600" />
                </div>
                <span className="text-orange-700 font-medium">Réservé</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 bg-slate-200 border-2 border-slate-400 rounded flex items-center justify-center flex-shrink-0">
                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-600" />
                </div>
                <span className="text-slate-700 font-medium hidden sm:inline">Bloqué</span>
                <span className="text-slate-700 font-medium sm:hidden">Bloqué</span>
              </div>
            </div>
          </div>
        </div>
        </div>

        {showSidebar && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[10050] flex" style={{ isolation: 'isolate' }} role="dialog" aria-modal="true" aria-label="Panneau de modification">
            {/* Overlay mobile: ferme au clic */}
            <div
              className="fixed inset-0 bg-black/40 md:bg-transparent md:pointer-events-none"
              onClick={() => {
                setSelectedReservation(null);
                setSelectedDate(null);
                setSelectedDateRange(null);
                setSelectedSpaceId(null);
                setModifiedPrice('');
                setSaveError(null);
              }}
              aria-hidden="true"
            />
            {/* Panneau latéral */}
            <div 
              className="fixed right-0 top-0 h-full w-full sm:w-[90%] md:w-[400px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto overscroll-contain"
              style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="p-3 sm:p-5 md:p-6">
              {/* Header - Mobile: Compact */}
              <div className="flex items-center justify-between mb-3 sm:mb-5 md:mb-6">
                <h2 className="text-sm sm:text-lg md:text-xl font-bold text-slate-900">
                  {selectedReservation ? 'Détails de la réservation' : 'Modifier la disponibilité'}
                </h2>
                <button
                  onClick={() => {
                    setSelectedReservation(null);
                    setSelectedDate(null);
                    setSelectedDateRange(null);
                    setSelectedSpaceId(null);
                    setModifiedPrice('');
                    setSaveError(null);
                  }}
                  className="p-2 sm:p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center"
                >
                  <X className="w-5 h-5 sm:w-5 sm:h-5 text-slate-600" />
                </button>
              </div>

              {(selectedDate || selectedDateRange) && !selectedReservation && (
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  {/* Bloc date compact sur mobile */}
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <div className="text-xs sm:text-sm text-slate-600 mb-1.5 sm:mb-2">
                    {selectedDateRange ? 'Plage sélectionnée' : 'Date sélectionnée'}
                  </div>
                  {selectedDateRange ? (
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex flex-col sm:block gap-0.5">
                        <div className="text-[10px] sm:text-xs text-slate-500">Du</div>
                        <div className="font-semibold text-sm sm:text-base text-slate-900">
                          {formatDateShort(selectedDateRange.start)}
                        </div>
                      </div>
                      <div className="flex flex-col sm:block gap-0.5">
                        <div className="text-[10px] sm:text-xs text-slate-500">Au</div>
                        <div className="font-semibold text-sm sm:text-base text-slate-900">
                          {formatDateShort(selectedDateRange.end)}
                        </div>
                      </div>
                      <div className="text-xs text-emerald-600 font-medium pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-slate-200">
                        {Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} jour{Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1 > 1 ? 's' : ''} sélectionné{Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1 > 1 ? 's' : ''}
                      </div>
                    </div>
                  ) : selectedDate ? (
                    <div className="font-semibold text-sm sm:text-base text-slate-900">
                      {formatDateShort(selectedDate)}
                    </div>
                  ) : null}
                  {selectedSpaceId && (
                    <div className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2">
                      Espace ID: {selectedSpaceId}
                    </div>
                  )}
                  </div>

                  {/* Sélecteur de dates compact */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Modifier les dates</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3">
                      <div className="min-w-0">
                        <label className="block text-[10px] sm:text-xs text-slate-600 mb-0.5 sm:mb-1">Début</label>
                        <input
                          type="date"
                          value={selectedDateRange ? formatDateToLocalString(selectedDateRange.start) : selectedDate ? formatDateToLocalString(selectedDate) : ''}
                          onChange={(e) => {
                            const startDate = new Date(e.target.value + 'T00:00:00');
                            startDate.setHours(0, 0, 0, 0);
                            if (selectedDateRange) {
                              setSelectedDateRange({ start: startDate, end: selectedDateRange.end });
                            } else if (selectedDate) {
                              setSelectedDateRange({ start: startDate, end: selectedDate });
                              setSelectedDate(null);
                            } else {
                              setSelectedDate(startDate);
                            }
                          }}
                          className="w-full min-w-0 px-2.5 py-1.5 sm:px-3 sm:py-2 min-h-[44px] md:min-h-0 text-sm border border-slate-200 sm:border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[10px] sm:text-xs text-slate-600 mb-0.5 sm:mb-1">Fin</label>
                        <input
                          type="date"
                          value={selectedDateRange ? formatDateToLocalString(selectedDateRange.end) : selectedDate ? formatDateToLocalString(selectedDate) : ''}
                          onChange={(e) => {
                            const endDate = new Date(e.target.value + 'T00:00:00');
                            endDate.setHours(0, 0, 0, 0);
                            if (selectedDateRange) {
                              setSelectedDateRange({ start: selectedDateRange.start, end: endDate });
                            } else if (selectedDate) {
                              setSelectedDateRange({ start: selectedDate, end: endDate });
                              setSelectedDate(null);
                            } else {
                              setSelectedDate(endDate);
                            }
                          }}
                          min={selectedDateRange ? formatDateToLocalString(selectedDateRange.start) : selectedDate ? formatDateToLocalString(selectedDate) : undefined}
                          className="w-full min-w-0 px-2.5 py-1.5 sm:px-3 sm:py-2 min-h-[44px] md:min-h-0 text-sm border border-slate-200 sm:border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedDateRange) {
                          setSelectedDate(selectedDateRange.start);
                          setSelectedDateRange(null);
                        } else if (selectedDate) {
                          setSelectedDateRange({ start: selectedDate, end: selectedDate });
                          setSelectedDate(null);
                        }
                      }}
                      className="mt-1.5 sm:mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium min-h-[44px] md:min-h-0 px-2 py-1.5 touch-manipulation"
                    >
                      {selectedDateRange ? 'Une seule date' : 'Plage de dates'}
                    </button>
                  </div>

                  <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Statut</label>
                  <div className="grid grid-cols-2 gap-2 sm:space-y-0 sm:gap-2">
                  <button
                    onClick={() => {
                      if (!selectedSpaceId) return;
                      if (selectedDateRange) {
                        const newBlockedDates = new Map(blockedDates);
                        const spaceBlockedDates = new Set(getBlockedDatesForSpace(selectedSpaceId));
                        const start = new Date(selectedDateRange.start);
                        start.setHours(0, 0, 0, 0);
                        const end = new Date(selectedDateRange.end);
                        end.setHours(0, 0, 0, 0);
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                          const normalizedDate = new Date(d);
                          normalizedDate.setHours(0, 0, 0, 0);
                          const dateStr = formatDateToLocalString(normalizedDate);
                          spaceBlockedDates.delete(dateStr);
                        }
                        newBlockedDates.set(selectedSpaceId, spaceBlockedDates);
                        setBlockedDates(newBlockedDates);
                      } else if (selectedDate) {
                        const normalizedDate = new Date(selectedDate);
                        normalizedDate.setHours(0, 0, 0, 0);
                        const dateStr = formatDateToLocalString(normalizedDate);
                        const newBlockedDates = new Map(blockedDates);
                        const spaceBlockedDates = new Set(getBlockedDatesForSpace(selectedSpaceId));
                        spaceBlockedDates.delete(dateStr);
                        newBlockedDates.set(selectedSpaceId, spaceBlockedDates);
                        setBlockedDates(newBlockedDates);
                      }
                    }}
                    className={`w-full px-2.5 py-2 sm:px-4 sm:py-3 min-h-[48px] md:min-h-0 rounded-lg border-2 transition-all text-left cursor-pointer touch-manipulation ${
                      selectedSpaceId && (selectedDateRange || selectedDate) && (
                        selectedDateRange 
                          ? Array.from({ length: Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1 })
                              .some((_, i) => {
                                const d = new Date(selectedDateRange.start);
                                d.setDate(d.getDate() + i);
                                d.setHours(0, 0, 0, 0);
                                return !isDateBlocked(selectedSpaceId, formatDateToLocalString(d));
                              })
                          : (() => {
                              const normalizedDate = new Date(selectedDate!);
                              normalizedDate.setHours(0, 0, 0, 0);
                              return !isDateBlocked(selectedSpaceId, formatDateToLocalString(normalizedDate));
                            })()
                      )
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm sm:text-base">Disponible</div>
                        <div className="text-[10px] sm:text-xs opacity-75 hidden sm:block">L&apos;espace peut être réservé</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedSpaceId) return;
                      if (selectedDateRange) {
                        const newBlockedDates = new Map(blockedDates);
                        const spaceBlockedDates = new Set(getBlockedDatesForSpace(selectedSpaceId));
                        const start = new Date(selectedDateRange.start);
                        start.setHours(0, 0, 0, 0);
                        const end = new Date(selectedDateRange.end);
                        end.setHours(0, 0, 0, 0);
                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                          const normalizedDate = new Date(d);
                          normalizedDate.setHours(0, 0, 0, 0);
                          const dateStr = formatDateToLocalString(normalizedDate);
                          spaceBlockedDates.add(dateStr);
                        }
                        newBlockedDates.set(selectedSpaceId, spaceBlockedDates);
                        setBlockedDates(newBlockedDates);
                      } else if (selectedDate) {
                        const normalizedDate = new Date(selectedDate);
                        normalizedDate.setHours(0, 0, 0, 0);
                        const dateStr = formatDateToLocalString(normalizedDate);
                        const newBlockedDates = new Map(blockedDates);
                        const spaceBlockedDates = new Set(getBlockedDatesForSpace(selectedSpaceId));
                        spaceBlockedDates.add(dateStr);
                        newBlockedDates.set(selectedSpaceId, spaceBlockedDates);
                        setBlockedDates(newBlockedDates);
                      }
                    }}
                    className={`w-full px-2.5 py-2 sm:px-4 sm:py-3 min-h-[48px] md:min-h-0 rounded-lg border-2 transition-all text-left cursor-pointer touch-manipulation ${
                      selectedSpaceId && (selectedDateRange || selectedDate) && (
                        selectedDateRange 
                          ? Array.from({ length: Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1 })
                              .every((_, i) => {
                                const d = new Date(selectedDateRange.start);
                                d.setDate(d.getDate() + i);
                                d.setHours(0, 0, 0, 0);
                                return isDateBlocked(selectedSpaceId, formatDateToLocalString(d));
                              })
                          : (() => {
                              const normalizedDate = new Date(selectedDate!);
                              normalizedDate.setHours(0, 0, 0, 0);
                              return isDateBlocked(selectedSpaceId, formatDateToLocalString(normalizedDate));
                            })()
                      )
                        ? 'bg-slate-100 border-slate-400 text-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <X className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm sm:text-base">Bloquer</div>
                        <div className="text-[10px] sm:text-xs opacity-75 hidden sm:block">Indisponible</div>
                      </div>
                    </div>
                  </button>
                  </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Prix/jour (€)</label>
                  <input
                    type="number"
                    value={modifiedPrice}
                    onChange={(e) => {
                      // Mise à jour synchrone immédiate pour éviter les délais
                      setModifiedPrice(e.target.value);
                    }}
                    onFocus={(e) => {
                      // Si le champ est vide au focus, pré-remplir avec le prix actuel
                      if (!modifiedPrice && selectedSpaceId && selectedDate) {
                        const currentPrice = getPriceForDate(selectedSpaceId, selectedDate);
                        setModifiedPrice(currentPrice.toString());
                        // Sélectionner le texte pour permettre de taper directement
                        requestAnimationFrame(() => {
                          e.target.select();
                        });
                      }
                    }}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] md:min-h-0 text-sm border border-slate-200 sm:border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Prix par jour"
                    min="0"
                    step="0.01"
                    autoComplete="off"
                  />
                  {selectedSpaceId && selectedDate && (
                    <p className="text-xs text-slate-500 mt-1">
                      Prix actuel: {getPriceForDate(selectedSpaceId, selectedDate)}€/jour
                    </p>
                  )}
                  </div>

                  {saveError && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-700">{saveError}</p>
                    </div>
                  )}

                  <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setSelectedDate(null);
                      setSelectedDateRange(null);
                      setSelectedSpaceId(null);
                      setModifiedPrice('');
                      setSaveError(null);
                    }}
                    disabled={isSaving}
                    className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 min-h-[44px] md:min-h-0 border border-slate-200 sm:border-2 text-slate-700 text-sm sm:text-base rounded-lg font-semibold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      if ((!selectedDate && !selectedDateRange) || !selectedSpaceId) return;
                      
                      setIsSaving(true);
                      setSaveError(null);
                      
                      try {
                        // Générer la liste des dates à traiter
                        const datesToProcess: Date[] = [];
                        if (selectedDateRange) {
                          const start = new Date(selectedDateRange.start);
                          start.setHours(0, 0, 0, 0);
                          const end = new Date(selectedDateRange.end);
                          end.setHours(0, 0, 0, 0);
                          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            const normalizedDate = new Date(d);
                            normalizedDate.setHours(0, 0, 0, 0);
                            datesToProcess.push(normalizedDate);
                          }
                        } else if (selectedDate) {
                          const normalizedDate = new Date(selectedDate);
                          normalizedDate.setHours(0, 0, 0, 0);
                          datesToProcess.push(normalizedDate);
                        }
                        
                        // Vérifier si un prix est spécifié et le valider
                        let customPrice: number | undefined = undefined;
                        if (modifiedPrice && modifiedPrice.trim() !== '') {
                          const newPrice = parseFloat(modifiedPrice);
                          if (isNaN(newPrice) || newPrice <= 0) {
                            setSaveError('Veuillez entrer un prix valide (supérieur à 0)');
                            setIsSaving(false);
                            return;
                          }
                          customPrice = newPrice;
                        }
                        
                        // Vérifier que le prix est valide si on débloque les dates
                        const hasUnblockedDates = selectedSpaceId && datesToProcess.some(date => {
                          const dateStr = formatDateToLocalString(date);
                          return !isDateBlocked(selectedSpaceId, dateStr);
                        });
                        
                        // Si on débloque des dates, un prix est obligatoire
                        if (hasUnblockedDates && !customPrice) {
                          setSaveError('Veuillez entrer un prix valide (supérieur à 0) pour débloquer les dates');
                          setIsSaving(false);
                          return;
                        }
                        
                        // Si un prix est spécifié, on doit toujours le mettre à jour, même pour les dates déjà disponibles
                        if (!customPrice) {
                          setSaveError('Veuillez entrer un prix valide (supérieur à 0)');
                          setIsSaving(false);
                          return;
                        }
                        
                        // Récupérer les disponibilités existantes pour préserver startTime/endTime si nécessaire
                        const currentSpace = filteredSpaces.find(s => s.id === selectedSpaceId);
                        const existingAvailabilities = currentSpace?.availabilities || [];
                        
                        // Créer un Map des disponibilités existantes pour un accès rapide
                        const existingAvailabilitiesMap = new Map<string, PlaceAvailabilityDTO>();
                        existingAvailabilities.forEach((avail) => {
                          if (avail.date && typeof avail.date === 'string') {
                            existingAvailabilitiesMap.set(avail.date, {
                              date: avail.date,
                              available: avail.available ?? true,
                              customPricePerDay: avail.customPrice,
                              startTime: avail.startTime,
                              endTime: avail.endTime,
                            });
                          }
                        });
                        
                        // Préparer UNIQUEMENT les dates modifiées pour l'API (mise à jour partielle)
                        const updatedAvailabilities: PlaceAvailabilityDTO[] = datesToProcess.map(date => {
                          // Normaliser la date à minuit en local pour éviter les problèmes de fuseau horaire
                          const normalizedDate = new Date(date);
                          normalizedDate.setHours(0, 0, 0, 0);
                          const dateStr = formatDateToLocalString(normalizedDate);
                          const isBlocked = selectedSpaceId ? isDateBlocked(selectedSpaceId, dateStr) : false;
                          
                          // Récupérer la disponibilité existante si elle existe
                          const existingAvailability = existingAvailabilitiesMap.get(dateStr);
                          
                          // Créer la disponibilité modifiée avec seulement les champs nécessaires
                          const availabilityData: PlaceAvailabilityDTO = {
                            date: dateStr,
                            available: !isBlocked,
                            // Préserver startTime/endTime si ils existent déjà
                            ...(existingAvailability?.startTime && { startTime: existingAvailability.startTime }),
                            ...(existingAvailability?.endTime && { endTime: existingAvailability.endTime }),
                          };
                          
                          // Ajouter le prix personnalisé si spécifié
                          if (customPrice !== undefined) {
                            availabilityData.customPricePerDay = customPrice;
                          } else if (existingAvailability?.customPricePerDay !== undefined) {
                            // Si on ne modifie pas le prix explicitement, préserver le prix existant
                            availabilityData.customPricePerDay = existingAvailability.customPricePerDay;
                          }
                          
                          return availabilityData;
                        });
                        
                        console.log('🔵 [CALENDAR] Mise à jour PARTIELLE - Envoi uniquement des dates modifiées:', {
                          placeId: selectedSpaceId,
                          datesCount: updatedAvailabilities.length,
                          dates: updatedAvailabilities.map(a => a.date),
                          customPrice: customPrice,
                          payload: updatedAvailabilities.map(a => ({ 
                            date: a.date, 
                            available: a.available,
                            customPricePerDay: a.customPricePerDay,
                            startTime: a.startTime,
                            endTime: a.endTime
                          }))
                        });
                        
                        // Appeler l'endpoint POST /api/places/{id}/calendar (synchrone) avec les dates modifiées.
                        // On attend la réponse 200 OK avant de recharger, donc les créneaux grisés sont à jour.
                        await placesAPI.updateCalendar(selectedSpaceId, updatedAvailabilities);
                        
                        console.log('✅ [CALENDAR] Disponibilités mises à jour avec succès');
                        
                        // Recharger les données du calendrier (backend a déjà persisté, 200 OK reçu)
                        const reloadedSpaces = await reloadSpaces();
                        
                        // Recalculer blockedDates à partir des nouvelles données rechargées
                        // Une date est bloquée si elle a available: false dans les availabilities
                        const newBlockedDates = new Map<number, Set<string>>();
                        reloadedSpaces.forEach(space => {
                          const spaceBlockedDates = new Set<string>();
                          if (space.availabilities) {
                            space.availabilities.forEach(avail => {
                              if (avail.date && avail.available === false) {
                                spaceBlockedDates.add(avail.date);
                              }
                            });
                          }
                          if (spaceBlockedDates.size > 0) {
                            newBlockedDates.set(space.id, spaceBlockedDates);
                          }
                        });
                        setBlockedDates(newBlockedDates);
                        
                        // Fermer le formulaire
                        setSelectedDate(null);
                        setSelectedDateRange(null);
                        setSelectedSpaceId(null);
                        setModifiedPrice('');
                        setSaveError(null);
                      } catch (error: unknown) {
                        console.error('❌ [CALENDAR] Erreur lors de la sauvegarde:', error);
                        const errorObj = error as { message?: string; response?: { data?: { message?: string } } };
                        setSaveError(
                          errorObj?.response?.data?.message || 
                          errorObj?.message || 
                          'Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.'
                        );
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 min-h-[40px] sm:min-h-[44px] md:min-h-0 bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        <span className="text-sm sm:text-base">Enregistrement...</span>
                      </>
                    ) : (
                      `Enregistrer${selectedDateRange ? ` (${Math.ceil((selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1} dates)` : ''}`
                    )}
                  </button>
                  </div>
                </div>
              )}
              {selectedReservation && (
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  {/* Espace réservé - Mobile: Compact - dates et heures sur une ligne */}
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-lg">
                    <div className="text-xs sm:text-sm text-slate-600 mb-1.5 sm:mb-2">Espace</div>
                    <div className="font-semibold text-sm sm:text-base text-slate-900 truncate">{selectedReservation.spaceTitle}</div>
                    {selectedReservation.checkIn && selectedReservation.checkOut ? (
                      <div className="text-xs sm:text-sm text-slate-500 mt-1">
                        {(() => {
                          const startHour = selectedReservation.startHour ?? (selectedReservation.checkIn ? new Date(selectedReservation.checkIn).getHours() : undefined);
                          const endHour = selectedReservation.endHour ?? (selectedReservation.checkOut ? new Date(selectedReservation.checkOut).getHours() : undefined);
                          const startStr = new Date(selectedReservation.checkIn).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                          const endStr = new Date(selectedReservation.checkOut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                          const startHourStr = startHour !== undefined ? ` ${startHour.toString().padStart(2, '0')}h` : '';
                          const endHourStr = endHour !== undefined ? ` ${endHour.toString().padStart(2, '0')}h` : '';
                          return `Du ${startStr}${startHourStr} au ${endStr}${endHourStr}`;
                        })()}
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm text-slate-500 mt-1">
                        {new Date(selectedReservation.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    )}
                  </div>

                  {/* Profil client - Mobile: Compact */}
                  <div>
                  <div className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3">Client</div>
                  <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 rounded-lg">
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={selectedReservation.customerAvatar}
                        alt={selectedReservation.customerName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base text-slate-900 mb-0.5 sm:mb-1 truncate">
                        {selectedReservation.customerName}
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* Montant total - Mobile: Compact */}
                  <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                      <Euro className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base font-medium">Montant total</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                      {selectedReservation.amount}€
                    </div>
                  </div>
                  <div className="pt-3 border-t border-emerald-200">
                    <div className="text-xs sm:text-sm text-emerald-700">
                      Montant total payé pour cette réservation
                    </div>
                  </div>
                  </div>

                  {/* Statut - Mobile: Compact */}
                  <div className="mb-4 sm:mb-5 md:mb-6">
                  <div className="text-xs sm:text-sm text-slate-600 mb-2">Statut</div>
                  <div className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${
                    selectedReservation.status?.toUpperCase() === 'CONFIRMED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : selectedReservation.status?.toUpperCase() === 'PENDING'
                      ? 'bg-amber-100 text-amber-700'
                      : selectedReservation.status?.toUpperCase() === 'UPDATE_REQUESTED'
                      ? 'bg-blue-100 text-blue-700'
                      : selectedReservation.status?.toUpperCase() === 'UPDATE_ACCEPTED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : selectedReservation.status?.toUpperCase() === 'UPDATE_REJECTED'
                      ? 'bg-red-100 text-red-700'
                      : selectedReservation.status?.toUpperCase() === 'COMPLETED'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedReservation.status?.toUpperCase() === 'CONFIRMED' && 'Confirmée'}
                    {selectedReservation.status?.toUpperCase() === 'PENDING' && 'En attente'}
                    {selectedReservation.status?.toUpperCase() === 'UPDATE_REQUESTED' && 'Modification demandée'}
                    {selectedReservation.status?.toUpperCase() === 'UPDATE_ACCEPTED' && 'Modification acceptée'}
                    {selectedReservation.status?.toUpperCase() === 'UPDATE_REJECTED' && 'Modification refusée'}
                    {selectedReservation.status?.toUpperCase() === 'COMPLETED' && 'Terminée'}
                  </div>
                  </div>

                  {/* Notes - Mobile: Compact */}
                  {selectedReservation.notes && (
                    <div className="mb-4 sm:mb-5 md:mb-6">
                      <div className="text-xs sm:text-sm text-slate-600 mb-2">Notes</div>
                      <div className="p-2.5 sm:p-3 bg-slate-50 rounded-lg text-xs sm:text-sm text-slate-900">
                        {selectedReservation.notes}
                      </div>
                    </div>
                  )}

                  {/* Actions - Mobile: Touch-friendly */}
                  <div className="space-y-2 sm:space-y-2.5">
                  <Link
                    href={selectedReservation.customerId ? `/messages?placeId=${selectedReservation.spaceId}&userId=${selectedReservation.customerId}` : '/messages'}
                    prefetch={false}
                    onClick={(e) => handleCapacitorLinkClick(e, selectedReservation.customerId ? `/messages?placeId=${selectedReservation.spaceId}&userId=${selectedReservation.customerId}` : '/messages', router)}
                    className="flex w-full items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors text-sm sm:text-base touch-manipulation active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    Contacter le client
                  </Link>
                  {!selectedReservation.id.startsWith('res-') && (
                  <CapacitorDynamicLink
                    href={`/reservations/${selectedReservation.id}/`}
                    className="block w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 active:bg-slate-100 transition-colors text-center text-sm sm:text-base touch-manipulation active:scale-95"
                  >
                    Voir les détails complets
                  </CapacitorDynamicLink>
                  )}
                  {selectedReservation.status === 'confirmed' && (
                    <button className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-emerald-200 text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 active:bg-emerald-100 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation active:scale-95">
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Annuler la réservation
                    </button>
                  )}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>,
          document.body
        )}
        <FooterNavigation />
      </div>
    </Fragment>
  );
}
