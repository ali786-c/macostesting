'use client';

import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface CopyToastProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function CopyToast({ visible, message, onDismiss, duration = 2000 }: CopyToastProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700/50">
        <div className="w-8 h-8 rounded-full bg-emerald-500/90 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">{message}</span>
      </div>
    </div>
  );
}
