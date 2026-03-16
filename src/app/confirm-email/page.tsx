'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { rentoallUsersAPI } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token || token.trim() === '') {
      setStatus('error');
      setErrorMessage(t('confirmEmail.invalidLink'));
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);

    rentoallUsersAPI
      .confirmEmail(token.trim())
      .then(() => {
        if (cancelled) return;
        setStatus('success');
        redirectTimerRef.current = setTimeout(() => {
          router.replace('/auth/login?confirmed=true');
        }, 2500);
      })
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        if (cancelled) return;
        setStatus('error');
        const msg =
          err?.response?.data?.message ||
          (err?.response?.status === 400 ? t('confirmEmail.linkExpiredOrInvalid') : t('confirmEmail.genericError'));
        setErrorMessage(msg);
      });

    return () => {
      cancelled = true;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [searchParams, router, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 overflow-x-hidden w-full max-w-full">
      <HeaderNavigation />

      <main
        className="w-full pt-14 sm:pt-16 pb-20 sm:pb-8 mobile-page-main overflow-x-hidden"
        style={{
          paddingTop: 'max(3.5rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)',
        }}
      >
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-8rem)] px-3 sm:px-4 py-4 sm:py-6 md:py-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-6 sm:p-8">
              <div className="flex flex-col items-center text-center">
                <Image
                  src="/logoren.png"
                  alt="Rentoall"
                  width={140}
                  height={42}
                  className="h-9 sm:h-10 w-auto mb-6"
                  priority
                />

                {status === 'loading' && (
                  <>
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      {t('confirmEmail.verifying')}
                    </h1>
                    <p className="text-slate-600 text-sm">{t('confirmEmail.pleaseWait')}</p>
                  </>
                )}

                {status === 'success' && (
                  <>
                    <CheckCircle className="w-16 h-16 text-emerald-600 mb-4" />
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      {t('confirmEmail.successTitle')}
                    </h1>
                    <p className="text-slate-600 text-sm mb-6">{t('confirmEmail.successDescription')}</p>
                    <p className="text-slate-500 text-xs mb-6">{t('confirmEmail.redirectNotice')}</p>
                    <Link
                      href="/auth/login?confirmed=true"
                      className="inline-flex items-center justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                    >
                      {t('confirmEmail.goToLogin')}
                    </Link>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      {t('confirmEmail.errorTitle')}
                    </h1>
                    <p className="text-slate-600 text-sm mb-6">{errorMessage || t('confirmEmail.linkExpiredOrInvalid')}</p>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors"
                    >
                      {t('confirmEmail.backToLogin')}
                    </Link>
                  </>
                )}

                {status === 'idle' && (
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterNavigation />
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Chargement...</p>
          </div>
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}
