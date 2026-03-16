'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useRef } from 'react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import LoadingLogo from '@/components/ui/loading-logo';
import AnimatedLoadingText from '@/components/ui/animated-loading-text';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, MapPin, Euro, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Car, Box, Warehouse, Star, MessageSquare, User, FileText, CreditCard, Shield, X, Navigation } from 'lucide-react';
import { reservationsAPI, ReservationDTO, placesAPI, PlaceDTO, PlaceAvailabilityDTO, rentoallUsersAPI, UserDTO } from '@/services/api';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { getCancellationPolicyText, epureAddress, getDisplayFirstName, capitalizeFirstPerLine, priceDifferenceWithServiceFee, baseFromTotal, SERVICE_FEE_MIN_EUR, getValidPhoto } from '@/lib/utils';
import { toApiDateTime, fromApiDateTime, toLocalDateString } from '@/lib/datetime';
import { getAppBaseUrl } from '@/lib/app-url';
import { handleCapacitorLinkClick, isCapacitor, capacitorNavigate } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { registerModalClose, unregisterModalClose } from '@/lib/capacitor-modal-back';
import StripeEmbeddedCheckout from '@/components/StripeEmbeddedCheckout';
import DepositSetupModal from '@/components/DepositSetupModal';
import dynamic from 'next/dynamic';
import type { Property } from '@/components/map/PropertiesMapMapLibre';

// Import dynamique pour éviter le SSR
const PropertiesMap = dynamic(() => import('@/components/map/PropertiesMapMapLibre'), {
  ssr: false,
});

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

// Extension de Window pour stocker temporairement la réponse de modification
declare global {
  interface Window {
    pendingUpdateResponse?: boolean;
  }
}

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.id as string;
  
  const [reservation, setReservation] = useState<ReservationDTO | null>(null);
  const [place, setPlace] = useState<PlaceDTO | null>(null);
  const [hostInfo, setHostInfo] = useState<UserDTO | null>(null);
  const [clientInfo, setClientInfo] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelErrorModal, setShowCancelErrorModal] = useState(false);
  
  // États pour la modification de réservation
  const [showUpdateModal, setShowUpdateModal] = useState(false);
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
  const [newStartTime, setNewStartTime] = useState<string>('');
  const [newEndTime, setNewEndTime] = useState<string>('');
  const [isRequestingUpdate, setIsRequestingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [estimatedPriceDifference, setEstimatedPriceDifference] = useState<number | null>(null);
  const [estimatedPriceDifferenceRaw, setEstimatedPriceDifferenceRaw] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  
  // États pour le calendrier personnalisé
  const [calendarAvailabilities, setCalendarAvailabilities] = useState<PlaceAvailabilityDTO[]>([]);
  const [calendarOccupiedSlots, setCalendarOccupiedSlots] = useState<Array<{ start?: string; end?: string; startDateTime?: string; endDateTime?: string; reservationId?: number }>>([]);
  const [isLoadingAvailabilities, setIsLoadingAvailabilities] = useState(false);
  const [calendarStartMonth, setCalendarStartMonth] = useState<Date>(new Date());
  const [calendarEndMonth, setCalendarEndMonth] = useState<Date>(new Date());
  const [selectingDateType, setSelectingDateType] = useState<'start' | 'end' | null>(null);
  const [selectedStartDateObj, setSelectedStartDateObj] = useState<Date | null>(null);
  const [selectedEndDateObj, setSelectedEndDateObj] = useState<Date | null>(null);
  
  // États pour répondre à une demande (côté hôte)
  const [isResponding, setIsResponding] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [stripeEmbeddedClientSecret, setStripeEmbeddedClientSecret] = useState<string | null>(null);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  
  // Charger la réservation depuis l'API
  useEffect(() => {
    const loadReservation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Extraire l'ID numérique de l'URL
        // Format possible : "2319" ou "res-2319-1769554800000-0"
        let id: number;
        if (reservationId.startsWith('res-')) {
          // Format: res-{id}-{timestamp}-{index}
          const parts = reservationId.split('-');
          id = parseInt(parts[1] || reservationId, 10);
        } else {
          // Format numérique direct
          id = parseInt(reservationId, 10);
        }
        
        if (isNaN(id) || id <= 0) {
          console.error('❌ [RESERVATION DETAIL] ID invalide:', reservationId, '→', id);
          setError('ID de réservation invalide');
          setIsLoading(false);
          return;
        }
        
        console.log('🔵 [RESERVATION DETAIL] Chargement de la réservation:', id, '(depuis URL:', reservationId, ')');
        
        // Récupérer la réservation
        const reservationData: ReservationDTO = await reservationsAPI.getById(id);
        console.log('✅ [RESERVATION DETAIL] Réservation récupérée:', reservationData);
        setReservation(reservationData);
        
        // Récupérer les détails du bien
        try {
          const allPlaces = await placesAPI.search({});
          const placeData = allPlaces.find(p => p.id === reservationData.placeId);
          if (placeData) {
            console.log('✅ [RESERVATION DETAIL] Bien récupéré:', placeData);
            setPlace(placeData);
            
            // Récupérer les infos du propriétaire si on est en mode GUEST
            if (reservationData.userRole === 'GUEST') {
              try {
                const ownerInfo = await rentoallUsersAPI.getProfile(placeData.ownerId);
                setHostInfo(ownerInfo);
              } catch (err) {
                console.error('❌ [RESERVATION DETAIL] Erreur lors de la récupération du propriétaire:', err);
              }
            }
          }
        } catch (err) {
          console.error('❌ [RESERVATION DETAIL] Erreur lors de la récupération du bien:', err);
        }
        
        // Récupérer les infos du client si on est en mode HOST
        if (reservationData.userRole === 'HOST') {
          try {
            const clientData = await rentoallUsersAPI.getProfile(reservationData.clientId);
            setClientInfo(clientData);
          } catch (err) {
            console.error('❌ [RESERVATION DETAIL] Erreur lors de la récupération du client:', err);
          }
        }
      } catch (err) {
        console.error('❌ [RESERVATION DETAIL] Erreur lors du chargement:', err);
        setError('Erreur lors du chargement de la réservation');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReservation();
  }, [reservationId]);

  // Synchroniser les dates sélectionnées avec les états string
  useEffect(() => {
    if (newStartDate && !selectedStartDateObj) {
      const date = new Date(newStartDate);
      date.setHours(0, 0, 0, 0);
      setSelectedStartDateObj(date);
    }
    if (newEndDate && !selectedEndDateObj) {
      const date = new Date(newEndDate);
      date.setHours(0, 0, 0, 0);
      setSelectedEndDateObj(date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newStartDate, newEndDate]);

  // Estimer automatiquement la différence de prix quand les dates changent
  useEffect(() => {
    if (showUpdateModal && reservation && newStartDate && newEndDate) {
      // Délai pour éviter trop d'appels API
      const timeoutId = setTimeout(async () => {
        if (!reservation || !newStartDate || !newEndDate) return;
        
        try {
          setIsEstimating(true);
          const reservationType: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' =
            (reservation.reservationType === 'HOURLY' || reservation.reservationType === 'DAILY' || reservation.reservationType === 'WEEKLY' || reservation.reservationType === 'MONTHLY')
              ? reservation.reservationType
              : 'DAILY';
          // Mode jour + lieu chargé : frais 8 % (min 1,50 €) sur la différence de montant à rajouter uniquement
          if (reservationType === 'DAILY' && place) {
            const newBasePrice = getBasePriceForDailyRange(place, newStartDate, newEndDate);
            const currentTotal = reservation.totalPrice ?? 0;
            const oldBase = baseFromTotal(currentTotal);
            const differenceBase = Math.round((newBasePrice - oldBase) * 100) / 100;
            const diff = priceDifferenceWithServiceFee(differenceBase);
            setEstimatedPriceDifference(diff);
            setEstimatedPriceDifferenceRaw(diff);
            setIsEstimating(false);
            return;
          }
          const startDateTime = new Date(`${newStartDate}T${newStartTime || '00:00'}`);
          const endDateTime = new Date(`${newEndDate}T${newEndTime || '00:00'}`);
          if (reservationType === 'HOURLY' && endDateTime <= startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);
          
          const priceDifference = await reservationsAPI.estimateUpdate(
            reservation.id,
            toApiDateTime(startDateTime),
            toApiDateTime(endDateTime),
            reservationType
          );
          // Frais sur la différence : 8 %, min 1,50 €
          const withFee = priceDifferenceWithServiceFee(priceDifference);
          setEstimatedPriceDifference(withFee);
          setEstimatedPriceDifferenceRaw(withFee);
        } catch (err) {
          console.error('❌ [RESERVATION DETAIL] Erreur lors de l\'estimation:', err);
          setEstimatedPriceDifference(null);
          setEstimatedPriceDifferenceRaw(null);
        } finally {
          setIsEstimating(false);
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [newStartDate, newEndDate, newStartTime, newEndTime, showUpdateModal, reservation, place]);

  // Calculer les coordonnées pour la carte (doit être avant tout return conditionnel pour respecter l'ordre des Hooks)
  const mapCenter = useMemo(() => {
    if (!place) return undefined;
    const placeWithCoords = place as PlaceDTO & { latitude?: number; lat?: number; longitude?: number; lng?: number };
    let lat: number | null = placeWithCoords?.latitude ?? placeWithCoords?.lat ?? null;
    let lng: number | null = placeWithCoords?.longitude ?? placeWithCoords?.lng ?? null;
    if (typeof lat === 'string') lat = parseFloat(lat);
    if (typeof lng === 'string') lng = parseFloat(lng);
    const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
      'Paris': { lat: 48.8566, lng: 2.3522 },
      'Lyon': { lat: 45.7640, lng: 4.8357 },
      'Marseille': { lat: 43.2965, lng: 5.3698 },
      'Toulouse': { lat: 43.6047, lng: 1.4442 },
      'Nice': { lat: 43.7102, lng: 7.2620 },
    };
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      const cityCoords = CITY_COORDINATES[place.city] || CITY_COORDINATES['Paris'];
      lat = cityCoords.lat;
      lng = cityCoords.lng;
    }
    return { lat: Number(lat), lng: Number(lng), zoom: 15 };
  }, [place]);

  // Créneaux occupés effectifs : fusion place + calendrier (même logique que fiche bien), dédupliqués par start (doit être avant tout return pour respecter l'ordre des Hooks)
  const effectiveOccupiedSlots = useMemo(() => {
    const fromPlace = (place?.occupiedSlots ?? []) as Array<{ start?: string; end?: string; startDateTime?: string; endDateTime?: string; reservationId?: number }>;
    const fromCalendar = calendarOccupiedSlots;
    const byStart = new Map<string, (typeof fromCalendar)[0]>();
    [...fromPlace, ...fromCalendar].forEach((slot) => {
      const key = slot.start ?? (slot as { startDateTime?: string }).startDateTime ?? '';
      if (key && !byStart.has(key)) byStart.set(key, slot);
    });
    return Array.from(byStart.values());
  }, [place?.occupiedSlots, calendarOccupiedSlots]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <HeaderNavigation />
        <main className="pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-16 flex-1 flex items-center justify-center mobile-page-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="text-center">
            <div className="md:hidden mb-4">
              <LoadingLogo size="md" />
            </div>
            <div className="hidden md:block mb-4">
              <LoadingLogo size="md" />
            </div>
            <AnimatedLoadingText label="Chargement de la réservation..." className="mt-2" />
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  // Error state
  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HeaderNavigation />
        <main className="pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold text-slate-900 mb-4">Réservation introuvable</h1>
              <p className="text-slate-600 mb-6">{error || 'La réservation demandée n\'existe pas.'}</p>
            </div>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

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
      case 'update_rejected':
        return { icon: XCircle, color: 'red', label: 'Modification refusée', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
      default:
        return { icon: AlertCircle, color: 'slate', label: status, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PARKING': return Car;
      case 'STORAGE_SPACE': return Box;
      case 'CAVE': return Warehouse;
      default: return Car;
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PARKING': return 'Parking';
      case 'STORAGE_SPACE': return 'Stockage';
      case 'CAVE': return 'Cave et Divers';
      default: return 'Parking';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusConfig = getStatusConfig(reservation.status);
  const StatusIcon = statusConfig.icon;
  
  // Dates de la réservation (back envoie UTC → on parse avec fromApiDateTime pour afficher en local)
  const startDate = fromApiDateTime(reservation.startDateTime);
  const endDate = fromApiDateTime(reservation.endDateTime);
  const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const hoursCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  
  // Vérifier si le bien supporte les réservations horaires
  const hasHourlyPricing = place?.hourPriceActive === true || (place?.pricePerHour !== undefined && place.pricePerHour > 0);
  
  const defaultImage = getValidPhoto(place?.photos, place?.type);
  
  // Titre : titre du bien en priorité, sinon description ou type + ville
  const spaceTitle = capitalizeFirstPerLine(
    (place?.title && String(place.title).trim())
      ? place.title
      : (place?.description
        ? place.description.split('.').slice(0, 1).join('.') || `${getTypeLabel(place.type)} - ${place.city}`
        : place
        ? `${getTypeLabel(place.type)} - ${place.city}`
        : 'Espace')
  );
  
  const TypeIcon = place ? getTypeIcon(place.type) : Car;
  const spaceLocation = place?.city || place?.address || 'Localisation non disponible';
  
  // Informations de l'hôte ou du client selon le rôle (prénom uniquement)
  const displayName = reservation.userRole === 'GUEST' 
    ? getDisplayFirstName(hostInfo, 'Propriétaire')
    : getDisplayFirstName(clientInfo, 'Client');
  
  // Fonction pour obtenir l'itinéraire Google Maps
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
  
  const displayAvatar = reservation.userRole === 'GUEST'
    ? ((typeof hostInfo?.profilePicture === 'string' ? hostInfo.profilePicture : null) || '/logoR.png')
    : ((typeof clientInfo?.profilePicture === 'string' ? clientInfo.profilePicture : null) || '/logoR.png');
  
  // ID de l'autre utilisateur pour la messagerie
  const otherUserId = reservation.userRole === 'GUEST' 
    ? place?.ownerId 
    : reservation.clientId;
  
  // Fonction pour ouvrir la messagerie avec l'autre utilisateur
  const handleContactUser = () => {
    if (!place || !otherUserId) {
      console.error('❌ [RESERVATION DETAIL] Impossible de contacter : place ou otherUserId manquant');
      return;
    }
    // Rediriger vers la page de messages avec les paramètres placeId et userId
    const msgPath = `/messages?placeId=${place.id}&userId=${otherUserId}`;
    if (isCapacitor()) { capacitorNavigate(msgPath); } else { router.push(msgPath); }
  };
  
  // Vérifier si la réservation peut être annulée
  const canCancel = () => {
    const today = new Date();
    const start = fromApiDateTime(reservation.startDateTime);
    const statusLower = reservation.status.toLowerCase();
    const cancellableStatuses = [
      'confirmed', 'confirmée', 'pending', 'en attente',
      'awaiting_update_payment', 'update_accepted',
    ];
    return start > today && cancellableStatuses.includes(statusLower);
  };

  // Vérifier si la réservation peut être modifiée (côté client)
  const canRequestUpdate = () => {
    const today = new Date();
    const start = fromApiDateTime(reservation.startDateTime);
    const statusLower = reservation.status.toLowerCase();
    const isConfirmed = statusLower === 'confirmed' || statusLower === 'confirmée';
    const isNotUpdateStatus = statusLower !== 'update_requested' && statusLower !== 'update_accepted';
    return reservation.userRole === 'GUEST' && 
           start > today && 
           isConfirmed &&
           isNotUpdateStatus;
  };

  // Vérifier si l'hôte peut répondre à une demande
  const canRespondToUpdate = () => {
    return reservation.userRole === 'HOST' && reservation.status === 'UPDATE_REQUESTED';
  };

  // Vérifier si le client doit payer le complément
  const needsPayment = () => {
    return reservation.userRole === 'GUEST' && 
           reservation.status === 'UPDATE_ACCEPTED' && 
           reservation.priceDifference !== undefined && 
           reservation.priceDifference > 0;
  };

  // Charger les disponibilités du bien pour le calendrier (même logique que fiche bien : getPlaceCalendar)
  const loadAvailabilities = async (placeId: number) => {
    if (!placeId) return;
    
    try {
      setIsLoadingAvailabilities(true);
      // Charger les disponibilités pour les 6 prochains mois (comme la fiche bien)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Commencer 1 mois avant
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 12); // 12 mois après pour couvrir la navigation
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      const calendarData = await placesAPI.getPlaceCalendar(placeId, startStr, endStr);
      setCalendarAvailabilities(calendarData?.availabilities ?? []);
      setCalendarOccupiedSlots(calendarData?.occupiedSlots ?? []);
      
      console.log('✅ [RESERVATION DETAIL] Disponibilités chargées (getPlaceCalendar):', calendarData?.availabilities?.length, 'dates,', calendarData?.occupiedSlots?.length, 'créneaux occupés');
    } catch (error) {
      console.error('❌ [RESERVATION DETAIL] Erreur lors du chargement des disponibilités:', error);
      setCalendarAvailabilities([]);
      setCalendarOccupiedSlots([]);
    } finally {
      setIsLoadingAvailabilities(false);
    }
  };

  // Vérifier si une date est disponible (strictement identique à la fiche du bien : calendrier d'abord, puis place, puis availableFrom/To)
  const isDateAvailable = (date: Date): boolean => {
    if (!place) return false;
    
    const dateStr = toLocalDateString(date);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    // Calendrier (getPlaceCalendar) en priorité : si on a une entrée pour cette date, l'utiliser (dates bloquées par l'hôte)
    if (calendarAvailabilities.length > 0) {
      const calendarEntry = calendarAvailabilities.find(av => av.date === dateStr);
      if (calendarEntry !== undefined) return calendarEntry.available === true;
    }
    
    // Sinon place.availabilities
    if (place.availabilities && place.availabilities.length > 0) {
      const entriesForDate = place.availabilities.filter(av => av.date === dateStr);
      if (entriesForDate.length > 0) return entriesForDate.some(av => av.available === true);
      return false;
    }
    
    // Sinon dates globales (availableFrom, availableTo)
    if (place.availableFrom && place.availableTo) {
      const fromDate = new Date(place.availableFrom);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(place.availableTo);
      toDate.setHours(23, 59, 59, 999);
      return dateOnly >= fromDate && dateOnly <= toDate;
    }
    
    return false;
  };

  // Vérifier si une date/heure est occupée (même logique que fiche bien : effectiveOccupiedSlots = place + calendrier)
  const isDateTimeOccupied = (date: Date): boolean => {
    if (effectiveOccupiedSlots.length === 0) return false;
    
    const checkDate = new Date(date);
    const checkDateStr = toLocalDateString(checkDate);
    
    return effectiveOccupiedSlots.some(slot => {
      const slotWithDates = slot as { start?: string; end?: string; startDateTime?: string; endDateTime?: string };
      const slotStart = slot.start ? fromApiDateTime(slot.start) : (slotWithDates.startDateTime ? fromApiDateTime(slotWithDates.startDateTime) : new Date());
      const slotEnd = slot.end ? fromApiDateTime(slot.end) : (slotWithDates.endDateTime ? fromApiDateTime(slotWithDates.endDateTime) : new Date());
      const slotStartStr = toLocalDateString(slotStart);
      const slotEndStr = toLocalDateString(slotEnd);
      
      const slotWithReservationId = slot as unknown as { reservationId?: number; [key: string]: unknown };
      if (slotWithReservationId.reservationId === reservation?.id) return false;
      
      return checkDateStr >= slotStartStr && checkDateStr <= slotEndStr;
    });
  };

  // Demander une modification (côté client)
  const handleRequestUpdate = async () => {
    // Initialiser avec les dates actuelles
    const currentStart = fromApiDateTime(reservation.startDateTime);
    const currentEnd = fromApiDateTime(reservation.endDateTime);
    
    // Formater pour les inputs date (YYYY-MM-DD)
    setNewStartDate(currentStart.toISOString().split('T')[0]);
    setNewEndDate(currentEnd.toISOString().split('T')[0]);
    
    // Formater pour les inputs time : heures pleines uniquement (HH:00), comme sur la fiche bien
    setNewStartTime(`${String(currentStart.getHours()).padStart(2, '0')}:00`);
    setNewEndTime(`${String(currentEnd.getHours()).padStart(2, '0')}:00`);
    
    // Initialiser les dates sélectionnées
    setSelectedStartDateObj(currentStart);
    setSelectedEndDateObj(currentEnd);
    setCalendarStartMonth(new Date(currentStart));
    setCalendarEndMonth(new Date(currentEnd));
    
    // Charger les disponibilités du bien
    if (place?.id) {
      await loadAvailabilities(place.id);
    }
    
    setShowUpdateModal(true);
    setUpdateError(null);
    setEstimatedPriceDifference(null);
    setEstimatedPriceDifferenceRaw(null);
    setSelectingDateType(null);
  };

  const confirmRequestUpdate = async () => {
    if (!newStartDate || !newEndDate) {
      setUpdateError('Veuillez sélectionner les nouvelles dates');
      return;
    }

    try {
      setIsRequestingUpdate(true);
      setUpdateError(null);

      // Construire les dates complètes avec l'heure (locale) puis envoyer en UTC au back
      const startDateTime = new Date(`${newStartDate}T${newStartTime || '00:00'}`);
      const endDateTime = new Date(`${newEndDate}T${newEndTime || '00:00'}`);

      const newStartDateTimeISO = toApiDateTime(startDateTime);
      const newEndDateTimeISO = toApiDateTime(endDateTime);

      console.log('🔵 [RESERVATION DETAIL] Demande de modification:', {
        reservationId: reservation.id,
        newStartDateTime: newStartDateTimeISO,
        newEndDateTime: newEndDateTimeISO,
      });

      const updatedReservation = await reservationsAPI.requestUpdate(
        reservation.id,
        reservation.placeId,
        newStartDateTimeISO,
        newEndDateTimeISO
      );

      console.log('✅ [RESERVATION DETAIL] Modification demandée:', updatedReservation);
      
      // Bien non instantané → backend renvoie UPDATE_REQUESTED (demande envoyée à l'hôte)
      // Bien instantané + supplément à payer → backend renvoie AWAITING_UPDATE_PAYMENT → rediriger vers paiement
      // Modification gratuite ou moins chère → CONFIRMED / UPDATE_ACCEPTED sans paiement
      const status = updatedReservation.status?.toUpperCase?.() ?? updatedReservation.status ?? '';
      const isAwaitingPayment = status === 'AWAITING_UPDATE_PAYMENT' || updatedReservation.status?.toLowerCase() === 'awaiting_update_payment';
      const isUpdateAccepted = status === 'UPDATE_ACCEPTED' || updatedReservation.status?.toLowerCase() === 'update_accepted';
      const needsPayment = (isAwaitingPayment || isUpdateAccepted) && updatedReservation.priceDifference != null && updatedReservation.priceDifference > 0;

      if (needsPayment) {
        console.log('💰 [RESERVATION DETAIL] Redirection vers paiement du supplément');
        setShowUpdateModal(false);
        setUpdateError(null);
        await handlePayUpdateDifference();
        return;
      }

      // Recharger la réservation (demande envoyée à l'hôte, ou modification appliquée)
      const reloadedReservation = await reservationsAPI.getById(reservation.id);
      setReservation(reloadedReservation);
      
      setShowUpdateModal(false);
      setUpdateError(null);
    } catch (error) {
      console.error('❌ [RESERVATION DETAIL] Erreur lors de la demande de modification:', error);
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

  // Répondre à une demande de modification (côté hôte)
  const handleRespondToUpdate = (accepted: boolean) => {
    setShowRespondModal(true);
    // Stocker la réponse dans un état temporaire
      window.pendingUpdateResponse = accepted;
  };

  const confirmRespondToUpdate = async () => {
    const accepted = window.pendingUpdateResponse;
    
    if (accepted === undefined) {
      setError('Erreur : réponse invalide');
      return;
    }
    
    try {
      setIsResponding(true);
      
      const updatedReservation = await reservationsAPI.respondUpdate(reservation.id, accepted);
      
      console.log('✅ [RESERVATION DETAIL] Réponse envoyée:', updatedReservation);
      
      // Recharger la réservation
      const reloadedReservation = await reservationsAPI.getById(reservation.id);
      setReservation(reloadedReservation);
      
      setShowRespondModal(false);
      delete window.pendingUpdateResponse;
    } catch (error) {
      console.error('❌ [RESERVATION DETAIL] Erreur lors de la réponse:', error);
      setError('Erreur lors de la réponse à la demande. Veuillez réessayer.');
      setShowRespondModal(false);
      delete window.pendingUpdateResponse;
    } finally {
      setIsResponding(false);
    }
  };

  // Payer le complément (côté client)
  const handlePayUpdateDifference = async () => {
    try {
      const baseUrl = getAppBaseUrl();
      const successUrl = `${baseUrl}/reservations/${reservation.id}?payment=success`;
      const cancelUrl = `${baseUrl}/reservations/${reservation.id}?payment=cancel`;

      const amountToCharge =
        reservation.priceDifference != null && reservation.priceDifference > 0
          ? reservation.priceDifference
          : undefined;

      const response = await reservationsAPI.createUpdateCheckout(
        reservation.id,
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
      console.error('❌ [RESERVATION DETAIL] Erreur lors de la création de la session de paiement:', error);
      setError('Erreur lors de la création de la session de paiement. Veuillez réessayer.');
    }
  };

  // Fonction pour rendre le calendrier personnalisé
  const renderCalendar = (type: 'start' | 'end') => {
    const currentMonth = type === 'start' ? calendarStartMonth : calendarEndMonth;
    const setCurrentMonth = type === 'start' ? setCalendarStartMonth : setCalendarEndMonth;
    const selectedDate = type === 'start' ? selectedStartDateObj : selectedEndDateObj;
    const otherDate = type === 'start' ? selectedEndDateObj : selectedStartDateObj;
    
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      return { daysInMonth, startingDayOfWeek };
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prevMonth = () => {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() - 1);
      setCurrentMonth(newDate);
    };

    const nextMonth = () => {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentMonth(newDate);
    };

    const handleDateClick = (day: number) => {
      const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      clickedDate.setHours(0, 0, 0, 0);
      
      // Vérifier si la date est disponible
      if (!isDateAvailable(clickedDate)) {
        setUpdateError('Cette date n\'est pas disponible selon les paramétrages du propriétaire');
        return;
      }
      
      // Vérifier si la date est occupée (en excluant la réservation actuelle)
      if (isDateTimeOccupied(clickedDate)) {
        setUpdateError('Cette date est déjà réservée');
        return;
      }
      
      // Validation pour la date de fin
      if (type === 'end' && selectedStartDateObj) {
        if (clickedDate <= selectedStartDateObj) {
          setUpdateError('La date de fin doit être après la date de début');
          return;
        }
      }
      
      // Validation pour la date de début
      if (type === 'start' && selectedEndDateObj) {
        if (clickedDate >= selectedEndDateObj) {
          setUpdateError('La date de début doit être avant la date de fin');
          return;
        }
      }
      
      // Mettre à jour la date sélectionnée
      if (type === 'start') {
        setSelectedStartDateObj(clickedDate);
        setNewStartDate(clickedDate.toISOString().split('T')[0]);
      } else {
        setSelectedEndDateObj(clickedDate);
        setNewEndDate(clickedDate.toISOString().split('T')[0]);
      }
      
      // Fermer le calendrier
      setSelectingDateType(null);
      setUpdateError(null);
      setEstimatedPriceDifference(null);
      setEstimatedPriceDifferenceRaw(null);
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-semibold text-slate-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
          {dayNames.map((day, idx) => (
            <div key={idx} className="text-center text-[10px] sm:text-xs font-semibold text-slate-500 py-1 sm:py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square min-w-0" />
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dateOnly = new Date(date);
            dateOnly.setHours(0, 0, 0, 0);
            const isPast = dateOnly < today;
            const isSelected = selectedDate && dateOnly.getTime() === selectedDate.getTime();
            const isInRange = selectedStartDateObj && selectedEndDateObj && 
                             dateOnly > selectedStartDateObj && dateOnly < selectedEndDateObj;
            const isAvailable = isDateAvailable(date);
            const isOccupied = isDateTimeOccupied(date);
            
            // Désactiver les dates passées, non disponibles ou occupées
            let isDisabled = isPast || !isAvailable || isOccupied;
            
            // Validation supplémentaire pour la date de fin
            if (type === 'end' && selectedStartDateObj && dateOnly <= selectedStartDateObj) {
              isDisabled = true;
            }
            
            // Validation supplémentaire pour la date de début
            if (type === 'start' && selectedEndDateObj && dateOnly >= selectedEndDateObj) {
              isDisabled = true;
            }
            
            return (
              <button
                id={day ? `btn-calendar-day-${day}-${currentMonth.getMonth()}-${currentMonth.getFullYear()}-reservation` : undefined}
                key={day}
                disabled={isDisabled}
                onClick={() => handleDateClick(day)}
                className={`aspect-square min-w-0 flex items-center justify-center text-[11px] sm:text-sm rounded-lg font-medium transition-colors max-md:min-h-[28px] ${
                  isDisabled
                    ? !isAvailable
                      ? 'text-slate-300 cursor-not-allowed bg-slate-100 opacity-40 border border-slate-200' // Grisé pour dates non disponibles
                      : 'text-slate-300 cursor-not-allowed bg-slate-50 opacity-50' // Autres cas désactivés
                    : isSelected
                    ? 'bg-emerald-600 text-white shadow-md cursor-pointer'
                    : isInRange
                    ? 'bg-emerald-50 text-emerald-700 cursor-pointer'
                    : 'hover:bg-emerald-50 text-slate-700 cursor-pointer border border-transparent hover:border-emerald-200'
                }`}
                title={
                  !isAvailable
                    ? 'Date non disponible selon les paramétrages du propriétaire'
                    : isOccupied 
                    ? 'Créneau déjà réservé' 
                    : isPast
                    ? 'Date passée'
                    : 'Date disponible'
                }
              >
                {/* N'afficher le numéro du jour que pour les dates disponibles (comme sur la fiche bien) */}
                {(isAvailable && !isOccupied) ? day : ''}
              </button>
            );
          })}
        </div>
        
        <div className="flex justify-between mt-4 pt-4 border-t border-slate-200">
          <button
            id="btn-calendar-today-reservation"
            onClick={() => {
              const todayDate = new Date();
              todayDate.setHours(0, 0, 0, 0);
              const todayMonth = todayDate.getMonth();
              const todayYear = todayDate.getFullYear();
              
              // Si on n'est pas sur le mois d'aujourd'hui, changer de mois
              if (currentMonth.getMonth() !== todayMonth || currentMonth.getFullYear() !== todayYear) {
                setCurrentMonth(new Date(todayYear, todayMonth, 1));
              }
              
              // Sélectionner la date d'aujourd'hui si disponible
              if (isDateAvailable(todayDate) && !isDateTimeOccupied(todayDate)) {
                handleDateClick(todayDate.getDate());
              }
            }}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Aujourd'hui
          </button>
          <button
            id="btn-close-calendar-reservation"
            onClick={() => setSelectingDateType(null)}
            className="text-xs text-slate-600 hover:text-slate-700 font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  };
  
  // Gérer l'annulation de la réservation
  const handleCancelReservation = () => {
    setShowCancelModal(true);
  };

  const confirmCancelReservation = async () => {
    if (!reservation) return;
    
    try {
      setIsCancelling(true);
      setCancelError(null);
      console.log('🔵 [RESERVATION DETAIL] Annulation de la réservation:', reservation.id);
      
      // Appeler l'API pour annuler la réservation
      const cancelledReservation = await reservationsAPI.cancel(reservation.id);
      
      console.log('✅ [RESERVATION DETAIL] Réservation annulée avec succès:', cancelledReservation);
      
      // Fermer la modal
      setShowCancelModal(false);
      
      // Rediriger vers la page des réservations
      router.push('/reservations');
    } catch (error) {
      console.error('❌ [RESERVATION DETAIL] Erreur lors de l\'annulation:', error);
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
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <HeaderNavigation />
      
      <main className="pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-12 flex-1 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Header - Mobile: Compact et élégant */}
          <div className="mb-3 sm:mb-5 md:mb-6 lg:mb-8">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-1">Réservation #{reservation.id}</h1>
                {reservation.userRole && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium mt-1 ${
                    reservation.userRole === 'GUEST' 
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}>
                    {reservation.userRole === 'GUEST' ? 'Locataire' : 'Propriétaire'}
                  </div>
                )}
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} flex-shrink-0`}>
                <StatusIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-sm font-semibold">{statusConfig.label}</span>
              </div>
            </div>
          </div>

          {/* Mobile : prix payé visible en haut */}
          <div className="md:hidden mb-3 sm:mb-4 p-3 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Prix payé</span>
              <span className="text-xl font-bold text-emerald-600">
                {typeof reservation.totalPrice === 'number' ? reservation.totalPrice.toFixed(2) : '0.00'}€
              </span>
            </div>
            {reservation.userRole === 'HOST' && typeof reservation.hostAmount === 'number' && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Votre revenu</span>
                <span className="font-semibold text-emerald-600">{reservation.hostAmount.toFixed(2)}€</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5 md:gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-6">
              {/* Space Image */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="relative w-full h-40 sm:h-64 md:h-80 bg-slate-100">
                  <Image
                    src={defaultImage}
                    alt={spaceTitle}
                    fill
                    className="object-cover"
                  />
                  {place && (
                    <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-white/95 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-md sm:rounded-lg flex items-center gap-1 sm:gap-2">
                      <TypeIcon className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                      <span className="text-[10px] sm:text-sm font-semibold text-slate-900">
                        {getTypeLabel(place.type)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-6">
                  {place ? (
                    <CapacitorDynamicLink
                      href={`/parking/${place.id}/`}
                      className="block group"
                    >
                      <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-emerald-600 group-active:text-emerald-700 transition-colors underline-offset-2 group-hover:underline cursor-pointer">{spaceTitle}</h2>
                    </CapacitorDynamicLink>
                  ) : (
                    <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2 line-clamp-2">{spaceTitle}</h2>
                  )}
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base text-slate-600 mb-3 sm:mb-4">
                    <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="truncate">{spaceLocation}</span>
                  </div>
                  {place && (
                    <CapacitorDynamicLink
                      href={`/parking/${place.id}/`}
                      className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors text-xs sm:text-sm cursor-pointer"
                    >
                      Voir l'espace
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 rotate-180" />
                    </CapacitorDynamicLink>
                  )}
                </div>
              </div>

              {/* Dates and Duration */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-6">
                <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-600" />
                  <span className="hidden sm:inline">Dates et durée</span>
                  <span className="sm:hidden">Dates</span>
                </h3>
                <div className="space-y-2.5 sm:space-y-4">
                  <div className="flex items-start gap-2 sm:gap-4">
                    <div className="p-1.5 sm:p-3 bg-emerald-50 rounded-lg flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Date de début</p>
                      <p className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">{formatDate(startDate)}</p>
                      <p className="text-[10px] sm:text-sm text-slate-600 mt-0.5 sm:mt-1">{formatTime(startDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-4">
                    <div className="p-1.5 sm:p-3 bg-slate-100 rounded-lg flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Date de fin</p>
                      <p className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">{formatDate(endDate)}</p>
                      <p className="text-[10px] sm:text-sm text-slate-600 mt-0.5 sm:mt-1">{formatTime(endDate)}</p>
                    </div>
                  </div>
                  <div className="pt-2.5 sm:pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-sm text-slate-600">Durée totale</span>
                      <span className="text-sm sm:text-lg font-bold text-slate-900">
                        {daysCount >= 1 ? `${daysCount} jour${daysCount > 1 ? 's' : ''}` : `${hoursCount} heure${hoursCount > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modification Request Info */}
              {(reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'UPDATE_ACCEPTED' || reservation.status === 'UPDATE_REJECTED') && reservation.requestedStartDateTime && reservation.requestedEndDateTime && (
                <div className={`rounded-xl sm:rounded-2xl border shadow-sm p-3 sm:p-6 ${
                  reservation.status === 'UPDATE_REQUESTED' ? 'bg-blue-50 border-blue-200' :
                  reservation.status === 'UPDATE_ACCEPTED' ? 'bg-emerald-50 border-emerald-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                    <AlertCircle className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${
                      reservation.status === 'UPDATE_REQUESTED' ? 'text-blue-600' :
                      reservation.status === 'UPDATE_ACCEPTED' ? 'text-emerald-600' :
                      'text-red-600'
                    }`} />
                    <span className="hidden sm:inline">
                      {reservation.status === 'UPDATE_REQUESTED' && 'Demande de modification en attente'}
                      {reservation.status === 'UPDATE_ACCEPTED' && 'Modification acceptée'}
                      {reservation.status === 'UPDATE_REJECTED' && 'Modification refusée'}
                    </span>
                    <span className="sm:hidden">
                      {reservation.status === 'UPDATE_REQUESTED' && 'Modification en attente'}
                      {reservation.status === 'UPDATE_ACCEPTED' && 'Modification acceptée'}
                      {reservation.status === 'UPDATE_REJECTED' && 'Modification refusée'}
                    </span>
                  </h3>
                  <div className="space-y-2.5 sm:space-y-3">
                    <div>
                      <p className="text-[10px] sm:text-sm text-slate-600 mb-1.5 sm:mb-2">Nouvelles dates demandées :</p>
                      <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-slate-200">
                        <div className="flex items-start gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] sm:text-xs text-slate-500">Du</p>
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight">
                              {formatDate(fromApiDateTime(reservation.requestedStartDateTime))}
                              {' à '}{formatTime(fromApiDateTime(reservation.requestedStartDateTime))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 sm:gap-3">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] sm:text-xs text-slate-500">Au</p>
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight">
                              {formatDate(fromApiDateTime(reservation.requestedEndDateTime))}
                              {' à '}{formatTime(fromApiDateTime(reservation.requestedEndDateTime))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {reservation.priceDifference !== undefined && reservation.priceDifference !== 0 && (
                      <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-sm text-slate-600">Différence de prix</span>
                          <span className={`text-sm sm:text-base font-bold ${
                            reservation.priceDifference > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}>
                            {reservation.priceDifference > 0 ? '+' : ''}{reservation.priceDifference > 0 ? reservation.priceDifference.toFixed(2) : reservation.priceDifference.toFixed(2)}€
                          </span>
                        </div>
                        {reservation.priceDifference > 0 && reservation.status === 'UPDATE_ACCEPTED' && reservation.userRole === 'GUEST' && (
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2">
                            Vous devez payer ce complément pour finaliser la modification.
                          </p>
                        )}
                        {reservation.priceDifference < 0 && (
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2">
                            Un remboursement sera effectué selon les conditions d'annulation.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Host/Client Information */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-6">
                <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <User className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-600" />
                  <span className="hidden sm:inline">{reservation.userRole === 'GUEST' ? 'Informations sur l\'hôte' : 'Informations sur le client'}</span>
                  <span className="sm:hidden">{reservation.userRole === 'GUEST' ? 'Hôte' : 'Client'}</span>
                </h3>
                <div className="flex items-center gap-2.5 sm:gap-4">
                  {otherUserId ? (
                    <Link 
                      href={`/user/${otherUserId}/`}
                      prefetch={false}
                      onClick={(e) => handleCapacitorLinkClick(e, `/user/${otherUserId}/`, router)}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer"
                    >
                      <Image
                        src={displayAvatar}
                        alt={displayName}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    </Link>
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                      <Image
                        src={displayAvatar}
                        alt={displayName}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {otherUserId ? (
                      <Link 
                        href={`/user/${otherUserId}/`}
                        prefetch={false}
                        onClick={(e) => handleCapacitorLinkClick(e, `/user/${otherUserId}/`, router)}
                        className="text-sm sm:text-base font-semibold text-slate-900 mb-0.5 sm:mb-1 truncate hover:text-emerald-600 transition-colors cursor-pointer block"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <p className="text-sm sm:text-base font-semibold text-slate-900 mb-0.5 sm:mb-1 truncate">{displayName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button 
                      id="btn-contact-user-reservation"
                      onClick={handleContactUser}
                      className="p-2 sm:p-3 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" 
                      title={reservation.userRole === 'GUEST' ? 'Contacter l\'hôte' : 'Contacter le client'}
                    >
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Location Map */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-6">
                <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-600" />
                  Localisation
                </h3>
                <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">{spaceLocation}</p>
                    {place?.address && place.address !== spaceLocation && (
                      <p className="text-[10px] sm:text-sm text-slate-600 mt-0.5 sm:mt-1 truncate">{epureAddress(place.address)}</p>
                    )}
                  </div>
                </div>
                
                {/* Carte MapTiler */}
                {mapCenter && place ? (
                  <div className="w-full h-48 sm:h-64 rounded-lg sm:rounded-xl overflow-hidden border border-slate-200 mb-3 sm:mb-4">
                    <PropertiesMap
                      properties={[{
                        id: place.id,
                        title: capitalizeFirstPerLine((place.title && String(place.title).trim()) || place.description?.split('.')[0] || `${spaceLocation}`),
                        lat: mapCenter.lat,
                        lng: mapCenter.lng,
                        price: place.pricePerDay || place.pricePerHour || 0,
                        address: `${place.address || ''}, ${place.city}`.trim(),
                        status: 'available' as const,
                        placeId: place.id,
                        image: getValidPhoto(place.photos, place.type)
                      }]}
                      center={mapCenter}
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50 rounded-lg sm:rounded-xl overflow-hidden border border-slate-200 relative">
                    {/* Map Background Pattern */}
                    <div className="absolute inset-0 opacity-30" style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px),
                        radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.15) 0%, transparent 50%)
                      `,
                      backgroundSize: '40px 40px, 40px 40px, 300px 300px'
                    }} />
                    
                    {/* Map Marker */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="relative">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 sm:border-4 border-white">
                          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" />
                        </div>
                        <div className="absolute -bottom-1.5 sm:-bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 sm:border-l-4 border-r-3 sm:border-r-4 border-t-6 sm:border-t-8 border-transparent border-t-emerald-600"></div>
                      </div>
                    </div>
                    
                    {/* Location Label */}
                    <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-2 sm:px-4 py-1 sm:py-2 rounded-md sm:rounded-lg shadow-md border border-slate-200">
                      <p className="text-[10px] sm:text-sm font-semibold text-slate-900 text-center">{spaceLocation}</p>
                    </div>
                  </div>
                )}
                
                <button 
                  id="btn-get-directions-reservation"
                  onClick={handleGetDirections}
                  className="mt-3 sm:mt-4 w-full px-3 sm:px-4 py-2 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm cursor-pointer"
                >
                  <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
                  Obtenir l&apos;itinéraire
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-3 sm:space-y-6">
              {/* Price Summary */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-6 md:sticky md:top-24">
                <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <Euro className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-600" />
                  Récapitulatif
                </h3>
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  {daysCount >= 1 && (
                    <>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Prix par jour</span>
                        <span className="font-semibold text-slate-900">
                          {place?.dayPriceActive === true && place?.pricePerDay
                            ? `${place.pricePerDay.toFixed(2)}€`
                            : place?.pricePerDay
                            ? `${place.pricePerDay.toFixed(2)}€`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Nombre de jours</span>
                        <span className="font-semibold text-slate-900">{daysCount}</span>
                      </div>
                    </>
                  )}
                  {daysCount < 1 && (
                    <>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Prix par heure</span>
                        <span className="font-semibold text-slate-900">
                          {place?.hourPriceActive === true && place?.pricePerHour
                            ? `${place.pricePerHour.toFixed(2)}€`
                            : place?.pricePerHour
                            ? `${place.pricePerHour.toFixed(2)}€`
                            : place?.dayPriceActive === true && place?.pricePerDay
                            ? `${(place.pricePerDay / 24).toFixed(2)}€`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Durée</span>
                        <span className="font-semibold text-slate-900">{hoursCount} heure{hoursCount > 1 ? 's' : ''}</span>
                      </div>
                    </>
                  )}
                  
                  {/* Affichage détaillé pour l'hôte */}
                  {reservation.userRole === 'HOST' && reservation.hostAmount !== undefined && reservation.serviceFee !== undefined && (
                    <>
                      <div className="pt-2 sm:pt-3 border-t border-slate-100 space-y-1.5 sm:space-y-2">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-slate-600">Montant total payé</span>
                          <span className="font-semibold text-slate-900">{reservation.totalPrice.toFixed(2)}€</span>
                        </div>
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-slate-600">Frais de service</span>
                          <span className="font-semibold text-red-600">-{reservation.serviceFee.toFixed(2)}€</span>
                        </div>
                        <div className="pt-1.5 sm:pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base font-semibold text-slate-900">Votre revenu</span>
                            <span className="text-lg sm:text-xl font-bold text-emerald-600">{reservation.hostAmount.toFixed(2)}€</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Affichage simple pour le client */}
                  {reservation.userRole === 'GUEST' && (
                    <div className="pt-2 sm:pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-semibold text-slate-900">Total</span>
                        <span className="text-xl sm:text-2xl font-bold text-emerald-600">{reservation.totalPrice.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Bouton pour demander une modification (côté client) */}
                {canRequestUpdate() && (
                  <button 
                    id="btn-request-update-reservation"
                    onClick={handleRequestUpdate}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-xs sm:text-sm"
                  >
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Modifier les dates
                  </button>
                )}

                {/* Bouton pour répondre à une demande (côté hôte) */}
                {canRespondToUpdate() && (
                  <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                    <button 
                      id="btn-accept-update-reservation"
                      onClick={() => handleRespondToUpdate(true)}
                      disabled={isResponding}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Accepter
                    </button>
                    <button 
                      id="btn-reject-update-reservation"
                      onClick={() => handleRespondToUpdate(false)}
                      disabled={isResponding}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                    >
                      <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Refuser
                    </button>
                  </div>
                )}

                {/* Bouton pour payer le complément (côté client) */}
                {needsPayment() && (
                  <button 
                    id="btn-pay-update-difference-reservation"
                    onClick={handlePayUpdateDifference}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-xs sm:text-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Payer ({reservation.priceDifference != null ? reservation.priceDifference.toFixed(2) : '0.00'}€)
                  </button>
                )}

                {/* Caution : enregistrer ma carte (côté client, bien avec caution) */}
                {reservation.userRole === 'GUEST' &&
                 place?.deposit != null &&
                 place.deposit > 0 &&
                 reservation.status !== 'CANCELLED' &&
                 reservation.status?.toLowerCase() !== 'cancelled' &&
                 reservation.status?.toLowerCase() !== 'annulée' && (
                  <div className="mb-2 sm:mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-700 mb-2">
                      Caution : {place.deposit.toFixed(2)} € — empreinte seulement.
                    </p>
                    <button
                      id="btn-deposit-setup-reservation"
                      type="button"
                      onClick={() => setDepositModalOpen(true)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Enregistrer ma carte (caution)
                    </button>
                  </div>
                )}

                {canCancel() && (
                  <button 
                    id="btn-cancel-reservation"
                    onClick={handleCancelReservation}
                    disabled={isCancelling}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                  >
                    {isCancelling ? (
                      <>
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Annulation en cours...</span>
                        <span className="sm:hidden">Annulation...</span>
                      </>
                    ) : (
                      'Annuler la réservation'
                    )}
                  </button>
                )}
              </div>

              {/* Reservation Details */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-6">
                <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                  <FileText className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-600" />
                  Détails
                </h3>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-slate-500 mb-1">Numéro de réservation</p>
                    <p className="font-semibold text-slate-900">{reservation.id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Type d'Espace</p>
                    <p className="font-semibold text-slate-900">
                      {place ? getTypeLabel(place.type) : 'Non spécifié'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Statut de paiement</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${
                      reservation.paymentStatus === 'PAID' 
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      <span className="font-semibold text-xs">
                        {reservation.paymentStatus === 'PAID' ? 'Payé' : 'En attente de validation'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Statut</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="font-semibold">{statusConfig.label}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="bg-emerald-50 rounded-xl sm:rounded-2xl border border-emerald-200 p-3 sm:p-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-emerald-900 mb-0.5 sm:mb-1">Réservation sécurisée</p>
                    <p className="text-[10px] sm:text-xs text-emerald-700">Vos données sont protégées et votre paiement est sécurisé.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <FooterNavigation />

      {/* Modal de confirmation d'annulation */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          if (!isCancelling) {
            setShowCancelModal(false);
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
          if (!reservation || !place) return undefined;
          
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
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowCancelErrorModal(false);
              setCancelError(null);
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-w-md w-full md:mx-4 p-6 animate-in slide-in-from-bottom md:zoom-in-95 duration-300" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
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
                className="px-4 py-2 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors touch-manipulation"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de demande de modification */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center p-0 md:p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowUpdateModal(false);
              setUpdateError(null);
              setEstimatedPriceDifference(null);
              setEstimatedPriceDifferenceRaw(null);
              setSelectingDateType(null);
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white w-full max-w-2xl h-full min-h-[100dvh] md:min-h-0 md:h-auto md:max-h-[90vh] rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300" style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))', paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Modifier mes dates</h3>
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setUpdateError(null);
                  setEstimatedPriceDifference(null);
                  setEstimatedPriceDifferenceRaw(null);
                  setSelectingDateType(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center touch-manipulation"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto p-6"
              style={{ paddingBottom: 'max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5rem))' }}
            >
            {updateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{updateError}</p>
              </div>
            )}

            {place && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-semibold text-slate-900">{capitalizeFirstPerLine((place.title && place.title.trim()) || place.description || 'Bien')}</p>
                <p className="text-xs text-slate-600 mt-1">Dates actuelles: {fromApiDateTime(reservation.startDateTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {fromApiDateTime(reservation.endDateTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                <p className="text-xs text-slate-600 mt-1">Montant actuel: {reservation.totalPrice?.toFixed(2) || '0.00'}€</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Date de début */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Date de début
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={selectedStartDateObj ? selectedStartDateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                    onClick={() => setSelectingDateType('start')}
                    placeholder="Sélectionner une date"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
                {hasHourlyPricing && (
                  <>
                    <label className="block text-xs font-semibold text-slate-700 mt-2 mb-1">Heure de début</label>
                    <select
                      value={newStartTime || '00:00'}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewStartTime(v);
                        setEstimatedPriceDifference(null);
                        setEstimatedPriceDifferenceRaw(null);
                        const endNorm = (newEndTime || '00:00').slice(0, 5);
                        if (endNorm <= v) {
                          const next = HOUR_OPTIONS.find((h) => h > v);
                          setNewEndTime(next ?? v);
                        }
                      }}
                      className="w-full mt-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white cursor-pointer"
                    >
                      {HOUR_OPTIONS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </>
                )}
                {selectingDateType === 'start' && (
                  <div className="mt-2 bg-white border-2 border-slate-200 rounded-xl p-4">
                    {renderCalendar('start')}
                  </div>
                )}
              </div>

              {/* Date de fin */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Date de fin
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={selectedEndDateObj ? selectedEndDateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                    onClick={() => setSelectingDateType('end')}
                    placeholder="Sélectionner une date"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
                {hasHourlyPricing && (
                  <>
                    <label className="block text-xs font-semibold text-slate-700 mt-2 mb-1">Heure de fin</label>
                    <select
                      value={(() => {
                        const startNorm = newStartTime || '00:00';
                        const validEnds = HOUR_OPTIONS.filter((h) => h > startNorm);
                        const endNorm = newEndTime || '00:00';
                        if (validEnds.length === 0) return startNorm;
                        return validEnds.includes(endNorm) ? endNorm : validEnds[0];
                      })()}
                      onChange={(e) => {
                        setNewEndTime(e.target.value);
                        setEstimatedPriceDifference(null);
                        setEstimatedPriceDifferenceRaw(null);
                      }}
                      className="w-full mt-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white cursor-pointer"
                    >
                      {(() => {
                        const startNorm = newStartTime || '00:00';
                        const validEnds = HOUR_OPTIONS.filter((h) => h > startNorm);
                        if (validEnds.length === 0) {
                          return <option value={startNorm}>— (réduire l&apos;heure de début)</option>;
                        }
                        return validEnds.map((h) => <option key={h} value={h}>{h}</option>);
                      })()}
                    </select>
                  </>
                )}
                {selectingDateType === 'end' && (
                  <div className="mt-2 bg-white border-2 border-slate-200 rounded-xl p-4">
                    {renderCalendar('end')}
                  </div>
                )}
              </div>

              {/* Vérifier si les dates sélectionnées sont disponibles */}
              {selectedStartDateObj && !isDateAvailable(selectedStartDateObj) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    Le bien n'est plus disponible à la date du {selectedStartDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  </p>
                </div>
              )}
              {selectedEndDateObj && !isDateAvailable(selectedEndDateObj) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    Le bien n'est plus disponible à la date du {selectedEndDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  </p>
                </div>
              )}

              {/* Validation durée min. (nombre de jours calendaires distincts : 16 + 17 = 2 jours) */}
              {newStartDate && newEndDate && place?.minDays != null && place.minDays > 0 && (() => {
                const distinctDays = getDistinctCalendarDays(newStartDate, newEndDate);
                if (distinctDays >= place.minDays) return null;
                return (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">
                      Ce bien nécessite une location d&apos;au moins {place.minDays} jour{place.minDays > 1 ? "s" : ""} (jours différents). Vous avez sélectionné {distinctDays} jour{distinctDays > 1 ? "s" : ""}.
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

              {/* Informations importantes — uniquement si le bien est en réservation avec approbation */}
              {place?.instantBooking === false && estimatedPriceDifference !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Important :</strong> Votre demande de modification sera envoyée à l'hôte. 
                    {estimatedPriceDifference > 0 && (
                      <span> Si acceptée, vous devrez payer le complément de {estimatedPriceDifference.toFixed(2)}€.</span>
                    )}
                    {estimatedPriceDifference < 0 && (
                      <span> Si acceptée, vous serez remboursé de {Math.abs(estimatedPriceDifference).toFixed(2)}€ (hors frais de service).</span>
                    )}
                    {estimatedPriceDifference === 0 && (
                      <span> Si acceptée, aucune différence de prix ne sera appliquée.</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setUpdateError(null);
                  setEstimatedPriceDifference(null);
                  setEstimatedPriceDifferenceRaw(null);
                }}
                disabled={isRequestingUpdate}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmRequestUpdate}
                disabled={isRequestingUpdate || !newStartDate || !newEndDate || !!(place?.minDays != null && place.minDays > 0 && newStartDate && newEndDate && getDistinctCalendarDays(newStartDate, newEndDate) < place.minDays)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRequestingUpdate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Envoi...
                  </>
                ) : (
                  place?.instantBooking === true ? 'Payer' : 'Envoyer la demande'
                )}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de confirmation de réponse (côté hôte) */}
      <ConfirmationModal
        isOpen={showRespondModal}
        onClose={() => {
          if (!isResponding) {
            setShowRespondModal(false);
            delete window.pendingUpdateResponse;
          }
        }}
        onConfirm={confirmRespondToUpdate}
        title={window.pendingUpdateResponse ? "Accepter la modification" : "Refuser la modification"}
        message={
          window.pendingUpdateResponse
            ? "Êtes-vous sûr de vouloir accepter cette modification de réservation ? Les nouvelles dates seront appliquées."
            : "Êtes-vous sûr de vouloir refuser cette modification ? La réservation conservera ses dates originales."
        }
        confirmText={window.pendingUpdateResponse ? "Oui, accepter" : "Oui, refuser"}
        cancelText="Annuler"
        confirmButtonColor={window.pendingUpdateResponse ? "emerald" : "red"}
        isLoading={isResponding}
      />

      {stripeEmbeddedClientSecret && (
        <StripeEmbeddedCheckout
          clientSecret={stripeEmbeddedClientSecret}
          showCloseButton
          onClose={() => setStripeEmbeddedClientSecret(null)}
        />
      )}
      {depositModalOpen && reservation && place && place.deposit != null && place.deposit > 0 && (() => {
        const userIdRaw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const userId = userIdRaw ? parseInt(userIdRaw, 10) : 0;
        if (!userId || Number.isNaN(userId)) return null;
        return (
        <DepositSetupModal
          userId={userId}
          reservationId={reservation.id}
          depositAmount={place.deposit}
          onSuccess={() => {
            setDepositModalOpen(false);
            router.refresh();
          }}
          onClose={() => setDepositModalOpen(false)}
        />
        );
      })()}
    </div>
  );
}

