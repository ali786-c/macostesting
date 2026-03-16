'use client';

import { AlertTriangle } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Supprimer la conversation',
  message = 'Voulez-vous vraiment supprimer cette conversation ? Cette action est irréversible.',
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-stretch md:items-center justify-center z-50 p-0 md:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md h-full min-h-[100dvh] md:min-h-0 md:h-auto rounded-none md:rounded-2xl p-4 md:p-8 mx-0 md:mx-4 shadow-xl flex flex-col justify-center animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
          {title}
        </h3>
        <p className="text-gray-600 text-center mb-6 md:mb-8">
          {message}
        </p>
        <div className="flex gap-3 md:space-x-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 min-h-[44px] bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium touch-manipulation"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 min-h-[44px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium touch-manipulation"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

