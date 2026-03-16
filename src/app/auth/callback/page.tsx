'use client';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/services/api';
import HeaderNavigation from '@/components/sections/header-navigation';
import { setItem, removeItem, getItem } from '@/lib/storage';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔵 [AUTH CALLBACK] Traitement du callback OAuth2');
        
        // Extraire le token depuis les query parameters
        const tokenFromUrl = searchParams.get('token');
        const errorParam = searchParams.get('error');
        const isSignup = searchParams.get('signup') === 'true' || getItem('oauthSignup') === 'true';
        
        // Vérifier les erreurs
        if (errorParam) {
          throw new Error(errorParam === 'google' ? 'Erreur lors de la connexion Google' : errorParam);
        }
        
        // Vérifier que le token est présent
        if (!tokenFromUrl) {
          throw new Error('Token manquant dans l\'URL');
        }
        
        console.log('✅ [AUTH CALLBACK] Token trouvé dans l\'URL');
        console.log('🔵 [AUTH CALLBACK] Inscription détectée:', isSignup);
        
        setItem('authToken', tokenFromUrl);
        removeItem('oauthSignup');
        
        // Configurer le header Authorization pour les futures requêtes
        // (géré par l'intercepteur axios dans api.ts, mais on peut aussi le faire ici)
        
        // Récupérer les informations utilisateur avec le token
        try {
          const response = await authAPI.googleOAuthSuccess();
          console.log('✅ [AUTH CALLBACK] Informations utilisateur récupérées:', response);
          
          // Stocker les informations utilisateur temporairement
          // Mais on ne les garde pas si c'est une inscription (on redirige vers login)
          if (response.id && !isSignup) {
            setItem('finalIsLoggedIn', 'true');
            setItem('userId', String(response.id));
            setItem('userEmail', response.email || '');
            const userName = response.firstName && response.lastName 
              ? `${response.firstName} ${response.lastName}`
              : response.email?.split('@')[0] || '';
            setItem('userName', userName);
            setItem('userMode', 'client');
            if (response.type) {
              const typeMapping: { [key: string]: string } = {
                'CLIENT': 'client',
                'PROFESSIONAL': 'professionnel',
                'AGENCY': 'agence',
                'ENTERPRISE': 'entreprise'
              };
              const backendType = response.type.toUpperCase();
              const frontendType = typeMapping[backendType] || backendType.toLowerCase();
              setItem('finalUserType', frontendType);
            }
            
            // Déclencher les événements pour mettre à jour le header
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('userModeChanged'));
            setTimeout(() => {
              window.dispatchEvent(new Event('storage'));
            }, 50);
          }
          
          setIsLoading(false);
          
          // Si c'est une inscription, rediriger vers la page de connexion avec un message de succès
          // Le backend a déjà créé l'utilisateur en base, on redirige vers login pour qu'il se connecte
          if (isSignup) {
            console.log('✅ [AUTH CALLBACK] Inscription Google réussie, redirection vers la connexion');
            // Nettoyer le token car on veut que l'utilisateur se connecte normalement
            removeItem('authToken');
            if (isCapacitor()) { capacitorNavigate('/auth/login?welcome=true&signup=google'); } else { router.push('/auth/login?welcome=true&signup=google'); }
            return;
          }
          
          // Sinon, c'est une connexion existante, rediriger vers la page de recherche
          console.log('✅ [AUTH CALLBACK] Connexion Google réussie, redirection vers la recherche');
          if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/search-parkings'); }
          return;
        } catch (profileError) {
          console.error('❌ [AUTH CALLBACK] Erreur lors de la récupération du profil:', profileError);
          setIsLoading(false);
          
          // Si c'est une inscription, rediriger quand même vers login
          if (isSignup) {
            removeItem('authToken');
            if (isCapacitor()) { capacitorNavigate('/auth/login?welcome=true&signup=google'); } else { router.push('/auth/login?welcome=true&signup=google'); }
            return;
          }
          
          // Sinon, rediriger vers search-parkings
          window.dispatchEvent(new Event('storage'));
          setTimeout(() => {
            window.dispatchEvent(new Event('storage'));
          }, 50);
          
          if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/search-parkings'); }
          return;
        }
      } catch (err: unknown) {
        console.error('❌ [AUTH CALLBACK] Erreur lors du callback:', err);
        const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
        const errorMessage = errorObj.response?.data?.message || errorObj.message || 'Erreur lors de la connexion';
        setError(errorMessage);
        setIsLoading(false);
        
        // Nettoyer le flag d'inscription en cas d'erreur
        removeItem('oauthSignup');
        
        // Rediriger vers la page de login après 3 secondes
        setTimeout(() => {
          if (isCapacitor()) { capacitorNavigate('/auth/login?error=oauth'); } else { router.push('/auth/login?error=oauth'); }
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden pb-mobile-footer md:pb-0">
      <HeaderNavigation />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="text-center max-w-md w-full">
          {isLoading ? (
            <>
              <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg text-slate-700 font-medium">Connexion en cours...</p>
              <p className="text-sm text-slate-500 mt-2">Veuillez patienter pendant que nous finalisons votre connexion.</p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">✕</span>
              </div>
              <p className="text-lg text-red-600 font-semibold mb-2">Erreur de connexion</p>
              <p className="text-sm text-slate-600 mb-4">{error}</p>
              <p className="text-xs text-slate-500">Redirection vers la page de connexion...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-emerald-600 text-2xl">✓</span>
              </div>
              <p className="text-lg text-slate-700 font-semibold">Connexion réussie !</p>
              <p className="text-sm text-slate-500 mt-2">Redirection en cours...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white overflow-x-hidden pb-mobile-footer md:pb-0">
        <HeaderNavigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-slate-700">Chargement...</p>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
