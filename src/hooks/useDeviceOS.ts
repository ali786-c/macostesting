'use client';

import { getPlatform } from '@/lib/capacitor';

export type DeviceOS = 'ios' | 'android' | 'web';

/**
 * Hook aligné sur le document de référence Capacitor (Vite) : même API que useDeviceOS()
 * avec Device.getInfo(). Retourne la plateforme pour adapter l'UI (liens App Store/Play Store, safe area).
 */
export function useDeviceOS(): DeviceOS {
  if (typeof window === 'undefined') return 'web';
  return getPlatform();
}
