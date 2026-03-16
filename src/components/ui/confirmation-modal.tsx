'use client';

import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { registerModalClose, unregisterModalClose } from '@/lib/capacitor-modal-back';

export interface CancellationInfo {
  policy: string; // Texte de la politique d'annulation
  refundAmount?: number; // Montant remboursable (hors frais)
  totalAmount: number; // Montant total de la réservation
  serviceFee?: number; // Frais de service
  isRefundable: boolean; // Si l'annulation est possible
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: 'red' | 'emerald' | 'blue';
  isLoading?: boolean;
  cancellationInfo?: CancellationInfo; // Informations sur les modalités d'annulation
  /** 'warning' = icône alerte (défaut), 'success' = icône validation verte */
  variant?: 'warning' | 'success';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation',
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmButtonColor = 'red',
  isLoading = false,
  cancellationInfo,
  variant = 'warning',
}: ConfirmationModalProps) {
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

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  const isSuccess = variant === 'success';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={onClose}
      />
      
      {/* Modal - Mobile: full screen | Desktop: centered */}
      <div className="flex min-h-full md:min-h-0 items-stretch md:items-center justify-center p-0 md:p-4 pointer-events-none">
        <div 
          className="relative bg-white w-full max-w-md h-full min-h-[100dvh] md:min-h-0 md:h-auto md:max-h-[85vh] rounded-none md:rounded-2xl shadow-2xl overflow-y-auto flex flex-col pt-[max(1rem,env(safe-area-inset-top,0px))] md:pt-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:pb-0 pointer-events-auto cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 p-2 -m-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 touch-manipulation cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className={`mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isSuccess ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {isSuccess ? (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              )}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
              {title}
            </h3>

            {/* Message */}
            <p className="text-slate-600 text-center mb-6">
              {message}
            </p>

            {/* Modalités d'annulation */}
            {cancellationInfo && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  Modalités d'annulation
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-600 min-w-[120px]">Politique :</span>
                    <span className="text-slate-900 font-medium">{cancellationInfo.policy}</span>
                  </div>
                  {cancellationInfo.isRefundable && cancellationInfo.refundAmount !== undefined && (
                    <>
                      <div className="flex items-start gap-2">
                        <span className="text-slate-600 min-w-[120px]">Montant total :</span>
                        <span className="text-slate-900 font-medium">{cancellationInfo.totalAmount.toFixed(2)}€</span>
                      </div>
                      {cancellationInfo.serviceFee !== undefined && cancellationInfo.serviceFee > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-600 min-w-[120px]">Frais de service :</span>
                          <span className="text-slate-900 font-medium">-{cancellationInfo.serviceFee.toFixed(2)}€</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-900 font-semibold min-w-[120px]">Remboursement :</span>
                        <span className="text-emerald-600 font-bold">{cancellationInfo.refundAmount.toFixed(2)}€</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 italic">
                        Le montant remboursable est calculé hors frais de service.
                      </p>
                    </>
                  )}
                  {!cancellationInfo.isRefundable && (
                    <div className="flex items-start gap-2 pt-2 border-t border-slate-200">
                      <span className="text-red-600 font-semibold">Aucun remboursement ne sera effectué.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 min-h-[44px] text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 px-4 py-3 min-h-[44px] text-sm font-semibold text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation ${colorClasses[confirmButtonColor]} ${isLoading ? 'scale-105 py-3.5' : ''}`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validation...
                  </span>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



