'use client';

import { ArrowLeft, Search, HelpCircle, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FooterNavigation from '@/components/sections/footer-navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import { handleCapacitorLinkClick } from '@/lib/capacitor';

export default function HelpPage() {
  const router = useRouter();
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const faqData = [
    {
      category: "Compte et profil",
      questions: [
        { question: "Comment créer un compte Rentoall ?", answer: "Cliquez sur S'inscrire, remplissez le formulaire avec vos informations. Vous pourrez réserver ou mettre vos espaces en location." },
        { question: "Comment modifier mon profil ?", answer: "Allez dans Profil ou Paramètres depuis le menu pour modifier vos informations et préférences." },
        { question: "Comment supprimer mon compte ?", answer: "Dans Paramètres > Sécurité > Supprimer mon compte. Confirmez en tapant SUPPRIMER. Action irréversible." }
      ]
    },
    {
      category: "Recherche et réservation",
      questions: [
        { question: "Comment rechercher un parking ou une cave ?", answer: "Utilisez la barre de recherche : ville, dates et type d'espace. Les résultats s'affichent sur la carte et en liste." },
        { question: "Quels types d'espaces sont disponibles ?", answer: "Parkings, caves et box de stockage. Filtrez par type, prix et équipements (recharge, accès 24h...)." },
        { question: "Comment réserver ?", answer: "Sélectionnez les dates sur la fiche, puis Réserver. Message au propriétaire possible, ou réservation directe si instantanée." }
      ]
    },
    {
      category: "Propriétaires",
      questions: [
        { question: "Comment mettre mon espace en location ?", answer: "Mode Hôte > Mettre mon espace en ligne. Remplissez photos, description, tarifs et disponibilités." },
        { question: "Comment gérer les réservations ?", answer: "Réservations ou Agenda : demandes en attente, confirmations, calendrier. Acceptez ou refusez les demandes." },
        { question: "Quand suis-je payé ?", answer: "Paiements sécurisés. Le montant est débité à la réservation et versé selon les conditions (généralement après la location)." }
      ]
    },
    {
      category: "Paiements et annulations",
      questions: [
        { question: "Quels moyens de paiement ?", answer: "Cartes bancaires (CB, Visa, Mastercard). Paiements sécurisés." },
        { question: "Comment annuler une réservation ?", answer: "Réservations > sélectionner > Annuler. Les conditions de remboursement dépendent de la politique de l'annonce." }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNavigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <Link href="/" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/', router)} className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Centre d&apos;aide</h2>
              <div className="space-y-2">
                <Link href="/faq" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/faq', router)} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <HelpCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-slate-700">FAQ</span>
                </Link>
                <Link href="/search-parkings" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/search-parkings', router)} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <Search className="w-5 h-5 text-emerald-600" />
                  <span className="text-slate-700">Rechercher un espace</span>
                </Link>
                <Link href="/messages" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/messages', router)} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <span className="text-slate-700">Contacter le support</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-8">Centre d&apos;aide Rentoall</h1>
              <div className="space-y-6">
                {faqData.map((category, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleSection(category.category)}
                      className="w-full p-6 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                    >
                      <h2 className="text-lg font-semibold text-slate-900">{category.category}</h2>
                      {openSections[category.category] ? (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                    {openSections[category.category] && (
                      <div className="p-6 space-y-4">
                        {category.questions.map((item, qIdx) => (
                          <div key={qIdx} className="border-b border-slate-100 pb-4 last:border-b-0">
                            <h3 className="font-semibold text-slate-900 mb-2">{item.question}</h3>
                            <p className="text-slate-700 leading-relaxed">{item.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-12 p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Besoin d&apos;aide ?</h2>
                <p className="text-slate-600 mb-4">Notre équipe est à votre disposition</p>
                <Link href="/messages" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/messages', router)} className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                  Contacter le support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterNavigation />
    </div>
  );
}
