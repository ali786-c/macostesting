'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { X } from 'lucide-react';

const stripePublishableKey = typeof process !== 'undefined' 
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  : undefined;

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export interface StripeEmbeddedCheckoutProps {
  clientSecret: string;
  onClose?: () => void;
  successUrl?: string;
  /** Si true, affiche un bouton pour fermer (annulation) */
  showCloseButton?: boolean;
}

/**
 * Modal fullscreen avec Stripe Embedded Checkout.
 * Utilisé sur mobile iOS/Android pour garder le paiement dans l'app (pas de redirection).
 */
export default function StripeEmbeddedCheckout({
  clientSecret,
  onClose,
  showCloseButton = true,
}: StripeEmbeddedCheckoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Écouter les messages du checkout embarqué (quand la redirection se fait dans l'iframe)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STRIPE_PAYMENT_COMPLETE' && event.data?.url) {
        window.location.href = event.data.url;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!mounted || !clientSecret) {
    return (
      <div className="fixed inset-0 z-[10050] bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stripePromise) {
    if (typeof window !== 'undefined') {
      console.warn('[Stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY non définie. Ajoutez-la dans .env.local pour le paiement embarqué.');
    }
    return (
      <div className="fixed inset-0 z-[10050] bg-white flex flex-col items-center justify-center p-6">
        <p className="text-slate-600 text-center">Configuration Stripe manquante. Veuillez réessayer ou contacter le support.</p>
        {onClose && (
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-200 rounded-lg">Fermer</button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10050] bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {showCloseButton && onClose && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-semibold text-slate-900">Paiement sécurisé</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-slate-100 rounded-full transition-colors touch-manipulation"
            aria-label="Annuler"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
