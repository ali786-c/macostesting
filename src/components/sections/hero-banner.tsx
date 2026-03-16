'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Car, Box, Warehouse, MapPin, Clock } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';

export default function HeroBanner() {
  const router = useRouter();
  const { city, setCity, startDate, setStartDate, endDate, setEndDate, selectedTypes, setSelectedTypes } = useSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('');
  const [access24h, setAccess24h] = useState(false);

  const popularCities = [
    { name: 'Paris', postalCode: '75000' },
    { name: 'Lyon', postalCode: '69000' },
    { name: 'Marseille', postalCode: '13000' },
    { name: 'Toulouse', postalCode: '31000' },
    { name: 'Nice', postalCode: '06000' },
    { name: 'Nantes', postalCode: '44000' },
    { name: 'Strasbourg', postalCode: '67000' },
    { name: 'Montpellier', postalCode: '34000' },
    { name: 'Bordeaux', postalCode: '33000' },
    { name: 'Lille', postalCode: '59000' },
  ];
  const sizeOptions = ['Petit (< 5m²)', 'Moyen (5-15m²)', 'Grand (15-30m²)', 'Très grand (> 30m²)'];
  const priceRanges = ['< 10€/jour', '10-20€/jour', '20-30€/jour', '30-50€/jour', '> 50€/jour'];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (searchQuery) params.set('q', searchQuery);
    if (selectedTypes.length > 0) {
      params.set('type', selectedTypes[0]);
    }
    if (startDate) params.set('startDate', startDate.toISOString());
    if (endDate) params.set('endDate', endDate.toISOString());
    if (selectedSize) params.set('size', selectedSize);
    if (selectedPriceRange) params.set('price', selectedPriceRange);
    if (access24h) params.set('access24h', 'true');
    params.set('showFilters', 'true');
    
    router.push(`/search-parkings?${params.toString()}`);
  };

  const toggleType = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t: string) => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(newTypes);
  };

  return (
    <div className="relative bg-white pt-16 pb-8 md:pt-20 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-900 mb-6 tracking-tight">
            Trouvez votre espace idéal
          </h1>
        </div>

        {/* Barre de recherche avancée */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 md:p-6">
            {/* Recherche principale */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un espace..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="w-full pl-12 pr-4 py-3 text-base border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Rechercher
              </button>
            </div>

            {/* Filtres visibles */}
            <div className="space-y-4">
              {/* Première ligne de filtres */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Type d'espace */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Type d&apos;Espace</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleType('parking')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 transition-all font-semibold ${
                        selectedTypes.includes('parking')
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-slate-50'
                      }`}
                    >
                      <Car className={`w-4 h-4 ${selectedTypes.includes('parking') ? 'text-emerald-600' : 'text-slate-600'}`} />
                      <span className="text-sm">Parking</span>
                    </button>
                    <button
                      onClick={() => toggleType('storage')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 transition-all font-semibold ${
                        selectedTypes.includes('storage')
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-slate-50'
                      }`}
                    >
                      <Box className={`w-4 h-4 ${selectedTypes.includes('storage') ? 'text-emerald-600' : 'text-slate-600'}`} />
                      <span className="text-sm">Box</span>
                    </button>
                    <button
                      onClick={() => toggleType('cellar')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 transition-all font-semibold ${
                        selectedTypes.includes('cellar')
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-400 hover:bg-slate-50'
                      }`}
                    >
                      <Warehouse className={`w-4 h-4 ${selectedTypes.includes('cellar') ? 'text-emerald-600' : 'text-slate-600'}`} />
                      <span className="text-sm">Cave</span>
                    </button>
                  </div>
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Ville</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={city || ''}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                    >
                      <option value="">Toutes les villes</option>
                      {popularCities.map((c) => (
                        <option key={c.name} value={c.name}>{c.name} ({c.postalCode})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Taille */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Taille</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  >
                    <option value="">Toutes les tailles</option>
                    {sizeOptions.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                {/* Tarif */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Tarif</label>
                  <select
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  >
                    <option value="">Tous les tarifs</option>
                    {priceRanges.map((price) => (
                      <option key={price} value={price}>{price}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Deuxième ligne - Options */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={access24h}
                    onChange={(e) => setAccess24h(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-700">Accès 24h/24</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

