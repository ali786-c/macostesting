'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isMobileOrCapacitor, isCapacitor, handleCapacitorLinkClick, capacitorNavigate } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import Link from 'next/link';
import Image from 'next/image';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { 
  Plus, 
  Edit, 
  Eye, 
  Trash2, 
  MapPin, 
  Euro, 
  Calendar, 
  Car, 
  Box, 
  Warehouse,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  Clock
} from 'lucide-react';
import { rentoallUsersAPI, placesAPI, PlaceDTO, reservationsAPI, ReservationDTO } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { epureAddress, capitalizeFirstPerLine, getValidPhoto } from '@/lib/utils';

export default function MyPlacesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [places, setPlaces] = useState<PlaceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [placeToDelete, setPlaceToDelete] = useState<PlaceDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingReservationsByPlace, setPendingReservationsByPlace] = useState<Map<number, number>>(new Map());

  // Vérifier le mode utilisateur - bloquer l'accès si pas en mode hôte
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userMode = localStorage.getItem('userMode');
      if (userMode !== 'host') {
        // Mobile : pas de homepage — redirection directe vers search
        const target = isMobileOrCapacitor() ? '/search-parkings' : '/home';
        router.push(target);
      }
    }
  }, [router]);

  // Fonction pour charger les annonces depuis le backend
  const loadPlaces = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('Vous devez être connecté');
        setIsLoading(false);
        return;
      }

      const userIdNum = parseInt(userId, 10);
      console.log('🔵 [MY PLACES] Chargement des annonces pour l\'utilisateur:', userIdNum);

      // Appel au backend réel : GET /api/users/{userId}/places
      const placesData = await rentoallUsersAPI.getMyPlaces(userIdNum);
      console.log('✅ [MY PLACES] Annonces récupérées depuis le backend:', placesData);

      // Trier par ID (ordre croissant)
      const sortedPlaces = [...placesData].sort((a, b) => a.id - b.id);
      setPlaces(sortedPlaces);

      // Charger les réservations en attente pour chaque bien
      try {
        const pendingReservations = await reservationsAPI.getPendingReservationsForOwner(userIdNum);
        console.log('✅ [MY PLACES] Réservations en attente récupérées:', pendingReservations);
        
        // Compter les réservations en attente par bien
        const countByPlace = new Map<number, number>();
        pendingReservations.forEach(reservation => {
          const placeId = reservation.placeId;
          if (placeId) {
            const currentCount = countByPlace.get(placeId) || 0;
            countByPlace.set(placeId, currentCount + 1);
          }
        });
        setPendingReservationsByPlace(countByPlace);
      } catch (err) {
        console.error('❌ [MY PLACES] Erreur lors du chargement des réservations en attente:', err);
        // Ne pas bloquer l'affichage si les réservations ne peuvent pas être chargées
      }
    } catch (err) {
      console.error('❌ [MY PLACES] Erreur lors du chargement:', err);
      setError('Erreur lors du chargement de vos annonces');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les annonces au montage
  useEffect(() => {
    loadPlaces();
  }, []);

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

  // Gérer la suppression d'une annonce
  const handleDeleteClick = (place: PlaceDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaceToDelete(place);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!placeToDelete) return;

    try {
      setIsDeleting(true);
      await placesAPI.delete(placeToDelete.id);
      console.log('✅ [MY PLACES] Annonce supprimée avec succès');
      
      // Recharger la liste des annonces
      await loadPlaces();
      
      // Fermer la modal
      setShowDeleteModal(false);
      setPlaceToDelete(null);
    } catch (err) {
      console.error('❌ [MY PLACES] Erreur lors de la suppression:', err);
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Erreur lors de la suppression de l\'annonce');
      setShowDeleteModal(false);
      setPlaceToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setPlaceToDelete(null);
  };

  // Filtrer les annonces
  const filteredPlaces = places.filter(place => {
    const matchesSearch = searchQuery === '' || 
      place.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (place.description && place.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterActive === null || place.active === filterActive;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <HeaderNavigation />
        <main className="flex-1 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Chargement de vos annonces...</p>
            </div>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <HeaderNavigation />
      
      <main className="flex-1 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+1rem))] md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Header - mobile: marges réduites pour remonter le bloc */}
          <div className="mb-3 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">{t('host.manageMyListings')}</h1>
                <p className="text-sm sm:text-base text-slate-600">
                  {filteredPlaces.length} annonce{filteredPlaces.length > 1 ? 's' : ''}
                </p>
              </div>
              <Link
                href="/host/create"
                prefetch={false}
                onClick={(e) => handleCapacitorLinkClick(e, '/host/create', router)}
                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Nouvelle annonce</span>
              </Link>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par ville, adresse ou description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterActive(null)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 transition-all text-xs sm:text-sm font-medium ${
                    filterActive === null
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilterActive(true)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 transition-all text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 ${
                    filterActive === true
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Actives</span>
                  <span className="sm:hidden">Act.</span>
                </button>
                <button
                  onClick={() => setFilterActive(false)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 transition-all text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 ${
                    filterActive === false
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Inactives</span>
                  <span className="sm:hidden">Inact.</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Places List */}
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <Box className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {places.length === 0 ? 'Aucune annonce' : 'Aucune annonce trouvée'}
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {places.length === 0
                  ? 'Commencez par créer votre première annonce pour la mettre en ligne.'
                  : 'Essayez de modifier vos filtres pour voir plus de résultats.'}
              </p>
              {places.length === 0 && (
                <Link
                  href="/host/create"
                  prefetch={false}
                  onClick={(e) => handleCapacitorLinkClick(e, '/host/create', router)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Créer ma première annonce
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Table Header */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200">
                <div className="col-span-3 text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">Annonce</div>
                <div className="col-span-2 text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">Type</div>
                <div className="col-span-2 text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">Localisation</div>
                <div className="col-span-2 text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">Prix</div>
                <div className="col-span-1 text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">Statut</div>
                <div className="col-span-2 text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider text-right">Actions</div>
              </div>

              {/* List Items */}
              <div className="divide-y divide-slate-100">
                {filteredPlaces.map((place) => {
                  const TypeIcon = getTypeIcon(place.type);
                  const typeLabel = getTypeLabel(place.type);
                  const placeImg = getValidPhoto(place?.photos, place?.type);

                  const prices = [];
                  if (place.hourPriceActive === true && place.pricePerHour && Number(place.pricePerHour) > 0) {
                    prices.push({ value: Number(place.pricePerHour).toFixed(2), label: 'h', period: 'heure' });
                  }
                  if (place.dayPriceActive === true && place.pricePerDay && Number(place.pricePerDay) > 0) {
                    prices.push({ value: Number(place.pricePerDay).toFixed(2), label: 'j', period: 'jour' });
                  }
                  if (place.weekPriceActive === true && place.pricePerWeek && Number(place.pricePerWeek) > 0) {
                    prices.push({ value: Number(place.pricePerWeek).toFixed(2), label: 'sem', period: 'semaine' });
                  }
                  if (place.monthPriceActive === true && place.pricePerMonth && Number(place.pricePerMonth) > 0) {
                    prices.push({ value: Number(place.pricePerMonth).toFixed(2), label: 'mois', period: 'mois' });
                  }

                  const editUrl = `/host/my-places/${place.id}/`;
                  return (
                    <div
                      key={place.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, [role="button"], a')) return;
                        if (isCapacitor()) {
                          e.preventDefault();
                          capacitorNavigate(editUrl);
                        } else {
                          handleCapacitorLinkClick(e, editUrl, router);
                        }
                      }}
                      className="sm:grid sm:grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-5 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {/* Mobile: carte compacte en 2 lignes */}
                      <div className="flex flex-col gap-2 sm:hidden">
                        <div className="flex gap-2.5 min-w-0">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                            <Image
                              src={placeImg}
                              alt={typeLabel}
                              fill
                              className="object-cover"
                              unoptimized={Array.isArray(place.photos) && place.photos.length > 0 && place.photos[0]?.startsWith('data:')}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
                              {capitalizeFirstPerLine((place.title && place.title.trim()) || place.description?.split('.')[0] || `${typeLabel} - ${place.city}`)}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
                              <TypeIcon className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              <span className="truncate">{typeLabel}</span>
                              <span>·</span>
                              <span className="truncate">{place.city}</span>
                              {pendingReservationsByPlace.get(place.id) && pendingReservationsByPlace.get(place.id)! > 0 && (
                                <CapacitorDynamicLink
                                  href={`/host/my-places/${place.id}/?tab=pending`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold"
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  {pendingReservationsByPlace.get(place.id)} attente
                                </CapacitorDynamicLink>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {prices.length === 0 ? (
                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                              <Euro className="w-3 h-3" /> N/A
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                              {prices.map((price, idx) => (
                                <span key={idx} className="text-xs font-semibold text-emerald-600 whitespace-nowrap">
                                  {price.value}€/{price.label}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            place.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {place.active ? 'Actif' : 'Inactif'}
                          </span>
                          <div className="flex items-center gap-1.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                            {isCapacitor() ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); capacitorNavigate(`/host/my-places/${place.id}/`); }}
                                className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg touch-manipulation"
                                title="Modifier"
                                aria-label="Modifier l'annonce"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            ) : (
                              <Link
                                href={`/host/my-places/${place.id}/`}
                                prefetch={false}
                                onClick={(e) => { e.stopPropagation(); handleCapacitorLinkClick(e, `/host/my-places/${place.id}/`, router); }}
                                className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            )}
                            <button
                              onClick={(e) => handleDeleteClick(place, e)}
                              className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] bg-red-600 hover:bg-red-700 text-white rounded-lg"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Desktop: grille 12 colonnes */}
                      {/* Annonce - Image + Titre */}
                      <div className="hidden sm:flex col-span-3 items-center gap-3 sm:gap-4">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <Image
                            src={placeImg}
                            alt={typeLabel}
                            fill
                            className="object-cover"
                            unoptimized={Array.isArray(place.photos) && place.photos.length > 0 && place.photos[0]?.startsWith('data:')}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1 line-clamp-1">
                            {capitalizeFirstPerLine((place.title && place.title.trim()) || place.description?.split('.')[0] || `${typeLabel} - ${place.city}`)}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-xs text-slate-500 line-clamp-1">
                              ID: {place.id}
                            </div>
                            {pendingReservationsByPlace.get(place.id) && pendingReservationsByPlace.get(place.id)! > 0 && (
                              <CapacitorDynamicLink
                                href={`/host/my-places/${place.id}/?tab=pending`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-full text-[10px] font-semibold transition-colors"
                              >
                                <Clock className="w-3 h-3" />
                                <span>{pendingReservationsByPlace.get(place.id)} en attente</span>
                              </CapacitorDynamicLink>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Type */}
                      <div className="hidden sm:flex col-span-2 items-center">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                          <span className="text-sm font-medium text-slate-900">{typeLabel}</span>
                        </div>
                      </div>

                      {/* Localisation */}
                      <div className="hidden sm:flex col-span-2 items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{place.city}</div>
                            <div className="text-xs text-slate-500 truncate">{epureAddress(place.address)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Prix */}
                      <div className="hidden sm:flex col-span-2 items-center">
                        <div className="flex flex-col gap-0.5">
                          {prices.length === 0 ? (
                            <div className="flex items-center gap-1">
                              <Euro className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-400">N/A</span>
                            </div>
                          ) : (
                            prices.map((price, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <Euro className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span className="text-sm sm:text-base font-bold text-emerald-600">{price.value}€</span>
                                <span className="text-xs text-slate-600">/{price.label}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Statut */}
                      <div className="hidden sm:flex col-span-1 items-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          place.active 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {place.active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="hidden sm:flex col-span-2 items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {isCapacitor() ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); capacitorNavigate(`/host/my-places/${place.id}/`); }}
                            className="flex items-center justify-center w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer touch-manipulation"
                            title="Modifier"
                            aria-label="Modifier l'annonce"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        ) : (
                          <Link
                            href={`/host/my-places/${place.id}/`}
                            prefetch={false}
                            onClick={(e) => { e.stopPropagation(); handleCapacitorLinkClick(e, `/host/my-places/${place.id}/`, router); }}
                            className="flex items-center justify-center w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={(e) => handleDeleteClick(place, e)}
                          className="flex items-center justify-center w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && placeToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && !isDeleting && setShowDeleteModal(false)}
          aria-label="Fermer"
        >
          <div 
            className="bg-white rounded-none md:rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 flex flex-col justify-center min-h-[100dvh] md:min-h-0" 
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))', paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
              Supprimer l'annonce ?
            </h3>
            <p className="text-slate-600 text-center mb-6">
              Cette action est irréversible. L'annonce sera définitivement supprimée.
            </p>
            {placeToDelete && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {(placeToDelete.title && placeToDelete.title.trim()) || placeToDelete.description?.split('.')[0] || `Annonce #${placeToDelete.id}`}
                </p>
                <p className="text-xs text-slate-500">
                  {placeToDelete.city} • {getTypeLabel(placeToDelete.type)}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <FooterNavigation />
    </div>
  );
}

