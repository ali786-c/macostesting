'use client';

import React, { useState, useEffect } from 'react';
import { X, Euro, Car, Box, Warehouse, Check, ChevronDown, Shield, Zap, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { placesAPI, AvailableFilters } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';

// Mapping des caractéristiques API vers les labels et types d'input (même que dans create/page.tsx)
// Énum backend (VehicleType) → libellé affiché (filtres recherche)
const VEHICLE_TYPE_API_TO_DISPLAY: Record<string, string> = {
  MOTO: 'Moto',
  VOITURE: 'Voiture',
  CAMION: 'Camion',
  CARAVANE: 'Caravane',
  CAMPING_CAR: 'Camping car',
};

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
  'FLAMMABLE_PROHIBITED': { label: 'Inflammables interdits', type: 'select', options: ['Oui', 'Non'] },
  'GAS_BOTTLE_PROHIBITED': { label: 'Bouteilles de gaz interdites', type: 'select', options: ['Oui', 'Non'] },
  'CHEMICAL_PROHIBITED': { label: 'Produits chimiques interdits', type: 'select', options: ['Oui', 'Non'] },
  
  // ========== CARACTÉRISTIQUES CAVE ==========
  'HUMIDITY': { label: 'Humidité', type: 'select', options: ['Sec', 'Sain', 'Risque humidité'] },
  'VENTILATION': { label: 'Ventilation', type: 'select', options: ['VMC', 'Naturelle', 'Mécanique', 'Aucune'] },
  'NUMBERED_ZONE': { label: 'Zone numérotée', type: 'select', options: ['Oui', 'Non'] },
};

// Fonction pour traduire un nom de caractéristique en français
const translateCharacteristicName = (name: string): string => {
  const mapping = CHARACTERISTIC_MAPPING[name];
  if (mapping) {
    return mapping.label;
  }
  // Si pas de mapping, créer un label par défaut en français
  const words = name.split('_');
  const translatedWords = words.map(word => {
    const upperWord = word.toUpperCase();
    if (upperWord === 'PMR') return 'PMR';
    if (upperWord === 'GPL') return 'GPL';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return translatedWords.join(' ');
};

interface AdvancedFiltersProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  priceUnit?: 'hour' | 'day' | 'week' | 'month';
  onPriceUnitChange?: (unit: 'hour' | 'day' | 'week' | 'month') => void;
  instantBooking: boolean | null;
  onInstantBookingChange: (value: boolean | null) => void;
  freeCancellation: boolean | null;
  onFreeCancellationChange: (value: boolean | null) => void;
  noDeposit: boolean | null;
  onNoDepositChange: (value: boolean | null) => void;
  selectedEquipment?: string[];
  onEquipmentChange?: (equipment: string[]) => void;
  selectedCharacteristics?: Record<string, string[]>;
  onCharacteristicsChange?: (characteristics: Record<string, string[]>) => void;
  searchRadius?: 'none' | 5 | 10 | 20 | 50;
  onSearchRadiusChange?: (radius: 'none' | 5 | 10 | 20 | 50) => void;
  onClose?: () => void;
  onApplyFilters?: () => void; // Fonction appelée quand on clique sur "Afficher les espaces"
  className?: string;
  filteredListingsCount?: number;
  /** Quand true, n'affiche pas le backdrop ni la modal (pour intégration dans un conteneur mobile) */
  embedInContainer?: boolean;
  /** Incrémenté par le parent lors d'un "Réinitialiser les filtres" pour forcer la popup à tout décocher / réinitialiser l'affichage */
  resetKey?: number;
}

const TYPE_SPECIFICATIONS = {
  parking: [
    { id: 'covered', label: 'Couvert' },
    { id: 'outdoor', label: 'Extérieur' },
    { id: 'underground', label: 'Souterrain' },
    { id: 'small', label: 'Petit (< 5m)' },
    { id: 'medium', label: 'Moyen (5-6m)' },
    { id: 'large', label: 'Grand (> 6m)' },
  ],
  storage: [
    { id: 'small', label: 'Petit (< 10m²)' },
    { id: 'medium', label: 'Moyen (10-15m²)' },
    { id: 'large', label: 'Grand (15-20m²)' },
    { id: 'xlarge', label: 'Très grand (> 20m²)' },
    { id: 'shelves', label: 'Avec étagères' },
    { id: 'cart', label: 'Chariot disponible' },
  ],
  cellar: [
    { id: 'small', label: 'Petit (< 6m²)' },
    { id: 'medium', label: 'Moyen (6-8m²)' },
    { id: 'large', label: 'Grand (> 8m²)' },
    { id: 'temperature', label: 'Température stable' },
    { id: 'wine', label: 'Adapté au vin' },
  ],
};

export default function AdvancedFilters({
  selectedTypes,
  onTypesChange,
  priceRange,
  onPriceRangeChange,
  priceUnit = 'day',
  onPriceUnitChange,
  instantBooking,
  onInstantBookingChange,
  freeCancellation,
  onFreeCancellationChange,
  noDeposit,
  onNoDepositChange,
  selectedEquipment = [],
  onEquipmentChange,
  selectedCharacteristics,
  onCharacteristicsChange,
  searchRadius = 'none',
  onSearchRadiusChange,
  onClose,
  onApplyFilters,
  className = '',
  filteredListingsCount = 0,
  embedInContainer = false,
  resetKey,
}: AdvancedFiltersProps) {
  const { t } = useLanguage();
  const [showTypeSpecs, setShowTypeSpecs] = useState<Record<string, boolean>>({});
  const [showCharacteristics, setShowCharacteristics] = useState<Record<string, boolean>>({});
  const [internalSelectedTypeSpecs, setInternalSelectedTypeSpecs] = useState<Record<string, string[]>>(selectedCharacteristics || {});
  const [dynamicCharacteristics, setDynamicCharacteristics] = useState<Record<string, Array<{ key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[]; required?: boolean }>>>({});
  const [isLoadingCharacteristics, setIsLoadingCharacteristics] = useState<Record<string, boolean>>({});
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters | null>(null);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  // États locaux pour permettre la saisie libre dans les champs de prix
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  
  // Charger les filtres disponibles depuis le backend
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setIsLoadingFilters(true);
        console.log('🔵 [ADVANCED FILTERS] Chargement des filtres disponibles depuis le backend...');
        const filters = await placesAPI.getAvailableFilters();
        console.log('✅ [ADVANCED FILTERS] Filtres disponibles chargés:', filters);
        setAvailableFilters(filters);
      } catch (error) {
        console.error('❌ [ADVANCED FILTERS] Erreur lors du chargement des filtres:', error);
      } finally {
        setIsLoadingFilters(false);
      }
    };
    
    loadFilters();
  }, []);

  // Prix maximum selon l'unité (valeur fixe, pas de chargement depuis l'API)
  const getMaxPrice = () => {
    switch (priceUnit) {
      case 'hour':
        return 50; // Max 50€/heure
      case 'day':
        return 1000; // Max 1000€/jour
      case 'week':
        return 2000; // Max 2000€/semaine
      case 'month':
        return 5000; // Max 5000€/mois
      default:
        return 1000;
    }
  };
  
  
  // Utiliser les caractéristiques externes si fournies, sinon utiliser l'état interne
  const selectedTypeSpecs = selectedCharacteristics !== undefined ? selectedCharacteristics : internalSelectedTypeSpecs;
  
  // Synchroniser l'état interne avec le parent quand les filtres sont modifiés en dehors de la popup (ex: badge retiré sur la page)
  useEffect(() => {
    if (selectedCharacteristics !== undefined) {
      setInternalSelectedTypeSpecs(selectedCharacteristics);
    }
  }, [selectedCharacteristics]);

  // Quand le parent réinitialise les filtres (resetKey incrémenté), tout remettre à l'état "tout décoché" dans la popup
  useEffect(() => {
    if (resetKey == null) return;
    setInternalSelectedTypeSpecs(selectedCharacteristics ?? {});
    setMinPriceInput(priceRange[0].toString());
    setMaxPriceInput(priceRange[1].toString());
    setShowTypeSpecs({});
    setShowCharacteristics({});
  }, [resetKey, selectedCharacteristics, priceRange]);
  
  // Synchroniser les changements avec le parent si onCharacteristicsChange est fourni
  const setSelectedTypeSpecs = (specs: Record<string, string[]>) => {
    setInternalSelectedTypeSpecs(specs);
    if (onCharacteristicsChange) {
      onCharacteristicsChange(specs);
    }
  };


  // Bloquer le scroll de la page principale quand la popup est ouverte (sauf en mode embed où le parent gère déjà)
  useEffect(() => {
    if (onClose && !embedInContainer) {
      // Sauvegarder la position de scroll actuelle
      const scrollY = window.scrollY;
      
      // Bloquer le scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Restaurer le scroll quand le composant est démonté
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [onClose, embedInContainer]);

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
          
          console.log('🔵 [ADVANCED FILTERS] Chargement des caractéristiques pour:', type, '->', apiType);
          
          const rawData = await placesAPI.getCharacteristics(apiType);
          const characteristicsData = Array.isArray(rawData) ? rawData : [];
          
          // Vérifier si le backend retourne des objets avec métadonnées complètes ou juste des strings
          const firstItem = characteristicsData[0];
          const hasFullMetadata = firstItem && typeof firstItem === 'object' && 'key' in firstItem && 'label' in firstItem;
          
          let characteristics: Array<{ key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[]; required?: boolean }>;
          
          if (hasFullMetadata) {
            // Le backend retourne directement les métadonnées complètes avec options
            characteristics = characteristicsData.map((item: any) => {
              const char = {
                key: item.key || item.name,
                label: item.label,
                type: (item.type || 'text') as 'text' | 'number' | 'select',
                placeholder: item.placeholder,
                options: item.options || undefined,
                required: item.required || false
              };
              
              // Si c'est un select mais qu'il n'y a pas d'options, essayer de les récupérer depuis le mapping local
              if (char.type === 'select' && (!char.options || char.options.length === 0)) {
                const mapping = CHARACTERISTIC_MAPPING[char.key];
                if (mapping && mapping.options) {
                  console.log(`⚠️ [ADVANCED FILTERS] Options manquantes pour ${char.key}, utilisation du mapping local`);
                  char.options = mapping.options;
                }
              }
              
              return char;
            });
            
            console.log('✅ [ADVANCED FILTERS] Caractéristiques avec métadonnées complètes chargées:', characteristics.length);
            // Log des caractéristiques avec options
            const characteristicsWithOptions = characteristics.filter(c => c.options && c.options.length > 0);
            if (characteristicsWithOptions.length > 0) {
              console.log('✅ [ADVANCED FILTERS] Caractéristiques avec options:', characteristicsWithOptions.map(c => ({ key: c.key, optionsCount: c.options?.length })));
            }
          } else {
            // Format legacy : le backend retourne juste des noms (strings)
            // Utiliser le mapping comme fallback
            console.log('⚠️ [ADVANCED FILTERS] Backend retourne seulement les noms, utilisation du mapping local');
            characteristics = (characteristicsData as string[]).map((name: string) => {
              const mapping = CHARACTERISTIC_MAPPING[name];
              if (mapping) {
                return {
                  key: name,
                  label: mapping.label,
                  type: mapping.type,
                  placeholder: mapping.placeholder,
                  options: mapping.options,
                  required: false
                };
              } else {
                // Si pas de mapping, créer un label par défaut en français
                return {
                  key: name,
                  label: translateCharacteristicName(name),
                  type: 'text' as const,
                  required: false
                };
              }
            });
          }
          
          console.log('✅ [ADVANCED FILTERS] Caractéristiques chargées pour', type, ':', characteristics.length);
          
          setDynamicCharacteristics(prev => ({
            ...prev,
            [type]: characteristics
          }));
        } catch (error) {
          console.error(`❌ [ADVANCED FILTERS] Erreur lors du chargement des caractéristiques pour ${type}:`, error);
        } finally {
          setIsLoadingCharacteristics(prev => ({ ...prev, [type]: false }));
        }
      }
    };

    loadCharacteristicsForTypes();
  }, [selectedTypes, dynamicCharacteristics, isLoadingCharacteristics]);

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
      const currentSpecs = selectedCharacteristics !== undefined ? selectedCharacteristics : internalSelectedTypeSpecs;
      const newSpecs: Record<string, string[]> = { ...currentSpecs };
      delete newSpecs[type];
      setSelectedTypeSpecs(newSpecs);
      // Fermer les caractéristiques quand on désélectionne le type
      setShowCharacteristics(prev => {
        const newState = { ...prev };
        delete newState[type];
        return newState;
      });
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };


  const toggleTypeSpec = (type: string, specId: string) => {
    const currentSpecs = selectedCharacteristics !== undefined ? selectedCharacteristics : internalSelectedTypeSpecs;
    const current = currentSpecs[type] || [];
    const newSpecs: Record<string, string[]> = { ...currentSpecs };
    if (current.includes(specId)) {
      newSpecs[type] = current.filter(s => s !== specId);
    } else {
      newSpecs[type] = [...current, specId];
    }
    setSelectedTypeSpecs(newSpecs);
  };

  // Utiliser les valeurs fixes (pas de chargement depuis l'API)
  const maxPrice = getMaxPrice();
  const minPrice = 0;
  
  // Libellé de l'unité
  const getPriceUnitLabel = () => {
    switch (priceUnit) {
      case 'hour':
        return 'heure';
      case 'day':
        return 'jour';
      case 'week':
        return 'semaine';
      case 'month':
        return 'mois';
      default:
        return 'jour';
    }
  };

  const handleMinPriceChange = (value: number) => {
    const minValue = Math.max(0, value); // Ne pas permettre de valeurs négatives
    if (minValue <= priceRange[1]) {
      onPriceRangeChange([minValue, priceRange[1]]);
    } else {
      // Si la valeur min dépasse le max, mettre à jour les deux
      onPriceRangeChange([minValue, minValue]);
    }
  };

  const handleMaxPriceChange = (value: number) => {
    const maxValue = Math.max(0, value); // Ne pas permettre de valeurs négatives
    if (maxValue >= priceRange[0]) {
      onPriceRangeChange([priceRange[0], maxValue]);
    } else {
      // Si la valeur max est inférieure au min, mettre à jour les deux
      onPriceRangeChange([maxValue, maxValue]);
    }
  };

  // Synchroniser les inputs locaux avec priceRange quand il change depuis l'extérieur
  useEffect(() => {
    if (minPriceInput === '' || Number(minPriceInput) !== priceRange[0]) {
      setMinPriceInput(priceRange[0].toString());
    }
  }, [priceRange[0]]);

  useEffect(() => {
    if (maxPriceInput === '' || Number(maxPriceInput.replace('+', '')) !== priceRange[1]) {
      setMaxPriceInput(priceRange[1].toString());
    }
  }, [priceRange[1]]);

  if (!onClose) {
    // Si pas de onClose, c'est qu'on l'affiche inline (pas en modal)
    return (
      <div className={cn('bg-white rounded-xl border border-slate-200 shadow-lg p-6', className)}>
        <div className="space-y-6">
          {/* Contenu inline */}
        </div>
      </div>
    );
  }

  const contentDiv = (
    <div 
      className={cn(
        'bg-white shadow-2xl w-full overflow-y-auto',
        embedInContainer && 'overscroll-contain touch-pan-y',
        embedInContainer ? 'rounded-t-3xl rounded-b-none max-h-[90vh]' : 'rounded-none md:rounded-2xl max-h-[90vh] md:max-h-[85vh] md:max-w-2xl'
      )}
      style={embedInContainer ? { paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' } : undefined}
      onClick={(e) => !embedInContainer && e.stopPropagation()}
    >
          <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between z-10">
            <h3 className="text-lg font-bold text-slate-900">Filtres</h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="p-5 space-y-5">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Type d'Espace</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'parking', label: 'Parking', icon: Car },
              { id: 'storage', label: 'Stockage', icon: Box },
              { id: 'cellar', label: 'Cave et Divers', icon: Warehouse },
            ].map(({ id, label, icon: Icon }) => {
              const isSelected = selectedTypes.includes(id);
              return (
                <div key={id}>
                  <button
                    onClick={() => toggleType(id)}
                    className={cn(
                      'w-full p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5',
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isSelected ? 'text-emerald-600' : 'text-slate-400')} />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Caractéristiques - déroulable uniquement si au moins un type d'espace est sélectionné */}
        <div>
          {selectedTypes.length === 0 ? (
            <div
              className="w-full p-2.5 rounded-lg border-2 border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none"
              aria-disabled="true"
              role="presentation"
            >
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Caractéristiques</span>
                <ChevronDown className="w-4 h-4 text-slate-400 opacity-60" aria-hidden />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 font-normal">
                Il faut choisir un type d&apos;espace ci-dessus pour dérouler les caractéristiques.
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  const allTypes = selectedTypes;
                  const anyOpen = allTypes.some(type => showCharacteristics[type]);
                  const newState: Record<string, boolean> = {};
                  allTypes.forEach(type => {
                    newState[type] = !anyOpen;
                  });
                  setShowCharacteristics(newState);
                }}
                className={cn(
                  'w-full flex items-center justify-between p-2.5 rounded-lg border-2 transition-all text-sm font-medium',
                  selectedTypes.some(type => showCharacteristics[type])
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100'
                )}
              >
                <span>Caractéristiques</span>
                <ChevronDown className={cn(
                  'w-4 h-4 transition-transform text-emerald-600',
                  selectedTypes.some(type => showCharacteristics[type]) && 'rotate-180'
                )} />
              </button>
            
            {/* Type Specifications - Caractéristiques dynamiques depuis l'API - Pleine largeur */}
            {selectedTypes.some(type => showCharacteristics[type]) && (
              <div className="mt-2">
                {selectedTypes.map(id => {
                  if (!showCharacteristics[id]) return null;
                  
                  return (
                    <div key={id} className="mb-4 last:mb-0">
                      {isLoadingCharacteristics[id] ? (
                        <div className="text-xs text-slate-500 text-center py-2">Chargement des caractéristiques...</div>
                      ) : dynamicCharacteristics[id] && dynamicCharacteristics[id].length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg">
                          {dynamicCharacteristics[id].map(char => {
                            const charKey = `${id}_${char.key}`;
                            const selectedValues = selectedTypeSpecs[id]?.filter(s => s.startsWith(char.key)) || [];
                            
                            // Pour les champs select, afficher les options
                            if (char.type === 'select' && char.options && char.options.length > 0) {
                              return (
                                <div key={char.key} className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-700">{char.label}</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {char.options.map(option => {
                                      const optionKey = `${char.key}_${option}`;
                                      const isOptionSelected = selectedTypeSpecs[id]?.includes(optionKey);
                                      return (
                                        <button
                                          key={option}
                                          onClick={() => toggleTypeSpec(id, optionKey)}
                                          className={cn(
                                            'text-xs px-2.5 py-1.5 rounded-md transition-all border-2 font-semibold shadow-sm',
                                            isOptionSelected
                                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300 ring-offset-1'
                                              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                                          )}
                                        >
                                          {option}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            
                            // Pour les champs number, afficher directement l'input sans bouton "Activer"
                            if (char.type === 'number') {
                              const currentValue = selectedValues.length > 0 
                                ? selectedValues[0].replace(`${char.key}_`, '')
                                : '';
                              return (
                                <div key={char.key} className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-700">{char.label}</label>
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder={char.placeholder || 'Valeur'}
                                    value={currentValue}
                                    className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const currentSpecs = selectedCharacteristics !== undefined ? selectedCharacteristics : internalSelectedTypeSpecs;
                                      const current = currentSpecs[id] || [];
                                      const filtered = current.filter(s => !s.startsWith(char.key));
                                      
                                      if (value && value.trim() !== '') {
                                        const valueKey = `${char.key}_${value}`;
                                        const newSpecs: Record<string, string[]> = { ...currentSpecs, [id]: [...filtered, valueKey] };
                                        setSelectedTypeSpecs(newSpecs);
                                      } else {
                                        // Si vide, supprimer la caractéristique
                                        const newSpecs: Record<string, string[]> = { ...currentSpecs, [id]: filtered };
                                        setSelectedTypeSpecs(newSpecs);
                                      }
                                    }}
                                  />
                                </div>
                              );
                            }
                            
                            // Pour les champs text, afficher directement l'input
                            if (char.type === 'text') {
                              const currentValue = selectedValues.length > 0 
                                ? selectedValues[0].replace(`${char.key}_`, '')
                                : '';
                              return (
                                <div key={char.key} className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-700">{char.label}</label>
                                  <input
                                    type="text"
                                    placeholder={char.placeholder || 'Valeur'}
                                    value={currentValue}
                                    className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const currentSpecs = selectedCharacteristics !== undefined ? selectedCharacteristics : internalSelectedTypeSpecs;
                                      const current = currentSpecs[id] || [];
                                      const filtered = current.filter(s => !s.startsWith(char.key));
                                      
                                      if (value && value.trim() !== '') {
                                        const valueKey = `${char.key}_${value}`;
                                        const newSpecs: Record<string, string[]> = { ...currentSpecs, [id]: [...filtered, valueKey] };
                                        setSelectedTypeSpecs(newSpecs);
                                      } else {
                                        // Si vide, supprimer la caractéristique
                                        const newSpecs: Record<string, string[]> = { ...currentSpecs, [id]: filtered };
                                        setSelectedTypeSpecs(newSpecs);
                                      }
                                    }}
                                  />
                                </div>
                              );
                            }
                            
                            // Fallback pour les autres types
                            return (
                              <button
                                key={char.key}
                                onClick={() => toggleTypeSpec(id, char.key)}
                                className={cn(
                                  'w-full text-xs px-3 py-2 rounded-md transition-all text-left flex items-center justify-between border-2 font-semibold shadow-sm',
                                  selectedTypeSpecs[id]?.includes(char.key)
                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300 ring-offset-1'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                                )}
                              >
                                <span>{char.label}</span>
                                {selectedTypeSpecs[id]?.includes(char.key) && <Check className="w-4 h-4 font-bold" />}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 text-center py-2">Aucune caractéristique disponible</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </>
          )}
        </div>

        {/* Filtres prix / rayon / options : désactivés tant qu'aucun type d'espace n'est sélectionné */}
        <div className={cn(selectedTypes.length === 0 && 'pointer-events-none opacity-60')}>
          {selectedTypes.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              Choisissez un type d&apos;espace ci-dessus pour activer les filtres.
            </p>
          )}

        {/* Price Range */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-slate-900">
              Fourchette de prix
            </label>
            {/* Sélecteur d'unité de prix */}
            {onPriceUnitChange && (
              <select
                value={priceUnit}
                onChange={(e) => onPriceUnitChange(e.target.value as 'hour' | 'day' | 'week' | 'month')}
                className="text-xs px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="hour">Par heure</option>
                <option value="day">Par jour</option>
                <option value="week">Par semaine</option>
                <option value="month">Par mois</option>
              </select>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">Prix par {getPriceUnitLabel()}, tous frais compris</p>
          
          {/* Price Inputs */}
          <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-slate-600 mb-1 block">Minimum</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min={minPrice}
                    max={maxPrice}
                    value={minPriceInput}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setMinPriceInput(inputValue);
                      // Permettre la saisie libre, ne pas bloquer
                      if (inputValue === '') {
                        return;
                      }
                      const numValue = Number(inputValue);
                      if (!isNaN(numValue) && numValue >= 0) {
                        handleMinPriceChange(numValue);
                      }
                    }}
                    onFocus={(e) => {
                      // Sélectionner le texte au focus pour faciliter la modification
                      e.target.select();
                    }}
                    onBlur={(e) => {
                      // À la perte de focus, s'assurer d'avoir une valeur valide
                      const inputValue = e.target.value;
                      if (inputValue === '' || isNaN(Number(inputValue))) {
                        setMinPriceInput(priceRange[0].toString());
                        handleMinPriceChange(0);
                      } else {
                        const numValue = Number(inputValue);
                        const clampedValue = Math.max(0, Math.min(numValue, maxPrice));
                        setMinPriceInput(clampedValue.toString());
                        if (clampedValue !== priceRange[0]) {
                          handleMinPriceChange(clampedValue);
                        }
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-600 mb-1 block">Maximum</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min={minPrice}
                    max={maxPrice}
                    value={maxPriceInput}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setMaxPriceInput(inputValue);
                      // Permettre la saisie libre, ne pas bloquer
                      if (inputValue === '') {
                        return;
                      }
                      const numValue = Number(inputValue);
                      if (!isNaN(numValue) && numValue >= 0) {
                        const clampedValue = Math.min(numValue, maxPrice);
                        handleMaxPriceChange(clampedValue);
                      }
                    }}
                    onFocus={(e) => {
                      // Sélectionner le texte au focus pour faciliter la modification
                      e.target.select();
                    }}
                    onBlur={(e) => {
                      // À la perte de focus, s'assurer d'avoir une valeur valide
                      const inputValue = e.target.value;
                      if (inputValue === '' || isNaN(Number(inputValue))) {
                        const finalValue = Math.max(priceRange[0], maxPrice);
                        setMaxPriceInput(finalValue.toString());
                        handleMaxPriceChange(finalValue);
                      } else {
                        const numValue = Number(inputValue);
                        const clampedValue = Math.min(Math.max(numValue, priceRange[0]), maxPrice);
                        setMaxPriceInput(clampedValue.toString());
                        if (clampedValue !== priceRange[1]) {
                          handleMaxPriceChange(clampedValue);
                        }
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>
        </div>


        {/* Search Radius */}
        {onSearchRadiusChange && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">{t('search.searchRadius')}</label>
            <select
              value={searchRadius}
              onChange={(e) => {
                const value = e.target.value as 'none' | '5' | '10' | '20' | '50';
                onSearchRadiusChange(value === 'none' ? 'none' : Number(value) as 5 | 10 | 20 | 50);
              }}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors text-sm font-medium text-slate-900 bg-white"
            >
              <option value="none">{t('search.searchRadius.none')}</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="20">20 km</option>
              <option value="50">50 km</option>
            </select>
            <p className="text-xs text-slate-500 mt-1.5">
              {searchRadius === 'none' 
                ? t('search.searchRadius.description.none')
                : t('search.searchRadius.description.withRadius', { radius: searchRadius })}
            </p>
          </div>
        )}

        {/* Booking Options */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Options de réservation</label>
          <div className="space-y-2">
            <button
              onClick={() => onInstantBookingChange(instantBooking === true ? null : true)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                instantBooking === true
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                instantBooking === true ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
              )}>
                {instantBooking === true && <Check className="w-3 h-3 text-white" />}
              </div>
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Réservation instantanée</span>
            </button>
            
            <button
              onClick={() => onFreeCancellationChange(freeCancellation === true ? null : true)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                freeCancellation === true
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                freeCancellation === true ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
              )}>
                {freeCancellation === true && <Check className="w-3 h-3 text-white" />}
              </div>
              <Ban className="w-4 h-4" />
              <span className="text-sm font-medium">Annulation gratuite</span>
            </button>
            
            <button
              onClick={() => onNoDepositChange(noDeposit === true ? null : true)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                noDeposit === true
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                noDeposit === true ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
              )}>
                {noDeposit === true && <Check className="w-3 h-3 text-white" />}
              </div>
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Réservation sans caution</span>
            </button>
          </div>
        </div>
        </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                onTypesChange([]);
                onPriceRangeChange([0, maxPrice]);
                onInstantBookingChange(null);
                onFreeCancellationChange(null);
                onNoDepositChange(null);
                if (onEquipmentChange) {
                  onEquipmentChange([]);
                }
                setSelectedTypeSpecs({});
                setShowCharacteristics({});
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Tout effacer
            </button>
            {selectedTypes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-1 py-1">
                <span className="text-xs text-slate-400">Choisissez un type d&apos;espace pour continuer</span>
                <button
                  disabled
                  className="w-full px-6 py-3 text-sm font-semibold text-white bg-slate-300 rounded-lg cursor-not-allowed"
                >
                  Rechercher
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onApplyFilters) {
                    onApplyFilters();
                  } else if (onClose) {
                    onClose();
                  }
                }}
                className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                Rechercher
              </button>
            )}
          </div>
        </div>
  );

  if (embedInContainer) return contentDiv;
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Mobile: bottom sheet | Desktop: centered modal */}
      <div className="fixed inset-0 z-50 flex items-end md:items-start md:justify-center md:pt-16 pb-0 md:pb-8 px-0 md:px-4 overflow-y-auto">
        <div className="w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] rounded-t-3xl md:rounded-2xl overflow-hidden">
          {contentDiv}
        </div>
      </div>
    </>
  );
}

