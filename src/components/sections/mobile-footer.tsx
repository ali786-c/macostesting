'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, BookOpen, MessageSquare, Heart, User, Calendar, FileText, LayoutDashboard, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { messagesAPI, rentoallUsersAPI, UserDTO } from '@/services/api';
import { isCapacitor, handleCapacitorLinkClick } from '@/lib/capacitor';

export default function MobileFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [userMode, setUserMode] = useState<'client' | 'host'>('client');
  const [bankingInfoNeeded, setBankingInfoNeeded] = useState(false);

  // Vérifier le mode utilisateur
  useEffect(() => {
    const checkUserMode = () => {
      if (typeof window !== 'undefined') {
        const savedMode = localStorage.getItem('userMode') as 'client' | 'host' | null;
        if (savedMode === 'client' || savedMode === 'host') {
          setUserMode(savedMode);
        } else {
          setUserMode('client');
        }
      }
    };

    checkUserMode();
    window.addEventListener('userModeChanged', checkUserMode);
    window.addEventListener('storage', checkUserMode);

    return () => {
      window.removeEventListener('userModeChanged', checkUserMode);
      window.removeEventListener('storage', checkUserMode);
    };
  }, []);

  // Charger le compteur de messages non lus
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken');
        
        // Ne pas charger si pas connecté
        if (!userId || !token) {
          setUnreadMessagesCount(0);
          return;
        }

        const count = await messagesAPI.getUnreadCount(parseInt(userId, 10));
        setUnreadMessagesCount(count);
      } catch (error) {
        console.error('Erreur lors du chargement des messages non lus:', error);
        setUnreadMessagesCount(0);
      }
    };

    // Vérifier si connecté avant de charger
    const token = localStorage.getItem('authToken');
    if (token) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 60000);

      // Rafraîchir quand les messages sont marqués lus (depuis la page Messages)
      const handleMessagesRead = () => {
        setTimeout(loadUnreadCount, 800);
      };
      window.addEventListener('messagesRead', handleMessagesRead);

      // Rafraîchir quand l'utilisateur revient sur l'onglet
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') loadUnreadCount();
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(interval);
        window.removeEventListener('messagesRead', handleMessagesRead);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
    const id = setTimeout(() => setUnreadMessagesCount(0), 0);
    return () => clearTimeout(id);
  }, []);

  // En mode hôte : savoir si les infos bancaires (Stripe Connect + IBAN) sont à compléter
  useEffect(() => {
    const loadBankingStatus = async () => {
      if (userMode !== 'host') {
        setBankingInfoNeeded(false);
        return;
      }
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('authToken');
      if (!userId || !token) {
        setBankingInfoNeeded(false);
        return;
      }
      try {
        const profile = await rentoallUsersAPI.getProfile(parseInt(userId, 10)) as UserDTO & { stripeAccountId?: string };
        const stripeAccountId = profile.stripeAccountId;
        const iban = profile.iban;
        const stripeOk = !!stripeAccountId;
        const ibanOk = typeof iban === 'string' && iban.trim().length > 0;
        setBankingInfoNeeded(!(stripeOk && ibanOk));
      } catch {
        setBankingInfoNeeded(false);
      }
    };

    loadBankingStatus();
    const onBankingUpdated = () => loadBankingStatus();
    window.addEventListener('bankingInfoUpdated', onBankingUpdated);
    return () => window.removeEventListener('bankingInfoUpdated', onBankingUpdated);
  }, [userMode]);

  const isActive = (path: string) => {
    // Cas spécial pour la recherche : actif uniquement sur /search-parkings, pas sur home
    if (path === '/search-parkings') {
      return pathname === '/search-parkings' || pathname.startsWith('/search-parkings/');
    }
    // Cas spécial pour /reservations (agenda en mode hôte) - doit matcher /reservations et ses sous-pages
    if (path === '/reservations') {
      return pathname === '/reservations' || pathname.startsWith('/reservations/');
    }
    // Mode hôte : Annonces = /host/my-places
    if (path === '/host/my-places') {
      return pathname === '/host/my-places' || pathname.startsWith('/host/my-places/');
    }
    // Cas spécial pour /mon-calendrier
    if (path === '/mon-calendrier') {
      return pathname === '/mon-calendrier' || pathname.startsWith('/mon-calendrier/') || pathname === '/calendrier' || pathname.startsWith('/calendrier/');
    }
    // Cas spécial pour /bons-cadeaux
    if (path === '/bons-cadeaux') {
      return pathname === '/bons-cadeaux' || pathname.startsWith('/bons-cadeaux/');
    }
    // Pour les autres chemins, vérifier si le pathname commence par le path
    return pathname === path || pathname.startsWith(path + '/');
  };

  // Menu pour le mode client
  const clientMenuItems = [
    {
      icon: MessageSquare,
      label: 'Messagerie',
      path: '/messages',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null
    },
    {
      icon: BookOpen,
      label: 'Réservations',
      path: '/reservations'
    },
    {
      icon: Search,
      label: 'Rechercher',
      path: '/search-parkings'
    },
    {
      icon: Heart,
      label: 'Favoris',
      path: '/favoris'
    },
    {
      icon: Gift,
      label: 'Bons cadeaux',
      path: '/bons-cadeaux'
    },
    {
      icon: User,
      label: 'Profil',
      path: '/parametres'
    }
  ];

  // Menu pour le mode hôte
  const hostMenuItems = [
    {
      icon: FileText,
      label: 'Mes espaces',
      path: '/host/my-places'
    },
    {
      icon: Calendar,
      label: 'Calendrier',
      path: '/mon-calendrier'
    },
    {
      icon: LayoutDashboard,
      label: 'Agenda',
      path: '/reservations'
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      path: '/messages',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null
    },
    {
      icon: User,
      label: 'Profil',
      path: '/parametres',
      badge: bankingInfoNeeded ? 1 : null
    }
  ];

  const menuItems = userMode === 'host' ? hostMenuItems : clientMenuItems;

  const handleNavClick = (e: React.MouseEvent, item: { path: string }) => {
    if (item.path === '/host/my-places') {
      localStorage.setItem('userMode', 'host');
    }
    handleCapacitorLinkClick(e, item.path, router);
  };

  // Sur Capacitor, toujours afficher (même tablette). Sur web, masquer sur desktop (md+).
  const hideOnDesktop = !isCapacitor();

  return (
    <footer
      className={`mobile-footer fixed bottom-0 left-0 right-0 z-[99999] bg-white/95 backdrop-blur-sm border-t border-slate-200/80 shadow-[0_-1px_6px_rgba(0,0,0,0.06)] ${hideOnDesktop ? 'md:hidden' : ''}`}
      style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom, 0px))' }}
      data-testid="mobile-footer-nav"
    >
      <nav className="flex items-stretch justify-around min-h-[44px]" aria-label="Navigation principale">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={index}
              href={item.path}
              prefetch={false}
              onClick={(e) => handleNavClick(e, item)}
              className={`flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] py-1.5 transition-colors touch-manipulation active:scale-[0.97] relative ${
                active ? 'text-emerald-600' : 'text-slate-500'
              }`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-6 h-6 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-slate-500'}`}
                  strokeWidth={active ? 2.5 : 2}
                  fill={active && (item.icon === Heart || item.icon === User) ? 'currentColor' : 'none'}
                />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-1 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
