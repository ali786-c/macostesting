'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isMobileOrCapacitor, isCapacitor, handleCapacitorLinkClick, capacitorNavigate } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import Image from 'next/image';
import Link from 'next/link';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { 
  Save,
  X,
  Edit,
  MapPin,
  Euro,
  Calendar,
  Car,
  Box,
  Warehouse,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Image as ImageIcon,
  Ruler,
  Lock,
  Key,
  Lightbulb,
  Wrench,
  Package,
  Ban,
  Shield,
  MessageSquare,
  XCircle
} from 'lucide-react';
import { placesAPI, PlaceDTO, PlaceAvailabilityDTO, CreatePlacePayload, AutomatedMessageDTO, reservationsAPI, ReservationDTO, rentoallUsersAPI, UserDTO } from '@/services/api';
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar';
import { Portal } from '@/components/ui/Portal';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { useLanguage } from '@/contexts/LanguageContext';
import AddressAutocomplete from '@/components/ui/address-autocomplete';
import { getDisplayFirstName } from '@/lib/utils';
import { fromApiDateTime } from '@/lib/datetime';

// Composant Tooltip réutilisable
const Tooltip = ({ content }: { content: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="ml-2 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg shadow-xl">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
};

// Composant de validation en temps réel
const ValidationMessage = ({ isValid, message, isTouched }: { isValid: boolean | null; message: string; isTouched?: boolean }) => {
  // Ne pas afficher si le champ n'a pas été touché ou si la validation n'a pas été effectuée
  if (!isTouched || isValid === null) return null;
  
  return (
    <div className={`mt-1 text-xs flex items-center gap-1 ${isValid ? 'text-emerald-600' : 'text-red-600'}`}>
      {isValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      <span>{message}</span>
    </div>
  );
};

// Heures de la journée pour Fréquence réservation Début/Fin (dropdowns)
const RESERVATION_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

// Mapping des caractéristiques API vers les labels et types d'input (identique au formulaire de création)
const CHARACTERISTIC_MAPPING: Record<string, { label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[] }> = {
  // ========== CARACTÉRISTIQUES COMMUNES ==========
  'LENGTH': { label: 'Longueur (m)', type: 'number', placeholder: 'Ex: 5,0' },
  'WIDTH': { label: 'Largeur (m)', type: 'number', placeholder: 'Ex: 2,5' },
  'MAX_HEIGHT': { label: 'Hauteur maximale (m)', type: 'number', placeholder: 'Ex: 2,1' },
  'VOLUME': { label: 'Volume (m³)', type: 'number', placeholder: 'Ex: 15,0' },
  'SURFACE': { label: 'Surface (m²)', type: 'number', placeholder: 'Ex: 6,0' },
  
  // ========== CARACTÉRISTIQUES PARKING ==========
  'VEHICLE_TYPE': { label: 'Types de véhicules acceptés', type: 'select', options: ['Moto', 'Voiture', 'Camion', 'Caravane', 'Camping car'] },
  'MIN_HOURS': { label: 'Durée minimale (heures)', type: 'number', placeholder: 'Ex: 1' },
  'MIN_DAYS': { label: 'Durée minimale (jours)', type: 'number', placeholder: 'Ex: 1' },
  'RESERVATION_FREQUENCY_FROM': { label: 'Fréquence réservation - Début', type: 'select', options: RESERVATION_HOUR_OPTIONS },
  'RESERVATION_FREQUENCY_TO': { label: 'Fréquence réservation - Fin', type: 'select', options: RESERVATION_HOUR_OPTIONS },
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
  
  // ========== CARACTÉRISTIQUES STORAGE_SPACE (Box) ==========
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
  'ACCESSIBILITY_REMARKS': { label: 'Remarques accessibilité', type: 'text', placeholder: 'Informations sur l\'accessibilité' },
  'FLAMMABLE_PROHIBITED': { label: 'Inflammables interdits', type: 'select', options: ['Oui', 'Non'] },
  'GAS_BOTTLE_PROHIBITED': { label: 'Bouteilles de gaz interdites', type: 'select', options: ['Oui', 'Non'] },
  'CHEMICAL_PROHIBITED': { label: 'Produits chimiques interdits', type: 'select', options: ['Oui', 'Non'] },
  
  // ========== CARACTÉRISTIQUES CAVE (Caves et Greniers) ==========
  'HUMIDITY': { label: 'Humidité', type: 'select', options: ['Sec', 'Sain', 'Risque humidité'] },
  'VENTILATION': { label: 'Ventilation', type: 'select', options: ['VMC', 'Naturelle', 'Mécanique', 'Aucune'] },
  'ELEVATOR_SIZE': { label: 'Taille ascenseur', type: 'text', placeholder: 'Ex: 1.2m x 0.8m' },
  'FREIGHT_ELEVATOR_SIZE': { label: 'Taille monte-charge', type: 'text', placeholder: 'Ex: 1.5m x 1.0m' },
  'STRAIGHT_STAIRCASE_WIDTH': { label: 'Largeur escalier droit (cm)', type: 'number', placeholder: 'Ex: 120' },
  'TURNING_STAIRCASE_WIDTH': { label: 'Largeur escalier tournant (cm)', type: 'number', placeholder: 'Ex: 100' },
  'SPIRAL_STAIRCASE_WIDTH': { label: 'Largeur escalier colimaçon (cm)', type: 'number', placeholder: 'Ex: 80' },
  'PASSAGE_MIN_WIDTH': { label: 'Largeur passage min. (cm)', type: 'number', placeholder: 'Ex: 70' },
  'PASSAGE_MIN_HEIGHT': { label: 'Hauteur passage min. (cm)', type: 'number', placeholder: 'Ex: 190' },
  'NUMBERED_ZONE': { label: 'Zone numérotée', type: 'select', options: ['Oui', 'Non'] },
  'MOTORIZED_VEHICLE_PROHIBITED': { label: 'Véhicules motorisés interdits', type: 'select', options: ['Oui', 'Non'] },
  'GPL_PROHIBITED': { label: 'GPL interdit', type: 'select', options: ['Oui', 'Non'] },
  'STAIRS_TYPE': { label: 'Type d\'escalier', type: 'select', options: ['Droit', 'Tourné', 'Hélicoïdal'] },
  'HANDLING_HELP': { label: 'Aide au manutention', type: 'select', options: ['Oui', 'Non', 'Payant'] },
  'OTHER_SERVICES': { label: 'Autres services', type: 'text', placeholder: 'Liste des autres services' },
  'OTHER_EQUIPMENT': { label: 'Autre équipement', type: 'text', placeholder: 'Liste des autres équipements' },
  'VENTILATION_TYPE': { label: 'Type de ventilation', type: 'select', options: ['Naturelle', 'Mécanique', 'Climatisation'] },
  'HUMIDITY_STATE': { label: 'État humidité', type: 'select', options: ['Sec', 'Humide', 'Très humide'] },
  'STORAGE_TYPE': { label: 'Type de stockage', type: 'select', options: ['Sec', 'Humide', 'Tempéré', 'Froid'] },
};

// Énum backend (VehicleType) → libellé affiché dans le formulaire
const VEHICLE_TYPE_API_TO_DISPLAY: Record<string, string> = {
  MOTO: 'Moto',
  VOITURE: 'Voiture',
  CAMION: 'Camion',
  CARAVANE: 'Caravane',
  CAMPING_CAR: 'Camping car',
};
const VEHICLE_TYPE_DISPLAY_TO_API: Record<string, string> = {
  Moto: 'MOTO',
  Voiture: 'VOITURE',
  Camion: 'CAMION',
  Caravane: 'CARAVANE',
  'Camping car': 'CAMPING_CAR',
};
const DEFAULT_VEHICLE_TYPES_API = ['MOTO', 'VOITURE', 'CAMION', 'CARAVANE', 'CAMPING_CAR'] as const;

// Fonction pour traduire les noms de caractéristiques en français (fallback)
const translateCharacteristicName = (name: string): string => {
  const translations: Record<string, string> = {
    'LENGTH': 'Longueur',
    'WIDTH': 'Largeur',
    'HEIGHT': 'Hauteur',
    'MAX_HEIGHT': 'Hauteur maximale',
    'DEPTH': 'Profondeur',
    'SURFACE': 'Surface',
    'VOLUME': 'Volume',
    'ACCESS': 'Accès',
    'DIMENSIONS': 'Dimensions',
    'TEMPERATURE': 'Température',
    'HUMIDITY': 'Humidité',
    'VENTILATION': 'Ventilation',
    'LIGHTING': 'Éclairage',
    'SECURITY': 'Sécurité',
    'SURVEILLANCE': 'Surveillance',
    'GUARD': 'Gardien',
    'VEHICLE_TYPE': 'Types de véhicules acceptés',
    'MIN_HOURS': 'Durée minimale (heures)',
    'MIN_DAYS': 'Durée minimale (jours)',
    'RESERVATION_FREQUENCY_FROM': 'Fréquence réservation - Début',
    'RESERVATION_FREQUENCY_TO': 'Fréquence réservation - Fin',
    'LEVEL': 'Niveau',
    'SPACE_TYPE': 'Type d\'espace',
    'PARKING_TYPE': 'Type de parking',
    'VIDEO_SURVEILLANCE': 'Vidéo surveillance',
    'SECURITY_GUARD': 'Gardien de sécurité',
    'AUTOMATIC_BARRIER': 'Barrière automatique',
    'SECURED_GATE': 'Portail sécurisé',
    'LOCK_TYPE': 'Type de serrure',
    'NUMBERED_SPACE': 'Espace numéroté',
    'DOOR_TYPE': 'Type de porte',
    'STAIRS_TYPE': 'Type d\'escalier',
    'STAIRS_WIDTH': 'Largeur escalier',
    'ELEVATOR_DIMENSIONS': 'Dimensions ascenseur',
    'PASSAGE_MIN_WIDTH': 'Largeur passage min.',
    'PASSAGE_MIN_HEIGHT': 'Hauteur passage min.',
    'FREIGHT_ELEVATOR': 'Monte-charge',
    'PMR_ELEVATOR': 'Ascenseur PMR',
    'INTERIOR_LIGHT': 'Éclairage intérieur',
    'ELECTRIC_PLUG': 'Prise électrique',
    'WATER_POINT': 'Point d\'eau',
    'ELECTRIC_CHARGING_STATION': 'Borne de recharge',
    'HAND_TRUCK': 'Diable',
    'STORAGE_RACK': 'Rack',
    'SHELVES': 'Étagères',
    'OTHER_EQUIPMENT': 'Autre équipement',
    'FLOOR_QUALITY': 'Qualité du sol',
    'HEATED_DEGREE': 'Degré de chauffage',
    'VENTILATION_TYPE': 'Type de ventilation',
    'HUMIDITY_STATE': 'État humidité',
    'STORAGE_TYPE': 'Type de stockage',
    'AUTHORIZED_USAGE': 'Usage autorisé',
    'CLEANING': 'Nettoyage',
    'HANDLING_HELP': 'Aide au manutention',
    'AIRPORT_SHUTTLE': 'Navette aéroport',
    'STATION_SHUTTLE': 'Navette gare',
    'CHILD_SEAT': 'Siège enfant',
    'OTHER_SERVICES': 'Autres services',
    'PMR_EQUIPMENT': 'Équipement PMR',
    'BUS_STOP_DISTANCE': 'Distance arrêt de bus',
    'TRAIN_STATION_DISTANCE': 'Distance gare',
    'AIRPORT_DISTANCE': 'Distance aéroport',
    'ELECTRIC_CHARGING_STATION_DISTANCE': 'Distance borne électrique',
    'BEACH_DISTANCE': 'Distance plage',
    'TRUCK_ACCESS_DISTANCE': 'Distance accès camion',
    'TIME_RESTRICTIONS': 'Restrictions horaires',
    'EXCLUSIVITY_24_7': 'Exclusivité 24/7',
    'STOP_PARKING': 'Arrêt parking',
    'FLAMMABLE_PROHIBITED': 'Inflammables interdits',
    'GAS_BOTTLE_PROHIBITED': 'Bouteilles de gaz interdites',
    'GPL_PROHIBITED': 'GPL interdit',
    'GPL_ALLOWED': 'GPL autorisé',
    'MOTORIZED_VEHICLE_PROHIBITED': 'Véhicules motorisés interdits',
    'CHEMICAL_PROHIBITED': 'Produits chimiques interdits',
    'ACCESSIBILITY_REMARKS': 'Remarques accessibilité',
  };
  
  // Si on a une traduction, l'utiliser
  if (translations[name.toUpperCase()]) {
    return translations[name.toUpperCase()];
  }
  
  // Sinon, essayer de formater le nom (remplacer les underscores par des espaces, mettre en capitales)
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const placeId = parseInt(id, 10);

  // États principaux
  const [place, setPlace] = useState<PlaceDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'conditions' | 'calendar' | 'photos' | 'characteristics' | 'messages' | 'pending'>('pending');
  const [pendingReservations, setPendingReservations] = useState<ReservationDTO[]>([]);
  const [isLoadingPendingReservations, setIsLoadingPendingReservations] = useState(false);
  const [clientsMap, setClientsMap] = useState<Map<number, UserDTO>>(new Map());
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reservationToApprove, setReservationToApprove] = useState<ReservationDTO | null>(null);
  const [reservationToReject, setReservationToReject] = useState<ReservationDTO | null>(null);
  const [isApprovingReservation, setIsApprovingReservation] = useState(false);
  const [showAcceptUpdateModal, setShowAcceptUpdateModal] = useState(false);
  const [showRefuseUpdateModal, setShowRefuseUpdateModal] = useState(false);
  const [reservationToAcceptUpdate, setReservationToAcceptUpdate] = useState<ReservationDTO | null>(null);
  const [reservationToRefuseUpdate, setReservationToRefuseUpdate] = useState<ReservationDTO | null>(null);
  const [isAcceptingUpdate, setIsAcceptingUpdate] = useState(false);

  // Ne pas afficher l'onglet Approbation si le bien est en réservation instantanée
  useEffect(() => {
    if (place?.instantBooking === true && activeTab === 'pending') {
      setActiveTab('general');
    }
  }, [place?.instantBooking, place?.id, activeTab]);

  // États du formulaire
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    zipCode: '',
    deposit: '',
    priceHourly: '',
    priceDaily: '',
    priceWeekly: '',
    priceMonthly: '',
    minHours: '',
    minDays: '',
    cancellationPolicy: 'FLEXIBLE' as 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_CANCELLABLE',
    instantBooking: true, // Réservation instantanée par défaut
    truckAccessDistance: '',
    accessibilityRemarks: '',
    active: true,
    videoUrl: '',
  });

  const [enabledPrices, setEnabledPrices] = useState({
    hourly: false,
    daily: false,
    weekly: false,
    monthly: false,
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [availableDates, setAvailableDates] = useState<{ start: string; end: string }[]>([]);
  // Snapshot des disponibilités (pour éviter POST /availabilities si inchangées)
  const availableDatesSnapshotRef = useRef<string>('');
  const [calendarAvailabilities, setCalendarAvailabilities] = useState<PlaceAvailabilityDTO[]>([]);
  const [calendarOpenFrom, setCalendarOpenFrom] = useState<string | null>(null);
  const [calendarOpenTo, setCalendarOpenTo] = useState<string | null>(null);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [currentDateRange, setCurrentDateRange] = useState({ start: '', end: '' });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [fieldValidations, setFieldValidations] = useState<Record<string, boolean | null>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);
  const startDateButtonRef = useRef<HTMLButtonElement>(null);
  const endDateButtonRef = useRef<HTMLButtonElement>(null);
  const [startDatePickerPos, setStartDatePickerPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [endDatePickerPos, setEndDatePickerPos] = useState<{ top: number; left: number; width: number } | null>(null);
  
  // États pour les caractéristiques
  const [characteristics, setCharacteristics] = useState<Record<string, string>>({});
  const [dynamicCharacteristics, setDynamicCharacteristics] = useState<Array<{ key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[] }>>([]);
  const [isLoadingCharacteristics, setIsLoadingCharacteristics] = useState(false);

  // États pour les messages automatisés
  const [automatedMessages, setAutomatedMessages] = useState<AutomatedMessageDTO[]>([
    { type: 'ON_RESERVATION', content: '', active: true, sendingTime: undefined, daysOffset: 0 }, // Envoyé instantanément
    { type: 'BEFORE_START', content: '', active: true, sendingTime: '09:00:00', daysOffset: -1 }, // Veille à 9h00
    { type: 'AFTER_END', content: '', active: true, sendingTime: '10:00:00', daysOffset: 1 }, // Lendemain à 10h00
  ]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Vérifier le mode utilisateur
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userMode = localStorage.getItem('userMode');
      if (userMode !== 'host') {
        const target = isMobileOrCapacitor() ? '/search-parkings' : '/home';
        router.push(target);
      }
    }
  }, [router]);


  // Charger l'annonce
  useEffect(() => {
    const loadPlace = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Charger les biens du propriétaire (inclut les inactifs) pour pouvoir éditer même un bien inactif
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        let foundPlace: PlaceDTO | undefined;
        if (userId) {
          const userIdNum = parseInt(userId, 10);
          if (!Number.isNaN(userIdNum)) {
            const myPlaces = await rentoallUsersAPI.getMyPlaces(userIdNum);
            foundPlace = myPlaces.find(p => p.id === placeId);
          }
        }
        if (!foundPlace) {
          // Fallback : search (peut ne pas retourner les biens inactifs)
          const allPlaces = await placesAPI.search({});
          foundPlace = allPlaces.find(p => p.id === placeId);
        }

        if (!foundPlace) {
          setError('Annonce non trouvée');
          setIsLoading(false);
          return;
        }

        setPlace(foundPlace);

        // Remplir le formulaire avec les données existantes
        // Convertir cancellationDeadlineDays en politique
        let cancellationPolicy: 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_CANCELLABLE' = 'FLEXIBLE';
        if (foundPlace.cancellationDeadlineDays !== undefined && foundPlace.cancellationDeadlineDays !== null) {
          if (foundPlace.cancellationDeadlineDays === -1) {
            cancellationPolicy = 'NON_CANCELLABLE';
          } else if (foundPlace.cancellationDeadlineDays === 0) {
            cancellationPolicy = 'FLEXIBLE';
          } else if (foundPlace.cancellationDeadlineDays <= 1) {
            cancellationPolicy = 'FLEXIBLE';
          } else if (foundPlace.cancellationDeadlineDays <= 5) {
            cancellationPolicy = 'MODERATE';
          } else {
            cancellationPolicy = 'STRICT';
          }
        }

        setFormData({
          title: (foundPlace.title || '').slice(0, 30),
          description: foundPlace.description || '',
          address: foundPlace.address || '',
          city: foundPlace.city || '',
          zipCode: (foundPlace as any).zipCode || (foundPlace as any).postalCode || '',
          deposit: foundPlace.deposit?.toString() || '0',
          priceHourly: foundPlace.pricePerHour?.toString() || '',
          priceDaily: foundPlace.pricePerDay?.toString() || '',
          priceWeekly: foundPlace.pricePerWeek?.toString() || '',
          priceMonthly: foundPlace.pricePerMonth?.toString() || '',
          minHours: foundPlace.minHours?.toString() || '',
          minDays: foundPlace.minDays?.toString() || '',
          cancellationPolicy: cancellationPolicy,
          instantBooking: foundPlace.instantBooking !== undefined && foundPlace.instantBooking !== null ? Boolean(foundPlace.instantBooking) : true,
          truckAccessDistance: foundPlace.truckAccessDistance != null ? String(foundPlace.truckAccessDistance) : '',
          accessibilityRemarks: foundPlace.accessibilityRemarks || '',
          active: foundPlace.active !== undefined ? Boolean(foundPlace.active) : true,
          videoUrl: foundPlace.videoUrl || '',
        });

        // Activer les prix selon les booléens du backend et l'existence des prix
        // Si le booléen est explicitement true, cocher
        // Si le booléen est undefined mais que le prix existe, cocher (cas legacy)
        // Sinon, ne pas cocher
        setEnabledPrices({
          hourly: foundPlace.hourPriceActive === true || (foundPlace.hourPriceActive === undefined && foundPlace.pricePerHour !== undefined && foundPlace.pricePerHour > 0),
          daily: foundPlace.dayPriceActive === true || (foundPlace.dayPriceActive === undefined && foundPlace.pricePerDay !== undefined && foundPlace.pricePerDay > 0),
          weekly: foundPlace.weekPriceActive === true || (foundPlace.weekPriceActive === undefined && foundPlace.pricePerWeek !== undefined && foundPlace.pricePerWeek > 0),
          monthly: foundPlace.monthPriceActive === true || (foundPlace.monthPriceActive === undefined && foundPlace.pricePerMonth !== undefined && foundPlace.pricePerMonth > 0),
        });

        // Charger les photos
        if (Array.isArray(foundPlace.photos) && foundPlace.photos.length > 0) {
          setImagePreviews(foundPlace.photos);
        }

        // Charger le calendrier : uniquement les périodes dérivées des disponibilités (available === true)
        const calendarDates = await loadPlaceAvailabilities(placeId);
        availableDatesSnapshotRef.current = JSON.stringify(
          [...calendarDates].sort((a, b) => (a.start + a.end).localeCompare(b.start + b.end)),
        );

        // Charger les caractéristiques existantes
        // Pour PARKING: exclure VOLUME et SURFACE (invalides pour ce type côté backend)
        const characteristicsMap: Record<string, string> = {};
        if (foundPlace.characteristics && Array.isArray(foundPlace.characteristics)) {
          const excludedForParking = foundPlace.type === 'PARKING' ? ['VOLUME', 'SURFACE'] : [];
          foundPlace.characteristics.forEach(char => {
            if (char.name && char.value && !excludedForParking.includes(char.name)) {
              if (char.name === 'VEHICLE_TYPE') {
                characteristicsMap['VEHICLE_TYPE'] = (characteristicsMap['VEHICLE_TYPE'] || '') + (characteristicsMap['VEHICLE_TYPE'] ? ', ' : '') + char.value;
              } else {
                characteristicsMap[char.name] = char.value;
              }
            }
          });
        }
        // Priorité au champ acceptedVehicleTypes du backend (énum: MOTO, VOITURE, ...)
        if (foundPlace.acceptedVehicleTypes && Array.isArray(foundPlace.acceptedVehicleTypes) && foundPlace.acceptedVehicleTypes.length > 0) {
          characteristicsMap['VEHICLE_TYPE'] = foundPlace.acceptedVehicleTypes
            .map((api) => VEHICLE_TYPE_API_TO_DISPLAY[api] || api)
            .join(', ');
        }
        if (Object.keys(characteristicsMap).length > 0) {
          setCharacteristics(characteristicsMap);
        }

        // Charger les caractéristiques dynamiques depuis l'API
        if (foundPlace.type) {
          setIsLoadingCharacteristics(true);
          try {
            const characteristicsData = await placesAPI.getCharacteristics(foundPlace.type);
            console.log('✅ [EDIT PLACE] Caractéristiques récupérées:', characteristicsData);
            
            // Vérifier si le backend retourne des objets avec métadonnées complètes ou juste des strings
            const firstItem = characteristicsData[0];
            const hasFullMetadata = firstItem && typeof firstItem === 'object' && 'key' in firstItem && 'label' in firstItem;
            
            let mappedCharacteristics: Array<{ key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[]; required?: boolean }>;
            
            if (hasFullMetadata) {
              // Le backend retourne directement les métadonnées complètes
              // Enrichir avec CHARACTERISTIC_MAPPING pour avoir les mêmes labels, options, etc. que le formulaire de création
              console.log('✅ [EDIT PLACE] Backend retourne les métadonnées complètes, enrichissement avec CHARACTERISTIC_MAPPING');
              mappedCharacteristics = characteristicsData.map((item: any) => {
                const key = (item.key || item.name || '').toUpperCase();
                const mapping = CHARACTERISTIC_MAPPING[key];
                
                // Utiliser le mapping local s'il existe, sinon utiliser les données du backend
                return {
                  key: key,
                  label: mapping?.label || item.label || translateCharacteristicName(key),
                  type: (mapping?.type || item.type || 'text') as 'text' | 'number' | 'select',
                  placeholder: mapping?.placeholder || item.placeholder,
                  options: mapping?.options || item.options,
                  required: item.required || false
                };
              });
            } else {
              // Format legacy : le backend retourne juste des noms (strings)
              // Utiliser CHARACTERISTIC_MAPPING pour enrichir avec labels, types, options, etc.
              console.log('✅ [EDIT PLACE] Backend retourne seulement les noms, utilisation du CHARACTERISTIC_MAPPING');
              mappedCharacteristics = (characteristicsData as string[]).map((name: string) => {
                const key = name.toUpperCase();
                const mapping = CHARACTERISTIC_MAPPING[key];
                
                return {
                  key: key,
                  label: mapping?.label || translateCharacteristicName(key),
                  type: (mapping?.type || 'text') as 'text' | 'number' | 'select',
                  placeholder: mapping?.placeholder,
                  options: mapping?.options,
                  required: false
                };
              });
            }

            // Pour PARKING : options des types de véhicules depuis GET /api/places/filters (vehicleTypes)
            if (foundPlace.type === 'PARKING') {
              try {
                const filters = await placesAPI.getAvailableFilters();
                const vehicleTypesApi = filters?.vehicleTypes && Array.isArray(filters.vehicleTypes)
                  ? filters.vehicleTypes
                  : [...DEFAULT_VEHICLE_TYPES_API];
                const vehicleTypeOptions = vehicleTypesApi.map((api: string) => VEHICLE_TYPE_API_TO_DISPLAY[api] || api);
                const vehicleIdx = mappedCharacteristics.findIndex((c: { key: string }) => c.key === 'VEHICLE_TYPE');
                if (vehicleIdx >= 0) {
                  mappedCharacteristics[vehicleIdx] = { ...mappedCharacteristics[vehicleIdx], options: vehicleTypeOptions };
                }
              } catch {
                const vehicleTypeOptions = DEFAULT_VEHICLE_TYPES_API.map((api) => VEHICLE_TYPE_API_TO_DISPLAY[api]);
                const vehicleIdx = mappedCharacteristics.findIndex((c: { key: string }) => c.key === 'VEHICLE_TYPE');
                if (vehicleIdx >= 0) {
                  mappedCharacteristics[vehicleIdx] = { ...mappedCharacteristics[vehicleIdx], options: vehicleTypeOptions };
                }
              }
            }

            setDynamicCharacteristics(mappedCharacteristics);
          } catch (error) {
            console.error('❌ [EDIT PLACE] Erreur lors du chargement des caractéristiques:', error);
            setDynamicCharacteristics([]);
          } finally {
            setIsLoadingCharacteristics(false);
          }
        }

        // Charger les messages automatisés
        setIsLoadingMessages(true);
        try {
          const messages = await placesAPI.getAutomatedMessages(placeId);
          console.log('✅ [EDIT PLACE] Messages automatisés récupérés:', messages);
          
          // Si des messages existent, les utiliser, sinon garder les valeurs par défaut
          if (messages && messages.length > 0) {
            // Créer un map pour faciliter la recherche
            const messagesMap = new Map(messages.map(m => [m.type, m]));
            
            // Mettre à jour les messages avec ceux du backend, en gardant les valeurs par défaut si absents
            setAutomatedMessages([
              messagesMap.get('ON_RESERVATION') || { 
                type: 'ON_RESERVATION', 
                content: '', 
                active: true, 
                sendingTime: undefined, 
                daysOffset: 0 
              },
              messagesMap.get('BEFORE_START') || { 
                type: 'BEFORE_START', 
                content: '', 
                active: true, 
                sendingTime: '09:00:00', 
                daysOffset: -1 
              },
              messagesMap.get('AFTER_END') || { 
                type: 'AFTER_END', 
                content: '', 
                active: true, 
                sendingTime: '10:00:00', 
                daysOffset: 1 
              },
            ]);
          }
        } catch (error) {
          console.error('❌ [EDIT PLACE] Erreur lors du chargement des messages automatisés:', error);
          // En cas d'erreur, garder les valeurs par défaut
        } finally {
          setIsLoadingMessages(false);
        }

      } catch (err) {
        console.error('❌ [EDIT PLACE] Erreur lors du chargement:', err);
        setError('Erreur lors du chargement de l\'annonce');
      } finally {
        setIsLoading(false);
      }
    };

    loadPlace();
  }, [placeId]);

  // Charger les réservations en attente pour ce bien
  useEffect(() => {
    const loadPendingReservations = async () => {
      if (!place || activeTab !== 'pending') return;

      try {
        setIsLoadingPendingReservations(true);
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const userIdNum = parseInt(userId, 10);
        const allPending = await reservationsAPI.getPendingReservationsForOwner(userIdNum);
        
        // Filtrer pour ne garder que les réservations de ce bien
        const placePendingReservations = allPending.filter(r => r.placeId === placeId);
        setPendingReservations(placePendingReservations);

        // Charger les informations des clients
        const uniqueClientIds = new Set(placePendingReservations.map(r => r.clientId).filter(id => id !== undefined && id !== null));
        const clientsMap = new Map<number, UserDTO>();
        
        await Promise.all(Array.from(uniqueClientIds).map(async (clientId) => {
          try {
            const clientInfo = await rentoallUsersAPI.getProfile(clientId);
            clientsMap.set(clientId, clientInfo);
          } catch (err) {
            console.error(`❌ [EDIT PLACE] Erreur lors de la récupération du client ${clientId}:`, err);
          }
        }));
        
        setClientsMap(clientsMap);
      } catch (err) {
        console.error('❌ [EDIT PLACE] Erreur lors du chargement des réservations en attente:', err);
      } finally {
        setIsLoadingPendingReservations(false);
      }
    };

    loadPendingReservations();
  }, [place, placeId, activeTab]);

  // Calculer la position du calendrier de date de début
  useEffect(() => {
    if (showStartDatePicker && startDateButtonRef.current) {
      const rect = startDateButtonRef.current.getBoundingClientRect();
      setStartDatePickerPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      setStartDatePickerPos(null);
    }
  }, [showStartDatePicker]);

  // Calculer la position du calendrier de date de fin
  useEffect(() => {
    if (showEndDatePicker && endDateButtonRef.current) {
      const rect = endDateButtonRef.current.getBoundingClientRect();
      setEndDatePickerPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      setEndDatePickerPos(null);
    }
  }, [showEndDatePicker]);

  // Fermer les calendriers quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        startDatePickerRef.current &&
        !startDatePickerRef.current.contains(event.target as Node) &&
        startDateButtonRef.current &&
        !startDateButtonRef.current.contains(event.target as Node)
      ) {
        setShowStartDatePicker(false);
      }
      if (
        endDatePickerRef.current &&
        !endDatePickerRef.current.contains(event.target as Node) &&
        endDateButtonRef.current &&
        !endDateButtonRef.current.contains(event.target as Node)
      ) {
        setShowEndDatePicker(false);
      }
    };

    if (showStartDatePicker || showEndDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showStartDatePicker, showEndDatePicker]);

  // Recharger les disponibilités quand on ouvre l'onglet calendrier (ou quand le bien est chargé avec availableFrom/availableTo)
  useEffect(() => {
    if (placeId && activeTab === 'calendar') {
      console.log('📅 [CALENDAR] Onglet calendrier ouvert, chargement des disponibilités...');
      loadPlaceAvailabilities(placeId);
    }
  }, [activeTab, placeId, place?.availableFrom, place?.availableTo]);

  // Calcul dynamique de la surface (m²) à chaque changement de LENGTH ou WIDTH
  // Surface = Longueur × Largeur — pour Box et Cave uniquement
  useEffect(() => {
    if (place?.type === 'PARKING') return;

    const length = characteristics['LENGTH'];
    const width = characteristics['WIDTH'];
    if (!length || !width) return;

    const lengthNum = parseFloat(String(length).replace(',', '.'));
    const widthNum = parseFloat(String(width).replace(',', '.'));
    if (isNaN(lengthNum) || isNaN(widthNum) || lengthNum <= 0 || widthNum <= 0) return;

    const surface = lengthNum * widthNum;
    const surfaceStr = surface.toFixed(2);
    if (characteristics['SURFACE'] !== surfaceStr) {
      setCharacteristics(prev => ({ ...prev, 'SURFACE': surfaceStr }));
      console.log('📐 [EDIT PLACE] Surface calculée automatiquement:', surfaceStr, 'm²');
    }
  }, [place?.type, characteristics['LENGTH'], characteristics['WIDTH']]);

  // Calcul dynamique du volume (m³) quand LENGTH, WIDTH et MAX_HEIGHT sont remplis
  // Volume = Longueur × Largeur × Hauteur (en m³)
  // IMPORTANT: Ne pas calculer VOLUME pour PARKING - le backend rejette cette caractéristique pour ce type
  useEffect(() => {
    if (place?.type === 'PARKING') return;
    
    const length = characteristics['LENGTH'];
    const width = characteristics['WIDTH'];
    const height = characteristics['MAX_HEIGHT'];
    
    if (length && width && height) {
      // Convertir les virgules en points pour parseFloat
      const lengthNum = parseFloat(String(length).replace(',', '.'));
      const widthNum = parseFloat(String(width).replace(',', '.'));
      const heightNum = parseFloat(String(height).replace(',', '.'));
      
      if (!isNaN(lengthNum) && !isNaN(widthNum) && !isNaN(heightNum) && 
          lengthNum > 0 && widthNum > 0 && heightNum > 0) {
        // Volume = Longueur × Largeur × Hauteur (en m³)
        const volume = lengthNum * widthNum * heightNum;
        const volumeStr = volume.toFixed(2);
        
        if (characteristics['VOLUME'] !== volumeStr) {
          setCharacteristics(prev => ({
            ...prev,
            'VOLUME': volumeStr
          }));
          console.log('📐 [EDIT PLACE] Volume calculé automatiquement:', volumeStr, 'm³ (', lengthNum, '×', widthNum, '×', heightNum, ')');
        }
      }
    }
  }, [place?.type, characteristics['LENGTH'], characteristics['WIDTH'], characteristics['MAX_HEIGHT']]);

  // Fonction pour mettre à jour un champ
  const updateFormData = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Marquer le champ comme touché quand l'utilisateur interagit avec
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Validation en temps réel (seulement après que le champ soit touché)
    // Le composant ValidationMessage ne s'affichera que si le champ est touché
    // Ne valider que si c'est une string ou un number
    if (typeof value !== 'boolean') {
      validateField(field, value.toString());
    }
  };

  // Fonction pour gérer le blur (quand l'utilisateur quitte le champ)
  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    // Valider le champ quand l'utilisateur quitte
    const fieldValue = formData[field as keyof typeof formData];
    if (fieldValue !== undefined && fieldValue !== null) {
      // Convertir en string pour la validation (les booléens deviennent 'true'/'false')
      const stringValue = typeof fieldValue === 'boolean' ? String(fieldValue) : String(fieldValue);
      validateField(field, stringValue);
    }
  };

  // Validation en temps réel
  const validateField = (field: string, value: string) => {
    let isValid: boolean | null = null;
    
    switch (field) {
      case 'title':
        isValid = value.length >= 10 && value.length <= 30;
        break;
      case 'description':
        isValid = value.length >= 10;
        break;
      case 'address':
        isValid = value.length >= 5;
        break;
      case 'city':
        isValid = value.length >= 2;
        break;
      case 'priceDaily':
      case 'priceMonthly':
        isValid = value !== '' && parseFloat(value) > 0;
        break;
      default:
        isValid = null;
    }
    
    setFieldValidations(prev => ({ ...prev, [field]: isValid }));
  };

  // Gestion des images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...newImages, ...files];
    const newPreviews = [...imagePreviews];
    
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const result = event.target.result as string;
            newPreviews.push(result);
            setImagePreviews([...imagePreviews, result]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    setNewImages(newFiles);
  };

  const removeImage = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    const newFiles = newImages.filter((_, i) => i !== (index - (imagePreviews.length - newImages.length)));
    setImagePreviews(newPreviews);
    setNewImages(newFiles);
  };

  // Fonction pour vérifier si deux plages de dates se chevauchent
  const doRangesOverlap = (range1: { start: string; end: string }, range2: { start: string; end: string }): boolean => {
    const start1 = new Date(range1.start);
    const end1 = new Date(range1.end);
    const start2 = new Date(range2.start);
    const end2 = new Date(range2.end);
    
    // Normaliser les dates (mettre à minuit pour la comparaison)
    start1.setHours(0, 0, 0, 0);
    end1.setHours(23, 59, 59, 999);
    start2.setHours(0, 0, 0, 0);
    end2.setHours(23, 59, 59, 999);
    
    // Deux plages se chevauchent si :
    // - Le début de range1 est dans range2, OU
    // - La fin de range1 est dans range2, OU
    // - range1 contient complètement range2, OU
    // - range2 contient complètement range1
    return (start1 <= end2 && end1 >= start2);
  };

  // Gestion des dates de disponibilité
  const addDateRange = () => {
    if (currentDateRange.start && currentDateRange.end) {
      if (currentDateRange.end < currentDateRange.start) {
        setError('La date de fin doit être après la date de début');
        return;
      }
      
      // Vérifier qu'il n'y a pas de chevauchement avec les périodes existantes
      const hasOverlap = availableDates.some(existingRange => 
        doRangesOverlap(currentDateRange, existingRange)
      );
      
      if (hasOverlap) {
        setError('Cette période chevauche une période de disponibilité déjà ajoutée. Veuillez choisir une autre période.');
        return;
      }
      
      // Aucun chevauchement, on peut ajouter la nouvelle période
      const newRanges = [...availableDates, currentDateRange];
      setAvailableDates(newRanges);
      setCurrentDateRange({ start: '', end: '' });
      setError(null);
      
      // Sauvegarder automatiquement le calendrier après ajout
      saveCalendarOnly(newRanges);
    }
  };

  const removeDateRange = (index: number) => {
    const newRanges = availableDates.filter((_, i) => i !== index);
    setAvailableDates(newRanges);
    // Sauvegarder automatiquement le calendrier après suppression
    saveCalendarOnly(newRanges);
  };

  // Fonction pour charger les disponibilités depuis le backend (API Calendrier : availabilities + availableFrom/availableTo)
  const loadPlaceAvailabilities = async (placeId: number): Promise<{ start: string; end: string }[]> => {
    if (!placeId) return [];
    
    try {
      setIsLoadingCalendar(true);
      console.log('📅 [CALENDAR] Chargement des disponibilités pour le bien:', placeId);
      
      // Plage de requête : utiliser availableFrom/availableTo du bien si présents (dates vraiment utiles et ouvertes), sinon ~14 mois autour d'aujourd'hui
      let startStr: string;
      let endStr: string;
      if (place?.availableFrom && place?.availableTo) {
        startStr = place.availableFrom;
        endStr = place.availableTo;
        console.log('📅 [CALENDAR] Plage demandée = période ouverte du bien:', startStr, '→', endStr);
      } else {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 12);
        startStr = startDate.toISOString().split('T')[0];
        endStr = endDate.toISOString().split('T')[0];
      }
      
      const calendarData = await placesAPI.getPlaceCalendar(placeId, startStr, endStr);
      const list = calendarData?.availabilities ?? [];
      
      setCalendarAvailabilities(Array.isArray(list) ? list : []);
      // Période d'ouverture : priorité à l'API calendar, sinon au bien (availableFrom/availableTo)
      const openFrom = calendarData?.availableFrom ?? place?.availableFrom ?? null;
      const openTo = calendarData?.availableTo ?? place?.availableTo ?? null;
      setCalendarOpenFrom(openFrom);
      setCalendarOpenTo(openTo);
      
      console.log('✅ [CALENDAR] Calendrier chargé (availableFrom/availableTo):', openFrom, openTo);
      
      // Ne garder que les périodes dérivées des disponibilités (available === true) ; pas de période globale en plus
      if (list.length > 0) {
        const availableOnly = list.filter((a: PlaceAvailabilityDTO) => a.available === true);
        const dates: { start: string; end: string }[] = [];
        
        if (availableOnly.length > 0) {
          const sortedDates = [...availableOnly].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          let currentRange: { start: string; end: string } | null = null;
          sortedDates.forEach((availability: PlaceAvailabilityDTO) => {
            if (!currentRange) {
              currentRange = { start: availability.date, end: availability.date };
            } else {
              const currentEnd = new Date(currentRange.end);
              const nextDate = new Date(availability.date);
              currentEnd.setDate(currentEnd.getDate() + 1);
              if (nextDate.getTime() === currentEnd.getTime()) {
                currentRange.end = availability.date;
              } else {
                dates.push(currentRange);
                currentRange = { start: availability.date, end: availability.date };
              }
            }
          });
          if (currentRange) dates.push(currentRange);
        }
        
        console.log('📅 [CALENDAR] Périodes (uniquement available) affichées en dessous:', dates);
        setAvailableDates(dates);
        return dates;
      }
      
      setAvailableDates([]);
      return [];
    } catch (error) {
      console.error('❌ [CALENDAR] Erreur lors du chargement des disponibilités:', error);
      setCalendarAvailabilities([]);
      setCalendarOpenFrom(null);
      setCalendarOpenTo(null);
      setAvailableDates([]);
      return [];
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Fonction pour sauvegarder uniquement le calendrier sans recharger toute la page
  const saveCalendarOnly = async (datesToSave?: { start: string; end: string }[]) => {
    if (!place) return;
    
    const dates = datesToSave || availableDates;
    if (dates.length === 0) return;

    setIsSavingCalendar(true);
    setError(null);

    try {
      // Convertir les périodes en format PlaceAvailabilityDTO[]
      const availabilities: PlaceAvailabilityDTO[] = [];
      dates.forEach(range => {
        const startDate = new Date(range.start);
        const endDate = new Date(range.end);
        
        // Normaliser les dates (mettre à minuit pour éviter les problèmes de fuseau horaire)
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        // Parcourir chaque jour de la période
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          // Formater la date en YYYY-MM-DD
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          availabilities.push({
            date: dateStr,
            available: true,
          });
          
          // Passer au jour suivant
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      
      console.log('📅 [EDIT PLACE] Sauvegarde automatique du calendrier:', {
        placeId: placeId,
        availabilitiesCount: availabilities.length,
      });
      
      await placesAPI.updateCalendar(placeId, availabilities);
      console.log('✅ [EDIT PLACE] Calendrier sauvegardé automatiquement');
      // Snapshot = état désormais enregistré côté backend
      availableDatesSnapshotRef.current = JSON.stringify(
        [...dates].sort((a, b) => (a.start + a.end).localeCompare(b.start + b.end)),
      );
      
      // Afficher un message de succès discret
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (calendarError) {
      console.error('⚠️ [EDIT PLACE] Erreur lors de la sauvegarde automatique du calendrier:', calendarError);
      setError('Erreur lors de la sauvegarde du calendrier. Veuillez réessayer.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSavingCalendar(false);
    }
  };

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!place) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // ===== VALIDATION DES CHAMPS OBLIGATOIRES =====
      const errors: string[] = [];

      // Vérifier les champs obligatoires de l'onglet "Informations générales"
      if (!formData.title || formData.title.trim().length < 10) {
        errors.push('Le titre est obligatoire et doit contenir entre 10 et 30 caractères');
      } else if (formData.title.trim().length > 30) {
        errors.push('Le titre ne doit pas dépasser 30 caractères');
      }

      if (!formData.description || formData.description.trim().length < 10) {
        errors.push('La description est obligatoire et doit contenir au moins 10 caractères');
      }

      if (!formData.address || formData.address.trim().length < 5) {
        errors.push('L\'adresse est obligatoire et doit contenir au moins 5 caractères');
      }

      if (!formData.city || formData.city.trim().length < 2) {
        errors.push('La ville est obligatoire et doit contenir au moins 2 caractères');
      }

      // Vérifier les dates de disponibilité (onglet "Disponibilités")
      // Utiliser availableDates si disponible, sinon currentDateRange
      const datesToCheck = availableDates.length > 0 ? availableDates[0] : 
                          (currentDateRange.start && currentDateRange.end ? 
                            { start: currentDateRange.start, end: currentDateRange.end } : null);
      
      if (!datesToCheck || !datesToCheck.start || !datesToCheck.end) {
        errors.push('Les dates de début et de fin de disponibilité sont obligatoires');
      } else {
        // Vérifier que la date de fin est après la date de début
        const startDate = new Date(datesToCheck.start);
        const endDate = new Date(datesToCheck.end);
        if (endDate < startDate) {
          errors.push('La date de fin doit être après la date de début');
        }
      }

      // Vérifier qu'au moins un prix est activé
      const hasAtLeastOneEnabled = 
        enabledPrices.hourly ||
        enabledPrices.daily ||
        enabledPrices.weekly ||
        enabledPrices.monthly;
      
      if (!hasAtLeastOneEnabled) {
        errors.push('Veuillez activer au moins un type de tarif');
      }

      // Vérifier que les prix activés sont remplis
      if (enabledPrices.hourly && (!formData.priceHourly || parseFloat(formData.priceHourly) <= 0)) {
        errors.push('Le prix horaire est obligatoire lorsque le tarif horaire est activé');
      }

      if (enabledPrices.daily && (!formData.priceDaily || parseFloat(formData.priceDaily) <= 0)) {
        errors.push('Le prix journalier est obligatoire lorsque le tarif journalier est activé');
      }

      if (enabledPrices.weekly && (!formData.priceWeekly || parseFloat(formData.priceWeekly) <= 0)) {
        errors.push('Le prix hebdomadaire est obligatoire lorsque le tarif hebdomadaire est activé');
      }

      if (enabledPrices.monthly && (!formData.priceMonthly || parseFloat(formData.priceMonthly) <= 0)) {
        errors.push('Le prix mensuel est obligatoire lorsque le tarif mensuel est activé');
      }

      // Afficher les erreurs s'il y en a
      if (errors.length > 0) {
        const errorMessage = errors.length === 1 
          ? errors[0] 
          : 'Veuillez corriger les erreurs suivantes :\n• ' + errors.join('\n• ');
        setError(errorMessage);
        setIsSaving(false);
        // Marquer les champs comme touchés pour afficher les erreurs visuelles
        if (!formData.description || formData.description.trim().length < 10) {
          setTouchedFields(prev => ({ ...prev, description: true }));
          setFieldValidations(prev => ({ ...prev, description: false }));
        }
        if (!formData.title || formData.title.trim().length < 10 || formData.title.trim().length > 30) {
          setTouchedFields(prev => ({ ...prev, title: true }));
          setFieldValidations(prev => ({ ...prev, title: false }));
        }
        if (!formData.address || formData.address.trim().length < 5) {
          setTouchedFields(prev => ({ ...prev, address: true }));
          setFieldValidations(prev => ({ ...prev, address: false }));
        }
        if (!formData.city || formData.city.trim().length < 2) {
          setTouchedFields(prev => ({ ...prev, city: true }));
          setFieldValidations(prev => ({ ...prev, city: false }));
        }
        // Scroller vers le haut pour voir le message d'erreur
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        return;
      }

      // ===== LOGS DÉTAILLÉS POUR LA TARIFICATION =====
      console.log('💰 [EDIT PLACE] ===== DÉBUT LOGS TARIFICATION =====');
      console.log('💰 [EDIT PLACE] Données du formulaire:', {
        priceHourly: formData.priceHourly,
        priceDaily: formData.priceDaily,
        priceWeekly: formData.priceWeekly,
        priceMonthly: formData.priceMonthly
      });
      console.log('💰 [EDIT PLACE] Prix activés (enabledPrices):', enabledPrices);
      console.log('💰 [EDIT PLACE] Prix actuels du bien (place):', {
        pricePerHour: place.pricePerHour,
        pricePerDay: place.pricePerDay,
        pricePerWeek: place.pricePerWeek,
        pricePerMonth: place.pricePerMonth
      });

      // Ne pas calculer de prix par défaut - n'envoyer que les prix activés
      console.log('💰 [EDIT PLACE] Construction du payload avec uniquement les prix activés');
      
      // Construire le payload de mise à jour
      const updatePayload: Partial<CreatePlacePayload> = {
        description: formData.description || undefined,
        address: formData.address,
        city: formData.city,
        ...(formData.zipCode ? { zipCode: formData.zipCode } : {}),
        deposit: parseFloat(formData.deposit) || 0,
        // Booléens pour activer/désactiver les prix
        hourPriceActive: enabledPrices.hourly,
        dayPriceActive: enabledPrices.daily,
        weekPriceActive: enabledPrices.weekly,
        monthPriceActive: enabledPrices.monthly,
      };
      
      // Ajouter les prix SEULEMENT s'ils sont activés
      if (enabledPrices.hourly && formData.priceHourly) {
        updatePayload.pricePerHour = parseFloat(formData.priceHourly);
        console.log('✅ [EDIT PLACE] Prix horaire ajouté:', updatePayload.pricePerHour);
      } else {
        console.log('⏭️ [EDIT PLACE] Prix horaire non activé, non envoyé');
      }
      
      if (enabledPrices.daily && formData.priceDaily) {
        updatePayload.pricePerDay = parseFloat(formData.priceDaily);
        console.log('✅ [EDIT PLACE] Prix journalier ajouté:', updatePayload.pricePerDay);
      } else {
        console.log('⏭️ [EDIT PLACE] Prix journalier non activé, non envoyé');
      }
      
      if (enabledPrices.weekly && formData.priceWeekly) {
        updatePayload.pricePerWeek = parseFloat(formData.priceWeekly);
        console.log('✅ [EDIT PLACE] Prix hebdomadaire ajouté:', updatePayload.pricePerWeek);
      } else {
        console.log('⏭️ [EDIT PLACE] Prix hebdomadaire non activé, non envoyé');
      }
      
      if (enabledPrices.monthly && formData.priceMonthly) {
        updatePayload.pricePerMonth = parseFloat(formData.priceMonthly);
        console.log('✅ [EDIT PLACE] Prix mensuel ajouté:', updatePayload.pricePerMonth);
      } else {
        console.log('⏭️ [EDIT PLACE] Prix mensuel non activé, non envoyé');
      }
      
      console.log('💰 [EDIT PLACE] Prix qui seront envoyés:', {
        pricePerHour: updatePayload.pricePerHour,
        pricePerDay: updatePayload.pricePerDay,
        pricePerWeek: updatePayload.pricePerWeek,
        pricePerMonth: updatePayload.pricePerMonth
      });
      console.log('💰 [EDIT PLACE] Booléens d\'activation:', {
        hourPriceActive: updatePayload.hourPriceActive,
        dayPriceActive: updatePayload.dayPriceActive,
        weekPriceActive: updatePayload.weekPriceActive,
        monthPriceActive: updatePayload.monthPriceActive
      });

      // Continuer avec le reste du payload
      // IMPORTANT: Ne pas envoyer availabilities dans le payload PUT - elles seront envoyées séparément via POST /availabilities
      const finalPayload: Partial<CreatePlacePayload> = {
        ...updatePayload,
        // Inclure tous les champs requis selon les spécifications du backend
        // Type et statut (préserver les valeurs existantes si non modifiées)
        ...(place.type ? { type: place.type } : {}),
        ...(place.status ? { status: place.status } : {}),
        ...((formData.title ?? place.title) ? { title: (formData.title ?? place.title ?? '').trim().slice(0, 30) } : {}),
        // Coordonnées géographiques (préserver si existantes)
        ...(place.latitude !== undefined ? { latitude: place.latitude } : {}),
        ...(place.longitude !== undefined ? { longitude: place.longitude } : {}),
        // Booléens de configuration
        active: formData.active !== undefined ? Boolean(formData.active) : (place.active !== undefined ? place.active : true),
        instantBooking: formData.instantBooking !== undefined ? Boolean(formData.instantBooking) : (place.instantBooking !== undefined && place.instantBooking !== null ? Boolean(place.instantBooking) : true),
        ...(place.freeCancellation !== undefined ? { freeCancellation: place.freeCancellation } : {}),
        // Champs d'accessibilité (éditables)
        truckAccessDistance: formData.truckAccessDistance !== undefined && formData.truckAccessDistance !== null && String(formData.truckAccessDistance).trim() !== ''
          ? parseFloat(String(formData.truckAccessDistance).replace(',', '.'))
          : undefined,
        accessibilityRemarks: formData.accessibilityRemarks && String(formData.accessibilityRemarks).trim() !== ''
          ? String(formData.accessibilityRemarks).trim()
          : undefined,
        // Photos (toujours envoyer la liste actuelle pour que supprimer toutes les photos soit pris en compte)
        photos: imagePreviews.slice(0, 5),
        // Vidéo du bien (optionnel, max 10 secondes)
        ...(formData.videoUrl && String(formData.videoUrl).trim() !== '' ? { videoUrl: String(formData.videoUrl).trim() } : {}),
        // Dates de disponibilité globale (envoyées via PUT /api/places/{id})
        ...(availableDates.length > 0 ? {
          availableFrom: availableDates[0].start,
          availableTo: availableDates[availableDates.length - 1].end,
        } : {}),
        // Caractéristiques - convertir de Record<string, string> à Array<{ name: string; value: string }>
        // IMPORTANT: Exclure VOLUME et SURFACE pour PARKING. VEHICLE_TYPE est envoyé via acceptedVehicleTypes.
        characteristics: Object.entries(characteristics)
          .filter(([name, value]) => {
            if (!value || value.trim() === '') return false;
            if (place.type === 'PARKING' && (name === 'VOLUME' || name === 'SURFACE')) return false;
            if (name === 'VEHICLE_TYPE') return false; // géré par acceptedVehicleTypes
            return true;
          })
          .map(([name, value]) => ({ name, value: value.trim() })),
        ...(function (): { acceptedVehicleTypes?: string[] } {
          const raw = characteristics['VEHICLE_TYPE'] || '';
          const displayValues = raw ? raw.split(',').map((v) => v.trim()).filter(Boolean) : [];
          const acceptedVehicleTypes = displayValues
            .map((d) => VEHICLE_TYPE_DISPLAY_TO_API[d])
            .filter((api): api is string => Boolean(api));
          return acceptedVehicleTypes.length > 0 ? { acceptedVehicleTypes } : {};
        }()),
        // Durée minimum et politique d'annulation
        minHours: enabledPrices.hourly && formData.minHours && parseInt(formData.minHours) > 0 ? parseInt(formData.minHours) : undefined,
        minDays: enabledPrices.daily && formData.minDays && parseInt(formData.minDays) > 0 ? parseInt(formData.minDays) : undefined,
        cancellationPolicy: formData.cancellationPolicy !== 'NON_CANCELLABLE' ? formData.cancellationPolicy : undefined, // Envoyer la politique (sauf NON_CANCELLABLE qui est géré par cancellationDeadlineDays = -1)
        cancellationDeadlineDays: formData.cancellationPolicy === 'NON_CANCELLABLE' ? -1 : 
                                  formData.cancellationPolicy === 'FLEXIBLE' ? 1 : 
                                  formData.cancellationPolicy === 'MODERATE' ? 5 : 
                                  formData.cancellationPolicy === 'STRICT' ? 14 : undefined,
      };

      // ===== LOGS DÉTAILLÉS DU PAYLOAD COMPLET =====
      console.log('🔵 [EDIT PLACE] ===== PAYLOAD COMPLET ENVOYÉ AU BACKEND =====');
      console.log('🔵 [EDIT PLACE] placeId:', placeId);
      console.log('📅 [EDIT PLACE] Dates de disponibilité globale:', {
        availableDatesCount: availableDates.length,
        availableDates: availableDates,
        availableFrom: finalPayload.availableFrom,
        availableTo: finalPayload.availableTo,
      });
      console.log('🔵 [EDIT PLACE] Payload JSON:', JSON.stringify(finalPayload, null, 2));
      console.log('🔵 [EDIT PLACE] Détails du payload:', {
        description: finalPayload.description,
        address: finalPayload.address,
        city: finalPayload.city,
        deposit: finalPayload.deposit,
        // TARIFICATION
        pricePerHour: finalPayload.pricePerHour,
        pricePerDay: finalPayload.pricePerDay,
        pricePerWeek: finalPayload.pricePerWeek,
        pricePerMonth: finalPayload.pricePerMonth,
        hourPriceActive: finalPayload.hourPriceActive,
        dayPriceActive: finalPayload.dayPriceActive,
        weekPriceActive: finalPayload.weekPriceActive,
        monthPriceActive: finalPayload.monthPriceActive,
        // AUTRES
        photos: finalPayload.photos?.length || 0,
        availableFrom: finalPayload.availableFrom,
        availableTo: finalPayload.availableTo,
        characteristics: finalPayload.characteristics?.length || 0,
        minHours: finalPayload.minHours,
        minDays: finalPayload.minDays,
        cancellationPolicy: finalPayload.cancellationPolicy,
        cancellationDeadlineDays: finalPayload.cancellationDeadlineDays
      });
      console.log('💰 [EDIT PLACE] ===== FIN LOGS TARIFICATION =====');

      // Mettre à jour l'annonce
      console.log('📡 [EDIT PLACE] Appel API: placesAPI.update(', placeId, ',', finalPayload, ')');
      const updatedPlace = await placesAPI.update(placeId, finalPayload);
      console.log('✅ [EDIT PLACE] Réponse du backend:', updatedPlace);
      console.log('✅ [EDIT PLACE] Prix dans la réponse:', {
        pricePerHour: updatedPlace.pricePerHour,
        pricePerDay: updatedPlace.pricePerDay,
        pricePerWeek: updatedPlace.pricePerWeek,
        pricePerMonth: updatedPlace.pricePerMonth,
        hourPriceActive: updatedPlace.hourPriceActive,
        dayPriceActive: updatedPlace.dayPriceActive,
        weekPriceActive: updatedPlace.weekPriceActive,
        monthPriceActive: updatedPlace.monthPriceActive
      });

      // Mettre à jour le calendrier (POST /api/places/{id}/availabilities) uniquement si les dates ont changé
      const normalizedDates = JSON.stringify(
        [...availableDates].sort((a, b) => (a.start + a.end).localeCompare(b.start + b.end)),
      );
      const shouldUpdateAvailabilities =
        availableDates.length > 0 && normalizedDates !== availableDatesSnapshotRef.current;
      if (shouldUpdateAvailabilities) {
        try {
          const availabilities: PlaceAvailabilityDTO[] = [];
          availableDates.forEach(range => {
            const startDate = new Date(range.start);
            const endDate = new Date(range.end);
            
            // Normaliser les dates (mettre à minuit pour éviter les problèmes de fuseau horaire)
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            
            // Parcourir chaque jour de la période
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
              // Formater la date en YYYY-MM-DD
              const year = currentDate.getFullYear();
              const month = String(currentDate.getMonth() + 1).padStart(2, '0');
              const day = String(currentDate.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              
              availabilities.push({
                date: dateStr,
                available: true, // Toutes les dates ajoutées sont disponibles
              });
              
              // Passer au jour suivant
              currentDate.setDate(currentDate.getDate() + 1);
            }
          });
          
          console.log('📅 [EDIT PLACE] Envoi des disponibilités spécifiques via POST /availabilities:', {
            placeId: placeId,
            availabilitiesCount: availabilities.length,
            availabilities: availabilities,
          });
          
          await placesAPI.updateCalendar(placeId, availabilities);
          console.log('✅ [EDIT PLACE] Calendrier mis à jour via POST /availabilities');
          // Snapshot = état désormais enregistré côté backend
          availableDatesSnapshotRef.current = normalizedDates;
        } catch (calendarError) {
          console.error('⚠️ [EDIT PLACE] Erreur lors de la mise à jour du calendrier:', calendarError);
          // Ne pas bloquer la sauvegarde si l'erreur vient du calendrier
        }
      }

      // Sauvegarder les messages automatisés
      try {
        console.log('💬 [EDIT PLACE] Sauvegarde des messages automatisés:', {
          placeId: placeId,
          messages: automatedMessages,
        });
        
        await placesAPI.updateAutomatedMessages(placeId, automatedMessages);
        console.log('✅ [EDIT PLACE] Messages automatisés sauvegardés avec succès');
      } catch (messagesError) {
        console.error('⚠️ [EDIT PLACE] Erreur lors de la sauvegarde des messages automatisés:', messagesError);
        // Ne pas bloquer la sauvegarde si l'erreur vient des messages
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
      // Recharger uniquement les données du bien sans recharger toute la page (inclut biens inactifs)
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        let updatedPlace: PlaceDTO | undefined;
        if (userId) {
          const userIdNum = parseInt(userId, 10);
          if (!Number.isNaN(userIdNum)) {
            const myPlaces = await rentoallUsersAPI.getMyPlaces(userIdNum);
            updatedPlace = myPlaces.find(p => p.id === placeId);
          }
        }
        if (!updatedPlace) {
          const allPlaces = await placesAPI.search({});
          updatedPlace = allPlaces.find(p => p.id === placeId);
        }
        if (updatedPlace) {
          setPlace(updatedPlace);
          // Recharger les périodes depuis le calendrier (uniquement available), pas de période globale
          await loadPlaceAvailabilities(placeId);
        }
      } catch (reloadError) {
        console.error('⚠️ [EDIT PLACE] Erreur lors du rechargement des données:', reloadError);
        // Ne pas bloquer si le rechargement échoue
      }

    } catch (err) {
      console.error('❌ [EDIT PLACE] Erreur lors de la sauvegarde:', err);
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      const errorMessage = errorObj?.response?.data?.message || errorObj?.message || 'Une erreur est survenue lors de la sauvegarde.';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <HeaderNavigation />
        <main className="flex-1 pt-24 pb-20 md:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(6rem, env(safe-area-inset-top, 0px))', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Chargement de l'annonce...</p>
            </div>
          </div>
        </main>
        <div className="shrink-0">
          <FooterNavigation />
        </div>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <HeaderNavigation />
        <main className="flex-1 pt-24 pb-20 md:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(6rem, env(safe-area-inset-top, 0px))', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Annonce non trouvée</h2>
              <p className="text-slate-600 mb-6">{error || 'Cette annonce n\'existe pas ou vous n\'avez pas les droits pour la modifier.'}</p>
            </div>
          </div>
        </main>
        <div className="shrink-0">
          <FooterNavigation />
        </div>
      </div>
    );
  }

  const TypeIcon = place.type === 'PARKING' ? Car : place.type === 'STORAGE_SPACE' ? Box : Warehouse;
  const typeLabel = place.type === 'PARKING' ? 'Parking' : place.type === 'STORAGE_SPACE' ? 'Stockage' : 'Cave et Divers';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNavigation />
      
      <main className="flex-1 pt-16 sm:pt-20 md:pt-24 pb-20 sm:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Header - Mobile: Compact */}
          <div className="mb-4 sm:mb-5 md:mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-1.5 sm:mb-2">
                  <TypeIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-emerald-600 flex-shrink-0" />
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">{t('host.editListing')}</h1>
                </div>
                <p className="text-xs sm:text-sm md:text-base text-slate-600">{typeLabel} - {place.city}</p>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {isCapacitor() ? (
                  <button
                    type="button"
                    id="btn-view-listing"
                    onClick={(e) => { e.preventDefault(); capacitorNavigate(`/parking/${place.id}/`); }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold rounded-xl transition-all text-xs sm:text-sm cursor-pointer flex-1 sm:flex-initial touch-manipulation"
                    aria-label={t('host.viewListing')}
                  >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('host.viewListing')}</span>
                    <span className="sm:hidden">{t('host.view')}</span>
                  </button>
                ) : (
                  <CapacitorDynamicLink
                    id="link-view-listing"
                    href={`/parking/${place.id}/`}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold rounded-xl transition-all text-xs sm:text-sm cursor-pointer flex-1 sm:flex-initial"
                  >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('host.viewListing')}</span>
                    <span className="sm:hidden">{t('host.view')}</span>
                  </CapacitorDynamicLink>
                )}
                <button
                  id="btn-save-listing"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm cursor-pointer flex-1 sm:flex-initial"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      <span className="hidden sm:inline">Sauvegarde...</span>
                      <span className="sm:hidden">Sauvegarde</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Sauvegarder</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Messages de succès/erreur */}
          {success && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-emerald-800 font-medium">Modifications sauvegardées avec succès !</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800 font-semibold mb-1">Erreur de validation</p>
                  <p className="text-red-700 whitespace-pre-line text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm mb-4 sm:mb-6">
            {/* Mobile: Scroll horizontal avec icônes uniquement */}
            <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-2 min-w-max border-b border-slate-200 pb-1">
                {[
                  { id: 'pending', label: 'Réservations en attente', icon: Clock },
                  { id: 'general', label: 'Informations générales', icon: Edit },
                  { id: 'pricing', label: 'Tarification', icon: Euro },
                  { id: 'conditions', label: 'Conditions', icon: Shield },
                  { id: 'characteristics', label: 'Caractéristiques', icon: CheckCircle2 },
                  { id: 'calendar', label: 'Disponibilités', icon: Calendar },
                  { id: 'photos', label: 'Photos', icon: ImageIcon },
                  { id: 'messages', label: 'Messages automatisés', icon: MessageSquare },
                ]
                  .filter((tab) => tab.id !== 'pending' || place?.instantBooking !== true)
                  .map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    id={`tab-${id}-listing`}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 min-w-[64px] transition-all border-b-2 cursor-pointer touch-manipulation ${
                      activeTab === id
                        ? 'border-emerald-600'
                        : 'border-transparent'
                    }`}
                    title={label}
                  >
                    <div className={`p-2.5 rounded-xl transition-all ${
                      activeTab === id
                        ? 'bg-emerald-100 shadow-sm'
                        : 'bg-slate-100'
                    }`}>
                      <Icon className={`w-5 h-5 transition-colors ${
                        activeTab === id
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop: Navigation avec icônes uniquement */}
            <div className="hidden md:flex border-b border-slate-200 min-w-0">
              {[
                { id: 'pending', label: 'Réservations en attente', icon: Clock },
                { id: 'general', label: 'Informations générales', icon: Edit },
                { id: 'pricing', label: 'Tarification', icon: Euro },
                { id: 'conditions', label: 'Conditions', icon: Shield },
                { id: 'characteristics', label: 'Caractéristiques', icon: CheckCircle2 },
                { id: 'calendar', label: 'Disponibilités', icon: Calendar },
                { id: 'photos', label: 'Photos', icon: ImageIcon },
                { id: 'messages', label: 'Messages automatisés', icon: MessageSquare },
              ]
                .filter((tab) => tab.id !== 'pending' || place?.instantBooking !== true)
                .map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex-1 min-w-0 flex items-center justify-center px-3 lg:px-4 py-4 transition-all border-b-2 cursor-pointer group ${
                    activeTab === id
                      ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title={label}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6 md:p-8 min-w-0">
              {/* Tab: Réservations en attente */}
              {activeTab === 'pending' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      Réservations en attente d'approbation
                    </h2>
                    <p className="text-sm text-slate-600">
                      Gérez les nouvelles demandes de réservation et les demandes de modification pour ce bien. Approuvez ou refusez chaque demande.
                    </p>
                  </div>

                  {isLoadingPendingReservations ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
                      <p className="text-slate-600">Chargement des réservations...</p>
                    </div>
                  ) : pendingReservations.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                      <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Aucune réservation en attente
                      </h3>
                      <p className="text-slate-600">
                        Toutes les réservations pour ce bien ont été traitées.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingReservations.map((reservation) => {
                        const clientInfo = clientsMap.get(reservation.clientId || 0);
                        const clientName = clientInfo 
                          ? getDisplayFirstName(clientInfo, 'Client')
                          : `Client #${reservation.clientId}`;
                        // Déterminer la photo du client
                        let clientAvatar = '/logoR.png'; // Fallback par défaut : logo
                        if (clientInfo && clientInfo.profilePicture && typeof clientInfo.profilePicture === 'string' && clientInfo.profilePicture.trim() !== '') {
                          clientAvatar = clientInfo.profilePicture;
                        }

                        return (
                          <div
                            key={reservation.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <Link 
                                    href={`/user/${reservation.clientId}/`}
                                    prefetch={false}
                                    onClick={(e) => handleCapacitorLinkClick(e, `/user/${reservation.clientId}/`, router)}
                                    className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer"
                                  >
                                    <Image
                                      src={clientAvatar}
                                      alt={clientName}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </Link>
                                  <div>
                                    <Link 
                                      href={`/user/${reservation.clientId}/`}
                                      prefetch={false}
                                      onClick={(e) => handleCapacitorLinkClick(e, `/user/${reservation.clientId}/`, router)}
                                      className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer"
                                    >
                                      {clientName}
                                    </Link>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm text-slate-500">
                                        Réservation #{reservation.id}
                                      </p>
                                      {reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'update_requested' ? (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                          Demande de modification
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                          Nouvelle réservation
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  {reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'update_requested' ? (
                                    <>
                                      {/* Pour les demandes de modification, afficher les dates actuelles et les nouvelles dates demandées */}
                                      <div>
                                        <span className="text-slate-600">Date de début actuelle :</span>
                                        <span className="ml-2 font-medium text-slate-900">
                                          {fromApiDateTime(reservation.startDateTime).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Date de fin actuelle :</span>
                                        <span className="ml-2 font-medium text-slate-900">
                                          {fromApiDateTime(reservation.endDateTime).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      {reservation.requestedStartDateTime && reservation.requestedEndDateTime && (
                                        <>
                                          <div>
                                            <span className="text-slate-600">Nouvelle date de début :</span>
                                            <span className="ml-2 font-medium text-emerald-700">
{fromApiDateTime(reservation.requestedStartDateTime).toLocaleDateString('fr-FR', {
                                              day: 'numeric',
                                              month: 'long',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-slate-600">Nouvelle date de fin :</span>
                                          <span className="ml-2 font-medium text-emerald-700">
                                            {fromApiDateTime(reservation.requestedEndDateTime).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                          </div>
                                        </>
                                      )}
                                      {reservation.priceDifference !== undefined && reservation.priceDifference !== null && (
                                        <div className="sm:col-span-2">
                                          <span className="text-slate-600">Différence de prix :</span>
                                          <span className={`ml-2 font-bold text-lg ${
                                            reservation.priceDifference > 0 
                                              ? 'text-emerald-600' 
                                              : reservation.priceDifference < 0 
                                              ? 'text-red-600' 
                                              : 'text-slate-600'
                                          }`}>
                                            {reservation.priceDifference > 0 ? '+' : ''}{reservation.priceDifference > 0 ? Number(reservation.priceDifference).toFixed(2) : Number(reservation.priceDifference).toFixed(2)}€
                                          </span>
                                          {reservation.priceDifference > 0 && (
                                            <span className="ml-2 text-xs text-slate-500">
                                              (Le client devra payer ce supplément)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {/* Pour les nouvelles réservations, afficher les dates normalement */}
                                      <div>
                                        <span className="text-slate-600">Date de début :</span>
                                        <span className="ml-2 font-medium text-slate-900">
                                          {fromApiDateTime(reservation.startDateTime).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Date de fin :</span>
                                        <span className="ml-2 font-medium text-slate-900">
                                          {fromApiDateTime(reservation.endDateTime).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                  <div>
                                    <span className="text-slate-600">Montant total :</span>
                                    <span className="ml-2 font-bold text-emerald-600 text-lg">
                                      {Number(reservation.totalPrice || 0).toFixed(2)}€
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Statut paiement :</span>
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                                      reservation.paymentStatus === 'PAID' 
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {reservation.paymentStatus === 'PAID' ? 'Payé' : 'En attente de validation'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                {reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'update_requested' ? (
                                  <>
                                    {/* Boutons pour accepter/refuser une demande de modification */}
                                    <button
                                      onClick={() => {
                                        setReservationToAcceptUpdate(reservation);
                                        setShowAcceptUpdateModal(true);
                                      }}
                                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Accepter la modification</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setReservationToRefuseUpdate(reservation);
                                        setShowRefuseUpdateModal(true);
                                      }}
                                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>Refuser la modification</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {/* Boutons pour approuver/refuser une nouvelle réservation */}
                                    <button
                                      onClick={() => {
                                        setReservationToApprove(reservation);
                                        setShowApproveModal(true);
                                      }}
                                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Approuver</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setReservationToReject(reservation);
                                        setShowRejectModal(true);
                                      }}
                                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>Refuser</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Informations générales */}
              {activeTab === 'general' && (
                <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2 flex items-center">
                      Titre de l&apos;annonce *
                      <Tooltip content="Un titre court et clair (10 à 30 caractères) pour votre annonce." />
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={formData.title}
                      onChange={(e) => updateFormData('title', e.target.value.slice(0, 30))}
                      onBlur={() => handleBlur('title')}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${
                        touchedFields.title && fieldValidations.title === false ? 'border-red-300' : 'border-slate-200'
                      }`}
                      placeholder="Ex: Parking couvert - Paris 15"
                    />
                    <ValidationMessage 
                      isValid={fieldValidations.title} 
                      message={fieldValidations.title ? 'Titre valide' : 'Entre 10 et 30 caractères'}
                      isTouched={touchedFields.title}
                    />
                    {formData.title != null && formData.title.length > 0 && (
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{formData.title.length}/30</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2 flex items-center">
                      Description *
                      <Tooltip content="Décrivez votre espace de manière détaillée. Plus la description est complète, plus vous recevrez de réservations." />
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      onBlur={() => handleBlur('description')}
                      rows={5}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none ${
                        touchedFields.description && fieldValidations.description === false ? 'border-red-300' : 'border-slate-200'
                      }`}
                      placeholder="Décrivez votre espace, ses avantages, son emplacement..."
                    />
                    <ValidationMessage 
                      isValid={fieldValidations.description} 
                      message={fieldValidations.description ? 'Description valide' : 'La description doit contenir au moins 10 caractères'}
                      isTouched={touchedFields.description}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2 flex items-center">
                        Adresse *
                        <Tooltip content="L'adresse complète de votre espace." />
                      </label>
                      <AddressAutocomplete
                        value={formData.address}
                        onChange={(value) => {
                          updateFormData('address', value);
                          handleBlur('address');
                        }}
                        onSelect={() => {
                          // Ville et code postal sont en lecture seule, pas de mise à jour
                        }}
                        onBlur={() => handleBlur('address')}
                        placeholder="12 rue de la Paix"
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${
                          touchedFields.address && fieldValidations.address === false ? 'border-red-300' : 'border-slate-200'
                        }`}
                      />
                      <ValidationMessage 
                        isValid={fieldValidations.address} 
                        message={fieldValidations.address ? 'Adresse valide' : 'L\'adresse doit contenir au moins 5 caractères'}
                        isTouched={touchedFields.address}
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2 flex items-center">
                        Ville *
                        <Tooltip content="La ville où se trouve votre espace." />
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        readOnly
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-xl bg-slate-50 cursor-not-allowed text-slate-600 ${
                          touchedFields.city && fieldValidations.city === false ? 'border-red-300' : 'border-slate-200'
                        }`}
                        placeholder="Paris"
                      />
                      <ValidationMessage 
                        isValid={fieldValidations.city} 
                        message={fieldValidations.city ? 'Ville valide' : 'La ville doit contenir au moins 2 caractères'}
                        isTouched={touchedFields.city}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2 flex items-center">
                      Code postal
                      <Tooltip content="Le code postal de votre espace." />
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      readOnly
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-200 rounded-xl bg-slate-50 cursor-not-allowed text-slate-600"
                      placeholder="75001"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2 flex items-center">
                      Caution (€)
                      <Tooltip content="Le montant de la caution demandée pour la location." />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.deposit}
                      onChange={(e) => updateFormData('deposit', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>

                  {/* Annonce visible / active */}
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-0.5">Annonce visible</label>
                      <p className="text-xs text-slate-600">Quand désactivée, l&apos;annonce n&apos;apparaît plus dans les recherches.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.active}
                      onClick={() => updateFormData('active', !formData.active)}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                        formData.active ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
                          formData.active ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab: Tarification */}
              {activeTab === 'pricing' && (
                <>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-emerald-900">
                      <strong>💡 Astuce :</strong> Activez plusieurs tarifs pour maximiser vos réservations. Les clients recherchent souvent des options flexibles.
                    </p>
                  </div>

                  {/* Prix à l'heure */}
                  <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors ${
                    enabledPrices.hourly 
                      ? 'border-slate-200 hover:border-emerald-300' 
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={enabledPrices.hourly}
                      onChange={(e) => {
                        setEnabledPrices(prev => ({ ...prev, hourly: e.target.checked }));
                        if (!e.target.checked) {
                          updateFormData('priceHourly', '');
                          updateFormData('minHours', '');
                        }
                      }}
                      className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label className={`block text-sm font-semibold mb-2 flex items-center ${
                        enabledPrices.hourly ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        Prix à l&apos;heure
                        <Tooltip content="Utile pour les locations de courte durée (quelques heures)." />
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formData.priceHourly}
                          onChange={(e) => {
                            // Permettre uniquement les nombres et la virgule/point décimal
                            const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                            updateFormData('priceHourly', value);
                          }}
                          placeholder="3.5"
                          disabled={!enabledPrices.hourly}
                          className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${
                            enabledPrices.hourly ? 'border-slate-200' : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                          }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">€</span>
                      </div>
                      
                      {/* Durée minimum d'heure - affichée seulement si prix horaire activé */}
                      {enabledPrices.hourly && (
                        <div className="mt-4">
                          <label className={`block text-sm font-semibold mb-2 flex items-center ${
                            enabledPrices.hourly ? 'text-slate-900' : 'text-slate-400'
                          }`}>
                            Durée minimale (heures)
                            <Tooltip content="Nombre d'heures minimum de location requises pour les réservations horaires." />
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formData.minHours}
                              onChange={(e) => {
                                // Permettre uniquement les nombres entiers
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                updateFormData('minHours', value);
                              }}
                              placeholder="0"
                              disabled={!enabledPrices.hourly}
                              className={`w-32 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${
                                enabledPrices.hourly ? 'border-slate-200' : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                              }`}
                            />
                            <span className="text-sm text-slate-600">heure(s)</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            {formData.minHours && parseInt(formData.minHours) > 0 
                              ? `Les clients devront réserver au moins ${formData.minHours} heure${parseInt(formData.minHours) > 1 ? 's' : ''}.`
                              : 'Aucune durée minimum requise. Les clients peuvent réserver pour 1 heure ou plus.'}
                          </p>
                        </div>
                      )}
                      
                      {/* Message informatif si le prix est décoché */}
                      {!enabledPrices.hourly && (
                        <p className="text-xs text-slate-400 mt-2 italic">
                          ⚠️ Le prix horaire n'est pas actif pour cette unité.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prix par jour */}
                  <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors ${
                    enabledPrices.daily 
                      ? 'border-slate-200 hover:border-emerald-300' 
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={enabledPrices.daily}
                      onChange={(e) => {
                        setEnabledPrices(prev => ({ ...prev, daily: e.target.checked }));
                        if (!e.target.checked) {
                          updateFormData('priceDaily', '');
                          updateFormData('minDays', '');
                        }
                      }}
                      className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label className={`block text-sm font-semibold mb-2 flex items-center ${
                        enabledPrices.daily ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        Prix par jour
                        <Tooltip content="Le prix journalier est le tarif de base. Les options hebdomadaires/mensuelles avec réduction génèrent plus de réservations." />
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formData.priceDaily}
                          onChange={(e) => {
                            // Permettre uniquement les nombres et la virgule/point décimal
                            const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                            updateFormData('priceDaily', value);
                          }}
                          onBlur={() => handleBlur('priceDaily')}
                          placeholder="15"
                          disabled={!enabledPrices.daily}
                          className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${
                            enabledPrices.daily 
                              ? (touchedFields.priceDaily && fieldValidations.priceDaily === false ? 'border-red-300' : 'border-slate-200')
                              : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                          }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">€</span>
                      </div>
                      <ValidationMessage 
                        isValid={fieldValidations.priceDaily} 
                        message={fieldValidations.priceDaily ? 'Prix valide' : 'Veuillez entrer un prix valide'}
                        isTouched={touchedFields.priceDaily}
                      />
                      
                      {/* Durée minimum de jours - affichée seulement si prix journalier activé */}
                      {enabledPrices.daily && (
                        <div className="mt-4">
                          <label className={`block text-sm font-semibold mb-2 flex items-center ${
                            enabledPrices.daily ? 'text-slate-900' : 'text-slate-400'
                          }`}>
                            Durée minimale (jours)
                            <Tooltip content="Nombre de jours minimum de location requises pour les réservations journalières." />
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formData.minDays}
                              onChange={(e) => {
                                // Permettre uniquement les nombres entiers
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                updateFormData('minDays', value);
                              }}
                              placeholder="0"
                              disabled={!enabledPrices.daily}
                              className={`w-32 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${
                                enabledPrices.daily ? 'border-slate-200' : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                              }`}
                            />
                            <span className="text-sm text-slate-600">jour(s)</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            {formData.minDays && parseInt(formData.minDays) > 0 
                              ? `Les clients devront réserver au moins ${formData.minDays} jour${parseInt(formData.minDays) > 1 ? 's' : ''}.`
                              : 'Aucune durée minimum requise. Les clients peuvent réserver pour 1 jour ou plus.'}
                          </p>
                        </div>
                      )}
                      
                      {/* Message informatif si le prix est décoché */}
                      {!enabledPrices.daily && (
                        <p className="text-xs text-slate-400 mt-2 italic">
                          ⚠️ Le prix journalier n'est pas actif pour cette unité.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prix par semaine */}
                  <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors ${
                    enabledPrices.weekly 
                      ? 'border-slate-200 hover:border-emerald-300' 
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={enabledPrices.weekly}
                      onChange={(e) => {
                        setEnabledPrices(prev => ({ ...prev, weekly: e.target.checked }));
                        if (!e.target.checked) {
                          updateFormData('priceWeekly', '');
                        }
                      }}
                      className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label className={`block text-sm font-semibold mb-2 flex items-center ${
                        enabledPrices.weekly ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        Prix par semaine
                        <Tooltip content="Offrir une réduction hebdomadaire (ex: 10% de réduction) attire les réservations longue durée." />
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formData.priceWeekly}
                          onChange={(e) => {
                            // Permettre uniquement les nombres et la virgule/point décimal
                            const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                            updateFormData('priceWeekly', value);
                          }}
                          placeholder="90"
                          disabled={!enabledPrices.weekly}
                          className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${
                            enabledPrices.weekly ? 'border-slate-200' : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                          }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">€</span>
                      </div>
                      
                      {/* Message informatif si le prix est décoché */}
                      {!enabledPrices.weekly && (
                        <p className="text-xs text-slate-400 mt-2 italic">
                          ⚠️ Le prix hebdomadaire n'est pas actif pour cette unité.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prix par mois */}
                  <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors ${
                    enabledPrices.monthly 
                      ? 'border-slate-200 hover:border-emerald-300' 
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={enabledPrices.monthly}
                      onChange={(e) => {
                        setEnabledPrices(prev => ({ ...prev, monthly: e.target.checked }));
                        if (!e.target.checked) {
                          updateFormData('priceMonthly', '');
                        }
                      }}
                      className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label className={`block text-sm font-semibold mb-2 flex items-center ${
                        enabledPrices.monthly ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        Prix par mois
                        <Tooltip content="Le prix mensuel est essentiel. Les locataires recherchent souvent des options mensuelles pour économiser." />
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formData.priceMonthly}
                          onChange={(e) => {
                            // Permettre uniquement les nombres et la virgule/point décimal
                            const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                            updateFormData('priceMonthly', value);
                          }}
                          onBlur={() => handleBlur('priceMonthly')}
                          placeholder="280"
                          disabled={!enabledPrices.monthly}
                          className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all ${
                            enabledPrices.monthly 
                              ? (touchedFields.priceMonthly && fieldValidations.priceMonthly === false ? 'border-red-300' : 'border-slate-200')
                              : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                          }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">€</span>
                      </div>
                      <ValidationMessage 
                        isValid={fieldValidations.priceMonthly} 
                        message={fieldValidations.priceMonthly ? 'Prix valide' : 'Veuillez entrer un prix valide'}
                        isTouched={touchedFields.priceMonthly}
                      />
                      
                      {/* Message informatif si le prix est décoché */}
                      {!enabledPrices.monthly && (
                        <p className="text-xs text-slate-400 mt-2 italic">
                          ⚠️ Le prix mensuel n'est pas actif pour cette unité.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                </>
              )}

              {/* Tab: Conditions */}
              {activeTab === 'conditions' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Section Politique d'annulation (la durée minimum est dans l'onglet Tarifs) */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      Politique d&apos;annulation
                      <Tooltip content="Définissez vos conditions d'annulation. Plus c'est flexible, plus vous attirerez de réservations, mais vous risquez plus d'annulations de dernière minute." />
                    </h3>

                    <div className="space-y-3">
                      {/* Option : FLEXIBLE */}
                      <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors cursor-pointer ${
                        formData.cancellationPolicy === 'FLEXIBLE'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`} onClick={() => updateFormData('cancellationPolicy', 'FLEXIBLE')}>
                        <input
                          type="radio"
                          name="cancellationPolicy"
                          value="FLEXIBLE"
                          checked={formData.cancellationPolicy === 'FLEXIBLE'}
                          onChange={(e) => updateFormData('cancellationPolicy', e.target.value as 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_CANCELLABLE')}
                          className="w-5 h-5 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <label className="block text-sm font-semibold mb-1 text-slate-900 cursor-pointer">
                            Flexible - Annulation gratuite jusqu&apos;à 24h avant
                          </label>
                          <p className="text-xs text-slate-600">
                            Les clients peuvent annuler leur réservation sans frais jusqu&apos;à 24h avant le début de la location
                          </p>
                        </div>
                        <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      </div>

                      {/* Option : MODERATE */}
                      <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors cursor-pointer ${
                        formData.cancellationPolicy === 'MODERATE'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`} onClick={() => updateFormData('cancellationPolicy', 'MODERATE')}>
                        <input
                          type="radio"
                          name="cancellationPolicy"
                          value="MODERATE"
                          checked={formData.cancellationPolicy === 'MODERATE'}
                          onChange={(e) => updateFormData('cancellationPolicy', e.target.value as 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_CANCELLABLE')}
                          className="w-5 h-5 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <label className="block text-sm font-semibold mb-1 text-slate-900 cursor-pointer">
                            Modérée - Annulation gratuite jusqu&apos;à 5 jours avant
                          </label>
                          <p className="text-xs text-slate-600">
                            Les clients peuvent annuler leur réservation sans frais jusqu&apos;à 5 jours avant le début de la location
                          </p>
                        </div>
                        <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      </div>

                      {/* Option : STRICT */}
                      <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors cursor-pointer ${
                        formData.cancellationPolicy === 'STRICT'
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`} onClick={() => updateFormData('cancellationPolicy', 'STRICT')}>
                        <input
                          type="radio"
                          name="cancellationPolicy"
                          value="STRICT"
                          checked={formData.cancellationPolicy === 'STRICT'}
                          onChange={(e) => updateFormData('cancellationPolicy', e.target.value as 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_CANCELLABLE')}
                          className="w-5 h-5 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <label className="block text-sm font-semibold mb-1 text-slate-900 cursor-pointer">
                            Stricte - Annulation gratuite jusqu&apos;à 14 jours avant
                          </label>
                          <p className="text-xs text-slate-600">
                            Les clients peuvent annuler leur réservation sans frais jusqu&apos;à 14 jours avant le début de la location
                          </p>
                        </div>
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      </div>

                      {/* Option : NON_CANCELLABLE */}
                      <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors cursor-pointer ${
                        formData.cancellationPolicy === 'NON_CANCELLABLE'
                          ? 'border-red-600 bg-red-50'
                          : 'border-slate-200 hover:border-red-300'
                      }`} onClick={() => updateFormData('cancellationPolicy', 'NON_CANCELLABLE')}>
                        <input
                          type="radio"
                          name="cancellationPolicy"
                          value="NON_CANCELLABLE"
                          checked={formData.cancellationPolicy === 'NON_CANCELLABLE'}
                          onChange={(e) => updateFormData('cancellationPolicy', e.target.value as 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_CANCELLABLE')}
                          className="w-5 h-5 text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <label className="block text-sm font-semibold mb-1 text-slate-900 cursor-pointer">
                            Non annulable
                          </label>
                          <p className="text-xs text-slate-600">
                            Les réservations ne peuvent pas être annulées. Les clients seront facturés même en cas d&apos;annulation.
                          </p>
                        </div>
                        <Ban className="w-5 h-5 text-red-600 flex-shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Section Type de réservation */}
                  <div className="pt-6 border-t border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      Type de réservation
                      <Tooltip content="Choisissez si les réservations sont automatiquement confirmées (instantanées) ou nécessitent votre approbation." />
                    </h3>

                    <div className="space-y-3">
                      {/* Option : Réservation instantanée */}
                      <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors cursor-pointer ${
                        formData.instantBooking === true
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`} onClick={() => updateFormData('instantBooking', true)}>
                        <input
                          id="radio-instant-booking-true-edit"
                          type="radio"
                          name="instantBooking"
                          value="true"
                          checked={formData.instantBooking === true}
                          onChange={() => updateFormData('instantBooking', true)}
                          className="w-5 h-5 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <label className="block text-sm font-semibold mb-1 text-slate-900 cursor-pointer">
                            Réservation instantanée activée
                          </label>
                          <p className="text-xs text-slate-600">
                            Les réservations sont automatiquement confirmées sans votre validation préalable
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      </div>

                      {/* Option : Réservation avec approbation */}
                      <div className={`flex items-center gap-4 p-4 border rounded-xl transition-colors cursor-pointer ${
                        formData.instantBooking === false
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`} onClick={() => updateFormData('instantBooking', false)}>
                        <input
                          id="radio-instant-booking-false-edit"
                          type="radio"
                          name="instantBooking"
                          value="false"
                          checked={formData.instantBooking === false}
                          onChange={() => updateFormData('instantBooking', false)}
                          className="w-5 h-5 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <label className="block text-sm font-semibold mb-1 text-slate-900 cursor-pointer">
                            Réservation avec approbation
                          </label>
                          <p className="text-xs text-slate-600">
                            Vous devez approuver chaque demande de réservation avant qu&apos;elle ne soit confirmée
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Section Accessibilité */}
                  <div className="pt-6 border-t border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      Accessibilité
                      <Tooltip content="Indiquez la distance d'accès pour les camions et toute remarque utile pour les locataires." />
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Distance d&apos;accès camion (mètres)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formData.truckAccessDistance}
                          onChange={(e) => {
                            const v = e.target.value.replace(',', '.');
                            if (v === '' || /^\d*\.?\d*$/.test(v)) updateFormData('truckAccessDistance', v);
                          }}
                          placeholder="Ex: 50"
                          className="w-full max-w-xs px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                        <p className="text-xs text-slate-600 mt-1">Distance entre la rue et l&apos;espace (optionnel).</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Remarques d&apos;accessibilité
                        </label>
                        <textarea
                          value={formData.accessibilityRemarks}
                          onChange={(e) => updateFormData('accessibilityRemarks', e.target.value)}
                          rows={3}
                          placeholder="Ex: Accès par digicode, 2e sous-sol..."
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Caractéristiques */}
              {activeTab === 'characteristics' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-blue-900">
                      <strong>💡 Astuce :</strong> Plus vos caractéristiques sont détaillées, plus les locataires seront confiants dans leur réservation.
                    </p>
                  </div>

                  {isLoadingCharacteristics ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
                      <p className="text-slate-600">Chargement des caractéristiques...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {dynamicCharacteristics.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                          <p className="text-slate-600">Aucune caractéristique disponible pour ce type d'espace.</p>
                        </div>
                      ) : (
                        (() => {
                          // Grouper les caractéristiques par section (similaire à la page de création)
                          const groupCharacteristicsBySection = (characteristics: typeof dynamicCharacteristics) => {
                            const sections: Record<string, typeof characteristics> = {
                              'Dimensions': [],
                              'Sécurité': [],
                              'Accès': [],
                              'Éclairage': [],
                              'Équipements': [],
                              'Services': [],
                              'Distances': [],
                              'Restrictions': [],
                              'Autres': []
                            };

                            characteristics.forEach(char => {
                              const key = char.key.toUpperCase();
                              
                              if (['LENGTH', 'WIDTH', 'MAX_HEIGHT', 'VOLUME', 'SURFACE', 'HEIGHT'].includes(key)) {
                                sections['Dimensions'].push(char);
                              } else if (['VIDEO_SURVEILLANCE', 'SECURITY_GUARD', 'SECURED_GATE', 'AUTOMATIC_BARRIER', 'LOCK_TYPE', 'NUMBERED_SPACE'].includes(key)) {
                                sections['Sécurité'].push(char);
                              } else if (['ACCESS_TYPE', 'LEVEL', 'DOOR_TYPE', 'STAIRS_TYPE', 'STAIRS_WIDTH', 'ELEVATOR_DIMENSIONS', 'PASSAGE_MIN_WIDTH', 'PASSAGE_MIN_HEIGHT', 'FREIGHT_ELEVATOR', 'PMR_ELEVATOR', 'SPACE_TYPE', 'PARKING_TYPE'].includes(key)) {
                                sections['Accès'].push(char);
                              } else if (['LIGHTING', 'INTERIOR_LIGHT'].includes(key)) {
                                sections['Éclairage'].push(char);
                              } else if (['ELECTRIC_PLUG', 'WATER_POINT', 'ELECTRIC_CHARGING_STATION', 'HAND_TRUCK', 'STORAGE_RACK', 'SHELVES', 'OTHER_EQUIPMENT', 'FLOOR_QUALITY', 'HEATED_DEGREE', 'VENTILATION_TYPE', 'HUMIDITY_STATE', 'STORAGE_TYPE', 'AUTHORIZED_USAGE'].includes(key)) {
                                sections['Équipements'].push(char);
                              } else if (['CLEANING', 'HANDLING_HELP', 'AIRPORT_SHUTTLE', 'STATION_SHUTTLE', 'CHILD_SEAT', 'OTHER_SERVICES', 'PMR_EQUIPMENT'].includes(key)) {
                                sections['Services'].push(char);
                              } else if (key.includes('_DISTANCE') || ['BUS_STOP_DISTANCE', 'TRAIN_STATION_DISTANCE', 'AIRPORT_DISTANCE', 'ELECTRIC_CHARGING_STATION_DISTANCE', 'BEACH_DISTANCE', 'TRUCK_ACCESS_DISTANCE'].includes(key)) {
                                sections['Distances'].push(char);
                              } else if (['TIME_RESTRICTIONS', 'EXCLUSIVITY_24_7', 'STOP_PARKING', 'FLAMMABLE_PROHIBITED', 'GAS_BOTTLE_PROHIBITED', 'GPL_PROHIBITED', 'GPL_ALLOWED', 'MOTORIZED_VEHICLE_PROHIBITED', 'CHEMICAL_PROHIBITED'].includes(key)) {
                                sections['Restrictions'].push(char);
                              } else {
                                sections['Autres'].push(char);
                              }
                            });

                            return Object.entries(sections)
                              .filter(([_, chars]) => chars.length > 0)
                              .map(([title, chars]) => ({ title, characteristics: chars }));
                          };

                          const groupedSections = groupCharacteristicsBySection(dynamicCharacteristics);

                          const getSectionIcon = (sectionTitle: string) => {
                            const iconProps = { className: "w-5 h-5 text-emerald-600" };
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

                          return groupedSections.map((section, sectionIndex) => (
                            <div key={sectionIndex} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-sm">
                              <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-100">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                  {getSectionIcon(section.title)}
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 flex-1">
                                  {section.title}
                                </h3>
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                  {section.characteristics.length} champ{section.characteristics.length > 1 ? 's' : ''}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {section.characteristics.map((characteristic) => {
                                  // Ne pas afficher TIME_RESTRICTIONS si EXCLUSIVITY_24_7 est "Oui"
                                  if (characteristic.key === 'TIME_RESTRICTIONS' && characteristics['EXCLUSIVITY_24_7'] === 'Oui') {
                                    return null;
                                  }
                                  
                                  // Utiliser le label de la caractéristique (déjà enrichi avec CHARACTERISTIC_MAPPING)
                                  return (
                                  <div key={characteristic.key} className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">
                                      {characteristic.label}
                                    </label>

                                    {characteristic.key === 'VEHICLE_TYPE' ? (
                                      <div className="flex flex-wrap gap-2">
                                        {(characteristic.options || []).map((option) => {
                                          const currentValue = characteristics['VEHICLE_TYPE'] || '';
                                          const selectedList = currentValue ? currentValue.split(',').map(s => s.trim()).filter(Boolean) : [];
                                          const isChecked = selectedList.includes(option);
                                          return (
                                            <label
                                              key={option}
                                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                                isChecked ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                  const newList = isChecked
                                                    ? selectedList.filter((s) => s !== option)
                                                    : [...selectedList, option];
                                                  setCharacteristics(prev => {
                                                    const next = { ...prev };
                                                    if (newList.length > 0) {
                                                      next['VEHICLE_TYPE'] = newList.join(', ');
                                                    } else {
                                                      delete next['VEHICLE_TYPE'];
                                                    }
                                                    return next;
                                                  });
                                                }}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                              />
                                              <span className="text-sm font-medium">{option}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    ) : characteristic.type === 'select' ? (
                                      <select
                                        value={characteristics[characteristic.key] || ''}
                                        onChange={(e) => {
                                          const newVal = e.target.value;
                                          setCharacteristics(prev => {
                                            const next = { ...prev, [characteristic.key]: newVal };
                                            // Fréquence réservation : si Début change et que Fin n'est plus valide (Fin <= Début), vider Fin
                                            if (characteristic.key === 'RESERVATION_FREQUENCY_FROM' && next['RESERVATION_FREQUENCY_TO']) {
                                              const fromVal = next['RESERVATION_FREQUENCY_FROM'];
                                              const toVal = next['RESERVATION_FREQUENCY_TO'];
                                              if (fromVal && toVal && toVal <= fromVal) delete next['RESERVATION_FREQUENCY_TO'];
                                            }
                                            // Fréquence réservation : si Fin change et que Début n'est plus valide (Début >= Fin), vider Début
                                            if (characteristic.key === 'RESERVATION_FREQUENCY_TO' && next['RESERVATION_FREQUENCY_FROM']) {
                                              const fromVal = next['RESERVATION_FREQUENCY_FROM'];
                                              const toVal = next['RESERVATION_FREQUENCY_TO'];
                                              if (fromVal && toVal && fromVal >= toVal) delete next['RESERVATION_FREQUENCY_FROM'];
                                            }
                                            return next;
                                          });
                                          if (characteristic.key === 'EXCLUSIVITY_24_7' && newVal === 'Oui') {
                                            setCharacteristics(prev => {
                                              const updated = { ...prev };
                                              delete updated['TIME_RESTRICTIONS'];
                                              return updated;
                                            });
                                          }
                                        }}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                      >
                                        <option value="">Sélectionner...</option>
                                        {(characteristic.key === 'RESERVATION_FREQUENCY_TO'
                                          ? (characteristic.options || []).filter((h: string) => {
                                              const fromVal = characteristics['RESERVATION_FREQUENCY_FROM'] || '';
                                              return fromVal && h > fromVal;
                                            })
                                          : characteristic.key === 'RESERVATION_FREQUENCY_FROM'
                                          ? (characteristic.options || []).filter((h: string) => {
                                              const toVal = characteristics['RESERVATION_FREQUENCY_TO'] || '';
                                              return !toVal || h < toVal;
                                            })
                                          : characteristic.options || []
                                        ).map((option: string) => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type={characteristic.type === 'number' ? 'text' : characteristic.type}
                                        inputMode={characteristic.type === 'number' ? 'decimal' : undefined}
                                        step={characteristic.type === 'number' ? '0.01' : undefined}
                                        value={characteristics[characteristic.key] || ''}
                                        onChange={(e) => {
                                          const newCharacteristics = { ...characteristics };
                                          let inputValue = e.target.value;
                                          
                                          // Pour les champs numériques, normaliser le séparateur décimal (point -> virgule)
                                          if (characteristic.type === 'number' && inputValue) {
                                            // Transformer les points en virgules
                                            inputValue = inputValue.replace(/\./g, ',');
                                            
                                            // Vérifier qu'il n'y a qu'un seul séparateur décimal
                                            const commaCount = (inputValue.match(/,/g) || []).length;
                                            if (commaCount > 1) {
                                              // Si plusieurs virgules, garder seulement la première
                                              const firstCommaIndex = inputValue.indexOf(',');
                                              inputValue = inputValue.substring(0, firstCommaIndex + 1) + inputValue.substring(firstCommaIndex + 1).replace(/,/g, '');
                                            }
                                            
                                            // Valider que c'est un nombre valide (chiffres avec virgule optionnelle)
                                            const cleanedValue = inputValue.trim();
                                            const isValidNumber = /^\d*[,]?\d*$/.test(cleanedValue);
                                            
                                            if (!isValidNumber && cleanedValue !== '') {
                                              // Si ce n'est pas valide, ne pas mettre à jour
                                              return;
                                            }
                                            
                                            inputValue = cleanedValue;
                                          }
                                          
                                          if (inputValue) {
                                            newCharacteristics[characteristic.key] = inputValue;
                                          } else {
                                            delete newCharacteristics[characteristic.key];
                                          }
                                          
                                          setCharacteristics(newCharacteristics);
                                        }}
                                        onBlur={(e) => {
                                          // Pour les champs numériques, normaliser en virgule à la sortie
                                          if (characteristic.type === 'number') {
                                            const currentValue = characteristics[characteristic.key] || '';
                                            if (currentValue) {
                                              // Convertir les points en virgules
                                              let normalizedValue = currentValue.replace(/\./g, ',');
                                              
                                              // S'assurer qu'il n'y a qu'une seule virgule
                                              const commaCount = (normalizedValue.match(/,/g) || []).length;
                                              if (commaCount > 1) {
                                                const firstCommaIndex = normalizedValue.indexOf(',');
                                                normalizedValue = normalizedValue.substring(0, firstCommaIndex + 1) + normalizedValue.substring(firstCommaIndex + 1).replace(/,/g, '');
                                              }
                                              
                                              // Mettre à jour la valeur normalisée
                                              if (normalizedValue !== currentValue) {
                                                setCharacteristics(prev => ({
                                                  ...prev,
                                                  [characteristic.key]: normalizedValue
                                                }));
                                              }
                                            }
                                          }
                                        }}
                                        placeholder={characteristic.placeholder}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                      />
                                    )}
                                  </div>
                                  );
                                })}
                              </div>
                            </div>
                          ));
                        })()
                      )}

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <p className="text-sm text-slate-600">
                          <strong>ℹ️ Note :</strong> Ces informations détaillées permettent aux locataires de mieux évaluer si votre espace correspond à leurs besoins.
                          Vous pouvez laisser certains champs vides si vous ne connaissez pas la valeur exacte.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Disponibilités */}
              {activeTab === 'calendar' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {isLoadingCalendar && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      <p className="text-sm text-blue-900">
                        <strong>Chargement des disponibilités...</strong> Récupération du calendrier depuis le backend.
                      </p>
                    </div>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-blue-900">
                      <strong>📅 Astuce :</strong> Les hôtes qui mettent une disponibilité régulière reçoivent 30% plus de réservations.
                    </p>
                  </div>

                  {/* Période d'ouverture du lieu (API calendar: availableFrom / availableTo) */}
                  {calendarOpenFrom && calendarOpenTo && (
                    <p className="text-sm text-slate-600 mb-2">
                      Le lieu est ouvert à la location du <strong>{new Date(calendarOpenFrom).toLocaleDateString('fr-FR')}</strong> au <strong>{new Date(calendarOpenTo).toLocaleDateString('fr-FR')}</strong>. Restreignez vos dates à cette plage.
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Date de début */}
                    <div className="relative z-10">
                      <label className="block text-sm font-semibold text-slate-900 mb-2 flex items-center">
                        Date de début *
                        <Tooltip content="La date à partir de laquelle votre espace sera disponible à la location." />
                      </label>
                      <button
                        ref={startDateButtonRef}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowStartDatePicker(!showStartDatePicker);
                          setShowEndDatePicker(false);
                        }}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white hover:border-emerald-300 transition-all flex items-center justify-between shadow-sm hover:shadow-md cursor-pointer"
                      >
                        <span className={currentDateRange.start ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                          {currentDateRange.start 
                            ? new Date(currentDateRange.start).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : 'Sélectionner une date'}
                        </span>
                        <Calendar className="w-5 h-5 text-emerald-600" />
                      </button>
                      
                      {showStartDatePicker && startDatePickerPos && (
                        <Portal>
                          <div 
                            className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-[360px] max-w-[90vw] z-[9999] pointer-events-auto"
                            ref={startDatePickerRef}
                            style={{
                              top: `${startDatePickerPos.top}px`,
                              left: `${startDatePickerPos.left}px`,
                            }}
                          >
                            <DatePickerCalendar
                              selectedDate={currentDateRange.start ? new Date(currentDateRange.start) : null}
                              onSelectDate={(date) => {
                                setCurrentDateRange(prev => ({ ...prev, start: date.toISOString().split('T')[0] }));
                                setShowStartDatePicker(false);
                              }}
                              onClearDate={() => {
                                setCurrentDateRange(prev => ({ ...prev, start: '' }));
                                setShowStartDatePicker(false);
                              }}
                              minDate={(() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                if (calendarOpenFrom) {
                                  const from = new Date(calendarOpenFrom);
                                  from.setHours(0, 0, 0, 0);
                                  return from > today ? from : today;
                                }
                                return today;
                              })()}
                              maxDate={calendarOpenTo ? new Date(calendarOpenTo) : undefined}
                              currentMonth={calendarMonth}
                              onMonthChange={setCalendarMonth}
                              availableDates={new Set((Array.isArray(calendarAvailabilities) ? calendarAvailabilities : []).filter(a => a.available === true).map(a => a.date))}
                            />
                          </div>
                        </Portal>
                      )}
                    </div>

                    {/* Date de fin */}
                    <div className="relative z-10">
                      <label className="block text-sm font-semibold text-slate-900 mb-2 flex items-center">
                        Date de fin *
                        <Tooltip content="La date jusqu&apos;à laquelle votre espace sera disponible." />
                      </label>
                      <button
                        ref={endDateButtonRef}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEndDatePicker(!showEndDatePicker);
                          setShowStartDatePicker(false);
                        }}
                        disabled={!currentDateRange.start}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all flex items-center justify-between shadow-sm ${
                          !currentDateRange.start
                            ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md cursor-pointer'
                        }`}
                      >
                        <span className={currentDateRange.end ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                          {currentDateRange.end 
                            ? new Date(currentDateRange.end).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : 'Sélectionner une date'}
                        </span>
                        <Calendar className={`w-5 h-5 ${!currentDateRange.start ? 'text-slate-400' : 'text-emerald-600'}`} />
                      </button>
                      
                      {showEndDatePicker && endDatePickerPos && (
                        <Portal>
                          <div 
                            className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-[360px] max-w-[90vw] z-[9999] pointer-events-auto"
                            ref={endDatePickerRef}
                            style={{
                              top: `${endDatePickerPos.top}px`,
                              left: `${endDatePickerPos.left}px`,
                            }}
                          >
                            <DatePickerCalendar
                              selectedDate={currentDateRange.end ? new Date(currentDateRange.end) : null}
                              onSelectDate={(date) => {
                                setCurrentDateRange(prev => ({ ...prev, end: date.toISOString().split('T')[0] }));
                                setShowEndDatePicker(false);
                              }}
                              onClearDate={() => {
                                setCurrentDateRange(prev => ({ ...prev, end: '' }));
                                setShowEndDatePicker(false);
                              }}
                              minDate={currentDateRange.start ? new Date(currentDateRange.start) : new Date()}
                              maxDate={calendarOpenTo ? new Date(calendarOpenTo) : undefined}
                              currentMonth={calendarMonth}
                              onMonthChange={setCalendarMonth}
                              availableDates={new Set((Array.isArray(calendarAvailabilities) ? calendarAvailabilities : []).filter(a => a.available === true).map(a => a.date))}
                            />
                          </div>
                        </Portal>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addDateRange}
                    disabled={isSavingCalendar}
                    className={`w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 transform hover:scale-102 cursor-pointer ${
                      isSavingCalendar ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSavingCalendar ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sauvegarde...</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-5 h-5" />
                        Ajouter cette période
                      </>
                    )}
                  </button>

                  {availableDates.length > 0 && (
                    <div className="space-y-2 mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-slate-900">Périodes ajoutées :</h3>
                        {isSavingCalendar && (
                          <div className="flex items-center gap-2 text-xs text-emerald-600">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Sauvegarde...</span>
                          </div>
                        )}
                      </div>
                      {availableDates.map((range, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-left-2 duration-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-600" />
                            <span className="text-sm text-slate-900">
                              {new Date(range.start).toLocaleDateString('fr-FR')} - {new Date(range.end).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDateRange(idx)}
                            disabled={isSavingCalendar}
                            className={`text-red-500 hover:text-red-700 transition-colors transform hover:scale-110 cursor-pointer ${
                              isSavingCalendar ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Photos */}
              {activeTab === 'photos' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-amber-900">
                      <strong>💡 Astuce :</strong> Ajoutez minimum 5 photos. Les annonces avec plus de 7 photos convertissent mieux.
                    </p>
                  </div>

                  <label className="block">
                    <div className="border-2 border-dashed border-slate-200 hover:border-emerald-300 rounded-2xl p-12 text-center transition-all cursor-pointer group">
                      <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {imagePreviews.length === 0 
                          ? 'Glissez-déposez vos photos ici' 
                          : `Ajoutez ${Math.max(0, 5 - imagePreviews.length)} photo(s) supplémentaire(s)`}
                      </h3>
                      <p className="text-sm text-slate-600 mb-4">ou cliquez pour sélectionner</p>
                      <div className="px-6 py-3 text-white font-semibold rounded-lg transition-all inline-block bg-emerald-600 hover:bg-emerald-700 group-hover:scale-105">
                        Parcourir les fichiers
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
                      {imagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group animate-in zoom-in duration-300">
                          <Image 
                            src={preview} 
                            alt={`Photo ${idx + 1}`} 
                            fill 
                            className="object-cover transition-transform group-hover:scale-110" 
                          />
                          <button 
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {idx === 0 && (
                            <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded">
                              Photo principale
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-200">
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      URL de la vidéo du bien (optionnel)
                    </label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => updateFormData('videoUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-600 mt-1">Vidéo courte (max 10 secondes) pour présenter l&apos;espace.</p>
                  </div>
                </div>
              )}

              {/* Tab: Messages automatisés */}
              {activeTab === 'messages' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 overflow-hidden">
                    <p className="text-sm text-blue-900 break-words">
                      <strong>💡 Astuce :</strong> Configurez des messages personnalisés qui seront envoyés automatiquement à vos clients lors des différentes étapes de leur réservation.
                    </p>
                  </div>

                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                      <span className="ml-3 text-slate-600">Chargement des messages...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {automatedMessages.map((message, index) => {
                        const messageLabels = {
                          'ON_RESERVATION': {
                            title: 'Message de bienvenue',
                            description: 'Envoyé instantanément lors de la confirmation d\'une nouvelle réservation',
                            placeholder: 'Bonjour, merci pour votre réservation ! Voici les instructions pour accéder au parking...'
                          },
                          'BEFORE_START': {
                            title: 'Message du jour J',
                            description: 'Envoyé automatiquement la veille du début de la location (à 9h00)',
                            placeholder: 'Petit rappel : votre location commence demain. À très vite !'
                          },
                          'AFTER_END': {
                            title: 'Message checkout',
                            description: 'Envoyé automatiquement le jour de la fin de la location (à 18h00)',
                            placeholder: 'Votre location est terminée. J\'espère que tout s\'est bien passé. N\'hésitez pas à me laisser un avis !'
                          }
                        };

                        const label = messageLabels[message.type];

                        return (
                          <div key={message.type} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 overflow-hidden">
                            <div className="flex items-start justify-between gap-4 min-w-0">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 break-words">{label.title}</h3>
                                <p className="text-xs sm:text-sm text-slate-600 mb-4 break-words">{label.description}</p>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                                <input
                                  type="checkbox"
                                  checked={message.active}
                                  onChange={(e) => {
                                    const updated = [...automatedMessages];
                                    updated[index].active = e.target.checked;
                                    setAutomatedMessages(updated);
                                  }}
                                  className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer flex-shrink-0"
                                />
                                <span className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">
                                  {message.active ? 'Activé' : 'Désactivé'}
                                </span>
                              </label>
                            </div>

                            {message.active && (
                              <div className="overflow-hidden space-y-4">
                                {/* Configuration de l'heure et du décalage - Sauf pour ON_RESERVATION */}
                                {message.type !== 'ON_RESERVATION' && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Décalage de jours */}
                                    <div>
                                      <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                                        Décalage (jours)
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <select
                                          value={message.daysOffset ?? 0}
                                          onChange={(e) => {
                                            const updated = [...automatedMessages];
                                            updated[index].daysOffset = parseInt(e.target.value, 10);
                                            setAutomatedMessages(updated);
                                          }}
                                          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm bg-white"
                                        >
                                          <option value={-7}>7 jours avant</option>
                                          <option value={-3}>3 jours avant</option>
                                          <option value={-2}>2 jours avant</option>
                                          <option value={-1}>1 jour avant (veille)</option>
                                          <option value={0}>Le jour même</option>
                                          <option value={1}>1 jour après (lendemain)</option>
                                          <option value={2}>2 jours après</option>
                                          <option value={3}>3 jours après</option>
                                          <option value={7}>7 jours après</option>
                                        </select>
                                      </div>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {message.daysOffset === 0 
                                          ? 'Envoyé le jour de l\'événement'
                                          : message.daysOffset !== undefined && message.daysOffset < 0
                                          ? `Envoyé ${Math.abs(message.daysOffset)} jour${Math.abs(message.daysOffset) > 1 ? 's' : ''} avant l'événement`
                                          : message.daysOffset !== undefined
                                          ? `Envoyé ${message.daysOffset} jour${message.daysOffset > 1 ? 's' : ''} après l'événement`
                                          : 'Date non disponible'}
                                      </p>
                                    </div>

                                    {/* Heure d'envoi */}
                                    <div>
                                      <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                                        Heure d'envoi
                                      </label>
                                      <input
                                        type="time"
                                        value={message.sendingTime || '09:00'}
                                        onChange={(e) => {
                                          const updated = [...automatedMessages];
                                          // Convertir HH:mm en HH:mm:ss
                                          const timeValue = e.target.value;
                                          updated[index].sendingTime = timeValue ? `${timeValue}:00` : undefined;
                                          setAutomatedMessages(updated);
                                        }}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm bg-white"
                                      />
                                      <p className="mt-1 text-xs text-slate-500">
                                        Heure à laquelle le message sera envoyé
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Message pour ON_RESERVATION */}
                                {message.type === 'ON_RESERVATION' && (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4">
                                    <p className="text-xs sm:text-sm text-emerald-800">
                                      ⚡ Ce message est envoyé <strong>instantanément</strong> lors de la confirmation de la réservation. Aucune programmation nécessaire.
                                    </p>
                                  </div>
                                )}

                                {/* Contenu du message */}
                                <div>
                                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                                    Contenu du message
                                  </label>
                                  <textarea
                                    value={message.content}
                                    onChange={(e) => {
                                      const updated = [...automatedMessages];
                                      updated[index].content = e.target.value;
                                      setAutomatedMessages(updated);
                                    }}
                                    placeholder={label.placeholder}
                                    maxLength={2000}
                                    rows={6}
                                    className="w-full min-w-0 px-3 sm:px-4 py-2 sm:py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm resize-y overflow-x-hidden break-words"
                                    style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                                  />
                                  <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                                    <p className="text-xs text-slate-500 whitespace-nowrap">
                                      {message.content.length} / 2000 caractères
                                    </p>
                                    {message.content.length > 1900 && (
                                      <p className="text-xs text-amber-600 whitespace-nowrap">
                                        ⚠️ Approche de la limite
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {!message.active && (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 overflow-hidden">
                                <p className="text-xs sm:text-sm text-slate-600 break-words">
                                  Ce message est désactivé. Le système utilisera le message par défaut de la plateforme.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de confirmation pour approuver */}
      <ConfirmationModal
        isOpen={showApproveModal}
        onClose={() => {
          if (!isApprovingReservation) {
            setShowApproveModal(false);
            setReservationToApprove(null);
          }
        }}
        onConfirm={async () => {
          if (!reservationToApprove) return;
          
          try {
            setIsApprovingReservation(true);
            await reservationsAPI.approveReservation(reservationToApprove.id);
            console.log('✅ [EDIT PLACE] Réservation approuvée');
            
            // Recharger les réservations en attente
            const userId = localStorage.getItem('userId');
            if (userId) {
              const userIdNum = parseInt(userId, 10);
              const allPending = await reservationsAPI.getPendingReservationsForOwner(userIdNum);
              const placePendingReservations = allPending.filter(r => r.placeId === placeId);
              setPendingReservations(placePendingReservations);
              
              // Recharger les informations des clients
              const uniqueClientIds = new Set(placePendingReservations.map(r => r.clientId).filter(id => id !== undefined && id !== null));
              const clientsMap = new Map<number, UserDTO>();
              
              await Promise.all(Array.from(uniqueClientIds).map(async (clientId) => {
                try {
                  const clientInfo = await rentoallUsersAPI.getProfile(clientId);
                  clientsMap.set(clientId, clientInfo);
                } catch (err) {
                  console.error(`❌ [EDIT PLACE] Erreur lors de la récupération du client ${clientId}:`, err);
                }
              }));
              
              setClientsMap(clientsMap);
            }
            
            setShowApproveModal(false);
            setReservationToApprove(null);
          } catch (err) {
            console.error('❌ [EDIT PLACE] Erreur lors de l\'approbation:', err);
            const errorObj = err as { response?: { data?: { message?: string } } };
            alert(errorObj?.response?.data?.message || 'Erreur lors de l\'approbation de la réservation');
          } finally {
            setIsApprovingReservation(false);
          }
        }}
        title="Approuver la réservation"
        message="Êtes-vous sûr de vouloir approuver cette réservation ? Le paiement sera prélevé et la réservation sera confirmée."
        confirmText="Approuver"
        cancelText="Annuler"
        confirmButtonColor="emerald"
        isLoading={isApprovingReservation}
      />

      {/* Modal de confirmation pour refuser */}
      <ConfirmationModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setReservationToReject(null);
        }}
        onConfirm={async () => {
          if (!reservationToReject) return;
          
          try {
            await reservationsAPI.rejectReservation(reservationToReject.id);
            console.log('✅ [EDIT PLACE] Réservation refusée');
            
            // Recharger les réservations en attente
            const userId = localStorage.getItem('userId');
            if (userId) {
              const userIdNum = parseInt(userId, 10);
              const allPending = await reservationsAPI.getPendingReservationsForOwner(userIdNum);
              const placePendingReservations = allPending.filter(r => r.placeId === placeId);
              setPendingReservations(placePendingReservations);
              
              // Recharger les informations des clients
              const uniqueClientIds = new Set(placePendingReservations.map(r => r.clientId).filter(id => id !== undefined && id !== null));
              const clientsMap = new Map<number, UserDTO>();
              
              await Promise.all(Array.from(uniqueClientIds).map(async (clientId) => {
                try {
                  const clientInfo = await rentoallUsersAPI.getProfile(clientId);
                  clientsMap.set(clientId, clientInfo);
                } catch (err) {
                  console.error(`❌ [EDIT PLACE] Erreur lors de la récupération du client ${clientId}:`, err);
                }
              }));
              
              setClientsMap(clientsMap);
            }
            
            setShowRejectModal(false);
            setReservationToReject(null);
          } catch (err) {
            console.error('❌ [EDIT PLACE] Erreur lors du refus:', err);
            const errorObj = err as { response?: { data?: { message?: string } } };
            alert(errorObj?.response?.data?.message || 'Erreur lors du refus de la réservation');
          }
        }}
        title="Refuser la réservation"
        message="Êtes-vous sûr de vouloir refuser cette réservation ? Les fonds seront débloqués pour le client et la réservation sera annulée."
        confirmText="Refuser"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* Modal de confirmation pour accepter une modification de réservation */}
      <ConfirmationModal
        isOpen={showAcceptUpdateModal}
        onClose={() => {
          if (!isAcceptingUpdate) {
            setShowAcceptUpdateModal(false);
            setReservationToAcceptUpdate(null);
          }
        }}
        onConfirm={async () => {
          if (!reservationToAcceptUpdate) return;
          
          try {
            setIsAcceptingUpdate(true);
            const updatedReservation = await reservationsAPI.respondUpdate(reservationToAcceptUpdate.id, true);
            console.log('✅ [EDIT PLACE] Modification acceptée:', updatedReservation);
            
            const userId = localStorage.getItem('userId');
            if (userId) {
              const userIdNum = parseInt(userId, 10);
              const allPending = await reservationsAPI.getPendingReservationsForOwner(userIdNum);
              const placePendingReservations = allPending.filter(r => r.placeId === placeId);
              setPendingReservations(placePendingReservations);
              
              const uniqueClientIds = new Set(placePendingReservations.map(r => r.clientId).filter(id => id !== undefined && id !== null));
              const clientsMap = new Map<number, UserDTO>();
              
              await Promise.all(Array.from(uniqueClientIds).map(async (clientId) => {
                try {
                  const clientInfo = await rentoallUsersAPI.getProfile(clientId);
                  clientsMap.set(clientId, clientInfo);
                } catch (err) {
                  console.error(`❌ [EDIT PLACE] Erreur lors de la récupération du client ${clientId}:`, err);
                }
              }));
              
              setClientsMap(clientsMap);
            }
            
            setShowAcceptUpdateModal(false);
            setReservationToAcceptUpdate(null);
          } catch (err) {
            console.error('❌ [EDIT PLACE] Erreur lors de l\'acceptation de la modification:', err);
            const errorObj = err as { response?: { data?: { message?: string } } };
            alert(errorObj?.response?.data?.message || 'Erreur lors de l\'acceptation de la modification');
          } finally {
            setIsAcceptingUpdate(false);
          }
        }}
        title="Accepter la modification"
        message={reservationToAcceptUpdate?.priceDifference && reservationToAcceptUpdate.priceDifference > 0
          ? 'Êtes-vous sûr de vouloir accepter cette modification ? Le client devra payer le supplément pour finaliser.'
          : 'Êtes-vous sûr de vouloir accepter cette modification ? Les nouvelles dates seront appliquées.'}
        confirmText="Accepter"
        cancelText="Annuler"
        confirmButtonColor="emerald"
        isLoading={isAcceptingUpdate}
        variant="success"
      />

      {/* Modal de confirmation pour refuser une modification de réservation */}
      <ConfirmationModal
        isOpen={showRefuseUpdateModal}
        onClose={() => {
          setShowRefuseUpdateModal(false);
          setReservationToRefuseUpdate(null);
        }}
        onConfirm={async () => {
          if (!reservationToRefuseUpdate) return;
          
          try {
            await reservationsAPI.respondUpdate(reservationToRefuseUpdate.id, false);
            console.log('✅ [EDIT PLACE] Modification refusée');
            
            const userId = localStorage.getItem('userId');
            if (userId) {
              const userIdNum = parseInt(userId, 10);
              const allPending = await reservationsAPI.getPendingReservationsForOwner(userIdNum);
              const placePendingReservations = allPending.filter(r => r.placeId === placeId);
              setPendingReservations(placePendingReservations);
              
              const uniqueClientIds = new Set(placePendingReservations.map(r => r.clientId).filter(id => id !== undefined && id !== null));
              const clientsMap = new Map<number, UserDTO>();
              
              await Promise.all(Array.from(uniqueClientIds).map(async (clientId) => {
                try {
                  const clientInfo = await rentoallUsersAPI.getProfile(clientId);
                  clientsMap.set(clientId, clientInfo);
                } catch (err) {
                  console.error(`❌ [EDIT PLACE] Erreur lors de la récupération du client ${clientId}:`, err);
                }
              }));
              
              setClientsMap(clientsMap);
            }
            
            setShowRefuseUpdateModal(false);
            setReservationToRefuseUpdate(null);
          } catch (err) {
            console.error('❌ [EDIT PLACE] Erreur lors du refus de la modification:', err);
            const errorObj = err as { response?: { data?: { message?: string } } };
            alert(errorObj?.response?.data?.message || 'Erreur lors du refus de la modification');
          }
        }}
        title="Refuser la modification"
        message="Êtes-vous sûr de vouloir refuser cette modification ? La demande du client sera annulée et les dates actuelles resteront en vigueur."
        confirmText="Refuser"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      <div className="shrink-0">
        <FooterNavigation />
      </div>
    </div>
  );
}

