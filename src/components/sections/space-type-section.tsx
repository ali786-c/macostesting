'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { Heart, Star, Car, Box, Warehouse, MapPin, Euro, ArrowRight, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { PARKING_LISTINGS } from '@/data/parkingListings';

interface SpaceTypeSectionProps {
  type: 'parking' | 'storage' | 'cellar';
  title: string;
  description: string;
  icon: typeof Car;
  maxItems?: number;
}

function SpaceCard({ item, router }: { 
  item: typeof PARKING_LISTINGS[0];
  router: { push: (path: string) => void };
}) {
  const [isLiked, setIsLiked] = useState(false);
  
  const TypeIcon = item.type === 'parking' ? Car : item.type === 'storage' ? Box : Warehouse;
  const typeLabel = item.type === 'parking' ? 'Parking' : item.type === 'storage' ? 'Stockage' : 'Cave et Divers';

  return (
    <CapacitorDynamicLink
      href={`/parking/${item.id}/`}
      className="group block bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5"
    >
      {/* Title and Price - Top */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors flex-1">
            {item.title.split(' - ')[0]}
          </h3>
          <div className="flex items-baseline gap-1 shrink-0">
            <Euro className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-lg font-bold text-emerald-600">
              {item.priceHourly ? item.priceHourly : item.priceDaily}
            </span>
            <span className="text-xs text-emerald-600 ml-0.5">
              /{item.priceHourly ? 'h' : 'jour'}
            </span>
          </div>
        </div>
        <span className="text-xs text-emerald-600">
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
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-white/20">
          <TypeIcon className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
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
          className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-md transition-all hover:scale-110 active:scale-95 border border-white/20"
          aria-label="Ajouter aux favoris"
        >
          <Heart
            className={`w-4 h-4 transition-all duration-200 ${
              isLiked 
                ? 'fill-emerald-600 stroke-emerald-600 text-emerald-600 scale-110'
                : 'fill-none stroke-slate-700 text-slate-700 hover:stroke-emerald-600'
            }`}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Location and Rating - Bottom */}
      <div className="p-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{item.location}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-slate-900">{(parseFloat(item.rating.replace(',', '.')) * 2).toFixed(1).replace('.', ',')}/10</span>
            <span className="text-xs text-slate-500">({item.reviewsCount})</span>
          </div>
        </div>
      </div>
    </CapacitorDynamicLink>
  );
}

export default function SpaceTypeSection({ 
  type, 
  title, 
  description, 
  icon: Icon,
  maxItems = 20 
}: SpaceTypeSectionProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'reviews'>('reviews');
  
  const allSpaces = PARKING_LISTINGS.filter(item => item.type === type);
  
  // Trier les espaces selon le filtre sélectionné
  const sortedSpaces = [...allSpaces].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        const ratingA = parseFloat(a.rating.replace(',', '.'));
        const ratingB = parseFloat(b.rating.replace(',', '.'));
        return ratingB - ratingA;
      case 'price':
        return (a.priceHourly || a.priceDaily) - (b.priceHourly || b.priceDaily);
      case 'reviews':
        return b.reviewsCount - a.reviewsCount;
      default:
        return 0;
    }
  });
  
  const spaces = sortedSpaces.slice(0, maxItems);
  const allSpacesCount = allSpaces.length;

  if (spaces.length === 0) return null;

  React.useEffect(() => {
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
      const cardWidth = 320;
      const gap = 20;
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
    <section className="py-6 md:py-8 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        {/* Section Header */}
        <div className="flex justify-center mb-5 md:mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl shadow-sm flex-shrink-0">
              <Icon className="w-7 h-7 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-center text-center">
              <Link
                href={`/search-parkings?type=${type}`}
                prefetch={false}
                onClick={(e) => handleCapacitorLinkClick(e, `/search-parkings?type=${type}`, router)}
                className="flex items-center gap-2 group"
              >
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-emerald-600 group-hover:text-emerald-700 mb-1 tracking-tight transition-colors">
                  {title}
                </h2>
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all flex-shrink-0" strokeWidth={2.5} />
              </Link>
              <p className="text-sm md:text-base text-slate-600">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Filtres rapides */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1.5 border border-slate-200">
            <Filter className="w-4 h-4 text-slate-600 mr-1" />
            <button
              onClick={() => setSortBy('rating')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                sortBy === 'rating'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              Par note
            </button>
            <button
              onClick={() => setSortBy('price')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                sortBy === 'price'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              Par prix
            </button>
            <button
              onClick={() => setSortBy('reviews')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                sortBy === 'reviews'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              Par popularité
            </button>
          </div>
        </div>

        {/* Spaces Grid - Horizontal Scroll with Arrows - Centered */}
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-12 2xl:-mx-16 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-center transition-all hover:scale-110"
              aria-label="Précédent"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" strokeWidth={2.5} />
            </button>
          )}
          
          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-center transition-all hover:scale-110"
              aria-label="Suivant"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" strokeWidth={2.5} />
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
              <div className="flex gap-4 md:gap-5 min-w-max pb-2">
                {spaces.map((item) => {
                  return (
                    <div key={item.id} className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px]">
                      <SpaceCard item={item} router={router} />
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

