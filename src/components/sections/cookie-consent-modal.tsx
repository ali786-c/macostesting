'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { handleCapacitorLinkClick } from '@/lib/capacitor';

function CookieConsentModalContent() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenCookie = localStorage.getItem('rentoall-cookie-consent');
    if (!hasSeenCookie) {
      setIsOpen(true);
    }
  }, []);

  const handleConsent = (type: 'all' | 'necessary' | 'manage') => {
    localStorage.setItem('rentoall-cookie-consent', type);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 backdrop-blur-[2px] transition-all duration-300 md:items-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-modal-title"
        className="relative w-full max-w-[600px] overflow-hidden rounded-t-2xl md:rounded-xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 zoom-in-95 ease-out"
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col p-6 md:p-8">
          <header className="mb-4">
            <h2 
              id="cookie-modal-title" 
              className="text-[20px] font-bold leading-[1.3] text-[#222222]"
            >
              Aidez-nous à améliorer votre expérience
            </h2>
          </header>
          
          <div className="mb-8 text-[14px] font-normal leading-[1.5] text-[#222222]">
            <p>
              Nous utilisons des cookies et d&apos;autres technologies pour personnaliser notre contenu, mesurer l&apos;efficacité de nos publicités et vous offrir une expérience optimisée. Certains cookies sont nécessaires au fonctionnement du site et ne peuvent pas être désactivés. En acceptant, vous acceptez la <Link href="/privacy" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/privacy', router)} className="font-semibold underline decoration-1 underline-offset-2 hover:text-black">Politique d&apos;Rentoall en matière de cookies</Link>. Vous pouvez mettre à jour vos préférences à tout moment.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:gap-4 md:items-stretch">
            <button
              onClick={() => handleConsent('all')}
              className="order-1 flex-1 min-h-[44px] rounded-lg bg-[#222222] px-5 py-3.5 text-center text-sm font-semibold text-white transition-transform hover:bg-black active:scale-[0.96] md:order-1 touch-manipulation"
            >
              Accepter tout
            </button>
            <button
               onClick={() => handleConsent('necessary')}
               className="order-2 flex-1 min-h-[44px] rounded-lg bg-[#484848] px-5 py-3.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.96] md:order-2 touch-manipulation"
            >
              Uniquement les cookies nécessaires
            </button>
             <button
               onClick={() => handleConsent('manage')}
               className="order-3 flex-1 min-h-[44px] rounded-lg border-[1.5px] border-[#222222] bg-white px-5 py-3.5 text-center text-sm font-semibold text-[#222222] transition-colors hover:bg-gray-50 active:scale-[0.96] md:order-3 touch-manipulation"
            >
              Gérer les préférences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CookieConsentModal() {
  return <CookieConsentModalContent />;
}
