'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { registerModalClose, unregisterModalClose } from '@/lib/capacitor-modal-back';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
}: ConfirmModalProps) {
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

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      buttonBg: 'bg-orange-600 hover:bg-orange-700',
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-stretch md:items-center justify-center z-[9999] p-0 md:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md h-full min-h-[100dvh] md:min-h-0 md:h-auto rounded-none md:rounded-2xl p-4 md:p-6 lg:p-8 md:mx-4 shadow-xl flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h3>
          )}
          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 hover:bg-gray-100 rounded-lg transition-colors ml-auto flex items-center justify-center touch-manipulation"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex items-start gap-3 md:gap-4 mb-6">
          <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 ${styles.iconBg} rounded-full flex items-center justify-center`}>
            <AlertTriangle className={`w-5 h-5 md:w-6 md:h-6 ${styles.iconColor}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm md:text-base text-gray-700 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 min-h-[44px] md:min-h-0 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium touch-manipulation"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-3 min-h-[44px] md:min-h-0 ${styles.buttonBg} text-white rounded-lg transition-colors font-medium touch-manipulation`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

