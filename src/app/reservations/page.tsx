'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingLogo from '@/components/ui/loading-logo';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Euro, ChevronRight, CheckCircle, XCircle, AlertCircle, Car, Box, Warehouse, MessageSquare, Trash2, Filter, X, Edit2, Star, CreditCard } from 'lucide-react';
import { reservationsAPI, ReservationDTO, placesAPI, PlaceDTO, rentoallUsersAPI, UserDTO, rentoallReviewsAPI } from '@/services/api';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { getCancellationPolicyText, getDisplayFirstName, capitalizeFirstPerLine, priceDifferenceWithServiceFee, baseFromTotal, SERVICE_FEE_MIN_EUR , getDefaultPlaceImage} from '@/lib/utils';
import { toApiDateTime, fromApiDateTime, toLocalDateString } from '@/lib/datetime';
import { getAppBaseUrl } from '@/lib/app-url';
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar';
import { handleCapacitorLinkClick, isCapacitor, capacitorNavigate } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { registerModalClose, unregisterModalClose } from '@/lib/capacitor-modal-back';
import StripeEmbeddedCheckout from '@/components/StripeEmbeddedCheckout';
import DepositSetupModal from '@/components/DepositSetupModal';

/** Heures fixes pour les listes déroulantes (modifier mes dates), comme sur la fiche bien — pas de minutes */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

/** Nombre de jours calendaires distincts (début et fin inclus). Ex: 16 avr. → 17 avr. = 2 jours. */
function getDistinctCalendarDays(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr + 'T12:00:00');
  const end = new Date(endDateStr + 'T12:00:00');
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.round((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1;
}

/** Prix de base pour une résa au jour : pour chaque jour du range, utilise customPricePerDay si dispo, sinon prix par défaut. */
function getBasePriceForDailyRange(place: PlaceDTO | null, startDateStr: string, endDateStr: string): number {
  if (!place || !startDateStr || !endDateStr) return 0;
  const defaultPricePerDay = (place.dayPriceActive === true && place.pricePerDay) ? place.pricePerDay : 0;
  const availabilities = place.availabilities ?? [];
  const start = new Date(startDateStr + 'T12:00:00');
  const end = new Date(endDateStr + 'T12:00:00');
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let total = 0;
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
}

/** Même logique que la fiche bien : date de fin selon le type (jour = même jour, semaine = +7j, mois = +1 mois). */
function getEndDateForPeriod(startDateStr: string, period: 'daily' | 'weekly' | 'monthly'): string {
  const start = new Date(startDateStr + 'T12:00:00');
  const end = new Date(start);
  if (period === 'daily') {
    // Un jour = même date début et fin
    return startDateStr;
  }
  if (period === 'weekly') {
    end.setDate(end.getDate() + 7);
  } else {
    // monthly
    end.setMonth(end.getMonth() + 1);
  }
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Vérifie que toutes les dates entre startStr et endStr (inclus) sont dans availableDates. */
function isDateRangeFullyAvailable(startStr: string, endStr: string, availableDates: Set<string> | null): boolean {
  if (!availableDates || availableDates.size === 0) return true;
  const start = new Date(startStr + 'T12:00:00');
  const end = new Date(endStr + 'T12:00:00');
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);
  while (cur <= endDay) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    if (!availableDates.has(`${y}-${m}-${d}`)) return false;
    cur.setDate(cur.getDate() + 1);
  }
  return true;
}

/** Retourne la première date (YYYY-MM-DD) indisponible dans [startStr, endStr], ou null si tout est dispo. */
function getFirstUnavailableDateInRange(startStr: string, endStr: string, availableDates: Set<string> | null): string | null {
  if (!availableDates || availableDates.size === 0) return null;
  const start = new Date(startStr + 'T12:00:00');
  const end = new Date(endStr + 'T12:00:00');
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);
  while (cur <= endDay) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (!availableDates.has(dateStr)) return dateStr;
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}

/** Ajoute n jours à une date YYYY-MM-DD, retourne la date en YYYY-MM-DD. */
function addDaysToDateStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Pour une date de début, retourne la date de fin (exclue) pour une période d'un mois. */
function getEndDateStrForMonth(startStr: string): string {
  const d = new Date(startStr + 'T12:00:00');
  d.setMonth(d.getMonth() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Interface locale pour l'affichage (combine ReservationDTO + données du bien ou du client)
interface ReservationDisplay {
  id: number;
  spaceId: number;
  spaceTitle: string;
  spaceImage: string;
  spaceType: 'parking' | 'storage' | 'cellar';
  location: string;
  startDate: Date;
  endDate: Date;
  startDateTime?: string; // Format ISO pour extraire les heures
  endDateTime?: string; // Format ISO pour extraire les heures
  amount: number;
  status: string;
  paymentStatus: string;
  userRole: 'GUEST' | 'HOST'; // Rôle de l'utilisateur dans cette réservation
  /** Type de tarification de la réservation (pour affichage et modification) */
  reservationType?: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  // Pour GUEST (locataire) - informations sur le bien
  hostName?: string;
  hostAvatar?: string;
  hostId?: number; // ID du propriétaire pour la messagerie
  // Pour HOST (propriétaire) - informations sur le client
  clientId?: number;
  clientName?: string;
  clientAvatar?: string;
  // Pour les modifications de dates
  priceDifference?: number; // Différence de prix (positif si augmentation, négatif si diminution)
  requestedStartDateTime?: string; // Nouvelles dates demandées
  requestedEndDateTime?: string; // Nouvelles dates demandées
  /** Montant de la caution demandée pour ce bien (depuis le lieu) */
  deposit?: number;
  /** Statut du paiement de la caution côté backend (card_recorded, succeeded = payée) */
  stripeDepositStatus?: string;
}

export default function ReservationsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [reservations, setReservations] = useState<ReservationDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelErrorModal, setShowCancelErrorModal] = useState(false);
  const [userMode, setUserMode] = useState<'client' | 'host'>(() => {
    if (typeof window === 'undefined') return 'client';
    return (localStorage.getItem('userMode') as 'client' | 'host' | null) || 'client';
  });
  const [showFilters, setShowFilters] = useState(false); // Mobile: filtres cachés par défaut
  // Stocker les données complètes pour calculer les modalités d'annulation
  const [reservationsData, setReservationsData] = useState<ReservationDTO[]>([]);
  const [placesData, setPlacesData] = useState<Map<number, PlaceDTO>>(new Map());
  
  // États pour la modification de dates
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [reservationToUpdate, setReservationToUpdate] = useState<ReservationDisplay | null>(null);
  const updateModalCloseRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!showUpdateModal || typeof window === 'undefined') return;
    const handler = () => setShowUpdateModal(false);
    updateModalCloseRef.current = handler;
    registerModalClose(handler);
    return () => {
      if (updateModalCloseRef.current) {
        unregisterModalClose(updateModalCloseRef.current);
        updateModalCloseRef.current = null;
      }
    };
  }, [showUpdateModal]);
  const [newStartDate, setNewStartDate] = useState<string>('');
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('00:00');
  const [newEndTime, setNewEndTime] = useState<string>('00:00');
  const [isRequestingUpdate, setIsRequestingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [estimatedPriceDifference, setEstimatedPriceDifference] = useState<number | null>(null);
  const [estimatedPriceDifferenceRaw, setEstimatedPriceDifferenceRaw] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [startCalendarMonth, setStartCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [endCalendarMonth, setEndCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [calendarOpenFor, setCalendarOpenFor] = useState<'start' | 'end' | null>(null);
  /** Type de séjour choisi dans le modal de modification (Heure / Jour / Semaine / Mois) */
  const [updateModalPeriod, setUpdateModalPeriod] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  // Calendrier de modification
  const [updateModalAvailableDates, setUpdateModalAvailableDates] = useState<Set<string> | null>(null);
  const [isLoadingUpdateCalendar, setIsLoadingUpdateCalendar] = useState(false);
  
  // États pour le formulaire d'avis (chaque note : entier 1-10)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reservationToReview, setReservationToReview] = useState<ReservationDisplay | null>(null);
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(0);
  const [accuracyRating, setAccuracyRating] = useState<number>(0);
  const [arrivalRating, setArrivalRating] = useState<number>(0);
  const [communicationRating, setCommunicationRating] = useState<number>(0);
  const [locationRating, setLocationRating] = useState<number>(0);
  const [valueForMoneyRating, setValueForMoneyRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [hasReviewedReservations, setHasReviewedReservations] = useState<Set<number>>(new Set());
  const [stripeEmbeddedClientSecret, setStripeEmbeddedClientSecret] = useState<string | null>(null);
  /** Ouverture du modal d'enregistrement de carte pour la caution (SetupIntent) */
  const [depositModalReservation, setDepositModalReservation] = useState<{ userId: number; reservationId: number; depositAmount: number } | null>(null);
  
  // Note: La page des réservations est accessible en mode client ET en mode hôte
  // En mode hôte, l'utilisateur voit UNIQUEMENT les réservations de ses biens (userRole === 'HOST')
  // En mode client, l'utilisateur voit UNIQUEMENT ses réservations en tant que locataire (userRole === 'GUEST')
  
  // Fonction pour charger les réservations (réutilisable)
  const loadReservations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.warn('⚠️ [RESERVATIONS] Aucun utilisateur connecté');
        setIsLoading(false);
        return;
      }

      // Utiliser le mode utilisateur depuis le state (ou localStorage en fallback)
      const currentMode = userMode || (localStorage.getItem('userMode') as 'client' | 'host' | null) || 'client';
      
      const userIdNum = parseInt(userId, 10);
      console.log('🔵 [RESERVATIONS] Chargement des réservations pour l\'utilisateur:', userIdNum, 'en mode:', currentMode);

      let allReservations: ReservationDTO[] = [];
      
      // Charger uniquement les réservations selon le mode
      if (currentMode === 'host') {
        // Mode hôte : uniquement les réservations sur ses biens
        console.log('🏠 [RESERVATIONS] Mode HÔTE : Chargement des réservations sur mes biens');
        allReservations = await reservationsAPI.getOwnedReservations(userIdNum);
      } else {
        // Mode client : uniquement les réservations que j'ai faites
        console.log('👤 [RESERVATIONS] Mode CLIENT : Chargement de mes réservations');
        allReservations = await reservationsAPI.getClientReservations(userIdNum);
      }
      
      console.log('✅ [RESERVATIONS] Réservations récupérées:', allReservations);

      // OPTIMISATION: Charger TOUS les biens UNE SEULE FOIS au lieu de pour chaque réservation
      console.log('🔵 [RESERVATIONS] Chargement de tous les biens...');
      let allPlaces: PlaceDTO[] = [];
      try {
        allPlaces = await placesAPI.search({});
        console.log(`✅ [RESERVATIONS] ${allPlaces.length} biens chargés`);
      } catch (err) {
        console.error('❌ [RESERVATIONS] Erreur lors du chargement des biens:', err);
      }
      
      // Créer une Map pour un accès rapide aux biens par ID
      const placesMap = new Map<number, PlaceDTO>();
      allPlaces.forEach(place => {
        placesMap.set(place.id, place);
      });

      // Pour les réservations dont le bien n'est pas dans search (ex. bien inactif), charger le bien par ID pour avoir la caution
      const missingPlaceIds = [...new Set(allReservations.map(r => r.placeId))].filter(pid => !placesMap.has(pid));
      if (missingPlaceIds.length > 0) {
        const missingPlaces = await Promise.all(
          missingPlaceIds.map(async (placeId) => {
            try {
              return await placesAPI.getById(placeId);
            } catch {
              return null;
            }
          })
        );
        missingPlaces.forEach(p => { if (p) placesMap.set(p.id, p); });
      }

      // Stocker les données pour les modalités d'annulation
      setPlacesData(placesMap);
      setReservationsData(allReservations);

      // OPTIMISATION: Identifier tous les clients uniques pour les réservations HOST
      const uniqueClientIds = new Set<number>();
      // OPTIMISATION: Identifier tous les propriétaires uniques pour les réservations GUEST
      const uniqueOwnerIds = new Set<number>();
      
      allReservations.forEach(res => {
        if (res.userRole === 'HOST') {
          uniqueClientIds.add(res.clientId);
        } else if (res.userRole === 'GUEST') {
          // Récupérer l'ownerId depuis le bien
          const placeDetails = placesMap.get(res.placeId);
          if (placeDetails?.ownerId) {
            uniqueOwnerIds.add(placeDetails.ownerId);
          }
        }
      });

      // Charger tous les clients en parallèle UNE SEULE FOIS
      console.log(`🔵 [RESERVATIONS] Chargement de ${uniqueClientIds.size} clients uniques...`);
      const clientsMap = new Map<number, UserDTO>();
      const clientPromises = Array.from(uniqueClientIds).map(async (clientId) => {
        try {
          const clientInfo = await rentoallUsersAPI.getProfile(clientId);
          clientsMap.set(clientId, clientInfo);
        } catch (err) {
          console.error(`❌ [RESERVATIONS] Erreur lors de la récupération du client ${clientId}:`, err);
        }
      });
      
      // Charger tous les propriétaires en parallèle UNE SEULE FOIS
      console.log(`🔵 [RESERVATIONS] Chargement de ${uniqueOwnerIds.size} propriétaires uniques...`);
      const ownersMap = new Map<number, UserDTO>();
      const ownerPromises = Array.from(uniqueOwnerIds).map(async (ownerId) => {
        try {
          const ownerInfo = await rentoallUsersAPI.getProfile(ownerId);
          ownersMap.set(ownerId, ownerInfo);
        } catch (err) {
          console.error(`❌ [RESERVATIONS] Erreur lors de la récupération du propriétaire ${ownerId}:`, err);
        }
      });
      
      await Promise.all([...clientPromises, ...ownerPromises]);
      console.log(`✅ [RESERVATIONS] ${clientsMap.size} clients et ${ownersMap.size} propriétaires chargés`);

      // Maintenant transformer les réservations (sans appels API supplémentaires)
      const transformedReservations: ReservationDisplay[] = allReservations.map((res) => {
        const userRole = res.userRole || 'GUEST';
        
        // Récupérer le bien depuis la Map (pas d'appel API)
        const placeDetails = placesMap.get(res.placeId) || null;
        
        const spaceType = placeDetails?.type === 'PARKING' ? 'parking' as const :
                        placeDetails?.type === 'STORAGE_SPACE' ? 'storage' as const :
                        'cellar' as const;
        
        // Utiliser les vraies photos du bien si disponibles
        const spaceImage = (placeDetails && Array.isArray(placeDetails.photos) && placeDetails.photos.length > 0) 
          ? placeDetails.photos[0] 
          : '/fond.jpg';
        
        const spaceTitle = capitalizeFirstPerLine(
          (placeDetails?.title && String(placeDetails.title).trim())
            ? placeDetails.title
            : (placeDetails?.description
              ? placeDetails.description.split('.').slice(0, 1).join('.') || `${spaceType} - ${placeDetails.city}`
              : placeDetails
              ? `${spaceType} - ${placeDetails.city}`
              : `Espace #${res.placeId}`)
        );
        
        const baseReservation: ReservationDisplay = {
          id: res.id,
          spaceId: res.placeId,
          spaceTitle,
          spaceImage: spaceImage,
          spaceType,
          location: placeDetails?.city || placeDetails?.address || 'Localisation non disponible',
          startDate: fromApiDateTime(res.startDateTime),
          endDate: fromApiDateTime(res.endDateTime),
          startDateTime: res.startDateTime, // Conserver le format ISO pour extraire les heures
          endDateTime: res.endDateTime, // Conserver le format ISO pour extraire les heures
          amount: res.totalPrice,
          status: res.status.toLowerCase(),
          paymentStatus: res.paymentStatus,
          userRole: userRole as 'GUEST' | 'HOST',
          reservationType: (res.reservationType as 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | undefined),
          priceDifference: res.priceDifference,
          requestedStartDateTime: res.requestedStartDateTime,
          requestedEndDateTime: res.requestedEndDateTime,
          // Caution : depuis le bien ou depuis la résa si le back l'expose
          deposit: ((): number | undefined => {
            const resDeposit = (res as unknown as { deposit?: number }).deposit;
            if (typeof resDeposit === 'number' && resDeposit > 0) return resDeposit;
            if (placeDetails?.deposit != null && placeDetails.deposit > 0) return placeDetails.deposit;
            return undefined;
          })(),
          stripeDepositStatus: (res as unknown as { stripeDepositStatus?: string }).stripeDepositStatus,
        };
        
        if (userRole === 'GUEST') {
          // Récupérer le propriétaire depuis la Map (pas d'appel API)
          const ownerInfo = placeDetails?.ownerId ? ownersMap.get(placeDetails.ownerId) || null : null;
          
          // Déterminer la photo du propriétaire
          let hostAvatar = '/logoR.png'; // Fallback par défaut : logo
          if (ownerInfo && ownerInfo.profilePicture && typeof ownerInfo.profilePicture === 'string' && ownerInfo.profilePicture.trim() !== '') {
            hostAvatar = ownerInfo.profilePicture;
            console.log('✅ [RESERVATIONS] Photo du propriétaire trouvée:', hostAvatar, 'pour ownerId:', placeDetails?.ownerId);
          } else {
            console.log('⚠️ [RESERVATIONS] Aucune photo du propriétaire, utilisation du logo par défaut pour ownerId:', placeDetails?.ownerId);
          }
          
          return {
            ...baseReservation,
            hostName: ownerInfo 
              ? getDisplayFirstName(ownerInfo, 'Propriétaire')
              : (placeDetails?.ownerId ? `Propriétaire #${placeDetails.ownerId}` : 'Propriétaire'),
            hostAvatar: hostAvatar,
            hostId: placeDetails?.ownerId || undefined,
          };
        }
        
        if (userRole === 'HOST') {
          // Récupérer le client depuis la Map (pas d'appel API)
          const clientInfo = clientsMap.get(res.clientId) || null;
          
          return {
            ...baseReservation,
            clientId: res.clientId,
            clientName: clientInfo 
              ? getDisplayFirstName(clientInfo, 'Client')
              : `Client #${res.clientId}`,
            clientAvatar: (clientInfo && typeof clientInfo.profilePicture === 'string' ? clientInfo.profilePicture : null) 
              || '/logoR.png',
          };
        }
        
        return baseReservation;
      });

      setReservations(transformedReservations);
    } catch (err) {
      console.error('❌ [RESERVATIONS] Erreur lors du chargement:', err);
      setError('Erreur lors du chargement des réservations');
    } finally {
      setIsLoading(false);
    }
  }, [userMode]);

  // Synchroniser le mode avec le localStorage et avec les changements depuis le header / ailleurs
  useEffect(() => {
    const syncMode = () => {
      const savedMode = localStorage.getItem('userMode') as 'client' | 'host' | null;
      if (savedMode === 'client' || savedMode === 'host') {
        setUserMode(savedMode);
      } else {
        setUserMode('client');
        localStorage.setItem('userMode', 'client');
      }
    };
    syncMode();
    window.addEventListener('userModeChanged', syncMode);
    return () => window.removeEventListener('userModeChanged', syncMode);
  }, []);

  // Charger les réservations depuis l'API
  useEffect(() => {
    loadReservations();
  }, [loadReservations]); // Recharger quand loadReservations change (qui dépend de userMode)
  
  // Calculer les réservations selon les filtres
  const getFilteredReservations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = reservations;
    
    // Filtre par statut
    if (statusFilter === 'ongoing') {
      filtered = filtered.filter(r => {
        const start = new Date(r.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(r.endDate);
        end.setHours(0, 0, 0, 0);
        const statusLower = r.status.toLowerCase();
        return start <= today && end >= today && (statusLower === 'confirmed' || statusLower === 'confirmée');
      });
    } else if (statusFilter === 'upcoming') {
      filtered = filtered.filter(r => {
        const start = new Date(r.startDate);
        start.setHours(0, 0, 0, 0);
        const statusLower = r.status.toLowerCase();
        return start > today && statusLower !== 'cancelled' && statusLower !== 'canceled' && statusLower !== 'annulée';
      });
    } else if (statusFilter === 'past') {
      filtered = filtered.filter(r => {
        const end = new Date(r.endDate);
        end.setHours(0, 0, 0, 0);
        const statusLower = r.status.toLowerCase();
        return end < today && statusLower !== 'completed' && statusLower !== 'terminée';
      });
    } else if (statusFilter === 'cancelled') {
      filtered = filtered.filter(r => {
        const statusLower = r.status.toLowerCase();
        return statusLower === 'cancelled' || statusLower === 'canceled' || statusLower === 'annulée';
      });
    }
    
    // Filtre par type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.spaceType === typeFilter);
    }
    
    // Trier par date de début croissante (dates les plus proches en premier)
    filtered.sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateA - dateB; // Ordre croissant : dates les plus proches en premier
    });
    
    return filtered;
  };
  
  const filteredReservations = getFilteredReservations();

  const getStatusConfig = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'confirmed':
      case 'confirmée':
        return { icon: CheckCircle, color: 'emerald', label: 'Confirmée', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'pending':
      case 'en attente':
        return { icon: AlertCircle, color: 'amber', label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      case 'completed':
      case 'terminée':
        return { icon: CheckCircle, color: 'slate', label: 'Terminée', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
      case 'cancelled':
      case 'canceled':
      case 'annulée':
        return { icon: XCircle, color: 'red', label: 'Annulé', bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' };
      case 'update_requested':
        return { icon: AlertCircle, color: 'blue', label: 'Modification demandée', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'update_accepted':
        return { icon: CheckCircle, color: 'emerald', label: 'Modification acceptée', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'awaiting_update_payment':
      case 'AWAITING_UPDATE_PAYMENT':
        return { icon: CreditCard, color: 'amber', label: 'Paiement requis', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      case 'update_rejected':
        return { icon: XCircle, color: 'red', label: 'Modification refusée', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
      default:
        return { icon: AlertCircle, color: 'slate', label: status, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'parking': return Car;
      case 'storage': return Box;
      case 'cellar': return Warehouse;
      default: return Car;
    }
  };

  // Fonction pour formater l'heure depuis un string ISO
  const formatTime = (dateTimeString?: string): string => {
    if (!dateTimeString) return '';
    try {
      const date = fromApiDateTime(dateTimeString);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const displayReservations = filteredReservations;
  
  const handleCancelReservation = (reservationId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setReservationToCancel(reservationId);
    setShowCancelModal(true);
  };

  const confirmCancelReservation = async () => {
    if (!reservationToCancel) return;
    
    try {
      setIsCancelling(true);
      setCancelError(null);
      console.log('🔵 [RESERVATIONS] Annulation de la réservation:', reservationToCancel);
      
      // Appeler l'API pour annuler la réservation
      await reservationsAPI.cancel(reservationToCancel);
      
      console.log('✅ [RESERVATIONS] Réservation annulée avec succès');
      
      // Fermer la modal
      setShowCancelModal(false);
      setReservationToCancel(null);
      
      // Recharger les réservations pour mettre à jour l'affichage
      await loadReservations();
    } catch (error) {
      console.error('❌ [RESERVATIONS] Erreur lors de l\'annulation:', error);
      const errorObj = error as { 
        message?: string; 
        response?: { 
          status?: number;
          data?: { 
            message?: string;
            error?: string;
          } 
        } 
      };
      
      // Si c'est une erreur 400 (Bad Request), c'est que l'annulation n'est pas autorisée
      if (errorObj?.response?.status === 400) {
        const errorMessage = errorObj?.response?.data?.message || 
                            errorObj?.response?.data?.error || 
                            'Cette réservation ne peut pas être annulée selon les conditions d\'annulation de l\'annonce.';
        setCancelError(errorMessage);
        setShowCancelErrorModal(true);
      } else {
        // Autre type d'erreur (réseau, serveur, etc.)
        const errorMessage = errorObj?.response?.data?.message || 
                            errorObj?.message || 
                            'Erreur lors de l\'annulation de la réservation. Veuillez réessayer.';
        setError(errorMessage);
      }
      
      setShowCancelModal(false);
      setReservationToCancel(null);
    } finally {
      setIsCancelling(false);
    }
  };

  // Approuver une réservation (côté hôte, statut PENDING)
  const handleApproveReservation = async (reservationId: number) => {
    try {
      await reservationsAPI.approveReservation(reservationId);
      console.log('✅ [RESERVATIONS] Réservation approuvée');
      await loadReservations();
    } catch (error) {
      console.error('❌ [RESERVATIONS] Erreur lors de l\'approbation:', error);
      const errorObj = error as { 
        response?: { 
          data?: { 
            message?: string;
            error?: string;
          } 
        };
        message?: string;
      };
      const errorMessage = errorObj?.response?.data?.message || 
                          errorObj?.response?.data?.error || 
                          errorObj?.message ||
                          'Erreur lors de l\'approbation. Veuillez réessayer.';
      alert(errorMessage);
    }
  };

  // Refuser une réservation (côté hôte, statut PENDING)
  const handleRejectReservation = async (reservationId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette réservation ?')) {
      return;
    }
    
    try {
      await reservationsAPI.rejectReservation(reservationId);
      console.log('✅ [RESERVATIONS] Réservation refusée');
      await loadReservations();
    } catch (error) {
      console.error('❌ [RESERVATIONS] Erreur lors du refus:', error);
      const errorObj = error as { 
        response?: { 
          data?: { 
            message?: string;
            error?: string;
          } 
        };
        message?: string;
      };
      const errorMessage = errorObj?.response?.data?.message || 
                          errorObj?.response?.data?.error || 
                          errorObj?.message ||
                          'Erreur lors du refus. Veuillez réessayer.';
      alert(errorMessage);
    }
  };
  
  const canCancel = (reservation: ReservationDisplay) => {
    const today = new Date();
    const start = new Date(reservation.startDate);
    const statusLower = reservation.status.toLowerCase();
    const cancellableStatuses = [
      'confirmed', 'confirmée', 'pending', 'en attente',
      'awaiting_update_payment', 'update_accepted', // même avec un supplément à payer pour modification de dates, l'utilisateur peut annuler
    ];
    return start > today && cancellableStatuses.includes(statusLower);
  };

  // Vérifier si une réservation peut recevoir un avis (terminée et pas encore notée)
  const canReview = (reservation: ReservationDisplay) => {
    const statusLower = reservation.status.toLowerCase();
    const isCompleted = statusLower === 'completed' || statusLower === 'terminée';
    const isGuest = reservation.userRole === 'GUEST';
    const notReviewed = !hasReviewedReservations.has(reservation.id);
    return isCompleted && isGuest && notReviewed;
  };

  // Ouvrir le modal d'avis
  const handleOpenReviewModal = (reservation: ReservationDisplay, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setReservationToReview(reservation);
    setCleanlinessRating(0);
    setAccuracyRating(0);
    setArrivalRating(0);
    setCommunicationRating(0);
    setLocationRating(0);
    setValueForMoneyRating(0);
    setReviewComment('');
    setReviewError(null);
    setShowReviewModal(true);
  };

  // Soumettre l'avis
  const handleSubmitReview = async () => {
    if (!reservationToReview) return;

    const ratings = [
      { name: 'Propreté', value: cleanlinessRating },
      { name: 'Exactitude / Conformité', value: accuracyRating },
      { name: 'Arrivée', value: arrivalRating },
      { name: 'Communication', value: communicationRating },
      { name: 'Emplacement', value: locationRating },
      { name: 'Rapport Qualité/Prix', value: valueForMoneyRating },
    ];
    const missing = ratings.find((r) => r.value < 1 || r.value > 10);
    if (missing) {
      setReviewError(`Veuillez noter tous les critères (chaque note entre 1 et 10).`);
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewError(null);

      const userId = localStorage.getItem('userId');
      if (!userId) {
        setReviewError('Utilisateur non connecté');
        return;
      }

      await rentoallReviewsAPI.createReservationReview({
        reservationId: reservationToReview.id,
        authorId: parseInt(userId, 10),
        cleanlinessRating: Math.round(cleanlinessRating),
        accuracyRating: Math.round(accuracyRating),
        arrivalRating: Math.round(arrivalRating),
        communicationRating: Math.round(communicationRating),
        locationRating: Math.round(locationRating),
        valueForMoneyRating: Math.round(valueForMoneyRating),
        comment: reviewComment.trim() || undefined,
      });

      // Marquer la réservation comme notée
      setHasReviewedReservations(prev => new Set([...prev, reservationToReview.id]));
      setShowReviewModal(false);
      setReservationToReview(null);

      // Recharger les réservations pour mettre à jour l'affichage
      await loadReservations();
    } catch (error: any) {
      console.error('❌ [RESERVATIONS] Erreur lors de la soumission de l\'avis:', error);
      setReviewError(error.response?.data?.message || 'Erreur lors de la soumission de l\'avis. Veuillez réessayer.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Vérifier si la réservation peut être modifiée (côté client uniquement) — toujours afficher pour les réservations à venir, même après une ou plusieurs modifications
  const canModifyDates = (reservation: ReservationDisplay) => {
    const today = new Date();
    const start = new Date(reservation.startDate);
    const statusLower = reservation.status.toLowerCase();
    const isUpcoming = start > today;
    const isGuest = reservation.userRole === 'GUEST';
    const isConfirmed = statusLower === 'confirmed' || statusLower === 'confirmée';
    const isNotEnded = statusLower !== 'cancelled' && statusLower !== 'canceled' && statusLower !== 'annulée' && statusLower !== 'completed' && statusLower !== 'terminée';
    const isNotUpdateStatus = statusLower !== 'update_requested' && statusLower !== 'update_accepted' && statusLower !== 'awaiting_update_payment';
    return isGuest && isUpcoming && isConfirmed && isNotEnded && isNotUpdateStatus;
  };

  // Ouvrir le modal de modification
  const handleOpenUpdateModal = (reservation: ReservationDisplay, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setReservationToUpdate(reservation);
    setUpdateModalAvailableDates(null); // déclencher le chargement des dispo
    const currentStart = new Date(reservation.startDate);
    const currentEnd = new Date(reservation.endDate);
    
    // Type actuel de la résa → période par défaut dans le modal
    const typeMap: Record<string, 'hourly' | 'daily' | 'weekly' | 'monthly'> = {
      HOURLY: 'hourly',
      DAILY: 'daily',
      WEEKLY: 'weekly',
      MONTHLY: 'monthly',
    };
    setUpdateModalPeriod(typeMap[reservation.reservationType || ''] || 'daily');
    
    setNewStartDate(currentStart.toISOString().split('T')[0]);
    setNewEndDate(currentEnd.toISOString().split('T')[0]);
    setNewStartTime(currentStart.toTimeString().slice(0, 5));
    setNewEndTime(currentEnd.toTimeString().slice(0, 5));
    setStartCalendarMonth(currentStart);
    setEndCalendarMonth(currentEnd);
    setEstimatedPriceDifference(null);
    setUpdateError(null);
    setShowUpdateModal(true);
  };

  // Charger les disponibilités du bien pour le calendrier de modification (même logique que la fiche bien : uniquement les jours sans réservation ni créneau occupé)
  useEffect(() => {
    if (!showUpdateModal || !reservationToUpdate) {
      setUpdateModalAvailableDates(null);
      return;
    }
    const placeId = reservationToUpdate.spaceId;
    const reservationId = reservationToUpdate.id;

    const loadCalendar = async () => {
      try {
        setIsLoadingUpdateCalendar(true);
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 12);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const calendarData = await placesAPI.getPlaceCalendar(placeId, startStr, endStr);
        const place = placesData.get(placeId);
        const availabilities = calendarData?.availabilities ?? [];
        const fromPlace = (place?.occupiedSlots ?? []) as Array<{ start?: string; end?: string; startDateTime?: string; endDateTime?: string; reservationId?: number }>;
        const fromCalendar = (calendarData?.occupiedSlots ?? []) as Array<{ start?: string; end?: string; startDateTime?: string; endDateTime?: string; reservationId?: number }>;
        const byStart = new Map<string, typeof fromCalendar[0]>();
        [...fromPlace, ...fromCalendar].forEach((slot) => {
          const key = slot.start ?? (slot as { startDateTime?: string }).startDateTime ?? '';
          if (key && !byStart.has(key)) byStart.set(key, slot);
        });
        const occupiedSlots = Array.from(byStart.values());

        // Même logique que la fiche bien : priorité aux availabilities du calendrier (dates bloquées par l'hôte), puis place.availabilities, puis availableFrom/To
        const isDateAvailableForPlace = (dateStr: string, cur: Date): boolean => {
          if (availabilities.length > 0) {
            const calendarEntry = availabilities.find((a) => a.date === dateStr);
            if (calendarEntry !== undefined) return calendarEntry.available === true;
          }
          if (place?.availabilities && place.availabilities.length > 0) {
            const entriesForDate = place.availabilities.filter((a) => a.date === dateStr);
            if (entriesForDate.length > 0) return entriesForDate.some((a) => a.available === true);
            return false;
          }
          if (place?.availableFrom && place?.availableTo) {
            const from = new Date(place.availableFrom);
            from.setHours(0, 0, 0, 0);
            const to = new Date(place.availableTo);
            to.setHours(23, 59, 59, 999);
            return cur >= from && cur <= to;
          }
          return false;
        };

        const isDayOccupiedByOther = (dateStr: string): boolean =>
          occupiedSlots.some((slot) => {
            if ((slot as { reservationId?: number }).reservationId === reservationId) return false;
            const slotStart = slot.start ? fromApiDateTime(slot.start) : (slot.startDateTime ? fromApiDateTime(slot.startDateTime) : new Date(NaN));
            const slotEnd = slot.end ? fromApiDateTime(slot.end) : (slot.endDateTime ? fromApiDateTime(slot.endDateTime) : new Date(NaN));
            if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime())) return false;
            const slotStartStr = toLocalDateString(slotStart);
            const slotEndStr = toLocalDateString(slotEnd);
            return dateStr >= slotStartStr && dateStr <= slotEndStr;
          });

        const isDayFree = (dateStr: string, curDate: Date): boolean =>
          isDateAvailableForPlace(dateStr, curDate) && !isDayOccupiedByOther(dateStr);

        const availableSet = new Set<string>();
        const cur = new Date(startDate);
        cur.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (updateModalPeriod === 'weekly') {
          // Semaine : une date est dispo seulement si les 7 jours à partir de cette date sont tous libres (aucun jour de pris dans la semaine)
          const c = new Date(cur);
          c.setHours(0, 0, 0, 0);
          while (c <= end) {
            const dateStr = toLocalDateString(c);
            let allWeekFree = true;
            for (let i = 0; i < 7; i++) {
              const d = addDaysToDateStr(dateStr, i);
              const dDate = new Date(d + 'T12:00:00');
              if (!isDayFree(d, dDate)) {
                allWeekFree = false;
                break;
              }
            }
            if (allWeekFree) availableSet.add(dateStr);
            c.setDate(c.getDate() + 1);
          }
        } else if (updateModalPeriod === 'monthly') {
          // Mois : une date est dispo seulement si toute la période d'un mois à partir de cette date est libre
          const c = new Date(cur);
          c.setHours(0, 0, 0, 0);
          while (c <= end) {
            const dateStr = toLocalDateString(c);
            const periodEnd = getEndDateStrForMonth(dateStr);
            let allMonthFree = true;
            let d = dateStr;
            while (d < periodEnd) {
              const dDate = new Date(d + 'T12:00:00');
              if (!isDayFree(d, dDate)) {
                allMonthFree = false;
                break;
              }
              d = addDaysToDateStr(d, 1);
            }
            if (allMonthFree) availableSet.add(dateStr);
            c.setDate(c.getDate() + 1);
          }
        } else {
          // Heure ou Jour : un jour est dispo si au moins un créneau ce jour a available true et aucune autre résa n'occupe ce jour
          while (cur <= end) {
            const dateStr = toLocalDateString(cur);
            if (isDayFree(dateStr, new Date(cur))) availableSet.add(dateStr);
            cur.setDate(cur.getDate() + 1);
          }
        }

        // Toujours autoriser les dates comprises dans la réservation actuelle (modification de sa propre résa)
        const resaStart = new Date(reservationToUpdate.startDate);
        const resaEnd = new Date(reservationToUpdate.endDate);
        resaStart.setHours(0, 0, 0, 0);
        resaEnd.setHours(23, 59, 59, 999);
        const resaCur = new Date(resaStart);
        while (resaCur <= resaEnd) {
          availableSet.add(toLocalDateString(resaCur));
          resaCur.setDate(resaCur.getDate() + 1);
        }

        setUpdateModalAvailableDates(availableSet);
      } catch (err) {
        console.error('❌ [RESERVATIONS] Erreur chargement calendrier bien:', err);
        setUpdateModalAvailableDates(new Set());
      } finally {
        setIsLoadingUpdateCalendar(false);
      }
    };
    loadCalendar();
  }, [showUpdateModal, reservationToUpdate, updateModalPeriod]);

  // Quand on change le type (Jour / Semaine / Mois), recalculer la date de fin comme sur la fiche bien
  useEffect(() => {
    if (!showUpdateModal || !newStartDate || updateModalPeriod === 'hourly') return;
    setNewEndDate(getEndDateForPeriod(newStartDate, updateModalPeriod));
  }, [showUpdateModal, updateModalPeriod, newStartDate]);

  // Valider que la plage [newStartDate, newEndDate] est entièrement dispo (aucun jour bloqué au milieu) — même logique que fiche bien
  useEffect(() => {
    if (!showUpdateModal || !newStartDate || !newEndDate || updateModalPeriod === 'hourly' || !updateModalAvailableDates) return;
    if (!isDateRangeFullyAvailable(newStartDate, newEndDate, updateModalAvailableDates)) {
      const firstUnav = getFirstUnavailableDateInRange(newStartDate, newEndDate, updateModalAvailableDates);
      const firstStr = firstUnav ? new Date(firstUnav + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      setUpdateError(firstUnav ? `Certaines dates ne sont pas disponibles (ex. ${firstStr}). Veuillez choisir une autre période.` : 'Certaines dates ne sont pas disponibles.');
    } else {
      setUpdateError((prev) => (prev && (prev.includes('Certaines dates ne sont pas disponibles') || prev.includes('autre période') || prev.includes('autre date de fin')) ? null : prev));
    }
  }, [showUpdateModal, newStartDate, newEndDate, updateModalPeriod, updateModalAvailableDates]);

  // Estimer la différence de prix pour la modification
  const estimatePriceDifference = async () => {
    if (!reservationToUpdate || !newStartDate || !newEndDate) return;
    
    try {
      setIsEstimating(true);
      // Mode jour + lieu chargé : frais 8 % (min 1,50 €) sur la différence de montant à rajouter uniquement
      if (updateModalPeriod === 'daily') {
        const place = placesData.get(reservationToUpdate.spaceId);
        if (place) {
          const newBasePrice = getBasePriceForDailyRange(place, newStartDate, newEndDate);
          const oldBase = baseFromTotal(reservationToUpdate.amount);
          const differenceBase = Math.round((newBasePrice - oldBase) * 100) / 100;
          const diff = priceDifferenceWithServiceFee(differenceBase);
          setEstimatedPriceDifference(diff);
          setEstimatedPriceDifferenceRaw(diff);
          setIsEstimating(false);
          return;
        }
      }
      const startDateTime = new Date(`${newStartDate}T${newStartTime || '00:00'}`);
      const endDateTime = new Date(`${newEndDate}T${newEndTime || '00:00'}`);
      const reservationType = (updateModalPeriod === 'hourly' ? 'HOURLY' : updateModalPeriod === 'daily' ? 'DAILY' : updateModalPeriod === 'weekly' ? 'WEEKLY' : 'MONTHLY') as 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
      
      const priceDifference = await reservationsAPI.estimateUpdate(
        reservationToUpdate.id,
        toApiDateTime(startDateTime),
        toApiDateTime(endDateTime),
        reservationType
      );
      // Frais sur la différence : 8 %, min 1,50 €
      const withFee = priceDifferenceWithServiceFee(priceDifference);
      setEstimatedPriceDifference(withFee);
      setEstimatedPriceDifferenceRaw(withFee);
    } catch (error) {
      console.error('❌ [RESERVATIONS] Erreur lors de l\'estimation:', error);
      setEstimatedPriceDifference(null);
      setEstimatedPriceDifferenceRaw(null);
    } finally {
      setIsEstimating(false);
    }
  };

  // Estimer automatiquement la différence de prix quand les dates changent
  useEffect(() => {
    if (showUpdateModal && reservationToUpdate && newStartDate && newEndDate) {
      // Délai pour éviter trop d'appels API
      const timeoutId = setTimeout(async () => {
        if (!reservationToUpdate || !newStartDate || !newEndDate) return;
        
        try {
          setIsEstimating(true);
          // Mode jour + lieu chargé : frais 8 % (min 1,50 €) sur la différence de montant à rajouter uniquement
          if (updateModalPeriod === 'daily') {
            const place = placesData.get(reservationToUpdate.spaceId);
            if (place) {
              const newBasePrice = getBasePriceForDailyRange(place, newStartDate, newEndDate);
              const oldBase = baseFromTotal(reservationToUpdate.amount);
              const differenceBase = Math.round((newBasePrice - oldBase) * 100) / 100;
              const diff = priceDifferenceWithServiceFee(differenceBase);
              setEstimatedPriceDifference(diff);
              setEstimatedPriceDifferenceRaw(diff);
              setIsEstimating(false);
              return;
            }
          }
          const startDateTime = new Date(`${newStartDate}T${newStartTime || '00:00'}`);
          const endDateTime = new Date(`${newEndDate}T${newEndTime || '00:00'}`);
          if (updateModalPeriod === 'hourly' && endDateTime <= startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);
          const reservationType = (updateModalPeriod === 'hourly' ? 'HOURLY' : updateModalPeriod === 'daily' ? 'DAILY' : updateModalPeriod === 'weekly' ? 'WEEKLY' : 'MONTHLY') as 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
          
          const priceDifference = await reservationsAPI.estimateUpdate(
            reservationToUpdate.id,
            toApiDateTime(startDateTime),
            toApiDateTime(endDateTime),
            reservationType
          );
          // Frais sur la différence : 8 %, min 1,50 €
          const withFee = priceDifferenceWithServiceFee(priceDifference);
          setEstimatedPriceDifference(withFee);
          setEstimatedPriceDifferenceRaw(withFee);
        } catch (error) {
          console.error('❌ [RESERVATIONS] Erreur lors de l\'estimation:', error);
          setEstimatedPriceDifference(null);
      setEstimatedPriceDifferenceRaw(null);
        } finally {
          setIsEstimating(false);
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [newStartDate, newEndDate, newStartTime, newEndTime, showUpdateModal, reservationToUpdate, updateModalPeriod, placesData]);

  // Soumettre la demande de modification
  const handleRequestUpdate = async () => {
    const effectiveEndDate = updateModalPeriod === 'hourly' ? newStartDate : newEndDate;
    if (!reservationToUpdate || !newStartDate || !effectiveEndDate) {
      setUpdateError('Veuillez sélectionner les nouvelles dates');
      return;
    }

    try {
      setIsRequestingUpdate(true);
      setUpdateError(null);

      let startDateTime: Date;
      let endDateTime: Date;
      if (updateModalPeriod === 'hourly') {
        startDateTime = new Date(`${newStartDate}T${newStartTime || '00:00'}`);
        endDateTime = new Date(`${newStartDate}T${newEndTime || '23:00'}`);
        if (endDateTime <= startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);
      } else {
        startDateTime = new Date(`${newStartDate}T${newStartTime || '00:00'}`);
        endDateTime = new Date(`${effectiveEndDate}T${newEndTime || '23:59'}`);
      }

      const newStartDateTimeISO = toApiDateTime(startDateTime);
      const newEndDateTimeISO = toApiDateTime(endDateTime);

      const updatedReservation = await reservationsAPI.requestUpdate(
        reservationToUpdate.id,
        reservationToUpdate.spaceId,
        newStartDateTimeISO,
        newEndDateTimeISO
      );

      console.log('✅ [RESERVATIONS] Demande de modification envoyée:', updatedReservation);
      
      // Vérifier le statut de la réponse selon la nouvelle logique du backend
      // Si instantBooking: true et priceDifference > 0 → AWAITING_UPDATE_PAYMENT → rediriger vers paiement
      // Si instantBooking: false → UPDATE_REQUESTED → attendre approbation hôte
      // Si modification gratuite ou moins chère → CONFIRMED (appliquée immédiatement)
      
      if (updatedReservation.status === 'UPDATE_ACCEPTED' || updatedReservation.status === 'update_accepted' || 
          updatedReservation.status === 'AWAITING_UPDATE_PAYMENT' || updatedReservation.status.toLowerCase() === 'awaiting_update_payment') {
        // La modification nécessite un paiement supplémentaire
        if (updatedReservation.priceDifference && updatedReservation.priceDifference > 0) {
          console.log('💰 [RESERVATIONS] Modification acceptée, redirection vers paiement du supplément');
          setShowUpdateModal(false);
          setReservationToUpdate(null);
          setCalendarOpenFor(null);
          
          // Rediriger vers le paiement
          await handlePayUpdateSupplement(updatedReservation.id, updatedReservation.priceDifference ?? undefined);
          return;
        }
      }
      
      // Si la modification est appliquée immédiatement (gratuite ou moins chère)
      if (updatedReservation.status === 'CONFIRMED' || updatedReservation.status === 'confirmed') {
        console.log('✅ [RESERVATIONS] Modification appliquée immédiatement');
      }
      
      // Si la modification nécessite l'approbation de l'hôte
      if (updatedReservation.status === 'UPDATE_REQUESTED' || updatedReservation.status === 'update_requested') {
        console.log('⏳ [RESERVATIONS] Demande de modification envoyée à l\'hôte pour approbation');
      }
      
      setShowUpdateModal(false);
      setReservationToUpdate(null);
      setCalendarOpenFor(null);
      await loadReservations();
    } catch (error) {
      console.error('❌ [RESERVATIONS] Erreur lors de la demande de modification:', error);
      const errorObj = error as { 
        response?: { 
          data?: { 
            message?: string;
            error?: string;
          } 
        };
        message?: string;
      };
      const errorMessage = errorObj?.response?.data?.message || 
                          errorObj?.response?.data?.error || 
                          errorObj?.message ||
                          'Erreur lors de la demande de modification. Veuillez réessayer.';
      // Ne jamais afficher "date de début dans le passé" quand la date de début est le jour J (aujourd'hui) : on autorise la réservation le jour même
      const startIsToday = newStartDate && (() => {
        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        return newStartDate === todayStr;
      })();
      const isPastDateError = /\b(passé|past)\b|début.*ne peut pas|start.*(date|dateTime).*past|cannot be in the past/i.test(errorMessage);
      setUpdateError(isPastDateError && startIsToday ? null : errorMessage);
    } finally {
      setIsRequestingUpdate(false);
    }
  };

  // Gérer le paiement du supplément après acceptation (côté client)
  const handlePayUpdateSupplement = async (reservationId: number, priceDifference?: number) => {
    try {
      const baseUrl = getAppBaseUrl();
      const successUrl = `${baseUrl}/reservations?payment=success`;
      const cancelUrl = `${baseUrl}/reservations?payment=cancelled`;

      const amountToCharge =
        priceDifference != null && priceDifference > 0 ? priceDifference : undefined;

      const response = await reservationsAPI.createUpdateCheckout(
        reservationId,
        successUrl,
        cancelUrl,
        isCapacitor() ? { uiMode: 'embedded', amountInEuros: amountToCharge } : { amountInEuros: amountToCharge }
      );
      
      if (isCapacitor() && response.clientSecret) {
        setStripeEmbeddedClientSecret(response.clientSecret);
        return;
      }
      if (isCapacitor() && response.url) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: response.url });
        return;
      }
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('URL de checkout non reçue');
      }
    } catch (error) {
      console.error('❌ [RESERVATIONS] Erreur lors de la création de la session de paiement:', error);
      const errorObj = error as { 
        response?: { 
          data?: { 
            message?: string;
            error?: string;
          } 
        };
        message?: string;
      };
      const errorMessage = errorObj?.response?.data?.message || 
                          errorObj?.response?.data?.error || 
                          errorObj?.message ||
                          'Erreur lors de la création de la session de paiement. Veuillez réessayer.';
      alert(errorMessage);
    }
  };

  // Caution (côté client) : enregistrement de la carte via SetupIntent (card-on-file), débit à J-3
  const handlePayDeposit = (reservationId: number, depositAmount: number) => {
    if (depositAmount <= 0) return;
    const userIdRaw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const userId = userIdRaw ? parseInt(userIdRaw, 10) : 0;
    if (!userId || Number.isNaN(userId)) return;
    setDepositModalReservation({ userId, reservationId, depositAmount });
  };

  // Accepter une demande de modification (côté hôte)
  const handleAcceptUpdate = async (reservationId: number) => {
    try {
      const updatedReservation = await reservationsAPI.respondUpdate(reservationId, true);
      console.log('✅ [RESERVATIONS] Modification acceptée:', updatedReservation);
      
      // Après acceptation, si priceDifference > 0, la réservation passe en AWAITING_UPDATE_PAYMENT
      // Le client devra payer le supplément
      if (updatedReservation.status === 'UPDATE_ACCEPTED' || updatedReservation.status === 'update_accepted' ||
          updatedReservation.status === 'AWAITING_UPDATE_PAYMENT' || updatedReservation.status.toLowerCase() === 'awaiting_update_payment') {
        if (updatedReservation.priceDifference && updatedReservation.priceDifference > 0) {
          console.log('💰 [RESERVATIONS] Modification acceptée, le client devra payer le supplément');
        }
      }
      
      await loadReservations();
    } catch (error) {
      console.error('❌ [RESERVATIONS] Erreur lors de l\'acceptation:', error);
      const errorObj = error as { 
        response?: { 
          data?: { 
            message?: string;
            error?: string;
          } 
        };
        message?: string;
      };
      const errorMessage = errorObj?.response?.data?.message || 
                          errorObj?.response?.data?.error || 
                          errorObj?.message ||
                          'Erreur lors de l\'acceptation. Veuillez réessayer.';
      alert(errorMessage);
    }
  };

  // Refuser une demande de modification (côté hôte)
  const handleRejectUpdate = async (reservationId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette modification ?')) {
      return;
    }
    
    try {
      await reservationsAPI.respondUpdate(reservationId, false);
      console.log('✅ [RESERVATIONS] Modification refusée');
      await loadReservations();
    } catch (error) {
      console.error('❌ [RESERVATIONS] Erreur lors du refus:', error);
      const errorObj = error as { 
        response?: { 
          data?: { 
            message?: string;
            error?: string;
          } 
        };
        message?: string;
      };
      const errorMessage = errorObj?.response?.data?.message || 
                          errorObj?.response?.data?.error || 
                          errorObj?.message ||
                          'Erreur lors du refus. Veuillez réessayer.';
      alert(errorMessage);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <HeaderNavigation />
      
      <main className="pt-0 md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-12 overflow-x-hidden flex-1 mobile-page-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Header - Mobile: Optimisé */}
          <div className="mb-2 sm:mb-6">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-0.5 sm:mb-1">
              {userMode === 'host' ? 'Réservations de mes biens' : 'Mes réservations'}
            </h1>
            <p className="text-xs sm:text-xs md:text-sm text-slate-600">
              {userMode === 'host' 
                ? 'Gérez les réservations effectuées sur vos espaces' 
                : 'Consultez vos réservations en tant que locataire'}
            </p>
          </div>

          {/* Notification pour les réservations nécessitant un paiement complémentaire */}
          {userMode === 'client' && displayReservations.some(r => 
            r.userRole === 'GUEST' && 
            (r.status.toLowerCase() === 'awaiting_update_payment' || r.status === 'AWAITING_UPDATE_PAYMENT') &&
            r.priceDifference !== undefined && 
            r.priceDifference !== null && 
            r.priceDifference > 0
          ) && (
            <div className="mb-2 sm:mb-6 bg-amber-50 border-2 border-amber-300 rounded-lg sm:rounded-xl p-2 sm:p-4 shadow-sm">
              <div className="flex items-start gap-1.5 sm:gap-3">
                <CreditCard className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-sm md:text-base font-bold text-amber-900 mb-0.5 sm:mb-1">
                    Paiement complémentaire requis
                  </h3>
                  <p className="text-xs sm:text-xs md:text-sm text-amber-800">
                    Vous avez {displayReservations.filter(r => 
                      r.userRole === 'GUEST' && 
                      (r.status.toLowerCase() === 'awaiting_update_payment' || r.status === 'AWAITING_UPDATE_PAYMENT') &&
                      r.priceDifference !== undefined && 
                      r.priceDifference !== null && 
                      r.priceDifference > 0
                    ).length} réservation{displayReservations.filter(r => 
                      r.userRole === 'GUEST' && 
                      (r.status.toLowerCase() === 'awaiting_update_payment' || r.status === 'AWAITING_UPDATE_PAYMENT') &&
                      r.priceDifference !== undefined && 
                      r.priceDifference !== null && 
                      r.priceDifference > 0
                    ).length > 1 ? 's' : ''} nécessitant un paiement complémentaire suite à une modification approuvée.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Barre de filtres - Repliée par défaut sur tous les écrans */}
          <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-sm mb-2 sm:mb-6 overflow-hidden">
            {/* En-tête des filtres */}
            <div className="px-2 sm:px-4 py-1 sm:py-2.5 border-b border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 sm:gap-2 hover:bg-slate-50 active:bg-slate-100 rounded-lg px-1 sm:px-2 py-0.5 sm:py-1 transition-colors cursor-pointer touch-manipulation active:scale-95 min-h-[36px] sm:min-h-0"
                aria-label={showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
              >
                <Filter className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-600" />
                <span className="text-xs sm:text-sm font-semibold text-slate-900">Filtres</span>
                {(statusFilter !== 'all' || typeFilter !== 'all') && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    {(statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)}
                  </span>
                )}
                <ChevronRight className={`w-3 h-3 sm:w-4 h-4 text-slate-600 transition-transform ${showFilters ? '-rotate-90' : 'rotate-90'}`} />
              </button>
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Bouton réinitialiser visible seulement si filtres ouverts et filtres actifs */}
                {showFilters && (statusFilter !== 'all' || typeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                    className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-0.5 sm:py-1 min-h-[36px] sm:min-h-[36px] text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 rounded-md sm:rounded-lg transition-colors cursor-pointer touch-manipulation active:scale-95"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Réinitialiser</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contenu des filtres (Statut + Type) */}
            {showFilters && (
              <div className="px-2 sm:px-4 py-3 sm:py-4 bg-slate-50/50 border-t border-slate-100 space-y-4">
                {/* Statut */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Statut</label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {[
                      { value: 'all', label: 'Toutes' },
                      { value: 'ongoing', label: 'En cours' },
                      { value: 'upcoming', label: 'À venir' },
                      { value: 'past', label: 'Passées' },
                      { value: 'cancelled', label: 'Annulées' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value)}
                        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[36px] sm:min-h-0 ${
                          statusFilter === opt.value
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Type de bien */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Type d&apos;espace</label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {[
                      { value: 'all', label: 'Tous' },
                      { value: 'parking', label: 'Parking' },
                      { value: 'storage', label: 'Stockage' },
                      { value: 'cellar', label: 'Cave et divers' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTypeFilter(opt.value)}
                        className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[36px] sm:min-h-0 ${
                          typeFilter === opt.value
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        {opt.value === 'parking' && <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        {opt.value === 'storage' && <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        {opt.value === 'cellar' && <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loading State - Skeletons individuels pour chaque carte */}
          {isLoading && (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                  <div className="p-2 sm:p-4 md:p-5 pl-3 sm:pl-5 md:pl-6">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                      {/* Image skeleton */}
                      <div className="w-full sm:w-32 md:w-40 h-20 sm:h-24 md:h-28 lg:h-28 rounded-lg bg-slate-200 flex-shrink-0" />
                      
                      {/* Content skeleton */}
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Title skeleton */}
                        <div className="space-y-2">
                          <div className="h-4 sm:h-5 bg-slate-200 rounded w-3/4" />
                          <div className="h-3 sm:h-4 bg-slate-200 rounded w-1/2" />
                        </div>
                        
                        {/* Dates and Price skeleton */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div className="bg-slate-100 rounded-lg p-2 sm:p-2.5">
                            <div className="h-3 sm:h-4 bg-slate-200 rounded w-2/3 mb-1" />
                            <div className="h-4 sm:h-5 bg-slate-200 rounded w-full" />
                          </div>
                          <div className="bg-slate-100 rounded-lg p-2 sm:p-2.5">
                            <div className="h-3 sm:h-4 bg-slate-200 rounded w-2/3 mb-1" />
                            <div className="h-4 sm:h-5 bg-slate-200 rounded w-full" />
                          </div>
                        </div>
                        
                        {/* Actions skeleton */}
                        <div className="flex items-center gap-2 pt-2 sm:pt-4 border-t border-slate-200">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-slate-200" />
                          <div className="flex-1 space-y-1">
                            <div className="h-3 sm:h-4 bg-slate-200 rounded w-1/3" />
                            <div className="h-2 sm:h-3 bg-slate-200 rounded w-1/4" />
                          </div>
                          <div className="h-8 sm:h-10 bg-slate-200 rounded-lg w-24 sm:w-32" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl border border-red-200 px-4">
              <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Erreur</h3>
              <p className="text-sm sm:text-base text-slate-600 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors touch-manipulation"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Reservations List */}
          {!isLoading && !error && displayReservations.length === 0 ? (
            <div className="text-center py-8 sm:py-16 bg-white rounded-lg sm:rounded-2xl border border-slate-200 px-3 sm:px-4">
              <Calendar className="w-10 h-10 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-slate-900 mb-1 sm:mb-2">
                Aucune réservation trouvée
              </h3>
              <p className="text-sm sm:text-sm md:text-base text-slate-600 mb-4 sm:mb-6">
                Aucune réservation ne correspond à vos filtres. Essayez de modifier vos critères de recherche.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                {(statusFilter !== 'all' || typeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg sm:rounded-xl transition-colors touch-manipulation active:scale-95 text-sm sm:text-sm"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
                <Link
                  href="/search-parkings"
                  prefetch={false}
                  onClick={(e) => handleCapacitorLinkClick(e, '/search-parkings', router)}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg sm:rounded-xl transition-colors touch-manipulation active:scale-95 text-sm sm:text-sm"
                >
                  Rechercher un espace
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-4">
              {displayReservations.map((reservation) => {
                const statusConfig = getStatusConfig(reservation.status);
                const StatusIcon = statusConfig.icon;
                const TypeIcon = getTypeIcon(reservation.spaceType);

                const reservationHref = `/reservations/${reservation.id}/`;
                const handleReservationClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isCapacitor()) {
                    capacitorNavigate(reservationHref);
                  } else {
                    router.push(reservationHref);
                  }
                };

                const isCancelled = reservation.status.toLowerCase() === 'cancelled' || reservation.status.toLowerCase() === 'canceled' || reservation.status.toLowerCase() === 'annulée';

                return (
                  <div
                    key={reservation.id}
                    role="button"
                    tabIndex={0}
                    onClick={handleReservationClick}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleReservationClick(e as unknown as React.MouseEvent); } }}
                    className={`block rounded-lg sm:rounded-xl border-2 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer relative touch-manipulation active:scale-[0.98] ${
                      isCancelled
                        ? 'bg-red-50 border-red-400 hover:border-red-600 hover:ring-2 hover:ring-red-200'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    {/* Indicateur visuel couleur à gauche */}
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 sm:w-1 ${
                      reservation.status.toLowerCase() === 'confirmed' || reservation.status.toLowerCase() === 'confirmée' ? 'bg-emerald-500' :
                      reservation.status.toLowerCase() === 'pending' || reservation.status.toLowerCase() === 'en attente' ? 'bg-amber-500' :
                      reservation.status.toLowerCase() === 'completed' || reservation.status.toLowerCase() === 'terminée' ? 'bg-slate-400' :
                      (reservation.status.toLowerCase() === 'awaiting_update_payment' || reservation.status === 'AWAITING_UPDATE_PAYMENT') ? 'bg-amber-500' :
                      'bg-red-500'
                    }`} />
                    
                    {/* Badge de notification pour paiement requis */}
                    {reservation.userRole === 'GUEST' && 
                     (reservation.status.toLowerCase() === 'awaiting_update_payment' || reservation.status === 'AWAITING_UPDATE_PAYMENT') &&
                     reservation.priceDifference !== undefined && 
                     reservation.priceDifference !== null && 
                     reservation.priceDifference > 0 && (
                      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 bg-amber-500 text-white px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-md sm:rounded-lg shadow-lg flex items-center gap-1 sm:gap-2">
                        <CreditCard className="w-2.5 h-2.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-xs font-bold">Paiement requis</span>
                      </div>
                    )}
                    
                    <div className="p-2 sm:p-4 md:p-5 pl-2.5 sm:pl-5 md:pl-6">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        {/* Image - Mobile: Optimisée et réduite */}
                        <div
                          className="relative w-full sm:w-32 md:w-40 h-18 sm:h-24 md:h-28 lg:h-28 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 group"
                          onClick={(e) => e.preventDefault()}
                        >
                          <Image
                            src={reservation.spaceImage}
                            alt={reservation.spaceTitle}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized={reservation.spaceImage?.startsWith('data:')}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 128px, 160px"
                          />
                          <div className="absolute top-1.5 left-1.5 sm:top-1.5 sm:left-2 bg-white/95 backdrop-blur-sm px-1.5 sm:px-1.5 py-0.5 sm:py-0.5 rounded-md sm:rounded-lg flex items-center gap-0.5 sm:gap-0.5">
                            <TypeIcon className={`w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 flex-shrink-0 ${isCancelled ? 'text-red-600' : 'text-emerald-600'}`} />
                            <span className="text-xs sm:text-[10px] md:text-xs font-semibold text-slate-900">
                              {reservation.spaceType === 'parking' ? 'Parking' : reservation.spaceType === 'storage' ? 'Box' : 'Cave'}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-3 mb-1 sm:mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-2 flex-wrap">
                                {/* Icône couleur selon statut */}
                                <div className={`p-0.5 sm:p-1.5 rounded-full ${
                                  reservation.status.toLowerCase() === 'confirmed' || reservation.status.toLowerCase() === 'confirmée' ? 'bg-emerald-100' :
                                  reservation.status.toLowerCase() === 'pending' || reservation.status.toLowerCase() === 'en attente' ? 'bg-amber-100' :
                                  reservation.status.toLowerCase() === 'completed' || reservation.status.toLowerCase() === 'terminée' ? 'bg-slate-100' :
                                  (reservation.status.toLowerCase() === 'awaiting_update_payment' || reservation.status === 'AWAITING_UPDATE_PAYMENT') ? 'bg-amber-100' :
                                  'bg-red-100'
                                }`}>
                                  <StatusIcon className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ${
                                    reservation.status.toLowerCase() === 'confirmed' || reservation.status.toLowerCase() === 'confirmée' ? 'text-emerald-600' :
                                    reservation.status.toLowerCase() === 'pending' || reservation.status.toLowerCase() === 'en attente' ? 'text-amber-600' :
                                    reservation.status.toLowerCase() === 'completed' || reservation.status.toLowerCase() === 'terminée' ? 'text-slate-600' :
                                    (reservation.status.toLowerCase() === 'awaiting_update_payment' || reservation.status === 'AWAITING_UPDATE_PAYMENT') ? 'text-amber-600' :
                                    'text-red-600'
                                  }`} />
                                </div>
                                <h3 className={`text-sm sm:text-base md:text-lg font-bold text-slate-900 transition-colors line-clamp-1 sm:line-clamp-2 ${isCancelled ? 'group-hover:text-red-600' : 'group-hover:text-emerald-600'}`}>
                                  {reservation.spaceTitle}
                                </h3>
                              </div>
                              <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-xs md:text-sm text-slate-600 mb-1 sm:mb-2">
                                <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 flex-shrink-0" />
                                <span className="truncate">{reservation.location}</span>
                              </div>
                            </div>
                            <div className={`flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-3 py-0.5 sm:py-1 md:py-2 rounded-md sm:rounded-lg border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} flex-shrink-0 self-start sm:self-auto`}>
                              <StatusIcon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                              <span className="text-xs sm:text-xs md:text-sm font-semibold">{statusConfig.label}</span>
                            </div>
                          </div>

                          {/* Dates and Price - Mobile: plus compact */}
                          <div className="grid grid-cols-2 gap-1 sm:gap-4 mb-1 sm:mb-4">
                            <div className={`flex items-center gap-1 sm:items-start sm:gap-2.5 rounded-md sm:rounded-lg px-1.5 py-1 sm:p-2.5 ${isCancelled ? 'bg-red-50' : 'bg-slate-50'}`}>
                              <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0 sm:mt-0.5 ${isCancelled ? 'text-red-600' : 'text-slate-600'}`} />
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <p className={`text-[10px] sm:text-xs mb-0 sm:mb-0.5 ${isCancelled ? 'text-red-600' : 'text-slate-500'}`}>Dates</p>
                                <p className={`text-[10px] sm:text-sm font-semibold leading-tight truncate sm:whitespace-normal ${isCancelled ? 'text-red-700' : 'text-slate-900'}`} title={`${formatDateShort(reservation.startDate)} - ${formatDateShort(reservation.endDate)}`}>
                                  {formatDateShort(reservation.startDate)} - {formatDateShort(reservation.endDate)}
                                </p>
                                {(reservation.startDateTime || reservation.endDateTime) && (
                                  <p className={`text-[9px] sm:text-xs mt-0 sm:mt-0.5 hidden sm:block ${isCancelled ? 'text-red-600' : 'text-slate-600'}`}>
                                    {formatTime(reservation.startDateTime)} - {formatTime(reservation.endDateTime)}
                                  </p>
                                )}
                                <p className={`text-[9px] sm:text-xs mt-0 sm:mt-0.5 ${isCancelled ? 'text-red-600' : 'text-slate-600'}`}>
                                  {Math.ceil((reservation.endDate.getTime() - reservation.startDate.getTime()) / (1000 * 60 * 60 * 24))} j.
                                </p>
                              </div>
                            </div>
                            <div className={`flex items-center gap-1 sm:items-start sm:gap-2.5 rounded-md sm:rounded-lg px-1.5 py-1 sm:p-2.5 ${isCancelled ? 'bg-red-100' : 'bg-emerald-50'}`}>
                              <Euro className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0 sm:mt-0.5 ${isCancelled ? 'text-red-600' : 'text-emerald-600'}`} />
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <p className="text-[10px] sm:text-xs text-slate-500 mb-0 sm:mb-0.5">Prix payé</p>
                                <p className={`text-xs sm:text-sm md:text-lg font-bold leading-tight ${isCancelled ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {reservation.amount.toFixed(2)}€
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Bouton Modifier mes dates - Affiché uniquement pour les réservations CONFIRMED côté client */}
                          {canModifyDates(reservation) && (
                            <div className="pt-1 sm:pt-3 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleOpenUpdateModal(reservation, e)}
                                className="w-full flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 font-semibold rounded-md sm:rounded-lg transition-colors text-xs sm:text-sm cursor-pointer touch-manipulation active:scale-95 min-h-[36px] sm:min-h-0"
                              >
                                <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>Modifier mes dates</span>
                              </button>
                            </div>
                          )}

                          {/* Affichage des nouvelles dates demandées si modification en cours */}
                          {(reservation.status === 'update_requested' || reservation.status === 'update_accepted' || reservation.status.toLowerCase() === 'awaiting_update_payment' || reservation.status === 'AWAITING_UPDATE_PAYMENT') && reservation.requestedStartDateTime && reservation.requestedEndDateTime && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md sm:rounded-lg p-1.5 sm:p-4 mb-1 sm:mb-4">
                              <p className="text-[10px] sm:text-[10px] md:text-sm font-semibold text-blue-900 mb-0.5 sm:mb-1">Nouvelles dates demandées :</p>
                              <p className="text-[10px] sm:text-[10px] md:text-sm text-blue-800">
                                {formatDateShort(new Date(reservation.requestedStartDateTime))} - {formatDateShort(new Date(reservation.requestedEndDateTime))}
                              </p>
                              <p className="text-[10px] sm:text-[9px] md:text-xs text-blue-700 mt-0.5">
                                {formatTime(reservation.requestedStartDateTime)} - {formatTime(reservation.requestedEndDateTime)}
                              </p>
                              {reservation.priceDifference !== undefined && reservation.priceDifference !== null && (
                                <p className="text-[10px] sm:text-[10px] md:text-sm text-blue-800 mt-0.5">
                                  {reservation.priceDifference > 0 ? (
                                    <>Supplément : <span className="font-bold">+{reservation.priceDifference.toFixed(2)}€</span></>
                                  ) : reservation.priceDifference < 0 ? (
                                    <>Remboursement : <span className="font-bold">{reservation.priceDifference.toFixed(2)}€</span></>
                                  ) : (
                                    <>Aucune différence</>
                                  )}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Host Info (pour GUEST) ou Client Info (pour HOST) & Actions - une ligne propre */}
                          <div className="flex flex-col gap-2 sm:gap-3 pt-1.5 sm:pt-4 border-t border-slate-200">
                            {/* Ligne 1 : infos caution (si applicable) */}
                            {reservation.userRole === 'GUEST' &&
                             reservation.deposit != null &&
                             reservation.deposit > 0 &&
                             reservation.status.toLowerCase() !== 'cancelled' &&
                             reservation.status.toLowerCase() !== 'canceled' &&
                             reservation.status.toLowerCase() !== 'annulée' && (
                              <p className="text-xs sm:text-xs text-slate-600">
                                Caution : {reservation.deposit.toFixed(2)} € — empreinte seulement.
                              </p>
                            )}
                            {/* Ligne 2 : Hôte/Client (caché en mobile) + actions sur une seule ligne */}
                            <div className="flex flex-row flex-nowrap md:flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
                            {/* Bloc Hôte (pour GUEST) / Client (pour HOST) : visible aussi sur mobile */}
                            {(reservation.userRole === 'GUEST' && reservation.hostName) || (reservation.userRole === 'HOST' && reservation.clientName) ? (
                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
                                  {((reservation.userRole === 'GUEST' && reservation.hostId) || (reservation.userRole === 'HOST' && reservation.clientId)) ? (
                                    <Link 
                                      href={`/user/${reservation.userRole === 'GUEST' ? reservation.hostId : reservation.clientId}/`}
                                      prefetch={false}
                                      className="w-7 h-7 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 ring-2 ring-slate-100 hover:ring-emerald-500 transition-all cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); handleCapacitorLinkClick(e, `/user/${reservation.userRole === 'GUEST' ? reservation.hostId : reservation.clientId}/`, router); }}
                                    >
                                      <Image
                                        src={
                                          reservation.userRole === 'GUEST' 
                                            ? (reservation.hostAvatar || '/logoR.png')
                                            : (reservation.clientAvatar || '/logoR.png')
                                        }
                                        alt={
                                          reservation.userRole === 'GUEST' 
                                            ? reservation.hostName || 'Hôte'
                                            : reservation.clientName || 'Client'
                                        }
                                        width={48}
                                        height={48}
                                        className="object-cover"
                                        unoptimized
                                      />
                                    </Link>
                                  ) : (
                                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 ring-2 ring-slate-100">
                                      <Image
                                        src={
                                          reservation.userRole === 'GUEST' 
                                            ? (reservation.hostAvatar || '/logoR.png')
                                            : (reservation.clientAvatar || '/logoR.png')
                                        }
                                        alt={
                                          reservation.userRole === 'GUEST' 
                                            ? reservation.hostName || 'Hôte'
                                            : reservation.clientName || 'Client'
                                        }
                                        width={48}
                                        height={48}
                                        className="object-cover"
                                        unoptimized
                                      />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    {reservation.userRole === 'GUEST' ? (
                                      <>
                                  <p className="text-xs sm:text-xs font-semibold text-slate-900 truncate">
                                        Hôte:{' '}
                                          {reservation.hostId ? (
                                            <Link 
                                              href={`/user/${reservation.hostId}/`}
                                              prefetch={false}
                                              className="hover:text-emerald-600 transition-colors cursor-pointer"
                                              onClick={(e) => { e.stopPropagation(); handleCapacitorLinkClick(e, `/user/${reservation.hostId}/`, router); }}
                                            >
                                              {reservation.hostName}
                                            </Link>
                                          ) : (
                                            reservation.hostName
                                          )}
                                        </p>
                                        <p className="text-[10px] sm:text-[9px] text-slate-500">Propriétaire</p>
                                      </>
                                    ) : (
                                      <>
                                  <p className="text-xs sm:text-xs font-semibold text-slate-900 truncate">
                                        Client:{' '}
                                          {reservation.clientId ? (
                                            <Link 
                                              href={`/user/${reservation.clientId}/`}
                                              prefetch={false}
                                              className="hover:text-emerald-600 transition-colors cursor-pointer"
                                              onClick={(e) => { e.stopPropagation(); handleCapacitorLinkClick(e, `/user/${reservation.clientId}/`, router); }}
                                            >
                                              {reservation.clientName}
                                            </Link>
                                          ) : (
                                            reservation.clientName
                                          )}
                                        </p>
                                        <p className="text-[10px] sm:text-[9px] text-slate-500">Locataire</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                              <div className="flex items-center gap-1.5 sm:gap-3 flex-nowrap md:flex-wrap flex-1 min-w-0 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {/* Bouton Payer le supplément (côté client, statut UPDATE_ACCEPTED ou AWAITING_UPDATE_PAYMENT avec priceDifference > 0) */}
                              {reservation.userRole === 'GUEST' && 
                               (reservation.status === 'update_accepted' || reservation.status.toLowerCase() === 'awaiting_update_payment' || reservation.status === 'AWAITING_UPDATE_PAYMENT') && 
                               reservation.priceDifference !== undefined && 
                               reservation.priceDifference !== null && 
                               reservation.priceDifference > 0 && (
                                <button
                                  id={`btn-pay-supplement-${reservation.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePayUpdateSupplement(reservation.id, reservation.priceDifference ?? undefined);
                                  }}
                                  className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[32px] sm:min-h-[36px] text-xs sm:text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer touch-manipulation shrink-0"
                                  title="Payer le supplément"
                                >
                                  <Euro className="w-3 h-3 sm:w-4.5 sm:h-4.5 shrink-0" />
                                  <span className="hidden sm:inline">Payer </span><span>+{reservation.priceDifference.toFixed(2)}€</span>
                                </button>
                              )}

                              {/* Caution : bouton "Payer la caution" ou "Caution payée" si déjà réglée */}
                              {reservation.userRole === 'GUEST' &&
                               reservation.deposit != null &&
                               reservation.deposit > 0 &&
                               reservation.status.toLowerCase() !== 'cancelled' &&
                               reservation.status.toLowerCase() !== 'canceled' &&
                               reservation.status.toLowerCase() !== 'annulée' && (() => {
                                const depositPaid = reservation.stripeDepositStatus &&
                                  /^(card_recorded|succeeded)$/i.test((reservation.stripeDepositStatus || '').trim());
                                if (depositPaid) {
                                  return (
                                    <span
                                      className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[32px] sm:min-h-[36px] text-xs sm:text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md shrink-0"
                                      title="Caution enregistrée"
                                    >
                                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                                      <span>Caution payée</span>
                                    </span>
                                  );
                                }
                                return (
                                  <button
                                    id={`btn-pay-deposit-${reservation.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePayDeposit(reservation.id, reservation.deposit!);
                                    }}
                                    className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[32px] sm:min-h-[36px] text-xs sm:text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0"
                                    title="Payer la caution (enregistrement carte via Stripe)"
                                  >
                                    <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                                    <span><span className="hidden sm:inline">Payer la </span>caution</span>
                                  </button>
                                );
                              })()}

                              {/* Boutons Approuver/Refuser (côté hôte, statut PENDING) */}
                              {reservation.userRole === 'HOST' && (reservation.status === 'pending' || reservation.status === 'PENDING') && (
                                <>
                                  <button
                                    id={`btn-approve-reservation-${reservation.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveReservation(reservation.id);
                                    }}
                                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[44px] text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md sm:rounded-lg transition-colors cursor-pointer touch-manipulation active:scale-95 flex-1 sm:flex-none"
                                    title="Approuver la réservation"
                                  >
                                    <CheckCircle className="w-3 h-3 sm:w-4.5 sm:h-4.5" />
                                    <span>Approuver</span>
                                  </button>
                                  <button
                                    id={`btn-reject-reservation-${reservation.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectReservation(reservation.id);
                                    }}
                                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[44px] text-xs sm:text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md sm:rounded-lg transition-colors cursor-pointer touch-manipulation active:scale-95 flex-1 sm:flex-none"
                                    title="Refuser la réservation"
                                  >
                                    <XCircle className="w-3 h-3 sm:w-4.5 sm:h-4.5" />
                                    <span>Refuser</span>
                                  </button>
                                </>
                              )}

                              {/* Boutons Accepter/Refuser (côté hôte, statut UPDATE_REQUESTED) */}
                              {reservation.userRole === 'HOST' && reservation.status === 'update_requested' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptUpdate(reservation.id);
                                    }}
                                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[44px] text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md sm:rounded-lg transition-colors cursor-pointer touch-manipulation active:scale-95 flex-1 sm:flex-none"
                                    title="Accepter la modification"
                                  >
                                    <CheckCircle className="w-3 h-3 sm:w-4.5 sm:h-4.5" />
                                    <span>Accepter</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectUpdate(reservation.id);
                                    }}
                                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[44px] text-xs sm:text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md sm:rounded-lg transition-colors cursor-pointer touch-manipulation active:scale-95 flex-1 sm:flex-none"
                                    title="Refuser la modification"
                                  >
                                    <XCircle className="w-3 h-3 sm:w-4.5 sm:h-4.5" />
                                    <span>Refuser</span>
                                  </button>
                                </>
                              )}

                              {/* Bouton Laisser un avis (réservations terminées) */}
                              {canReview(reservation) && (
                                <button
                                  onClick={(e) => handleOpenReviewModal(reservation, e)}
                                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[44px] text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md sm:rounded-lg transition-colors cursor-pointer touch-manipulation active:scale-95 flex-1 sm:flex-none"
                                  title="Laisser un avis"
                                >
                                  <Star className="w-3 h-3 sm:w-4.5 sm:h-4.5" />
                                  <span>Laisser un avis</span>
                                </button>
                              )}

                              {/* Actions rapides */}
                              {canCancel(reservation) && (
                                <button
                                  onClick={(e) => handleCancelReservation(reservation.id, e)}
                                  className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[32px] sm:min-h-[36px] text-xs sm:text-xs font-medium text-red-600 hover:bg-red-50 active:bg-red-100 rounded-md transition-colors cursor-pointer touch-manipulation shrink-0"
                                  title="Annuler réservation"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  <span>Annuler</span>
                                </button>
                              )}
                              {(reservation.userRole === 'GUEST' && reservation.hostId) || 
                               (reservation.userRole === 'HOST' && reservation.clientId) ? (
                                <Link
                                  href={`/messages?placeId=${reservation.spaceId}&userId=${
                                    reservation.userRole === 'GUEST' 
                                      ? reservation.hostId!
                                      : reservation.clientId!
                                  }`}
                                  prefetch={false}
                                  className="flex items-center justify-center p-1.5 sm:p-2 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] hover:bg-slate-100 active:bg-slate-200 rounded-md transition-colors cursor-pointer touch-manipulation shrink-0"
                                  title="Contacter"
                                  onClick={(e) => { e.stopPropagation(); handleCapacitorLinkClick(e, `/messages?placeId=${reservation.spaceId}&userId=${reservation.userRole === 'GUEST' ? reservation.hostId! : reservation.clientId!}`, router); }}
                                >
                                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                                </Link>
                              ) : (
                                <button 
                                  className="flex items-center justify-center p-1.5 sm:p-2 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] hover:bg-slate-100 rounded-md transition-colors cursor-not-allowed opacity-50 touch-manipulation shrink-0" 
                                  title="Contact non disponible"
                                  disabled
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                                </button>
                              )}
                              <CapacitorDynamicLink
                                href={`/parking/${reservation.spaceId}/`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2 min-h-[32px] sm:min-h-[36px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md transition-colors cursor-pointer touch-manipulation shrink-0 whitespace-nowrap"
                              >
                                <span className="hidden sm:inline">Voir l&apos;espace</span>
                                <span className="sm:hidden">Voir</span>
                                <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                              </CapacitorDynamicLink>
                            </div>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <FooterNavigation />

      {/* Modal de confirmation d'annulation */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          if (!isCancelling) {
            setShowCancelModal(false);
            setReservationToCancel(null);
          }
        }}
        onConfirm={confirmCancelReservation}
        title="Annuler la réservation"
        message="Êtes-vous sûr de vouloir annuler cette réservation ? Cette action est irréversible."
        confirmText="Oui, annuler"
        cancelText="Non, garder"
        confirmButtonColor="red"
        isLoading={isCancelling}
        cancellationInfo={(() => {
          if (!reservationToCancel) return undefined;
          
          const reservation = reservationsData.find(r => r.id === reservationToCancel);
          if (!reservation) return undefined;
          
          const place = placesData.get(reservation.placeId);
          if (!place) return undefined;
          
          // Calculer les modalités d'annulation
          const policyText = getCancellationPolicyText(
            place.cancellationDeadlineDays,
            place.cancellationPolicy
          );
          
          const isRefundable = place.cancellationDeadlineDays !== -1;
          const serviceFee = reservation.serviceFee ?? Math.max(reservation.totalPrice * 0.08, SERVICE_FEE_MIN_EUR);
          const refundAmount = isRefundable ? reservation.totalPrice - serviceFee : 0;
          
          return {
            policy: policyText,
            refundAmount: isRefundable ? refundAmount : undefined,
            totalAmount: reservation.totalPrice,
            serviceFee: serviceFee,
            isRefundable: isRefundable,
          };
        })()}
      />

      {/* Modal d'erreur d'annulation */}
      {showCancelErrorModal && cancelError && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowCancelErrorModal(false);
              setCancelError(null);
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-w-md w-full md:mx-4 p-4 sm:p-6 animate-in slide-in-from-bottom md:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 sm:gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                  Annulation impossible
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {cancelError}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCancelErrorModal(false);
                  setCancelError(null);
                }}
                className="px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors touch-manipulation"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification des dates */}
      {showUpdateModal && reservationToUpdate && (
        <div
          className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center p-0 md:p-4 bg-black/50"
          onClick={() => {
            if (!isRequestingUpdate) {
              setShowUpdateModal(false);
              setReservationToUpdate(null);
              setCalendarOpenFor(null);
              setUpdateError(null);
              setEstimatedPriceDifference(null);
              setEstimatedPriceDifferenceRaw(null);
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && !isRequestingUpdate && setShowUpdateModal(false)}
          aria-label="Fermer"
        >
          <div className="bg-white w-full max-w-2xl h-full min-h-[100dvh] md:min-h-0 md:h-auto md:max-h-[95vh] rounded-none md:rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between z-10 flex-shrink-0">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">Modifier mes dates</h2>
              <button
                onClick={() => {
                  if (!isRequestingUpdate) {
                    setShowUpdateModal(false);
                    setReservationToUpdate(null);
                    setCalendarOpenFor(null);
                    setUpdateError(null);
                    setEstimatedPriceDifference(null);
      setEstimatedPriceDifferenceRaw(null);
                  }
                }}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors touch-manipulation active:scale-95 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                disabled={isRequestingUpdate}
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </button>
            </div>

            <div
              className="p-3 sm:p-6 space-y-3 sm:space-y-6 flex-1 overflow-y-auto"
              style={{ paddingBottom: 'max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5rem))' }}
            >
              {/* Informations de la réservation */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">{reservationToUpdate.spaceTitle}</h3>
                <p className="text-sm text-slate-600">{reservationToUpdate.location}</p>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Dates actuelles</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDateShort(reservationToUpdate.startDate)} - {formatDateShort(reservationToUpdate.endDate)}
                  </p>
                  {(reservationToUpdate.startDateTime || reservationToUpdate.endDateTime) && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      {formatTime(reservationToUpdate.startDateTime)} - {formatTime(reservationToUpdate.endDateTime)}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Type actuel: {reservationToUpdate.reservationType === 'HOURLY' ? 'Heure' : reservationToUpdate.reservationType === 'DAILY' ? 'Jour' : reservationToUpdate.reservationType === 'WEEKLY' ? 'Semaine' : reservationToUpdate.reservationType === 'MONTHLY' ? 'Mois' : 'Jour'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Montant actuel: {reservationToUpdate.amount.toFixed(2)}€</p>
                </div>
              </div>

              {/* Type de séjour (comme sur la fiche bien) — à choisir avant les dates */}
              {(() => {
                const place = reservationToUpdate ? placesData.get(reservationToUpdate.spaceId) : null;
                const showHour = place?.hourPriceActive === true && place?.pricePerHour != null && place.pricePerHour > 0;
                const showDay = place?.dayPriceActive === true && place?.pricePerDay != null && place.pricePerDay > 0;
                const showWeek = place?.weekPriceActive === true && place?.pricePerWeek != null && place.pricePerWeek > 0;
                const showMonth = place?.monthPriceActive === true && place?.pricePerMonth != null && place.pricePerMonth > 0;
                // Si le bien n'est pas chargé, afficher au moins les types possibles (dont le type actuel)
                const canShowHour = showHour || reservationToUpdate?.reservationType === 'HOURLY';
                const canShowDay = showDay || reservationToUpdate?.reservationType === 'DAILY' || !place;
                const canShowWeek = showWeek || reservationToUpdate?.reservationType === 'WEEKLY';
                const canShowMonth = showMonth || reservationToUpdate?.reservationType === 'MONTHLY';
                const formatPrice = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Choisir le type de séjour</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {canShowHour && (
                        <button
                          type="button"
                          onClick={() => {
                            setUpdateModalPeriod('hourly');
                            setCalendarOpenFor(null);
                          }}
                          className={`px-3 py-2.5 text-sm rounded-xl border-2 font-medium transition-all touch-manipulation active:scale-95 flex flex-col items-center gap-0.5 ${
                            updateModalPeriod === 'hourly' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <span>Heure</span>
                          {place?.pricePerHour != null && place.pricePerHour > 0 && (
                            <span className={`text-xs ${updateModalPeriod === 'hourly' ? 'text-emerald-100' : 'text-slate-500'}`}>
                              {formatPrice(place.pricePerHour)} €/h
                            </span>
                          )}
                        </button>
                      )}
                      {canShowDay && (
                        <button
                          type="button"
                          onClick={() => {
                            setUpdateModalPeriod('daily');
                            setCalendarOpenFor(null);
                          }}
                          className={`px-3 py-2.5 text-sm rounded-xl border-2 font-medium transition-all touch-manipulation active:scale-95 flex flex-col items-center gap-0.5 ${
                            updateModalPeriod === 'daily' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <span>Jour</span>
                          {(place?.pricePerDay != null && place.pricePerDay > 0) && (
                            <span className={`text-xs ${updateModalPeriod === 'daily' ? 'text-emerald-100' : 'text-slate-500'}`}>
                              {formatPrice(place.pricePerDay)} €/jour
                            </span>
                          )}
                        </button>
                      )}
                      {canShowWeek && (
                        <button
                          type="button"
                          onClick={() => {
                            setUpdateModalPeriod('weekly');
                            setCalendarOpenFor(null);
                          }}
                          className={`px-3 py-2.5 text-sm rounded-xl border-2 font-medium transition-all touch-manipulation active:scale-95 flex flex-col items-center gap-0.5 ${
                            updateModalPeriod === 'weekly' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <span>Semaine</span>
                          {(place?.pricePerWeek != null && place.pricePerWeek > 0) && (
                            <span className={`text-xs ${updateModalPeriod === 'weekly' ? 'text-emerald-100' : 'text-slate-500'}`}>
                              {formatPrice(place.pricePerWeek)} €/sem.
                            </span>
                          )}
                        </button>
                      )}
                      {canShowMonth && (
                        <button
                          type="button"
                          onClick={() => {
                            setUpdateModalPeriod('monthly');
                            setCalendarOpenFor(null);
                          }}
                          className={`px-3 py-2.5 text-sm rounded-xl border-2 font-medium transition-all touch-manipulation active:scale-95 flex flex-col items-center gap-0.5 ${
                            updateModalPeriod === 'monthly' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <span>Mois</span>
                          {(place?.pricePerMonth != null && place.pricePerMonth > 0) && (
                            <span className={`text-xs ${updateModalPeriod === 'monthly' ? 'text-emerald-100' : 'text-slate-500'}`}>
                              {formatPrice(place.pricePerMonth)} €/mois
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Sélection des nouvelles dates — affichée selon le type choisi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mode Heure : une date + plage horaire */}
                {updateModalPeriod === 'hourly' ? (
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setCalendarOpenFor(prev => prev === 'start' ? null : 'start');
                            if (!newStartDate) {
                              const d = new Date();
                              d.setDate(1);
                              setStartCalendarMonth(d);
                            } else {
                              const [y, m] = newStartDate.split('-').map(Number);
                              setStartCalendarMonth(new Date(y, m - 1, 1));
                            }
                          }}
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-left text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer flex items-center justify-between"
                        >
                          <span className={newStartDate ? 'font-medium' : 'text-slate-500'}>
                            {newStartDate
                              ? new Date(newStartDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                              : 'Choisir une date'}
                          </span>
                          <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        </button>
                        {calendarOpenFor === 'start' && (
                          <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-[300px] bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-4">
                            {isLoadingUpdateCalendar ? (
                              <p className="text-sm text-slate-600 py-4 text-center">Chargement des disponibilités…</p>
                            ) : (
                              <DatePickerCalendar
                                selectedDate={newStartDate ? new Date(newStartDate + 'T12:00:00') : null}
                                onSelectDate={(date) => {
                                  const y = date.getFullYear();
                                  const m = String(date.getMonth() + 1).padStart(2, '0');
                                  const d = String(date.getDate()).padStart(2, '0');
                                  setNewStartDate(`${y}-${m}-${d}`);
                                  setNewEndDate(`${y}-${m}-${d}`);
                                  setCalendarOpenFor(null);
                                  setEstimatedPriceDifference(null);
                                  setEstimatedPriceDifferenceRaw(null);
                                }}
                                onClearDate={() => {
                                  setNewStartDate('');
                                  setEstimatedPriceDifference(null);
                                  setEstimatedPriceDifferenceRaw(null);
                                }}
                                minDate={(() => {
                                  const startOfToday = new Date();
                                  startOfToday.setHours(0, 0, 0, 0);
                                  return startOfToday;
                                })()}
                                currentMonth={startCalendarMonth}
                                onMonthChange={(d) => setStartCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1))}
                                availableDates={updateModalAvailableDates === null ? new Set() : updateModalAvailableDates}
                                onClose={() => setCalendarOpenFor(null)}
                                closeLabel="Fermer"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Heure de début</label>
                        <select
                          value={newStartTime?.slice(0, 2) ? `${newStartTime.slice(0, 2)}:00` : '00:00'}
                          onChange={(e) => {
                            const v = e.target.value;
                            setNewStartTime(v);
                            setEstimatedPriceDifference(null);
                            setEstimatedPriceDifferenceRaw(null);
                            // Si l'heure de fin est avant ou égale à la nouvelle heure de début, la corriger
                            const endNorm = newEndTime?.slice(0, 2) ? `${newEndTime.slice(0, 2)}:00` : '23:00';
                            if (endNorm <= v) {
                              const next = HOUR_OPTIONS.find((h) => h > v);
                              setNewEndTime(next ?? v);
                            }
                          }}
                          className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white cursor-pointer"
                        >
                          {HOUR_OPTIONS.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Heure de fin</label>
                        <select
                          value={(() => {
                            const startNorm = newStartTime?.slice(0, 2) ? `${newStartTime.slice(0, 2)}:00` : '00:00';
                            const validEnds = HOUR_OPTIONS.filter((h) => h > startNorm);
                            const endNorm = newEndTime?.slice(0, 2) ? `${newEndTime.slice(0, 2)}:00` : '23:00';
                            if (validEnds.length === 0) return startNorm;
                            return validEnds.includes(endNorm) ? endNorm : validEnds[0];
                          })()}
                          onChange={(e) => {
                            setNewEndTime(e.target.value);
                            setEstimatedPriceDifference(null);
                            setEstimatedPriceDifferenceRaw(null);
                          }}
                          className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white cursor-pointer"
                        >
                          {(() => {
                            const startNorm = newStartTime?.slice(0, 2) ? `${newStartTime.slice(0, 2)}:00` : '00:00';
                            const validEnds = HOUR_OPTIONS.filter((h) => h > startNorm);
                            if (validEnds.length === 0) {
                              return <option value={startNorm}>— (réduire l&apos;heure de début)</option>;
                            }
                            return validEnds.map((h) => <option key={h} value={h}>{h}</option>);
                          })()}
                        </select>
                      </div>
                    </div>
                    {/* En mode horaire, date de fin = date de début (sera recalculé à l'envoi) */}
                  </div>
                ) : (
                  <>
                {/* Date de début (Jour / Semaine / Mois) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date de début</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarOpenFor(prev => prev === 'start' ? null : 'start');
                        if (!newStartDate) {
                          const d = new Date();
                          d.setDate(1);
                          setStartCalendarMonth(d);
                        } else {
                          const [y, m] = newStartDate.split('-').map(Number);
                          setStartCalendarMonth(new Date(y, m - 1, 1));
                        }
                      }}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-left text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer flex items-center justify-between"
                    >
                      <span className={newStartDate ? 'font-medium' : 'text-slate-500'}>
                        {newStartDate
                          ? new Date(newStartDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                          : 'Choisir une date'}
                      </span>
                      <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    </button>
                    {calendarOpenFor === 'start' && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-[300px] bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-4">
                        {isLoadingUpdateCalendar ? (
                          <p className="text-sm text-slate-600 py-4 text-center">Chargement des disponibilités…</p>
                        ) : (
                        <DatePickerCalendar
                          selectedDate={newStartDate ? new Date(newStartDate + 'T12:00:00') : null}
                          onSelectDate={(date) => {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            const startStr = `${y}-${m}-${d}`;
                            const endStr = getEndDateForPeriod(startStr, updateModalPeriod);
                            // Même logique que fiche bien : vérifier que toute la plage [début, fin] est dispo (aucun jour bloqué au milieu)
                            if (!isDateRangeFullyAvailable(startStr, endStr, updateModalAvailableDates)) {
                              const firstUnav = getFirstUnavailableDateInRange(startStr, endStr, updateModalAvailableDates);
                              const firstStr = firstUnav ? new Date(firstUnav + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                              setUpdateError(firstUnav ? `Certaines dates ne sont pas disponibles (ex. ${firstStr}). Veuillez choisir une autre période.` : 'Certaines dates ne sont pas disponibles.');
                              return;
                            }
                            setNewStartDate(startStr);
                            setNewEndDate(endStr);
                            setUpdateError(null);
                            setCalendarOpenFor(null);
                            setEstimatedPriceDifference(null);
      setEstimatedPriceDifferenceRaw(null);
                          }}
                          onClearDate={() => {
                            setNewStartDate('');
                            setEstimatedPriceDifference(null);
      setEstimatedPriceDifferenceRaw(null);
                          }}
                          minDate={(() => {
                            const startOfToday = new Date();
                            startOfToday.setHours(0, 0, 0, 0);
                            return startOfToday;
                          })()}
                          currentMonth={startCalendarMonth}
                          onMonthChange={(d) => setStartCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1))}
                          availableDates={updateModalAvailableDates === null ? new Set() : updateModalAvailableDates}
                          onClose={() => setCalendarOpenFor(null)}
                          closeLabel="Fermer"
                        />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-slate-600 mb-1">Heure (optionnel)</label>
                    <select
                      value={newStartTime?.slice(0, 2) ? `${newStartTime.slice(0, 2)}:00` : '00:00'}
                      onChange={(e) => {
                        setNewStartTime(e.target.value);
                        setEstimatedPriceDifference(null);
                        setEstimatedPriceDifferenceRaw(null);
                      }}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white cursor-pointer"
                    >
                      {HOUR_OPTIONS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date de fin */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date de fin</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarOpenFor(prev => prev === 'end' ? null : 'end');
                        if (!newEndDate) {
                          const d = new Date();
                          d.setDate(1);
                          setEndCalendarMonth(d);
                        } else {
                          const [y, m] = newEndDate.split('-').map(Number);
                          setEndCalendarMonth(new Date(y, m - 1, 1));
                        }
                      }}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-left text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer flex items-center justify-between"
                    >
                      <span className={newEndDate ? 'font-medium' : 'text-slate-500'}>
                        {newEndDate
                          ? new Date(newEndDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                          : 'Choisir une date'}
                      </span>
                      <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    </button>
                    {calendarOpenFor === 'end' && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-[300px] bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-4">
                        {isLoadingUpdateCalendar ? (
                          <p className="text-sm text-slate-600 py-4 text-center">Chargement des disponibilités…</p>
                        ) : (
                        <DatePickerCalendar
                          selectedDate={newEndDate ? new Date(newEndDate + 'T12:00:00') : null}
                          onSelectDate={(date) => {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            const clickedStr = `${y}-${m}-${d}`;
                            let endStr: string;
                            if (!newStartDate) {
                              endStr = clickedStr;
                            } else if (updateModalPeriod === 'daily') {
                              endStr = clickedStr;
                            } else if (updateModalPeriod === 'weekly') {
                              const start = new Date(newStartDate + 'T12:00:00');
                              const clicked = new Date(clickedStr + 'T12:00:00');
                              const daysDiff = Math.ceil((clicked.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                              const weeks = Math.max(1, Math.ceil(daysDiff / 7));
                              const end = new Date(start);
                              end.setDate(end.getDate() + weeks * 7);
                              const ey = end.getFullYear();
                              const em = String(end.getMonth() + 1).padStart(2, '0');
                              const ed = String(end.getDate()).padStart(2, '0');
                              endStr = `${ey}-${em}-${ed}`;
                            } else if (updateModalPeriod === 'monthly') {
                              const start = new Date(newStartDate + 'T12:00:00');
                              const clicked = new Date(clickedStr + 'T12:00:00');
                              const monthsDiff = (clicked.getFullYear() - start.getFullYear()) * 12 + (clicked.getMonth() - start.getMonth());
                              const n = Math.max(1, monthsDiff);
                              const end = new Date(start);
                              end.setMonth(end.getMonth() + n);
                              const ey = end.getFullYear();
                              const em = String(end.getMonth() + 1).padStart(2, '0');
                              const ed = String(end.getDate()).padStart(2, '0');
                              endStr = `${ey}-${em}-${ed}`;
                            } else {
                              endStr = clickedStr;
                            }
                            // Même logique que fiche bien : vérifier que toute la plage [début, fin] est dispo
                            if (!isDateRangeFullyAvailable(newStartDate, endStr, updateModalAvailableDates)) {
                              const firstUnav = getFirstUnavailableDateInRange(newStartDate, endStr, updateModalAvailableDates);
                              const firstStr = firstUnav ? new Date(firstUnav + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                              setUpdateError(firstUnav ? `Certaines dates ne sont pas disponibles (ex. ${firstStr}). Veuillez choisir une autre date de fin.` : 'Certaines dates ne sont pas disponibles.');
                              return;
                            }
                            setNewEndDate(endStr);
                            setUpdateError(null);
                            setCalendarOpenFor(null);
                            setEstimatedPriceDifference(null);
      setEstimatedPriceDifferenceRaw(null);
                          }}
                          onClearDate={() => {
                            setNewEndDate('');
                            setEstimatedPriceDifference(null);
      setEstimatedPriceDifferenceRaw(null);
                          }}
                          minDate={newStartDate ? (() => {
                            const [y, m, d] = newStartDate.split('-').map(Number);
                            const min = new Date(y, m - 1, d);
                            min.setHours(0, 0, 0, 0);
                            // Pour Semaine/Mois, date de fin min = période complète (comme fiche bien)
                            if (updateModalPeriod === 'weekly') {
                              min.setDate(min.getDate() + 7);
                            } else if (updateModalPeriod === 'monthly') {
                              min.setMonth(min.getMonth() + 1);
                            }
                            return min;
                          })() : (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; })()}
                          currentMonth={endCalendarMonth}
                          onMonthChange={(d) => setEndCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1))}
                          availableDates={updateModalAvailableDates === null ? new Set() : updateModalAvailableDates}
                          onClose={() => setCalendarOpenFor(null)}
                          closeLabel="Fermer"
                        />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-slate-600 mb-1">Heure (optionnel)</label>
                    <select
                      value={newEndTime?.slice(0, 2) ? `${newEndTime.slice(0, 2)}:00` : '00:00'}
                      onChange={(e) => {
                        setNewEndTime(e.target.value);
                        setEstimatedPriceDifference(null);
                        setEstimatedPriceDifferenceRaw(null);
                      }}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white cursor-pointer"
                    >
                      {HOUR_OPTIONS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
                  </>
                )}
              </div>

              {/* Validation durée min. (Jour / Semaine / Mois uniquement) */}
              {updateModalPeriod !== 'hourly' && newStartDate && newEndDate && (() => {
                const place = reservationToUpdate ? placesData.get(reservationToUpdate.spaceId) : null;
                const minDays = place?.minDays && place.minDays > 0 ? place.minDays : 0;
                if (minDays === 0) return null;
                const distinctDays = getDistinctCalendarDays(newStartDate, newEndDate);
                if (distinctDays >= minDays) return null;
                return (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">
                      Ce bien nécessite une location d&apos;au moins {minDays} jour{minDays > 1 ? "s" : ""} (jours différents). Vous avez sélectionné {distinctDays} jour{distinctDays > 1 ? "s" : ""}.
                    </p>
                  </div>
                );
              })()}

              {/* Estimation de la différence de prix */}
              {newStartDate && newEndDate && (
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">Différence de prix</span>
                    {isEstimating && (
                      <span className="text-xs text-slate-500">Calcul en cours...</span>
                    )}
                  </div>
                  {estimatedPriceDifference !== null ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        {estimatedPriceDifference > 0 ? (
                          <>
                            <span className="text-2xl font-bold text-red-600">+{estimatedPriceDifference.toFixed(2)}€</span>
                            <span className="text-sm text-slate-600">
                              (supplément à payer)
                            </span>
                          </>
                        ) : estimatedPriceDifference < 0 ? (
                        <>
                          <span className="text-2xl font-bold text-emerald-600">{estimatedPriceDifference.toFixed(2)}€</span>
                          <span className="text-sm text-emerald-600">
                            (remboursement prévu)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-slate-600">0€</span>
                          <span className="text-sm text-slate-600">
                            (aucune différence)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {isEstimating ? 'Calcul de la différence de prix...' : 'La différence de prix sera calculée automatiquement'}
                    </p>
                  )}
                </div>
              )}

              {/* Message d'erreur */}
              {updateError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{updateError}</p>
                </div>
              )}

              {/* Informations importantes — uniquement si le bien est en réservation avec approbation */}
              {(() => {
                const place = reservationToUpdate ? placesData.get(reservationToUpdate.spaceId) : null;
                const isApprovalRequired = place?.instantBooking === false;
                if (!isApprovalRequired) return null;
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Important :</strong> Votre demande de modification sera envoyée à l'hôte. 
                      {estimatedPriceDifference !== null && estimatedPriceDifference > 0 && (
                        <span> Si acceptée, vous devrez payer le complément de {estimatedPriceDifference.toFixed(2)}€.</span>
                      )}
                      {estimatedPriceDifference !== null && estimatedPriceDifference < 0 && (
                        <span> Si acceptée, vous serez remboursé de {Math.abs(estimatedPriceDifference).toFixed(2)}€ (hors frais de service).</span>
                      )}
                      {estimatedPriceDifference !== null && estimatedPriceDifference === 0 && (
                        <span> Si acceptée, aucune différence de prix ne sera appliquée.</span>
                      )}
                    </p>
                  </div>
                );
              })()}

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    if (!isRequestingUpdate) {
                      setShowUpdateModal(false);
                      setReservationToUpdate(null);
                      setCalendarOpenFor(null);
                      setUpdateError(null);
                      setEstimatedPriceDifference(null);
      setEstimatedPriceDifferenceRaw(null);
                    }
                  }}
                  disabled={isRequestingUpdate}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRequestUpdate}
                  disabled={isRequestingUpdate || !!updateError || !newStartDate || (updateModalPeriod !== 'hourly' && !newEndDate) || !!(reservationToUpdate && updateModalPeriod !== 'hourly' && (() => {
                    const p = placesData.get(reservationToUpdate.spaceId);
                    return p?.minDays != null && p.minDays > 0 && newStartDate && newEndDate && getDistinctCalendarDays(newStartDate, newEndDate) < p.minDays;
                  })())}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRequestingUpdate ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    (() => {
                      const place = reservationToUpdate ? placesData.get(reservationToUpdate.spaceId) : null;
                      return place?.instantBooking === true ? 'Payer' : 'Envoyer la demande';
                    })()
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de formulaire d'avis */}
      {showReviewModal && reservationToReview && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowReviewModal(false);
              setReservationToReview(null);
              setReviewError(null);
            }}
            aria-hidden="true"
          />
          <div
            className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Laisser un avis</h2>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReservationToReview(null);
                  setReviewError(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Informations sur la réservation */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{reservationToReview.spaceTitle}</h3>
                <p className="text-xs text-slate-600">
                  Réservation du {reservationToReview.startDate.toLocaleDateString('fr-FR')} au {reservationToReview.endDate.toLocaleDateString('fr-FR')}
                </p>
              </div>

              {/* Critères d'évaluation */}
              <div className="space-y-5">
                <p className="text-sm font-semibold text-slate-900">Évaluez votre expérience (note de 1 à 10 pour chaque critère)</p>

                {/* Propreté */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Propreté</label>
                  <StarRating
                    rating={cleanlinessRating}
                    onRatingChange={setCleanlinessRating}
                    maxRating={10}
                  />
                </div>

                {/* Exactitude / Conformité */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Exactitude / Conformité</label>
                  <StarRating
                    rating={accuracyRating}
                    onRatingChange={setAccuracyRating}
                    maxRating={10}
                  />
                </div>

                {/* Arrivée */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Arrivée</label>
                  <StarRating
                    rating={arrivalRating}
                    onRatingChange={setArrivalRating}
                    maxRating={10}
                  />
                </div>

                {/* Communication */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Communication</label>
                  <StarRating
                    rating={communicationRating}
                    onRatingChange={setCommunicationRating}
                    maxRating={10}
                  />
                </div>

                {/* Emplacement */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Emplacement</label>
                  <StarRating
                    rating={locationRating}
                    onRatingChange={setLocationRating}
                    maxRating={10}
                  />
                </div>

                {/* Rapport Qualité/Prix */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rapport Qualité/Prix</label>
                  <StarRating
                    rating={valueForMoneyRating}
                    onRatingChange={setValueForMoneyRating}
                    maxRating={10}
                  />
                </div>
              </div>

              {/* Commentaire */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Commentaire (optionnel)</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Partagez votre expérience..."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              {/* Message d'erreur */}
              {reviewError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{reviewError}</p>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReservationToReview(null);
                    setReviewError(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || cleanlinessRating < 1 || accuracyRating < 1 || arrivalRating < 1 || communicationRating < 1 || locationRating < 1 || valueForMoneyRating < 1}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingReview ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    'Publier l\'avis'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {stripeEmbeddedClientSecret && (
        <StripeEmbeddedCheckout
          clientSecret={stripeEmbeddedClientSecret}
          showCloseButton
          onClose={() => setStripeEmbeddedClientSecret(null)}
        />
      )}
      {depositModalReservation && (
        <DepositSetupModal
          userId={depositModalReservation.userId}
          reservationId={depositModalReservation.reservationId}
          depositAmount={depositModalReservation.depositAmount}
          onSuccess={() => {
            loadReservations();
            setDepositModalReservation(null);
          }}
          onClose={() => setDepositModalReservation(null)}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}

// Composant d'évaluation par étoiles (1-10)
function StarRating({ rating, onRatingChange, maxRating = 10 }: { rating: number; onRatingChange: (rating: number) => void; maxRating?: number }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {Array.from({ length: maxRating }, (_, i) => i + 1).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onRatingChange(value)}
          className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
          aria-label={`Noter ${value} sur ${maxRating}`}
        >
          <Star
            className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${
              value <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-slate-300 fill-slate-300'
            }`}
          />
        </button>
      ))}
      {rating > 0 && (
        <span className="ml-2 text-sm font-semibold text-slate-700">{rating}/{maxRating}</span>
      )}
    </div>
  );
}
