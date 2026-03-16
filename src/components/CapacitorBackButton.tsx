'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isCapacitor } from '@/lib/capacitor';
import { handleBackButton } from '@/lib/capacitor-modal-back';

declare global {
  interface Window {
    Capacitor?: {
      Plugins?: {
        App?: {
          addListener: (
            event: string,
            handler: () => void
          ) => Promise<{ remove: () => void }>;
        };
      };
    };
  }
}

/**
 * Écoute le bouton retour matériel Android (Capacitor).
 * Ferme d'abord une modale ouverte (si enregistrée) avant de naviguer en arrière.
 */
export default function CapacitorBackButton() {
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitor() || typeof window === 'undefined') return;

    const App = window.Capacitor?.Plugins?.App;
    if (!App) return;

    let remove: (() => void) | undefined;

    App.addListener('backButton', () => {
      if (handleBackButton()) return;
      router.back();
    })
      .then((listener) => {
        remove = () => listener.remove();
      })
      .catch(() => {});

    return () => {
      remove?.();
    };
  }, [router]);

  return null;
}
