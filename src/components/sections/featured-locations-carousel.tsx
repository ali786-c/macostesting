'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { Heart, Star, Car, Box, Warehouse, MapPin, Euro } from 'lucide-react';
import { PARKING_LISTINGS } from '@/data/parkingListings';

interface Filters {
  type: string | null;
  types?: string[];
  city: string;
  startDate: Date | null;
  endDate: Date | null;
}

interface FeaturedLocationsCarouselProps {
  filters?: Filters;
}

function FeaturedLocationsCarouselClient({ filters }: FeaturedLocationsCarouselProps) {
  const router = useRouter();
  // Filtrer les listings selon les filtres
  const filteredListings = useMemo(() => {
    let filtered = [...PARKING_LISTINGS];

    // Filtre par type(s)
    if (filters?.types && filters.types.length > 0) {
      filtered = filtered.filter(item => filters.types!.includes(item.type));
    } else if (filters?.type) {
      filtered = filtered.filter(item => item.type === filters.type);
    }

    // Filtre par ville
    if (filters?.city && filters.city.trim() !== '') {
      const cityLower = filters.city.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.city.toLowerCase().includes(cityLower) ||
        item.location.toLowerCase().includes(cityLower) ||
        item.address.toLowerCase().includes(cityLower)
      );
    }

    // Filtre par dates
    if (filters?.startDate || filters?.endDate) {
      filtered = filtered.filter(item => {
        return item.availability !== undefined;
      });
    }

    return filtered;
  }, [filters]);

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <div className="mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            {filters && (filters.type || filters.city || filters.startDate || filters.endDate)
              ? `Espaces disponibles${filteredListings.length > 0 ? ` (${filteredListings.length})` : ''}`
              : 'Espaces disponibles près de chez vous'
            }
          </h2>
          <p className="text-lg text-slate-600">
            {filteredListings.length > 0 
              ? `Découvrez ${filteredListings.length} espace${filteredListings.length > 1 ? 's' : ''} de qualité`
              : 'Aucun espace trouvé avec ces critères'
            }
          </p>
        </div>

        {/* Grid Layout */}
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredListings.map((item) => (
              <SpaceCard key={item.id} item={item} router={router} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun résultat</h3>
              <p className="text-slate-600 mb-6">
                Essayez de modifier vos critères de recherche pour trouver plus d'espaces
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SpaceCard({ item, router }: { item: typeof PARKING_LISTINGS[0]; router: { push: (path: string) => void } }) {
  const [isLiked, setIsLiked] = useState(false);
  
  const TypeIcon = item.type === 'parking' ? Car : item.type === 'storage' ? Box : Warehouse;
  const typeLabel = item.type === 'parking' ? 'Parking' : item.type === 'storage' ? 'Stockage' : 'Cave et Divers';

  return (
    <CapacitorDynamicLink
      href={`/parking/${item.id}/`}
      className="group block bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      {/* Title and Price - Top */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-semibold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors flex-1">
            {item.title.split(' - ')[0]}
          </h3>
          <div className="flex items-baseline gap-1 shrink-0">
            <Euro className="w-4 h-4 text-emerald-600" />
            <span className="text-xl font-bold text-emerald-600">
              {item.priceHourly ? item.priceHourly : item.priceDaily}
            </span>
            <span className="text-sm text-emerald-600 ml-1">
              /{item.priceHourly ? 'h' : 'jour'}
            </span>
          </div>
        </div>
        <span className="text-sm text-emerald-600">
          ou {item.priceMonthly}€/mois
        </span>
      </div>

      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        />
        
        {/* Type Badge */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
          <span className="text-xs font-semibold text-slate-900">
            {typeLabel}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsLiked(!isLiked);
          }}
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md transition-all hover:scale-110 active:scale-95"
          aria-label="Ajouter aux favoris"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isLiked 
                ? 'fill-emerald-600 stroke-emerald-600 text-emerald-600'
                : 'fill-none stroke-slate-700 text-slate-700'
            }`}
            strokeWidth={2}
          />
        </button>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Location and Rating - Bottom */}
      <div className="p-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 flex-1 min-w-0">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1">{item.location}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-slate-900">{(parseFloat(item.rating.replace(',', '.')) * 2).toFixed(1).replace('.', ',')}/10</span>
            <span className="text-sm text-slate-500">({item.reviewsCount})</span>
          </div>
        </div>
      </div>
    </CapacitorDynamicLink>
  );
}

export default function FeaturedLocationsCarousel({ filters }: FeaturedLocationsCarouselProps) {
  return (
    <FeaturedLocationsCarouselClient filters={filters} />
  );
}
