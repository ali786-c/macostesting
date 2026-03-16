'use client';

import dynamic from 'next/dynamic';

// Import dynamique pour éviter les erreurs SSR avec Leaflet
export const Map = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-slate-100 flex items-center justify-center">
      <div className="text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

export default Map;
