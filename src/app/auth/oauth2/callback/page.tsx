'use client';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/services/api';
import HeaderNavigation from '@/components/sections/header-navigation';
import { setItem } from '@/lib/storage';

function OAuth2CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('🔵 [OAUTH2 CALLBACK] Traitement du callback OAuth2');
        
        // Vérifier si le token est dans l'URL (méthode 1)
        const tokenFromUrl = searchParams.get('token');
        const errorParam = searchParams.get('error');
        
        if (errorParam) {
          throw new Error(errorParam === 'google' ? 'Erreur lors de la connexion Google' : errorParam);
        }
        
        // Si le token est dans l'URL, le stocker directement
        if (tokenFromUrl) {
          console.log('✅ [OAUTH2 CALLBACK] Token trouvé dans l\'URL');
          setItem('authToken', tokenFromUrl);
          
          // Récupérer les informations utilisateur avec le token
          try {
            const response = await authAPI.googleOAuthSuccess();
            console.log('✅ [OAUTH2 CALLBACK] Informations utilisateur récupérées:', response);
            
            // Stocker les informations utilisateur
            if (response.id) {
              setItem('finalIsLoggedIn', 'true');
              setItem('userId', String(response.id));
              setItem('userEmail', response.email || '');
              
              // Construire le nom complet
              const userName = response.firstName && response.lastName 
                ? `${response.firstName} ${response.lastName}`
                : response.email?.split('@')[0] || '';
              setItem('userName', userName);
              
              // Toujours mettre le mode client par défaut à la connexion
              setItem('userMode', 'client');
              
              // Stocker le type d'utilisateur si présent
              if (response.type) {
                const typeMapping: { [key: string]: string } = {
                  'CLIENT': 'client',
                  'PROFESSIONAL': 'influenceur',
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
            if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/search-parkings'); }
            return;
          } catch (profileError) {
            console.error('❌ [OAUTH2 CALLBACK] Erreur lors de la récupération du profil:', profileError);
            // Continuer même si la récupération du profil échoue, on a le token
            setIsLoading(false);
            if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/search-parkings'); }
            return;
          }
        }
        
        // Sinon, utiliser l'endpoint /auth/oauth2/success (méthode 2 - cookie httpOnly)
        console.log('🔵 [OAUTH2 CALLBACK] Aucun token dans l\'URL, utilisation de l\'endpoint /success');
        const response = await authAPI.googleOAuthSuccess();
        
        console.log('✅ [OAUTH2 CALLBACK] Connexion Google réussie:', response);
        
        // Stocker le token si présent (peut être dans la réponse même avec cookie)
        if (response.token) {
          setItem('authToken', response.token);
        }
        
        // Stocker les informations utilisateur
        if (response.id) {
          setItem('finalIsLoggedIn', 'true');
          setItem('userId', String(response.id));
          setItem('userEmail', response.email || '');
          
          // Construire le nom complet
          const userName = response.firstName && response.lastName 
            ? `${response.firstName} ${response.lastName}`
            : response.email?.split('@')[0] || '';
          setItem('userName', userName);
          
          // Toujours mettre le mode client par défaut à la connexion
          setItem('userMode', 'client');
          
          // Stocker le type d'utilisateur si présent
          if (response.type) {
            const typeMapping: { [key: string]: string } = {
              'CLIENT': 'client',
              'PROFESSIONAL': 'influenceur',
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
        
        // Rediriger vers la page de recherche de parkings
        if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/search-parkings'); }
      } catch (err: unknown) {
        console.error('❌ [OAUTH2 CALLBACK] Erreur lors du callback:', err);
        const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
        const errorMessage = errorObj.response?.data?.message || errorObj.message || 'Erreur lors de la connexion Google';
        setError(errorMessage);
        setIsLoading(false);
        
        // Rediriger vers la page de login après 3 secondes
        setTimeout(() => {
          if (isCapacitor()) { capacitorNavigate('/auth/login?error=google'); } else { router.push('/auth/login?error=google'); }
        }, 3000);
      }
    };

    handleOAuthCallback();
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

export default function OAuth2Callback() {
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
      <OAuth2CallbackContent />
    </Suspense>
  );
}

