'use client';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Page legacy mes-annonces : redirection vers /host/my-places.
 * Cette route était utilisée par l'ancien module Influconnect (annonces/candidatures).
 * Easypark/Rentoall utilise /host/my-places pour les espaces à louer.
 * Évite les appels aux APIs /announcements qui n'existent pas sur le backend.
 */
export default function MesAnnoncesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (isCapacitor()) { capacitorNavigate('/host/my-places'); } else { router.replace('/host/my-places'); }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 overflow-x-hidden pb-mobile-footer md:pb-0">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600" />
    </div>
  );
}
