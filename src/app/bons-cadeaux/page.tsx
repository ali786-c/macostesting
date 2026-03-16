'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { Ticket, Copy, Gift, Loader2 } from 'lucide-react';
import { referralsAPI, DiscountBonusDTO } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { capacitorNavigate, isCapacitor, isMobileOrCapacitor, handleCapacitorLinkClick } from '@/lib/capacitor';
import Link from 'next/link';
import CopyToast from '@/components/ui/copy-toast';

function getBonusReasonLabel(reason: string | undefined, t: (key: string) => string): string {
  if (!reason) return t('bonsCadeaux.reasonDefault');
  const labels: Record<string, string> = {
    PARRAINAGE_PREMIERE_RESA: t('bonsCadeaux.reasonFirstResa'),
    ACHAT_VOLUME_200: t('bonsCadeaux.reasonVolume200'),
    AFFILIATION: t('bonsCadeaux.reasonAffiliation'),
  };
  return labels[reason] || reason.replace(/_/g, ' ');
}

export default function BonsCadeauxPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [bonuses, setBonuses] = useState<DiscountBonusDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingMode, setIsCheckingMode] = useState(true);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userMode = localStorage.getItem('userMode');
      setIsCheckingMode(false);
      if (userMode === 'host') {
        router.replace(isMobileOrCapacitor() ? '/host/my-places' : '/home');
        return;
      }
    }
  }, [router]);

  useEffect(() => {
    if (isCheckingMode) return;
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const data = await referralsAPI.getDiscountBonuses(parseInt(userId, 10));
        if (!cancelled) setBonuses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erreur chargement bons cadeaux:', err);
        if (!cancelled) setBonuses([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isCheckingMode]);

  const usable = bonuses.filter(b => !b.used && b.expiresAt && new Date(b.expiresAt) >= new Date());
  const usedOrExpired = bonuses.filter(b => b.used || !b.expiresAt || new Date(b.expiresAt) < new Date());

  if (isCheckingMode) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNavigation />
      <main
        className="mobile-page-main pt-12 sm:pt-16 pb-24 md:pb-16 overflow-x-hidden"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 3rem), 3rem)',
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)',
        }}
      >
        <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('bonsCadeaux.title')}</h1>
            <p className="text-sm text-slate-600 mt-1">{t('bonsCadeaux.subtitle')}</p>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-slate-400" />
              {t('bonsCadeaux.maxPercent')}
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
              <p className="text-slate-600">{t('bonsCadeaux.loading')}</p>
            </div>
          ) : (
            <>
              {/* Bons utilisables */}
              <section className="mb-8">
                <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-emerald-600" />
                  {t('bonsCadeaux.usable')} ({usable.length})
                </h2>
                {usable.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center">
                    <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">{t('bonsCadeaux.noUsable')}</p>
                    <Link
                      href="/search-parkings"
                      prefetch={false}
                      onClick={(e) => handleCapacitorLinkClick(e, '/search-parkings', router)}
                      className="inline-block mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      {t('bonsCadeaux.searchSpaces')}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {usable.map((bonus) => {
                      const amount = bonus.amount ?? 5;
                      const displayCode = bonus.uniqueCode ?? (bonus as { code?: string }).code;
                      const expiresAt = bonus.expiresAt ? new Date(bonus.expiresAt) : null;
                      return (
                        <div
                          key={bonus.id ?? Math.random()}
                          className="bg-white rounded-xl border border-emerald-200 shadow-sm p-4 sm:p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <Ticket className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{amount.toFixed(2)} €</p>
                                <p className="text-xs text-slate-600 mt-0.5">{getBonusReasonLabel(bonus.reason, t)}</p>
                                {displayCode && (
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className="text-xs text-slate-500">{t('bonsCadeaux.code')}</span>
                                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{displayCode}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(displayCode);
                                        setShowCopiedToast(true);
                                      }}
                                      className="text-emerald-600 hover:text-emerald-700 p-0.5"
                                      title={t('bonsCadeaux.copyCode')}
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                                {expiresAt && (
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {t('bonsCadeaux.expires')} {expiresAt.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                              {t('bonsCadeaux.toUse')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Historique : utilisés / expirés */}
              {usedOrExpired.length > 0 && (
                <section>
                  <h2 className="text-base font-semibold text-slate-900 mb-3">{t('bonsCadeaux.history')}</h2>
                  <div className="space-y-3">
                    {usedOrExpired.map((bonus) => {
                      const isUsed = bonus.used === true || !!bonus.usedAt;
                      const expiresAt = bonus.expiresAt ? new Date(bonus.expiresAt) : null;
                      const isExpired = expiresAt ? expiresAt < new Date() : false;
                      const amount = bonus.amount ?? 5;
                      const displayCode = bonus.uniqueCode ?? (bonus as { code?: string }).code;
                      return (
                        <div
                          key={bonus.id ?? Math.random()}
                          className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <Ticket className="w-5 h-5 text-slate-400" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{amount.toFixed(2)} €</p>
                                <p className="text-xs text-slate-600 mt-0.5">{getBonusReasonLabel(bonus.reason, t)}</p>
                                {displayCode && (
                                  <p className="text-xs text-slate-500 mt-1 font-mono">{displayCode}</p>
                                )}
                                {isUsed && bonus.usedAt && (
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {t('bonsCadeaux.usedOn')} {new Date(bonus.usedAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {isUsed ? (
                                <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                                  {t('bonsCadeaux.used')}
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                                  {t('bonsCadeaux.expired')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {bonuses.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{t('bonsCadeaux.emptyTitle')}</h3>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto">{t('bonsCadeaux.emptyText')}</p>
                  <Link
                    href="/parametres"
                    prefetch={false}
                    onClick={(e) => handleCapacitorLinkClick(e, '/parametres', router)}
                    className="inline-block mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {t('bonsCadeaux.goToParams')}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <CopyToast
        visible={showCopiedToast}
        message={t('bonsCadeaux.copied')}
        onDismiss={() => setShowCopiedToast(false)}
      />
      <FooterNavigation />
    </div>
  );
}
