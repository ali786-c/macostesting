'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  containerId?: string;
}

export function Portal({ children, containerId = 'portal-root' }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Créer le conteneur portal s'il n'existe pas
    let portalContainer = document.getElementById(containerId);
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = containerId;
      portalContainer.style.position = 'fixed';
      portalContainer.style.top = '0';
      portalContainer.style.left = '0';
      portalContainer.style.zIndex = '9999';
      portalContainer.style.pointerEvents = 'none';
      portalContainer.style.isolation = 'isolate'; // Créer un nouveau stacking context
      document.body.appendChild(portalContainer);
    }

    return () => {
      // Ne pas supprimer le container au démontage pour éviter les problèmes de réinitialisation
    };
  }, [containerId]);

  if (!mounted || typeof document === 'undefined') return null;

  const container = document.getElementById(containerId);
  if (!container) return null;

  return createPortal(children, container);
}
