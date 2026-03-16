'use client';

import { X, Send } from 'lucide-react';

interface QuoteForm {
  title: string;
  description: string;
  price: string;
  duration: string;
}

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: QuoteForm) => void;
  form: QuoteForm;
  onFormChange: (form: QuoteForm) => void;
}

export default function QuoteModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onFormChange,
}: QuoteModalProps) {
  if (!isOpen) return null;

  const handleSubmit = () => {
    if (form.title && form.price && form.duration) {
      onSubmit(form);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-0 md:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-2xl md:rounded-2xl p-4 md:p-8 max-w-lg w-full md:mx-4 max-h-[90vh] md:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in-95 duration-300 flex flex-col"
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">Envoyer un devis</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4 md:space-y-6 flex-1 overflow-y-auto min-h-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre du devis *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              placeholder="Ex: Collaboration 3 stories + 1 post"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix (€) *
            </label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => onFormChange({ ...form, price: e.target.value })}
              placeholder="2000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Délai de livraison *
            </label>
            <input
              type="text"
              value={form.duration}
              onChange={(e) => onFormChange({ ...form, duration: e.target.value })}
              placeholder="Ex: 7 jours"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              placeholder="Ex: Délai 7 jours, visibilité en story + post"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 md:gap-4 mt-6 md:mt-8 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium touch-manipulation"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.title || !form.price || !form.duration}
            className="flex-1 px-4 py-3 min-h-[44px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <Send className="w-4 h-4" />
            Envoyer le devis
          </button>
        </div>
      </div>
    </div>
  );
}

