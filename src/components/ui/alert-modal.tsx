'use client';

import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { registerModalClose, unregisterModalClose } from '@/lib/capacitor-modal-back';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonText?: string;
}

export default function AlertModal({
  isOpen,
  onClose,
  title = 'Information',
  message,
  buttonText = 'OK',
}: AlertModalProps) {
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

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto flex items-stretch md:items-center justify-center p-0 md:p-4">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-sm bg-white rounded-none md:rounded-2xl shadow-xl ring-1 ring-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col min-h-[100dvh] md:min-h-0 mx-0 md:mx-4"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="alert-modal-title"
        aria-describedby="alert-modal-desc"
      >
        <div className="p-6 text-center flex-1 flex flex-col justify-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-100/80">
            <MapPin className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 id="alert-modal-title" className="text-lg font-semibold text-slate-900 mb-2">
            {title}
          </h3>
          <p id="alert-modal-desc" className="text-sm text-slate-600 leading-relaxed mb-6">
            {message}
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 min-h-[44px] text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors cursor-pointer shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 touch-manipulation"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
