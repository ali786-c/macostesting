'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Facebook, Instagram, Twitter, Heart } from 'lucide-react';
import Link from 'next/link';
import { handleCapacitorLinkClick } from '@/lib/capacitor';

export default function FooterNavigation() {
  const router = useRouter();
  return (
    <footer className="hidden md:block w-full bg-white border-t border-slate-100 shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="py-1.5 flex flex-row flex-nowrap items-center justify-center gap-x-2 text-[10px] text-slate-500 whitespace-nowrap">
          <Link href="/" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/', router)} className="font-semibold text-slate-600 hover:text-emerald-600 transition-colors shrink-0">Rentoall</Link>
          <span className="text-slate-300 shrink-0">·</span>
          <Link href="/cgu" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/cgu', router)} className="hover:text-emerald-600 transition-colors shrink-0">CGU</Link>
          <span className="text-slate-300 shrink-0">·</span>
          <Link href="/cgv" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/cgv', router)} className="hover:text-emerald-600 transition-colors shrink-0">CGV</Link>
          <span className="text-slate-300 shrink-0">·</span>
          <Link href="/mentions-legales" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/mentions-legales', router)} className="hover:text-emerald-600 transition-colors shrink-0">Mentions légales</Link>
          <span className="text-slate-300 shrink-0">·</span>
          <span className="shrink-0">© {new Date().getFullYear()} Rentoall</span>
          <span className="text-slate-300 shrink-0">·</span>
          <span className="flex items-center gap-0.5 shrink-0">Fait avec <Heart className="w-2 h-2 text-rose-400 fill-rose-400" /> en France</span>
          <span className="text-slate-300 shrink-0">·</span>
          <span className="font-medium text-slate-600 shrink-0">Français</span>
          <span className="flex items-center gap-0.5 shrink-0">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors" aria-label="Facebook"><Facebook className="w-3 h-3" strokeWidth={1.5} /></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors" aria-label="Twitter"><Twitter className="w-3 h-3" strokeWidth={1.5} /></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors" aria-label="Instagram"><Instagram className="w-3 h-3" strokeWidth={1.5} /></a>
          </span>
        </div>
      </div>
    </footer>
  );
}
