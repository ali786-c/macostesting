'use client';

import { useEffect } from 'react';
import { useDeviceOS } from '@/hooks/useDeviceOS';
import { isCapacitor } from '@/lib/capacitor';

/**
 * Wrapper utilisé dans le layout pour exposer la plateforme (ios | android | web)
 * via data-platform, comme dans le document de référence Capacitor.
 * Permet d’adapter l’UI (safe area, liens stores, etc.).
 */
export default function CapacitorPlatformRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  const platform = useDeviceOS();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Health check en mode Capacitor (désactivé en prod si besoin via env)
    if (isCapacitor() && process.env.NODE_ENV === 'development') {
      fetch('https://rentoall.onrender.com/api/health', { cache: 'no-store' })
        .then((r) => r.text())
        .then((t) => console.log('✅ [HEALTH] ok', t))
        .catch((e) => console.error('❌ [HEALTH] fail', e));
    }
  }, []);

  return <div data-platform={platform}>{children}</div>;
}
