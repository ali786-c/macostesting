'use client';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

import { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Building,
  FileText,
  MapPin,
  Gift,
  Check,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { authAPI, RegisterPayload, sireneAPI, SireneValidationResponse, getBaseURLForOAuth2 } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProfessional, setIsProfessional] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldValid, setFieldValid] = useState<Record<string, boolean | null>>({});
  const [isValidatingSiret, setIsValidatingSiret] = useState(false);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const siretValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    // Champs professionnels
    companyName: '',
    companyAddress: '',
    siret: '',
    vatNumber: '',
    // Champ parrainage
    referralCode: '',
  });

  useEffect(() => {
    console.log('🔵 [SIGNUP FORM] Page d\'inscription chargée');
    
    // Charger le code de parrainage depuis l'URL si présent (paramètre ref)
    const refCode = searchParams.get('ref');
    if (refCode) {
      console.log('🔵 [SIGNUP FORM] Code de parrainage détecté dans l\'URL:', refCode);
      setFormData(prev => ({
        ...prev,
        referralCode: refCode.toUpperCase()
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      if (siretValidationTimeoutRef.current) {
        clearTimeout(siretValidationTimeoutRef.current);
      }
    };
  }, []);


  const handleInputChange = (field: string, value: string) => {
    // Filtrage automatique pour les champs numériques
    let filteredValue = value;

    if (field === 'siret') {
      // Ne garder que les chiffres et limiter à 14 caractères
      filteredValue = value.replace(/\D/g, '').slice(0, 14);
    } else if (field === 'vatNumber') {
      // Pour le numéro TVA, on garde généralement les lettres et chiffres, mais on peut limiter la longueur
      // Les numéros TVA français font généralement 13 caractères (FR + 11 chiffres)
      filteredValue = value.replace(/[^A-Z0-9]/gi, '').slice(0, 13);
    } else if (field === 'phoneNumber') {
      // N'accepter que les chiffres et le signe +
      // Filtrer pour ne garder que les chiffres et le +
      let filteredValue = value.replace(/[^0-9+]/g, '');
      // S'assurer que le + n'apparaît qu'au début
      if (filteredValue.includes('+')) {
        const plusIndex = filteredValue.indexOf('+');
        if (plusIndex === 0) {
          // Le + est au début, garder le + et limiter à 12 chiffres après
          const digitsOnly = filteredValue.replace(/\+/g, '');
          if (digitsOnly.length <= 12) {
            filteredValue = '+' + digitsOnly;
          } else {
            filteredValue = '+' + digitsOnly.slice(0, 12);
          }
        } else {
          // Le + n'est pas au début, le retirer et limiter à 12 chiffres
          const digitsOnly = filteredValue.replace(/\+/g, '');
          filteredValue = digitsOnly.slice(0, 12);
        }
      } else {
        // Pas de +, limiter à 12 chiffres
        filteredValue = filteredValue.slice(0, 12);
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: filteredValue
    }));

    // Validation temps réel avec la valeur filtrée
    validateField(field, filteredValue);

    // Validation SIRET via API quand le champ est rempli (exactement 9 ou 14 chiffres)
    if (field === 'siret' && isProfessional) {
      // Annuler la validation précédente si elle existe
      if (siretValidationTimeoutRef.current) {
        clearTimeout(siretValidationTimeoutRef.current);
      }

      // Ne valider que si le SIRET a exactement 9 ou 14 chiffres
      if (filteredValue.length === 9 || filteredValue.length === 14) {
        // Attendre 800ms après la dernière saisie avant de valider
        siretValidationTimeoutRef.current = setTimeout(async () => {
          // Vérifier à nouveau la longueur au moment de la validation
          const currentSiret = formData.siret;
          if (currentSiret.length === 9 || currentSiret.length === 14) {
            await validateSiretWithAPI(currentSiret);
          }
        }, 800);
      } else if (filteredValue.length > 0 && filteredValue.length < 9) {
        // Si le SIRET est incomplet, effacer les erreurs précédentes
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.siret;
          return newErrors;
        });
        setFieldValid(prev => ({
          ...prev,
          siret: null, // Réinitialiser l'état de validation
        }));
      }
    }
  };

  // Fonction pour valider le SIRET via l'API
  const validateSiretWithAPI = async (siretValue: string) => {
    // Vérifier que le SIRET a exactement 9 ou 14 chiffres
    if (!siretValue || (siretValue.length !== 9 && siretValue.length !== 14)) {
      console.log('⚠️ [SIGNUP] SIRET incomplet, validation annulée:', siretValue.length);
      return;
    }

    // Nettoyer le SIRET (supprimer les espaces et caractères non numériques)
    const cleanSiret = siretValue.replace(/\D/g, '');
    if (cleanSiret.length !== 9 && cleanSiret.length !== 14) {
      console.log('⚠️ [SIGNUP] SIRET invalide après nettoyage:', cleanSiret);
      return;
    }

    setIsValidatingSiret(true);
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.siret;
      return newErrors;
    });

    try {
      console.log('🔵 [SIGNUP] Validation du SIRET:', cleanSiret);
      const result: SireneValidationResponse = await sireneAPI.validate(cleanSiret);
      
      // Auto-remplir les champs avec les données de l'API
      setFormData(prev => ({
        ...prev,
        companyName: result.name || prev.companyName,
        companyAddress: result.address || prev.companyAddress,
        siret: result.siret || prev.siret, // Utiliser le SIRET complet retourné par l'API
      }));

      // Marquer les champs comme valides
      setFieldValid(prev => ({
        ...prev,
        siret: true,
        companyName: result.name ? true : prev.companyName,
        companyAddress: result.address ? true : prev.companyAddress,
      }));

      // Valider les champs auto-remplis
      if (result.name) {
        validateField('companyName', result.name);
      }
      if (result.address) {
        validateField('companyAddress', result.address);
      }

      console.log('✅ [SIGNUP] SIRET validé avec succès:', result);
    } catch (error: any) {
      console.error('❌ [SIGNUP] Erreur lors de la validation SIRET:', error);
      console.error('❌ [SIGNUP] Détails de l\'erreur:', {
        message: error.message,
        response: error.response?.data,
      });
      
      // Utiliser le message d'erreur de l'API ou un message par défaut
      const errorMessage = error.message || 'Numéro SIREN/SIRET invalide ou entreprise non trouvée dans la base SIRENE';
      
      setFieldErrors(prev => ({
        ...prev,
        siret: errorMessage,
      }));
      setFieldValid(prev => ({
        ...prev,
        siret: false,
      }));
    } finally {
      setIsValidatingSiret(false);
    }
  };

  // Validation temps réel des champs
  const validateField = (field: string, value: string) => {
    const errors = { ...fieldErrors };
    const valid = { ...fieldValid };

    switch (field) {
      case 'firstName':
        if (!value.trim()) {
          errors.firstName = 'Le prénom est obligatoire';
          valid.firstName = false;
        } else if (value.length < 2) {
          errors.firstName = 'Le prénom doit contenir au moins 2 caractères';
          valid.firstName = false;
        } else if (!/^[a-zA-ZÀ-ÿ\s-']+$/.test(value)) {
          errors.firstName = 'Le prénom ne peut contenir que des lettres';
          valid.firstName = false;
        } else {
          delete errors.firstName;
          valid.firstName = true;
        }
        break;

      case 'lastName':
        if (!value.trim()) {
          errors.lastName = 'Le nom est obligatoire';
          valid.lastName = false;
        } else if (value.length < 2) {
          errors.lastName = 'Le nom doit contenir au moins 2 caractères';
          valid.lastName = false;
        } else if (!/^[a-zA-ZÀ-ÿ\s-']+$/.test(value)) {
          errors.lastName = 'Le nom ne peut contenir que des lettres';
          valid.lastName = false;
        } else {
          delete errors.lastName;
          valid.lastName = true;
        }
        break;

      case 'email':
        if (!value.trim()) {
          errors.email = 'L\'adresse email est obligatoire';
          valid.email = false;
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.email = 'Adresse email invalide';
            valid.email = false;
          } else {
            delete errors.email;
            valid.email = true;
          }
        }
        break;

      case 'password':
        if (!value) {
          errors.password = 'Le mot de passe est obligatoire';
          valid.password = false;
        } else if (value.length < 6) {
          errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
          valid.password = false;
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          errors.password = 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
          valid.password = false;
        } else {
          delete errors.password;
          valid.password = true;
        }
        break;

      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = 'La confirmation du mot de passe est obligatoire';
          valid.confirmPassword = false;
        } else if (value !== formData.password) {
          errors.confirmPassword = 'Les mots de passe ne correspondent pas';
          valid.confirmPassword = false;
        } else {
          delete errors.confirmPassword;
          valid.confirmPassword = true;
        }
        break;

      case 'companyName':
        if (isProfessional) {
          if (!value.trim()) {
            errors.companyName = 'Le nom de l\'entreprise est obligatoire pour les comptes professionnels';
            valid.companyName = false;
          } else if (value.length < 2) {
            errors.companyName = 'Le nom de l\'entreprise doit contenir au moins 2 caractères';
            valid.companyName = false;
          } else {
            delete errors.companyName;
            valid.companyName = true;
          }
        }
        break;

      case 'companyAddress':
        if (isProfessional) {
          if (!value.trim()) {
            errors.companyAddress = 'L\'adresse de l\'entreprise est obligatoire pour les comptes professionnels';
            valid.companyAddress = false;
          } else if (value.length < 10) {
            errors.companyAddress = 'L\'adresse de l\'entreprise doit contenir au moins 10 caractères';
            valid.companyAddress = false;
          } else {
            delete errors.companyAddress;
            valid.companyAddress = true;
          }
        }
        break;

      case 'siret':
        if (isProfessional) {
          if (value.length === 0) {
            errors.siret = 'Le numéro SIRET est obligatoire pour les comptes professionnels';
            valid.siret = false;
          } else if (value.length !== 14) {
            errors.siret = `Le SIRET doit contenir exactement 14 chiffres (actuellement ${value.length})`;
            valid.siret = false;
          } else if (!/^\d{14}$/.test(value)) {
            errors.siret = 'Le SIRET ne peut contenir que des chiffres';
            valid.siret = false;
          } else {
            // Validation simple : 14 chiffres uniquement
            delete errors.siret;
            valid.siret = true;
          }
        }
        break;

      case 'vatNumber':
        if (isProfessional && value.length > 0) {
          // Validation basique du numéro TVA (optionnel)
          if (value.length < 8) {
            errors.vatNumber = 'Le numéro TVA semble incomplet';
            valid.vatNumber = false;
          } else if (!/^[A-Z]{2}[\dA-Z]+$/.test(value)) {
            errors.vatNumber = 'Format de numéro TVA invalide';
            valid.vatNumber = false;
          } else {
            delete errors.vatNumber;
            valid.vatNumber = true;
          }
        }
        break;
    }

    setFieldErrors(errors);
    setFieldValid(valid);
  };

  // Générer un message d'erreur détaillé selon les problèmes détectés
  const getValidationErrorMessage = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    if (isProfessional) {
      requiredFields.push('companyName', 'companyAddress', 'siret');
    }

    const missingFields: string[] = [];
    const invalidFields: string[] = [];

    requiredFields.forEach(field => {
      const fieldName = field as keyof typeof formData;
      const value = formData[fieldName];

      if (!value || (typeof value === 'string' && value.trim() === '')) {
        // Champ manquant
        const fieldLabels: Record<string, string> = {
          firstName: 'Prénom',
          lastName: 'Nom',
          email: 'Adresse email',
          password: 'Mot de passe',
          confirmPassword: 'Confirmation du mot de passe',
          companyName: 'Nom de l\'entreprise',
          companyAddress: 'Adresse de l\'entreprise',
          siret: 'Numéro SIRET'
        };
        missingFields.push(fieldLabels[field] || field);
      } else if (fieldErrors[field]) {
        // Champ avec erreur
        invalidFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      if (missingFields.length === 1) {
        return `Le champ "${missingFields[0]}" est obligatoire.`;
      } else {
        return `Les champs suivants sont obligatoires : ${missingFields.join(', ')}.`;
      }
    }

    if (invalidFields.length > 0) {
      return 'Veuillez corriger les erreurs dans le formulaire avant de continuer.';
    }

    return 'Veuillez vérifier tous les champs avant de continuer.';
  };

  // Vérifier si tous les champs requis sont valides
  const isFormValid = useMemo(() => {
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    if (isProfessional) {
      requiredFields.push('companyName', 'companyAddress', 'siret');
    }

    return requiredFields.every(field =>
      formData[field as keyof typeof formData] &&
      !fieldErrors[field] &&
      fieldValid[field] === true
    );
  }, [formData, fieldErrors, fieldValid, isProfessional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    console.log('📝 [SIGNUP FORM] Soumission du formulaire:', {
      formData: { ...formData, password: '***', confirmPassword: '***' }
    });

    // Validation basée sur les états de validation temps réel
    if (!isFormValid) {
      setError(getValidationErrorMessage());
      return;
    }

    setIsLoading(true);

    try {
      // Utiliser le nouveau format d'inscription simplifié pour RENTOALL
      const registerPayload: RegisterPayload = {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber || undefined,
        // Ajouter les champs professionnels si mode professionnel activé
        ...(isProfessional && {
          companyName: formData.companyName,
          companyAddress: formData.companyAddress,
          siret: formData.siret.replace(/\s/g, ''), // Supprimer les espaces du SIRET
          vatNumber: formData.vatNumber || undefined,
        }),
        // Ajouter les codes de parrainage/affiliation s'ils sont fournis
        // Le backend déterminera automatiquement si c'est un code de parrainage (format JODO-1234) 
        // ou d'affiliation (code personnalisé). On envoie le code dans les deux champs pour que 
        // le backend puisse le traiter correctement selon son format.
        // Note: Le backend vérifie d'abord si c'est un code de parrainage, puis un code d'affiliation
        ...(formData.referralCode && {
          appliedReferralCode: formData.referralCode.trim(),
          appliedAffiliationCode: formData.referralCode.trim(),
        }),
      };
      
      console.log('🔵 [SIGNUP FORM] Payload construit (nouveau format):', {
        payload: { ...registerPayload, password: '***', confirmPassword: '***' }
      });
      
      const response = await authAPI.signup(registerPayload);
      
      console.log('✅ [SIGNUP FORM] Inscription réussie:', response);
      
      setIsLoading(false);
      setSuccess('email_sent');
    } catch (err: unknown) {
      // Logs détaillés de l'erreur
      console.error('❌ [SIGNUP FORM] Erreur lors de l\'inscription');
      const errorObj = err as { 
        message?: string; 
        stack?: string; 
        code?: string;
        request?: unknown;
        response?: { 
          status?: number;
          statusText?: string;
          data?: { 
            message?: string;
            error?: string;
          };
          headers?: unknown;
        } 
      };
      console.error('❌ [SIGNUP FORM] Type d\'erreur:', typeof err);
      console.error('❌ [SIGNUP FORM] Erreur complète:', err);
      console.error('❌ [SIGNUP FORM] Message:', errorObj?.message);
      console.error('❌ [SIGNUP FORM] Stack:', errorObj?.stack);
      
      if (errorObj.response) {
        console.error('❌ [SIGNUP FORM] Réponse HTTP:', {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
          headers: errorObj.response.headers
        });
      } else if (errorObj.request) {
        console.error('❌ [SIGNUP FORM] Requête HTTP sans réponse:', {
          request: errorObj.request,
          code: (errorObj as { code?: string }).code,
          message: errorObj.message
        });
      }
      
      // Message d'erreur pour l'utilisateur
      const errorMessage = errorObj.response?.data?.message 
        || errorObj.response?.data?.error 
        || errorObj.message 
        || 'Une erreur est survenue lors de l\'inscription';
      
      console.error('❌ [SIGNUP FORM] Message d\'erreur affiché:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSocialSignup = (provider: string) => {
    console.log('🔵 [SIGNUP FORM] Tentative d\'inscription/connexion sociale:', provider);
    
    if (provider === 'google') {
      try {
        // Marquer que c'est une inscription (pas une connexion)
        localStorage.setItem('oauthSignup', 'true');
        
        // Le frontend redirige vers le backend Spring qui gère tout le flow OAuth2
        // Le backend gère le redirect_uri, pas le frontend
        const backendURL = getBaseURLForOAuth2();
        const oauthUrl = `${backendURL}/oauth2/authorization/google`;
        
        console.log('🔵 [SIGNUP FORM] ========================================');
        console.log('🔵 [SIGNUP FORM] Configuration OAuth2 Google pour INSCRIPTION');
        console.log('🔵 [SIGNUP FORM] Environnement:', process.env.NODE_ENV || 'development');
        console.log('🔵 [SIGNUP FORM] URL backend:', backendURL);
        console.log('🔵 [SIGNUP FORM] URL complète OAuth2:', oauthUrl);
        console.log('🔵 [SIGNUP FORM] Flag oauthSignup défini dans localStorage');
        console.log('🔵 [SIGNUP FORM] ========================================');
        
        // Redirection directe vers Spring Security qui gère le flow OAuth2
        // Spring gère automatiquement le redirect_uri (/login/oauth2/code/google)
        // Le backend créera automatiquement un compte si l'utilisateur n'existe pas
        // Après succès, le callback redirigera vers /auth/login avec un message de bienvenue
        window.location.href = oauthUrl;
      } catch (error) {
        console.error('❌ [SIGNUP FORM] Erreur lors de la connexion Google:', error);
        localStorage.removeItem('oauthSignup');
        setError('Erreur lors de la connexion Google');
      }
    } else {
      console.warn('⚠️ [SIGNUP FORM] Provider non implémenté:', provider);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 overflow-x-hidden w-full max-w-full">
      <HeaderNavigation />

      {/* Main Content */}
      <main className="w-full pt-14 sm:pt-16 pb-20 sm:pb-8 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top, 0px))', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-8rem)] px-3 sm:px-4 py-4 sm:py-6 md:py-8">
          <div className="w-full max-w-lg">
            {/* Signup Card - Mobile: Compact */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              {/* Logo en haut */}
              <div className="flex flex-col items-center pt-6 pb-2 px-4">
                <Image
                  src="/logoren.png"
                  alt="Rentoall"
                  width={140}
                  height={42}
                  className="h-9 sm:h-10 w-auto"
                  priority
                />
              </div>
              {/* Header with Tabs - Mobile: Compact */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 sm:px-5 md:px-6 py-3 sm:py-4">
                <div className="flex rounded-lg bg-white/10 p-0.5 sm:p-1 backdrop-blur-sm">
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 min-h-[44px] md:min-h-0 text-xs sm:text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200 cursor-pointer touch-manipulation active:opacity-80"
                  >
                    {t('signup.login')}
                  </button>
                  <button className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 min-h-[44px] md:min-h-0 text-xs sm:text-sm font-medium text-white bg-white/20 rounded-md cursor-pointer">
                    {t('signup.title')}
                  </button>
                </div>
              </div>

              {/* Form Container - Mobile: Compact */}
              <div className="p-4 sm:p-5 md:p-6">
                {/* Form Title - Mobile: Compact */}
                <div className="text-center mb-4 sm:mb-5 md:mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2">{t('signup.subtitle')}</h1>
                  <p className="text-slate-600 text-xs sm:text-sm">{t('signup.description')}</p>
                </div>

                {/* Account Type Toggle */}
                <div className="mb-6">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 text-center">
                    {t('signup.accountType')}
                  </label>
                  <div className="flex bg-slate-100 rounded-lg sm:rounded-xl p-0.5 sm:p-1">
                    <button
                      type="button"
                      onClick={() => setIsProfessional(false)}
                      className={`flex-1 py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 min-h-[44px] md:min-h-0 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation active:scale-95 ${
                        !isProfessional
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 active:bg-slate-50'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5 sm:mr-2" />
                      {t('signup.individual')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsProfessional(true)}
                      className={`flex-1 py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 min-h-[44px] md:min-h-0 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation active:scale-95 ${
                        isProfessional
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 active:bg-slate-50'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5 sm:mr-2" />
                      {t('signup.professional')}
                    </button>
                  </div>
                </div>

                {/* Form - Mobile: Compact */}
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        <p className="text-red-800">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Message après envoi de l'email de confirmation */}
                  {success === 'email_sent' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex flex-col items-center text-center">
                        <Mail className="h-12 w-12 text-emerald-600 mb-3" />
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">{t('signup.emailSent.title')}</h2>
                        <p className="text-slate-700 text-sm mb-2">{t('signup.emailSent.description')}</p>
                        <p className="text-slate-600 text-xs mb-4">{t('signup.emailSent.checkInbox')}</p>
                        <Link
                          href="/auth/login"
                          className="inline-flex items-center justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                        >
                          {t('signup.signIn')}
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Form Fields */}
                  {!success && (
                    <>
                      {/* Professional Section - EN PREMIER si professionnel */}
                      {isProfessional && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-slate-600" />
                            <span className="text-sm font-semibold text-slate-700">Informations de l'entreprise</span>
                          </div>

                          {/* SIRET - EN PREMIER */}
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">
                              {t('signup.siret')} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <input
                                type="text"
                                value={formData.siret}
                                onChange={(e) => handleInputChange('siret', e.target.value)}
                                placeholder="12345678901234 ou 123456789"
                                className={`w-full pl-10 pr-10 py-3 text-sm bg-white border rounded-lg focus:outline-none transition-all duration-200 ${
                                  fieldValid.siret === true
                                    ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                    : fieldValid.siret === false
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                                    : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                }`}
                                required={isProfessional}
                                disabled={isValidatingSiret}
                              />
                              {isValidatingSiret && (
                                <Loader2 className="absolute right-3 top-3 h-4 w-4 text-emerald-600 animate-spin" />
                              )}
                              {!isValidatingSiret && fieldValid.siret === true && (
                                <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-600" />
                              )}
                              {!isValidatingSiret && fieldValid.siret === false && (
                                <X className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              {fieldErrors.siret ? (
                                <p className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {fieldErrors.siret}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  {formData.siret.length}/{formData.siret.length >= 9 ? '14' : '9'} chiffres {formData.siret.length >= 9 && '(SIREN ou SIRET)'}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Numéro SIREN (9 chiffres) ou SIRET (14 chiffres). Les informations de l'entreprise seront automatiquement remplies.
                            </p>
                          </div>

                          {/* Company Name */}
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">
                              {t('signup.companyName')} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <input
                                type="text"
                                value={formData.companyName}
                                onChange={(e) => handleInputChange('companyName', e.target.value)}
                                placeholder={t('signup.companyName')}
                                className={`w-full pl-10 pr-10 py-3 text-sm bg-white border rounded-lg focus:outline-none transition-all duration-200 ${
                                  fieldValid.companyName === true
                                    ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                    : fieldValid.companyName === false
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                                    : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                }`}
                                required={isProfessional}
                              />
                              {fieldValid.companyName === true && (
                                <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-600" />
                              )}
                              {fieldValid.companyName === false && (
                                <X className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                              )}
                            </div>
                            {fieldErrors.companyName && (
                              <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {fieldErrors.companyName}
                              </p>
                            )}
                          </div>

                          {/* Company Address */}
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">
                              {t('signup.companyAddress')} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <input
                                type="text"
                                value={formData.companyAddress}
                                onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                                placeholder={t('signup.companyAddress')}
                                className={`w-full pl-10 pr-10 py-3 text-sm bg-white border rounded-lg focus:outline-none transition-all duration-200 ${
                                  fieldValid.companyAddress === true
                                    ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                    : fieldValid.companyAddress === false
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                                    : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                }`}
                                required={isProfessional}
                              />
                              {fieldValid.companyAddress === true && (
                                <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-600" />
                              )}
                              {fieldValid.companyAddress === false && (
                                <X className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                              )}
                            </div>
                            {fieldErrors.companyAddress && (
                              <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {fieldErrors.companyAddress}
                              </p>
                            )}
                          </div>

                          {/* VAT Number (optional) */}
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">
                              {t('signup.vatNumber')}
                            </label>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <input
                                type="text"
                                value={formData.vatNumber}
                                onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                                placeholder="FR12345678901"
                                className={`w-full pl-10 pr-10 py-3 text-sm bg-white border rounded-lg focus:outline-none transition-all duration-200 ${
                                  fieldValid.vatNumber === true
                                    ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                    : fieldValid.vatNumber === false
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                                    : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                }`}
                              />
                              {fieldValid.vatNumber === true && (
                                <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-600" />
                              )}
                              {fieldValid.vatNumber === false && (
                                <X className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              {fieldErrors.vatNumber ? (
                                <p className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {fieldErrors.vatNumber}
                                </p>
                              ) : formData.vatNumber.length > 0 ? (
                                <p className="text-xs text-slate-500">
                                  {formData.vatNumber.length}/13 caractères
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Identity Section - Informations personnelles */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-600" />
                          <span className="text-sm font-semibold text-slate-700">Informations personnelles</span>
                        </div>

                        {/* First Name and Last Name */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">
                              {t('signup.firstName')} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                placeholder={t('signup.firstName')}
                                className={`w-full pl-4 pr-10 py-3 text-sm bg-white border rounded-lg focus:outline-none transition-all duration-200 ${
                                  fieldValid.firstName === true
                                    ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                    : fieldValid.firstName === false
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                                    : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                }`}
                                required
                              />
                              {fieldValid.firstName === true && (
                                <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-600" />
                              )}
                              {fieldValid.firstName === false && (
                                <X className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                              )}
                            </div>
                            {fieldErrors.firstName && (
                              <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {fieldErrors.firstName}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">
                              {t('signup.lastName')} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                placeholder={t('signup.lastName')}
                                className={`w-full pl-4 pr-10 py-3 text-sm bg-white border rounded-lg focus:outline-none transition-all duration-200 ${
                                  fieldValid.lastName === true
                                    ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                    : fieldValid.lastName === false
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                                    : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                }`}
                                required
                              />
                              {fieldValid.lastName === true && (
                                <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-600" />
                              )}
                              {fieldValid.lastName === false && (
                                <X className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                              )}
                            </div>
                            {fieldErrors.lastName && (
                              <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {fieldErrors.lastName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-slate-700">
                            {t('signup.email')} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              placeholder={t('signup.email')}
                              className={`w-full pl-10 pr-10 py-3 text-sm bg-white border rounded-lg focus:outline-none transition-all duration-200 ${
                                fieldValid.email === true
                                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                  : fieldValid.email === false
                                  ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                                  : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                              }`}
                              required
                            />
                            {fieldValid.email === true && (
                              <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-600" />
                            )}
                            {fieldValid.email === false && (
                              <X className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                            )}
                          </div>
                          {fieldErrors.email && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.email}
                            </p>
                          )}
                        </div>

                        {/* Phone (optional) */}
                        <div className="space-y-1">
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                              type="tel"
                              value={formData.phoneNumber}
                              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                              placeholder={t('signup.phoneNumber')}
                              className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all duration-200"
                            />
                          </div>
                        </div>

                        {/* Referral Code */}
                        <div className="space-y-1">
                          <div className="relative">
                            <Gift className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              value={formData.referralCode}
                              onChange={(e) => handleInputChange('referralCode', e.target.value.toUpperCase())}
                              placeholder={t('signup.referralCodePlaceholder')}
                              className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all duration-200 font-mono"
                            />
                          </div>
                          <p className="text-xs text-slate-500">{t('signup.referralCode')}</p>
                          <p className="text-xs text-slate-400 italic">{t('signup.referralCodeHelp')}</p>
                        </div>
                      </div>

                      {/* Security Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-slate-600" />
                          <span className="text-sm font-semibold text-slate-700">Sécurité</span>
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-slate-700">
                            {t('signup.password')} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={formData.password}
                              onChange={(e) => handleInputChange('password', e.target.value)}
                              placeholder={t('signup.password')}
                              className={`w-full pl-10 pr-10 py-3 text-sm bg-white border rounded-lg focus:outline-none transition-all duration-200 ${
                                fieldValid.password === true
                                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                  : fieldValid.password === false
                                  ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                                  : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                              }`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            {fieldValid.password === true && (
                              <Check className="absolute right-10 top-3 h-4 w-4 text-emerald-600" />
                            )}
                            {fieldValid.password === false && (
                              <X className="absolute right-10 top-3 h-4 w-4 text-red-600" />
                            )}
                          </div>
                          {fieldErrors.password && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.password}
                            </p>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-slate-700">
                            {t('signup.confirmPassword')} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={formData.confirmPassword}
                              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                              placeholder={t('signup.confirmPassword')}
                              className={`w-full pl-10 pr-10 py-3 text-sm bg-white border rounded-lg focus:outline-none transition-all duration-200 ${
                                fieldValid.confirmPassword === true
                                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                  : fieldValid.confirmPassword === false
                                  ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                                  : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                              }`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            {fieldValid.confirmPassword === true && (
                              <Check className="absolute right-10 top-3 h-4 w-4 text-emerald-600" />
                            )}
                            {fieldValid.confirmPassword === false && (
                              <X className="absolute right-10 top-3 h-4 w-4 text-red-600" />
                            )}
                          </div>
                          {fieldErrors.confirmPassword && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Terms and Submit */}
                      <div className="space-y-5">
                        {/* Terms */}
                        <div className="text-center">
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {t('signup.termsText')}{' '}
                            <a href="/cgu" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-all duration-200">
                              {t('signup.termsLink')}
                            </a>{' '}
                            {t('signup.and')}{' '}
                            <a href="/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-all duration-200">
                              {t('signup.privacyLink')}
                            </a>
                            .
                          </p>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isLoading || !isFormValid}
                          className={`w-full py-4 min-h-[44px] md:min-h-0 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold text-sm rounded-xl transition-all duration-200 transform touch-manipulation ${
                            isLoading || !isFormValid
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
                          }`}
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {t('signup.loading')}
                            </span>
                          ) : (
                            <span>{t('signup.signupButton')}</span>
                          )}
                        </button>

                        {/* Social Login Separator */}
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-slate-500">{t('signup.orSignup')}</span>
                          </div>
                        </div>

                        {/* Social Login Buttons */}
                        <div className="grid grid-cols-1 gap-3">
                          <button
                            type="button"
                            onClick={() => handleSocialSignup('google')}
                            className="flex items-center justify-center gap-3 w-full py-3 px-4 min-h-[44px] md:min-h-0 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer touch-manipulation active:scale-95"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span className="text-sm md:text-base">{t('signup.continueWithGoogle')}</span>
                          </button>
                        </div>

                        {/* Privacy Notice */}
                        <p className="text-xs text-slate-500 text-center mt-2">
                          {t('login.privacyNotice')}
                        </p>

                        {/* Sign In Link */}
                        <div className="text-center pt-2">
                          <span className="text-slate-600 text-sm">{t('signup.haveAccount')}</span>
                          <a
                            href="/auth/login"
                            className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm ml-1 hover:underline transition-all duration-200"
                          >
                            {t('signup.signIn')}
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterNavigation />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
