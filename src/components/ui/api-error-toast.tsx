'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

const MESSAGE = 'Veuillez réessayer plus tard.';
const DURATION_MS = 4000;

export default function ApiErrorToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      setVisible(true);
    };
    window.addEventListener('api:serverError', handler);
    return () => window.removeEventListener('api:serverError', handler);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), DURATION_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[10001] animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{
        bottom: 'max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5rem))',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-700/95 text-white text-sm rounded-xl shadow-lg border border-slate-600/50 max-w-[90vw]">
        <AlertCircle className="w-4 h-4 text-amber-300 flex-shrink-0" strokeWidth={2} />
        <span className="font-medium">{MESSAGE}</span>
      </div>
    </div>
  );
}
