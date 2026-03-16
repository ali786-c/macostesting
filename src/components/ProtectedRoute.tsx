'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getItem } from '@/lib/storage';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const token = getItem('authToken');
        const loggedIn = getItem('finalIsLoggedIn') === 'true';
        const userId = getItem('userId');
        
        const authenticated = !!(token || loggedIn) && !!userId;
        
        setIsAuthenticated(authenticated);
        setIsChecking(false);
        
        if (!authenticated) {
          // Sauvegarder l'URL actuelle pour rediriger après connexion
          const currentPath = window.location.pathname + window.location.search;
          if (currentPath !== redirectTo) {
            sessionStorage.setItem('redirectAfterLogin', currentPath);
          }
          console.log(`[PROTECTED ROUTE] Non authentifié → redirect vers ${redirectTo} (isCapacitor=${isCapacitor()})`);
          if (isCapacitor()) {
            capacitorNavigate(redirectTo);
          } else {
            router.push(redirectTo);
          }
        }
      }
    };

    checkAuth();
  }, [router, redirectTo]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D5016] mx-auto mb-4" />
          <p className="text-[#717171]">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // La redirection est en cours
  }

  return <>{children}</>;
}
