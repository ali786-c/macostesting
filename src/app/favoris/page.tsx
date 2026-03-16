'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { capacitorNavigate, isCapacitor, isMobileOrCapacitor } from '@/lib/capacitor';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import SkeletonLoading from '@/components/ui/skeleton-loading';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Star, MapPin, Euro, Car, Box, Warehouse, Filter, X, Trash2, ChevronDown, Map, Loader2, Zap } from 'lucide-react';
import { rentoallFavoritesAPI, PlaceDTO } from '@/services/api';
import { capitalizeFirstPerLine , getDefaultPlaceImage} from '@/lib/utils';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';

type FavoriteItem = PlaceDTO & {
  addedDate?: Date; // Optionnel car peut ne pas être disponible depuis l'API
};

export default function FavorisPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>('date-added');
  const [showMap, setShowMap] = useState(false);
  const [isCheckingMode, setIsCheckingMode] = useState(true);
  
  // Vérifier le mode utilisateur IMMÉDIATEMENT - bloquer l'accès en mode hôte
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userMode = localStorage.getItem('userMode');
      setIsCheckingMode(false);
      
      if (userMode === 'host') {
        // Mobile : pas de homepage — redirection directe vers annonces hôte
        const target = isMobileOrCapacitor() ? '/host/my-places' : '/home';
        router.replace(target);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Exécuter une seule fois au montage

  // Charger les favoris depuis l'API - seulement si pas en mode hôte et après vérification
  useEffect(() => {
    // Ne pas charger si on est encore en train de vérifier le mode ou si on est en mode hôte
    if (isCheckingMode) {
      return;
    }
    
    if (typeof window !== 'undefined') {
      const userMode = localStorage.getItem('userMode');
      if (userMode === 'host') {
        return; // Ne pas charger si en mode hôte
      }
    }
    let isMounted = true; // Flag pour éviter les mises à jour après démontage

    const loadFavorites = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Récupérer l'ID de l'utilisateur connecté
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.warn('⚠️ [FAVORITES] Aucun utilisateur connecté');
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        const userIdNum = parseInt(userId, 10);
        console.log('🔵 [FAVORITES] Chargement des favoris pour l\'utilisateur:', userIdNum);

        // Récupérer les favoris depuis l'API
        const favoritesData: PlaceDTO[] = await rentoallFavoritesAPI.getFavorites(userIdNum);
        
        console.log('✅ [FAVORITES] Favoris récupérés:', favoritesData);

        // Vérifier que le composant est toujours monté avant de mettre à jour l'état
        if (!isMounted) return;

        // Transformer en FavoriteItem avec une date d'ajout par défaut si non disponible
        const transformedFavorites: FavoriteItem[] = favoritesData.map((place) => ({
          ...place,
          addedDate: new Date(), // Par défaut, on utilise la date actuelle
        }));

        setFavorites(transformedFavorites);
      } catch (err) {
        console.error('❌ [FAVORITES] Erreur lors du chargement:', err);
        if (isMounted) {
          setError('Erreur lors du chargement des favoris');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFavorites();

    // Cleanup function pour marquer le composant comme démonté
    return () => {
      isMounted = false;
    };
  }, [isCheckingMode]); // Dépendre de isCheckingMode pour ne charger qu'après vérification

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const removeFavorite = async (placeId: number) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.warn('⚠️ [FAVORITES] Aucun utilisateur connecté');
        return;
      }

      const userIdNum = parseInt(userId, 10);
      console.log('🔵 [FAVORITES] Suppression du favori:', placeId);

      // Appeler l'API pour supprimer le favori
      await rentoallFavoritesAPI.removeFavorite(userIdNum, placeId);

      console.log('✅ [FAVORITES] Favori supprimé avec succès');

      // Mettre à jour l'état local
      setFavorites(prev => prev.filter(item => item.id !== placeId));
    } catch (err) {
      console.error('❌ [FAVORITES] Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression du favori');
    }
  };

  const filteredFavorites = favorites.filter(item => {
    if (selectedTypes.length === 0) return true;
    // Convertir le type PlaceDTO en type de filtre
    const itemType = item.type === 'PARKING' ? 'parking' : 
                     item.type === 'STORAGE_SPACE' ? 'storage' : 
                     'cellar';
    return selectedTypes.includes(itemType);
  });

  // Tri des favoris
  const sortedFavorites = [...filteredFavorites].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        const priceA = a.pricePerDay || a.pricePerHour || 0;
        const priceB = b.pricePerDay || b.pricePerHour || 0;
        return priceA - priceB;
      case 'price-desc':
        const priceA2 = a.pricePerDay || a.pricePerHour || 0;
        const priceB2 = b.pricePerDay || b.pricePerHour || 0;
        return priceB2 - priceA2;
      case 'rating':
        const ratingA = (typeof a.rating === 'number' ? a.rating : 0) * 2;
        const ratingB = (typeof b.rating === 'number' ? b.rating : 0) * 2;
        return ratingB - ratingA;
      case 'proximity':
        // Trier par ville
        return (a.city || '').localeCompare(b.city || '');
      case 'date-added':
      default:
        // Tri par date d'ajout (plus récent en premier)
        const dateA = a.addedDate?.getTime() || 0;
        const dateB = b.addedDate?.getTime() || 0;
        return dateB - dateA;
    }
  });

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

  // Si on est en train de vérifier le mode ou si on est en mode hôte, ne rien afficher
  if (isCheckingMode || (typeof window !== 'undefined' && localStorage.getItem('userMode') === 'host')) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-slate-600">Chargement...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden w-full max-w-full">
        <HeaderNavigation />
      
      <main className="pt-0 md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-16 flex-1 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <SkeletonLoading isLoading={isLoading}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Header - Mobile: Compact */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-1.5 sm:mb-2 mt-2 sm:mt-0">Mes favoris</h1>
                <p className="text-xs sm:text-sm md:text-base text-slate-600">
                  {isLoading ? 'Chargement...' : `${filteredFavorites.length} espace${filteredFavorites.length > 1 ? 's' : ''} sauvegardé${filteredFavorites.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Tri */}
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full sm:w-auto appearance-none bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 pr-8 text-xs sm:text-sm font-medium text-slate-700 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer transition-colors"
                  >
                    <option value="date-added">Date d&apos;ajout</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                    <option value="rating">Note</option>
                    <option value="proximity">Proximité</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Voir sur carte - masqué sur mobile */}
                {sortedFavorites.length > 0 && (
                  <button
                    onClick={() => setShowMap(!showMap)}
                    className="hidden md:flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors bg-white text-xs sm:text-sm"
                  >
                    <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                    <span className="hidden sm:inline font-medium text-slate-700">Voir sur carte</span>
                    <span className="sm:hidden font-medium text-slate-700">Carte</span>
                  </button>
                )}

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors bg-white text-xs sm:text-sm"
                >
                  <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                  <span className="font-medium text-slate-700">Filtrer</span>
                  {selectedTypes.length > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
                      {selectedTypes.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Type d&apos;espace</h3>
                  {selectedTypes.length > 0 && (
                    <button
                      onClick={() => setSelectedTypes([])}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'parking', label: 'Parking', icon: Car },
                    { id: 'storage', label: 'Stockage', icon: Box },
                    { id: 'cellar', label: 'Cave et Divers', icon: Warehouse },
                  ].map(({ id, label, icon: Icon }) => {
                    const isSelected = selectedTypes.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleType(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Carte interactive - masquée sur mobile */}
          {showMap && sortedFavorites.length > 0 && (
            <div className="hidden md:block mb-6 bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="h-96 bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50 relative">
                {/* Placeholder pour la carte - à remplacer par InteractiveMap si disponible */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Map className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Carte interactive</p>
                    <p className="text-sm text-slate-500 mt-2">{sortedFavorites.length} favori{sortedFavorites.length > 1 ? 's' : ''} affiché{sortedFavorites.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {[...Array(8)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse"
                >
                  {/* Image skeleton */}
                  <div className="h-16 sm:h-auto sm:aspect-[3/2] bg-slate-200" />
                  
                  {/* Content skeleton */}
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                    <div className="h-2.5 bg-slate-200 rounded w-1/3" />
                    <div className="pt-2 border-t border-slate-100">
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedFavorites.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {selectedTypes.length > 0 ? 'Aucun favori avec ces filtres' : 'Vous n\'avez pas encore ajouté de favoris'}
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {selectedTypes.length > 0
                  ? 'Essayez de modifier vos filtres pour voir plus de résultats.'
                  : 'Commencez votre recherche ici ! Sauvegardez vos espaces préférés pour y accéder facilement.'}
              </p>
              {selectedTypes.length > 0 ? (
                <button
                  onClick={() => setSelectedTypes([])}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Réinitialiser les filtres
                </button>
              ) : (
                <Link
                  href="/search-parkings"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Commencer ma recherche
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {sortedFavorites.map((item) => {
                const TypeIcon = getTypeIcon(item.type);
                const typeLabel = getTypeLabel(item.type);
                
                // Image par défaut
                const defaultImage = getDefaultPlaceImage(item?.type);
                
                // Titre : titre du bien en priorité, sinon description ou type + ville
                const itemTitle = capitalizeFirstPerLine(
                  (item.title && String(item.title).trim())
                    ? item.title
                    : (item.description
                      ? item.description.split('.').slice(0, 1).join('.') || `${typeLabel} - ${item.city}`
                      : `${typeLabel} - ${item.city}`)
                );
                
                // Prix horaire ou journalier
                const pricePerHour = item.pricePerHour || (item.pricePerDay ? item.pricePerDay / 24 : 0);

                return (
                  <div
                    key={item.id}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all"
                  >
                    <CapacitorDynamicLink href={`/parking/${item.id}/`} className="block">
                      <div className="relative h-16 sm:h-auto sm:aspect-[3/2] overflow-hidden bg-slate-100">
                        <Image
                          src={(Array.isArray(item.photos) && item.photos.length > 0 ? item.photos[0] : null) || defaultImage}
                          alt={itemTitle}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized={Array.isArray(item.photos) && item.photos.length > 0 && item.photos[0]?.startsWith('data:')}
                        />
                        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1">
                          <TypeIcon className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] font-semibold text-slate-900">{typeLabel}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeFavorite(item.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10"
                          title="Retirer des favoris"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                        <div className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-100 group-hover:opacity-0 transition-opacity">
                          <Heart className="w-3.5 h-3.5 fill-emerald-600 stroke-emerald-600" />
                        </div>
                      </div>
                    </CapacitorDynamicLink>

                    <div className="p-3">
                      <CapacitorDynamicLink href={`/parking/${item.id}/`}>
                        <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                          {itemTitle}
                        </h3>
                      </CapacitorDynamicLink>
                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="line-clamp-1">{item.city}</span>
                        </div>
                        {typeof item.reviewsCount === 'number' && item.reviewsCount > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold text-slate-900">{((typeof item.rating === 'number' ? item.rating : 0) * 2).toFixed(1).replace('.', ',')}/10</span>
                            <span className="text-xs text-slate-500">({item.reviewsCount})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full shadow-sm">
                            <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600 flex-shrink-0" />
                            <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">Nouveau</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 pt-2 border-t border-slate-100">
                        <Euro className="w-3 h-3 text-slate-600" />
                        <span className="text-base font-bold text-slate-900">
                          {pricePerHour ? pricePerHour.toFixed(2) : item.pricePerDay}
                        </span>
                        <span className="text-xs text-slate-600 ml-0.5">
                          /{pricePerHour ? 'h' : 'jour'}
                        </span>
                        {item.pricePerMonth && (
                          <span className="text-xs text-slate-500 ml-2">
                            ou {item.pricePerMonth}€/mois
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </SkeletonLoading>
      </main>

      <FooterNavigation />
      </div>
    </ProtectedRoute>
  );
}
