'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isCapacitor, safePush } from '@/lib/capacitor';

/** Type pour App.addListener('appUrlOpen', ...) — évite conflit avec CapacitorBackButton (handler sans arg). */
type AppUrlOpenListener = {
  addListener: (
    event: string,
    handler: (data: { url: string }) => void
  ) => Promise<{ remove: () => void }>;
};

/**
 * Écoute les ouvertures d'URL (schéma custom ou Universal Links) et navigue vers la route.
 * Requis pour que le retour Stripe / deep links rouvre l'app au bon écran (après config native).
 */
export default function CapacitorAppUrlListener() {
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitor() || typeof window === 'undefined') return;

    const App = (window as unknown as { Capacitor?: { Plugins?: { App?: AppUrlOpenListener } } })
      .Capacitor?.Plugins?.App;
    if (!App) return;

    let remove: (() => void) | undefined;

    App.addListener('appUrlOpen', (data: { url: string }) => {
      const url = data?.url;
      if (!url) return;
      try {
        const u = new URL(url);
        const path = u.pathname + u.search;
        if (path && path !== '/' && path !== '/index.html') {
          safePush(router, path);
        }
      } catch {
        // ignore invalid URL
      }
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
