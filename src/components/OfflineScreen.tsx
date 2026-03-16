'use client';

import { useState, useEffect } from 'react';

/**
 * Affiche un bandeau ou écran offline quand le réseau est indisponible.
 * En Capacitor on peut utiliser @capacitor/network pour plus de fiabilité (optionnel).
 */
export default function OfflineScreen() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    setOffline(!navigator.onLine);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900/95 text-white p-6 safe-area-inset"
      role="alert"
      aria-live="polite"
    >
      <div className="text-6xl mb-4" aria-hidden>
        📡
      </div>
      <h2 className="text-xl font-semibold mb-2">Pas de connexion</h2>
      <p className="text-center text-gray-300 mb-6">
        Vérifiez votre connexion internet et réessayez.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium"
      >
        Réessayer
      </button>
    </div>
  );
}
