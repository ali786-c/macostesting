'use client';

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CapacitorDynamicLink } from "@/components/CapacitorDynamicLink";
import { useRouter } from "next/navigation";
import { Star, Heart, ChevronLeft, ChevronRight, Car, Box, Warehouse } from "lucide-react";

const LEAF_GREEN = "#2d8659";

interface ParkingSpace {
  id: number;
  image: string;
  type: 'parking' | 'storage' | 'cellar';
  title: string;
  location: string;
  priceHourly?: number;
  priceDaily: number;
  priceMonthly: number;
  rating: string;
}

interface ParkingCarouselProps {
  title: string;
  spaces: ParkingSpace[];
}

export default function ParkingCarousel({ title, spaces }: ParkingCarouselProps) {
  const router = useRouter();
  return (
    <section className="w-full py-8 bg-background">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-0">
          <h2 className="text-[20px] md:text-[22px] font-bold leading-tight text-[#222222]">
            {title}
          </h2>
          <div className="hidden md:flex items-center gap-2">
            <button
              className="group p-2 rounded-full border border-[var(--color-border)] hover:bg-white hover:border-transparent hover:shadow-md transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              aria-label="Previous"
              style={{ padding: '8px' }}
            >
              <ChevronLeft 
                size={16} 
                className="text-[#222222] group-hover:text-[var(--leaf-green)] transition-colors" 
                style={{ ['--leaf-green' as any]: LEAF_GREEN }}
              />
            </button>
            <button
              className="group p-2 rounded-full border border-[var(--color-border)] hover:bg-white hover:border-transparent hover:shadow-md transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 bg-white"
              aria-label="Next"
              style={{ padding: '8px' }}
            >
              <ChevronRight 
                size={16} 
                className="text-[#222222] group-hover:text-[var(--leaf-green)] transition-colors"
                style={{ ['--leaf-green' as any]: LEAF_GREEN }}
              />
            </button>
          </div>
        </div>

        <div className="relative -mx-4 md:mx-0">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 md:px-0 pb-6 scrollbar-hide md:scrollbar-default -mb-6">
            {spaces.map((space) => {
              const TypeIcon = space.type === 'parking' ? Car : space.type === 'storage' ? Box : Warehouse;
              const typeLabel = space.type === 'parking' ? 'Parking' : space.type === 'storage' ? 'Stockage' : 'Cave et Divers';
              
              return (
                <CapacitorDynamicLink
                  href={`/parking/${space.id}/`}
                  key={space.id}
                  className="flex-none w-[85%] sm:w-[calc(50%-16px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-16px)] snap-start group cursor-pointer"
                  style={{ maxWidth: '280px' }}
                >
                  {/* Title and Price - Top */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-[15px] font-semibold text-[#222222] line-clamp-2 flex-1 pr-2">
                        {space.title.split(' · ')[0]}
                      </h3>
                      <div className="flex items-baseline gap-0.5 shrink-0">
                        <span className="text-[15px] font-semibold text-emerald-600">
                          {space.priceHourly ? `${space.priceHourly}€/h` : `${space.priceDaily}€/jour`}
                        </span>
                      </div>
                    </div>
                    <span className="text-[13px] text-emerald-600 font-light">
                      {space.priceMonthly}€/mois
                    </span>
                  </div>

                  <div className="relative aspect-square mb-3 rounded-xl overflow-hidden bg-[#dddddd]">
                    <Image
                      src={space.image}
                      alt={space.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 85vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-[4px] rounded-full shadow-sm z-10 flex items-center gap-1.5">
                      <TypeIcon className="w-3.5 h-3.5 text-green-600" strokeWidth={2} />
                      <span className="text-[12px] font-semibold text-[#222222] block leading-tight">
                        {typeLabel}
                      </span>
                    </div>

                    <button 
                      className="absolute top-3 right-3 p-2 z-10 transition-transform active:scale-90 focus:outline-none"
                      aria-label="Add to favorites"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Heart 
                        size={24} 
                        className="text-white hover:fill-white/50 transition-colors drop-shadow-md" 
                        strokeWidth={1.5}
                      />
                    </button>
                  </div>

                  {/* Location and Rating - Bottom */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] text-[#717171] leading-tight flex-1 min-w-0 truncate">
                      {space.location}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star size={12} className="fill-[#222222]" strokeWidth={0} />
                      <span className="text-[14px] text-[#222222] font-light leading-none pt-[1px]">
                        {space.rating}
                      </span>
                    </div>
                  </div>
                </CapacitorDynamicLink>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
