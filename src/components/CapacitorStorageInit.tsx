'use client';

import { useEffect } from 'react';
import { initFromNative, getItem } from '@/lib/storage';

type WindowWithAuth = Window & {
  __INITIAL_AUTH_STATE__?: { isLoggedIn: boolean; userType?: string; userName?: string };
};

/**
 * Au montage, restaure les clés auth depuis Capacitor Preferences vers localStorage
 * pour que l'intercepteur API et le reste de l'app retrouvent le token après cold start.
 * Met à jour __INITIAL_AUTH_STATE__ après restauration pour éviter un flash "déconnecté" (audit).
 */
export default function CapacitorStorageInit() {
  useEffect(() => {
    const run = async () => {
      await initFromNative();
      const win = typeof window !== 'undefined' ? (window as WindowWithAuth) : null;
      if (win?.__INITIAL_AUTH_STATE__) {
        const token = getItem('authToken');
        const loggedIn = getItem('finalIsLoggedIn') === 'true';
        win.__INITIAL_AUTH_STATE__ = {
          isLoggedIn: !!(token || loggedIn),
          userType: getItem('finalUserType') || undefined,
          userName: getItem('userName') || '',
        };
        window.dispatchEvent(new Event('storage'));
      }
    };
    run();
  }, []);
  return null;
}
