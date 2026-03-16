'use client';

import { ArrowLeft, Search, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FooterNavigation from '@/components/sections/footer-navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import { FAQ_DATA } from '@/lib/chatbot/faq-data';

export default function FAQPage() {
  const router = useRouter();
  const [openQuestions, setOpenQuestions] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleQuestion = (questionId: string) => {
    setOpenQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const faqData = FAQ_DATA.map(({ id, question, answer }) => ({ id, question, answer }));

  const filteredFAQ = faqData.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNavigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <Link href="/" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/', router)} className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Questions Fréquentes</h1>
              <p className="text-slate-600">Trouvez les réponses à vos questions sur Rentoall</p>
            </div>
          </div>
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans les FAQ..."
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-4">
            {filteredFAQ.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune question trouvée</h3>
                <p className="text-slate-500">Essayez avec d&apos;autres mots-clés</p>
              </div>
            ) : (
              filteredFAQ.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleQuestion(item.id)}
                    className="w-full p-6 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <h3 className="text-base font-semibold text-slate-900 pr-4">{item.question}</h3>
                    {openQuestions[item.id] ? (
                      <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    )}
                  </button>
                  {openQuestions[item.id] && (
                    <div className="px-6 pb-6">
                      <p className="text-slate-700 leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="mt-12 p-6 bg-emerald-50 rounded-xl border border-emerald-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Vous ne trouvez pas votre réponse ?</h2>
            <p className="text-slate-600 mb-4">Notre équipe support est là pour vous aider</p>
            <Link href="/messages" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/messages', router)} className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
              Contacter le support
            </Link>
          </div>
        </div>
      </main>
      <FooterNavigation />
    </div>
  );
}
