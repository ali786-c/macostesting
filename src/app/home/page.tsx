'use client';

import { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import Link from 'next/link';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { useRouter } from 'next/navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import FeaturedSpacesSection from '@/components/sections/featured-spaces-section';
import FooterNavigation from '@/components/sections/footer-navigation';
import MobileFooter from '@/components/sections/mobile-footer';
import { Sparkles, Star, Users, Tag, Calendar, Euro, TrendingUp, Plus, Eye, MessageSquare, BarChart3, CheckCircle, Clock, ChevronRight, Award } from 'lucide-react';
import { placesAPI, PlaceDTO, reservationsAPI, ReservationDTO } from '@/services/api';
import LoadingLogo from '@/components/ui/loading-logo';
import AnimatedLoadingText from '@/components/ui/animated-loading-text';
import { useLanguage } from '@/contexts/LanguageContext';
import { isMobileOrCapacitor, isCapacitor, capacitorNavigate, handleCapacitorLinkClick } from '@/lib/capacitor';
import { fromApiDateTime } from '@/lib/datetime';
import { capitalizeFirstPerLine } from '@/lib/utils';

export default function Home() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [userMode, setUserMode] = useState<'client' | 'host'>('client');
  const [popularSpaces, setPopularSpaces] = useState<PlaceDTO[]>([]);
  const [bestOffers, setBestOffers] = useState<PlaceDTO[]>([]);
  const [topRated, setTopRated] = useState<PlaceDTO[]>([]);
  const [mostReserved, setMostReserved] = useState<PlaceDTO[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  
  // États pour le dashboard hôte
  const [myPlaces, setMyPlaces] = useState<PlaceDTO[]>([]);
  const [recentReservations, setRecentReservations] = useState<ReservationDTO[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [stats, setStats] = useState({
    totalPlaces: 0,
    activePlaces: 0,
    activeReservations: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingReservations: 0,
    completedReservations: 0,
    averageRating: 0,
    totalViews: 0,
    occupancyRate: 0,
  });
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; reservations: number; revenue: number }>>([]);

  // Sur mobile / Capacitor (iOS/Android) : rediriger (pas de homepage)
  // En mode hôte → mon-calendrier. En mode client → search-parkings (évite que l'hôte voie la recherche client)
  const [isMobileRedirect, setIsMobileRedirect] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobileOrCapacitor()) {
      setIsMobileRedirect(false);
      return;
    }
    setIsMobileRedirect(true);
    const p = window.location.pathname;
    const search = window.location.search;
    // Capacitor sert index.html comme SPA fallback pour toutes les routes.
    // Si on n'est pas sur /home, naviguer vers la vraie page.
    // On utilise capacitorNavigate (full page load) plutôt que router.replace (SPA)
    // pour éviter la dépendance aux fichiers .txt RSC absents sur Android → boucle infinie.
    if (p !== '/home' && p !== '/home/' && p !== '/home/index.html') {
      console.log(`[HOME PAGE] SPA fallback → navigate vers ${p}${search}`);
      if (isCapacitor()) {
        const navKey = `cap_nav_${p}`;
        const alreadyTried = sessionStorage.getItem(navKey);
        if (alreadyTried) {
          sessionStorage.removeItem(navKey);
          console.log(`[HOME PAGE] Loop guard activé pour ${p} → router.replace`);
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
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const isAuthenticated = !!(token && userId);
    if (!isAuthenticated) {
      console.log('[HOME PAGE] Non authentifié → /search-parkings');
      if (isCapacitor()) {
        capacitorNavigate('/search-parkings');
      } else {
        router.replace('/search-parkings');
      }
      return;
    }
    const userMode = localStorage.getItem('userMode') as 'client' | 'host' | null;
    const target = userMode === 'host' ? '/mon-calendrier' : '/search-parkings';
    console.log(`[HOME PAGE] redirect → ${target} (userMode=${userMode})`);
    if (isCapacitor()) {
      capacitorNavigate(target);
    } else {
      router.replace(target);
    }
  }, [router]);

  // Vérifier le mode utilisateur
  useEffect(() => {
    const checkUserMode = () => {
      if (typeof window !== 'undefined') {
        const savedMode = localStorage.getItem('userMode') as 'client' | 'host' | null;
        if (savedMode === 'client' || savedMode === 'host') {
          setUserMode(savedMode);
        } else {
          setUserMode('client');
          localStorage.setItem('userMode', 'client');
        }
      }
    };

    // Vérifier au chargement
    checkUserMode();

    // Écouter les changements de mode utilisateur
    window.addEventListener('userModeChanged', checkUserMode);
    window.addEventListener('storage', checkUserMode);

    return () => {
      window.removeEventListener('userModeChanged', checkUserMode);
      window.removeEventListener('storage', checkUserMode);
    };
  }, []);

  // Charger les données selon le mode
  useEffect(() => {
    if (userMode === 'client') {
      loadPlaces();
    } else if (userMode === 'host') {
      loadHostDashboard();
    }
  }, [userMode]);

  const loadPlaces = async () => {
    try {
      setIsLoadingPlaces(true);
      
      // Charger tous les biens actifs
      const allPlaces = await placesAPI.search({});
      console.log('✅ [HOME] Biens chargés:', allPlaces);
      
      // Trier par ID (ordre croissant)
      const sortedPlaces = [...allPlaces].sort((a, b) => a.id - b.id);
      
      // Pour les espaces populaires, on prend les 20 premiers (on pourrait trier par nombre de reviews si disponible)
      setPopularSpaces(sortedPlaces.slice(0, 20));
      
      // Meilleures offres (par prix journalier)
      const sortedByPrice = [...sortedPlaces]
        .filter(item => item.pricePerDay && item.pricePerDay < 20)
        .sort((a, b) => (a.pricePerDay || 0) - (b.pricePerDay || 0))
        .slice(0, 20);
      setBestOffers(sortedByPrice);
      
      // Pour les top évalués, on charge les reviews pour chaque bien
      // Pour l'instant, on prend les 20 premiers (on pourrait améliorer en chargeant les reviews)
      setTopRated(sortedPlaces.slice(0, 20));
      
      // Les plus réservés - prendre des biens différents des autres sections
      // On prend des biens avec un ID différent pour avoir de nouveaux biens
      const mostReservedPlaces = [...sortedPlaces]
        .filter((item, index) => index >= 20 && index < 40) // Prendre les biens de l'index 20 à 40
        .slice(0, 20);
      setMostReserved(mostReservedPlaces);
      
    } catch (error) {
      console.error('❌ [HOME] Erreur lors du chargement des biens:', error);
      // En cas d'erreur, on garde des listes vides
      setPopularSpaces([]);
      setBestOffers([]);
      setTopRated([]);
      setMostReserved([]);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const loadHostDashboard = async () => {
    try {
      setIsLoadingDashboard(true);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.warn('⚠️ [HOME] Aucun userId trouvé dans localStorage');
        setIsLoadingDashboard(false);
        return;
      }

      const userIdNum = parseInt(userId, 10);
      console.log('📊 [HOME] Chargement du dashboard hôte pour userId:', userIdNum);
      
      // Charger les biens de l'utilisateur (en tant que propriétaire)
      console.log('📊 [HOME] Chargement des biens du propriétaire...');
      const userPlaces = await placesAPI.getOwnerCalendarOverview(userIdNum);
      console.log('✅ [HOME] Biens chargés:', userPlaces.length);
      // Trier par ID (ordre croissant)
      const sortedPlaces = [...userPlaces].sort((a, b) => a.id - b.id);
      setMyPlaces(sortedPlaces);
      
      // Charger les réservations en tant qu'hôte
      console.log('📊 [HOME] Chargement des réservations en tant qu\'hôte...');
      const ownedReservations = await reservationsAPI.getOwnedReservations(userIdNum);
      console.log('✅ [HOME] Réservations chargées:', ownedReservations.length);
      // Trier par date de début (les plus récentes en premier) et prendre les 5 dernières
      const sortedReservations = [...ownedReservations]
        .sort((a, b) => fromApiDateTime(b.startDateTime).getTime() - fromApiDateTime(a.startDateTime).getTime())
        .slice(0, 5);
      setRecentReservations(sortedReservations);
      
      // Calculer les statistiques (temporairement côté frontend, sera remplacé par l'API backend)
      const activeReservations = ownedReservations.filter(
        r => r.status === 'CONFIRMED' || r.status === 'PENDING'
      );
      const pendingReservations = ownedReservations.filter(
        r => r.status === 'PENDING'
      );
      const completedReservations = ownedReservations.filter(
        r => r.status === 'COMPLETED'
      );
      const totalRevenue = ownedReservations
        .filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED')
        .reduce((sum, r) => sum + Number(r.totalPrice || 0), 0);
      
      // Revenus du mois en cours
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = ownedReservations
        .filter(r => {
          const resDate = fromApiDateTime(r.startDateTime);
          return (r.status === 'CONFIRMED' || r.status === 'COMPLETED') &&
                 resDate.getMonth() === currentMonth &&
                 resDate.getFullYear() === currentYear;
        })
        .reduce((sum, r) => sum + Number(r.totalPrice || 0), 0);
      
      const activePlaces = userPlaces.filter(p => p.active).length;
      
      setStats({
        totalPlaces: userPlaces.length,
        activePlaces: activePlaces,
        activeReservations: activeReservations.length,
        totalRevenue: totalRevenue,
        monthlyRevenue: monthlyRevenue,
        pendingReservations: pendingReservations.length,
        completedReservations: completedReservations.length,
        averageRating: 0, // Sera fourni par le backend
        totalViews: 0, // Sera fourni par le backend
        occupancyRate: 0, // Sera calculé par le backend
      });

      // Calculer les données mensuelles pour le graphique (6 derniers mois)
      const monthlyStats: Record<string, { reservations: number; revenue: number }> = {};
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      
      // Initialiser les 6 derniers mois
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        monthlyStats[monthKey] = { reservations: 0, revenue: 0 };
      }

      // Grouper les réservations par mois
      ownedReservations
        .filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED')
        .forEach(reservation => {
          const resDate = fromApiDateTime(reservation.startDateTime);
          const monthKey = `${monthNames[resDate.getMonth()]} ${resDate.getFullYear()}`;
          
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].reservations += 1;
            monthlyStats[monthKey].revenue += Number(reservation.totalPrice || 0);
          }
        });

      // Convertir en tableau pour le graphique
      const monthlyDataArray = Object.keys(monthlyStats).map(month => ({
        month,
        reservations: monthlyStats[month].reservations,
        revenue: monthlyStats[month].revenue
      }));
      
      setMonthlyData(monthlyDataArray);
      
      console.log('✅ [HOME] Dashboard chargé avec succès');
      
    } catch (error) {
      console.error('❌ [HOME] Erreur lors du chargement du dashboard:', error);
      const errorObj = error as { 
        message?: string; 
        response?: { 
          status?: number;
          statusText?: string;
          data?: unknown;
        };
        config?: {
          url?: string;
        };
      };
      console.error('❌ [HOME] Détails de l\'erreur:', {
        message: errorObj?.message,
        status: errorObj?.response?.status,
        statusText: errorObj?.response?.statusText,
        url: errorObj?.config?.url,
        data: errorObj?.response?.data,
      });
      // Ne pas rediriger, juste afficher l'erreur dans la console
      // L'utilisateur reste sur la page pour voir ce qui ne va pas
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  if (userMode === 'host') {
    // Dashboard hôte
    if (isLoadingDashboard) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <HeaderNavigation />
          <main className="bg-transparent w-full flex-1 flex items-center justify-center mobile-page-main" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
            <div className="text-center">
              <LoadingLogo size="md" />
              <AnimatedLoadingText
                label={t('dashboard.loading')}
                className="mt-4"
              />
            </div>
          </main>
          <FooterNavigation />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 overflow-x-hidden w-full max-w-full flex flex-col">
        <HeaderNavigation />
        <main className="w-full pt-20 md:pt-24 pb-24 sm:pb-16 overflow-x-hidden flex-1 mobile-page-main" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            {/* Header Dashboard sobre - Mobile: Compact */}
            <div className="mb-3 sm:mb-5 md:mb-6">
              <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 md:p-6 shadow-sm">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                  {t('dashboard.title')}
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base">{t('dashboard.subtitle')}</p>
              </div>
            </div>

            {/* Statistiques avec design sobre - Mobile: Compact */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-5 md:mb-6">
              {/* Carte Mes espaces - Mobile: Compact */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-2.5 sm:p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{t('dashboard.mySpaces')}</span>
                  <div className="p-1 bg-emerald-50 rounded-lg">
                    <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.totalPlaces}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500">{t('dashboard.activeSpaces', { count: stats.activePlaces })}</div>
                </div>
                <Link href="/host/create" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/host/create', router)} className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors mt-1">
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">{t('dashboard.add')}</span>
                </Link>
              </div>

              {/* Carte Réservations actives - Mobile: Compact */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-2.5 sm:p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{t('dashboard.activeReservations')}</span>
                  <div className="p-1 bg-emerald-50 rounded-lg">
                    <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.activeReservations}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500">{t('dashboard.completed', { count: stats.completedReservations })}</div>
                </div>
                <Link href="/reservations" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/reservations', router)} className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors mt-1">
                  <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">{t('dashboard.view')}</span>
                </Link>
              </div>

              {/* Carte En attente - Mobile: Compact */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-2.5 sm:p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{t('dashboard.pending')}</span>
                  <div className="p-1 bg-amber-50 rounded-lg">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.pendingReservations}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500">{t('dashboard.toValidate')}</div>
                </div>
                <Link href="/reservations" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/reservations', router)} className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors mt-1">
                  <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">{t('dashboard.manage')}</span>
                </Link>
              </div>

              {/* Carte Revenus totaux - Mobile: Compact */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-2.5 sm:p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{t('dashboard.totalRevenue')}</span>
                  <div className="p-1 bg-emerald-50 rounded-lg">
                    <Euro className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">{stats.totalRevenue.toFixed(2)}€</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500">{t('dashboard.thisMonth', { amount: stats.monthlyRevenue.toFixed(2) })}</div>
                </div>
                <Link href="/mon-calendrier" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/mon-calendrier', router)} className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors mt-1">
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">{t('dashboard.calendar')}</span>
                </Link>
              </div>
            </div>

            {/* Graphique Réservations et Revenus - ou état vide si aucune donnée */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2 sm:p-3 md:p-4 mb-3 sm:mb-5 md:mb-6">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                Évolution mensuelle
              </h2>
              {monthlyData.some(d => d.reservations > 0 || d.revenue > 0) ? (
                <MonthlyChart data={monthlyData} />
              ) : (
                <div className="text-center py-8 sm:py-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 sm:mb-1.5">En attente de réservations</h3>
                  <p className="text-[10px] sm:text-xs text-slate-600 max-w-sm mx-auto">
                    Aucune donnée à afficher pour le moment. Vos réservations et revenus apparaîtront ici.
                  </p>
                </div>
              )}
            </div>

            {/* Actions rapides avec design sobre - Mobile: Compact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4 mb-3 sm:mb-5 md:mb-6">
              <Link href="/host/create" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/host/create', router)} className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 p-3 sm:p-4 cursor-pointer group touch-manipulation active:scale-95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors flex-shrink-0">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-0.5">{t('dashboard.putOnline')}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-600">{t('dashboard.addNewSpace')}</p>
                  </div>
                </div>
              </Link>

              <Link href="/mon-calendrier" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/mon-calendrier', router)} className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 p-3 sm:p-4 cursor-pointer group touch-manipulation active:scale-95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors flex-shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-0.5">{t('dashboard.myCalendar')}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-600">{t('dashboard.manageAvailability')}</p>
                  </div>
                </div>
              </Link>

              <Link href="/reservations" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/reservations', router)} className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 p-3 sm:p-4 cursor-pointer group touch-manipulation active:scale-95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors flex-shrink-0">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-0.5">{t('dashboard.myReservations')}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-600">{t('dashboard.viewAllReservations')}</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Mes espaces avec design sobre - Mobile: Compact */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5 md:p-6 mb-3 sm:mb-5 md:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                    {t('dashboard.mySpaces')}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{t('dashboard.manageAllSpaces')}</p>
                </div>
                <Link href="/host/create" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/host/create', router)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer touch-manipulation active:scale-95">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('dashboard.add')}</span>
                  <span className="sm:hidden">+</span>
                </Link>
              </div>
              {myPlaces.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <BarChart3 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">{t('dashboard.noSpacesOnline')}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-6">{t('dashboard.startWithFirstSpace')}</p>
                  <Link href="/host/create" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/host/create', router)} className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer touch-manipulation active:scale-95">
                    <Plus className="w-4 h-4" />
                    <span>{t('dashboard.createFirstSpace')}</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {myPlaces.slice(0, 6).map((place) => (
                    <div key={place.id} className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 hover:shadow-md hover:border-emerald-200 transition-all duration-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm sm:text-base text-slate-900">{place.city}</h3>
                        <span className={`text-[9px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${
                          place.active 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {place.active ? t('dashboard.active') : t('dashboard.inactive')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2.5 line-clamp-2">{capitalizeFirstPerLine(place.description) || t('dashboard.noDescription')}</p>
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                        <span className="text-sm sm:text-base font-bold text-emerald-600">
                          {t('dashboard.perDay', { price: Number(place.pricePerDay || 0).toFixed(2) })}
                        </span>
                        <CapacitorDynamicLink href={`/parking/${place.id}/`} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer">
                          {t('dashboard.view')}
                          <ChevronRight className="w-3 h-3" />
                        </CapacitorDynamicLink>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Réservations récentes avec design sobre - Mobile: Compact */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-sm p-3 sm:p-5 md:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 mb-3 sm:mb-5 md:mb-6">
                <div>
                  <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900">
                    {t('dashboard.recentReservations')}
                  </h2>
                  <p className="text-[10px] sm:text-sm text-slate-600 mt-0.5 sm:mt-1">{t('dashboard.trackTransactions')}</p>
                </div>
                <Link href="/reservations" prefetch={false} onClick={(e) => handleCapacitorLinkClick(e, '/reservations', router)} className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2.5 md:py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[10px] sm:text-sm md:text-base font-semibold rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer touch-manipulation active:scale-95">
                  <span className="text-[10px] sm:text-sm md:text-base">{t('dashboard.viewAll')}</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-5" />
                </Link>
              </div>
              {recentReservations.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">{t('dashboard.noReservations')}</h3>
                  <p className="text-xs sm:text-sm text-slate-600">{t('dashboard.noReservationsYet')}</p>
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {recentReservations.map((reservation) => (
                    <div key={reservation.id} className="bg-white border border-slate-200 rounded-lg sm:rounded-xl p-3 sm:p-5 hover:shadow-md hover:border-emerald-200 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-semibold text-sm sm:text-lg text-slate-900 mb-1">
                            {t('dashboard.reservation', { id: reservation.id })}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-600">
                            {fromApiDateTime(reservation.startDateTime).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} - {fromApiDateTime(reservation.endDateTime).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-base sm:text-xl text-emerald-600 mb-1.5 sm:mb-2">
                            {Number(reservation.totalPrice || 0).toFixed(2)}€
                          </div>
                          <span className={`text-[9px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium ${
                            reservation.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            reservation.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'update_requested' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            reservation.status === 'UPDATE_ACCEPTED' || reservation.status === 'update_accepted' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            reservation.status === 'UPDATE_REJECTED' || reservation.status === 'update_rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                            reservation.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {reservation.status === 'CONFIRMED' && t('dashboard.confirmed')}
                            {reservation.status === 'PENDING' && t('dashboard.pendingStatus')}
                            {(reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'update_requested') && 'Modification demandée'}
                            {(reservation.status === 'UPDATE_ACCEPTED' || reservation.status === 'update_accepted') && 'Modification acceptée'}
                            {(reservation.status === 'UPDATE_REJECTED' || reservation.status === 'update_rejected') && 'Modification refusée'}
                            {reservation.status === 'COMPLETED' && t('dashboard.completedStatus')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  // Sur mobile : afficher un chargement pendant la redirection vers search-parkings
  if (isMobileRedirect === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Mode client - Page d'accueil normale
  if (isLoadingPlaces) {
    return (
      <div className="min-h-screen bg-white overflow-x-hidden w-full max-w-full flex flex-col">
        <HeaderNavigation />
        <main className="bg-white w-full flex-1 flex items-center justify-center overflow-x-hidden mobile-page-main" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="text-center">
            <LoadingLogo size="md" />
            <AnimatedLoadingText
              label={t('dashboard.loadingSpaces')}
              className="mt-4"
            />
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden w-full max-w-full flex flex-col">
      <HeaderNavigation />
      <main className="bg-white w-full pt-20 md:pt-28 lg:pt-32 pb-20 md:pb-8 flex-1 mobile-page-main" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        {/* Sections empilées verticalement - Une en dessous de l'autre */}
        <div className="flex flex-col gap-1 sm:gap-2 px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Section Populaires */}
          <div className="w-full">
            <FeaturedSpacesSection
              title={t('dashboard.popular')}
              listings={popularSpaces}
              icon={Users}
              maxItems={20}
            />
          </div>

          {/* Section Meilleures offres */}
          <div className="w-full">
            <FeaturedSpacesSection
              title={t('dashboard.bestOffers')}
              listings={bestOffers}
              icon={Tag}
              showBadge={true}
              badgeText={t('dashboard.promo')}
              badgeIcon={<Sparkles className="w-3 h-3" />}
              maxItems={20}
            />
          </div>

          {/* Section Les plus réservés */}
          <div className="w-full">
            <FeaturedSpacesSection
              title={t('dashboard.mostReserved')}
              listings={mostReserved}
              icon={Award}
              maxItems={20}
            />
          </div>
        </div>
      </main>
      <FooterNavigation />
    </div>
  );
}

// Composant de graphique mensuel : courbes Réservations + Revenus (design propre, axes lisibles, compact)
function MonthlyChart({ data }: { data: Array<{ month: string; reservations: number; revenue: number }> }) {
  const width = 420;
  const height = 180;
  const padding = { top: 18, right: 20, bottom: 36, left: 36 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const maxReservations = Math.max(...data.map(d => d.reservations), 1);
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const hasData = data.length > 0 && (maxReservations > 0 || maxRevenue > 0);

  const normalizedData = useMemo(() => {
    return data.map(d => ({
      month: d.month,
      monthShort: d.month.split(' ')[0],
      reservations: maxReservations > 0 ? (d.reservations / maxReservations) * 100 : 0,
      revenue: maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0,
      reservationsValue: d.reservations,
      revenueValue: d.revenue
    }));
  }, [data, maxReservations, maxRevenue]);

  const getX = (i: number) => padding.left + (data.length > 1 ? (i / (data.length - 1)) * graphWidth : graphWidth / 2);
  const getReservationY = (pct: number) => padding.top + graphHeight - (pct / 100) * graphHeight;
  const getRevenueY = (pct: number) => padding.top + graphHeight - (pct / 100) * graphHeight;

  const reservationPoints = normalizedData.map((d, i) => `${getX(i)},${getReservationY(d.reservations)}`).join(' ');
  const revenuePoints = normalizedData.map((d, i) => `${getX(i)},${getRevenueY(d.revenue)}`).join(' ');
  const reservationAreaPoints = `${padding.left},${padding.top + graphHeight} ${reservationPoints} ${width - padding.right},${padding.top + graphHeight}`;
  const revenueAreaPoints = `${padding.left},${padding.top + graphHeight} ${revenuePoints} ${width - padding.right},${padding.top + graphHeight}`;

  if (!hasData) {
    return (
      <div className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-12 px-4 text-center">
        <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Aucune donnée sur les 6 derniers mois</p>
        <p className="text-xs text-slate-400 mt-1">Les réservations et revenus apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
          <span className="text-xs text-slate-700 font-medium">Réservations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
          <span className="text-xs text-slate-700 font-medium">Revenus (€)</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-h-[140px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="homeReservationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="homeRevenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grille horizontale */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = padding.top + graphHeight - (value / 100) * graphHeight;
            return (
              <line
                key={value}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="0.5"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Axe Y - échelle 0–100 % */}
          {[0, 50, 100].map((value) => {
            const y = padding.top + graphHeight - (value / 100) * graphHeight;
            return (
              <g key={value}>
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748b"
                  className="font-medium tabular-nums"
                >
                  {value}%
                </text>
              </g>
            );
          })}

          {/* Zones remplies */}
          <polygon points={reservationAreaPoints} fill="url(#homeReservationGradient)" />
          <polygon points={revenueAreaPoints} fill="url(#homeRevenueGradient)" />

          {/* Courbes */}
          <polyline
            points={reservationPoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={revenuePoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points Réservations */}
          {normalizedData.map((d, i) => (
            <g key={`res-${i}`}>
              <circle
                cx={getX(i)}
                cy={getReservationY(d.reservations)}
                r="2.5"
                fill="white"
                stroke="#10b981"
                strokeWidth="1.5"
              />
              <title>{d.month}: {d.reservationsValue} réservation{d.reservationsValue > 1 ? 's' : ''}</title>
            </g>
          ))}

          {/* Points Revenus */}
          {normalizedData.map((d, i) => (
            <g key={`rev-${i}`}>
              <circle
                cx={getX(i)}
                cy={getRevenueY(d.revenue)}
                r="2.5"
                fill="white"
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
              <title>{d.month}: {d.revenueValue.toFixed(2)} €</title>
            </g>
          ))}

          {/* Axe X - mois */}
          {normalizedData.map((d, i) => (
            <g key={`month-${i}`}>
              <text
                x={getX(i)}
                y={height - padding.bottom + 14}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
                className="font-medium"
              >
                {d.monthShort}
              </text>
            </g>
          ))}

          {/* Ligne de base */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={width - padding.right}
            y2={padding.top + graphHeight}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Résumé par mois sous le graphique - compact */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 mt-2">
        {normalizedData.map((d, i) => (
          <div key={i} className="text-center py-1.5 px-1.5 rounded-md bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-500 font-medium mb-0.5">{d.monthShort}</p>
            <p className="text-xs font-semibold text-emerald-600">{d.reservationsValue}</p>
            <p className="text-xs font-semibold text-blue-600">{d.revenueValue.toFixed(0)} €</p>
          </div>
        ))}
      </div>
    </div>
  );
}
