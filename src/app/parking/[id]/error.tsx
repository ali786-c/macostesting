'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

/**
 * Error boundary pour la fiche parking.
 * Capture les crashs (RSC, hydration, etc.) et affiche un fallback au lieu de planter l'app.
 */
export default function ParkingDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('❌ [PARKING] Error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Impossible de charger cette fiche
        </h1>
        <p className="text-slate-600 text-sm mb-6">
          Une erreur s&apos;est produite. Vous pouvez réessayer ou retourner à la recherche.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
          >
            Réessayer
          </button>
          <Link
            href="/search-parkings"
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg"
          >
            Retour à la recherche
          </Link>
        </div>
      </div>
    </div>
  );
}
