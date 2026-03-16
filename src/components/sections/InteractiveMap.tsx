'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { useRouter } from 'next/navigation';
import { MapPin, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Listing {
  id: number;
  title: string;
  location: string;
  city: string;
  address: string;
  priceDaily: number;
  priceHourly?: number;
  priceMonthly: number;
  type: 'parking' | 'storage' | 'cellar';
  image: string;
}

interface InteractiveMapProps {
  listings: Listing[];
  selectedListingId?: number;
  onListingClick?: (listingId: number) => void;
}

// Coordonnées approximatives pour les villes (pour la démo)
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Toulouse': { lat: 43.6047, lng: 1.4442 },
  'Nice': { lat: 43.7102, lng: 7.2620 },
  'Nantes': { lat: 47.2184, lng: -1.5536 },
  'Strasbourg': { lat: 48.5734, lng: 7.7521 },
  'Bordeaux': { lat: 44.8378, lng: -0.5792 },
};

// Fonction pour obtenir des coordonnées avec un petit offset pour éviter la superposition
const getListingCoordinates = (listing: Listing, index: number): { lat: number; lng: number } => {
  const baseCoords = CITY_COORDINATES[listing.city] || { lat: 48.8566, lng: 2.3522 };
  // Ajouter un petit offset aléatoire pour chaque listing
  const offset = 0.01;
  const angle = (index * 137.5) % 360; // Angle d'or pour une distribution uniforme
  const radius = (index % 3) * offset;
  
  return {
    lat: baseCoords.lat + radius * Math.cos(angle * Math.PI / 180),
    lng: baseCoords.lng + radius * Math.sin(angle * Math.PI / 180),
  };
};

export default function InteractiveMap({ listings, selectedListingId, onListingClick }: InteractiveMapProps) {
  const router = useRouter();
  const [hoveredListingId, setHoveredListingId] = useState<number | null>(null);

  if (listings.length === 0) {
    return (
      <div className="h-full bg-slate-100 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-slate-400" />
          <p className="text-sm">Aucun espace à afficher</p>
        </div>
      </div>
    );
  }

  // Calculer le centre de la carte basé sur les listings
  const centerLat = listings.reduce((sum, _, idx) => {
    const coords = getListingCoordinates(listings[idx], idx);
    return sum + coords.lat;
  }, 0) / listings.length;

  const centerLng = listings.reduce((sum, _, idx) => {
    const coords = getListingCoordinates(listings[idx], idx);
    return sum + coords.lng;
  }, 0) / listings.length;

  return (
    <div className="h-full bg-white overflow-hidden border border-slate-200 shadow-sm">
      {/* Map Container */}
      <div className="relative w-full h-full bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50">
        {/* Map Background with Roads Pattern */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px),
            radial-gradient(circle at 30% 40%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)
          `,
          backgroundSize: '60px 60px, 60px 60px, 200px 200px, 200px 200px'
        }} />
        
        {/* City Labels */}
        {Object.entries(CITY_COORDINATES).map(([cityName, coords]) => {
          const cityListings = listings.filter(l => l.city === cityName);
          if (cityListings.length === 0) return null;
          
          const leftPercent = 50 + ((coords.lng - centerLng) * 800);
          const topPercent = 50 - ((coords.lat - centerLat) * 800);
          
          return (
            <div
              key={cityName}
              className="absolute text-xs font-semibold text-slate-700 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm"
              style={{
                left: `${Math.max(5, Math.min(95, leftPercent))}%`,
                top: `${Math.max(5, Math.min(95, topPercent))}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {cityName}
            </div>
          );
        })}
        
        {/* Custom Markers Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {listings.map((listing, index) => {
            const coords = getListingCoordinates(listing, index);
            const price = listing.priceDaily || listing.priceHourly || listing.priceMonthly;
            const isSelected = selectedListingId === listing.id;
            const isHovered = hoveredListingId === listing.id;
            
            // Position en pourcentage (approximation basée sur les coordonnées)
            const leftPercent = 50 + ((coords.lng - centerLng) * 800);
            const topPercent = 50 - ((coords.lat - centerLat) * 800);

            return (
              <div
                key={listing.id}
                className="absolute pointer-events-auto z-10"
                style={{
                  left: `${Math.max(5, Math.min(95, leftPercent))}%`,
                  top: `${Math.max(5, Math.min(95, topPercent))}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <CapacitorDynamicLink
                  href={`/parking/${listing.id}/`}
                  onMouseEnter={() => setHoveredListingId(listing.id)}
                  onMouseLeave={() => setHoveredListingId(null)}
                  onClick={() => onListingClick?.(listing.id)}
                  className={cn(
                    'block px-2.5 py-1 bg-white rounded-lg shadow-md border-2 transition-all cursor-pointer hover:scale-110',
                    isSelected || isHovered
                      ? 'border-emerald-600 shadow-xl scale-110 bg-emerald-50'
                      : 'border-slate-300 hover:border-emerald-400'
                  )}
                >
                  <div className="flex items-center gap-1">
                    <Euro className="w-3 h-3 text-slate-700" />
                    <span className={cn(
                      'text-xs font-bold whitespace-nowrap',
                      isSelected || isHovered ? 'text-emerald-600' : 'text-slate-900'
                    )}>
                      {price}€
                    </span>
                  </div>
                </CapacitorDynamicLink>
              </div>
            );
          })}
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors border border-slate-200">
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors border border-slate-200">
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <div className="flex flex-col border-t border-slate-200 pt-2 mt-2">
            <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors border border-slate-200 mb-1">
              <span className="text-lg font-semibold text-slate-700">+</span>
            </button>
            <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors border border-slate-200">
              <span className="text-lg font-semibold text-slate-700">−</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

