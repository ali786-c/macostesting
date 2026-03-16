'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { isMobileOrCapacitor } from '@/lib/capacitor';

/** Zone en px depuis le bord gauche pour initier le geste (comme iOS). */
const EDGE_ZONE = 30;
/** Distance horizontale minimale (px) pour valider le swipe retour. */
const MIN_SWIPE_DISTANCE = 60;
/** Le swipe doit être plus horizontal que vertical (ratio). */
const HORIZONTAL_RATIO = 1.5;

/**
 * Geste "swipe from left edge" pour revenir en arrière sur mobile.
 * Imite le comportement natif iOS/Android.
 */
export default function SwipeBackGesture() {
  const router = useRouter();
  const ref = useRef({
    startX: 0,
    startY: 0,
    isTracking: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !isMobileOrCapacitor()) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      // Démarre uniquement si le doigt touche la zone gauche
      if (touch.clientX <= EDGE_ZONE) {
        ref.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          isTracking: true,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!ref.current.isTracking) return;
      // Si l'utilisateur déplace beaucoup vers le bas/haut, annuler (c'est un scroll)
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - ref.current.startX;
      const deltaY = touch.clientY - ref.current.startY;
      if (Math.abs(deltaY) > Math.abs(deltaX) * HORIZONTAL_RATIO) {
        ref.current.isTracking = false;
      }
    };

    const handleTouchCancel = () => {
      ref.current.isTracking = false;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!ref.current.isTracking) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - ref.current.startX;
      const deltaY = touch.clientY - ref.current.startY;
      ref.current.isTracking = false;

      // Swipe vers la droite (bord gauche → centre) et suffisamment horizontal
      if (
        deltaX >= MIN_SWIPE_DISTANCE &&
        Math.abs(deltaX) >= Math.abs(deltaY) * HORIZONTAL_RATIO
      ) {
        if (window.history.length > 1) {
          router.back();
        }
      }
    };

    const doc = document;
    doc.addEventListener('touchstart', handleTouchStart, { passive: true });
    doc.addEventListener('touchmove', handleTouchMove, { passive: true });
    doc.addEventListener('touchend', handleTouchEnd, { passive: true });
    doc.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      doc.removeEventListener('touchstart', handleTouchStart);
      doc.removeEventListener('touchmove', handleTouchMove);
      doc.removeEventListener('touchend', handleTouchEnd);
      doc.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [router]);

  return null;
}
