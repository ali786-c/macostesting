'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { translations, Language } from '@/lib/i18n';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import InstagramIcon from './InstagramIcon';

interface FooterProps {
  language: Language;
}

export default function Footer({ language }: FooterProps) {
  const router = useRouter();
  const t = translations[language].footer;

  return (
    <footer className="w-full bg-gradient-to-br from-orange-50 to-orange-100 py-3 md:py-8 px-4 md:px-6 lg:px-20 overflow-x-hidden">
      <div className="w-full max-w-[1440px] mx-auto">
        {/* Mobile: single column, Tablet+: 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-6">
          {/* Useful Links */}
          <div className="flex flex-col gap-1 md:gap-2">
            <h3 className="text-xs md:text-lg font-bold text-gray-800">{t.usefulLinks}</h3>
            <ul className="flex flex-col gap-0.5 md:gap-1">
              <li>
                <Link href="/cgu" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/cgu', router)} className="text-[10px] md:text-base text-gray-600 hover:text-orange-500 transition-colors">
                  {t.cgu}
                </Link>
              </li>
              <li>
                <Link href="/legal" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/legal', router)} className="text-[10px] md:text-base text-gray-600 hover:text-orange-500 transition-colors">
                  {t.legal}
                </Link>
              </li>
              <li>
                <Link href="/help" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/help', router)} className="text-[10px] md:text-base text-gray-600 hover:text-orange-500 transition-colors">
                  {t.support}
                </Link>
              </li>
              <li>
                <Link href="/faq" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/faq', router)} className="text-[10px] md:text-base text-gray-600 hover:text-orange-500 transition-colors">
                  {t.faq}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-1 md:gap-2">
            <h3 className="text-xs md:text-lg font-bold text-gray-800">{t.contact}</h3>
            <ul className="flex flex-col gap-0.5 md:gap-1">
              <li className="text-[10px] md:text-base text-gray-600">contact@influencehub.fr</li>
              <li className="text-[10px] md:text-base text-gray-600">+33 1 23 45 67 89</li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="flex flex-col gap-1 md:gap-2">
            <h3 className="text-xs md:text-lg font-bold text-gray-800">{t.followUs}</h3>
            <div className="flex gap-2 md:gap-4">
              <a
                href="#"
                className="group transition-all duration-300 flex items-center justify-center"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform duration-300" />
              </a>
              <a
                href="#"
                className="group transition-all duration-300 flex items-center justify-center"
                aria-label="LinkedIn"
              >
                <svg width="20" height="20" className="md:w-6 md:h-6 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 1H0.996875C0.446875 1 0 1.45313 0 2.00938V13.9906C0 14.5469 0.446875 15 0.996875 15H13C13.55 15 14 14.5469 14 13.9906V2.00938C14 1.45313 13.55 1 13 1ZM4.23125 13H2.15625V6.31875H4.23438V13H4.23125ZM3.19375 5.40625C2.52812 5.40625 1.99063 4.86562 1.99063 4.20312C1.99063 3.54063 2.52812 3 3.19375 3C3.85625 3 4.39687 3.54063 4.39687 4.20312C4.39687 4.86875 3.85938 5.40625 3.19375 5.40625ZM12.0094 13H9.93437V9.75C9.93437 8.975 9.91875 7.97813 8.85625 7.97813C7.775 7.97813 7.60938 8.82188 7.60938 9.69375V13H5.53438V6.31875H7.525V7.23125H7.55312C7.83125 6.70625 8.50938 6.15312 9.51875 6.15312C11.6187 6.15312 12.0094 7.5375 12.0094 9.3375V13Z" fill="#6B7280"/>
                </svg>
              </a>
              <a
                href="#"
                className="group transition-all duration-300 flex items-center justify-center"
                aria-label="Twitter"
              >
                <svg width="20" height="20" className="md:w-6 md:h-6 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.3553 4.74113C14.3655 4.88325 14.3655 5.02541 14.3655 5.16753C14.3655 9.50253 11.066 14.4975 5.03553 14.4975C3.17766 14.4975 1.45178 13.9594 0 13.0254C0.263969 13.0558 0.51775 13.066 0.791875 13.066C2.32484 13.066 3.73603 12.5483 4.86294 11.665C3.42131 11.6345 2.21319 10.6904 1.79694 9.39088C2 9.42131 2.20303 9.44163 2.41625 9.44163C2.71066 9.44163 3.00509 9.401 3.27919 9.32997C1.77666 9.02538 0.649719 7.7056 0.649719 6.11169V6.07109C1.08625 6.31475 1.59391 6.46703 2.13194 6.48731C1.24869 5.89847 0.670031 4.89341 0.670031 3.75634C0.670031 3.14722 0.832438 2.58884 1.11672 2.10153C2.73094 4.09138 5.15734 5.39084 7.87813 5.533C7.82738 5.28934 7.79691 5.03556 7.79691 4.78175C7.79691 2.97463 9.25884 1.50256 11.0761 1.50256C12.0203 1.50256 12.873 1.8985 13.472 2.53809C14.2131 2.39597 14.9238 2.12184 15.5533 1.74622C15.3096 2.50766 14.7918 3.14725 14.1116 3.55331C14.7715 3.48228 15.4111 3.2995 15.9999 3.04572C15.5533 3.69544 14.9949 4.27409 14.3553 4.74113Z" fill="#6B7280"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-2 md:pt-4 border-t border-orange-200">
          <p className="text-[10px] md:text-base text-gray-600 text-center">
            © 2026 InfluConnect. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
