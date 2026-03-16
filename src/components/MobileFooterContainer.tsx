'use client';

import { useState, useEffect } from 'react';
import { isCapacitor } from '@/lib/capacitor';
import MobileFooter from './sections/mobile-footer';

/**
 * Container qui affiche le menu en bas sur mobile ET sur Capacitor (iOS/Android).
 * Sur desktop web, le menu est masqué.
 */
export default function MobileFooterContainer() {
  const [showFooter, setShowFooter] = useState(true);

  useEffect(() => {
    const update = () => {
      const native = isCapacitor();
      const mobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
      // Toujours afficher si Capacitor OU viewport mobile
      setShowFooter(native || mobileViewport);
    };
    update();
    // Re-vérifier après 300ms (Capacitor bridge peut charger en retard)
    const t = setTimeout(update, 300);
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', update);
    };
  }, []);

  if (!showFooter) return null;

  return <MobileFooter />;
}
