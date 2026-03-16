'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';
import { PARKING_LISTINGS } from '@/data/parkingListings';

export default function PopularCitiesSection() {
  const cities = [
    { name: 'Paris', count: PARKING_LISTINGS.filter(l => l.city === 'Paris').length, slug: 'paris' },
    { name: 'Lyon', count: PARKING_LISTINGS.filter(l => l.city === 'Lyon').length, slug: 'lyon' },
    { name: 'Marseille', count: PARKING_LISTINGS.filter(l => l.city === 'Marseille').length, slug: 'marseille' },
    { name: 'Bordeaux', count: PARKING_LISTINGS.filter(l => l.city === 'Bordeaux').length, slug: 'bordeaux' },
    { name: 'Toulouse', count: PARKING_LISTINGS.filter(l => l.city === 'Toulouse').length, slug: 'toulouse' },
    { name: 'Nice', count: PARKING_LISTINGS.filter(l => l.city === 'Nice').length, slug: 'nice' },
  ];

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3">
            Offres populaires par ville
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Découvrez les meilleures offres dans les villes les plus recherchées
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {cities.map((city) => (
            <Link
              key={city.slug}
              href={`/search-parkings?city=${city.name}`}
              className="group bg-white rounded-xl border-2 border-slate-200 hover:border-emerald-500 p-6 text-center transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex flex-col items-center">
                <div className="p-3 bg-emerald-50 rounded-full mb-3 group-hover:bg-emerald-100 transition-colors">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
                  {city.name}
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  {city.count} espaces
                </p>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Voir
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}





