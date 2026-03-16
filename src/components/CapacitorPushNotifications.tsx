'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isCapacitor, safePush } from '@/lib/capacitor';
import * as storage from '@/lib/storage';
import { addPushListeners, registerForPushNotifications } from '@/lib/push-notifications';

/**
 * Initialise les notifications push sur iOS/Android quand l'utilisateur est connecté.
 * - Enregistre les listeners (token → backend, clic → navigation).
 * - Demande les permissions et enregistre FCM/APNs.
 * - Réagit à auth-state-changed pour enregistrer le token après login/signup.
 */
export default function CapacitorPushNotifications() {
  const router = useRouter();
  const initialized = useRef(false);

  const runInit = async () => {
    const userId = storage.getItem('userId');
    if (!userId || initialized.current) return;
    initialized.current = true;
    try {
      await addPushListeners((path) => {
        safePush(router, path);
      });
      await registerForPushNotifications();
    } catch (e) {
      console.error('[CapacitorPushNotifications] init error:', e);
      initialized.current = false;
    }
  };

  const registerTokenOnly = async () => {
    const userId = storage.getItem('userId');
    if (!userId) return;
    try {
      await registerForPushNotifications();
    } catch (e) {
      console.error('[CapacitorPushNotifications] registerTokenOnly error:', e);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !isCapacitor()) return;
    runInit();

    const handleAuthChanged = () => {
      if (!initialized.current) {
        runInit();
      } else {
        registerTokenOnly();
      }
    };
    window.addEventListener('auth-state-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-state-changed', handleAuthChanged);
  }, [router]);

  return null;
}
