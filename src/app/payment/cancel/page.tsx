'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import FooterNavigation from '@/components/sections/footer-navigation';
import { XCircle, ArrowLeft } from 'lucide-react';
import { reservationsAPI } from '@/services/api';

function PaymentCancelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [cancelDone, setCancelDone] = useState(false);

  // Annuler la réservation côté back quand l'utilisateur revient sans payer (retour depuis Stripe)
  useEffect(() => {
    if (!orderId || cancelDone) return;
    const id = parseInt(orderId, 10);
    if (Number.isNaN(id)) return;
    setCancelDone(true);

    const doCancel = (attempt: number) => {
      reservationsAPI
        .cancel(id)
        .then(() => {
          console.log('[PAYMENT CANCEL] Réservation annulée:', id);
        })
        .catch((err) => {
          console.warn('[PAYMENT CANCEL] Annulation réservation (tentative', attempt, '):', err?.message || err);
          if (attempt < 2) {
            setTimeout(() => doCancel(attempt + 1), 1500);
          }
        });
    };
    doCancel(1);
  }, [orderId, cancelDone]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNavigation />
      
      <main className="flex-1 flex items-start justify-center px-4 pt-24 pb-20 md:pb-12 mobile-page-main" style={{ paddingTop: 'max(6rem, env(safe-area-inset-top, 0px))', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center mt-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-orange-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Paiement annulé
          </h1>
          
          <p className="text-slate-600 mb-6">
            Vous avez annulé le processus de paiement. Aucun montant n'a été débité.
          </p>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800">
              Si vous souhaitez finaliser votre réservation, vous pouvez réessayer à tout moment.
            </p>
          </div>
          
          <div className="space-y-3">
            <Link
              href="/reservations"
              prefetch={false}
              onClick={(e) => handleCapacitorLinkClick(e, '/reservations', router)}
              className="block w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voir mes réservations
            </Link>
          </div>
        </div>
      </main>

      <FooterNavigation />
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-slate-50">
        <HeaderNavigation />
        <main className="flex-1 flex items-center justify-center mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <p className="text-slate-500">Chargement...</p>
        </main>
        <FooterNavigation />
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}
