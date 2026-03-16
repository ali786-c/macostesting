'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { isCapacitor, capacitorNavigate, isDynamicRoute, getCapacitorAppUrl } from '@/lib/capacitor';

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: React.ReactNode;
  /** Si fourni, utilisé pour le Link (web ou non-Capacitor). */
  onClick?: (e: React.MouseEvent) => void;
};

const NAV_GUARD_MS = 600;
/** Déplacement max (px) pour qu'un touch soit considéré comme un tap (pas un scroll). */
const SCROLL_THRESHOLD = 8;

/**
 * Lien vers une route dynamique (/parking/[id], /host/my-places/[id], etc.).
 *
 * WEB : rend toujours un <Link> Next.js normal (comportement inchangé, SPA).
 * CAPACITOR : rend un vrai <a href="..."> pour qu'iOS traite le tap comme un lien.
 * - onTouchStart : mémorise la position initiale du doigt.
 * - onTouchEnd   : navigue SEULEMENT si le doigt n'a pas bougé (tap, pas scroll).
 */
export function CapacitorDynamicLink({ href, children, onClick, className, style, onKeyDown: _onKeyDown, ...rest }: Props) {
  const lastNavRef = useRef(0);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  if (isCapacitor() && isDynamicRoute(href)) {
    const fullUrl = getCapacitorAppUrl(href);

    const doNavigate = (trigger: string) => {
      const now = Date.now();
      const sinceLastNav = now - lastNavRef.current;
      console.log(`[LINK] CapacitorDynamicLink.${trigger} | href=${href} | sinceLastNav=${sinceLastNav}ms | guarded=${sinceLastNav < NAV_GUARD_MS}`);
      if (sinceLastNav < NAV_GUARD_MS) return;
      lastNavRef.current = now;
      onClick?.({} as React.MouseEvent);
      capacitorNavigate(href);
    };

    return (
      <a
        href={fullUrl}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          e.stopPropagation();
          // Sur desktop (pas de touch), onClick seul est utilisé
          doNavigate('onClick');
        }}
        onTouchStart={(e: React.TouchEvent<HTMLAnchorElement>) => {
          const t = e.touches[0];
          touchStartPos.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e: React.TouchEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          e.stopPropagation();
          const start = touchStartPos.current;
          touchStartPos.current = null;
          if (start) {
            const t = e.changedTouches[0];
            const dx = Math.abs(t.clientX - start.x);
            const dy = Math.abs(t.clientY - start.y);
            // Si le doigt a bougé : c'est un scroll → ne pas naviguer
            if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
              console.log(`[LINK] CapacitorDynamicLink.onTouchEnd scroll détecté (dx=${dx.toFixed(0)} dy=${dy.toFixed(0)}) → annulé`);
              return;
            }
          }
          doNavigate('onTouchEnd');
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLAnchorElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            doNavigate('onKeyDown');
          }
        }}
        className={className}
        style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit', touchAction: 'pan-y', WebkitTapHighlightColor: 'transparent', ...(style as React.CSSProperties) }}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  // Web (et Capacitor sur routes non dynamiques) : Link Next.js standard, rien de spécifique
  return (
    <Link href={href} prefetch={false} onClick={onClick} className={className} style={style} {...rest}>
      {children}
    </Link>
  );
}
