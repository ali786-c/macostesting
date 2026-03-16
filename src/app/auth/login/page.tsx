'use client';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Building,
  Users,
  Briefcase,
  Crown,
  Check
} from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { authAPI, getBaseURLForOAuth2 } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { setItem } from '@/lib/storage';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    console.log('🔵 [LOGIN FORM] Page de connexion chargée');
    // Nettoyer le flag d'inscription OAuth au montage
    localStorage.removeItem('oauthSignup');
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const welcome = searchParams.get('welcome');
    const signup = searchParams.get('signup');
    if (success === 'true' || welcome === 'true') {
      console.log('✅ [LOGIN FORM] Message de bienvenue détecté dans l\'URL');
      console.log('✅ [LOGIN FORM] Type d\'inscription:', signup);
      // Utiliser setTimeout pour éviter l'appel synchrone de setState dans useEffect
      setTimeout(() => {
        setShowSuccessMessage(true);
        // Hide success message after 8 seconds
        setTimeout(() => setShowSuccessMessage(false), 8000);
      }, 0);
    }
  }, [searchParams]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    console.log('📝 [LOGIN FORM] Soumission du formulaire de connexion:', {
      email: formData.email,
      password: '***' // Masquer le mot de passe
    });

    // Validation
    if (!formData.email || !formData.password) {
      setError(t('login.errors.fillAllFields'));
      return;
    }

    setIsLoading(true);
    
    // Logs du payload avant envoi
    console.log("📝 [LOGIN FORM] ========================================");
    console.log("📝 [LOGIN FORM] Préparation de la requête de connexion");
    console.log("📝 [LOGIN FORM] ========================================");
    console.log("📝 [LOGIN FORM] Email:", formData.email);
    console.log("📝 [LOGIN FORM] Password:", "***");
    console.log("📝 [LOGIN FORM] Payload qui sera envoyé:", {
      email: formData.email,
      password: "***"
    });
    console.log("📝 [LOGIN FORM] Payload JSON:", JSON.stringify({
      email: formData.email,
      password: "***"
    }, null, 2));
    console.log("📝 [LOGIN FORM] ========================================");
    
    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      });
      
      console.log("✅ [LOGIN FORM] ========================================");
      console.log("✅ [LOGIN FORM] Connexion réussie !");
      console.log("✅ [LOGIN FORM] ========================================");
      console.log("✅ [LOGIN FORM] Réponse du backend:", response);
      console.log("✅ [LOGIN FORM] Token présent:", !!response.token);
      console.log("✅ [LOGIN FORM] ID utilisateur:", response.id);
      console.log("✅ [LOGIN FORM] Email:", response.email);
      console.log("✅ [LOGIN FORM] Nom:", response.firstName, response.lastName);
      console.log("✅ [LOGIN FORM] Type:", response.type);
      console.log("✅ [LOGIN FORM] ========================================");
      
      // Stocker le token JWT et infos user (localStorage + Capacitor Preferences)
      if (response.token) {
        setItem('authToken', response.token);
      }
      
      if (response.id) {
        setItem('finalIsLoggedIn', 'true');
        setItem('userId', String(response.id));
        setItem('userEmail', response.email || formData.email);
        
        const userName = response.firstName && response.lastName 
          ? `${response.firstName} ${response.lastName}`
          : response.email?.split('@')[0] || formData.email.split('@')[0];
        setItem('userName', userName);
        
        // Toujours mettre le mode client par défaut à la connexion
        setItem('userMode', 'client');
        
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
          console.log('✅ [LOGIN FORM] Type utilisateur mappé:', { backend: backendType, frontend: frontendType });
        } else {
          console.warn('⚠️ [LOGIN FORM] Aucun type utilisateur dans la réponse');
        }
        
        setItem('finalIsLoggedIn', 'true');
        console.log('✅ [LOGIN FORM] finalIsLoggedIn mis à true');
        
        // Toujours mettre le mode client par défaut à la connexion
        setItem('userMode', 'client');
        
        // Déclencher plusieurs événements pour s'assurer que le header se met à jour
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('userModeChanged'));
        setTimeout(() => {
          window.dispatchEvent(new Event('storage'));
        }, 50);
        setTimeout(() => {
          window.dispatchEvent(new Event('storage'));
        }, 200);
      }
      
      setIsLoading(false);
      
      // Redirection vers la page de recherche de parkings après connexion réussie
      if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/search-parkings'); }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ [LOGIN FORM] Erreur lors de la connexion:', {
        message: errorMessage,
        error: err
      });
      
      setIsLoading(false);
      
      // Message d'erreur pour l'utilisateur
      const userErrorMessage = errorMessage || t('login.errors.invalidCredentials');
      setError(userErrorMessage);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    console.log('🔵 [LOGIN FORM] Tentative de connexion sociale:', provider);
    
    if (provider === 'google') {
      try {
        // S'assurer que ce n'est pas une inscription
        localStorage.removeItem('oauthSignup');
        
        // Le frontend redirige vers le backend Spring qui gère tout le flow OAuth2
        // Le backend gère le redirect_uri, pas le frontend
        const backendURL = getBaseURLForOAuth2();
        const oauthUrl = `${backendURL}/oauth2/authorization/google`;
        
        console.log('🔵 [LOGIN FORM] ========================================');
        console.log('🔵 [LOGIN FORM] Configuration OAuth2 Google pour CONNEXION');
        console.log('🔵 [LOGIN FORM] Environnement:', process.env.NODE_ENV || 'development');
        console.log('🔵 [LOGIN FORM] URL backend:', backendURL);
        console.log('🔵 [LOGIN FORM] URL complète OAuth2:', oauthUrl);
        console.log('🔵 [LOGIN FORM] ========================================');
        
        // Redirection directe vers Spring Security qui gère le flow OAuth2
        // Spring gère automatiquement le redirect_uri (/login/oauth2/code/google)
        window.location.href = oauthUrl;
      } catch (error) {
        console.error('❌ [LOGIN FORM] Erreur lors de la connexion Google:', error);
        setError('Erreur lors de la connexion Google');
      }
    } else {
      console.warn('⚠️ [LOGIN FORM] Provider non implémenté:', provider);
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden w-full max-w-full">
      <HeaderNavigation />

      {/* Main Content - Mobile: Optimisé */}
      <main className="bg-white w-full pt-16 sm:pt-20 md:pt-24 pb-20 sm:pb-8 md:pb-12 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 0px))', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-12rem)] px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Login Card - Mobile: Compact */}
          <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl shadow-xl p-4 sm:p-5 md:p-6 lg:p-8">
            {/* Logo + phrase neuromarketing */}
            <div className="flex flex-col items-center mb-4 sm:mb-5 md:mb-6">
              <Image
                src="/logoren.png"
                alt="Rentoall"
                width={160}
                height={48}
                className="h-10 sm:h-12 w-auto mb-2"
                priority
              />
              <p className="text-xs sm:text-sm md:text-base text-slate-600 text-center max-w-xs">
                Connectez-vous pour retrouver votre espace idéal en quelques secondes et ne plus jamais perdre un mètre carré.
              </p>
            </div>
            {/* Tabs - Mobile: Compact */}
            <div className="flex mb-3 sm:mb-4 md:mb-6 lg:mb-8">
              <button className="flex-1 px-2.5 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 min-h-[44px] md:min-h-0 bg-emerald-600 text-white text-xs sm:text-sm md:text-base font-semibold rounded-l-lg sm:rounded-l-xl md:rounded-l-2xl cursor-pointer touch-manipulation active:opacity-90">
                {t('login.title')}
              </button>
              <button 
                id="btn-link-signup"
                onClick={() => router.push('/auth/signup')}
                className="flex-1 px-2.5 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 min-h-[44px] md:min-h-0 bg-slate-100 text-slate-700 text-xs sm:text-sm md:text-base font-semibold rounded-r-lg sm:rounded-r-xl md:rounded-r-2xl hover:bg-slate-200 active:bg-slate-300 transition-colors cursor-pointer touch-manipulation"
              >
                {t('login.signup')}
              </button>
            </div>

            {/* Welcome Message */}
            {showSuccessMessage && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-emerald-800 font-semibold text-sm md:text-base mb-1">
                      {searchParams.get('signup') === 'google' 
                        ? t('login.success.googleSignup')
                        : t('login.success.welcome')}
                    </p>
                    <p className="text-emerald-700 text-xs md:text-sm">
                      {searchParams.get('signup') === 'google'
                        ? t('login.success.googleDescription')
                        : t('login.success.welcomeDescription')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form - Mobile: Compact */}
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6">
              {/* Email Field - Mobile: Compact */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 md:pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-gray-400" />
                  </div>
                  <input
                    id="input-email-login"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={t('login.email')}
                    className="w-full pl-10 sm:pl-11 md:pl-12 pr-3 sm:pr-3.5 md:pr-4 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
                  <p className="text-red-600 text-xs md:text-sm">{error}</p>
                </div>
              )}

              {/* Password Field - Mobile: Compact */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 md:pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-gray-400" />
                  </div>
                  <input
                    id="input-password-login"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder={t('login.password')}
                    className="w-full pl-10 sm:pl-11 md:pl-12 pr-10 sm:pr-11 md:pr-12 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base bg-white border border-slate-200 rounded-lg sm:rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 sm:pr-3.5 md:pr-4 flex items-center cursor-pointer touch-manipulation active:opacity-70"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button - Mobile: Compact */}
              <button
                id="btn-submit-login"
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 sm:py-3 md:py-4 min-h-[44px] md:min-h-0 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm sm:text-base md:text-lg rounded-lg sm:rounded-xl transition-colors duration-200 touch-manipulation active:scale-95 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('login.loading')}
                  </span>
                ) : (
                  t('login.loginButton')
                )}
              </button>

              {/* Social Login Separator */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500">{t('login.orContinue')}</span>
                </div>
              </div>

              {/* Google Login Button */}
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 min-h-[44px] md:min-h-0 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer touch-manipulation active:scale-95"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm md:text-base">{t('login.continueWithGoogle')}</span>
              </button>

              {/* Privacy Notice */}
              <p className="text-xs text-slate-500 text-center mt-2">
                {t('login.privacyNotice')}
              </p>

              {/* Forgot Password */}
              <div className="text-center">
                <a href="/auth/forgot-password" className="text-slate-600 hover:text-emerald-600 text-xs md:text-sm transition-colors cursor-pointer">
                  {t('login.forgotPassword')}
                </a>
              </div>

              {/* Sign Up Link */}
              <div className="text-center">
                <span className="text-slate-600 text-xs md:text-sm">{t('login.noAccount')} </span>
                <a 
                  href="/auth/signup" 
                  className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs md:text-sm transition-colors cursor-pointer"
                >
                  {t('login.signUp')}
                </a>
              </div>
            </form>
          </div>
        </div>
        </div>
      </main>
      <FooterNavigation />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
