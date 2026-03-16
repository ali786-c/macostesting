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

const parkingSpaces: ParkingSpace[] = [
  {
    id: 9,
    image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800",
    type: 'parking',
    title: "Parking couvert · Marseille Vieux-Port",
    location: "Marseille 1er",
    priceHourly: 4,
    priceDaily: 18,
    priceMonthly: 320,
    rating: "4,9",
  },
  {
    id: 10,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    type: 'storage',
    title: "Box stockage 12m² · Marseille Centre",
    location: "Marseille 6ème",
    priceDaily: 10,
    priceMonthly: 180,
    rating: "4,8",
  },
  {
    id: 11,
    image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800",
    type: 'cellar',
    title: "Cave sécurisée 5m² · Marseille",
    location: "Marseille 5ème",
    priceDaily: 5,
    priceMonthly: 90,
    rating: "4,7",
  },
  {
    id: 12,
    image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
    type: 'parking',
    title: "Garage privé · Marseille Préfecture",
    location: "Marseille 8ème",
    priceHourly: 3,
    priceDaily: 14,
    priceMonthly: 250,
    rating: "4,9",
  },
  {
    id: 13,
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800",
    type: 'storage',
    title: "Box stockage 8m² · Marseille",
    location: "Marseille 9ème",
    priceDaily: 8,
    priceMonthly: 145,
    rating: "4,8",
  },
  {
    id: 14,
    image: "https://images.unsplash.com/photo-1574552850131-cc374ee8f7b0?w=800",
    type: 'parking',
    title: "Place parking · Marseille Notre-Dame",
    location: "Marseille 7ème",
    priceHourly: 3.5,
    priceDaily: 16,
    priceMonthly: 280,
    rating: "5,0",
  },
  {
    id: 15,
    image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800",
    type: 'cellar',
    title: "Cave 7m² · Marseille Castellane",
    location: "Marseille 6ème",
    priceDaily: 6,
    priceMonthly: 105,
    rating: "4,8",
  },
  {
    id: 16,
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
    type: 'storage',
    title: "Box stockage 15m² · Marseille",
    location: "Marseille 10ème",
    priceDaily: 12,
    priceMonthly: 220,
    rating: "4,7",
  },
];

export default function LocationCarouselMiami() {
  const router = useRouter();
  return (
    <section className="w-full py-8 bg-background">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-0">
          <h2 className="text-[20px] md:text-[22px] font-bold leading-tight text-[#222222]">
            Espaces disponibles · Marseille
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
            {parkingSpaces.map((space) => {
              const TypeIcon = space.type === 'parking' ? Car : space.type === 'storage' ? Box : Warehouse;
              const typeLabel = space.type === 'parking' ? 'Parking' : space.type === 'storage' ? 'Stockage' : 'Cave et Divers';
              
              return (
                <CapacitorDynamicLink
                  href={`/parking/${space.id}/`}
                  key={space.id}
                  className="flex-none w-[85%] sm:w-[calc(50%-16px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-16px)] snap-start group cursor-pointer"
                  style={{ maxWidth: '280px' }}
                >
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

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-[15px] font-semibold text-[#222222] truncate pr-2">
                        {space.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <Star size={12} className="fill-[#222222]" strokeWidth={0} />
                        <span className="text-[14px] text-[#222222] font-light leading-none pt-[1px]">
                          {space.rating}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-[14px] text-[#717171] leading-tight">
                      {space.location}
                    </p>
                    
                    <div className="flex items-baseline gap-1 mt-[2px]">
                      <p className="text-[14px] font-semibold text-[#222222]">
                        {space.priceHourly ? `${space.priceHourly}€/h` : `${space.priceDaily}€/jour`}
                      </p>
                      <span className="text-[14px] text-[#717171] font-light">
                        · {space.priceMonthly}€/mois
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
