'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { Heart, Star, MapPin, Euro, ArrowRight, Sparkles, ChevronLeft, ChevronRight, Car, Box, Warehouse } from 'lucide-react';
import { PlaceDTO, rentoallFavoritesAPI } from '@/services/api';
import { capitalizeFirstPerLine, getValidPhoto } from '@/lib/utils';

interface FeaturedSpacesSectionProps {
  title: string;
  subtitle?: string;
  listings: PlaceDTO[];
  icon?: React.ElementType;
  showBadge?: boolean;
  badgeText?: string;
  badgeIcon?: React.ReactNode;
  maxItems?: number;
}

function SpaceCard({ item, isFavorite: initialIsFavorite, onFavoriteToggle, router }: { 
  item: PlaceDTO;
  isFavorite: boolean;
  onFavoriteToggle: (itemId: number, newState: boolean) => void;
  router: { push: (path: string) => void };
}) {
  const [isLiked, setIsLiked] = useState(initialIsFavorite);
  const [isToggling, setIsToggling] = useState(false);
  
  const TypeIcon = item.type === 'PARKING' ? Car : item.type === 'STORAGE_SPACE' ? Box : Warehouse;
  const typeLabel = item.type === 'PARKING' ? 'Parking' : item.type === 'STORAGE_SPACE' ? 'Stockage' : 'Cave et Divers';
  
  // Titre : titre du bien en priorité, sinon extrait de la description
  const displayTitle = capitalizeFirstPerLine(
    (item.title && String(item.title).trim())
      ? item.title
      : (item.description
        ? item.description.split('.').slice(0, 1).join('.') || `${typeLabel} - ${item.city}`
        : `${typeLabel} - ${item.city}`)
  );
  
  const placeImage = getValidPhoto(item.photos, item.type);

  // Synchroniser avec la prop si elle change
  useEffect(() => {
    setIsLiked(initialIsFavorite);
  }, [initialIsFavorite]);

  // Gérer l'ajout/suppression des favoris
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isToggling) return;

    const userId = localStorage.getItem('userId');
    if (!userId) {
      // Rediriger vers la page de connexion si non connecté
      router.push('/auth/login');
      return;
    }

    setIsToggling(true);
    const previousState = isLiked;
    const newState = !isLiked;

    // Mise à jour optimiste
    setIsLiked(newState);
    onFavoriteToggle(item.id, newState);

    try {
      const userIdNum = parseInt(userId, 10);
      
      if (previousState) {
        // Retirer des favoris
        await rentoallFavoritesAPI.removeFavorite(userIdNum, item.id);
        console.log('✅ [FAVORITES] Favori retiré');
      } else {
        // Ajouter aux favoris
        await rentoallFavoritesAPI.addFavorite(userIdNum, item.id);
        console.log('✅ [FAVORITES] Favori ajouté');
      }
    } catch (error) {
      console.error('❌ [FAVORITES] Erreur lors de la modification:', error);
      // Revenir à l'état précédent en cas d'erreur
      setIsLiked(previousState);
      onFavoriteToggle(item.id, previousState);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <CapacitorDynamicLink
      href={`/parking/${item.id}/`}
      className="group flex flex-col h-full w-full bg-white rounded-lg sm:rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg sm:hover:shadow-xl hover:-translate-y-1 sm:hover:-translate-y-1.5"
    >
      {/* Title and Price - Top - Hauteur fixe pour uniformiser */}
      <div className="p-2 sm:p-2.5 pb-1.5 sm:pb-2 min-h-[52px] sm:min-h-[56px] flex flex-col justify-between">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-1">
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors flex-1 leading-tight">
            {displayTitle}
          </h3>
          <div className="flex items-baseline gap-0.5 shrink-0">
            <Euro className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-emerald-600">
              {item.pricePerHour ? item.pricePerHour : item.pricePerDay}
            </span>
            <span className="text-[10px] sm:text-[9px] text-emerald-600 ml-0.5">
              /{item.pricePerHour ? 'h' : 'j'}
            </span>
          </div>
        </div>
        <div className="min-h-[14px] sm:min-h-[16px]">
          {item.pricePerMonth && (
            <span className="text-[10px] sm:text-[9px] text-emerald-600">
              ou {item.pricePerMonth}€/mois
            </span>
          )}
        </div>
      </div>

      {/* Image Container - Compact */}
      <div className="relative aspect-[3/2] overflow-hidden bg-slate-100">
        <Image
          src={placeImage}
          alt={displayTitle}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 640px) 260px, (max-width: 768px) 280px, (max-width: 1024px) 300px, 320px"
          unoptimized={placeImage.startsWith('data:') || placeImage.startsWith('http')}
        />
        
        {/* Type Badge - Compact */}
        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 z-10 bg-white/95 backdrop-blur-md px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-md flex items-center gap-0.5 sm:gap-1 border border-white/20">
          <TypeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 flex-shrink-0" strokeWidth={2.5} />
          <span className="text-[10px] sm:text-[9px] font-semibold text-slate-900">
            {typeLabel}
          </span>
        </div>

        {/* Favorite Button - Compact */}
        <button
          onClick={handleToggleFavorite}
          disabled={isToggling}
          className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 z-10 p-1 sm:p-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-md transition-all hover:scale-110 active:scale-95 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation"
          aria-label={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-all duration-200 ${
              isLiked 
                ? 'fill-emerald-600 stroke-emerald-600 text-emerald-600 scale-110'
                : 'fill-none stroke-slate-700 text-slate-700 hover:stroke-emerald-600'
            }`}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Location - Bottom - Hauteur fixe */}
      <div className="p-2 sm:p-2.5 pt-1 sm:pt-1.5 min-h-[28px] sm:min-h-[32px] flex items-center">
        <div className="flex items-center gap-1 text-[10px] sm:text-[9px] text-slate-600 min-w-0">
          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
          <span className="line-clamp-1 truncate">{item.city}</span>
        </div>
      </div>
    </CapacitorDynamicLink>
  );
}

export default function FeaturedSpacesSection({ 
  title, 
  subtitle, 
  listings, 
  icon: Icon,
  showBadge = false,
  badgeText,
  badgeIcon,
  maxItems = 20
}: FeaturedSpacesSectionProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  
  if (listings.length === 0) return null;

  // Utiliser les listings tels quels, sans tri
  const sortedListings = listings;

  // Charger les favoris une seule fois au montage du composant
  useEffect(() => {
    let isMounted = true;
    
    const loadFavorites = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          if (isMounted) {
            setFavoriteIds(new Set());
            setIsLoadingFavorites(false);
          }
          return;
        }

        const userIdNum = parseInt(userId, 10);
        const favorites = await rentoallFavoritesAPI.getFavorites(userIdNum);
        
        if (isMounted) {
          const favoriteSet = new Set(favorites.map(fav => fav.id));
          setFavoriteIds(favoriteSet);
          setIsLoadingFavorites(false);
        }
      } catch (error) {
        console.error('❌ [FAVORITES] Erreur lors du chargement:', error);
        if (isMounted) {
          setFavoriteIds(new Set());
          setIsLoadingFavorites(false);
        }
      }
    };

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, []); // Charger une seule fois au montage

  // Fonction pour mettre à jour l'état local des favoris
  const handleFavoriteToggle = (itemId: number, newState: boolean) => {
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      if (newState) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    checkScrollability();
    if (scrollRef.current) {
      scrollRef.current.addEventListener('scroll', checkScrollability);
      return () => {
        if (scrollRef.current) {
          scrollRef.current.removeEventListener('scroll', checkScrollability);
        }
      };
    }
  }, []);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const cardWidth = 240;
      const gap = 10;
      const scrollAmount = cardWidth + gap;
      const currentScroll = scrollRef.current.scrollLeft;
      const newScrollLeft = direction === 'left' 
        ? Math.max(0, currentScroll - scrollAmount)
        : currentScroll + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-0 sm:py-1 md:py-1.5 w-full">
      <div className="w-full">
        {/* Section Header - Compact */}
        <div className="flex justify-center mb-0.5 sm:mb-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {Icon && (
              <div className="p-1 sm:p-1.5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow-sm flex-shrink-0">
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" strokeWidth={2.5} />
              </div>
            )}
            <div className="flex flex-col items-center text-center">
              <Link
                href="/search-parkings"
                prefetch={false}
                onClick={(e) => handleCapacitorLinkClick(e, '/search-parkings', router)}
                className="flex items-center gap-1 group"
              >
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-emerald-600 group-hover:text-emerald-700 mb-0.5 tracking-tight transition-colors">
                  {title}
                </h2>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all flex-shrink-0" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>


        {/* Spaces Grid - Horizontal Scroll with Arrows - Centered - Mobile: Optimized */}
        <div className="relative">
          {/* Left Arrow - Compact */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full shadow-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
              aria-label="Précédent"
            >
              <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-700" strokeWidth={2.5} />
            </button>
          )}
          
          {/* Right Arrow - Compact */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full shadow-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
              aria-label="Suivant"
            >
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-700" strokeWidth={2.5} />
            </button>
          )}
          
          {/* Scrollable Container - Centered */}
          <div className="flex justify-center">
            <div 
              ref={scrollRef}
              onScroll={checkScrollability}
              className="overflow-x-auto scrollbar-hide scroll-smooth max-w-full"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex items-stretch gap-2 sm:gap-2.5 min-w-max pb-1 sm:pb-2">
                {sortedListings.slice(0, maxItems).map((item) => {
                  return (
                    <div key={item.id} className="flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px] flex">
                      <SpaceCard 
                        item={item}
                        isFavorite={favoriteIds.has(item.id)}
                        onFavoriteToggle={handleFavoriteToggle}
                        router={router}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
}

