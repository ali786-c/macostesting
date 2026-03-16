'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { depositsAPI } from '@/services/api';

const stripePublishableKey = typeof process !== 'undefined'
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  : undefined;

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export interface DepositSetupModalProps {
  userId: number;
  reservationId: number;
  depositAmount: number;
  onSuccess: () => void;
  onClose: () => void;
}

function DepositSetupForm({
  reservationId,
  onSuccess,
  onClose,
}: {
  reservationId: number;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? window.location.href : '',
        },
        redirect: 'if_required',
      });
      if (confirmError) {
        setError(confirmError.message ?? 'Une erreur est survenue.');
        setIsSubmitting(false);
        return;
      }
      const paymentMethodId = setupIntent?.payment_method;
      if (typeof paymentMethodId !== 'string') {
        setError('Moyen de paiement non reçu.');
        setIsSubmitting(false);
        return;
      }
      await depositsAPI.savePaymentMethod(reservationId, paymentMethodId);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[DepositSetup] Erreur:', err);
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Erreur lors de l\'enregistrement.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'never', googlePay: 'never' },
        }}
      />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      <p className="text-xs text-slate-500">
        Votre carte ne sera pas débitée. Elle ne sera utilisée qu&apos;en cas de souci (dommages, etc.).
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 min-h-[44px] border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors touch-manipulation"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isSubmitting}
          className="flex-1 px-4 py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 touch-manipulation"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Enregistrer ma carte
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function DepositSetupModal({
  userId,
  reservationId,
  depositAmount,
  onSuccess,
  onClose,
}: DepositSetupModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await depositsAPI.createSetupIntent(userId, reservationId);
        const secret = data.client_secret ?? (data as { clientSecret?: string }).clientSecret;
        if (!cancelled && secret) {
          setClientSecret(secret);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[DepositSetupModal] createSetupIntent error:', err);
          setLoadError('Impossible de préparer l\'enregistrement de la carte. Réessayez ou contactez le support.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, reservationId]);

  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-[10050] bg-black/50 flex items-stretch md:items-center justify-center p-0 md:p-4">
        <div className="bg-white w-full max-w-md h-full min-h-[100dvh] md:min-h-0 md:h-auto rounded-none md:rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Configuration Stripe manquante</h2>
          <p className="text-sm text-slate-600 mb-4">
            Pour activer le paiement de la caution, ajoute ta clé publique Stripe dans le fichier <strong>.env.local</strong> :
          </p>
          <p className="text-xs font-mono bg-slate-100 p-3 rounded-lg text-slate-700 mb-4 break-all">
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Récupère la clé dans le Dashboard Stripe → Développeurs → Clés API (clé publique). Puis redémarre le serveur (npm run dev).
          </p>
          <button onClick={onClose} className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium text-slate-800">Fermer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10050] bg-black/50 flex items-stretch md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md h-full min-h-[100dvh] md:min-h-0 md:h-auto md:max-h-[90vh] rounded-none md:rounded-2xl shadow-xl overflow-hidden flex flex-col"
        style={{
          paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Caution – Enregistrer ma carte</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center touch-manipulation"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-slate-600 mb-4">
            Montant de la caution : <strong>{depositAmount.toFixed(2)} €</strong>. Elle ne sera débitée qu&apos;en cas de souci (dommages, etc.) — elle n&apos;est pas prélevée à l&apos;avance.
          </p>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          )}
          {loadError && (
            <div className="py-4">
              <p className="text-red-600 text-sm">{loadError}</p>
              <button onClick={onClose} className="mt-4 w-full py-2 bg-slate-200 rounded-lg">Fermer</button>
            </div>
          )}
          {!loading && !loadError && clientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { borderRadius: '12px' },
                },
              }}
            >
              <DepositSetupForm
                reservationId={reservationId}
                onSuccess={onSuccess}
                onClose={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
