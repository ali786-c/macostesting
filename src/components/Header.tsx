'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Crown, 
  ChevronDown,
  Menu,
  X,
  Globe,
  Check,
  Star,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { authAPI } from '@/services/api';
import Link from 'next/link';

interface HeaderProps {
  finalUserType?: 'entreprise' | 'influenceur' | 'agence' | null;
  finalIsLoggedIn?: boolean;
}

export default function Header({ finalUserType = null, finalIsLoggedIn = false }: HeaderProps) {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [showEntreprisesMenu, setShowEntreprisesMenu] = useState(false);
  const [showInfluenceursMenu, setShowInfluenceursMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  
  // États pour la détection automatique de connexion - Initialisation synchrone pour éviter le flash
  const getInitialAuthState = () => {
    if (typeof window !== 'undefined') {
      // Utiliser l'état injecté par le script inline si disponible
      const injectedState = (window as Window & { __INITIAL_AUTH_STATE__?: { isLoggedIn: boolean; userType: string; userName: string } }).__INITIAL_AUTH_STATE__;
      if (injectedState) {
        let userType = injectedState.userType as 'entreprise' | 'influenceur' | 'agence' | 'client' | null;
        if (userType === 'client') {
          userType = 'entreprise';
        }
        return {
          isLoggedIn: injectedState.isLoggedIn,
          userType: userType,
          userName: injectedState.userName
        };
      }
      
      // Fallback: lire directement depuis localStorage
      const storedIsLoggedIn = localStorage.getItem('finalIsLoggedIn') === 'true';
      let storedUserType = localStorage.getItem('finalUserType') as 'entreprise' | 'influenceur' | 'agence' | 'client' | null;
      const storedUserName = localStorage.getItem('userName') || '';
      const storedAuthToken = localStorage.getItem('authToken');
      
      // Normaliser le type utilisateur
      if (storedUserType === 'client') {
        storedUserType = 'entreprise';
      }
      
      // Si on a un token, on considère que l'utilisateur est connecté
      const isActuallyLoggedIn = storedIsLoggedIn || !!storedAuthToken;
      
      return {
        isLoggedIn: isActuallyLoggedIn,
        userType: storedUserType,
        userName: storedUserName
      };
    }
    return {
      isLoggedIn: false,
      userType: null,
      userName: ''
    };
  };

  const initialAuthState = getInitialAuthState();
  const [actualIsLoggedIn, setActualIsLoggedIn] = useState(initialAuthState.isLoggedIn);
  const [actualUserType, setActualUserType] = useState<'entreprise' | 'influenceur' | 'agence' | null>(initialAuthState.userType);
  const [userName, setUserName] = useState(initialAuthState.userName);
  const [isMounted, setIsMounted] = useState(false);
  
  // S'assurer que le composant est monté côté client avant d'afficher
  useEffect(() => {
    // Utiliser setTimeout pour éviter l'appel synchrone de setState dans useEffect
    setTimeout(() => {
      setIsMounted(true);
    }, 0);
  }, []);
  const entreprisesMenuRef = useRef<HTMLDivElement>(null);
  const influenceursMenuRef = useRef<HTMLDivElement>(null);
  const dashboardMenuRef = useRef<HTMLDivElement>(null);
  const mobileDashboardMenuRef = useRef<HTMLDivElement>(null);
  const entreprisesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const influenceursTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Détection automatique du statut de connexion - useLayoutEffect pour éviter le flash
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAuthStatus = () => {
      const storedIsLoggedIn = localStorage.getItem('finalIsLoggedIn') === 'true';
      let storedUserType = localStorage.getItem('finalUserType') as 'entreprise' | 'influenceur' | 'agence' | 'client' | null;
      const storedUserName = localStorage.getItem('userName') || '';
      const storedAuthToken = localStorage.getItem('authToken');
      
      // Normaliser le type utilisateur
      if (storedUserType === 'client') {
        storedUserType = 'entreprise';
      }
      
      // Si on a un token, on considère que l'utilisateur est connecté
      const isActuallyLoggedIn = storedIsLoggedIn || !!storedAuthToken;
      
      setActualIsLoggedIn(isActuallyLoggedIn);
      setActualUserType(storedUserType);
      setUserName(storedUserName);
    };

    // Vérifier immédiatement de manière synchrone
    checkAuthStatus();
  }, []);

  // Écouter les changements après l'initialisation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAuthStatus = () => {
      const storedIsLoggedIn = localStorage.getItem('finalIsLoggedIn') === 'true';
      let storedUserType = localStorage.getItem('finalUserType') as 'entreprise' | 'influenceur' | 'agence' | 'client' | null;
      const storedUserName = localStorage.getItem('userName') || '';
      const storedAuthToken = localStorage.getItem('authToken');
      
      if (storedUserType === 'client') {
        storedUserType = 'entreprise';
      }
      
      const isActuallyLoggedIn = storedIsLoggedIn || !!storedAuthToken;
      
      setActualIsLoggedIn(isActuallyLoggedIn);
      setActualUserType(storedUserType);
      setUserName(storedUserName);
    };
    
    // Écouter les changements de localStorage (pour les autres onglets)
    window.addEventListener('storage', checkAuthStatus);
    
    // Écouter les événements personnalisés (pour le même onglet)
    const handleCustomStorage = () => {
      checkAuthStatus();
    };
    window.addEventListener('storage', handleCustomStorage);
    
    // Écouter l'événement logout
    const handleLogout = () => {
      checkAuthStatus();
    };
    window.addEventListener('logout', handleLogout);
    
    // Créer un interval pour vérifier périodiquement (fallback - toutes les 200ms pour être plus réactif)
    const intervalId = setInterval(() => {
      checkAuthStatus();
    }, 200);
    
    return () => {
      window.removeEventListener('storage', checkAuthStatus);
      window.removeEventListener('storage', handleCustomStorage);
      window.removeEventListener('logout', handleLogout);
      clearInterval(intervalId);
    };
  }, []);

  // Utiliser les valeurs détectées ou les props en fallback
  const isLoggedInFinal = actualIsLoggedIn || finalIsLoggedIn;
  const userTypeFinal = actualUserType || finalUserType;
  

  // Fermer les dropdowns quand on clique ailleurs
  useEffect(() => {
    if (!showDashboardMenu) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Pour le menu Dashboard desktop
      if (dashboardMenuRef.current && !dashboardMenuRef.current.contains(target)) {
        // Ne pas fermer si on clique dans le menu mobile Dashboard
        if (!mobileDashboardMenuRef.current || !mobileDashboardMenuRef.current.contains(target)) {
          setShowDashboardMenu(false);
        }
      }
    };

    // Utiliser un délai pour éviter que le menu se ferme immédiatement après l'ouverture
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, false);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, false);
    };
  }, [showDashboardMenu]);

  // Fonctions pour gérer les sous-menus avec délais
  const handleEntreprisesMouseEnter = () => {
    if (entreprisesTimeoutRef.current) {
      clearTimeout(entreprisesTimeoutRef.current);
    }
    setShowEntreprisesMenu(true);
  };

  const handleEntreprisesMouseLeave = () => {
    entreprisesTimeoutRef.current = setTimeout(() => {
      setShowEntreprisesMenu(false);
    }, 200); // 200ms de délai
  };

  const handleInfluenceursMouseEnter = () => {
    if (influenceursTimeoutRef.current) {
      clearTimeout(influenceursTimeoutRef.current);
    }
    setShowInfluenceursMenu(true);
  };

  const handleInfluenceursMouseLeave = () => {
    influenceursTimeoutRef.current = setTimeout(() => {
      setShowInfluenceursMenu(false);
    }, 200); // 200ms de délai
  };

  // Nettoyer les timeouts au démontage
  useEffect(() => {
    return () => {
      if (entreprisesTimeoutRef.current) {
        clearTimeout(entreprisesTimeoutRef.current);
      }
      if (influenceursTimeoutRef.current) {
        clearTimeout(influenceursTimeoutRef.current);
      }
    };
  }, []);

  const entreprisesMenuItems = [
    { name: 'Pourquoi InfluConnect', href: '/home' },
    { name: 'Trouver et travailler avec les meilleurs influenceurs', href: '/search-parkings' },
    { name: 'Parrainage', href: '/host/referrals' }
  ];

  const influenceursMenuItems = [
    { name: 'Pourquoi InfluConnect', href: '/home' },
    { name: 'Communauté et programme', href: '/home' },
    { name: 'Parrainage', href: '/host/referrals' }
  ];

  const entrepriseLoggedInMenu = [
    { name: t('nav.dashboard'), href: '/home', hasSubmenu: true },
    { name: 'Rechercher', href: '/search' },
    { name: 'Annonces', href: '/host/my-places' },
    { name: t('nav.calendar'), href: '/calendrier' },
    { name: 'Création', href: '/host/create' },
    { name: t('nav.messages'), href: '/messages' }
  ];

  const influenceurLoggedInMenu = [
    { name: t('nav.dashboard'), href: '/home', hasSubmenu: true },
    { name: 'Rechercher', href: '/search' },
    { name: 'Annonces', href: '/host/my-places' },
    { name: t('nav.calendar'), href: '/calendrier' },
    { name: 'Création', href: '/host/create' },
    { name: t('nav.messages'), href: '/messages' }
  ];

  const agenceLoggedInMenu = [
    { name: t('nav.dashboard'), href: '/home', hasSubmenu: true },
    { name: 'Rechercher', href: '/search' },
    { name: 'Annonces', href: '/host/my-places' },
    { name: t('nav.calendar'), href: '/calendrier' },
    { name: 'Création', href: '/host/create' },
    { name: t('nav.messages'), href: '/messages' }
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-sm ${!isMounted ? 'opacity-0' : 'opacity-100 transition-opacity duration-150'} overflow-x-hidden`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 overflow-x-hidden">
        <div className="flex justify-between items-center h-14 md:h-16 overflow-x-hidden">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <span className="hidden md:block text-lg font-bold text-gray-900">InfluConnect</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 mr-6">
            {/* Public navigation for non-logged users */}
            {!isLoggedInFinal && (
              <>
                {/* Entreprises Menu */}
                <div className="relative" ref={entreprisesMenuRef}>
                  <button
                    onMouseEnter={handleEntreprisesMouseEnter}
                    onMouseLeave={handleEntreprisesMouseLeave}
                    className="flex items-center space-x-1 text-sm text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                  >
                    <span>Entreprises</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showEntreprisesMenu && (
                    <div
                      onMouseEnter={handleEntreprisesMouseEnter}
                      onMouseLeave={handleEntreprisesMouseLeave}
                      className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                    >
                      {entreprisesMenuItems.map((item, index) => (
                        <a
                          key={index}
                          href={item.href}
                          className="block px-4 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                        >
                          {item.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Influenceurs Menu */}
                <div className="relative" ref={influenceursMenuRef}>
                  <button
                    onMouseEnter={handleInfluenceursMouseEnter}
                    onMouseLeave={handleInfluenceursMouseLeave}
                    className="flex items-center space-x-1 text-sm text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                  >
                    <span>Influenceurs</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showInfluenceursMenu && (
                    <div
                      onMouseEnter={handleInfluenceursMouseEnter}
                      onMouseLeave={handleInfluenceursMouseLeave}
                      className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                    >
                      {influenceursMenuItems.map((item, index) => (
                        <a
                          key={index}
                          href={item.href}
                          className="block px-4 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                        >
                          {item.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Public navigation for non-logged users */}
            {!isLoggedInFinal && (
              <>
                {/* Navigation publique supprimée - seulement les menus déroulants restent */}
              </>
            )}

            {/* Logged in navigation */}
            {isLoggedInFinal && userTypeFinal === 'entreprise' && (
              <>
                {entrepriseLoggedInMenu.map((item, index) => (
                  item.hasSubmenu ? (
                    <div key={index} className="relative" ref={dashboardMenuRef}>
                      <button
                        onClick={() => setShowDashboardMenu(!showDashboardMenu)}
                        className="flex items-center space-x-1 text-sm text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                      >
                        <span>{item.name}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {showDashboardMenu && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                          <a
                            href="/home"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Tableau de bord
                          </a>
                          <a
                            href="/host/my-places"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Prestations
                          </a>
                          <Link
                            href="/host/my-places"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Annonces
                          </Link>
                          <a
                            href="/host/my-places"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Devis
                          </a>
                          <a
                            href="/parametres"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Facturation
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      key={index}
                      href={item.href}
                      className="text-sm text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                    >
                      {item.name}
                    </a>
                  )
                ))}
              </>
            )}

            {isLoggedInFinal && userTypeFinal === 'influenceur' && (
              <>
                {influenceurLoggedInMenu.map((item, index) => (
                  item.hasSubmenu ? (
                    <div key={index} className="relative" ref={dashboardMenuRef}>
                      <button
                        onClick={() => setShowDashboardMenu(!showDashboardMenu)}
                        className="flex items-center space-x-1 text-sm text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                      >
                        <span>{item.name}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {showDashboardMenu && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                          <a
                            href="/home"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Tableau de bord
                          </a>
                          <a
                            href="/host/my-places"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Prestations
                          </a>
                          <Link
                            href="/host/my-places"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Annonces
                          </Link>
                          <a
                            href="/host/my-places"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Devis
                          </a>
                          <a
                            href="/parametres"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Facturation
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      key={index}
                      href={item.href}
                      className="text-sm text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                    >
                      {item.name}
                    </a>
                  )
                ))}
              </>
            )}

            {isLoggedInFinal && userTypeFinal === 'agence' && (
              <>
                {agenceLoggedInMenu.map((item, index) => (
                  item.hasSubmenu ? (
                    <div key={index} className="relative" ref={dashboardMenuRef}>
                      <button
                        onClick={() => setShowDashboardMenu(!showDashboardMenu)}
                        className="flex items-center space-x-1 text-sm text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                      >
                        <span>{item.name}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {showDashboardMenu && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                          <a
                            href="/home"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Tableau de bord
                          </a>
                          <a
                            href="/host/my-places"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Prestations
                          </a>
                          <Link
                            href="/host/my-places"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Annonces
                          </Link>
                          <a
                            href="/host/my-places"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Devis
                          </a>
                          <a
                            href="/parametres"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            Facturation
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      key={index}
                      href={item.href}
                      className="text-sm text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                    >
                      {item.name}
                    </a>
                  )
                ))}
              </>
            )}
          </nav>
          
          {/* Right side buttons */}
          <div className="flex items-center space-x-4">
            {/* Desktop: Login buttons - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-4">
              {!isLoggedInFinal && (
                <>
                  <a href="/auth/login" className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors duration-200 cursor-pointer">
                    {t('nav.login')}
                  </a>
                  <a href="/account-type" className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg cursor-pointer">
                    {t('nav.signup')}
                  </a>
                </>
              )}
            </div>

            {/* Mobile: Login buttons visible in header (only when not logged in) - Centered */}
            {!isLoggedInFinal && (
              <div className="md:hidden flex items-center justify-center space-x-2 flex-1 mx-2 min-w-0">
                <a 
                  href="/auth/login" 
                  className="px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 hover:border-orange-500 hover:bg-orange-50 rounded-lg transition-colors duration-200 cursor-pointer whitespace-nowrap min-h-[44px] flex items-center justify-center"
                >
                  {t('nav.login')}
                </a>
                <a 
                  href="/account-type" 
                  className="px-3 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors duration-200 cursor-pointer whitespace-nowrap min-h-[44px] flex items-center justify-center"
                >
                  {t('nav.signup')}
                </a>
              </div>
            )}

            {/* Mobile menu button - always visible on mobile */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-700 hover:text-orange-600 transition-colors cursor-pointer flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Menu"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-4 max-h-[calc(100vh-56px)] overflow-y-auto">
            <div className="flex flex-col space-y-4">
              {/* Mobile menus for non-logged users */}
              {!isLoggedInFinal && (
                <>
                  {/* Divider */}
                  <div className="border-t border-gray-200"></div>

                  {/* Mobile Entreprises Menu */}
                  <div className="px-4">
                    <button
                      onClick={() => setShowEntreprisesMenu(!showEntreprisesMenu)}
                      className="flex items-center space-x-1 text-xs text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer min-h-[44px] w-full text-left"
                    >
                      <span>Entreprises</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showEntreprisesMenu && (
                      <div className="ml-4 mt-2 space-y-2">
                        {entreprisesMenuItems.map((item, index) => (
                          <a
                            key={index}
                            href={item.href}
                            onClick={() => setShowMobileMenu(false)}
                            className="block text-xs text-gray-600 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mobile Influenceurs Menu */}
                  <div className="px-4">
                    <button
                      onClick={() => setShowInfluenceursMenu(!showInfluenceursMenu)}
                      className="flex items-center space-x-1 text-xs text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer min-h-[44px] w-full text-left"
                    >
                      <span>Influenceurs</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showInfluenceursMenu && (
                      <div className="ml-4 mt-2 space-y-2">
                        {influenceursMenuItems.map((item, index) => (
                          <a
                            key={index}
                            href={item.href}
                            onClick={() => setShowMobileMenu(false)}
                            className="block text-xs text-gray-600 hover:text-orange-600 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Language buttons - En bas du menu */}
                  <div className="mt-auto pt-4 border-t border-gray-200 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setLanguage('fr');
                        }}
                        className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[60px] flex items-center justify-center ${
                          language === 'fr' 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        FR
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('en');
                        }}
                        className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[60px] flex items-center justify-center ${
                          language === 'en' 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Mobile logged in navigation */}
              {isLoggedInFinal && (
                <>
                  {/* User info mobile */}
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <Crown className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="text-sm font-medium text-gray-900">{userName}</div>
                    </div>
                  </div>
                  
                  {/* Divider before navigation */}
                  <div className="border-t border-gray-200 my-3"></div>
                </>
              )}

              {isLoggedInFinal && userTypeFinal === 'entreprise' && (
                <>
                  {entrepriseLoggedInMenu.map((item, index) => (
                    item.hasSubmenu ? (
                      <div key={index} className="w-full" ref={mobileDashboardMenuRef}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDashboardMenu(!showDashboardMenu);
                          }}
                          className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span>{item.name}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showDashboardMenu ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {showDashboardMenu && (
                          <div className="ml-4 mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                            <a
                              href="/home"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Tableau de bord
                            </a>
                            <a
                              href="/host/my-places"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Prestations
                            </a>
                            <Link
                              href="/host/my-places"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Annonces
                            </Link>
                            <a
                              href="/host/my-places"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Devis
                            </a>
                            <a
                              href="/parametres"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Facturation
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <a
                        key={index}
                        href={item.href}
                        onClick={() => setShowMobileMenu(false)}
                        className="block px-4 py-2 text-xs text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer min-h-[44px] flex items-center"
                      >
                        {item.name}
                      </a>
                    )
                  ))}
                </>
              )}

              {isLoggedInFinal && userTypeFinal === 'influenceur' && (
                <>
                  {influenceurLoggedInMenu.map((item, index) => (
                    item.hasSubmenu ? (
                      <div key={index} className="w-full" ref={mobileDashboardMenuRef}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDashboardMenu(!showDashboardMenu);
                          }}
                          className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span>{item.name}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showDashboardMenu ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {showDashboardMenu && (
                          <div className="ml-4 mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                            <a
                              href="/home"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Tableau de bord
                            </a>
                            <a
                              href="/host/my-places"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Prestations
                            </a>
                            <Link
                              href="/host/my-places"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Annonces
                            </Link>
                            <a
                              href="/host/my-places"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Devis
                            </a>
                            <a
                              href="/parametres"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Facturation
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <a
                        key={index}
                        href={item.href}
                        onClick={() => setShowMobileMenu(false)}
                        className="block text-sm text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                      >
                        {item.name}
                      </a>
                    )
                  ))}
                </>
              )}

              {isLoggedInFinal && userTypeFinal === 'agence' && (
                <>
                  {agenceLoggedInMenu.map((item, index) => (
                    item.hasSubmenu ? (
                      <div key={index} className="w-full" ref={mobileDashboardMenuRef}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDashboardMenu(!showDashboardMenu);
                          }}
                          className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span>{item.name}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showDashboardMenu ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {showDashboardMenu && (
                          <div className="ml-4 mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                            <a
                              href="/home"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Tableau de bord
                            </a>
                            <a
                              href="/host/my-places"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Prestations
                            </a>
                            <Link
                              href="/host/my-places"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Annonces
                            </Link>
                            <a
                              href="/host/my-places"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Devis
                            </a>
                            <a
                              href="/parametres"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMobileMenu(false);
                              }}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200 cursor-pointer rounded-lg"
                            >
                              Facturation
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <a
                        key={index}
                        href={item.href}
                        onClick={() => setShowMobileMenu(false)}
                        className="block px-4 py-2 text-xs text-gray-700 hover:text-orange-600 font-medium transition-colors duration-200 cursor-pointer min-h-[44px] flex items-center"
                      >
                        {item.name}
                      </a>
                    )
                  ))}
                </>
              )}
              
              {/* Favoris link mobile - Juste avant Paramètres */}
              {isLoggedInFinal && (
                <>
                  <Link 
                    href="/favoris"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:text-orange-600 hover:bg-orange-50 font-medium transition-colors duration-200 cursor-pointer rounded-lg mb-2 flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Favoris
                  </Link>
                  
                  {/* Mon calendrier link mobile */}
                  <Link 
                    href="/mon-calendrier"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:text-orange-600 hover:bg-orange-50 font-medium transition-colors duration-200 cursor-pointer rounded-lg mb-2 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Mon calendrier
                  </Link>
                  
                  {/* Settings link mobile - Juste avant Déconnexion */}
                  <Link 
                    href="/parametres"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:text-orange-600 hover:bg-orange-50 font-medium transition-colors duration-200 cursor-pointer rounded-lg mb-2"
                  >
                    {t('nav.settings')}
                  </Link>
                  
                  {/* Language selector mobile */}
                  <div className="px-4 py-2 mb-2">
                    <div className="text-[10px] font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <Globe className="w-3 h-3" />
                      Langue
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setLanguage('fr');
                        }}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] ${
                          language === 'fr' 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>Français</span>
                        {language === 'fr' && <Check className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('en');
                        }}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] ${
                          language === 'en' 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>English</span>
                        {language === 'en' && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Logout button mobile */}
                  <button
                    onClick={() => {
                      authAPI.logout();
                      setShowMobileMenu(false);
                      router.push('/');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors duration-200 cursor-pointer rounded-lg min-h-[44px] flex items-center"
                  >
                    Déconnexion
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}