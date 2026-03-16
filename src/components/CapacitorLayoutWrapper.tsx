'use client';

import { useEffect, useState } from 'react';
import { isCapacitor } from '@/lib/capacitor';

/**
 * Wrapper du contenu principal du layout.
 * En mode Capacitor (iOS/Android), ajoute la classe "capacitor-app" pour que
 * le padding bas (footer + safe area) soit appliqué aussi sur tablette (ex. iPad),
 * où le viewport peut être >= 768px mais le footer reste affiché.
 */
export default function CapacitorLayoutWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [isCap, setIsCap] = useState(false);

  useEffect(() => {
    setIsCap(isCapacitor());
  }, []);

  return (
    <div className={[className, isCap ? 'capacitor-app' : ''].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
