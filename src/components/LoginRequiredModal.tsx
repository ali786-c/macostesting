'use client';

import { useEffect, useRef } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import { registerModalClose, unregisterModalClose } from '@/lib/capacitor-modal-back';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actionText?: string;
}

export default function LoginRequiredModal({
  isOpen,
  onClose,
  title = 'Connexion requise',
  message = 'Vous devez être connecté pour effectuer cette action.',
  actionText = 'réserver'
}: LoginRequiredModalProps) {
  const router = useRouter();
  const registeredHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const handler = () => onClose();
    registeredHandlerRef.current = handler;
    registerModalClose(handler);
    return () => {
      if (registeredHandlerRef.current) {
        unregisterModalClose(registeredHandlerRef.current);
        registeredHandlerRef.current = null;
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = () => {
    // Sauvegarder l'URL actuelle pour rediriger après connexion
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    router.push('/auth/login');
  };

  const handleSignup = () => {
    // Sauvegarder l'URL actuelle pour rediriger après inscription
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    router.push('/auth/signup');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-stretch md:items-center justify-center p-0 md:p-4"
        onClick={onClose}
      >
        {/* Modal - Mobile: full screen | Desktop: centered */}
        <div
          className="bg-white w-full max-w-md h-full min-h-[100dvh] md:min-h-0 md:h-auto rounded-none md:rounded-2xl shadow-2xl md:mx-4 overflow-hidden flex flex-col animate-in slide-in-from-bottom md:zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2D5016] to-[#43a047] px-4 md:px-6 py-4 md:py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                  <LogIn className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base md:text-lg font-bold text-white truncate">{title}</h3>
                  <p className="text-xs md:text-sm text-white/90">Merci de vous connecter</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-white/80 transition-colors p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center touch-manipulation flex-shrink-0"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:pb-6">
            <p className="text-sm md:text-base text-[#717171] mb-6 text-center">
              {message}
            </p>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-[#2D5016] to-[#43a047] hover:from-[#233e11] hover:to-[#2e7d32] text-white font-semibold py-3 px-4 min-h-[44px] md:min-h-0 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg touch-manipulation"
              >
                <LogIn className="w-5 h-5" />
                Se connecter
              </button>

              <button
                onClick={handleSignup}
                className="w-full bg-white border-2 border-[#2D5016] text-[#2D5016] hover:bg-[#2D5016] hover:text-white font-semibold py-3 px-4 min-h-[44px] md:min-h-0 rounded-lg transition-all flex items-center justify-center gap-2 touch-manipulation"
              >
                <UserPlus className="w-5 h-5" />
                Créer un compte
              </button>
            </div>

            <p className="text-xs text-[#717171] text-center mt-4">
              En créant un compte, vous acceptez nos{' '}
              <Link href="/cgu" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/cgu', router)} className="text-[#2D5016] hover:underline">
                Conditions Générales d&apos;Utilisation
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
