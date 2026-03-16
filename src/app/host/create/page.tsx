'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  ChevronLeft,
  ChevronRight,
  Car,
  Box,
  Warehouse,
  Upload,
  X,
  Check,
  Calendar,
  Camera,
  Trash2,
  HelpCircle,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Video,
  BookOpen,
  MessageCircle,
  ExternalLink,
  Shield,
  Ruler,
  Lock,
  Key,
  Lightbulb,
  Wrench,
  MapPin,
  Ban,
  Package,
  Zap,
  CheckCircle
} from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { placesAPI, CreatePlacePayload, locationsAPI, LocationSearchResult, geocodeAPI } from '@/services/api';
import AddressAutocomplete from '@/components/ui/address-autocomplete';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

// Heures de la journée pour Fréquence réservation Début/Fin (dropdowns)
const RESERVATION_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

// Mapping des caractéristiques API vers les labels et types d'input
// Mise à jour selon les nouvelles spécifications par type de bien
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
};

// Sections du récapitulatif (étape 7) — même logique que les étapes de création
const RECAP_SECTIONS: { title: string; keys: string[] }[] = [
  { title: 'Dimensions', keys: ['LENGTH', 'WIDTH', 'MAX_HEIGHT', 'SURFACE', 'VOLUME'] },
  { title: 'Accès & sécurité', keys: ['ACCESS_TYPE', 'AUTOMATIC_BARRIER', 'SECURED_GATE', 'SECURITY_GUARD', 'VIDEO_SURVEILLANCE', 'EXCLUSIVITY_24_7', 'LIGHTING', 'NUMBERED_SPACE'] },
  { title: 'Localisation & type', keys: ['LEVEL', 'SPACE_TYPE', 'PARKING_TYPE', 'STOP_PARKING'] },
  { title: 'Véhicules & accessibilité', keys: ['VEHICLE_TYPE', 'PMR_ELEVATOR', 'PMR_EQUIPMENT', 'ELECTRIC_CHARGING_STATION', 'ELECTRIC_CHARGING_POWER', 'GPL_ALLOWED', 'ELECTRIC_PLUG'] },
  { title: 'Services & contraintes', keys: ['TIME_RESTRICTIONS', 'MIN_HOURS', 'MIN_DAYS', 'RESERVATION_FREQUENCY_FROM', 'RESERVATION_FREQUENCY_TO', 'CLEANING', 'WATER_POINT'] },
  { title: 'Distances & commodités', keys: ['BUS_STOP_DISTANCE', 'TRAIN_STATION_DISTANCE', 'AIRPORT_DISTANCE', 'ELECTRIC_CHARGING_STATION_DISTANCE', 'BEACH_DISTANCE', 'AIRPORT_SHUTTLE', 'STATION_SHUTTLE'] },
  { title: 'Box / Stockage', keys: ['DOOR_TYPE', 'LOCK_TYPE', 'FLOOR_QUALITY', 'INTERIOR_LIGHT', 'HEATED_DEGREE', 'AUTHORIZED_USAGE', 'FREIGHT_ELEVATOR', 'HAND_TRUCK', 'STORAGE_RACK', 'SHELVES', 'TRUCK_ACCESS_DISTANCE', 'ACCESSIBILITY_REMARKS', 'FLAMMABLE_PROHIBITED', 'GAS_BOTTLE_PROHIBITED', 'CHEMICAL_PROHIBITED'] },
  { title: 'Cave / Grenier', keys: ['HUMIDITY', 'VENTILATION', 'ELEVATOR_SIZE', 'FREIGHT_ELEVATOR_SIZE', 'STRAIGHT_STAIRCASE_WIDTH', 'TURNING_STAIRCASE_WIDTH', 'SPIRAL_STAIRCASE_WIDTH', 'PASSAGE_MIN_WIDTH', 'PASSAGE_MIN_HEIGHT', 'NUMBERED_ZONE'] },
];
const RECAP_SECTION_ALL_KEYS = new Set(RECAP_SECTIONS.flatMap(s => s.keys));

// Mapping libellé affiché -> enum backend (VehicleType)
const VEHICLE_TYPE_DISPLAY_TO_API: Record<string, string> = {
  'Moto': 'MOTO',
  'Voiture': 'VOITURE',
  'Camion': 'CAMION',
  'Caravane': 'CARAVANE',
  'Camping car': 'CAMPING_CAR',
};
// Énum backend (VehicleType) -> libellé affiché (pour options chargées depuis GET /api/places/filters)
const VEHICLE_TYPE_API_TO_DISPLAY: Record<string, string> = {
  'MOTO': 'Moto',
  'VOITURE': 'Voiture',
  'CAMION': 'Camion',
  'CARAVANE': 'Caravane',
  'CAMPING_CAR': 'Camping car',
};
const DEFAULT_VEHICLE_TYPES_API = ['MOTO', 'VOITURE', 'CAMION', 'CARAVANE', 'CAMPING_CAR'] as const;

// Fonction pour traduire les noms de caractéristiques en français (fallback)
const translateCharacteristicName = (name: string): string => {
  const translations: Record<string, string> = {
    'FREIGHT_ELEVATOR_CAPACITY': 'Capacité ascenseur de marchandises',
    'ELEVATOR_CAPACITY': 'Capacité ascenseur',
    'CAPACITY': 'Capacité',
    'ELEVATOR': 'Ascenseur',
    'FREIGHT': 'Marchandises',
    'ACCESS': 'Accès',
    'DIMENSIONS': 'Dimensions',
    'WIDTH': 'Largeur',
    'HEIGHT': 'Hauteur',
    'LENGTH': 'Longueur',
    'DEPTH': 'Profondeur',
    'SURFACE': 'Surface',
    'VOLUME': 'Volume',
    'TEMPERATURE': 'Température',
    'HUMIDITY': 'Humidité',
    'VENTILATION': 'Ventilation',
    'LIGHTING': 'Éclairage',
    'SECURITY': 'Sécurité',
    'SURVEILLANCE': 'Surveillance',
    'GUARD': 'Gardien',
    'GATE': 'Portail',
    'BARRIER': 'Barrière',
    'LOCK': 'Serrure',
    'DOOR': 'Porte',
    'STAIRS': 'Escalier',
    'PASSAGE': 'Passage',
    'MIN': 'Minimum',
    'MAX': 'Maximum',
    'DISTANCE': 'Distance',
    'STOP': 'Arrêt',
    'STATION': 'Gare',
    'AIRPORT': 'Aéroport',
    'BEACH': 'Plage',
    'TRUCK': 'Camion',
    'VEHICLE': 'Véhicule',
    'TYPE': 'Type',
    'LEVEL': 'Niveau',
    'FREQUENCY': 'Fréquence',
    'RESERVATION': 'Réservation',
    'FROM': 'Début',
    'TO': 'Fin',
    'HOURS': 'Heures',
    'DAYS': 'Jours',
    'RESTRICTIONS': 'Restrictions',
    'TIME': 'Horaire',
    'PROHIBITED': 'Interdit',
    'ALLOWED': 'Autorisé',
    'SERVICES': 'Services',
    'EQUIPMENT': 'Équipement',
    'OTHER': 'Autre',
    'REMARKS': 'Remarques',
    'ACCESSIBILITY': 'Accessibilité',
    'HELP': 'Aide',
    'HANDLING': 'Manutention',
    'CLEANING': 'Nettoyage',
    'SHUTTLE': 'Navette',
    'CHILD': 'Enfant',
    'SEAT': 'Siège',
    'ELECTRIC': 'Électrique',
    'CHARGING': 'Recharge',
    'PLUG': 'Prise',
    'WATER': 'Eau',
    'POINT': 'Point',
    'FLOOR': 'Sol',
    'QUALITY': 'Qualité',
    'STORAGE': 'Stockage',
    'RACK': 'Rayonnage',
    'SHELVES': 'Étagères',
    'HAND': 'Main',
    'AUTHORIZED': 'Autorisé',
    'USAGE': 'Usage',
    'STATE': 'État',
    'GAS': 'Gaz',
    'BOTTLE': 'Bouteille',
    'GPL': 'GPL',
    'MOTORIZED': 'Motorisé',
    'CHEMICAL': 'Chimique',
    'FLAMMABLE': 'Inflammable',
  };

  // Diviser le nom en mots (séparés par _)
  const words = name.split('_');
  
  // Traduire chaque mot
  const translatedWords = words.map(word => {
    const upperWord = word.toUpperCase();
    return translations[upperWord] || word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  // Joindre les mots avec des espaces et mettre en forme
  return translatedWords.join(' ');
};

// Caractéristiques disponibles pour les parkings
type CharacteristicType = { key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[] };

const PARKING_CHARACTERISTICS: CharacteristicType[] = [
  { key: 'LENGTH', label: 'Longueur (m)', type: 'number', placeholder: 'Ex: 5,0' },
  { key: 'WIDTH', label: 'Largeur (m)', type: 'number', placeholder: 'Ex: 2,5' },
  { key: 'MAX_HEIGHT', label: 'Hauteur maximale (m)', type: 'number', placeholder: 'Ex: 2,1' },
  { key: 'VEHICLE_TYPE', label: 'Types de véhicules acceptés', type: 'text', placeholder: 'Ex: Voiture, Moto' },
  { key: 'MIN_HOURS', label: 'Durée minimale (heures)', type: 'number', placeholder: 'Ex: 1' },
  { key: 'MIN_DAYS', label: 'Durée minimale (jours)', type: 'number', placeholder: 'Ex: 1' },
  { key: 'RESERVATION_FREQUENCY_FROM', label: 'Fréquence réservation - Début', type: 'select', options: RESERVATION_HOUR_OPTIONS },
  { key: 'RESERVATION_FREQUENCY_TO', label: 'Fréquence réservation - Fin', type: 'select', options: RESERVATION_HOUR_OPTIONS },
  { key: 'LEVEL', label: 'Étage', type: 'select', options: Array.from({ length: 21 }, (_, i) => String(i - 10)) },
  { key: 'SPACE_TYPE', label: 'Type d\'espace', type: 'select', options: ['Garage clos', 'Place ouverte', 'Box fermé', 'Parking souterrain'] },
  { key: 'PARKING_TYPE', label: 'Type de parking', type: 'select', options: ['Public', 'Privé', 'Résidentiel', 'Entreprise'] },
  { key: 'LIGHTING', label: 'Éclairage', type: 'select', options: ['Oui', 'Non', 'Naturel', 'Artificiel'] },
  { key: 'VIDEO_SURVEILLANCE', label: 'Vidéo surveillance', type: 'select', options: ['Oui', 'Non'] },
  { key: 'SECURITY_GUARD', label: 'Gardien de sécurité', type: 'select', options: ['Oui', 'Non'] },
  { key: 'AUTOMATIC_BARRIER', label: 'Barrière automatique', type: 'select', options: ['Oui', 'Non'] },
  { key: 'SECURED_GATE', label: 'Portail sécurisé', type: 'select', options: ['Oui', 'Non'] },
  { key: 'ACCESS_TYPE', label: 'Type d\'accès', type: 'select', options: ['Accès libre', 'Badge', 'Télécommande', 'Application smartphone', 'Clé', 'Digicode'] },
  { key: 'ELECTRIC_CHARGING_STATION', label: 'Station de recharge électrique', type: 'text', placeholder: 'Ex: 22kW' },
  { key: 'STOP_PARKING', label: 'Arrêt minute', type: 'select', options: ['Oui', 'Non'] },
  { key: 'NUMBERED_SPACE', label: 'Place numérotée', type: 'select', options: ['Oui', 'Non'] },
  { key: 'ELECTRIC_PLUG', label: 'Prise électrique', type: 'select', options: ['Oui', 'Non'] },
  { key: 'WATER_POINT', label: 'Point d\'eau', type: 'select', options: ['Oui', 'Non'] },
  { key: 'PMR_ELEVATOR', label: 'Ascenseur PMR', type: 'select', options: ['Oui', 'Non'] },
  { key: 'PMR_EQUIPMENT', label: 'Équipement PMR', type: 'select', options: ['Oui', 'Non'] },
  { key: 'GPL_ALLOWED', label: 'GPL autorisé', type: 'select', options: ['Oui', 'Non'] },
  { key: 'EXCLUSIVITY_24_7', label: 'Exclusivité 24/7', type: 'select', options: ['Oui', 'Non'] },
  { key: 'TIME_RESTRICTIONS', label: 'Restrictions horaires', type: 'text', placeholder: 'Ex: 22h-06h interdit' },
  { key: 'AIRPORT_SHUTTLE', label: 'Navette aéroport', type: 'select', options: ['Oui', 'Non'] },
  { key: 'STATION_SHUTTLE', label: 'Navette gare', type: 'select', options: ['Oui', 'Non'] },
  { key: 'CLEANING', label: 'Nettoyage', type: 'select', options: ['Oui', 'Non', 'Payant'] },
  { key: 'CHILD_SEAT', label: 'Siège enfant', type: 'select', options: ['Oui', 'Non'] },
  { key: 'OTHER_SERVICES', label: 'Autres services', type: 'text', placeholder: 'Liste des autres services' },
  { key: 'BUS_STOP_DISTANCE', label: 'Distance arrêt de bus (m)', type: 'number', placeholder: 'Ex: 100' },
  { key: 'TRAIN_STATION_DISTANCE', label: 'Distance gare (m)', type: 'number', placeholder: 'Ex: 500' },
  { key: 'AIRPORT_DISTANCE', label: 'Distance aéroport (m)', type: 'number', placeholder: 'Ex: 15000' },
  { key: 'ELECTRIC_CHARGING_STATION_DISTANCE', label: 'Distance borne électrique (m)', type: 'number', placeholder: 'Ex: 200' },
  { key: 'BEACH_DISTANCE', label: 'Distance plage (m)', type: 'number', placeholder: 'Ex: 500' }
];

// Caractéristiques disponibles pour les box/caves/greniers
const STORAGE_CHARACTERISTICS: CharacteristicType[] = [
  { key: 'LENGTH', label: 'Longueur (m)', type: 'number', placeholder: 'Ex: 3,0' },
  { key: 'WIDTH', label: 'Largeur (m)', type: 'number', placeholder: 'Ex: 2,0' },
  { key: 'MAX_HEIGHT', label: 'Hauteur maximale (m)', type: 'number', placeholder: 'Ex: 2,5' },
  { key: 'VOLUME', label: 'Volume (m³)', type: 'number', placeholder: 'Ex: 15,0' },
  { key: 'SURFACE', label: 'Surface (m²)', type: 'number', placeholder: 'Ex: 6,0' },
  { key: 'DOOR_TYPE', label: 'Type de porte', type: 'select', options: ['Battante', 'Coulissante', 'Enroulable', 'Sectionnelle'] },
  { key: 'LOCK_TYPE', label: 'Type de serrure', type: 'select', options: ['Clé', 'Code', 'Badge', 'Biométrique'] },
  { key: 'LIGHTING', label: 'Éclairage', type: 'select', options: ['Oui', 'Non', 'Naturel', 'Artificiel'] },
  { key: 'VIDEO_SURVEILLANCE', label: 'Vidéo surveillance', type: 'select', options: ['Oui', 'Non'] },
  { key: 'SECURITY_GUARD', label: 'Gardien de sécurité', type: 'select', options: ['Oui', 'Non'] },
  { key: 'AUTOMATIC_BARRIER', label: 'Barrière automatique', type: 'select', options: ['Oui', 'Non'] },
  { key: 'SECURED_GATE', label: 'Portail sécurisé', type: 'select', options: ['Oui', 'Non'] },
  { key: 'FLOOR_QUALITY', label: 'Qualité du sol', type: 'select', options: ['Béton', 'Carrelage', 'Terre battue', 'Autre'] },
  { key: 'INTERIOR_LIGHT', label: 'Éclairage intérieur', type: 'select', options: ['Oui', 'Non'] },
  { key: 'ELECTRIC_PLUG', label: 'Prise électrique', type: 'select', options: ['Oui', 'Non'] },
  { key: 'HEATED_DEGREE', label: 'Température (°C)', type: 'number', placeholder: 'Ex: 18' },
  { key: 'AUTHORIZED_USAGE', label: 'Usage autorisé', type: 'text', placeholder: 'Ex: Stockage mobilier, archives' },
  { key: 'ACCESS_TYPE', label: 'Type d\'accès', type: 'select', options: ['Accès libre', 'Badge', 'Télécommande', 'Application smartphone', 'Clé', 'Digicode'] },
  { key: 'MIN_HOURS', label: 'Durée minimale (heures)', type: 'number', placeholder: 'Ex: 24' },
  { key: 'MIN_DAYS', label: 'Durée minimale (jours)', type: 'number', placeholder: 'Ex: 30' },
  { key: 'RESERVATION_FREQUENCY_FROM', label: 'Fréquence réservation - Début', type: 'select', options: RESERVATION_HOUR_OPTIONS },
  { key: 'RESERVATION_FREQUENCY_TO', label: 'Fréquence réservation - Fin', type: 'select', options: RESERVATION_HOUR_OPTIONS },
  { key: 'STORAGE_TYPE', label: 'Type de stockage', type: 'select', options: ['Sec', 'Humide', 'Tempéré', 'Froid'] },
  { key: 'LEVEL', label: 'Étage', type: 'select', options: Array.from({ length: 21 }, (_, i) => String(i - 10)) },
  { key: 'NUMBERED_SPACE', label: 'Espace numéroté', type: 'select', options: ['Oui', 'Non'] },
  { key: 'WATER_POINT', label: 'Point d\'eau', type: 'select', options: ['Oui', 'Non'] },
  { key: 'FREIGHT_ELEVATOR', label: 'Ascenseur de marchandises', type: 'select', options: ['Oui', 'Non'] },
  { key: 'HAND_TRUCK', label: 'Chariot disponible', type: 'select', options: ['Oui', 'Non'] },
  { key: 'STORAGE_RACK', label: 'Rayonnage', type: 'select', options: ['Oui', 'Non'] },
  { key: 'SHELVES', label: 'Étagères', type: 'select', options: ['Oui', 'Non'] },
  { key: 'OTHER_EQUIPMENT', label: 'Autre équipement', type: 'text', placeholder: 'Liste des équipements supplémentaires' },
  { key: 'PMR_ELEVATOR', label: 'Ascenseur PMR', type: 'select', options: ['Oui', 'Non'] },
  { key: 'PMR_EQUIPMENT', label: 'Équipement PMR', type: 'select', options: ['Oui', 'Non'] },
  { key: 'STAIRS_TYPE', label: 'Type d\'escalier', type: 'select', options: ['Droit', 'Tourné', 'Hélicoïdal'] },
  { key: 'STAIRS_WIDTH', label: 'Largeur escalier (cm)', type: 'number', placeholder: 'Ex: 80' },
  { key: 'ELEVATOR_DIMENSIONS', label: 'Dimensions ascenseur', type: 'text', placeholder: 'Ex: 1.2m x 0.8m' },
  { key: 'PASSAGE_MIN_WIDTH', label: 'Largeur passage min. (cm)', type: 'number', placeholder: 'Ex: 70' },
  { key: 'PASSAGE_MIN_HEIGHT', label: 'Hauteur passage min. (cm)', type: 'number', placeholder: 'Ex: 190' },
  { key: 'HUMIDITY_STATE', label: 'État humidité', type: 'select', options: ['Sec', 'Humide', 'Très humide'] },
  { key: 'VENTILATION_TYPE', label: 'Type de ventilation', type: 'select', options: ['Naturelle', 'Mécanique', 'Climatisation'] },
  { key: 'FLAMMABLE_PROHIBITED', label: 'Inflammables interdits', type: 'select', options: ['Oui', 'Non'] },
  { key: 'GAS_BOTTLE_PROHIBITED', label: 'Bouteilles de gaz interdites', type: 'select', options: ['Oui', 'Non'] },
  { key: 'GPL_PROHIBITED', label: 'GPL interdit', type: 'select', options: ['Oui', 'Non'] },
  { key: 'MOTORIZED_VEHICLE_PROHIBITED', label: 'Véhicules motorisés interdits', type: 'select', options: ['Oui', 'Non'] },
  { key: 'CHEMICAL_PROHIBITED', label: 'Produits chimiques interdits', type: 'select', options: ['Oui', 'Non'] },
  { key: 'EXCLUSIVITY_24_7', label: 'Exclusivité 24/7', type: 'select', options: ['Oui', 'Non'] },
  { key: 'TIME_RESTRICTIONS', label: 'Restrictions horaires', type: 'text', placeholder: 'Ex: 22h-06h interdit' },
  { key: 'AIRPORT_SHUTTLE', label: 'Navette aéroport', type: 'select', options: ['Oui', 'Non'] },
  { key: 'STATION_SHUTTLE', label: 'Navette gare', type: 'select', options: ['Oui', 'Non'] },
  { key: 'CLEANING', label: 'Nettoyage', type: 'select', options: ['Oui', 'Non', 'Payant'] },
  { key: 'HANDLING_HELP', label: 'Aide au manutention', type: 'select', options: ['Oui', 'Non', 'Payant'] },
  { key: 'OTHER_SERVICES', label: 'Autres services', type: 'text', placeholder: 'Liste des autres services' },
  { key: 'BUS_STOP_DISTANCE', label: 'Distance arrêt de bus (m)', type: 'number', placeholder: 'Ex: 100' },
  { key: 'TRAIN_STATION_DISTANCE', label: 'Distance gare (m)', type: 'number', placeholder: 'Ex: 500' },
  { key: 'AIRPORT_DISTANCE', label: 'Distance aéroport (m)', type: 'number', placeholder: 'Ex: 15000' },
  { key: 'ELECTRIC_CHARGING_STATION_DISTANCE', label: 'Distance borne électrique (m)', type: 'number', placeholder: 'Ex: 200' },
  { key: 'BEACH_DISTANCE', label: 'Distance plage (m)', type: 'number', placeholder: 'Ex: 500' },
  { key: 'TRUCK_ACCESS_DISTANCE', label: 'Distance accès camion (m)', type: 'number', placeholder: 'Ex: 50' },
  { key: 'ACCESSIBILITY_REMARKS', label: 'Remarques accessibilité', type: 'text', placeholder: 'Informations sur l\'accessibilité' }
];

const STEPS = [
  { 
    id: 1, 
    title: 'Type d\'espace', 
    description: 'Choisissez le type',
    mainTitle: 'Choisissez le type d\'espace que vous souhaitez louer',
    subtitle: 'Place de parking, box sécurisé ou cave : louez votre espace facilement.'
  },
  { 
    id: 2, 
    title: 'Localisation', 
    description: 'Où se situe l\'espace ?',
    mainTitle: 'Où se situe votre espace ?',
    subtitle: 'Une localisation précise augmente votre visibilité et vos réservations.'
  },
  {
    id: 3,
    title: 'Caractéristiques',
    description: 'Caractéristiques détaillées',
    mainTitle: 'Caractéristiques détaillées',
    subtitle: 'Précisez toutes les caractéristiques techniques et équipements de votre espace.'
  },
  {
    id: 4,
    title: 'Photos',
    description: 'Ajoutez des photos',
    mainTitle: 'Ajoutez des photos',
    subtitle: 'Les annonces avec plus de 7 photos convertissent 30% mieux.'
  },
  {
    id: 5,
    title: 'Tarification',
    description: 'Fixez vos tarifs',
    mainTitle: 'Fixez vos tarifs',
    subtitle: 'Des tarifs compétitifs avec options hebdomadaires/mensuelles génèrent plus de réservations.'
  },
  {
    id: 6,
    title: 'Disponibilité',
    description: 'Dates de disponibilité',
    mainTitle: 'Dates de disponibilité',
    subtitle: 'Les hôtes qui mettent une disponibilité régulière reçoivent 30% plus de réservations.'
  },
  {
    id: 7,
    title: 'Confirmation',
    description: 'Vérifiez et publiez',
    mainTitle: 'Prêt à publier !',
    subtitle: 'Vérifiez les informations avant de publier votre annonce.'
  }
];

// Composant Tooltip
const Tooltip = ({ content }: { content: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="ml-2 text-[#717171] hover:text-[#2D5016] transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#222222] text-white text-sm rounded-lg shadow-xl">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#222222]"></div>
        </div>
      )}
    </div>
  );
};

// Composant de validation en temps réel
const ValidationMessage = ({ isValid, message, touched }: { isValid: boolean | null; message: string; touched?: boolean }) => {
  // Ne pas afficher si le champ n'a pas été touché ou si la validation n'a pas été effectuée
  if (isValid === null || !touched) return null;
  
  return (
    <div className={`flex items-center gap-2 mt-1 text-xs ${isValid ? 'text-green-600' : 'text-red-600'}`}>
      {isValid ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      <span>{message}</span>
    </div>
  );
};

// Composant Calendrier personnalisé
const DatePickerCalendar = ({
  selectedDate,
  onSelectDate,
  onClearDate,
  minDate,
  currentMonth,
  onMonthChange,
}: {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onClearDate?: () => void;
  minDate: Date;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}) => {
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Jours du mois précédent
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateSelectable = (date: Date) => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const minDateOnly = new Date(minDate);
    minDateOnly.setHours(0, 0, 0, 0);
    return dateOnly >= minDateOnly;
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth.getMonth() - 1);
    } else {
      newDate.setMonth(currentMonth.getMonth() + 1);
    }
    onMonthChange(newDate);
  };

  return (
    <div className="w-full">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-[#222222]" />
        </button>
        <div className="flex items-center gap-2">
          <select
            value={currentMonth.getMonth()}
            onChange={(e) => {
              const newDate = new Date(currentMonth);
              newDate.setMonth(parseInt(e.target.value));
              onMonthChange(newDate);
            }}
            className="text-sm font-semibold text-[#222222] bg-transparent border-none outline-none cursor-pointer"
          >
            {monthNames.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
          <select
            value={currentMonth.getFullYear()}
            onChange={(e) => {
              const newDate = new Date(currentMonth);
              newDate.setFullYear(parseInt(e.target.value));
              onMonthChange(newDate);
            }}
            className="text-sm font-semibold text-[#222222] bg-transparent border-none outline-none cursor-pointer"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 text-[#222222]" />
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-[#717171] py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={idx} className="aspect-square" />;
          }
          
          const selectable = isDateSelectable(date);
          const selected = isSelected(date);
          const todayDate = isToday(date);
          
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (selectable) {
                  onSelectDate(date);
                }
              }}
              disabled={!selectable}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-all
                ${!selectable 
                  ? 'text-slate-300 bg-slate-50 cursor-not-allowed opacity-50' 
                  : selected
                  ? 'bg-[#2D5016] text-white shadow-lg scale-110 font-bold cursor-pointer'
                  : todayDate
                  ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-100 font-semibold cursor-pointer'
                  : 'text-[#222222] hover:bg-slate-100 hover:scale-105 cursor-pointer'
                }
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isDateSelectable(today)) {
              onSelectDate(today);
            }
          }}
          className="flex-1 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Aujourd&apos;hui
        </button>
        <button
          type="button"
          onClick={() => {
            if (onClearDate) {
              onClearDate();
            }
          }}
          className="flex-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Effacer
        </button>
      </div>
    </div>
  );
};

// Fonction utilitaire pour obtenir la période par défaut : du jour J jusqu'à un an plus tard
const getDefaultDateRange = () => {
  const today = new Date();
  const oneYearLater = new Date();
  oneYearLater.setFullYear(today.getFullYear() + 1);
  
  // Formater les dates au format YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    start: formatDate(today),
    end: formatDate(oneYearLater)
  };
};

export default function CreateListingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [spaceType, setSpaceType] = useState<'parking' | 'storage' | 'cellar' | null>(null);
  
  // Calculer les dates par défaut
  const defaultDateRange = getDefaultDateRange();
  
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    city: '',
    zipCode: '',
    description: '',
    length: '',
    width: '',
    height: '',
    features: [] as string[],
    characteristics: { EXCLUSIVITY_24_7: 'Oui' } as Record<string, string>, // Exclusivité 24/7 à Oui par défaut
    images: [] as File[],
    imagePreviews: [] as string[],
    video: null as File | null,
    videoPreview: null as string | null,
    priceHourly: '2', // Prix par défaut pour l'heure
    priceDaily: '10', // Prix par défaut pour le jour
    priceWeekly: '',
    priceMonthly: '',
    deposit: '', // Montant de la caution
    minDays: '', // Nombre de jours minimum de location
    minHours: '', // Nombre d'heures minimum de location
    availableDates: [defaultDateRange] as { start: string; end: string }[], // Période par défaut : du jour J à un an plus tard
    currentDateRange: { start: '', end: '' },
    cancellationPolicy: 'FLEXIBLE' as 'FLEXIBLE' | 'MODERATE' | 'STRICT', // Politique d'annulation
    cancellationDeadlineDays: '0', // Valeur par défaut : pas de restriction
    truckAccessDistance: '', // Distance d'accès camion en mètres
    accessibilityRemarks: '', // Remarques d'accessibilité
    instantBooking: true // Réservation instantanée activée par défaut
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [noHeightLimit, setNoHeightLimit] = useState(false);
  const [enabledPrices, setEnabledPrices] = useState({
    hourly: true, // Coché par défaut
    daily: true, // Coché par défaut
    weekly: false,
    monthly: false,
  });
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [fieldValidations, setFieldValidations] = useState<Record<string, boolean | null>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Refs pour les champs de prix (pour le focus)
  const priceHourlyRef = useRef<HTMLInputElement>(null);
  const priceDailyRef = useRef<HTMLInputElement>(null);
  const priceWeeklyRef = useRef<HTMLInputElement>(null);
  const priceMonthlyRef = useRef<HTMLInputElement>(null);
  // Ref pour le timeout de recherche de villes
  const citySearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [dynamicCharacteristics, setDynamicCharacteristics] = useState<Array<{ key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[] }>>([]);
  const [isLoadingCharacteristics, setIsLoadingCharacteristics] = useState(false);

  // États pour l'autocomplétion ville/code postal
  const [citySuggestions, setCitySuggestions] = useState<LocationSearchResult[]>([]);
  const [isLoadingCitySuggestions, setIsLoadingCitySuggestions] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  // Adresse valide uniquement si sélectionnée depuis l'autocomplétion (pas de saisie libre)
  const [addressSelectedFromAutocomplete, setAddressSelectedFromAutocomplete] = useState(false);

  const saveToLocalStorage = useCallback(() => {
    try {
      const dataToSave = {
        formData: {
          ...formData,
          characteristics: formData.characteristics // S'assurer que les caractéristiques sont incluses
        },
        spaceType,
        currentStep,
        enabledPrices, // Sauvegarder l'état des prix
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('host_create_draft', JSON.stringify(dataToSave));
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 2000);
      }, 300);
    } catch (e) {
      console.error('Error saving draft:', e);
    }
  }, [formData, spaceType, currentStep, enabledPrices]);

  // Sauvegarde automatique
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      saveToLocalStorage();
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, spaceType, currentStep, enabledPrices, saveToLocalStorage]);

  // Charger les caractéristiques depuis l'API quand le type de bien change
  useEffect(() => {
    if (!spaceType) {
      console.log('🔵 [CREATE PLACE] Aucun type sélectionné, réinitialisation des caractéristiques');
      setDynamicCharacteristics([]);
      return;
    }

    const loadCharacteristics = async () => {
      setIsLoadingCharacteristics(true);
      try {
        // Mapper les types frontend vers les types backend
        const apiType = spaceType === 'parking' ? 'PARKING' : spaceType === 'storage' ? 'STORAGE_SPACE' : 'CAVE';
        
        console.log('🔵 [CREATE PLACE] ===== DÉBUT CHARGEMENT CARACTÉRISTIQUES =====');
        console.log('🔵 [CREATE PLACE] Type frontend:', spaceType);
        console.log('🔵 [CREATE PLACE] Type backend:', apiType);
        console.log('🔵 [CREATE PLACE] Appel API: GET /api/places/characteristics/' + apiType);
        
        const characteristicsData = await placesAPI.getCharacteristics(apiType);
        
        console.log('🔵 [CREATE PLACE] Réponse API:', characteristicsData);
        console.log('🔵 [CREATE PLACE] Nombre de caractéristiques:', characteristicsData.length);
        
        // Vérifier si le backend retourne des objets avec métadonnées complètes ou juste des strings
        const firstItem = characteristicsData[0];
        const hasFullMetadata = firstItem && typeof firstItem === 'object' && 'key' in firstItem && 'label' in firstItem;
        
        let characteristics: Array<{ key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: string[]; required?: boolean }>;
        
        if (hasFullMetadata) {
          // Le backend retourne directement les métadonnées complètes
          console.log('✅ [CREATE PLACE] Backend retourne les métadonnées complètes, utilisation directe');
          characteristics = characteristicsData.map((item: any) => ({
            key: item.key || item.name,
            label: item.label,
            type: item.type || 'text',
            placeholder: item.placeholder,
            options: item.options,
            required: item.required || false
          }));
        } else {
          // Format legacy : le backend retourne juste des noms (strings)
          // Utiliser le mapping comme fallback
          console.log('⚠️ [CREATE PLACE] Backend retourne seulement les noms, utilisation du mapping local');
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
        
        console.log('✅ [CREATE PLACE] Caractéristiques prêtes:', characteristics);
        console.log('✅ [CREATE PLACE] Nombre de caractéristiques:', characteristics.length);
        
        // Pour PARKING : options des types de véhicules depuis GET /api/places/filters (vehicleTypes)
        if (apiType === 'PARKING') {
          try {
            const filters = await placesAPI.getAvailableFilters();
            const vehicleTypesApi = (filters as { vehicleTypes?: string[] })?.vehicleTypes && Array.isArray((filters as { vehicleTypes?: string[] }).vehicleTypes)
              ? (filters as { vehicleTypes: string[] }).vehicleTypes
              : [...DEFAULT_VEHICLE_TYPES_API];
            const vehicleTypeOptions = vehicleTypesApi.map((api: string) => VEHICLE_TYPE_API_TO_DISPLAY[api] || api);
            const vehicleIdx = characteristics.findIndex((c: { key: string }) => c.key === 'VEHICLE_TYPE');
            if (vehicleIdx >= 0) {
              characteristics[vehicleIdx] = { ...characteristics[vehicleIdx], options: vehicleTypeOptions };
            }
          } catch {
            const vehicleTypeOptions = DEFAULT_VEHICLE_TYPES_API.map((api) => VEHICLE_TYPE_API_TO_DISPLAY[api]);
            const vehicleIdx = characteristics.findIndex((c: { key: string }) => c.key === 'VEHICLE_TYPE');
            if (vehicleIdx >= 0) {
              characteristics[vehicleIdx] = { ...characteristics[vehicleIdx], options: vehicleTypeOptions };
            }
          }
        }
        
        console.log('✅ [CREATE PLACE] ===== FIN CHARGEMENT CARACTÉRISTIQUES (SUCCÈS) =====');
        setDynamicCharacteristics(characteristics);
      } catch (error) {
        console.error('❌ [CREATE PLACE] Erreur lors du chargement des caractéristiques:', error);
        // En cas d'erreur, utiliser les caractéristiques par défaut
        const fallbackCharacteristics = spaceType === 'parking' ? PARKING_CHARACTERISTICS : STORAGE_CHARACTERISTICS;
        setDynamicCharacteristics(fallbackCharacteristics);
      } finally {
        setIsLoadingCharacteristics(false);
      }
    };

    loadCharacteristics();
  }, [spaceType]);

  // Calcul dynamique de la surface (m²) à chaque changement de LENGTH ou WIDTH
  // Surface = Longueur × Largeur — recalcul systématique (ex: 4m × 5m = 20m²)
  useEffect(() => {
    if (spaceType !== 'storage' && spaceType !== 'cellar') return;

    const length = formData.characteristics['LENGTH'];
    const width = formData.characteristics['WIDTH'];
    if (!length || !width) return;

    const lengthNum = parseFloat(String(length).replace(',', '.'));
    const widthNum = parseFloat(String(width).replace(',', '.'));
    if (isNaN(lengthNum) || isNaN(widthNum) || lengthNum <= 0 || widthNum <= 0) return;

    const surface = lengthNum * widthNum;
    const surfaceStr = surface.toFixed(2).replace('.', ',');
    setFormData(prev => ({
      ...prev,
      characteristics: {
        ...prev.characteristics,
        'SURFACE': surfaceStr
      }
    }));
    console.log('📐 [CREATE PLACE] Surface calculée automatiquement:', surfaceStr, 'm² (LENGTH:', length, '× WIDTH:', width, ')');
  }, [formData.characteristics['LENGTH'], formData.characteristics['WIDTH'], spaceType]);
  
  // Calcul dynamique du volume (m³) à chaque changement de LENGTH, WIDTH ou MAX_HEIGHT
  // Volume = Longueur × Largeur × Hauteur — recalcul systématique
  useEffect(() => {
    if (spaceType !== 'storage' && spaceType !== 'cellar') return;
    if (noHeightLimit) return; // Pas de volume si "Sans limite" de hauteur

    const length = formData.characteristics['LENGTH'];
    const width = formData.characteristics['WIDTH'];
    const height = formData.characteristics['MAX_HEIGHT'];
    if (!length || !width || !height) return;

    const lengthNum = parseFloat(String(length).replace(',', '.'));
    const widthNum = parseFloat(String(width).replace(',', '.'));
    const heightNum = parseFloat(String(height).replace(',', '.'));
    if (isNaN(lengthNum) || isNaN(widthNum) || isNaN(heightNum) ||
        lengthNum <= 0 || widthNum <= 0 || heightNum <= 0) return;

    const volume = lengthNum * widthNum * heightNum;
    const volumeStr = volume.toFixed(2).replace('.', ',');
    setFormData(prev => ({
      ...prev,
      characteristics: {
        ...prev.characteristics,
        'VOLUME': volumeStr
      }
    }));
    console.log('📐 [CREATE PLACE] Volume calculé automatiquement:', volumeStr, 'm³');
  }, [formData.characteristics['LENGTH'], formData.characteristics['WIDTH'], formData.characteristics['MAX_HEIGHT'], spaceType, noHeightLimit]);

  // Charger depuis localStorage au montage
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    const saved = localStorage.getItem('host_create_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Chargement initial depuis localStorage - nécessaire pour restaurer l'état
        let loadedFormData = parsed.formData || {};
        let loadedEnabledPrices = parsed.enabledPrices || {
          hourly: true,
          daily: true,
          weekly: false,
          monthly: false,
        };
        
        // Appliquer les valeurs par défaut si les prix sont activés mais vides
        if (loadedEnabledPrices.hourly && (!loadedFormData.priceHourly || loadedFormData.priceHourly.trim() === '')) {
          loadedFormData.priceHourly = '2';
        }
        if (loadedEnabledPrices.daily && (!loadedFormData.priceDaily || loadedFormData.priceDaily.trim() === '')) {
          loadedFormData.priceDaily = '10';
        }
        
        setFormData(loadedFormData);
        if (parsed.spaceType) {
          setSpaceType(parsed.spaceType);
        }
        if (parsed.currentStep) {
          setCurrentStep(parsed.currentStep);
        }
        setEnabledPrices(loadedEnabledPrices);
        if (parsed.characteristics) {
          // Restaurer les caractéristiques sauvegardées
          const updatedFormData = { ...loadedFormData, characteristics: parsed.characteristics };
          setFormData(updatedFormData);
        } else if (!loadedFormData.characteristics || Object.keys(loadedFormData.characteristics).length === 0) {
          // Brouillon sans caractéristiques : appliquer Exclusivité 24/7 = Oui par défaut
          setFormData(prev => ({ ...prev, characteristics: { EXCLUSIVITY_24_7: 'Oui' } }));
        }
      } catch (e) {
        console.error('Error loading draft:', e);
        // En cas d'erreur, réinitialiser complètement
        localStorage.removeItem('host_create_draft');
        setCurrentStep(1);
        setSpaceType(null);
        setFormData({
          title: '',
          address: '',
          city: '',
          zipCode: '',
          description: '',
          length: '',
          width: '',
          height: '',
          features: [],
          characteristics: { EXCLUSIVITY_24_7: 'Oui' },
          images: [],
          imagePreviews: [],
          video: null,
          videoPreview: null,
          priceHourly: '2', // Prix par défaut pour l'heure
          priceDaily: '10', // Prix par défaut pour le jour
          priceWeekly: '',
          priceMonthly: '',
          deposit: '',
        minDays: '',
        minHours: '',
        availableDates: [getDefaultDateRange()],
        currentDateRange: { start: '', end: '' },
        cancellationPolicy: 'FLEXIBLE',
        cancellationDeadlineDays: '0',
        truckAccessDistance: '',
        accessibilityRemarks: '',
        instantBooking: true
        });
        setEnabledPrices({
          hourly: true,
          daily: true,
          weekly: false,
          monthly: false,
        });
      }
    } else {
      // Pas de brouillon sauvegardé, réinitialiser complètement
      console.log('🔄 [CREATE] Aucun brouillon trouvé, réinitialisation complète');
      setCurrentStep(1);
      setSpaceType(null);
      setFormData({
        title: '',
        address: '',
        city: '',
        zipCode: '',
        description: '',
        length: '',
        width: '',
        height: '',
        features: [],
        images: [],
        imagePreviews: [],
        video: null,
        videoPreview: null,
        priceHourly: '2', // Prix par défaut pour l'heure
        priceDaily: '10', // Prix par défaut pour le jour
        priceWeekly: '',
        priceMonthly: '',
        deposit: '',
          minDays: '',
          minHours: '',
          characteristics: { EXCLUSIVITY_24_7: 'Oui' },
          availableDates: [getDefaultDateRange()],
          currentDateRange: { start: '', end: '' },
          cancellationPolicy: 'FLEXIBLE',
          cancellationDeadlineDays: '0',
          truckAccessDistance: '',
          accessibilityRemarks: '',
          instantBooking: true
        });
      setEnabledPrices({
        hourly: true, // Coché par défaut
        daily: true, // Coché par défaut
        weekly: false,
        monthly: false,
      });
    }
  }, []);

  // Scroll vers le haut quand on arrive à l'étape tarification (étape 5)
  useEffect(() => {
    if (currentStep === 5) {
      // Utiliser setTimeout pour s'assurer que le DOM est mis à jour
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [currentStep]);


  // Fonction pour formater le texte (première lettre majuscule, reste minuscule)
  const formatText = (text: string): string => {
    if (!text || text.trim() === '') return text;
    // Diviser par espaces pour traiter chaque mot
    return text
      .split(' ')
      .map(word => {
        if (!word) return word;
        // Première lettre en majuscule, reste en minuscule
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  const updateFormData = (field: string, value: string | number | boolean | string[] | File | File[] | { start: string; end: string }[] | { start: string; end: string } | Record<string, unknown> | null) => {
    setFormData(prev => ({ ...prev, [field]: value as typeof prev[keyof typeof prev] }));
    // Marquer le champ comme touché quand l'utilisateur interagit avec (tape ou efface)
    if (typeof value === 'string') {
      setTouchedFields(prev => ({ ...prev, [field]: true }));
      validateField(field, value);
    }
  };

  const validateField = (field: string, value: string) => {
    let isValid: boolean | null = null;
    
    switch (field) {
      case 'title':
        isValid = value.length >= 10 && value.length <= 30;
        break;
      case 'address':
        isValid = value.length >= 5;
        break;
      case 'city':
        isValid = value.length >= 2;
        break;
      case 'zipCode':
        isValid = /^\d{5}$/.test(value);
        break;
      case 'description':
        isValid = value.trim().length >= 20;
        break;
      case 'length':
      case 'width':
      case 'height':
        // La hauteur peut être vide si "sans hauteur limite" est coché
        isValid = value === '' || (value !== '' && parseFloat(value) > 0);
        break;
      case 'priceHourly':
        isValid = value !== '' && parseFloat(value) > 0;
        break;
      case 'priceDaily':
        isValid = value !== '' && parseFloat(value) > 0;
        break;
      case 'priceWeekly':
        isValid = value !== '' && parseFloat(value) > 0;
        break;
      case 'priceMonthly':
        isValid = value !== '' && parseFloat(value) > 0;
        break;
      case 'deposit':
        // La caution est optionnelle, donc vide = valide, sinon doit être un nombre positif
        isValid = value === '' || (value !== '' && parseFloat(value.replace(',', '.')) >= 0);
        break;
      default:
        isValid = null;
    }
    
    setFieldValidations(prev => ({ ...prev, [field]: isValid }));
  };

  // Recherche de villes/codes postaux pour l'autocomplétion
  useEffect(() => {
    // Ne pas déclencher la recherche si le dropdown est fermé (après sélection)
    if (!showCityPicker) {
      return;
    }

    // Utiliser soit la ville soit le code postal pour la recherche
    const searchValue = formData.city || formData.zipCode;
    
    // Nettoyer le timeout précédent
    if (citySearchTimeoutRef.current) {
      clearTimeout(citySearchTimeoutRef.current);
      citySearchTimeoutRef.current = null;
    }

    // Si les deux champs sont vides, vider les suggestions
    if (!searchValue || searchValue.trim().length === 0) {
      setCitySuggestions([]);
      setIsLoadingCitySuggestions(false);
      setShowCityPicker(false);
      return;
    }

    const inputValue = searchValue.trim();
    
    if (inputValue.length === 0) {
      setCitySuggestions([]);
      setIsLoadingCitySuggestions(false);
      setShowCityPicker(false);
      return;
    }

    // Détecter si c'est un code postal (que des chiffres, 5 caractères exactement)
    const isOnlyDigits = /^\d+$/.test(inputValue);
    const isPostalCode = isOnlyDigits && inputValue.length === 5;

    const debounceDelay = isPostalCode ? 100 : 300;

    setIsLoadingCitySuggestions(true);

    // Fonction pour effectuer la recherche
    const performCitySearch = async () => {
      try {
        let results: LocationSearchResult[] = [];
        
        if (isPostalCode) {
          // Recherche par code postal
          results = await locationsAPI.searchByPostalCode(inputValue);
        } else {
          // Recherche par nom de ville
          results = await locationsAPI.searchCities(inputValue);
        }

        setCitySuggestions(results);
      } catch (error) {
        console.error('Erreur lors de la recherche de villes:', error);
        setCitySuggestions([]);
      } finally {
        setIsLoadingCitySuggestions(false);
      }
    };

    // Déclencher la recherche avec le debounce approprié
    citySearchTimeoutRef.current = setTimeout(() => {
      performCitySearch();
    }, debounceDelay);

    // Cleanup
    return () => {
      if (citySearchTimeoutRef.current) {
        clearTimeout(citySearchTimeoutRef.current);
        citySearchTimeoutRef.current = null;
      }
    };
  }, [formData.city, formData.zipCode, showCityPicker]);

  const nextStep = () => {
    // Marquer tous les champs de l'étape actuelle comme touchés pour afficher les erreurs
    if (currentStep === 1) {
      // Pas de validation nécessaire à l'étape 1, seul le type d'espace est requis
    } else if (currentStep === 2) {
      setTouchedFields(prev => ({
        ...prev,
        title: true,
        address: true,
        city: true,
        zipCode: true,
        description: true
      }));
      // Valider tous les champs
      if (formData.title) validateField('title', formData.title);
      if (formData.address) validateField('address', formData.address);
      if (formData.city) validateField('city', formData.city);
      if (formData.zipCode) validateField('zipCode', formData.zipCode);
      if (formData.description) validateField('description', formData.description);
    } else if (currentStep === 3) {
      // Marquer les champs de dimensions comme touchés
      setTouchedFields(prev => ({
        ...prev,
        'characteristics.LENGTH': true,
        'characteristics.WIDTH': true,
        ...(spaceType === 'storage' || spaceType === 'cellar' ? { 'characteristics.MAX_HEIGHT': true } : {})
      }));
    } else if (currentStep === 5) {
      // Marquer tous les champs de prix comme touchés et valider
      setTouchedFields(prev => ({
        ...prev,
        priceHourly: true,
        priceDaily: true,
        priceWeekly: true,
        priceMonthly: true
      }));
      
      // Valider tous les prix
      if (formData.priceHourly) validateField('priceHourly', formData.priceHourly);
      if (formData.priceDaily) validateField('priceDaily', formData.priceDaily);
      if (formData.priceWeekly) validateField('priceWeekly', formData.priceWeekly);
      if (formData.priceMonthly) validateField('priceMonthly', formData.priceMonthly);
      
      // Vérifier les prix manquants et mettre le focus sur le premier champ manquant
      if (enabledPrices.hourly && (!formData.priceHourly || parseFloat(formData.priceHourly) <= 0)) {
        setError('Veuillez remplir le prix horaire.');
        setTimeout(() => priceHourlyRef.current?.focus(), 100);
        return;
      }
      if (enabledPrices.daily && (!formData.priceDaily || parseFloat(formData.priceDaily) <= 0)) {
        setError('Veuillez remplir le prix journalier.');
        setTimeout(() => priceDailyRef.current?.focus(), 100);
        return;
      }
      if (enabledPrices.weekly && (!formData.priceWeekly || parseFloat(formData.priceWeekly) <= 0)) {
        setError('Veuillez remplir le prix hebdomadaire.');
        setTimeout(() => priceWeeklyRef.current?.focus(), 100);
        return;
      }
      if (enabledPrices.monthly && (!formData.priceMonthly || parseFloat(formData.priceMonthly) <= 0)) {
        setError('Veuillez remplir le prix mensuel.');
        setTimeout(() => priceMonthlyRef.current?.focus(), 100);
        return;
      }
    }
    
    if (!canProceed()) {
      return;
    }
    setError(null);
    if (currentStep < STEPS.length) {
      const nextStepNumber = currentStep + 1;
      setCurrentStep(nextStepNumber);
      // Scroll vers le haut, avec un délai pour l'étape tarification
      if (nextStepNumber === 5) {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Vérifier que le type est sélectionné
        const hasSpaceType = spaceType !== null;
        return hasSpaceType;
      case 2:
        // Adresse doit être sélectionnée depuis l'autocomplétion (pas de validation sans sélection)
        const hasAddress = formData.address && formData.address.trim().length >= 5;
        const hasCity = formData.city && formData.city.trim().length >= 2;
        const hasZipCode = formData.zipCode && /^\d{5}$/.test(formData.zipCode);
        const hasTitle = formData.title && formData.title.trim().length >= 10 && formData.title.trim().length <= 30;
        const hasDescription = formData.description && formData.description.trim().length >= 20;
        return addressSelectedFromAutocomplete && hasAddress && hasCity && hasZipCode && hasTitle && hasDescription;
      case 3:
        // Vérifier les dimensions obligatoires (LENGTH et WIDTH)
        const lengthValue = formData.characteristics['LENGTH'] || formData.length || '';
        const widthValue = formData.characteristics['WIDTH'] || formData.width || '';
        const hasLength = lengthValue && lengthValue.trim() !== '' && parseFloat(lengthValue.replace(',', '.')) > 0;
        const hasWidth = widthValue && widthValue.trim() !== '' && parseFloat(widthValue.replace(',', '.')) > 0;
        // Pour les box et caves, vérifier aussi la hauteur (sauf si "sans limite" est coché)
        if (spaceType === 'storage' || spaceType === 'cellar') {
          if (noHeightLimit) {
            return hasLength && hasWidth;
          }
          const heightValue = formData.characteristics['MAX_HEIGHT'] || formData.height || '';
          const hasHeight = heightValue && heightValue.trim() !== '' && parseFloat(heightValue.replace(',', '.')) > 0;
          return hasLength && hasWidth && hasHeight;
        }
        return hasLength && hasWidth;
      case 4:
        // Les photos sont optionnelles, on peut continuer sans photos
        return true;
      case 5:
        // Au moins une case doit être cochée
        const hasAtLeastOneEnabled = 
          enabledPrices.hourly ||
          enabledPrices.daily ||
          enabledPrices.weekly ||
          enabledPrices.monthly;
        
        if (!hasAtLeastOneEnabled) {
          return false;
        }
        
        // Si une case est cochée, le prix correspondant doit être rempli et valide
        if (enabledPrices.hourly && (!formData.priceHourly || parseFloat(formData.priceHourly) <= 0)) {
          return false;
        }
        if (enabledPrices.daily && (!formData.priceDaily || parseFloat(formData.priceDaily) <= 0)) {
          return false;
        }
        if (enabledPrices.weekly && (!formData.priceWeekly || parseFloat(formData.priceWeekly) <= 0)) {
          return false;
        }
        if (enabledPrices.monthly && (!formData.priceMonthly || parseFloat(formData.priceMonthly) <= 0)) {
          return false;
        }
        return true;
      case 6:
        return formData.availableDates.length > 0;
      case 7:
        return true;
      default:
        return true;
    }
  };

  // Fonction pour compresser une image
  const compressImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionner si nécessaire
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxPhotos = 7;
    const remainingSlots = maxPhotos - formData.images.length;
    
    if (remainingSlots <= 0) {
      alert(`Vous avez déjà ajouté ${maxPhotos} photos. Maximum ${maxPhotos} photos autorisées.`);
      return;
    }
    
    // Limiter le nombre de fichiers à ajouter
    const filesToAdd = files.slice(0, remainingSlots);
    const newFiles = [...formData.images, ...filesToAdd];
    const newPreviews = [...formData.imagePreviews];
    
    for (const file of filesToAdd) {
      if (file.type.startsWith('image/')) {
        try {
          // Compresser l'image avant de l'ajouter
          const compressedImage = await compressImage(file);
          newPreviews.push(compressedImage);
          setFormData(prev => ({ ...prev, imagePreviews: [...prev.imagePreviews, compressedImage] }));
        } catch (error) {
          console.error('Erreur lors de la compression de l\'image:', error);
          // En cas d'erreur, utiliser l'image originale
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const result = event.target.result as string;
              newPreviews.push(result);
              setFormData(prev => ({ ...prev, imagePreviews: [...prev.imagePreviews, result] }));
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
    
    updateFormData('images', newFiles);
    
    if (files.length > remainingSlots) {
      alert(`${files.length - remainingSlots} photo(s) n'ont pas été ajoutées. Maximum ${maxPhotos} photos autorisées.`);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est bien une vidéo
    if (!file.type.startsWith('video/')) {
      alert('Veuillez sélectionner un fichier vidéo (MP4, MOV, AVI, etc.)');
      return;
    }

    // Vérifier la taille (par exemple max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert('La vidéo est trop volumineuse. Taille maximum: 100MB');
      return;
    }

    // Créer une preview de la vidéo
    const videoUrl = URL.createObjectURL(file);
    updateFormData('video', file);
    updateFormData('videoPreview', videoUrl);
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    const newPreviews = formData.imagePreviews.filter((_, i) => i !== index);
    updateFormData('images', newImages);
    updateFormData('imagePreviews', newPreviews);
  };

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const addDateRange = () => {
    if (formData.currentDateRange.start && formData.currentDateRange.end) {
      if (formData.currentDateRange.end < formData.currentDateRange.start) {
        setError('La date de fin doit être après la date de début');
        return;
      }
      const newRanges = [...formData.availableDates, formData.currentDateRange];
      updateFormData('availableDates', newRanges);
      updateFormData('currentDateRange', { start: '', end: '' });
      setError(null);
    }
  };

  const removeDateRange = (index: number) => {
    const newRanges = formData.availableDates.filter((_, i) => i !== index);
    updateFormData('availableDates', newRanges);
  };

  const handleSubmit = async () => {
    console.log('🚀 [CREATE PLACE] ===== DÉBUT DE LA CRÉATION D\'ANNONCE =====');
    console.log('🚀 [CREATE PLACE] handleSubmit appelé');
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Vérifier que l'utilisateur est connecté
      console.log('🔍 [CREATE PLACE] Vérification de l\'authentification...');
      const userId = localStorage.getItem('userId');
      const authToken = localStorage.getItem('authToken');
      console.log('🔍 [CREATE PLACE] userId:', userId);
      console.log('🔍 [CREATE PLACE] authToken présent:', !!authToken);
      
      if (!userId) {
        console.error('❌ [CREATE PLACE] Utilisateur non connecté');
        setError('Vous devez être connecté pour créer une annonce');
        setIsSubmitting(false);
        if (isCapacitor()) { capacitorNavigate('/auth/login'); } else { router.push('/auth/login'); }
        return;
      }
      
      console.log('✅ [CREATE PLACE] Utilisateur connecté, userId:', userId);

      // Vérifier les données requises
      console.log('🔍 [CREATE PLACE] Vérification des données du formulaire...');
      console.log('🔍 [CREATE PLACE] spaceType:', spaceType);
      console.log('🔍 [CREATE PLACE] formData:', {
        address: formData.address,
        city: formData.city,
        description: formData.description,
        priceHourly: formData.priceHourly,
        priceDaily: formData.priceDaily,
        priceWeekly: formData.priceWeekly,
        priceMonthly: formData.priceMonthly,
        features: formData.features,
        imagePreviews: formData.imagePreviews.length,
        availableDates: formData.availableDates.length
      });
      console.log('🔍 [CREATE PLACE] enabledPrices:', enabledPrices);
      
      if (!spaceType) {
        console.error('❌ [CREATE PLACE] Type d\'espace manquant');
        setError('Veuillez sélectionner un type d\'espace');
        setIsSubmitting(false);
        return;
      }

      if (!formData.address || !formData.city) {
        console.error('❌ [CREATE PLACE] Adresse ou ville manquante');
        setError('Veuillez remplir l\'adresse et la ville');
        setIsSubmitting(false);
        return;
      }
      
      console.log('✅ [CREATE PLACE] Données de base validées');

      // Vérifier qu'au moins une case est cochée
      console.log('🔍 [CREATE PLACE] Vérification des prix...');
      const hasAtLeastOneEnabled = 
        enabledPrices.hourly ||
        enabledPrices.daily ||
        enabledPrices.weekly ||
        enabledPrices.monthly;
      
      console.log('🔍 [CREATE PLACE] Au moins un prix activé:', hasAtLeastOneEnabled);
      
      if (!hasAtLeastOneEnabled) {
        console.error('❌ [CREATE PLACE] Aucun prix activé');
        setError('Veuillez cocher au moins un type de tarif');
        setIsSubmitting(false);
        return;
      }

      // Vérifier que les prix activés sont remplis et valides
      if (enabledPrices.hourly && (!formData.priceHourly || parseFloat(formData.priceHourly) <= 0)) {
        console.error('❌ [CREATE PLACE] Prix horaire invalide');
        setError('Veuillez remplir un prix valide pour le tarif horaire');
        setIsSubmitting(false);
        return;
      }
      if (enabledPrices.daily && (!formData.priceDaily || parseFloat(formData.priceDaily) <= 0)) {
        console.error('❌ [CREATE PLACE] Prix journalier invalide');
        setError('Veuillez remplir un prix valide pour le tarif journalier');
        setIsSubmitting(false);
        return;
      }
      if (enabledPrices.weekly && (!formData.priceWeekly || parseFloat(formData.priceWeekly) <= 0)) {
        console.error('❌ [CREATE PLACE] Prix hebdomadaire invalide');
        setError('Veuillez remplir un prix valide pour le tarif hebdomadaire');
        setIsSubmitting(false);
        return;
      }
      if (enabledPrices.monthly && (!formData.priceMonthly || parseFloat(formData.priceMonthly) <= 0)) {
        console.error('❌ [CREATE PLACE] Prix mensuel invalide');
        setError('Veuillez remplir un prix valide pour le tarif mensuel');
        setIsSubmitting(false);
        return;
      }
      
      console.log('✅ [CREATE PLACE] Validation des prix réussie');

      // ===== VALIDATION STRICTE DES DIMENSIONS (OBLIGATOIRE) =====
      console.log('🔍 [CREATE PLACE] Vérification des dimensions obligatoires...');
      
      // Marquer tous les champs obligatoires comme touchés lors de la soumission pour afficher les erreurs
      const requiredFields = ['LENGTH', 'WIDTH'];
      if (spaceType === 'storage' || spaceType === 'cellar') {
        requiredFields.push('MAX_HEIGHT');
      }
      const newTouchedFields: Record<string, boolean> = {};
      requiredFields.forEach(field => {
        newTouchedFields[`characteristics.${field}`] = true;
      });
      setTouchedFields(prev => ({ ...prev, ...newTouchedFields }));
      
      const lengthValue = formData.characteristics['LENGTH'] || formData.length || '';
      const widthValue = formData.characteristics['WIDTH'] || formData.width || '';
      const heightValue = formData.characteristics['MAX_HEIGHT'] || formData.height || '';
      
      // Validation des dimensions : LENGTH et WIDTH sont obligatoires pour tous les types
      if (!lengthValue || lengthValue.trim() === '') {
        console.error('❌ [CREATE PLACE] Longueur (LENGTH) manquante');
        setError('La longueur est obligatoire. Veuillez renseigner les dimensions de votre espace.');
        setIsSubmitting(false);
        return;
      }
      
      // Convertir la virgule en point pour parseFloat (format français -> format JavaScript)
      const lengthNum = parseFloat(lengthValue.replace(',', '.'));
      if (isNaN(lengthNum) || lengthNum <= 0) {
        console.error('❌ [CREATE PLACE] Longueur invalide');
        setError('La longueur doit être un nombre positif. Veuillez corriger les dimensions.');
        setIsSubmitting(false);
        return;
      }
      
      if (!widthValue || widthValue.trim() === '') {
        console.error('❌ [CREATE PLACE] Largeur (WIDTH) manquante');
        setError('La largeur est obligatoire. Veuillez renseigner les dimensions de votre espace.');
        setIsSubmitting(false);
        return;
      }
      
      // Convertir la virgule en point pour parseFloat
      const widthNum = parseFloat(widthValue.replace(',', '.'));
      if (isNaN(widthNum) || widthNum <= 0) {
        console.error('❌ [CREATE PLACE] Largeur invalide');
        setError('La largeur doit être un nombre positif. Veuillez corriger les dimensions.');
        setIsSubmitting(false);
        return;
      }
      
      // Pour les box et caves, la hauteur est aussi obligatoire (sauf si "sans limite" est coché)
      if ((spaceType === 'storage' || spaceType === 'cellar') && !noHeightLimit) {
        if (!heightValue || heightValue.trim() === '') {
          console.error('❌ [CREATE PLACE] Hauteur (MAX_HEIGHT) manquante pour box/cave');
          setError('La hauteur est obligatoire pour les box et caves. Veuillez renseigner la hauteur ou cocher "Sans limite".');
          setIsSubmitting(false);
          return;
        }
        
        // Si ce n'est pas "Sans limite", vérifier que c'est un nombre valide
        if (heightValue !== 'Sans limite') {
          // Convertir la virgule en point pour parseFloat
          const heightNum = parseFloat(heightValue.replace(',', '.'));
          if (isNaN(heightNum) || heightNum <= 0) {
            console.error('❌ [CREATE PLACE] Hauteur invalide');
            setError('La hauteur doit être un nombre positif. Veuillez corriger les dimensions.');
            setIsSubmitting(false);
            return;
          }
        }
      }
      
      console.log('✅ [CREATE PLACE] Validation des dimensions réussie:', {
        length: lengthValue,
        width: widthValue,
        height: heightValue || (noHeightLimit ? 'Sans limite' : 'N/A')
      });

      // ===== VALIDATION DE LA DESCRIPTION (OBLIGATOIRE) =====
      console.log('🔍 [CREATE PLACE] Vérification de la description...');
      if (!formData.description || formData.description.trim().length < 20) {
        console.error('❌ [CREATE PLACE] Description manquante ou trop courte');
        setError('La description est obligatoire et doit contenir au moins 20 caractères. Veuillez décrire votre espace.');
        setIsSubmitting(false);
        return;
      }
      console.log('✅ [CREATE PLACE] Description valide');

      // ===== VALIDATION DES DATES DE DISPONIBILITÉ (OBLIGATOIRE) =====
      console.log('🔍 [CREATE PLACE] Vérification des dates de disponibilité...');
      if (!formData.availableDates || formData.availableDates.length === 0) {
        console.error('❌ [CREATE PLACE] Aucune date de disponibilité renseignée');
        setError('Au moins une période de disponibilité est obligatoire. Veuillez ajouter des dates de disponibilité.');
        setIsSubmitting(false);
        return;
      }
      console.log('✅ [CREATE PLACE] Dates de disponibilité valides:', formData.availableDates.length, 'période(s)');

      // ===== VALIDATION DU TITRE (OBLIGATOIRE) =====
      console.log('🔍 [CREATE PLACE] Vérification du titre...');
      if (!formData.title || formData.title.trim().length < 10) {
        console.error('❌ [CREATE PLACE] Titre manquant ou trop court');
        setError('Le titre est obligatoire et doit contenir entre 10 et 30 caractères. Veuillez renseigner un titre descriptif.');
        setIsSubmitting(false);
        return;
      }
      if (formData.title.trim().length > 30) {
        console.error('❌ [CREATE PLACE] Titre trop long');
        setError('Le titre ne doit pas dépasser 30 caractères.');
        setIsSubmitting(false);
        return;
      }
      console.log('✅ [CREATE PLACE] Titre valide');

      // ===== VALIDATION DES PHOTOS (OPTIONNELLES) =====
      console.log('🔍 [CREATE PLACE] Vérification des photos...');
      if (formData.imagePreviews && formData.imagePreviews.length > 0) {
        console.log('✅ [CREATE PLACE] Photos valides:', formData.imagePreviews.length, 'photo(s)');
      } else {
        console.log('ℹ️ [CREATE PLACE] Aucune photo ajoutée (optionnel)');
      }

      // Mapper le type d'espace
      const placeType = spaceType === 'parking' ? 'PARKING' as const :
                       spaceType === 'storage' ? 'STORAGE_SPACE' as const :
                       'CAVE' as const;

      // Construire les caractéristiques à partir des features et dimensions
      // Construire les caractéristiques à partir des données détaillées saisies par l'utilisateur
      const characteristics: Array<{ name: string; value: string }> = [];

      // Fonction helper pour convertir la virgule en point (format français -> format backend)
      const normalizeDecimal = (value: string): string => {
        return value.replace(',', '.');
      };

      // Ajouter les dimensions si elles sont saisies (depuis characteristics ou champs simples)
      // Convertir la virgule en point pour l'envoi au backend
      if (lengthValue) {
        characteristics.push({ name: 'LENGTH', value: normalizeDecimal(lengthValue) });
      }
      if (widthValue) {
        characteristics.push({ name: 'WIDTH', value: normalizeDecimal(widthValue) });
      }
      if (noHeightLimit) {
        characteristics.push({ name: 'MAX_HEIGHT', value: 'Sans limite' });
      } else if (heightValue) {
        characteristics.push({ name: 'MAX_HEIGHT', value: normalizeDecimal(heightValue) });
      }

      // Calculer et ajouter le volume en m³ pour les box et caves (compatibilité)
      if ((spaceType === 'storage' || spaceType === 'cellar') && lengthValue && widthValue && !noHeightLimit && heightValue) {
        // Convertir les virgules en points pour parseFloat
        const length = parseFloat(lengthValue.replace(',', '.'));
        const width = parseFloat(widthValue.replace(',', '.'));
        const height = parseFloat(heightValue.replace(',', '.'));
        if (!isNaN(length) && !isNaN(width) && !isNaN(height) && length > 0 && width > 0 && height > 0) {
          const volume = length * width * height;
          // Vérifier si VOLUME n'est pas déjà dans les caractéristiques
          if (!formData.characteristics['VOLUME']) {
            // Envoyer avec un point (format backend)
            characteristics.push({ name: 'VOLUME', value: volume.toFixed(2) });
          }
        }
      }

      // Calculer et ajouter la surface pour les box et caves (compatibilité)
      // Utiliser la surface calculée automatiquement si elle existe, sinon la calculer
      const existingSurface = formData.characteristics['SURFACE'];
      if ((spaceType === 'storage' || spaceType === 'cellar') && lengthValue && widthValue) {
        // Convertir les virgules en points pour parseFloat
        const length = parseFloat(lengthValue.replace(',', '.'));
        const width = parseFloat(widthValue.replace(',', '.'));
        if (!isNaN(length) && !isNaN(width) && length > 0 && width > 0) {
          // Si la surface est déjà calculée automatiquement, l'utiliser
          // Sinon, la calculer maintenant
          if (existingSurface) {
            // Convertir la virgule en point pour l'envoi au backend
            characteristics.push({ name: 'SURFACE', value: normalizeDecimal(existingSurface) });
            console.log('📐 [CREATE PLACE] Surface existante utilisée:', existingSurface, 'm²');
          } else {
            const surface = length * width;
            // Envoyer avec un point (format backend)
            characteristics.push({ name: 'SURFACE', value: surface.toFixed(2) });
            console.log('📐 [CREATE PLACE] Surface calculée dans handleSubmit:', surface.toFixed(2), 'm²');
          }
        }
      }

      // Ajouter toutes les caractéristiques détaillées saisies par l'utilisateur
      // Exclure SURFACE pour les PARKING (non valide pour ce type de bien)
      // Exclure aussi LENGTH, WIDTH, MAX_HEIGHT, VOLUME, SURFACE car déjà ajoutés ci-dessus
      const alreadyAdded = ['LENGTH', 'WIDTH', 'MAX_HEIGHT', 'VOLUME', 'SURFACE'];
      // Liste des caractéristiques numériques qui doivent être converties (virgule -> point)
      // MIN_HOURS et MIN_DAYS sont exclus car gérées sur la page 5 (Durée minimum de location)
      const numericCharacteristics = ['LENGTH', 'WIDTH', 'MAX_HEIGHT', 'VOLUME', 'SURFACE', 'HEIGHT', 
        'STAIRS_WIDTH', 'PASSAGE_MIN_WIDTH', 'PASSAGE_MIN_HEIGHT', 'HEATED_DEGREE',
        'BUS_STOP_DISTANCE', 'TRAIN_STATION_DISTANCE', 'AIRPORT_DISTANCE', 
        'ELECTRIC_CHARGING_STATION_DISTANCE', 'BEACH_DISTANCE', 'TRUCK_ACCESS_DISTANCE'];
      
      Object.entries(formData.characteristics).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          // Ne pas ajouter SURFACE pour les PARKING
          if (placeType === 'PARKING' && key === 'SURFACE') {
            console.log('⚠️ [CREATE PLACE] SURFACE exclue pour PARKING (non valide)');
            return;
          }
          // Éviter les doublons pour les dimensions déjà ajoutées
          if (alreadyAdded.includes(key)) {
            return;
          }
          // Exclure MIN_HOURS et MIN_DAYS car gérées sur la page 5 (Durée minimum de location)
          if (key === 'MIN_HOURS' || key === 'MIN_DAYS') {
            console.log('⚠️ [CREATE PLACE] MIN_HOURS/MIN_DAYS exclues (gérées sur la page 5)');
            return;
          }
          // VEHICLE_TYPE : envoyé via acceptedVehicleTypes dans le payload (spec backend), pas dans characteristics
          if (key === 'VEHICLE_TYPE') return;
          // Pour les caractéristiques numériques, convertir la virgule en point pour l'envoi au backend
          const normalizedValue = numericCharacteristics.includes(key) 
            ? normalizeDecimal(value.trim()) 
            : value.trim();
          characteristics.push({ name: key, value: normalizedValue });
        }
      });

      // Ajouter les features comme caractéristiques (compatibilité avec l'ancien système)
      formData.features.forEach(feature => {
        // Éviter les doublons si la feature est déjà dans les caractéristiques détaillées
        const existingFeature = characteristics.find(c => c.value === 'Oui' && (
          c.name === feature ||
          c.name === feature.toUpperCase().replace(/\s+/g, '_')
        ));
        if (!existingFeature) {
          characteristics.push({ name: feature, value: 'Oui' });
        }
      });

      console.log('✅ [CREATE PLACE] Caractéristiques finales construites:', characteristics);
      console.log('✅ [CREATE PLACE] Format des caractéristiques:', {
        nombre: characteristics.length,
        format: 'Array<{ name: string, value: string }>',
        exemple: characteristics.slice(0, 3) // Afficher les 3 premières pour exemple
      });
      
      // Log spécifique pour les dimensions
      const dimensions = characteristics.filter(c => ['LENGTH', 'WIDTH', 'MAX_HEIGHT', 'SURFACE', 'VOLUME'].includes(c.name));
      console.log('📏 [CREATE PLACE] Dimensions qui seront envoyées:', dimensions);
      if (dimensions.length === 0) {
        console.warn('⚠️ [CREATE PLACE] ATTENTION: Aucune dimension trouvée dans les caractéristiques !');
        console.warn('⚠️ [CREATE PLACE] formData.characteristics:', formData.characteristics);
        console.warn('⚠️ [CREATE PLACE] formData.length/width/height:', formData.length, formData.width, formData.height);
      }

      // Fonction pour obtenir les images par défaut selon le type
      const getDefaultImages = (type: 'PARKING' | 'STORAGE_SPACE' | 'CAVE'): string[] => {
        // Utiliser des images par défaut différentes selon le type de bien
        // Ces images correspondent aux types affichés lors de la sélection (Car, Box, Warehouse)
        switch (type) {
          case 'PARKING':
            // Pour les parkings, utiliser une image représentant un parking
            // L'image par défaut pour les parkings
            return ['/fond.jpg'];
          case 'STORAGE_SPACE':
            // Pour les box de stockage, utiliser une image représentant un box
            // L'image par défaut pour les box
            return ['/fond.jpg'];
          case 'CAVE':
            // Pour les caves, utiliser une image représentant une cave
            // L'image par défaut pour les caves
            return ['/fond.jpg'];
          default:
            return ['/fond.jpg'];
        }
      };

      // Préparer les photos (max 3 pour éviter de dépasser la limite de la colonne DB)
      // Si aucune photo n'est fournie et aucune vidéo, utiliser l'image par défaut
      const maxPhotos = 3;
      let photos: string[] = [];
      
      if (formData.imagePreviews.length > 0) {
        // L'utilisateur a fourni des photos, utiliser celles-ci
        photos = formData.imagePreviews.slice(0, maxPhotos);
        console.log('📸 [CREATE PLACE] Photos utilisateur fournies:', photos.length);
      } else if (!formData.video) {
        // Aucune photo ni vidéo fournie, utiliser l'image par défaut
        photos = getDefaultImages(placeType);
        console.log(`📸 [CREATE PLACE] Aucune photo ni vidéo fournie, utilisation de l'image par défaut pour ${placeType}`);
      } else {
        // Il y a une vidéo mais pas de photo, on peut laisser photos vide ou utiliser l'image par défaut
        // Pour l'instant, on utilise l'image par défaut même s'il y a une vidéo
        photos = getDefaultImages(placeType);
        console.log(`📸 [CREATE PLACE] Vidéo fournie mais aucune photo, utilisation de l'image par défaut pour ${placeType}`);
      }
      
      // Vérifier la taille totale des photos (limite approximative pour éviter l'erreur DB)
      // Limite totale de ~100KB (environ 133000 caractères base64) pour 3 photos compressées
      // Note: Les images par défaut sont des URLs, pas du base64, donc pas de problème de taille
      let totalSize = 0;
      const limitedPhotos: string[] = [];
      const maxTotalSize = 133000; // ~100KB en base64
      const maxPhotoSize = 50000; // ~37KB par photo en base64
      
      for (const photo of photos) {
        // Si c'est une URL (commence par http), on l'ajoute directement
        if (photo.startsWith('http')) {
          limitedPhotos.push(photo);
          console.log('📸 [CREATE PLACE] Image URL ajoutée:', photo.substring(0, 50) + '...');
        } else {
          // Sinon, c'est du base64, vérifier la taille
          const photoSize = photo.length; // Taille approximative en caractères base64
          // Vérifier la taille individuelle et la taille totale
          if (photoSize < maxPhotoSize && totalSize + photoSize < maxTotalSize) {
            limitedPhotos.push(photo);
            totalSize += photoSize;
          } else {
            console.warn('⚠️ [CREATE PLACE] Photo trop grande, ignorée:', photoSize, 'caractères');
          }
        }
      }
      
      // Si aucune photo ne passe le filtre et qu'on n'a pas d'images par défaut, utiliser les images par défaut
      const finalPhotos = limitedPhotos.length > 0 ? limitedPhotos : (formData.imagePreviews.length === 0 ? getDefaultImages(placeType) : photos.slice(0, Math.min(2, photos.length)));
      
      console.log('📸 [CREATE PLACE] Photos finales préparées:', {
        total: formData.imagePreviews.length,
        envoyées: finalPhotos.length,
        sontParDefaut: formData.imagePreviews.length === 0,
        type: placeType,
        tailleTotale: totalSize,
        tailleParPhoto: finalPhotos.map(p => p.startsWith('http') ? 'URL' : p.length)
      });

      // Calculer les dates de disponibilité globale
      // Utiliser la première et dernière date des périodes disponibles
      let availableFrom: string | undefined;
      let availableTo: string | undefined;
      
      if (formData.availableDates.length > 0) {
        const sortedDates = [...formData.availableDates].sort((a, b) => 
          new Date(a.start).getTime() - new Date(b.start).getTime()
        );
        availableFrom = sortedDates[0].start;
        
        const endDates = sortedDates.map(d => d.end).sort((a, b) => 
          new Date(b).getTime() - new Date(a).getTime()
        );
        availableTo = endDates[0];
      }

      // Ne plus calculer de prix par défaut - on n'envoie que les prix activés par l'utilisateur
      console.log('🔧 [CREATE PLACE] Aucun calcul de prix par défaut - seuls les prix activés seront envoyés');

      // Construire le payload selon le PlaceDTO du backend
      console.log('🔧 [CREATE PLACE] Construction du payload...');
      console.log('🔧 [CREATE PLACE] Prix activés:', {
        hourly: enabledPrices.hourly,
        daily: enabledPrices.daily,
        weekly: enabledPrices.weekly,
        monthly: enabledPrices.monthly
      });
      
      // Construire le payload de base
      const payload: CreatePlacePayload = {
        type: placeType,
        address: formData.address,
        city: formData.city,
        title: formData.title?.trim() || undefined,
        description: formData.description || formData.title || undefined,
        deposit: formData.deposit && formData.deposit.trim() !== '' 
          ? parseFloat(formData.deposit.replace(',', '.')) 
          : 0, // Dépôt de garantie (0 si non renseigné)
        ownerId: parseInt(userId, 10),
        // Ne pas envoyer 'active' - le backend le calcule automatiquement en fonction des dates availableFrom/availableTo
        // Photos (limitées à 3 et vérifiées pour la taille) - liste d'URLs base64
        photos: finalPhotos,
        // Dates de disponibilité globale (format ISO: "YYYY-MM-DD")
        availableFrom: availableFrom || undefined,
        availableTo: availableTo || undefined,
        // Caractéristiques (liste d'objets { name, value })
        characteristics: characteristics.length > 0 ? characteristics : [],
        // Nombre de jours minimum de location
        minDays: formData.minDays && parseInt(formData.minDays) > 0 ? parseInt(formData.minDays) : undefined,
        // Nombre d'heures minimum de location
        minHours: formData.minHours && parseInt(formData.minHours) > 0 ? parseInt(formData.minHours) : undefined,
        // Politique d'annulation
        cancellationPolicy: formData.cancellationPolicy || undefined,
        // Délai d'annulation (mappé depuis cancellationPolicy si nécessaire)
        cancellationDeadlineDays: formData.cancellationDeadlineDays && formData.cancellationDeadlineDays !== '0' 
          ? parseInt(formData.cancellationDeadlineDays) 
          : (formData.cancellationPolicy === 'FLEXIBLE' ? 1 : formData.cancellationPolicy === 'MODERATE' ? 5 : formData.cancellationPolicy === 'STRICT' ? 14 : undefined),
        // Accessibilité logistique
        truckAccessDistance: formData.truckAccessDistance && formData.truckAccessDistance.trim() !== '' 
          ? parseFloat(formData.truckAccessDistance.replace(',', '.')) 
          : undefined,
        accessibilityRemarks: formData.accessibilityRemarks && formData.accessibilityRemarks.trim() !== '' 
          ? formData.accessibilityRemarks.trim() 
          : undefined,
        // Réservation instantanée
        instantBooking: formData.instantBooking !== undefined ? formData.instantBooking : true,
        ...(function (): { acceptedVehicleTypes?: string[] } {
          const raw = formData.characteristics['VEHICLE_TYPE'] || '';
          const displayValues = raw ? raw.split(',').map((v) => v.trim()).filter(Boolean) : [];
          const acceptedVehicleTypes = displayValues
            .map((d) => VEHICLE_TYPE_DISPLAY_TO_API[d])
            .filter((api): api is string => Boolean(api));
          return acceptedVehicleTypes.length > 0 ? { acceptedVehicleTypes } : {};
        }()),
      };
      
      // Ajouter les prix SEULEMENT s'ils sont activés
      if (enabledPrices.hourly && formData.priceHourly) {
        payload.pricePerHour = parseFloat(formData.priceHourly);
        payload.hourPriceActive = true;
        console.log('✅ [CREATE PLACE] Prix horaire ajouté:', payload.pricePerHour);
      } else {
        console.log('⏭️ [CREATE PLACE] Prix horaire non activé, non envoyé');
      }
      
      if (enabledPrices.daily && formData.priceDaily) {
        payload.pricePerDay = parseFloat(formData.priceDaily);
        payload.dayPriceActive = true;
        console.log('✅ [CREATE PLACE] Prix journalier ajouté:', payload.pricePerDay);
      } else {
        console.log('⏭️ [CREATE PLACE] Prix journalier non activé, non envoyé');
      }
      
      if (enabledPrices.weekly && formData.priceWeekly) {
        payload.pricePerWeek = parseFloat(formData.priceWeekly);
        payload.weekPriceActive = true;
        console.log('✅ [CREATE PLACE] Prix hebdomadaire ajouté:', payload.pricePerWeek);
      } else {
        console.log('⏭️ [CREATE PLACE] Prix hebdomadaire non activé, non envoyé');
      }
      
      if (enabledPrices.monthly && formData.priceMonthly) {
        payload.pricePerMonth = parseFloat(formData.priceMonthly);
        payload.monthPriceActive = true;
        console.log('✅ [CREATE PLACE] Prix mensuel ajouté:', payload.pricePerMonth);
      } else {
        console.log('⏭️ [CREATE PLACE] Prix mensuel non activé, non envoyé');
      }
      
      // Vérifier qu'au moins un prix a été ajouté
      const hasAtLeastOnePrice = payload.pricePerHour !== undefined || 
                                 payload.pricePerDay !== undefined || 
                                 payload.pricePerWeek !== undefined || 
                                 payload.pricePerMonth !== undefined;
      
      if (!hasAtLeastOnePrice) {
        console.error('❌ [CREATE PLACE] Aucun prix activé dans le payload !');
        setError('Veuillez activer au moins un type de tarif');
        setIsSubmitting(false);
        return;
      }
      
      console.log('✅ [CREATE PLACE] Payload final avec prix activés uniquement');

      console.log('🔵 [CREATE PLACE] Payload construit:', JSON.stringify(payload, null, 2));
      console.log('🔵 [CREATE PLACE] Détails du payload:', {
        type: payload.type,
        address: payload.address,
        city: payload.city,
        ownerId: payload.ownerId,
        pricePerDay: payload.pricePerDay,
        pricePerMonth: payload.pricePerMonth,
        hourPriceActive: payload.hourPriceActive,
        dayPriceActive: payload.dayPriceActive,
        weekPriceActive: payload.weekPriceActive,
        monthPriceActive: payload.monthPriceActive,
        photosCount: payload.photos?.length || 0,
        characteristicsCount: payload.characteristics?.length || 0,
        availableFrom: payload.availableFrom,
        availableTo: payload.availableTo,
        // Politique d'annulation et durée minimum
        minDays: payload.minDays,
        cancellationPolicy: payload.cancellationPolicy,
        cancellationDeadlineDays: payload.cancellationDeadlineDays
      });
      console.log('🔵 [CREATE PLACE] Caractéristiques dans le payload:', {
        nombre: payload.characteristics?.length || 0,
        format: 'Array<{ name: string, value: string }>',
        caracteristiques: payload.characteristics || []
      });

      // Appeler l'API pour créer le bien
      console.log('📡 [CREATE PLACE] ===== AVANT APPEL API =====');
      console.log('📡 [CREATE PLACE] Appel de placesAPI.create...');
      console.log('📡 [CREATE PLACE] URL de base attendue:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api');
      console.log('📡 [CREATE PLACE] ===== PAYLOAD COMPLET ENVOYÉ AU BACKEND =====');
      console.log('📡 [CREATE PLACE] Payload JSON (stringifié):', JSON.stringify(payload, null, 2));
      console.log('📡 [CREATE PLACE] ===== DÉTAILS DU PAYLOAD =====');
      console.log('📡 [CREATE PLACE] Type:', payload.type);
      console.log('📡 [CREATE PLACE] Adresse:', payload.address);
      console.log('📡 [CREATE PLACE] Ville:', payload.city);
      console.log('📡 [CREATE PLACE] Description:', payload.description);
      console.log('📡 [CREATE PLACE] Owner ID:', payload.ownerId);
      console.log('📡 [CREATE PLACE] ===== PRIX =====');
      console.log('📡 [CREATE PLACE] Prix horaire:', payload.pricePerHour, '| Actif:', payload.hourPriceActive);
      console.log('📡 [CREATE PLACE] Prix journalier:', payload.pricePerDay, '| Actif:', payload.dayPriceActive);
      console.log('📡 [CREATE PLACE] Prix hebdomadaire:', payload.pricePerWeek, '| Actif:', payload.weekPriceActive);
      console.log('📡 [CREATE PLACE] Prix mensuel:', payload.pricePerMonth, '| Actif:', payload.monthPriceActive);
      console.log('📡 [CREATE PLACE] ===== DATES =====');
      console.log('📡 [CREATE PLACE] Disponible du:', payload.availableFrom);
      console.log('📡 [CREATE PLACE] Disponible au:', payload.availableTo);
      console.log('📡 [CREATE PLACE] ===== CONDITIONS =====');
      console.log('📡 [CREATE PLACE] Jours minimum:', payload.minDays);
      console.log('📡 [CREATE PLACE] Heures minimum:', payload.minHours);
      console.log('📡 [CREATE PLACE] Politique annulation:', payload.cancellationPolicy);
      console.log('📡 [CREATE PLACE] Délai annulation (jours):', payload.cancellationDeadlineDays);
      console.log('📡 [CREATE PLACE] Réservation instantanée:', payload.instantBooking);
      console.log('📡 [CREATE PLACE] ===== PHOTOS =====');
      console.log('📡 [CREATE PLACE] Nombre de photos:', payload.photos?.length || 0);
      if (payload.photos && payload.photos.length > 0) {
        payload.photos.forEach((photo, index) => {
          console.log(`📡 [CREATE PLACE] Photo ${index + 1}:`, photo.substring(0, 50) + '... (base64, longueur: ' + photo.length + ')');
        });
      }
      console.log('📡 [CREATE PLACE] ===== CARACTÉRISTIQUES =====');
      console.log('📡 [CREATE PLACE] Nombre de caractéristiques:', payload.characteristics?.length || 0);
      if (payload.characteristics && payload.characteristics.length > 0) {
        console.log('📡 [CREATE PLACE] Liste complète des caractéristiques:');
        payload.characteristics.forEach((char, index) => {
          console.log(`📡 [CREATE PLACE]   ${index + 1}. ${char.name}: ${char.value}`);
        });
      }
      console.log('📡 [CREATE PLACE] ===== AUTRES CHAMPS =====');
      console.log('📡 [CREATE PLACE] Caution:', payload.deposit);
      console.log('📡 [CREATE PLACE] Distance accès camion:', payload.truckAccessDistance);
      console.log('📡 [CREATE PLACE] Remarques accessibilité:', payload.accessibilityRemarks);
      console.log('📡 [CREATE PLACE] ===== FIN DU PAYLOAD =====');
      console.log('📡 [CREATE PLACE] Fichier vidéo:', formData.video ? {
        name: formData.video.name,
        size: formData.video.size,
        type: formData.video.type
      } : 'Aucune vidéo');
      console.log('📡 [CREATE PLACE] Envoi de la requête POST au backend avec FormData...');
      
      // Passer le fichier vidéo à l'API (qui utilisera FormData)
      const createdPlace = await placesAPI.create(payload, formData.video || undefined);

      console.log('✅ [CREATE PLACE] Annonce créée avec succès!');
      console.log('✅ [CREATE PLACE] Réponse du backend:', JSON.stringify(createdPlace, null, 2));
      console.log('✅ [CREATE PLACE] ID de l\'annonce créée:', createdPlace.id);

      // Si des périodes de disponibilité spécifiques ont été définies, mettre à jour le calendrier
      if (formData.availableDates.length > 0 && createdPlace.id) {
        console.log('📅 [CREATE PLACE] Mise à jour du calendrier...');
        console.log('📅 [CREATE PLACE] Nombre de périodes:', formData.availableDates.length);
        try {
          const availabilities = formData.availableDates.map(dateRange => ({
            date: dateRange.start,
            available: true,
          }));
          
          console.log('📅 [CREATE PLACE] Appel de placesAPI.updateCalendar avec:', availabilities);
          await placesAPI.updateCalendar(createdPlace.id, availabilities);
          console.log('✅ [CREATE PLACE] Calendrier mis à jour avec succès');
        } catch (calendarError) {
          console.error('⚠️ [CREATE PLACE] Erreur lors de la mise à jour du calendrier:', calendarError);
          console.error('⚠️ [CREATE PLACE] Détails de l\'erreur:', {
            message: (calendarError as { message?: string })?.message,
            response: (calendarError as { response?: unknown })?.response
          });
          // Ne pas bloquer la création si le calendrier échoue
        }
      } else {
        console.log('ℹ️ [CREATE PLACE] Aucune période de disponibilité spécifique à mettre à jour');
      }

      // Nettoyer le localStorage après publication
      console.log('🧹 [CREATE PLACE] Nettoyage du localStorage...');
      localStorage.removeItem('host_create_draft');
      console.log('✅ [CREATE PLACE] localStorage nettoyé');
      
      // Rediriger vers la page "Mes annonces"
      console.log('🔄 [CREATE PLACE] Redirection vers /host/my-places...');
      if (isCapacitor()) { capacitorNavigate('/host/my-places'); } else { router.push('/host/my-places'); }
      console.log('✅ [CREATE PLACE] ===== FIN DE LA CRÉATION D\'ANNONCE (SUCCÈS) =====');
    } catch (error: unknown) {
      console.error('❌ [CREATE PLACE] ===== ERREUR LORS DE LA CRÉATION =====');
      console.error('❌ [CREATE PLACE] Type d\'erreur:', typeof error);
      console.error('❌ [CREATE PLACE] Erreur complète:', error);
      
      const errorObj = error as { 
        message?: string; 
        response?: { 
          status?: number;
          statusText?: string;
          data?: { 
            message?: string;
            error?: string;
          } 
        };
        request?: unknown;
        config?: unknown;
      };
      
      console.error('❌ [CREATE PLACE] Message d\'erreur:', errorObj?.message);
      console.error('❌ [CREATE PLACE] Status HTTP:', errorObj?.response?.status);
      console.error('❌ [CREATE PLACE] Status Text:', errorObj?.response?.statusText);
      console.error('❌ [CREATE PLACE] Données de l\'erreur:', errorObj?.response?.data);
      console.error('❌ [CREATE PLACE] Request:', errorObj?.request);
      console.error('❌ [CREATE PLACE] Config:', errorObj?.config);
      
      // Gérer les différents types d'erreurs
      let errorMessage = 'Une erreur est survenue lors de la publication. Veuillez réessayer.';
      
      // Erreur 400 Bad Request (propriétaire non trouvé, données invalides, etc.)
      if (errorObj?.response?.status === 400) {
        errorMessage = errorObj?.response?.data?.message || 
          errorObj?.response?.data?.error ||
          'Les données envoyées sont invalides. Veuillez vérifier vos informations.';
        
        // Message spécifique pour un propriétaire non trouvé
        if (errorMessage.includes('Propriétaire non trouvé') || errorMessage.includes('ownerId')) {
          errorMessage = 'Votre session a expiré ou votre compte n\'est plus valide. Veuillez vous reconnecter.';
        }
      } 
      // Erreur 404 Not Found (endpoint non trouvé)
      else if (errorObj?.response?.status === 404) {
        errorMessage = 'Le service est temporairement indisponible. Veuillez réessayer plus tard.';
      }
      // Erreur 401/403 (non autorisé)
      else if (errorObj?.response?.status === 401 || errorObj?.response?.status === 403) {
        errorMessage = 'Vous devez être connecté pour créer une annonce. Veuillez vous reconnecter.';
      }
      // Autres erreurs avec message du backend
      else if (errorObj?.response?.data?.message || errorObj?.response?.data?.error) {
        errorMessage = errorObj?.response?.data?.message || errorObj?.response?.data?.error || 'Une erreur est survenue lors de la publication. Veuillez réessayer.';
      }
      // Erreur réseau ou autre
      else if (errorObj?.message) {
        errorMessage = errorObj.message;
      }
      
      console.error('❌ [CREATE PLACE] Message d\'erreur final:', errorMessage);
      console.error('❌ [CREATE PLACE] Status HTTP:', errorObj?.response?.status);
      setError(errorMessage);
      setIsSubmitting(false);
      console.error('❌ [CREATE PLACE] ===== FIN DE LA CRÉATION D\'ANNONCE (ERREUR) =====');
    }
  };

  // Suggestions de prix par ville/type
  const getPriceSuggestions = () => {
    const city = formData.city.toLowerCase();
    const suggestions: Record<string, { daily: number; monthly: number }> = {
      'paris': { daily: 15, monthly: 300 },
      'lyon': { daily: 12, monthly: 250 },
      'marseille': { daily: 10, monthly: 200 },
      'toulouse': { daily: 10, monthly: 200 },
      'nice': { daily: 12, monthly: 250 },
      'default': { daily: 10, monthly: 200 }
    };
    
    return suggestions[city] || suggestions['default'];
  };

  const applyPriceSuggestion = () => {
    const suggestion = getPriceSuggestions();
    updateFormData('priceDaily', suggestion.daily.toString());
    updateFormData('priceMonthly', suggestion.monthly.toString());
  };

  const handleUseLocation = async () => {
    if (!('geolocation' in navigator)) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const result = await geocodeAPI.reverse(lat, lng);
          if (result) {
            if (result.address) {
              updateFormData('address', result.address);
              setTouchedFields(prev => ({ ...prev, address: true }));
              validateField('address', result.address);
            }
            if (result.city) {
              updateFormData('city', result.city);
              setTouchedFields(prev => ({ ...prev, city: true }));
              validateField('city', result.city);
            }
            if (result.postcode) {
              updateFormData('zipCode', result.postcode);
              setTouchedFields(prev => ({ ...prev, zipCode: true }));
              validateField('zipCode', result.postcode);
            }
            setAddressSelectedFromAutocomplete(true);
          } else {
            setError('Adresse introuvable à cette position. Veuillez saisir manuellement.');
          }
        } catch (err) {
          console.error('Erreur géocodage inverse:', err);
          setError('Impossible de récupérer l\'adresse. Veuillez saisir manuellement.');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setError('Impossible d\'obtenir votre position. Autorisez la géolocalisation ou saisissez l\'adresse manuellement.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const renderStepContent = () => {
    const currentStepData = STEPS[currentStep - 1];
    
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-2 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-2 sm:mb-8">
              <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-[#222222] mb-1 sm:mb-3">{currentStepData.mainTitle}</h2>
              <p className="text-xs sm:text-sm md:text-lg text-[#717171]">{currentStepData.subtitle}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 max-w-4xl mx-auto">
              {[
                { id: 'parking', icon: Car, label: 'Place de parking', desc: 'Garage, parking couvert ou extérieur' },
                { id: 'storage', icon: Box, label: 'Box de stockage', desc: 'Espace de rangement sécurisé' },
                { id: 'cellar', icon: Warehouse, label: 'Cave et Divers', desc: 'Cave ou sous-sol privé' }
              ].map((type) => {
                const Icon = type.icon;
                const isSelected = spaceType === type.id;
                
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      console.log('🔵 [CREATE PLACE] Type de bien sélectionné:', type.id);
                      setSpaceType(type.id as 'parking' | 'storage' | 'cellar');
                      // Animation de sélection
                    }}
                    className={`
                      relative rounded-lg sm:rounded-2xl border-2 transition-all duration-300 text-left sm:text-center transform cursor-pointer touch-manipulation active:scale-[0.98]
                      flex sm:flex-col items-center gap-3 sm:gap-0 p-4 sm:p-6 md:p-8 min-h-[72px] sm:min-h-0
                      ${isSelected 
                        ? 'border-[#2D5016] bg-[#2D5016]/5 shadow-lg scale-[1.02] sm:scale-105' 
                        : 'border-[#DDDDDD] hover:border-[#2D5016]/50 hover:shadow-lg bg-white hover:scale-[1.01] sm:hover:scale-[1.02]'
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 animate-in zoom-in duration-200">
                        <div className="w-5 h-5 sm:w-8 sm:h-8 bg-[#2D5016] rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex-shrink-0 p-2 sm:p-4 rounded-lg sm:mb-4 inline-flex ${isSelected ? 'bg-[#2D5016]/10' : 'bg-gray-50'}`}>
                      <Icon className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${isSelected ? 'text-[#2D5016]' : 'text-[#717171]'}`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left sm:text-center">
                      <h3 className="text-sm sm:text-lg md:text-xl font-semibold text-[#222222] mb-0.5 sm:mb-2">{type.label}</h3>
                      <p className="text-[11px] sm:text-xs md:text-sm text-[#717171] leading-snug">{type.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-2.5 sm:space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-2 sm:mb-8">
              <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-[#222222] mb-1 sm:mb-3">{currentStepData.mainTitle}</h2>
              <p className="text-xs sm:text-sm md:text-lg text-[#717171]">{currentStepData.subtitle}</p>
            </div>

            <div className="space-y-2.5 sm:space-y-5">
              <div>
                  <label className="block text-[11px] sm:text-sm font-semibold text-[#222222] mb-1 sm:mb-2 flex items-center">
                    Titre de l&apos;annonce *
                    <Tooltip content="Un titre accrocheur avec la localisation augmente vos chances d&apos;être vu. Ex: &apos;Parking couvert sécurisé - Paris 15ème&apos;" />
                  </label>
                <input
                  id="input-title-listing"
                  type="text"
                  maxLength={30}
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value.slice(0, 30))}
                  placeholder="Ex: Place de parking couverte - Paris 15ème"
                  className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all ${
                    touchedFields.title && fieldValidations.title === false ? 'border-red-300' : 'border-[#DDDDDD]'
                  }`}
                />
                <ValidationMessage 
                  isValid={fieldValidations.title} 
                  message={fieldValidations.title ? 'Titre valide' : 'Entre 10 et 30 caractères'}
                  touched={touchedFields.title}
                />
                {formData.title != null && formData.title.length > 0 && (
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{formData.title.length}/30</p>
                )}
              </div>

              <div>
                  <label className="block text-[11px] sm:text-sm font-semibold text-[#222222] mb-1 sm:mb-2 flex items-center">
                    Adresse *
                    <Tooltip content="L'adresse complète permet aux locataires de trouver facilement votre espace. Elle reste privée jusqu'à la réservation confirmée." />
                  </label>
                <div className="flex gap-2 items-stretch">
                  <div className="flex-1 min-w-0 w-full">
                  <AddressAutocomplete
                    id="input-address-listing"
                    value={formData.address}
                    onChange={(value) => {
                      updateFormData('address', value);
                      setTouchedFields(prev => ({ ...prev, address: true }));
                      // Si l'utilisateur modifie l'adresse après une sélection, invalider et exiger une nouvelle sélection
                      if (addressSelectedFromAutocomplete) {
                        setAddressSelectedFromAutocomplete(false);
                        updateFormData('city', '');
                        updateFormData('zipCode', '');
                        setTouchedFields(prev => ({ ...prev, city: false, zipCode: false }));
                      }
                      if (value.trim().length >= 5) {
                        validateField('address', value);
                      }
                    }}
                    onSelect={(suggestion) => {
                      setAddressSelectedFromAutocomplete(true);
                      if (suggestion.city) {
                        updateFormData('city', suggestion.city);
                        setTouchedFields(prev => ({ ...prev, city: true }));
                        validateField('city', suggestion.city);
                      }
                      if (suggestion.postcode) {
                        updateFormData('zipCode', suggestion.postcode);
                        setTouchedFields(prev => ({ ...prev, zipCode: true }));
                        validateField('zipCode', suggestion.postcode);
                      }
                    }}
                    onCityChange={(city) => {
                      updateFormData('city', city);
                      setTouchedFields(prev => ({ ...prev, city: true }));
                      validateField('city', city);
                    }}
                    onZipCodeChange={(zipCode) => {
                      updateFormData('zipCode', zipCode);
                      setTouchedFields(prev => ({ ...prev, zipCode: true }));
                      validateField('zipCode', zipCode);
                    }}
                    onBlur={() => {
                      setTouchedFields(prev => ({ ...prev, address: true }));
                      if (formData.address.trim().length >= 5) {
                        validateField('address', formData.address);
                      }
                    }}
                    placeholder="45 Rue de la Convention"
                    className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all ${
                      touchedFields.address && fieldValidations.address === false ? 'border-red-300' : 'border-[#DDDDDD]'
                    }`}
                  />
                  </div>
                  <button
                    id="btn-use-location-listing"
                    type="button"
                    onClick={handleUseLocation}
                    disabled={isLocating}
                    className="px-2.5 sm:px-4 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-[#222222] cursor-pointer touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0 flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                    <span className="hidden sm:inline">{isLocating ? 'Recherche...' : 'Ma position'}</span>
                    <span className="sm:hidden">{isLocating ? '...' : 'GPS'}</span>
                  </button>
                </div>
                <ValidationMessage 
                  isValid={fieldValidations.address} 
                  message={fieldValidations.address ? 'Adresse valide' : 'L\'adresse doit contenir au moins 5 caractères'}
                  touched={touchedFields.address}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                <div className="relative">
                  <label className="block text-[11px] sm:text-xs md:text-sm font-semibold text-[#222222] mb-1 sm:mb-2">
                    Ville *
                    {!addressSelectedFromAutocomplete && (
                      <span className="ml-1 text-slate-500 font-normal text-[10px] sm:text-xs">(rempli par la sélection d&apos;adresse)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    readOnly
                    placeholder="Sélectionnez une adresse ci-dessus"
                    className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg bg-white border-[#DDDDDD] text-[#222222] cursor-default focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all ${
                      touchedFields.city && fieldValidations.city === false ? 'border-red-300' : ''
                    }`}
                  />
                  <ValidationMessage 
                    isValid={fieldValidations.city} 
                    message={fieldValidations.city ? 'Ville valide' : 'La ville doit contenir au moins 2 caractères'}
                    touched={touchedFields.city}
                  />
                </div>

                <div className="relative">
                  <label className="block text-[11px] sm:text-xs md:text-sm font-semibold text-[#222222] mb-1 sm:mb-2">Code postal *</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    readOnly
                    placeholder="Sélectionnez une adresse ci-dessus"
                    className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg bg-white border-[#DDDDDD] text-[#222222] cursor-default focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all ${
                      touchedFields.zipCode && fieldValidations.zipCode === false ? 'border-red-300' : ''
                    }`}
                  />
                  <ValidationMessage 
                    isValid={fieldValidations.zipCode} 
                    message={fieldValidations.zipCode ? 'Code postal valide' : 'Le code postal doit contenir 5 chiffres'}
                    touched={touchedFields.zipCode}
                  />
                </div>
              </div>

              {/* Champ description */}
              <div>
                <label className="block text-[11px] sm:text-xs md:text-sm font-semibold text-[#222222] mb-1 sm:mb-2 flex items-center">
                  Description
                  <span className="ml-1 text-red-500 font-semibold">*</span>
                  <Tooltip content="Une description détaillée avec les avantages (proximité métro, sécurité, etc.) augmente vos réservations." />
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  onBlur={() => {
                    setTouchedFields(prev => ({ ...prev, description: true }));
                    validateField('description', formData.description);
                  }}
                  placeholder="Décrivez votre espace : localisation, accès, sécurité, avantages..."
                  rows={4}
                  className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none resize-none transition-all ${
                    touchedFields.description && fieldValidations.description === false ? 'border-red-300 bg-red-50' : 'border-[#DDDDDD]'
                  }`}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-[10px] sm:text-xs ${formData.description.length < 20 && touchedFields.description ? 'text-red-600' : 'text-[#717171]'}`}>
                    {formData.description.length}/500 {formData.description.length < 20 && touchedFields.description && <span className="hidden sm:inline">(min 20 caractères)</span>}
                  </p>
                </div>
                <ValidationMessage 
                  isValid={fieldValidations.description} 
                  message={fieldValidations.description ? 'Description valide' : 'La description doit contenir au moins 20 caractères'}
                  touched={touchedFields.description}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        // Étape Caractéristiques
        // Utiliser les caractéristiques dynamiques chargées depuis l'API
        const currentCharacteristics = dynamicCharacteristics.length > 0 
          ? dynamicCharacteristics 
          : (spaceType === 'parking' ? PARKING_CHARACTERISTICS : STORAGE_CHARACTERISTICS);
        
        console.log('🔵 [CREATE PLACE] Affichage étape 3 - Caractéristiques:', {
          utilisantAPI: dynamicCharacteristics.length > 0,
          nombreCaracteristiques: currentCharacteristics.length,
          type: spaceType
        });

        // Fonction pour regrouper les caractéristiques par sections
        const groupCharacteristicsBySection = (characteristics: typeof currentCharacteristics) => {
          const sections: Record<string, typeof currentCharacteristics> = {
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
            
            // Dimensions
            if (['LENGTH', 'WIDTH', 'MAX_HEIGHT', 'VOLUME', 'SURFACE', 'HEIGHT'].includes(key)) {
              sections['Dimensions'].push(char);
            }
            // Sécurité
            else if (['VIDEO_SURVEILLANCE', 'SECURITY_GUARD', 'SECURED_GATE', 'AUTOMATIC_BARRIER', 'LOCK_TYPE', 'NUMBERED_SPACE'].includes(key)) {
              sections['Sécurité'].push(char);
            }
            // Accès
            else if (['ACCESS_TYPE', 'LEVEL', 'DOOR_TYPE', 'STAIRS_TYPE', 'STAIRS_WIDTH', 'ELEVATOR_DIMENSIONS', 'PASSAGE_MIN_WIDTH', 'PASSAGE_MIN_HEIGHT', 'FREIGHT_ELEVATOR', 'PMR_ELEVATOR', 'SPACE_TYPE', 'PARKING_TYPE'].includes(key)) {
              sections['Accès'].push(char);
            }
            // Éclairage
            else if (['LIGHTING', 'INTERIOR_LIGHT'].includes(key)) {
              sections['Éclairage'].push(char);
            }
            // Équipements
            else if (['ELECTRIC_PLUG', 'WATER_POINT', 'ELECTRIC_CHARGING_STATION', 'HAND_TRUCK', 'STORAGE_RACK', 'SHELVES', 'OTHER_EQUIPMENT', 'FLOOR_QUALITY', 'HEATED_DEGREE', 'VENTILATION_TYPE', 'HUMIDITY_STATE', 'STORAGE_TYPE', 'AUTHORIZED_USAGE'].includes(key)) {
              sections['Équipements'].push(char);
            }
            // Services
            else if (['CLEANING', 'HANDLING_HELP', 'AIRPORT_SHUTTLE', 'STATION_SHUTTLE', 'CHILD_SEAT', 'OTHER_SERVICES', 'PMR_EQUIPMENT'].includes(key)) {
              sections['Services'].push(char);
            }
            // Distances
            else if (key.includes('_DISTANCE') || ['BUS_STOP_DISTANCE', 'TRAIN_STATION_DISTANCE', 'AIRPORT_DISTANCE', 'ELECTRIC_CHARGING_STATION_DISTANCE', 'BEACH_DISTANCE', 'TRUCK_ACCESS_DISTANCE'].includes(key)) {
              sections['Distances'].push(char);
            }
            // Restrictions
            else if (['TIME_RESTRICTIONS', 'EXCLUSIVITY_24_7', 'STOP_PARKING', 'FLAMMABLE_PROHIBITED', 'GAS_BOTTLE_PROHIBITED', 'GPL_PROHIBITED', 'GPL_ALLOWED', 'MOTORIZED_VEHICLE_PROHIBITED', 'CHEMICAL_PROHIBITED'].includes(key)) {
              sections['Restrictions'].push(char);
            }
            // Autres (fréquences, véhicules, etc.)
            // MIN_HOURS et MIN_DAYS sont exclus car gérés sur la page 5 (Durée minimum de location)
            else if (['RESERVATION_FREQUENCY_FROM', 'RESERVATION_FREQUENCY_TO', 'VEHICLE_TYPE', 'ACCESSIBILITY_REMARKS'].includes(key)) {
              sections['Autres'].push(char);
            }
            // Par défaut dans Autres
            else {
              sections['Autres'].push(char);
            }
          });

          // Filtrer les caractéristiques MIN_HOURS et MIN_DAYS (gérées sur la page 5)
          const filteredSections = Object.entries(sections).map(([title, chars]) => ({
            title,
            characteristics: chars.filter(char => char.key !== 'MIN_HOURS' && char.key !== 'MIN_DAYS')
          }));
          
          // Retourner seulement les sections qui contiennent des caractéristiques
          return filteredSections
            .filter(({ characteristics }) => characteristics.length > 0)
            .map(({ title, characteristics }) => ({ title, characteristics }));
        };

        const groupedSections = groupCharacteristicsBySection(currentCharacteristics);

        // Fonction pour obtenir l'icône appropriée pour chaque section
        const getSectionIcon = (sectionTitle: string) => {
          const iconProps = { className: "w-5 h-5 text-[#2D5016]" };
          switch (sectionTitle) {
            case 'Dimensions':
              return <Ruler {...iconProps} />;
            case 'Sécurité':
              return <Lock {...iconProps} />;
            case 'Accès':
              return <Key {...iconProps} />;
            case 'Éclairage':
              return <Lightbulb {...iconProps} />;
            case 'Équipements':
              return <Wrench {...iconProps} />;
            case 'Services':
              return <Package {...iconProps} />;
            case 'Distances':
              return <MapPin {...iconProps} />;
            case 'Restrictions':
              return <Ban {...iconProps} />;
            default:
              return <Shield {...iconProps} />;
          }
        };

        return (
          <div className="space-y-3 sm:space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-2 sm:mb-6 md:mb-8">
              <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-[#222222] mb-1 sm:mb-2.5 md:mb-3">{currentStepData.mainTitle}</h2>
              <p className="text-xs sm:text-sm md:text-lg text-[#717171] mb-2 sm:mb-3.5 md:mb-4">{currentStepData.subtitle}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3.5 md:p-4 max-w-lg mx-auto">
                <p className="text-[10px] sm:text-xs md:text-sm text-blue-900">
                  <strong>💡 Astuce :</strong> Plus vos caractéristiques sont détaillées, plus les locataires seront confiants dans leur réservation.
                </p>
              </div>
            </div>

            {isLoadingCharacteristics ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2D5016] mx-auto mb-4" />
                <p className="text-[#717171]">Chargement des caractéristiques...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {currentCharacteristics.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-[#717171]">Aucune caractéristique disponible pour ce type d'espace.</p>
                  </div>
                ) : (
                  groupedSections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-6 space-y-3 sm:space-y-5 shadow-sm">
                      <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-4 border-b-2 border-slate-100">
                        <div className="p-1.5 sm:p-2 bg-[#2D5016]/10 rounded-lg">
                          {getSectionIcon(section.title)}
                        </div>
                        <h3 className="text-sm sm:text-lg font-semibold text-[#222222] flex-1">
                          {section.title}
                        </h3>
                        <span className="text-[10px] sm:text-xs font-medium text-[#717171] bg-slate-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                          {section.characteristics.length} champ{section.characteristics.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                        {section.characteristics.map((characteristic) => {
                          // Ne pas afficher TIME_RESTRICTIONS si EXCLUSIVITY_24_7 est "Oui"
                          if (characteristic.key === 'TIME_RESTRICTIONS' && formData.characteristics['EXCLUSIVITY_24_7'] === 'Oui') {
                            return null;
                          }
                          
                          // Déterminer si le champ est obligatoire
                          const isRequired = 
                            characteristic.key === 'LENGTH' || 
                            characteristic.key === 'WIDTH' || 
                            (characteristic.key === 'MAX_HEIGHT' && (spaceType === 'storage' || spaceType === 'cellar'));
                          
                          // Vérifier si le champ est rempli
                          const value = formData.characteristics[characteristic.key] || '';
                          const isEmpty = !value || value.trim() === '';
                          const fieldKey = `characteristics.${characteristic.key}`;
                          const isTouched = touchedFields[fieldKey] || false;
                          // Ne pas afficher l'erreur si le champ n'a pas été touché
                          const isInvalid = isRequired && isEmpty && isTouched;
                          
                          return (
                          <div key={characteristic.key} className="space-y-1 sm:space-y-2">
                            <label className={`block text-[11px] sm:text-sm font-medium ${isInvalid ? 'text-red-600' : 'text-[#717171]'}`}>
                              {characteristic.label}
                              {isRequired && (
                                <span className="ml-1 text-red-500 font-semibold">*</span>
                              )}
                              {characteristic.key === 'SURFACE' && (
                                <span className="ml-2 text-xs text-slate-500 font-normal">
                                  (calculée automatiquement si vide)
                                </span>
                              )}
                              {characteristic.key === 'VOLUME' && (
                                <span className="ml-2 text-xs text-slate-500 font-normal">
                                  (calculé automatiquement si vide)
                                </span>
                              )}
                            </label>

                            {characteristic.key === 'VEHICLE_TYPE' ? (
                              <div className="flex flex-wrap gap-2">
                                {(characteristic.options || []).map((option) => {
                                  const currentValue = formData.characteristics['VEHICLE_TYPE'] || '';
                                  const selectedList = currentValue ? currentValue.split(',').map(s => s.trim()).filter(Boolean) : [];
                                  const isChecked = selectedList.includes(option);
                                  return (
                                    <label
                                      key={option}
                                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                        isChecked ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-[#DDDDDD] text-slate-700 hover:border-slate-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          const newList = isChecked
                                            ? selectedList.filter((s) => s !== option)
                                            : [...selectedList, option];
                                          const newCharacteristics = { ...formData.characteristics };
                                          if (newList.length > 0) {
                                            newCharacteristics['VEHICLE_TYPE'] = newList.join(', ');
                                          } else {
                                            delete newCharacteristics['VEHICLE_TYPE'];
                                          }
                                          updateFormData('characteristics', newCharacteristics);
                                        }}
                                        onBlur={() => {
                                          setTouchedFields(prev => ({ ...prev, [fieldKey]: true }));
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
                                value={formData.characteristics[characteristic.key] || ''}
                                onChange={(e) => {
                                  const newCharacteristics = { ...formData.characteristics };
                                  if (e.target.value) {
                                    newCharacteristics[characteristic.key] = e.target.value;
                                  } else {
                                    delete newCharacteristics[characteristic.key];
                                  }
                                  
                                  // Si EXCLUSIVITY_24_7 passe à "Oui", vider TIME_RESTRICTIONS
                                  if (characteristic.key === 'EXCLUSIVITY_24_7' && e.target.value === 'Oui') {
                                    delete newCharacteristics['TIME_RESTRICTIONS'];
                                  }
                                  // Fréquence réservation : si Début change et que Fin n'est plus valide (Fin <= Début), vider Fin
                                  if (characteristic.key === 'RESERVATION_FREQUENCY_FROM' && newCharacteristics['RESERVATION_FREQUENCY_TO']) {
                                    const fromVal = newCharacteristics['RESERVATION_FREQUENCY_FROM'];
                                    const toVal = newCharacteristics['RESERVATION_FREQUENCY_TO'];
                                    if (fromVal && toVal && toVal <= fromVal) delete newCharacteristics['RESERVATION_FREQUENCY_TO'];
                                  }
                                  // Fréquence réservation : si Fin change et que Début n'est plus valide (Début >= Fin), vider Début
                                  if (characteristic.key === 'RESERVATION_FREQUENCY_TO' && newCharacteristics['RESERVATION_FREQUENCY_FROM']) {
                                    const fromVal = newCharacteristics['RESERVATION_FREQUENCY_FROM'];
                                    const toVal = newCharacteristics['RESERVATION_FREQUENCY_TO'];
                                    if (fromVal && toVal && fromVal >= toVal) delete newCharacteristics['RESERVATION_FREQUENCY_FROM'];
                                  }
                                  
                                  updateFormData('characteristics', newCharacteristics);
                                }}
                                onBlur={() => {
                                  // Marquer le champ comme touché quand l'utilisateur quitte le champ
                                  setTouchedFields(prev => ({
                                    ...prev,
                                    [fieldKey]: true
                                  }));
                                }}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all ${
                                  isInvalid ? 'border-red-300 bg-red-50' : 'border-[#DDDDDD]'
                                }`}
                              >
                                <option value="">Sélectionner...</option>
                                {(characteristic.key === 'RESERVATION_FREQUENCY_TO'
                                  ? (characteristic.options || []).filter((h: string) => {
                                      const fromVal = formData.characteristics['RESERVATION_FREQUENCY_FROM'] || '';
                                      return fromVal && h > fromVal;
                                    })
                                  : characteristic.key === 'RESERVATION_FREQUENCY_FROM'
                                  ? (characteristic.options || []).filter((h: string) => {
                                      const toVal = formData.characteristics['RESERVATION_FREQUENCY_TO'] || '';
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
                                value={formData.characteristics[characteristic.key] || ''}
                                onChange={(e) => {
                                  const newCharacteristics = { ...formData.characteristics };
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
                                    
                                    // Valider que le reste est bien numérique (chiffres uniquement, sauf la virgule)
                                    // Permettre les chiffres et la virgule (pas de signe négatif pour les dimensions)
                                    const cleanedValue = inputValue.trim();
                                    // Vérifier que c'est un nombre valide (chiffres avec virgule optionnelle)
                                    // Format accepté: "123" ou "123,45" ou "123," ou ",45"
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
                                  
                                  // Calcul automatique de la surface si LENGTH ou WIDTH est modifié
                                  // Ne calculer que si SURFACE est vide (pour permettre la modification manuelle)
                                  // Ne pas calculer SURFACE pour les PARKING (non valide pour ce type de bien)
                                  if ((spaceType === 'storage' || spaceType === 'cellar') && (characteristic.key === 'LENGTH' || characteristic.key === 'WIDTH')) {
                                    const length = newCharacteristics['LENGTH'] || '';
                                    const width = newCharacteristics['WIDTH'] || '';
                                    const currentSurface = newCharacteristics['SURFACE'] || '';
                                    
                                    // Calculer la surface seulement si elle est vide
                                    if (!currentSurface && length && width) {
                                      // Convertir la virgule en point pour parseFloat
                                      const lengthNum = parseFloat(length.replace(',', '.'));
                                      const widthNum = parseFloat(width.replace(',', '.'));
                                      
                                      if (!isNaN(lengthNum) && !isNaN(widthNum) &&
                                          lengthNum > 0 && widthNum > 0) {
                                        const surface = lengthNum * widthNum;
                                        // Afficher avec une virgule (format français)
                                        newCharacteristics['SURFACE'] = surface.toFixed(2).replace('.', ',');
                                        console.log('📐 [CREATE PLACE] Surface calculée automatiquement dans onChange:', surface.toFixed(2).replace('.', ','), 'm²');
                                      }
                                    }
                                  }
                                  
                                  // Calcul automatique du volume si LENGTH, WIDTH ou MAX_HEIGHT est modifié
                                  // Ne calculer que si VOLUME est vide (pour permettre la modification manuelle)
                                  if ((spaceType === 'storage' || spaceType === 'cellar') && (characteristic.key === 'LENGTH' || characteristic.key === 'WIDTH' || characteristic.key === 'MAX_HEIGHT')) {
                                    const length = newCharacteristics['LENGTH'] || '';
                                    const width = newCharacteristics['WIDTH'] || '';
                                    const height = newCharacteristics['MAX_HEIGHT'] || '';
                                    const currentVolume = newCharacteristics['VOLUME'] || '';
                                    
                                    // Calculer le volume seulement s'il est vide et si les trois dimensions sont présentes
                                    if (!currentVolume && length && width && height && !noHeightLimit) {
                                      // Convertir les virgules en points pour parseFloat
                                      const lengthNum = parseFloat(length.replace(',', '.'));
                                      const widthNum = parseFloat(width.replace(',', '.'));
                                      const heightNum = parseFloat(height.replace(',', '.'));
                                      
                                      if (!isNaN(lengthNum) && !isNaN(widthNum) && !isNaN(heightNum) && 
                                          lengthNum > 0 && widthNum > 0 && heightNum > 0) {
                                        const volume = lengthNum * widthNum * heightNum;
                                        // Afficher avec une virgule (format français)
                                        newCharacteristics['VOLUME'] = volume.toFixed(2).replace('.', ',');
                                        console.log('📐 [CREATE PLACE] Volume calculé automatiquement:', volume.toFixed(2).replace('.', ','), 'm³');
                                      }
                                    }
                                  }
                                  
                                  updateFormData('characteristics', newCharacteristics);
                                }}
                                onBlur={(e) => {
                                  // Marquer le champ comme touché quand l'utilisateur quitte le champ
                                  setTouchedFields(prev => ({
                                    ...prev,
                                    [fieldKey]: true
                                  }));
                                  
                                  // Pour les champs numériques, normaliser en virgule à la sortie
                                  if (characteristic.type === 'number') {
                                    const currentValue = formData.characteristics[characteristic.key] || '';
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
                                        const newCharacteristics = { ...formData.characteristics };
                                        newCharacteristics[characteristic.key] = normalizedValue;
                                        updateFormData('characteristics', newCharacteristics);
                                      }
                                    }
                                  }
                                }}
                                placeholder={characteristic.placeholder}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all ${
                                  isInvalid ? 'border-red-300 bg-red-50' : 'border-[#DDDDDD]'
                                }`}
                              />
                            )}
                            
                            {/* Message d'erreur pour les champs obligatoires */}
                            {isInvalid && (
                              <p className="text-xs text-red-600 mt-1">
                                Ce champ est obligatoire
                              </p>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  ))
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-2">
                    <strong>ℹ️ Note :</strong> Ces informations détaillées permettent aux locataires de mieux évaluer si votre espace correspond à leurs besoins.
                  </p>
                  <p className="text-sm text-red-600 font-medium">
                    <strong>⚠️ Champs obligatoires :</strong> Les champs marqués d'un astérisque (*) sont obligatoires pour la publication de votre annonce.
                    <br />
                    - <strong>Longueur</strong> et <strong>Largeur</strong> sont obligatoires pour tous les types d'espaces
                    {spaceType === 'storage' || spaceType === 'cellar' ? (
                      <> - <strong>Hauteur</strong> est également obligatoire pour les box et caves</>
                    ) : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Section Note d'accessibilité logistique */}
            <div className="mt-8 pt-6 border-t border-[#DDDDDD]">
              <h3 className="text-lg font-semibold text-[#222222] mb-2 flex items-center">
                Note d&apos;accessibilité logistique
                <Tooltip content="Est-ce qu'un camion de déménagement peut stationner à proximité immédiate de l'entrée ? Si oui à combien de mètres." />
              </h3>
              <p className="text-sm text-[#717171] mb-4">
                Est-ce qu&apos;un camion de déménagement peut stationner à proximité immédiate de l&apos;entrée ? Si oui à combien de mètres.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#717171] mb-2">
                    Distance d&apos;accès camion (mètres)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.truckAccessDistance}
                      onChange={(e) => {
                        let inputValue = e.target.value;
                        // Transformer les points en virgules
                        inputValue = inputValue.replace(/\./g, ',');
                        // Valider que c'est un nombre valide (chiffres avec virgule optionnelle)
                        const isValidNumber = /^\d*[,]?\d*$/.test(inputValue.trim());
                        if (isValidNumber || inputValue === '') {
                          updateFormData('truckAccessDistance', inputValue);
                        }
                      }}
                      placeholder="Ex: 50"
                      className="w-32 px-4 py-3 border border-[#DDDDDD] rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all"
                    />
                    <span className="text-sm text-[#717171]">mètres</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#717171] mb-2">
                    Remarque d&apos;accessibilité
                  </label>
                  <textarea
                    value={formData.accessibilityRemarks}
                    onChange={(e) => updateFormData('accessibilityRemarks', e.target.value)}
                    placeholder="Ex: Portail étroit, Pente raide, Accès par escalier..."
                    rows={3}
                    className="w-full px-4 py-3 border border-[#DDDDDD] rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none resize-none transition-all"
                  />
                  <p className="text-xs text-[#717171] mt-1">
                    Précisions complémentaires sur l&apos;accessibilité (ex: &quot;Portail étroit&quot;, &quot;Pente raide&quot;, etc.)
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-2 sm:mb-6 md:mb-8">
              <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-[#222222] mb-1 sm:mb-2.5 md:mb-3">{currentStepData.mainTitle}</h2>
              <p className="text-xs sm:text-sm md:text-lg text-[#717171] mb-2 sm:mb-3.5 md:mb-4">{currentStepData.subtitle}</p>
            </div>

            <label className="block">
              <div className="border-2 border-dashed border-[#DDDDDD] hover:border-[#2D5016] active:border-[#1a3009] rounded-lg sm:rounded-2xl p-4 sm:p-8 md:p-10 lg:p-12 text-center transition-all cursor-pointer group touch-manipulation">
                <Upload className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-2 sm:mb-3.5 md:mb-4 text-[#717171] group-hover:text-[#2D5016] transition-colors" />
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-[#222222] mb-1 sm:mb-2">
                  {formData.images.length === 0 
                    ? 'Glissez-déposez vos photos ici' 
                    : formData.images.length >= 7
                    ? 'Maximum 7 photos atteint'
                    : `Ajoutez ${Math.max(0, 7 - formData.images.length)} photo(s) supplémentaire(s)`}
                </h3>
                <p className="text-[10px] sm:text-xs md:text-sm text-[#717171] mb-2 sm:mb-3.5 md:mb-4">ou cliquez pour sélectionner (max 7 photos)</p>
                <div className="px-3 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base text-white font-semibold rounded-lg transition-all inline-block bg-[#2D5016] hover:bg-[#233e11] active:bg-[#1a3009] group-hover:scale-105 active:scale-95 touch-manipulation min-h-[44px] sm:min-h-0 flex items-center justify-center">
                  Parcourir les fichiers
                </div>
                {formData.images.length > 0 && (
                  <p className={`text-sm mt-3 font-medium ${
                    formData.images.length >= 7 ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    ✓ {formData.images.length} photo{formData.images.length > 1 ? 's' : ''} ajoutée{formData.images.length > 1 ? 's' : ''}
                    {formData.images.length < 7 && ` (maximum: ${7 - formData.images.length} de plus)`}
                  </p>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {formData.imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mt-3 sm:mt-6">
                {formData.imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group animate-in zoom-in duration-300">
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
                      <div className="absolute bottom-2 left-2 bg-[#2D5016] text-white text-xs px-2 py-1 rounded">
                        Photo principale
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Section Vidéo */}
            <div className="mt-8 pt-6 border-t border-[#DDDDDD]">
              <h3 className="text-base sm:text-lg font-semibold text-[#222222] mb-2 flex items-center">
                Vidéo (optionnel)
                <Tooltip content="Une vidéo permet aux locataires de mieux visualiser votre espace et augmente les réservations." />
              </h3>
              <p className="text-xs sm:text-sm text-[#717171] mb-4">
                Ajoutez une vidéo pour présenter votre espace (max 1 vidéo)
              </p>

              <label className="block">
                <div className={`border-2 border-dashed rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer group touch-manipulation ${
                  formData.video 
                    ? 'border-[#2D5016] bg-[#2D5016]/5' 
                    : 'border-[#DDDDDD] hover:border-[#2D5016] active:border-[#1a3009]'
                }`}>
                  <Video className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-[#717171] group-hover:text-[#2D5016] transition-colors" />
                  <h3 className="text-sm sm:text-base font-semibold text-[#222222] mb-1.5">
                    {formData.video 
                      ? 'Vidéo sélectionnée' 
                      : 'Glissez-déposez votre vidéo ici'}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#717171] mb-3">
                    {formData.video 
                      ? formData.video.name 
                      : 'ou cliquez pour sélectionner (MP4, MOV, AVI)'}
                  </p>
                  {!formData.video && (
                    <div className="px-4 sm:px-5 py-2 text-xs sm:text-sm text-white font-semibold rounded-lg transition-all inline-block bg-[#2D5016] hover:bg-[#233e11] active:bg-[#1a3009] group-hover:scale-105 active:scale-95 touch-manipulation">
                      Parcourir les fichiers
                    </div>
                  )}
                  {formData.video && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateFormData('video', null);
                        updateFormData('videoPreview', null);
                      }}
                      className="mt-3 px-4 py-2 text-xs sm:text-sm text-red-600 hover:text-red-700 font-semibold rounded-lg transition-all inline-block hover:bg-red-50 active:scale-95 touch-manipulation"
                    >
                      Supprimer la vidéo
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </label>

              {formData.videoPreview && (
                <div className="mt-4 relative rounded-lg overflow-hidden bg-gray-100">
                  <video
                    src={formData.videoPreview}
                    controls
                    className="w-full max-h-96 object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-4 sm:mb-6 md:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#222222] mb-2 sm:mb-2.5 md:mb-3">{currentStepData.mainTitle}</h2>
              <p className="text-sm sm:text-base md:text-lg text-[#717171]">{currentStepData.subtitle}</p>
            </div>

            <div className="space-y-3 sm:space-y-3.5 md:space-y-4">
              {/* Prix à l'heure */}
              <div className={`flex items-start sm:items-center gap-2 sm:gap-4 p-2.5 sm:p-4 border rounded-lg transition-colors ${
                enabledPrices.hourly 
                  ? 'border-[#DDDDDD] hover:border-[#2D5016]' 
                  : 'border-[#DDDDDD] bg-slate-50 opacity-60'
              }`}>
                <input
                  type="checkbox"
                  checked={enabledPrices.hourly}
                  onChange={(e) => {
                    setEnabledPrices(prev => ({ ...prev, hourly: e.target.checked }));
                    if (e.target.checked) {
                      // Si on coche et que le champ est vide, mettre une valeur par défaut
                      if (!formData.priceHourly || formData.priceHourly.trim() === '') {
                        updateFormData('priceHourly', '2');
                      }
                    } else {
                      updateFormData('priceHourly', '');
                    }
                  }}
                  className="w-5 h-5 text-[#2D5016] border-[#DDDDDD] rounded focus:ring-[#2D5016] cursor-pointer mt-0.5 sm:mt-0 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <label className={`block text-[11px] sm:text-sm font-semibold mb-1 sm:mb-2 flex items-center ${
                    enabledPrices.hourly ? 'text-[#222222]' : 'text-slate-400'
                  }`}>
                    Prix à l&apos;heure
                    <Tooltip content="Utile pour les locations de courte durée (quelques heures)." />
                  </label>
                  <div className="relative">
                    <input
                      ref={priceHourlyRef}
                      type="number"
                      step="0.5"
                      value={formData.priceHourly}
                      onChange={(e) => updateFormData('priceHourly', e.target.value)}
                      onBlur={() => {
                        setTouchedFields(prev => ({ ...prev, priceHourly: true }));
                        if (formData.priceHourly) validateField('priceHourly', formData.priceHourly);
                      }}
                      placeholder="2"
                      disabled={!enabledPrices.hourly}
                      className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all text-sm sm:text-base ${
                        enabledPrices.hourly 
                          ? (touchedFields.priceHourly && fieldValidations.priceHourly === false ? 'border-red-300 bg-red-50' : 'border-[#DDDDDD]')
                          : 'border-[#DDDDDD] bg-slate-50 cursor-not-allowed'
                      }`}
                    />
                    <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[#717171] font-medium text-sm">€</span>
                  </div>
                  {enabledPrices.hourly && (
                    <ValidationMessage 
                      isValid={fieldValidations.priceHourly} 
                      message={fieldValidations.priceHourly ? 'Prix valide' : 'Veuillez entrer un prix valide'}
                      touched={touchedFields.priceHourly}
                    />
                  )}
                </div>
              </div>

              {/* Prix par jour */}
              <div className={`flex items-start sm:items-center gap-2 sm:gap-4 p-2.5 sm:p-4 border rounded-lg transition-colors ${
                enabledPrices.daily 
                  ? 'border-[#DDDDDD] hover:border-[#2D5016]' 
                  : 'border-[#DDDDDD] bg-slate-50 opacity-60'
              }`}>
                <input
                  type="checkbox"
                  checked={enabledPrices.daily}
                  onChange={(e) => {
                    setEnabledPrices(prev => ({ ...prev, daily: e.target.checked }));
                    if (e.target.checked) {
                      // Si on coche et que le champ est vide, mettre une valeur par défaut
                      if (!formData.priceDaily || formData.priceDaily.trim() === '') {
                        updateFormData('priceDaily', '10');
                      }
                    } else {
                      updateFormData('priceDaily', '');
                    }
                  }}
                  className="w-5 h-5 text-[#2D5016] border-[#DDDDDD] rounded focus:ring-[#2D5016] cursor-pointer mt-0.5 sm:mt-0 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <label className={`block text-[11px] sm:text-sm font-semibold mb-1 sm:mb-2 flex items-center ${
                    enabledPrices.daily ? 'text-[#222222]' : 'text-slate-400'
                  }`}>
                    Prix par jour
                    <Tooltip content="Le prix journalier est le tarif de base. Les options hebdomadaires/mensuelles avec réduction génèrent plus de réservations." />
                  </label>
                  <div className="relative">
                    <input
                      ref={priceDailyRef}
                      type="number"
                      step="1"
                      value={formData.priceDaily}
                      onChange={(e) => updateFormData('priceDaily', e.target.value)}
                      onBlur={() => {
                        setTouchedFields(prev => ({ ...prev, priceDaily: true }));
                        if (formData.priceDaily) validateField('priceDaily', formData.priceDaily);
                      }}
                      placeholder="10"
                      disabled={!enabledPrices.daily}
                      className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all text-sm sm:text-base ${
                        enabledPrices.daily 
                          ? (touchedFields.priceDaily && fieldValidations.priceDaily === false ? 'border-red-300 bg-red-50' : 'border-[#DDDDDD]')
                          : 'border-[#DDDDDD] bg-slate-50 cursor-not-allowed'
                      }`}
                    />
                    <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[#717171] font-medium text-sm">€</span>
                  </div>
                  {enabledPrices.daily && (
                    <ValidationMessage 
                      isValid={fieldValidations.priceDaily} 
                      message={fieldValidations.priceDaily ? 'Prix valide' : 'Veuillez entrer un prix valide'}
                      touched={touchedFields.priceDaily}
                    />
                  )}
                </div>
              </div>

              {/* Prix par semaine */}
              <div className={`flex items-start sm:items-center gap-2 sm:gap-4 p-2.5 sm:p-4 border rounded-lg transition-colors ${
                enabledPrices.weekly 
                  ? 'border-[#DDDDDD] hover:border-[#2D5016]' 
                  : 'border-[#DDDDDD] bg-slate-50 opacity-60'
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
                  className="w-5 h-5 text-[#2D5016] border-[#DDDDDD] rounded focus:ring-[#2D5016] cursor-pointer mt-0.5 sm:mt-0 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <label className={`block text-[11px] sm:text-sm font-semibold mb-1 sm:mb-2 flex items-center ${
                    enabledPrices.weekly ? 'text-[#222222]' : 'text-slate-400'
                  }`}>
                    Prix par semaine
                    <Tooltip content="Offrir une réduction hebdomadaire (ex: 10% de réduction) attire les réservations longue durée." />
                  </label>
                  <div className="relative">
                    <input
                      ref={priceWeeklyRef}
                      type="number"
                      step="1"
                      value={formData.priceWeekly}
                      onChange={(e) => updateFormData('priceWeekly', e.target.value)}
                      onBlur={() => {
                        setTouchedFields(prev => ({ ...prev, priceWeekly: true }));
                        if (formData.priceWeekly) validateField('priceWeekly', formData.priceWeekly);
                      }}
                      placeholder="80"
                      disabled={!enabledPrices.weekly}
                      className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all text-sm sm:text-base ${
                        enabledPrices.weekly 
                          ? (touchedFields.priceWeekly && fieldValidations.priceWeekly === false ? 'border-red-300 bg-red-50' : 'border-[#DDDDDD]')
                          : 'border-[#DDDDDD] bg-slate-50 cursor-not-allowed'
                      }`}
                    />
                    <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[#717171] font-medium text-sm">€</span>
                  </div>
                </div>
              </div>

              {/* Prix par mois */}
              <div className={`flex items-start sm:items-center gap-2 sm:gap-4 p-2.5 sm:p-4 border rounded-lg transition-colors ${
                enabledPrices.monthly 
                  ? 'border-[#DDDDDD] hover:border-[#2D5016]' 
                  : 'border-[#DDDDDD] bg-slate-50 opacity-60'
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
                  className="w-5 h-5 text-[#2D5016] border-[#DDDDDD] rounded focus:ring-[#2D5016] cursor-pointer mt-0.5 sm:mt-0 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <label className={`block text-[11px] sm:text-sm font-semibold mb-1 sm:mb-2 flex items-center ${
                    enabledPrices.monthly ? 'text-[#222222]' : 'text-slate-400'
                  }`}>
                    Prix par mois
                    <Tooltip content="Le prix mensuel est essentiel. Les locataires recherchent souvent des options mensuelles pour économiser." />
                  </label>
                  <div className="relative">
                    <input
                      ref={priceMonthlyRef}
                      type="number"
                      step="1"
                      value={formData.priceMonthly}
                      onChange={(e) => updateFormData('priceMonthly', e.target.value)}
                      onBlur={() => {
                        setTouchedFields(prev => ({ ...prev, priceMonthly: true }));
                        if (formData.priceMonthly) validateField('priceMonthly', formData.priceMonthly);
                      }}
                      placeholder="280"
                      disabled={!enabledPrices.monthly}
                      className={`w-full px-2.5 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all text-sm sm:text-base ${
                        enabledPrices.monthly 
                          ? (touchedFields.priceMonthly && fieldValidations.priceMonthly === false ? 'border-red-300 bg-red-50' : 'border-[#DDDDDD]')
                          : 'border-[#DDDDDD] bg-slate-50 cursor-not-allowed'
                      }`}
                    />
                    <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[#717171] font-medium text-sm">€</span>
                  </div>
                  {enabledPrices.monthly && (
                    <ValidationMessage 
                      isValid={fieldValidations.priceMonthly} 
                      message={fieldValidations.priceMonthly ? 'Prix valide' : 'Veuillez entrer un prix valide'}
                      touched={touchedFields.priceMonthly}
                    />
                  )}
                </div>
              </div>

              {/* Caution */}
              <div className="mt-4 p-4 border border-[#DDDDDD] rounded-lg hover:border-[#2D5016] transition-colors bg-white">
                <label className="block text-sm font-semibold mb-2 flex items-center text-[#222222]">
                  <Shield className="w-4 h-4 mr-2 text-[#2D5016]" />
                  Caution (garantie)
                  <Tooltip content="Montant de la caution qui sera prélevé sur la carte du client lors de la réservation. Cette caution sera gérée via Stripe et peut être utilisée en cas de dommages." />
                </label>
                <div className="relative">
                  <input
                    id="input-deposit-listing"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deposit}
                    onChange={(e) => updateFormData('deposit', e.target.value)}
                    onBlur={() => {
                      setTouchedFields(prev => ({ ...prev, deposit: true }));
                      if (formData.deposit) validateField('deposit', formData.deposit);
                    }}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all ${
                      touchedFields.deposit && fieldValidations.deposit === false ? 'border-red-300 bg-red-50' : 'border-[#DDDDDD]'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#717171] font-medium">€</span>
                </div>
                <p className="text-xs text-[#717171] mt-2">
                  La caution est optionnelle. Si vous ne souhaitez pas en demander une, laissez ce champ vide.
                </p>
                {touchedFields.deposit && (
                  <ValidationMessage 
                    isValid={fieldValidations.deposit} 
                    message={fieldValidations.deposit ? 'Montant valide' : 'Veuillez entrer un montant valide'}
                    touched={touchedFields.deposit}
                  />
                )}
              </div>
            </div>

            {/* Section Durée minimum de location */}
            <div className="mt-8 pt-6 border-t border-[#DDDDDD]">
              <h3 className="text-lg font-semibold text-[#222222] mb-4 flex items-center">
                Durée minimum de location
                <Tooltip content="Définissez la durée minimum requise pour une réservation. Si vous avez activé les prix horaires, vous pouvez définir un minimum en heures. Si vous avez activé les prix journaliers, vous pouvez définir un minimum en jours." />
              </h3>

              <div className="space-y-4">
                {/* Durée minimum en heures - affichée seulement si prix horaire activé */}
                {enabledPrices.hourly && (
                  <div>
                    <label className="block text-sm font-medium text-[#717171] mb-2">
                      Nombre d&apos;heures minimum
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.minHours}
                        onChange={(e) => updateFormData('minHours', e.target.value)}
                        placeholder="0"
                        className="w-32 px-4 py-3 border border-[#DDDDDD] rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all"
                      />
                      <span className="text-sm text-[#717171]">heure(s)</span>
                    </div>
                    <p className="text-xs text-[#717171] mt-2">
                      {formData.minHours && parseInt(formData.minHours) > 0 
                        ? `Les clients devront réserver au moins ${formData.minHours} heure${parseInt(formData.minHours) > 1 ? 's' : ''}.`
                        : 'Aucune durée minimum requise. Les clients peuvent réserver pour 1 heure ou plus.'}
                    </p>
                  </div>
                )}

                {/* Durée minimum en jours - affichée seulement si prix journalier activé */}
                {enabledPrices.daily && (
                  <div>
                    <label className="block text-sm font-medium text-[#717171] mb-2">
                      Nombre de jours minimum
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.minDays}
                        onChange={(e) => updateFormData('minDays', e.target.value)}
                        placeholder="0"
                        className="w-32 px-4 py-3 border border-[#DDDDDD] rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent outline-none transition-all"
                      />
                      <span className="text-sm text-[#717171]">jour(s)</span>
                    </div>
                    <p className="text-xs text-[#717171] mt-2">
                      {formData.minDays && parseInt(formData.minDays) > 0 
                        ? `Les clients devront réserver au moins ${formData.minDays} jour${parseInt(formData.minDays) > 1 ? 's' : ''} consécutif${parseInt(formData.minDays) > 1 ? 's' : ''}.`
                        : 'Aucune durée minimum requise. Les clients peuvent réserver pour 1 jour ou plus.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section Politique d'annulation */}
            <div className="mt-8 pt-6 border-t border-[#DDDDDD]">
              <h3 className="text-lg font-semibold text-[#222222] mb-4 flex items-center">
                Politique d&apos;annulation
                <Tooltip content="Définissez vos conditions d'annulation. Plus c'est flexible, plus vous attirerez de réservations, mais vous risquez plus d'annulations de dernière minute." />
              </h3>

              <div className="space-y-3">
                {/* Option : FLEXIBLE - Annulation gratuite jusqu'à 24h avant */}
                <div className={`flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer ${
                  formData.cancellationPolicy === 'FLEXIBLE'
                    ? 'border-[#2D5016] bg-[#2D5016]/5'
                    : 'border-[#DDDDDD] hover:border-[#2D5016]/50'
                }`} onClick={() => {
                  updateFormData('cancellationPolicy', 'FLEXIBLE');
                  updateFormData('cancellationDeadlineDays', '1');
                }}>
                  <input
                    type="radio"
                    name="cancellationPolicy"
                    value="FLEXIBLE"
                    checked={formData.cancellationPolicy === 'FLEXIBLE'}
                    onChange={(e) => {
                      updateFormData('cancellationPolicy', e.target.value as 'FLEXIBLE' | 'MODERATE' | 'STRICT');
                      updateFormData('cancellationDeadlineDays', '1');
                    }}
                    className="w-5 h-5 text-[#2D5016] border-[#DDDDDD] focus:ring-[#2D5016] cursor-pointer"
                  />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-1 text-[#222222] cursor-pointer">
                      Flexible - Annulation gratuite jusqu&apos;à 24h avant
                    </label>
                    <p className="text-xs text-[#717171]">
                      Les clients peuvent annuler leur réservation sans frais jusqu&apos;à 24h avant le début de la location
                    </p>
                  </div>
                  <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                </div>

                {/* Option : MODERATE - Annulation gratuite jusqu'à 5 jours avant */}
                <div className={`flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer ${
                  formData.cancellationPolicy === 'MODERATE'
                    ? 'border-[#2D5016] bg-[#2D5016]/5'
                    : 'border-[#DDDDDD] hover:border-[#2D5016]/50'
                }`} onClick={() => {
                  updateFormData('cancellationPolicy', 'MODERATE');
                  updateFormData('cancellationDeadlineDays', '5');
                }}>
                  <input
                    type="radio"
                    name="cancellationPolicy"
                    value="MODERATE"
                    checked={formData.cancellationPolicy === 'MODERATE'}
                    onChange={(e) => {
                      updateFormData('cancellationPolicy', e.target.value as 'FLEXIBLE' | 'MODERATE' | 'STRICT');
                      updateFormData('cancellationDeadlineDays', '5');
                    }}
                    className="w-5 h-5 text-[#2D5016] border-[#DDDDDD] focus:ring-[#2D5016] cursor-pointer"
                  />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-1 text-[#222222] cursor-pointer">
                      Modérée - Annulation gratuite jusqu&apos;à 5 jours avant
                    </label>
                    <p className="text-xs text-[#717171]">
                      Les clients peuvent annuler leur réservation sans frais jusqu&apos;à 5 jours avant le début de la location
                    </p>
                  </div>
                  <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                </div>

                {/* Option : STRICT - Annulation gratuite jusqu'à 14 jours avant */}
                <div className={`flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer ${
                  formData.cancellationPolicy === 'STRICT'
                    ? 'border-[#2D5016] bg-[#2D5016]/5'
                    : 'border-[#DDDDDD] hover:border-[#2D5016]/50'
                }`} onClick={() => {
                  updateFormData('cancellationPolicy', 'STRICT');
                  updateFormData('cancellationDeadlineDays', '14');
                }}>
                  <input
                    type="radio"
                    name="cancellationPolicy"
                    value="STRICT"
                    checked={formData.cancellationPolicy === 'STRICT'}
                    onChange={(e) => {
                      updateFormData('cancellationPolicy', e.target.value as 'FLEXIBLE' | 'MODERATE' | 'STRICT');
                      updateFormData('cancellationDeadlineDays', '14');
                    }}
                    className="w-5 h-5 text-[#2D5016] border-[#DDDDDD] focus:ring-[#2D5016] cursor-pointer"
                  />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-1 text-[#222222] cursor-pointer">
                      Stricte - Annulation gratuite jusqu&apos;à 14 jours avant
                    </label>
                    <p className="text-xs text-[#717171]">
                      Les clients peuvent annuler leur réservation sans frais jusqu&apos;à 14 jours avant le début de la location
                    </p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Section Réservation instantanée */}
            <div className="mt-8 pt-6 border-t border-[#DDDDDD]">
              <h3 className="text-lg font-semibold text-[#222222] mb-4 flex items-center">
                Réservation instantanée
                <Tooltip content="Si activée, les réservations sont automatiquement confirmées. Sinon, vous devrez approuver chaque demande manuellement." />
              </h3>

              <div className="space-y-3">
                {/* Option : Réservation instantanée activée */}
                <div className={`flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer ${
                  formData.instantBooking === true
                    ? 'border-[#2D5016] bg-[#2D5016]/5'
                    : 'border-[#DDDDDD] hover:border-[#2D5016]/50'
                }`} onClick={() => {
                  updateFormData('instantBooking', true);
                }}>
                  <input
                    id="radio-instant-booking-true-listing"
                    type="radio"
                    name="instantBooking"
                    value="true"
                    checked={formData.instantBooking === true}
                    onChange={() => updateFormData('instantBooking', true)}
                    className="w-5 h-5 text-[#2D5016] border-[#DDDDDD] focus:ring-[#2D5016] cursor-pointer"
                  />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-1 text-[#222222] cursor-pointer">
                      Réservation instantanée activée
                    </label>
                    <p className="text-xs text-[#717171]">
                      Les réservations sont automatiquement confirmées sans votre validation préalable
                    </p>
                  </div>
                  <Zap className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                </div>

                {/* Option : Réservation avec approbation */}
                <div className={`flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer ${
                  formData.instantBooking === false
                    ? 'border-[#2D5016] bg-[#2D5016]/5'
                    : 'border-[#DDDDDD] hover:border-[#2D5016]/50'
                }`} onClick={() => {
                  updateFormData('instantBooking', false);
                }}>
                  <input
                    id="radio-instant-booking-false-listing"
                    type="radio"
                    name="instantBooking"
                    value="false"
                    checked={formData.instantBooking === false}
                    onChange={() => updateFormData('instantBooking', false)}
                    className="w-5 h-5 text-[#2D5016] border-[#DDDDDD] focus:ring-[#2D5016] cursor-pointer"
                  />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-1 text-[#222222] cursor-pointer">
                      Réservation avec approbation
                    </label>
                    <p className="text-xs text-[#717171]">
                      Vous devez approuver chaque demande de réservation avant qu'elle ne soit confirmée
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                </div>
              </div>
            </div>

            <div className="bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-lg p-4 mt-6">
              <p className="text-sm text-[#222222]">
                <strong>💡 Conseil :</strong> Les prix incluant des options hebdomadaires et mensuelles attractives génèrent plus de réservations longue durée.
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#222222] mb-2 sm:mb-3">{currentStepData.mainTitle}</h2>
              <p className="text-sm sm:text-base md:text-lg text-[#717171] mb-3 sm:mb-4">{currentStepData.subtitle}</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 max-w-md mx-auto">
                <p className="text-xs sm:text-sm text-emerald-900">
                  <strong>📅 Astuce :</strong> Les hôtes qui mettent une disponibilité régulière reçoivent 30% plus de réservations.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                {/* Date de début avec calendrier personnalisé */}
                <div className="relative">
                  <label className="block text-[11px] sm:text-xs md:text-sm font-semibold text-[#222222] mb-1 sm:mb-2 flex items-center">
                    Date de début *
                    <Tooltip content="La date à partir de laquelle votre espace sera disponible à la location." />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStartDatePicker(!showStartDatePicker);
                      setShowEndDatePicker(false);
                    }}
                    className="w-full px-2.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#DDDDDD] rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#2D5016] focus:border-[#2D5016] outline-none bg-white hover:border-[#2D5016] transition-all flex items-center justify-between shadow-sm hover:shadow-md cursor-pointer touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0"
                  >
                    <span className={formData.currentDateRange.start ? 'text-[#222222] font-medium' : 'text-[#717171]'}>
                      {formData.currentDateRange.start 
                        ? new Date(formData.currentDateRange.start).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : 'Sélectionner une date'}
                    </span>
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#2D5016] flex-shrink-0" />
                  </button>
                  
                  {showStartDatePicker && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowStartDatePicker(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 sm:mt-2 z-50 bg-white rounded-lg sm:rounded-2xl shadow-2xl border border-slate-200 p-3 sm:p-6 w-[calc(100vw-1rem)] sm:w-[360px] max-w-[360px] animate-in fade-in zoom-in-95 duration-200">
                        <DatePickerCalendar
                          selectedDate={formData.currentDateRange.start ? new Date(formData.currentDateRange.start) : null}
                          onSelectDate={(date) => {
                            updateFormData('currentDateRange', { ...formData.currentDateRange, start: date.toISOString().split('T')[0] });
                            setShowStartDatePicker(false);
                          }}
                          onClearDate={() => {
                            updateFormData('currentDateRange', { ...formData.currentDateRange, start: '' });
                            setShowStartDatePicker(false);
                          }}
                          minDate={new Date()}
                          currentMonth={calendarMonth}
                          onMonthChange={setCalendarMonth}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Date de fin avec calendrier personnalisé */}
                <div className="relative">
                  <label className="block text-[11px] sm:text-xs md:text-sm font-semibold text-[#222222] mb-1 sm:mb-2 flex items-center">
                    Date de fin *
                    <Tooltip content="La date jusqu&apos;à laquelle votre espace sera disponible. Vous pouvez ajouter plusieurs périodes." />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEndDatePicker(!showEndDatePicker);
                      setShowStartDatePicker(false);
                    }}
                    disabled={!formData.currentDateRange.start}
                    className={`w-full px-2.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#2D5016] focus:border-[#2D5016] outline-none transition-all flex items-center justify-between shadow-sm touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0 ${
                      !formData.currentDateRange.start
                        ? 'border-[#DDDDDD] bg-slate-50 cursor-not-allowed'
                        : 'border-[#DDDDDD] bg-white hover:border-[#2D5016] hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <span className={formData.currentDateRange.end ? 'text-[#222222] font-medium' : 'text-[#717171]'}>
                      {formData.currentDateRange.end 
                        ? new Date(formData.currentDateRange.end).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : 'Sélectionner une date'}
                    </span>
                    <Calendar className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${!formData.currentDateRange.start ? 'text-[#717171]' : 'text-[#2D5016]'}`} />
                  </button>
                  
                  {showEndDatePicker && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowEndDatePicker(false)}
                      />
                      <div className="absolute top-full right-0 sm:right-0 left-0 sm:left-auto mt-1 sm:mt-2 z-50 bg-white rounded-lg sm:rounded-2xl shadow-2xl border border-slate-200 p-3 sm:p-6 w-[calc(100vw-1rem)] sm:w-[360px] max-w-[360px] animate-in fade-in zoom-in-95 duration-200">
                        <DatePickerCalendar
                          selectedDate={formData.currentDateRange.end ? new Date(formData.currentDateRange.end) : null}
                          onSelectDate={(date) => {
                            updateFormData('currentDateRange', { ...formData.currentDateRange, end: date.toISOString().split('T')[0] });
                            setShowEndDatePicker(false);
                          }}
                          onClearDate={() => {
                            updateFormData('currentDateRange', { ...formData.currentDateRange, end: '' });
                            setShowEndDatePicker(false);
                          }}
                          minDate={formData.currentDateRange.start ? new Date(formData.currentDateRange.start) : new Date()}
                          currentMonth={calendarMonth}
                          onMonthChange={setCalendarMonth}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={addDateRange}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base bg-[#2D5016] hover:bg-[#233e11] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 transform hover:scale-102 cursor-pointer touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0"
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span>Ajouter cette période</span>
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-red-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}

              {formData.availableDates.length > 0 && (
                <div className="space-y-2 mt-6">
                  <h3 className="text-sm font-semibold text-[#222222] mb-2">Périodes ajoutées :</h3>
                  {formData.availableDates.map((range, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-[#DDDDDD] animate-in slide-in-from-left-2 duration-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#717171]" />
                        <span className="text-sm text-[#222222]">
                          {new Date(range.start).toLocaleDateString('fr-FR')} - {new Date(range.end).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDateRange(idx)}
                        className="text-red-500 hover:text-red-700 transition-colors transform hover:scale-110 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 7:
        const getTypeLabel = () => {
          if (spaceType === 'parking') return 'Parking';
          if (spaceType === 'storage') return 'Box de stockage';
          return 'Cave et Divers';
        };

        return (
          <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#2D5016]/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-in zoom-in duration-500">
                <Check className="w-6 h-6 sm:w-8 sm:h-8 text-[#2D5016]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#222222] mb-2 sm:mb-3">{currentStepData.mainTitle}</h2>
              <p className="text-sm sm:text-base text-[#717171]">{currentStepData.subtitle}</p>
            </div>

            <div className="bg-white border border-[#DDDDDD] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
              {/* Bloc titre + adresse */}
              <div className="p-4 sm:p-6 border-b border-[#DDDDDD]">
                <div className="flex items-start gap-3 sm:gap-4">
                  {formData.imagePreviews.length > 0 ? (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      <Image 
                        src={formData.imagePreviews[0]} 
                        alt="Preview" 
                        width={96} 
                        height={96} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-[#717171]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-[#2D5016]/10 text-[#2D5016] text-xs font-semibold rounded-full">
                        {getTypeLabel()}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-[#222222] mb-1 truncate">
                      {formData.title || 'Titre de l\'annonce'}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#717171] truncate">
                      {formData.address}, {formData.city} {formData.zipCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sections Caractéristiques (groupées comme à la création) */}
              {Object.keys(formData.characteristics).length > 0 && RECAP_SECTIONS.filter(section => 
                section.keys.some(key => formData.characteristics[key] && String(formData.characteristics[key]).trim() !== '')
              ).map((section) => {
                const entries = section.keys
                  .filter(key => formData.characteristics[key] && String(formData.characteristics[key]).trim() !== '')
                  .map(key => {
                    const value = formData.characteristics[key];
                    const mapping = CHARACTERISTIC_MAPPING[key];
                    const label = mapping?.label || translateCharacteristicName(key);
                    let displayValue = value;
                    if (key === 'LENGTH' || key === 'WIDTH' || key === 'MAX_HEIGHT') displayValue = `${value}m`;
                    else if (key === 'SURFACE') displayValue = `${value}m²`;
                    else if (key === 'VOLUME') displayValue = `${value}m³`;
                    return { key, label, displayValue };
                  });
                if (entries.length === 0) return null;
                return (
                  <div key={section.title} className="p-4 sm:p-6 border-b border-[#DDDDDD] last:border-b-0">
                    <h4 className="text-sm font-semibold text-[#222222] mb-3">{section.title}</h4>
                    <div className="space-y-1.5 sm:space-y-2 w-full">
                      {entries.map(({ key, label, displayValue }) => (
                        <div key={key} className="flex justify-between items-center gap-3 w-full text-xs sm:text-sm text-[#222222]">
                          <span className="font-medium text-[#717171] flex-shrink-0">{label}:</span>
                          <span className="text-[#222222] text-right break-words min-w-0">{displayValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Caractéristiques non regroupées (hors RECAP_SECTIONS) */}
              {(() => {
                const sectionKeys = RECAP_SECTION_ALL_KEYS;
                const otherEntries = Object.entries(formData.characteristics).filter(
                  ([key, value]) => value && String(value).trim() !== '' && !sectionKeys.has(key)
                );
                if (otherEntries.length === 0) return null;
                return (
                  <div className="p-4 sm:p-6 border-b border-[#DDDDDD]">
                    <h4 className="text-sm font-semibold text-[#222222] mb-3">Autres</h4>
                    <div className="space-y-1.5 sm:space-y-2 w-full">
                      {otherEntries.map(([key, value]) => {
                        const mapping = CHARACTERISTIC_MAPPING[key];
                        const label = mapping?.label || translateCharacteristicName(key);
                        let displayValue = value;
                        if (key === 'LENGTH' || key === 'WIDTH' || key === 'MAX_HEIGHT') displayValue = `${value}m`;
                        else if (key === 'SURFACE') displayValue = `${value}m²`;
                        else if (key === 'VOLUME') displayValue = `${value}m³`;
                        return (
                          <div key={key} className="flex justify-between items-center gap-3 w-full text-xs sm:text-sm text-[#222222]">
                            <span className="font-medium text-[#717171] flex-shrink-0">{label}:</span>
                            <span className="text-[#222222] text-right break-words min-w-0">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Section Tarifs */}
              {(enabledPrices.hourly && formData.priceHourly) || (enabledPrices.daily && formData.priceDaily) || (enabledPrices.weekly && formData.priceWeekly) || (enabledPrices.monthly && formData.priceMonthly) ? (
                <div className="p-4 sm:p-6 border-b border-[#DDDDDD]">
                  <h4 className="text-sm font-semibold text-[#222222] mb-3">Tarifs</h4>
                  <div className="space-y-2">
                    {enabledPrices.hourly && formData.priceHourly && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-[#717171]">Prix à l&apos;heure</span>
                        <span className="text-base sm:text-lg font-semibold text-[#222222]">{formData.priceHourly}€</span>
                      </div>
                    )}
                    {enabledPrices.daily && formData.priceDaily && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-[#717171]">Prix par jour</span>
                        <span className="text-base sm:text-lg font-semibold text-[#222222]">{formData.priceDaily}€</span>
                      </div>
                    )}
                    {enabledPrices.weekly && formData.priceWeekly && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-[#717171]">Prix par semaine</span>
                        <span className="text-base sm:text-lg font-semibold text-[#222222]">{formData.priceWeekly}€</span>
                      </div>
                    )}
                    {enabledPrices.monthly && formData.priceMonthly && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-[#717171]">Prix par mois</span>
                        <span className="text-base sm:text-lg font-semibold text-[#222222]">{formData.priceMonthly}€</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Section Équipements */}
              {formData.features.length > 0 && (
                <div className="p-4 sm:p-6 border-b border-[#DDDDDD]">
                  <h4 className="text-sm font-semibold text-[#222222] mb-3">Équipements</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-[#222222] text-xs rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Disponibilités */}
              {formData.availableDates.length > 0 && (
                <div className="p-4 sm:p-6">
                  <h4 className="text-sm font-semibold text-[#222222] mb-3">Disponibilités</h4>
                  <div className="space-y-1">
                    {formData.availableDates.map((range, idx) => (
                      <p key={idx} className="text-sm text-[#717171]">
                        {new Date(range.start).toLocaleDateString('fr-FR')} - {new Date(range.end).toLocaleDateString('fr-FR')}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback si aucune caractéristique */}
              {Object.keys(formData.characteristics).length === 0 && !formData.features.length && !formData.availableDates.length && (
                <div className="p-4 sm:p-6">
                  <p className="text-xs sm:text-sm text-[#717171]">
                    {(() => {
                      const length = formData.length || '';
                      const width = formData.width || '';
                      const height = noHeightLimit ? 'Sans limite' : (formData.height || '');
                      const lengthDisplay = length ? `${length}m` : '—';
                      const widthDisplay = width ? `${width}m` : '—';
                      const heightDisplay = height === 'Sans limite' ? 'Sans limite' : (height ? `${height}m` : '—');
                      return `Dimensions : ${lengthDisplay} × ${widthDisplay} × ${heightDisplay}`;
                    })()}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-900">
                <strong>📢 Votre annonce sera visible</strong> par des milliers d&apos;utilisateurs dès sa publication. Vous recevrez des notifications pour chaque demande de réservation.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <HeaderNavigation />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-1 sm:py-3 md:py-4 pb-20 md:pb-8 mobile-page-main overflow-x-hidden pt-0 md:pt-[max(calc(env(safe-area-inset-top)+5rem),5rem)]" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        {/* Affichage global des erreurs - Mobile: Compact */}
        {error && (
          <div className="mb-2 sm:mb-3 bg-red-50 border-l-4 border-red-500 rounded-lg p-2 sm:p-3 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold text-red-800 mb-1">Erreur lors de la création</h3>
                <p className="text-xs sm:text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 active:text-red-900 transition-colors touch-manipulation active:scale-95 flex-shrink-0"
                aria-label="Fermer l'erreur"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Barre de progression améliorée - Mobile: Compact */}
        <div className="mb-1 sm:mb-3 md:mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-0.5 sm:gap-2 mb-0.5 sm:mb-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[9px] sm:text-xs font-medium text-[#717171]">Étape {currentStep}/{STEPS.length}</span>
              {isSaving && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[#717171]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="hidden sm:inline">Sauvegarde...</span>
                </div>
              )}
              {showSaveSuccess && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-green-600 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Sauvegardé</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Barre de progression animée */}
          <div className="max-w-4xl mx-auto">
            <div className="h-2 bg-[#DDDDDD] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#2D5016] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Étapes visuelles */}
          <div className="flex items-center justify-between max-w-4xl mx-auto mt-0.5 sm:mt-3 overflow-x-auto pb-0.5 sm:pb-0 px-0 sm:px-4">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStep > step.id;
              const isClickable = isCompleted; // Seules les étapes complétées sont cliquables
              
              return (
              <React.Fragment key={step.id}>
                <div 
                  className={`flex flex-col items-center flex-shrink-0 px-0.5 sm:px-2 py-0.5 ${
                    isClickable ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  onClick={() => {
                    if (isClickable) {
                      setCurrentStep(step.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  title={isClickable ? `Revenir à l'étape ${step.id}: ${step.title}` : undefined}
                >
                  <div className={`
                    w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-[10px] sm:text-sm transition-all duration-300 transform
                    ${currentStep >= step.id 
                      ? 'bg-[#2D5016] text-white shadow-lg scale-105' 
                      : 'bg-[#DDDDDD] text-[#717171]'
                    }
                    ${isClickable ? 'hover:scale-110 hover:shadow-xl' : ''}
                  `}>
                    {currentStep > step.id ? (
                      <Check className="w-3 h-3 sm:w-5 sm:h-5 animate-in zoom-in duration-200" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={`text-[8px] sm:text-xs mt-0.5 sm:mt-2 text-center hidden lg:block transition-colors ${
                    currentStep >= step.id ? 'text-[#222222] font-medium' : 'text-[#717171]'
                  } ${isClickable ? 'hover:text-[#2D5016]' : ''}`}>
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 sm:h-1 mx-0.5 sm:mx-2 rounded transition-all duration-500 min-w-[8px] sm:min-w-0 ${
                    currentStep > step.id ? 'bg-[#2D5016]' : 'bg-[#DDDDDD]'
                  }`} />
                )}
              </React.Fragment>
            );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[250px] sm:min-h-[350px] py-1 sm:py-4">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons - Mobile: Compact */}
        <div className="flex justify-between items-center max-w-2xl mx-auto pt-2 sm:pt-3 md:pt-4 border-t border-[#DDDDDD] gap-2 sm:gap-3 md:gap-0 pb-16 sm:pb-0">
          <button
            id="btn-prev-step-listing"
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`
              flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2.5 sm:px-4 md:px-6 py-2.5 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base rounded-lg font-semibold transition-all transform touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0
              ${currentStep === 1
                ? 'text-[#717171] cursor-not-allowed opacity-50'
                : 'text-[#222222] hover:bg-[#F7F7F7] active:bg-[#E5E5E5] hover:scale-105 cursor-pointer'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Précédent</span>
            <span className="sm:hidden">Préc.</span>
          </button>

          {currentStep < STEPS.length ? (
            <button
              id="btn-next-step-listing"
              type="button"
              onClick={nextStep}
              disabled={!canProceed()}
              className={`
                flex items-center gap-1 sm:gap-1.5 md:gap-2 px-3.5 sm:px-5 md:px-6 lg:px-8 py-2.5 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base rounded-lg font-semibold transition-all transform touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0
                ${canProceed()
                  ? 'bg-[#2D5016] hover:bg-[#233e11] active:bg-[#1a3009] text-white shadow-lg hover:scale-105 cursor-pointer'
                  : 'bg-[#DDDDDD] text-[#717171] cursor-not-allowed opacity-50'
                }
              `}
            >
              <span className="hidden sm:inline">Suivant</span>
              <span className="sm:hidden">Suiv.</span>
              <ChevronRight className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>
          ) : (
            <button
              id="btn-publish-listing"
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-3.5 sm:px-5 md:px-6 lg:px-8 py-2.5 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-[#2D5016] to-[#43a047] hover:from-[#233e11] hover:to-[#2e7d32] active:from-[#1a3009] active:to-[#1e5a22] text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transform hover:scale-105 active:scale-95 touch-manipulation min-h-[44px] sm:min-h-0"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publication...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Publier l&apos;annonce</span>
                  <span className="sm:hidden">Publier</span>
                </>
              )}
            </button>
          )}
        </div>
      </main>

      {/* Support contextualisé en bas - Mobile: Compact */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#DDDDDD] shadow-lg z-40 hidden sm:block">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 md:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[#2D5016] flex-shrink-0" />
              <span className="text-xs sm:text-sm md:text-base font-medium text-[#222222]">Besoin d&apos;aide ?</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-4">
              <a 
                href="/help" 
                className="flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[10px] sm:text-xs md:text-sm text-[#717171] hover:text-[#2D5016] active:text-[#1a3009] transition-colors touch-manipulation"
              >
                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Centre d&apos;aide</span>
                <span className="sm:hidden">Aide</span>
              </a>
              <a 
                href="/help?section=hosts" 
                className="flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[10px] sm:text-xs md:text-sm text-[#717171] hover:text-[#2D5016] active:text-[#1a3009] transition-colors touch-manipulation"
              >
                <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Tutoriel vidéo</span>
                <span className="sm:hidden">Vidéo</span>
              </a>
              <a 
                href="/faq?type=host" 
                className="flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[10px] sm:text-xs md:text-sm text-[#717171] hover:text-[#2D5016] active:text-[#1a3009] transition-colors touch-manipulation"
              >
                <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">FAQ Hôtes</span>
                <span className="sm:hidden">FAQ</span>
                <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 hidden sm:block flex-shrink-0" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <FooterNavigation />
      </div>
    </ProtectedRoute>
  );
}
