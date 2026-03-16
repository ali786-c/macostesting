'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Shield, 
  Clock, 
  DollarSign, 
  Search, 
  Calendar, 
  CheckCircle2,
  Star,
  ArrowRight,
  Car,
  Package,
  Home,
  Users,
  Infinity,
  Sparkles,
  Zap,
  TrendingUp,
  Heart,
  CreditCard,
  ShieldCheck,
  LifeBuoy,
  UserCheck,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Gift,
  Percent,
  BadgeCheck,
  Volume2,
  VolumeX
} from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import MobileFooter from '@/components/sections/mobile-footer';
import { PARKING_LISTINGS } from '@/data/parkingListings';
import { useSearch } from '@/contexts/SearchContext';
import { FAQ_DATA } from '@/lib/chatbot/faq-data';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { isMobileOrCapacitor, isCapacitor, capacitorNavigate } from '@/lib/capacitor';

// 10 questions les plus pertinentes pour la homepage (selon rentoall.com)
const HOMEPAGE_FAQ_IDS = [
  'reserv-1',   // Comment réserver un espace ?
  'general-1',  // Rentoall est-il gratuit ?
  'search-2',   // Quels types d'espaces puis-je louer ?
  'host-1',     // Comment mettre mon espace en location ?
  'payment-1',  // Quels moyens de paiement ?
  'reserv-2',   // Comment annuler une réservation ?
  'payment-2',  // Les paiements sont-ils sécurisés ?
  'reserv-4',   // Réservation instantanée
  'search-1',   // Comment rechercher
  'general-3',  // Contacter le support
];

function HomepageFAQ() {
  const [openId, setOpenId] = useState<string | null>(null);
  const idToItem = Object.fromEntries(FAQ_DATA.map((item) => [item.id, item]));
  const faqItems = HOMEPAGE_FAQ_IDS.map((id) => idToItem[id]).filter(Boolean);
  
  return (
    <div className="space-y-2">
      {faqItems.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className="border border-slate-200 rounded-xl overflow-hidden hover:border-emerald-200 transition-colors"
          >
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-left bg-white hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-slate-900 pr-4">{item.question}</span>
              {isOpen ? (
                <ChevronDown className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-0 border-t border-slate-100">
                <p className="text-slate-600 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HomepageVideo() {
  const [muted, setMuted] = useState(true);

  return (
    <div className="mb-4 sm:mb-6 md:mb-8 max-w-4xl mx-auto px-3 sm:px-4">
      <div className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900/50 backdrop-blur-sm">
        <video
          autoPlay
          loop
          muted={muted}
          playsInline
          className="w-full h-full object-cover"
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%231e293b' width='1920' height='1080'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui' font-size='48' fill='%2367a047' text-anchor='middle' dominant-baseline='middle'%3ERentoall%3C/text%3E%3C/svg%3E"
        >
          <source src="/Homepage2.mp4" type="video/mp4" />
          Votre navigateur ne supporte pas la vidéo.
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={muted ? 'Activer le son' : 'Couper le son'}
        >
          {muted ? (
            <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>
      </div>
    </div>
  );
}

// Hook pour les animations au scroll
function useScrollAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isVisible };
}

// Composant pour les éléments animés
function AnimatedSection({ 
  children, 
  delay = 0,
  direction = 'up'
}: { 
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
}) {
  const { ref, isVisible } = useScrollAnimation();
  
  const directionClasses = {
    up: 'translate-y-12',
    down: '-translate-y-12',
    left: 'translate-x-12',
    right: '-translate-x-12',
    scale: 'scale-95'
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0 translate-x-0 scale-100' 
          : `opacity-0 ${directionClasses[direction]}`
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function HomeLandingPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isScrolled, setIsScrolled] = useState(false);
  const [dynamicStats, setDynamicStats] = useState({ spaces: 0, cities: 0, users: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  const { city, setCity, startDate, setStartDate, endDate, setEndDate, selectedTypes, setSelectedTypes } = useSearch();

  // Sur mobile / Capacitor (iOS/Android) : rediriger (pas de homepage)
  // En mode hôte → mon-calendrier. En mode client → search-parkings (évite que l'hôte voie la recherche client)
  const [isMobileRedirect, setIsMobileRedirect] = React.useState<boolean | null>(null);
  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobileOrCapacitor()) {
      setIsMobileRedirect(false);
      return;
    }
    setIsMobileRedirect(true);
    const p = window.location.pathname;
    const search = window.location.search;
    // Capacitor sert index.html (racine) comme SPA fallback pour toutes les routes.
    // Si on n'est PAS sur la racine, naviguer vers la vraie page demandée.
    // On utilise capacitorNavigate (full page load) plutôt que router.replace (SPA)
    // pour éviter la dépendance aux fichiers .txt RSC absents sur Android → boucle infinie.
    if (p !== '/' && p !== '' && p !== '/index.html') {
      console.log(`[ROOT PAGE] SPA fallback détecté → navigate vers ${p}${search}`);
      if (isCapacitor()) {
        // Garde anti-boucle : si capacitorNavigate revient sur root page avec le même chemin,
        // c'est que l'index.html de la page cible n'existe pas dans le bundle.
        // On utilise sessionStorage pour détecter la 2ème tentative et basculer sur router.replace (SPA).
        const navKey = `cap_nav_${p}`;
        const alreadyTried = sessionStorage.getItem(navKey);
        if (alreadyTried) {
          sessionStorage.removeItem(navKey);
          console.log(`[ROOT PAGE] Loop guard activé pour ${p} → router.replace`);
          router.replace(p + search);
        } else {
          sessionStorage.setItem(navKey, '1');
          capacitorNavigate(p + (search || ''));
        }
      } else {
        router.replace(p + search);
      }
      return;
    }
    // Sur la racine : vérifier l'auth avant de rediriger
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const isAuthenticated = !!(token && userId);
    if (!isAuthenticated) {
      console.log('[ROOT PAGE] Non authentifié → /search-parkings');
      if (isCapacitor()) {
        capacitorNavigate('/search-parkings');
      } else {
        router.replace('/search-parkings');
      }
      return;
    }
    const userMode = localStorage.getItem('userMode') as 'client' | 'host' | null;
    const target = userMode === 'host' ? '/mon-calendrier' : '/search-parkings';
    console.log(`[ROOT PAGE] redirect racine → ${target} (userMode=${userMode})`);
    if (isCapacitor()) {
      capacitorNavigate(target);
    } else {
      router.replace(target);
    }
  }, [router]);

  const handleStickySearch = () => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (selectedTypes.length > 0) {
      params.set('type', selectedTypes[0]);
    }
    if (startDate) params.set('startDate', startDate.toISOString());
    if (endDate) params.set('endDate', endDate.toISOString());
    router.push(`/search-parkings?${params.toString()}`);
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return t('home.dates');
    if (startDate && !endDate) {
      return `${startDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}`;
    }
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}`;
    }
    return t('home.dates');
  };

  const formatTypeDisplay = () => {
    if (selectedTypes.length === 0) return t('home.type');
    if (selectedTypes.length === 1) {
      const labels: { [key: string]: string } = {
        'parking': t('home.parking'),
        'storage': t('home.storage'),
        'cellar': t('home.cellar')
      };
      return labels[selectedTypes[0]] || t('home.type');
    }
    return t('home.multipleTypes', { count: selectedTypes.length });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    const handleScroll = () => {
      const currentRef = heroRef.current;
      if (currentRef) {
        const rect = currentRef.getBoundingClientRect();
        setIsScrolled(rect.bottom < 100);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    // Animer les stats
    const animateStats = () => {
      const targetStats = { spaces: 50000, cities: 200, users: 15000 };
      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        setDynamicStats({
          spaces: Math.floor(targetStats.spaces * easeOut),
          cities: Math.floor(targetStats.cities * easeOut),
          users: Math.floor(targetStats.users * easeOut)
        });

        if (currentStep >= steps) {
          clearInterval(interval);
          setDynamicStats(targetStats);
        }
      }, stepDuration);
    };

    animateStats();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const features = [
    {
      icon: Search,
      title: t('home.feature1Title'),
      description: t('home.feature1Description')
    },
    {
      icon: Shield,
      title: t('home.feature2Title'),
      description: t('home.feature2Description')
    },
    {
      icon: Clock,
      title: t('home.feature3Title'),
      description: t('home.feature3Description')
    },
    {
      icon: DollarSign,
      title: t('home.feature4Title'),
      description: t('home.feature4Description')
    }
  ];

  const steps = [
    {
      number: '1',
      title: t('home.step1Title'),
      description: t('home.step1Description'),
      icon: Search
    },
    {
      number: '2',
      title: t('home.step2Title'),
      description: t('home.step2Description'),
      icon: Calendar
    },
    {
      number: '3',
      title: t('home.step3Title'),
      description: t('home.step3Description'),
      icon: CheckCircle2
    }
  ];

  const stats = [
    { value: '50K+', label: t('home.statsSpaces') },
    { value: '200+', label: t('home.statsCities') },
    { value: '98%', label: t('home.statsSatisfaction') },
    { value: '24/7', label: t('home.statsSupport') }
  ];

  const types = [
    {
      icon: Car,
      title: t('home.typeParkingTitle'),
      description: t('home.typeParkingDescription'),
      color: 'bg-[#43a047]'
    },
    {
      icon: Package,
      title: t('home.typeStorageTitle'),
      description: t('home.typeStorageDescription'),
      color: 'bg-[#2d8659]'
    },
    {
      icon: Home,
      title: t('home.typeCellarTitle'),
      description: t('home.typeCellarDescription'),
      color: 'bg-[#1e3a5f]'
    }
  ];

  // Sur mobile : afficher un chargement pendant la redirection vers /search-parkings
  if (isMobileRedirect === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-white overflow-x-hidden w-full max-w-full flex flex-col"
    >
      <HeaderNavigation />
      
      {/* Bande safe area iOS : fond sombre (notch + header) pour faire descendre le contenu */}
      <div 
        className="hero-home-safe-band w-full flex-shrink-0 bg-gradient-to-b from-slate-900 via-slate-800/95 to-slate-900/90"
      />
      
      <div className="flex-1 pt-6 sm:pt-8 md:pt-10">
      {/* Hero Section avec background visuel */}
      <section 
        ref={heroRef}
        className="relative hero-home-safe-top pb-20 md:pb-28 overflow-hidden -mt-[calc(env(safe-area-inset-top,0px)+4rem)] md:mt-0"
      >
        {/* Background image avec overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/fond.jpg"
            alt="Parking urbain"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-emerald-900/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Effet de lumière qui suit la souris */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(67, 160, 71, 0.2), transparent 40%)`
          }}
        />

        <div className="relative z-20 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center max-w-5xl mx-auto">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-5 leading-tight drop-shadow-lg">
                <span className="block mb-1 sm:mb-2">Arrêtez de chercher. Trouvez l'espace parfait</span>
                <span className="block bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                  en 30 secondes chrono
                </span>
              </h1>
              
              {/* Vidéo démonstrative */}
              <HomepageVideo />
              
              <p className="text-sm sm:text-base md:text-lg text-white/90 mb-4 sm:mb-5 max-w-2xl mx-auto leading-relaxed drop-shadow-md px-3 sm:px-4">
                <span className="font-bold text-white">50 000+ espaces disponibles</span> près de chez vous. Économisez jusqu'à <span className="font-bold text-emerald-300">50%</span>.
              </p>
              <p className="text-xs sm:text-sm md:text-base text-white/80 mb-5 sm:mb-7 max-w-xl mx-auto px-3 sm:px-4">
                <span className="font-semibold text-white">98% de satisfaction</span> • <span className="font-semibold text-white">Sécurité garantie</span> • <span className="font-semibold text-white">24/7</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center mb-4 sm:mb-6 px-3 sm:px-4">
                <Link
                  href="/search-parkings"
                  className="group inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-full transition-all duration-300 shadow-2xl hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base w-full sm:w-auto justify-center touch-manipulation"
                >
                  Trouver mon espace maintenant
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </Link>
                <Link
                  href="/search-parkings"
                  className="group inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white/90 backdrop-blur-sm hover:bg-white active:bg-white text-slate-900 font-bold rounded-full border-2 border-white/50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base w-full sm:w-auto justify-center touch-manipulation"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                  <span className="hidden sm:inline">Découvrir les meilleures offres</span>
                  <span className="sm:hidden">Offres</span>
                </Link>
              </div>

              {/* Stats dynamiques - Mobile: Compact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-2xl mx-auto px-3 sm:px-4">
                {[
                  { value: dynamicStats.spaces.toLocaleString('fr-FR') + '+', label: 'Espaces', icon: MapPin },
                  { value: dynamicStats.cities + '+', label: 'Villes', icon: TrendingUp },
                  { value: dynamicStats.users.toLocaleString('fr-FR') + '+', label: 'Utilisateurs/jour', icon: Users }
                ].map((stat, i) => (
                  <AnimatedSection key={i} direction="scale" delay={300 + i * 100}>
                    <div className="text-center bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl p-2 sm:p-3 border border-white/20">
                      <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-emerald-300 mx-auto mb-1 sm:mb-1.5 flex-shrink-0" />
                      <div className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-white mb-0.5">
                        {stat.value}
                      </div>
                      <div className="text-[8px] sm:text-[9px] md:text-[10px] text-white/80">{stat.label}</div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>


      {/* Badges de confiance - Mobile: Compact */}
      <section className="py-6 sm:py-8 md:py-10 lg:py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 lg:gap-6">
            {[
              { icon: CreditCard, text: 'Paiement sécurisé', description: 'Transactions protégées' },
              { icon: ShieldCheck, text: 'Protection par caution', description: 'Couvert pour les biens qui le souhaitent' },
              { icon: LifeBuoy, text: 'Support 24/7', description: 'Assistance disponible' },
              { icon: UserCheck, text: 'Hôtes vérifiés', description: 'Profils authentifiés' }
            ].map((badge, index) => (
              <AnimatedSection key={index} direction="up" delay={100 + index * 50}>
                <div className="flex flex-col items-center text-center p-3 sm:p-4 md:p-5 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 hover:border-emerald-300 active:border-emerald-400 hover:shadow-md transition-all duration-300 group touch-manipulation active:scale-95">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-2.5 md:mb-3 group-hover:bg-emerald-100 transition-colors">
                    <badge.icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-emerald-600 flex-shrink-0" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-0.5 sm:mb-1 text-xs sm:text-sm md:text-base">{badge.text}</h3>
                  <p className="text-[10px] sm:text-xs text-slate-600">{badge.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Section P2P - Mise en avant */}
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-[#43a047] via-[#2d8659] to-[#1e6b47] overflow-hidden">
        {/* Effets visuels */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-12 md:mb-16">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-5 md:mb-6 leading-tight">
                Rejoignez la révolution du partage
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-white/90 mb-5 sm:mb-6 md:mb-7 leading-relaxed px-3 sm:px-4">
                Économisez des centaines d'euros tout en <strong>gagnant un revenu passif</strong>. Rejoignez une communauté qui grandit chaque jour.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-10">
            {[
              {
                icon: Infinity,
                title: 'Des milliers d\'opportunités',
                description: 'Trouvez l\'espace parfait en quelques secondes. <strong>Jamais plus de stress</strong>.',
                gradient: 'from-white/20 to-white/10'
              },
              {
                icon: Users,
                title: '15 000+ utilisateurs actifs',
                description: 'Rejoignez une communauté qui fait confiance à Rentoall.',
                gradient: 'from-white/20 to-white/10'
              },
              {
                icon: Zap,
                title: 'Réservation instantanée',
                description: 'Réservez et accédez <strong>dans les 5 minutes</strong>.',
                gradient: 'from-white/20 to-white/10'
              }
            ].map((item, index) => (
              <AnimatedSection key={index} direction="up" delay={200 + index * 100}>
                <div className="relative group bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 hover:bg-white/15 active:bg-white/20 transition-all duration-500 hover:scale-105 active:scale-95 touch-manipulation">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br ${item.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white flex-shrink-0" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-3 sm:mb-3.5">
                    {item.title}
                  </h3>
                  <p className="text-white/80 text-sm sm:text-base md:text-lg leading-relaxed">
                    {item.description.split('<strong>').map((part, i, arr) => {
                      if (i === 0) return part;
                      const [strongText, rest] = part.split('</strong>');
                      return (
                        <React.Fragment key={i}>
                          <strong className="font-bold text-white">{strongText}</strong>
                          {rest}
                        </React.Fragment>
                      );
                    })}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection direction="scale" delay={500}>
            <div className="text-center">
              <Link
                href="/search-parkings"
                className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-white hover:bg-gray-50 active:bg-gray-100 text-[#43a047] font-bold rounded-full transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95 text-sm sm:text-base md:text-lg touch-manipulation"
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="text-xs sm:text-sm md:text-base lg:text-lg">Voir les meilleures offres maintenant</span>
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Types Section */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#222222] mb-4 sm:mb-5">
                Trois solutions. Un seul objectif : <span className="text-emerald-600">résoudre votre problème</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-[#717171] max-w-2xl mx-auto">
                Parking, box ou cave — <strong className="text-[#222222]">trouvez l'espace parfait</strong> parmi des milliers d'options vérifiées. <strong className="text-emerald-600">Réservez maintenant</strong> et économisez dès aujourd'hui.
              </p>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {types.map((type, index) => (
              <AnimatedSection key={index} direction="up" delay={100 + index * 100}>
                <div className="group relative bg-white border-2 border-[#DDDDDD] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 hover:border-[#43a047] transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
                  {/* Effet de brillance au survol */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  <div className={`${type.color} w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 md:mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                    <type.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#222222] mb-3 sm:mb-4">
                    {type.title}
                  </h3>
                  <p className="text-[#717171] text-sm sm:text-base md:text-lg">
                    {type.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#F7F7F7] to-white relative overflow-hidden">
        {/* Décorations */}
        <div className="absolute top-20 right-10 w-64 h-64 bg-[#43a047]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-[#2d8659]/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#222222] mb-4 sm:mb-5">
                Pourquoi <span className="text-emerald-600">15 000+ utilisateurs</span> font confiance à Rentoall ?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-[#717171] max-w-2xl mx-auto">
                <strong className="text-[#222222]">La solution qui change votre quotidien</strong> : économisez de l'argent, gagnez du temps, <strong className="text-emerald-600">rejoignez la révolution</strong> du partage d'espaces.
              </p>
            </div>
          </AnimatedSection>
          {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <AnimatedSection key={index} direction="scale" delay={100 + index * 100}>
                <div className="group relative bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-[#DDDDDD]/50">
                  {/* Effet de brillance */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#43a047]/5 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 bg-gradient-to-br from-[#43a047]/10 to-[#2d8659]/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 md:mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                      <feature.icon className="w-6 h-6 sm:w-6.5 sm:h-6.5 md:w-7 md:h-7 text-[#43a047]" />
                    </div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#222222] mb-3 sm:mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-[#717171] text-sm sm:text-base md:text-lg leading-relaxed">
                      {feature.description.split('<strong>').map((part, i, arr) => {
                        if (i === 0) return part;
                        const [strongText, rest] = part.split('</strong>');
                        return (
                          <React.Fragment key={i}>
                            <strong className="font-bold text-emerald-600">{strongText}</strong>
                            {rest}
                          </React.Fragment>
                        );
                      })}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Offres populaires par ville */}
      <section className="py-16 md:py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <Link
                href="/search-parkings"
                className="inline-flex items-center gap-2 sm:gap-3 group"
              >
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-emerald-600 group-hover:text-emerald-700 mb-4 sm:mb-5 transition-colors">
                  Offres populaires par ville
                </h2>
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-emerald-600 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all flex-shrink-0" strokeWidth={2.5} />
              </Link>
              <p className="text-sm sm:text-base md:text-lg text-[#717171] max-w-2xl mx-auto">
                Découvrez les meilleurs espaces disponibles dans les grandes villes françaises
              </p>
            </div>
          </AnimatedSection>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {[
              { name: 'Paris', count: PARKING_LISTINGS.filter(p => p.location.includes('Paris')).length },
              { name: 'Lyon', count: PARKING_LISTINGS.filter(p => p.location.includes('Lyon')).length },
              { name: 'Marseille', count: PARKING_LISTINGS.filter(p => p.location.includes('Marseille')).length },
              { name: 'Toulouse', count: PARKING_LISTINGS.filter(p => p.location.includes('Toulouse')).length },
              { name: 'Nice', count: PARKING_LISTINGS.filter(p => p.location.includes('Nice')).length },
              { name: 'Nantes', count: PARKING_LISTINGS.filter(p => p.location.includes('Nantes')).length },
              { name: 'Strasbourg', count: PARKING_LISTINGS.filter(p => p.location.includes('Strasbourg')).length },
              { name: 'Montpellier', count: PARKING_LISTINGS.filter(p => p.location.includes('Montpellier')).length },
              { name: 'Bordeaux', count: PARKING_LISTINGS.filter(p => p.location.includes('Bordeaux')).length },
              { name: 'Lille', count: PARKING_LISTINGS.filter(p => p.location.includes('Lille')).length }
            ].map((city, index) => (
              <AnimatedSection key={index} direction="up" delay={50 + index * 50}>
                <Link
                  href={`/search-parkings?city=${city.name}`}
                  className="group relative bg-gradient-to-br from-white to-[#F7F7F7] rounded-2xl p-4 md:p-6 border-2 border-[#DDDDDD] hover:border-[#43a047] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold text-[#43a047] mb-2 group-hover:scale-110 transition-transform duration-300">
                    {city.count}+
                  </div>
                  <div className="text-sm md:text-base font-semibold text-[#222222] mb-1">
                    {city.name}
                  </div>
                  <div className="text-xs md:text-sm text-[#717171]">
                    espaces disponibles
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-[#43a047]" />
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section avec compteur animé */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile: 2 columns, Desktop: 4 columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {stats.map((stat, index) => (
              <AnimatedSection key={index} direction="scale" delay={index * 150}>
                <div className="text-center group">
                  <div className="relative inline-block">
                    <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#43a047] to-[#2d8659] bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </div>
                    {/* Effet de brillance */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>
                  <div className="text-[#717171] text-lg font-medium">
                    {stat.label}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-white to-[#F7F7F7] relative overflow-hidden">
        {/* Ligne de connexion animée */}
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#43a047]/20 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#222222] mb-4 sm:mb-5">
                Comment ça marche ?
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-[#717171] max-w-2xl mx-auto">
                Trois étapes simples pour réserver votre espace parmi des milliers de possibilités
              </p>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 relative">
            {steps.map((step, index) => (
              <AnimatedSection key={index} direction="up" delay={200 + index * 150}>
                <div className="relative group">
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-center border-2 border-[#DDDDDD] hover:border-[#43a047] transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden">
                    {/* Effet de brillance */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#43a047]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-[#43a047] to-[#2d8659] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 md:mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-lg">
                        <step.icon className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-white" />
                      </div>
                      <div className="absolute -top-4 -right-4 sm:-top-5 sm:-right-5 md:-top-6 md:-right-6 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#2d8659] to-[#1e6b47] rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl md:text-2xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                        {step.number}
                      </div>
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#222222] mb-4 sm:mb-5">
                        {step.title}
                      </h3>
                      <p className="text-[#717171] text-sm sm:text-base md:text-lg leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#43a047]/20">
                        <ArrowRight className="w-6 h-6 text-[#43a047] animate-pulse" />
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section avec effet parallaxe */}
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-[#43a047] via-[#2d8659] to-[#1e6b47] overflow-hidden">
        {/* Effets visuels animés */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Particules flottantes */}
        <div className="absolute inset-0">
          {[
            { left: '15%', top: '25%', delay: '0s', duration: '2s' },
            { left: '35%', top: '15%', delay: '0.5s', duration: '3s' },
            { left: '55%', top: '30%', delay: '1s', duration: '2.5s' },
            { left: '75%', top: '20%', delay: '1.5s', duration: '3.5s' },
            { left: '90%', top: '25%', delay: '2s', duration: '2s' },
            { left: '20%', top: '50%', delay: '0.3s', duration: '3s' },
            { left: '40%', top: '60%', delay: '0.8s', duration: '2.5s' },
            { left: '60%', top: '45%', delay: '1.2s', duration: '3s' },
            { left: '80%', top: '55%', delay: '1.7s', duration: '2.5s' },
            { left: '95%', top: '50%', delay: '2.2s', duration: '3s' },
            { left: '25%', top: '75%', delay: '0.2s', duration: '2.8s' },
            { left: '45%', top: '80%', delay: '0.6s', duration: '3.2s' },
            { left: '65%', top: '70%', delay: '1.1s', duration: '2.7s' },
            { left: '85%', top: '75%', delay: '1.6s', duration: '3.1s' },
            { left: '10%', top: '90%', delay: '0.4s', duration: '2.9s' }
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
              style={{
                left: pos.left,
                top: pos.top,
                animationDelay: pos.delay,
                animationDuration: pos.duration
              }}
            />
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection direction="scale" delay={0}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 sm:mb-6 leading-tight">
              Ne ratez pas cette opportunité
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-white/90 mb-7 sm:mb-9 max-w-2xl mx-auto leading-relaxed">
              <span className="font-bold text-white">15 000+ utilisateurs actifs</span> font confiance à Rentoall. <span className="font-bold text-emerald-300">Rejoignez-les</span> et économisez tout en gagnant un revenu passif.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <Link
                href="/search-parkings"
                className="group inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 bg-white hover:bg-gray-50 text-[#43a047] font-bold rounded-full transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 text-sm sm:text-base md:text-lg"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                Trouver mon espace maintenant
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/home"
                className="group inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 bg-transparent hover:bg-white/10 text-white font-bold rounded-full border-2 border-white/50 hover:border-white transition-all duration-300 backdrop-blur-sm text-sm sm:text-base md:text-lg"
                onClick={(e) => {
                  const userId = localStorage.getItem('userId');
                  const authToken = localStorage.getItem('authToken');
                  if (userId && authToken) {
                    // Si l'utilisateur est connecté, passer en mode hôte
                    localStorage.setItem('userMode', 'host');
                  }
                }}
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                Mode hôte
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 bg-white relative overflow-hidden">
        {/* Décorations */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#43a047]/5 rounded-full blur-2xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#2d8659]/5 rounded-full blur-2xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#222222] mb-4 sm:mb-5">
                Ce que disent nos utilisateurs
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-[#717171]">
                Rejoignez une communauté de milliers de particuliers satisfaits
              </p>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[
              {
                name: 'Marie D.',
                location: 'Paris',
                rating: 5,
                comment: 'Service excellent ! J\'ai trouvé un parking sécurisé près de mon travail en quelques minutes. La communauté Rentoall est incroyable !',
                icon: Heart
              },
              {
                name: 'Jean P.',
                location: 'Lyon',
                rating: 5,
                comment: 'Très pratique et fiable. Des milliers d\'options disponibles, je trouve toujours ce qu\'il me faut. Je recommande à tous !',
                icon: Zap
              },
              {
                name: 'Sophie L.',
                location: 'Marseille',
                rating: 5,
                comment: 'Interface intuitive et réservation rapide. Le service fonctionne parfaitement !',
                icon: Sparkles
              }
            ].map((testimonial, index) => (
              <AnimatedSection key={index} direction="up" delay={150 + index * 100}>
                <div className="group relative bg-gradient-to-br from-[#F7F7F7] to-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-[#DDDDDD]/50 hover:border-[#43a047] transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                  {/* Effet de brillance */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#43a047]/5 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative">
                    <div className="flex items-center gap-1 mb-3 sm:mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 fill-[#43a047] text-[#43a047] group-hover:scale-110 transition-transform duration-300" style={{ transitionDelay: `${i * 50}ms` }} />
                      ))}
                    </div>
                    <p className="text-[#222222] mb-4 sm:mb-5 md:mb-6 text-sm sm:text-base md:text-lg leading-relaxed">
                      &quot;{testimonial.comment}&quot;
                    </p>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-gradient-to-br from-[#43a047] to-[#2d8659] rounded-full flex items-center justify-center">
                        <testimonial.icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#222222] text-sm sm:text-base">
                          {testimonial.name}
                        </div>
                        <div className="text-[#717171] text-xs sm:text-sm">
                          {testimonial.location}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Section Parrainage et Affiliation - Ce qu'on peut gagner */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center mb-10 md:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-emerald-50 rounded-full border border-emerald-200">
                <Gift className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Parrainage &amp; Affiliation</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Gagnez en partageant Rentoall
              </h2>
              <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
                Invitez des amis (parrainage) ou promouvez la plateforme avec vos propres codes (affiliation). Récompenses à chaque étape.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-10">
            <AnimatedSection direction="up" delay={100}>
              <div className="h-full bg-white rounded-2xl border-2 border-slate-200 p-6 md:p-8 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-5">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">Parrainage</h3>
                <p className="text-slate-600 mb-4 text-sm md:text-base">
                  Idéal pour inviter vos amis et proches. Chaque utilisateur possède un <strong>code unique</strong> (ex. JODO-1234) généré à l&apos;inscription.
                </p>
                <ul className="space-y-2 text-slate-700 text-sm md:text-base mb-5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Le filleul saisit votre code à l&apos;inscription et est lié à vous définitivement.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Bonus fidélité :</strong> pour chaque tranche de <strong>200 €</strong> d&apos;achats cumulés du filleul, vous recevez <strong>5 €</strong> de bon de réduction, et le filleul aussi.</span>
                  </li>
                </ul>
                <p className="text-xs text-slate-500">Pas de crédit à l&apos;inscription (0 €) pour éviter les abus.</p>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={200}>
              <div className="h-full bg-white rounded-2xl border-2 border-slate-200 p-6 md:p-8 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-5">
                  <Percent className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">Affiliation</h3>
                <p className="text-slate-600 mb-4 text-sm md:text-base">
                  Pour promouvoir la plateforme à plus grande échelle. Vous pouvez créer jusqu&apos;à <strong>20 codes personnalisés</strong> (ex. PROMO2026, REDUC-PARKING).
                </p>
                <ul className="space-y-2 text-slate-700 text-sm md:text-base mb-5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Commission directe :</strong> vous gagnez <strong>1 %</strong> du montant de chaque réservation payée par vos affiliés, crédité sur votre solde dès paiement Stripe confirmé.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Bonus fidélité :</strong> comme en parrainage, 5 € pour vous et l&apos;affilié à chaque palier de 200 € d&apos;achats cumulés.</span>
                  </li>
                </ul>
                <p className="text-xs text-slate-500">Les bons de 5 € sont valables 1 an et utilisables sur une future réservation.</p>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection direction="up" delay={300}>
            <div className="bg-slate-100 rounded-xl border border-slate-200 p-4 sm:p-6 overflow-x-auto">
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                En résumé
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs sm:text-sm">
                <div className="font-medium text-slate-700">Critère</div>
                <div className="font-medium text-slate-900">Code</div>
                <div className="font-medium text-slate-900">Cible</div>
                <div className="font-medium text-slate-900">Gains</div>
                <div className="text-slate-600 border-t border-slate-200 pt-2">Parrainage</div>
                <div className="text-slate-600 border-t border-slate-200 pt-2">Fixe (auto)</div>
                <div className="text-slate-600 border-t border-slate-200 pt-2">Amis / Proches</div>
                <div className="text-slate-600 border-t border-slate-200 pt-2">5 € tous les 200 € (parrain + filleul)</div>
                <div className="text-slate-600 border-t border-slate-200 pt-2">Affiliation</div>
                <div className="text-slate-600 border-t border-slate-200 pt-2">Personnalisé (jusqu&apos;à 20)</div>
                <div className="text-slate-600 border-t border-slate-200 pt-2">Audience large</div>
                <div className="text-slate-600 border-t border-slate-200 pt-2">1 % par réservation + 5 € tous les 200 €</div>
              </div>
            </div>
          </AnimatedSection>

          <div className="text-center mt-8">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full transition-colors"
            >
              Créer un compte et récupérer mon code
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Section FAQ - 10 questions les plus pertinentes */}
      <section className="py-16 md:py-24 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center mb-10 md:mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <HelpCircle className="w-8 h-8 text-emerald-600" />
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                  Questions fréquentes
                </h2>
              </div>
              <p className="text-slate-600 text-base md:text-lg">
                Les réponses aux questions les plus posées sur Rentoall
              </p>
            </div>
          </AnimatedSection>
          <HomepageFAQ />
          <div className="text-center mt-10">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Voir toutes les questions
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Encart Investisseurs - Avant le footer */}
      <section className="py-12 md:py-16 bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 relative overflow-hidden">
        {/* Effets visuels */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" delay={0}>
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                <TrendingUp className="w-5 h-5 text-white" />
                <span className="text-sm font-semibold text-white">Opportunité d'investissement</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
                Devenez investisseur
                <br />
                <span className="text-white/90">Rejoignez l'aventure</span>
              </h2>
              
              <p className="text-base sm:text-lg md:text-xl text-white/90 mb-9 leading-relaxed">
                Vous souhaitez investir dans Rentoall et participer à notre croissance ? 
                Rejoignez-nous et faites partie de l'avenir du partage d'espaces.
              </p>
              
              <Link
                href="/investisseur"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-gray-50 text-emerald-600 font-bold rounded-full transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 text-base md:text-lg touch-manipulation"
              >
                <TrendingUp className="w-6 h-6" />
                <span>En savoir plus &amp; nous contacter</span>
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
      </div>

      <div className="mt-auto">
        <FooterNavigation />
        {/* Footer Mobile */}
        <div className="md:hidden">
          <MobileFooter />
        </div>
      </div>
    </div>
  );
}
