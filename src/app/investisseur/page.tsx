'use client';

import { ArrowLeft, TrendingUp, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FooterNavigation from '@/components/sections/footer-navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import { investorInquiryAPI, type InvestorInquiryDTO } from '@/services/api';

export default function InvestisseurPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<InvestorInquiryDTO>({
    firstName: '',
    lastName: '',
    email: '',
    amount: 0,
    reason: '',
    linkedInUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await investorInquiryAPI.submit({
        ...form,
        amount: Number(form.amount) || 0,
        linkedInUrl: form.linkedInUrl?.trim() || undefined,
      });
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Vous pouvez nous contacter à contact@rentoall.com.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-mobile-footer md:pb-0">
      <HeaderNavigation />
      <main
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mobile-page-main overflow-x-hidden"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)',
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)',
        }}
      >
        <Link
          href="/"
          prefetch={false}
          onClick={(e) => handleCapacitorLinkClick(e, '/', router)}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 mb-8 touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* En-tête */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-8 sm:px-8 sm:py-10 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 bg-white/20 rounded-full text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              Opportunité d&apos;investissement
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">Devenez investisseur</h1>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed">
              Rentoall révolutionne la location d&apos;espaces (parkings, caves, stockage). Rejoignez notre tour de table et participez à la croissance d&apos;une plateforme déjà plébiscitée par des milliers d&apos;utilisateurs.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Send className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Demande envoyée</h2>
                <p className="text-slate-600 mb-6">
                  Nous avons bien reçu votre demande. Notre équipe vous recontactera rapidement.
                </p>
                <Link
                  href="/"
                  prefetch={false}
                  onClick={(e) => handleCapacitorLinkClick(e, '/', router)}
                  className="inline-flex items-center gap-2 text-emerald-600 font-medium hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à l&apos;accueil
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Formulaire de contact investisseurs</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Prénom <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                        placeholder="Dupont"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="jean.dupont@exemple.fr"
                    />
                  </div>

                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Montant envisagé (€) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="amount"
                      type="number"
                      required
                      min={1}
                      value={form.amount || ''}
                      onChange={(e) => setForm((f) => ({ ...f, amount: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="50000"
                    />
                  </div>

                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Pourquoi souhaitez-vous investir ? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="reason"
                      required
                      rows={4}
                      value={form.reason}
                      onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-y min-h-[100px]"
                      placeholder="Quelques mots sur votre intérêt pour Rentoall..."
                    />
                  </div>

                  <div>
                    <label htmlFor="linkedInUrl" className="block text-sm font-medium text-slate-700 mb-1.5">
                      LinkedIn ou profil professionnel (optionnel)
                    </label>
                    <input
                      id="linkedInUrl"
                      type="url"
                      value={form.linkedInUrl || ''}
                      onChange={(e) => setForm((f) => ({ ...f, linkedInUrl: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold rounded-xl transition-colors min-h-[44px] touch-manipulation"
                  >
                    {loading ? (
                      <span className="animate-pulse">Envoi en cours...</span>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Envoyer ma demande
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
      <FooterNavigation />
    </div>
  );
}
