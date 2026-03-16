'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import MobileFooter from '@/components/sections/mobile-footer';
import Image from 'next/image';
import { User, Lock, Bell, CreditCard, Shield, Mail, Phone, MapPin, Globe, Save, Check, X, Eye, EyeOff, Trash2, Download, Upload, Building2, FileText, Key, Smartphone, Gift, Copy, Euro, AlertTriangle, BarChart3, Calendar, Plus, LogOut, Menu, UserCircle2, Users, ChevronRight, ChevronLeft, MessageSquare, Send } from 'lucide-react';
import Link from 'next/link';
import { rentoallUsersAPI, UserDTO, referralsAPI, AffiliationSummaryDTO, paymentsAPI, OwnerPayoutDTO, contactAPI, ContactRequestDTO, getBaseURLForOAuth2, authAPI } from '@/services/api';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingLogo from '@/components/ui/loading-logo';
import AnimatedLoadingText from '@/components/ui/animated-loading-text';
import AddressAutocomplete from '@/components/ui/address-autocomplete';
import { getAppBaseUrl } from '@/lib/app-url';
import { removeItem } from '@/lib/storage';
import { isMobileOrCapacitor, handleCapacitorLinkClick, isCapacitor, capacitorNavigate } from '@/lib/capacitor';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ParametresPage() {
  const router = useRouter();
  const { setLanguage: setGlobalLanguage, language: globalLanguage } = useLanguage();
  const [userMode, setUserMode] = useState<'client' | 'host'>('client');
  const [activeTab, setActiveTab] = useState<'personal' | 'login' | 'privacy' | 'notifications' | 'contact' | 'taxes' | 'payouts' | 'menu'>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // États pour le profil
  const [userProfile, setUserProfile] = useState<UserDTO | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // États pour les champs du formulaire
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [birthDay, setBirthDay] = useState<number | ''>('');
  const [birthMonth, setBirthMonth] = useState<number | ''>('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [language, setLanguage] = useState('Français');
  
  // États pour l'adresse personnelle
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  
  // États pour les champs d'entreprise
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [siret, setSiret] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  
  // États pour le parrainage
  const [referralCode, setReferralCode] = useState<string>('');
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // États pour les préférences de notification
  const [emailNotificationBooking, setEmailNotificationBooking] = useState<boolean>(true);
  const [emailNotificationMessage, setEmailNotificationMessage] = useState<boolean>(true);
  const [emailNotificationPromotion, setEmailNotificationPromotion] = useState<boolean>(true);
  const [pushNotificationBooking, setPushNotificationBooking] = useState<boolean>(true);
  const [pushNotificationMessage, setPushNotificationMessage] = useState<boolean>(true);
  
  // États pour le changement de mot de passe
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // États pour Stripe onboarding
  const [isLoadingStripeLink, setIsLoadingStripeLink] = useState(false);
  const [stripeOnboardingStatus, setStripeOnboardingStatus] = useState<string | null>(null);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState<boolean>(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // États pour les versements (payouts)
  const [payouts, setPayouts] = useState<OwnerPayoutDTO[]>([]);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(false);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const PAYOUTS_PER_PAGE = 10;

  // Informations bancaires (IBAN / BIC) — à brancher avec le back plus tard
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [isSavingBanking, setIsSavingBanking] = useState(false);
  const [bankingError, setBankingError] = useState<string | null>(null);
  const [bankingSuccess, setBankingSuccess] = useState(false);

  // États pour l'authentification à deux facteurs (2FA)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [show2FABackupCodesModal, setShow2FABackupCodesModal] = useState(false);
  const [twoFactorOtpAuthUrl, setTwoFactorOtpAuthUrl] = useState<string>('');
  const [twoFactorSecret, setTwoFactorSecret] = useState<string>('');
  const [twoFactorVerificationCode, setTwoFactorVerificationCode] = useState('');
  const [twoFactorDisablePassword, setTwoFactorDisablePassword] = useState('');
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState('');
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
  const [isLoading2FA, setIsLoading2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  // États pour le formulaire de contact
  const [contactTitle, setContactTitle] = useState('');
  const [contactDescription, setContactDescription] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Constantes pour le mapping des langues
  const LANGUAGE_CODE_TO_NAME: { [key: string]: string } = {
    'fr': 'Français',
    'en': 'English',
    'es': 'Español',
    'de': 'Deutsch',
  };

  const LANGUAGE_NAME_TO_CODE: { [key: string]: string } = {
    'Français': 'fr',
    'English': 'en',
    'Español': 'es',
    'Deutsch': 'de',
    'fr': 'fr',
    'en': 'en',
    'es': 'es',
    'de': 'de',
  };

  // Gérer le retour depuis Stripe après onboarding
  useEffect(() => {
    const checkStripeReturn = async () => {
      if (typeof window === 'undefined') return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const stripeReturn = urlParams.get('stripe_return');
      const tabParam = urlParams.get('tab');
      
      if (stripeReturn === 'true') {
        // Recharger le profil pour mettre à jour le statut Stripe
        const userId = localStorage.getItem('userId');
        if (userId) {
          try {
            const profile = await rentoallUsersAPI.getProfile(parseInt(userId, 10));
            const stripeStatus = (profile as any).stripeOnboardingStatus;
            const payoutsEnabled = (profile as any).stripePayoutsEnabled;
            const stripeAccountId = (profile as any).stripeAccountId;
            
            // Si stripeAccountId existe, considérer que le compte Stripe Connect est configuré
            if (stripeAccountId && stripeAccountId !== null) {
              setStripeOnboardingStatus('COMPLETE');
              setStripePayoutsEnabled(true);
            } else if (stripeStatus) {
              setStripeOnboardingStatus(stripeStatus);
            }
            if (payoutsEnabled !== undefined) {
              setStripePayoutsEnabled(payoutsEnabled);
            }
            
            // Notifier le header/footer pour mettre à jour le badge "infos bancaires"
            window.dispatchEvent(new Event('bankingInfoUpdated'));
            
            // Nettoyer l'URL mais garder le tab si présent
            const newUrl = tabParam ? `/parametres?tab=${tabParam}` : '/parametres';
            window.history.replaceState({}, '', newUrl);
          } catch (error) {
            console.error('Erreur lors du rechargement du profil après onboarding Stripe:', error);
          }
        }
      }
      
      // Gérer le paramètre tab dans l'URL
      if (tabParam && ['personal', 'login', 'privacy', 'notifications', 'contact', 'taxes', 'payouts', 'menu'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    };
    
    checkStripeReturn();
  }, []);

  // Fonction pour créer le lien d'onboarding Stripe
  const handleStripeOnboarding = async () => {
    try {
      setIsLoadingStripeLink(true);
      setStripeError(null);
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setStripeError('Utilisateur non connecté');
        return;
      }
      
      const baseUrl = getAppBaseUrl();
      const returnUrl = `${baseUrl}/parametres?stripe_return=true&tab=payouts`;
      const refreshUrl = `${baseUrl}/parametres?tab=payouts`;
      
      // Appeler l'API pour créer le lien d'onboarding
      const response = await paymentsAPI.createStripeOnboardingLink(
        parseInt(userId, 10),
        refreshUrl,
        returnUrl
      );
      
      // Rediriger vers Stripe
      if (response.url) {
        window.location.href = response.url;
      } else {
        setStripeError('Erreur : URL d\'onboarding non reçue');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du lien d\'onboarding Stripe:', error);
      setStripeError(error.response?.data?.message || 'Erreur lors de la création du lien d\'onboarding');
    } finally {
      setIsLoadingStripeLink(false);
    }
  };

  // Fonction pour créer le lien de mise à jour Stripe Connect (pour compte existant)
  const handleStripeUpdate = async () => {
    try {
      setIsLoadingStripeLink(true);
      setStripeError(null);
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setStripeError('Utilisateur non connecté');
        return;
      }
      
      const baseUrl = getAppBaseUrl();
      const returnUrl = `${baseUrl}/parametres?stripe_return=true&tab=payouts`;
      
      // Appeler l'API pour créer le lien de mise à jour
      const response = await paymentsAPI.updateStripeLink(
        parseInt(userId, 10),
        returnUrl
      );
      
      // Rediriger vers Stripe
      if (response.url) {
        window.location.href = response.url;
      } else {
        setStripeError('Erreur : URL de mise à jour non reçue');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du lien de mise à jour Stripe:', error);
      setStripeError(error.response?.data?.message || 'Erreur lors de la création du lien de mise à jour');
    } finally {
      setIsLoadingStripeLink(false);
    }
  };

  // Fonction pour charger les versements (payouts)
  const loadPayouts = useCallback(async () => {
    try {
      setIsLoadingPayouts(true);
      setPayoutsError(null);
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setPayoutsError('Utilisateur non connecté');
        return;
      }
      
      const payoutsData = await paymentsAPI.getOwnerPayouts(parseInt(userId, 10));
      setPayouts(payoutsData);
      setPayoutsPage(1);
    } catch (error: any) {
      console.error('Erreur lors du chargement des versements:', error);
      setPayoutsError(error.response?.data?.message || 'Erreur lors du chargement des versements');
      setPayouts([]);
    } finally {
      setIsLoadingPayouts(false);
    }
  }, []);

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

  // Rediriger vers un onglet valide si l'onglet actif n'est pas disponible dans le mode actuel
  useEffect(() => {
    if (userMode === 'client') {
      // En mode client, on ne peut pas être sur 'taxes' ou 'payouts'
      if (activeTab === 'taxes' || activeTab === 'payouts') {
        setActiveTab('personal');
      }
    }
  }, [userMode, activeTab]);

  // Charger les versements quand l'onglet payouts est actif et en mode hôte
  useEffect(() => {
    if (activeTab === 'payouts' && userMode === 'host') {
      loadPayouts();
    }
  }, [activeTab, userMode, loadPayouts]);

  // Fonction helper pour obtenir l'URL de la photo de profil depuis le profil utilisateur
  const getProfilePictureUrl = (profile: UserDTO | null): string | null => {
    if (!profile) return null;
    
    let profilePictureUrl: string | null = null;
    
    // Priorité 1: profilePicture direct (string)
    if (profile.profilePicture) {
      if (typeof profile.profilePicture === 'string' && profile.profilePicture.trim() !== '') {
        profilePictureUrl = profile.profilePicture;
      }
    }
    
    // Priorité 2: photo.url (PhotoDTO)
    if (!profilePictureUrl && (profile as any).photo) {
      const photo = (profile as any).photo;
      if (typeof photo === 'object' && photo.url) {
        if (typeof photo.url === 'string' && photo.url.trim() !== '') {
          profilePictureUrl = photo.url;
        }
      }
    }
    
    // Si l'URL est relative, essayer de construire l'URL complète
    if (profilePictureUrl && !profilePictureUrl.startsWith('http') && !profilePictureUrl.startsWith('data:')) {
      // Si c'est une URL relative, essayer de la compléter avec l'URL de base de l'API
      const baseURL = getBaseURLForOAuth2();
      if (profilePictureUrl.startsWith('/')) {
        profilePictureUrl = `${baseURL}${profilePictureUrl}`;
      } else {
        profilePictureUrl = `${baseURL}/${profilePictureUrl}`;
      }
    }
    
    return profilePictureUrl;
  };

  // Charger le profil utilisateur
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setProfileError('Utilisateur non connecté');
          setIsLoadingProfile(false);
          return;
        }
        
        const profile = await rentoallUsersAPI.getProfile(parseInt(userId, 10));
        setUserProfile(profile);
        
        // Initialiser les champs du formulaire
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        setEmail(profile.email || '');
        setPhoneNumber(profile.phoneNumber || '');
        // Utiliser la fonction helper pour obtenir l'URL de la photo de profil
        const profilePictureUrl = getProfilePictureUrl(profile);
        setProfilePicture(profilePictureUrl || '');
        // Initialiser les champs d'adresse personnelle
        setAddress(profile.address || '');
        setCity(profile.city || '');
        setZipCode(profile.zipCode || '');
        // Convertir le code ISO de langue en nom de langue pour l'affichage
        const profileLanguage = typeof profile.language === 'string' ? profile.language : 'fr';
        const languageName = LANGUAGE_CODE_TO_NAME[profileLanguage] || 'Français';
        setLanguage(languageName);
        
        // Mettre à jour le contexte de langue global avec la langue préférée de l'utilisateur
        // Le contexte supporte seulement 'fr' et 'en', donc on mappe les autres langues
        let languageToSet: 'fr' | 'en' = 'fr';
        if (profileLanguage === 'fr' || profileLanguage === 'en') {
          languageToSet = profileLanguage as 'fr' | 'en';
        } else if (profileLanguage === 'es' || profileLanguage === 'de') {
          // Pour l'instant, mapper espagnol et allemand vers français
          // Vous pouvez ajuster cette logique selon vos besoins
          languageToSet = 'fr';
        }
        
        // Mettre à jour le contexte de langue et localStorage
        setGlobalLanguage(languageToSet);
        if (typeof window !== 'undefined') {
          localStorage.setItem('language', languageToSet);
        }
        
        // Charger le statut Stripe depuis le profil
        const stripeStatus = (profile as any).stripeOnboardingStatus;
        const payoutsEnabled = (profile as any).stripePayoutsEnabled;
        const stripeAccountId = (profile as any).stripeAccountId;
        
        // Si stripeAccountId existe, considérer que le compte Stripe Connect est configuré
        if (stripeAccountId && stripeAccountId !== null) {
          setStripeOnboardingStatus('COMPLETE');
          setStripePayoutsEnabled(true);
        } else if (stripeStatus) {
          setStripeOnboardingStatus(stripeStatus);
        }
        if (payoutsEnabled !== undefined) {
          setStripePayoutsEnabled(payoutsEnabled);
        }

        // Informations bancaires (IBAN / BIC) — chargement via GET /api/users/{id}/bank-info
        try {
          const bankInfo = await rentoallUsersAPI.getBankInfo(parseInt(userId, 10));
          if (typeof bankInfo.iban === 'string') setIban(bankInfo.iban);
          if (typeof bankInfo.bic === 'string') setBic(bankInfo.bic);
        } catch {
          const profileIban = (profile as { iban?: string }).iban;
          const profileBic = (profile as { bic?: string }).bic;
          if (typeof profileIban === 'string') setIban(profileIban);
          if (typeof profileBic === 'string') setBic(profileBic);
        }

        // Charger le statut 2FA depuis le profil
        const twoFactorEnabledStatus = (profile as any).twoFactorEnabled;
        if (twoFactorEnabledStatus !== undefined) {
          setTwoFactorEnabled(twoFactorEnabledStatus);
        }
        
        // Parser la date de naissance si elle existe
        if (profile.birthDate && (typeof profile.birthDate === 'string' || profile.birthDate instanceof Date)) {
          const date = new Date(profile.birthDate as string | Date);
          setBirthDay(date.getDate());
          setBirthMonth(date.getMonth() + 1);
          setBirthYear(date.getFullYear());
        }
        
        // Initialiser les champs d'entreprise si l'utilisateur a une organisation
        if (profile.organization) {
          setCompanyName(profile.organization.name || '');
          setCompanyAddress((() => {
            const org = profile.organization as { address?: string | { street?: string; city?: string }; [key: string]: unknown };
            if (typeof org.address === 'string') return org.address;
            if (org.address && typeof org.address === 'object') {
              return `${org.address.street || ''}${org.address.street && org.address.city ? ', ' : ''}${org.address.city || ''}`.trim();
            }
            return '';
          })());
          setSiret(profile.organization.siretNumber || '');
          setVatNumber(profile.organization.vatNumber || '');
        }
        
        // Vérifier aussi les champs directs d'entreprise (pour EnterpriseDTO)
        if ((profile as any).companyName) {
          setCompanyName((profile as any).companyName || '');
        }
        if ((profile as any).companyAddress) {
          setCompanyAddress((profile as any).companyAddress || '');
        }
        if ((profile as any).siretNumber) {
          setSiret((profile as any).siretNumber || '');
        }
        if ((profile as any).siret) {
          setSiret((profile as any).siret || '');
        }
        if ((profile as any).vatNumber) {
          setVatNumber((profile as any).vatNumber || '');
        }
        
        // Charger les préférences de notification depuis le profil
        setEmailNotificationBooking(profile.emailNotificationBooking ?? true);
        setEmailNotificationMessage(profile.emailNotificationMessage ?? true);
        setEmailNotificationPromotion(profile.emailNotificationPromotion ?? true);
        setPushNotificationBooking(profile.pushNotificationBooking ?? true);
        setPushNotificationMessage(profile.pushNotificationMessage ?? true);
        
        // Charger les infos de parrainage et affiliation (userId est déjà défini plus haut)
        if (userId) {
          try {
            const affiliationSummary = await referralsAPI.getAffiliationSummary(parseInt(userId, 10));
            setReferralCode(affiliationSummary.referralCode || '');
            setCreditBalance(affiliationSummary.walletBalance || 0);
          } catch (error) {
            console.error('Erreur lors du chargement des infos de parrainage:', error);
            // Ne pas bloquer le chargement du profil si les infos de parrainage échouent
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        setProfileError('Erreur lors du chargement du profil');
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setProfileError(null);
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setProfileError('Utilisateur non connecté');
        return;
      }
      
      // Construire la date de naissance
      let birthDate: string | undefined;
      if (birthDay && birthMonth && birthYear) {
        const month = String(birthMonth).padStart(2, '0');
        const day = String(birthDay).padStart(2, '0');
        birthDate = `${birthYear}-${month}-${day}`;
      }
      
      // Convertir le nom de langue en code ISO pour le backend
      const languageCode = language ? (LANGUAGE_NAME_TO_CODE[language] || language) : undefined;
      
      // Préparer le payload
      const payload: any = {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || undefined,
        profilePicture: profilePicture || undefined,
        birthDate,
        language: languageCode,
        address: address || undefined,
        city: city || undefined,
        zipCode: zipCode || undefined,
      };
      
      // Ajouter les champs d'entreprise si l'utilisateur a une organisation
      if (userProfile?.organization || companyName || siret || vatNumber) {
        payload.organization = {
          name: companyName || undefined,
          address: companyAddress || undefined,
          siretNumber: siret || undefined,
          vatNumber: vatNumber || undefined,
          ...(userProfile?.organization || {}),
        };
      }
      
      // Ajouter aussi les champs directs pour EnterpriseDTO
      if (companyName) payload.companyName = companyName;
      if (companyAddress) payload.companyAddress = companyAddress;
      if (siret) payload.siret = siret; // Le backend attend "siret" et non "siretNumber"
      if (vatNumber) payload.vatNumber = vatNumber;
      
      const updatedProfile = await rentoallUsersAPI.updateProfile(parseInt(userId, 10), payload);
      setUserProfile(updatedProfile);
      
      // Recharger le profil complet pour s'assurer d'avoir toutes les données à jour
      const refreshedProfile = await rentoallUsersAPI.getProfile(parseInt(userId, 10));
      setUserProfile(refreshedProfile);
      
      // Notifier le header pour recharger la photo de profil si elle a changé
      if (typeof window !== 'undefined' && payload.profilePicture !== undefined) {
        window.dispatchEvent(new Event('profileUpdated'));
      }
      
      // Mettre à jour tous les champs du formulaire avec les données fraîches
      setFirstName(refreshedProfile.firstName || '');
      setLastName(refreshedProfile.lastName || '');
      setEmail(refreshedProfile.email || '');
      setPhoneNumber(refreshedProfile.phoneNumber || '');
      // Mettre à jour la photo de profil avec la fonction helper
      const refreshedProfilePictureUrl = getProfilePictureUrl(refreshedProfile);
      setProfilePicture(refreshedProfilePictureUrl || '');
      // Mettre à jour les champs d'adresse personnelle
      setAddress(refreshedProfile.address || '');
      setCity(refreshedProfile.city || '');
      setZipCode(refreshedProfile.zipCode || '');
      
      // Convertir le code ISO de langue en nom de langue pour l'affichage
      const profileLanguage = typeof refreshedProfile.language === 'string' ? refreshedProfile.language : 'fr';
      const refreshedLanguageName = LANGUAGE_CODE_TO_NAME[profileLanguage] || 'Français';
      setLanguage(refreshedLanguageName);
      
      // Mettre à jour le contexte de langue global avec la langue préférée mise à jour
      let languageToSet: 'fr' | 'en' = 'fr';
      if (profileLanguage === 'fr' || profileLanguage === 'en') {
        languageToSet = profileLanguage as 'fr' | 'en';
      } else if (profileLanguage === 'es' || profileLanguage === 'de') {
        languageToSet = 'fr';
      }
      
      // Mettre à jour le contexte de langue et localStorage
      setGlobalLanguage(languageToSet);
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', languageToSet);
      }
      
      // Parser la date de naissance si elle existe
      if (refreshedProfile.birthDate && (typeof refreshedProfile.birthDate === 'string' || refreshedProfile.birthDate instanceof Date)) {
        const date = new Date(refreshedProfile.birthDate as string | Date);
        setBirthDay(date.getDate());
        setBirthMonth(date.getMonth() + 1);
        setBirthYear(date.getFullYear());
      } else {
        // Réinitialiser si pas de date
        setBirthDay('');
        setBirthMonth('');
        setBirthYear('');
      }
      
      // Mettre à jour les champs d'entreprise
      if (refreshedProfile.organization) {
        setCompanyName(refreshedProfile.organization.name || '');
        setCompanyAddress((() => {
          const org = refreshedProfile.organization as { address?: string | { street?: string; city?: string }; [key: string]: unknown };
          if (typeof org.address === 'string') return org.address;
          if (org.address && typeof org.address === 'object') {
            return `${org.address.street || ''}${org.address.street && org.address.city ? ', ' : ''}${org.address.city || ''}`.trim();
          }
          return '';
        })());
        setSiret(refreshedProfile.organization.siretNumber || (refreshedProfile.organization as any).siret || '');
        setVatNumber(refreshedProfile.organization.vatNumber || '');
      }
      
      // Vérifier aussi les champs directs d'entreprise (pour EnterpriseDTO)
      if ((refreshedProfile as any).companyName) {
        setCompanyName((refreshedProfile as any).companyName || '');
      }
      if ((refreshedProfile as any).companyAddress) {
        setCompanyAddress((refreshedProfile as any).companyAddress || '');
      }
      if ((refreshedProfile as any).siretNumber) {
        setSiret((refreshedProfile as any).siretNumber || '');
      }
      if ((refreshedProfile as any).siret) {
        setSiret((refreshedProfile as any).siret || '');
      }
      if ((refreshedProfile as any).vatNumber) {
        setVatNumber((refreshedProfile as any).vatNumber || '');
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      setProfileError(error.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setIsSaving(false);
    }
  };

  // Fonction pour sauvegarder les préférences de notification
  const handleSaveNotificationPreferences = async () => {
    try {
      setIsSaving(true);
      setProfileError(null);
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setProfileError('Utilisateur non connecté');
        return;
      }
      
      await rentoallUsersAPI.updateNotificationPreferences(parseInt(userId, 10), {
        emailNotificationBooking,
        emailNotificationMessage,
        emailNotificationPromotion,
        pushNotificationBooking,
        pushNotificationMessage,
      });
      
      // Recharger le profil pour avoir les valeurs à jour
      const refreshedProfile = await rentoallUsersAPI.getProfile(parseInt(userId, 10));
      setUserProfile(refreshedProfile);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour des préférences de notification:', error);
      setProfileError(error.response?.data?.message || 'Erreur lors de la mise à jour des préférences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      setProfileError('Veuillez sélectionner un fichier image');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('L\'image est trop volumineuse. Taille maximale : 5MB');
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      setProfileError('Utilisateur non connecté');
      return;
    }

    try {
      setIsUploadingPicture(true);
      setProfileError(null);

      // Upload de la photo
      const updatedProfile = await rentoallUsersAPI.updateProfilePicture(parseInt(userId, 10), file);
      
      // Mettre à jour l'état local
      setUserProfile(updatedProfile);
      // Utiliser la fonction helper pour obtenir l'URL de la photo de profil
      const updatedProfilePictureUrl = getProfilePictureUrl(updatedProfile);
      setProfilePicture(updatedProfilePictureUrl || '');
      
      // Notifier le header pour recharger la photo de profil
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profileUpdated'));
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('Erreur lors de l\'upload de la photo:', error);
      setProfileError(error.response?.data?.message || 'Erreur lors de l\'upload de la photo');
    } finally {
      setIsUploadingPicture(false);
      // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProfilePicture = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setProfileError('Utilisateur non connecté');
      return;
    }

    try {
      setIsUploadingPicture(true);
      setProfileError(null);

      // Mettre à jour le profil avec une photo vide
      if (!userProfile) {
        throw new Error('Profil utilisateur non chargé');
      }
      const updatedProfile = await rentoallUsersAPI.updateProfile(parseInt(userId, 10), {
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        profilePicture: '',
      });
      
      // Mettre à jour l'état local
      setUserProfile(updatedProfile);
      setProfilePicture('');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('Erreur lors de la suppression de la photo:', error);
      setProfileError(error.response?.data?.message || 'Erreur lors de la suppression de la photo');
    } finally {
      setIsUploadingPicture(false);
    }
  };
  
  const handleChangePassword = async () => {
    try {
      setIsSaving(true);
      setPasswordError(null);
      setPasswordSuccess(false);
      
      // Validation côté client
      if (newPassword !== confirmPassword) {
        setPasswordError('Les mots de passe ne correspondent pas');
        setIsSaving(false);
        return;
      }
      
      if (newPassword.length < 6) {
        setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
        setIsSaving(false);
        return;
      }
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setPasswordError('Utilisateur non connecté');
        setIsSaving(false);
        return;
      }
      
      await rentoallUsersAPI.changePassword(parseInt(userId, 10), {
        oldPassword,
        newPassword,
        confirmPassword,
      });
      
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      setPasswordError(error.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setDeleteError('Utilisateur non connecté');
        setIsDeleting(false);
        return;
      }
      
      console.log('🔴 [PARAMETRES] Suppression du compte utilisateur:', userId);
      
      // Appeler l'API pour supprimer le compte
      await rentoallUsersAPI.deleteAccount(parseInt(userId, 10));
      
      console.log('✅ [PARAMETRES] Compte supprimé avec succès');
      
      removeItem('authToken');
      removeItem('userId');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userMode');
      }
      removeItem('finalUserType');
      if (typeof window !== 'undefined') localStorage.removeItem('userType');
      
      // Rediriger vers la page d'accueil
      if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/'); }
    } catch (error: any) {
      console.error('❌ [PARAMETRES] Erreur lors de la suppression du compte:', error);
      setDeleteError(error.response?.data?.message || 'Erreur lors de la suppression du compte. Veuillez réessayer.');
      setIsDeleting(false);
    }
  };

  // Fonction pour basculer entre les modes
  const toggleUserMode = () => {
    const newMode = userMode === 'client' ? 'host' : 'client';
    if (typeof window !== 'undefined') {
      // Mettre à jour le localStorage
      localStorage.setItem('userMode', newMode);
      // Mettre à jour l'état local immédiatement
      setUserMode(newMode);
      // Déclencher un événement personnalisé pour notifier les autres composants
      window.dispatchEvent(new Event('userModeChanged'));
      // Rediriger selon le mode : calendrier en hôte, recherche en client
      const redirectPath = newMode === 'host' ? '/mon-calendrier' : '/search-parkings';
      if (isCapacitor()) { capacitorNavigate(redirectPath); } else { router.push(redirectPath); }
    }
  };

  // Fonctions pour l'authentification à deux facteurs (2FA)
  const handleStart2FASetup = async () => {
    try {
      setIsLoading2FA(true);
      setTwoFactorError(null);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setTwoFactorError('Utilisateur non connecté');
        return;
      }

      const result = await rentoallUsersAPI.start2FASetup(parseInt(userId, 10));
      setTwoFactorOtpAuthUrl(result.otpAuthUrl);
      setTwoFactorSecret(result.secret);
      setShow2FASetupModal(true);
    } catch (error: any) {
      console.error('Erreur lors du démarrage de la configuration 2FA:', error);
      setTwoFactorError(error.response?.data?.message || 'Erreur lors du démarrage de la configuration 2FA');
    } finally {
      setIsLoading2FA(false);
    }
  };

  const handleVerify2FASetup = async () => {
    if (!twoFactorVerificationCode || twoFactorVerificationCode.length !== 6) {
      setTwoFactorError('Veuillez entrer un code à 6 chiffres');
      return;
    }

    try {
      setIsLoading2FA(true);
      setTwoFactorError(null);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setTwoFactorError('Utilisateur non connecté');
        return;
      }

      const result = await rentoallUsersAPI.verify2FASetup(parseInt(userId, 10), twoFactorVerificationCode);
      setTwoFactorBackupCodes(result.backupCodes);
      setTwoFactorEnabled(true);
      setShow2FASetupModal(false);
      setShow2FABackupCodesModal(true);
      setTwoFactorVerificationCode('');
      setTwoFactorOtpAuthUrl('');
      setTwoFactorSecret('');
      
      // Recharger le profil pour mettre à jour le statut
      const profile = await rentoallUsersAPI.getProfile(parseInt(userId, 10));
      setUserProfile(profile);
    } catch (error: any) {
      console.error('Erreur lors de la vérification du code 2FA:', error);
      setTwoFactorError(error.response?.data?.message || 'Code invalide. Veuillez réessayer.');
    } finally {
      setIsLoading2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFactorDisablePassword || !twoFactorDisableCode) {
      setTwoFactorError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsLoading2FA(true);
      setTwoFactorError(null);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setTwoFactorError('Utilisateur non connecté');
        return;
      }

      await rentoallUsersAPI.disable2FA(parseInt(userId, 10), twoFactorDisablePassword, twoFactorDisableCode);
      setTwoFactorEnabled(false);
      setShow2FADisableModal(false);
      setTwoFactorDisablePassword('');
      setTwoFactorDisableCode('');
      
      // Recharger le profil pour mettre à jour le statut
      const profile = await rentoallUsersAPI.getProfile(parseInt(userId, 10));
      setUserProfile(profile);
    } catch (error: any) {
      console.error('Erreur lors de la désactivation du 2FA:', error);
      setTwoFactorError(error.response?.data?.message || 'Erreur lors de la désactivation. Vérifiez votre mot de passe et votre code.');
    } finally {
      setIsLoading2FA(false);
    }
  };

  // Infos bancaires incomplètes (hôte) : Stripe Connect ou IBAN manquant
  const stripeConnected = (stripeOnboardingStatus === 'COMPLETE' && stripePayoutsEnabled) || (userProfile && (userProfile as any).stripeAccountId);
  // Pour les hôtes, les versements passent par Stripe Connect uniquement
  const bankingInfoIncomplete = userMode === 'host' && !stripeConnected;

  return (
    <ProtectedRoute>
    <div className="parametres-page min-h-screen bg-white overflow-x-hidden w-full max-w-full">
      <HeaderNavigation />
      <main className="parametres-page-main pt-0 md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-24 md:pb-12 flex-1 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Header - sticky sur mobile, en haut, titre bien visible */}
          <div className="sticky z-20 -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0 md:static mb-4 sm:mb-6 md:mb-8 pt-1 md:pt-0 bg-white border-b border-slate-200 md:border-b-0 pb-4 md:pb-0 parametres-page-header" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">Paramètres</h1>
              {/* Bouton déconnexion - visible uniquement sur mobile (iOS/Android) */}
              {isMobileOrCapacitor() && (
                <button
                  onClick={() => {
                    authAPI.logout();
                    if (typeof window !== 'undefined') localStorage.removeItem('userMode');
                    if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/'); }
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors touch-manipulation border border-red-200 shrink-0"
                  aria-label="Déconnexion"
                >
                  <LogOut className="w-5 h-5" strokeWidth={2.5} />
                  <span className="font-semibold text-sm">Déconnexion</span>
                </button>
              )}
            </div>
            
            {/* Onglets de navigation rapide - Mobile uniquement en mode hôte */}
            {userMode === 'host' && (
              <div className="lg:hidden mb-4">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2 overflow-x-auto scrollbar-hide">
                  <div className="flex justify-center gap-2 min-w-max w-fit mx-auto">
                    <Link
                      href={isMobileOrCapacitor() ? "/host/my-places" : "/home"}
                      prefetch={false}
                      onClick={(e) => handleCapacitorLinkClick(e, isMobileOrCapacitor() ? "/host/my-places" : "/home", router)}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium text-xs whitespace-nowrap border border-emerald-200"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Tableau de bord</span>
                    </Link>
                    <Link
                      href="/host/my-places"
                      prefetch={false}
                      onClick={(e) => handleCapacitorLinkClick(e, "/host/my-places", router)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-lg font-medium text-xs whitespace-nowrap border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Mes annonces</span>
                    </Link>
                    <Link
                      href="/host/referrals"
                      prefetch={false}
                      onClick={(e) => handleCapacitorLinkClick(e, "/host/referrals", router)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-lg font-medium text-xs whitespace-nowrap border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                    >
                      <Gift className="w-4 h-4" />
                      <span>Parrainage</span>
                    </Link>
                    <Link
                      href="/reservations"
                      prefetch={false}
                      onClick={(e) => handleCapacitorLinkClick(e, "/reservations", router)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-lg font-medium text-xs whitespace-nowrap border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Mes réservations</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            {/* Sidebar - Tabs - Mobile: Icônes uniquement avec scroll horizontal, Desktop: Colonne verticale */}
            <div className="lg:col-span-1">
              {/* Mobile: Navigation avec icônes et labels - bien visible */}
              <div className="lg:hidden bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-4 overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 min-w-max w-fit mx-auto">
                  {[
                    { id: 'personal', icon: User, label: 'Profil' },
                    { id: 'login', icon: Lock, label: 'Sécurité' },
                    { id: 'privacy', icon: Shield, label: 'Confidentialité' },
                    { id: 'notifications', icon: Bell, label: 'Notifications' },
                    { id: 'contact', icon: MessageSquare, label: 'Nous contacter' },
                    ...(userMode === 'host' ? [{ id: 'taxes', icon: FileText, label: 'Taxes' }] : []),
                    ...(userMode === 'host' ? [{ id: 'payouts', icon: Building2, label: 'Versements' }] : []),
                    { id: 'menu', icon: Menu, label: 'Menu' },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as any)}
                      className={`flex flex-col items-center justify-center gap-1.5 px-4 py-3 min-w-[64px] min-h-[60px] transition-all rounded-xl cursor-pointer touch-manipulation ${
                        activeTab === id
                          ? 'bg-emerald-100 border-2 border-emerald-500'
                          : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                      }`}
                      title={label}
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                        activeTab === id
                          ? 'bg-emerald-200/80'
                          : 'bg-slate-200/60'
                      }`}>
                        <Icon className={`w-5 h-5 transition-colors ${
                          activeTab === id
                            ? 'text-emerald-700'
                            : 'text-slate-600'
                        }`} />
                      </div>
                      <span className={`text-[10px] font-medium leading-tight text-center max-w-[56px] truncate ${
                        activeTab === id ? 'text-emerald-700' : 'text-slate-600'
                      }`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop: Navigation avec texte */}
              <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm p-3 sticky top-24">
                <div className="flex flex-col gap-0 space-y-2">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation w-full ${
                      activeTab === 'personal'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-5 h-5 flex-shrink-0" />
                    <span>Informations personnelles</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('login')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation w-full ${
                      activeTab === 'login'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Lock className="w-5 h-5 flex-shrink-0" />
                    <span>Connexion et sécurité</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation w-full ${
                      activeTab === 'privacy'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-5 h-5 flex-shrink-0" />
                    <span>Confidentialité et partage</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation w-full ${
                      activeTab === 'notifications'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Bell className="w-5 h-5 flex-shrink-0" />
                    <span>Notifications</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('contact')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation w-full ${
                      activeTab === 'contact'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 flex-shrink-0" />
                    <span>Nous contacter</span>
                  </button>
                  {userMode === 'host' && (
                    <button
                      onClick={() => setActiveTab('taxes')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation w-full ${
                        activeTab === 'taxes'
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-5 h-5 flex-shrink-0" />
                      <span>Taxes</span>
                    </button>
                  )}
                  {userMode === 'host' && (
                    <button
                      onClick={() => setActiveTab('payouts')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation w-full ${
                        activeTab === 'payouts'
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Building2 className="w-5 h-5 flex-shrink-0" />
                      <span>Versements</span>
                    </button>
                  )}
                  <div className="border-t border-slate-200 mt-2 pt-2">
                    <button
                      onClick={() => {
                        authAPI.logout();
                        if (typeof window !== 'undefined') localStorage.removeItem('userMode');
                        if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/'); }
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors touch-manipulation w-full"
                    >
                      <LogOut className="w-5 h-5 flex-shrink-0" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-1">
              {/* Bandeau : inviter à compléter les infos bancaires (hôte, pas encore sur l'onglet Versements) */}
              {bankingInfoIncomplete && activeTab !== 'payouts' && (
                <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 flex flex-wrap items-center gap-3">
                  <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900">Veuillez renseigner vos informations bancaires</p>
                    <p className="text-xs text-amber-700 mt-0.5">Complétez Stripe Connect (onglet Versements) pour recevoir vos paiements des locations.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payouts')}
                    className="px-4 py-2 text-sm font-medium text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors"
                  >
                    Remplir les infos
                  </button>
                </div>
              )}
              {/* Personal Info Tab */}
              {activeTab === 'personal' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-1 sm:mb-2">Informations personnelles</h2>
                    <p className="text-xs sm:text-sm text-slate-600">Ces informations apparaissent sur votre profil public et dans vos messages aux hôtes.</p>
                  </div>

                  {showSuccess && (
                    <div className="flex items-center gap-2 p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-xs sm:text-sm font-medium">Modifications enregistrées</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="flex items-center gap-2 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-xs sm:text-sm font-medium">{profileError}</span>
                    </div>
                  )}

                  {isLoadingProfile && (
                    <div className="text-center py-8">
                      <p className="text-slate-600">Chargement du profil...</p>
                    </div>
                  )}

                  {/* Photo de profil */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 pb-3 sm:pb-6 md:pb-8 border-b border-slate-200">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                      <Image
                        src={profilePicture || getProfilePictureUrl(userProfile) || "/logoR.png"}
                        alt="Photo de profil"
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-base font-semibold text-slate-900 mb-1">Photo de profil</h3>
                      <p className="text-[10px] sm:text-sm text-slate-600 mb-2 sm:mb-3">Une photo claire de votre visage aide les hôtes et les utilisateurs à vous reconnaître.</p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleProfilePictureUpload}
                          className="hidden"
                          disabled={isUploadingPicture}
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPicture}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors min-h-[44px] sm:min-h-0 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isUploadingPicture ? (
                            <>
                              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                              <span>Upload...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>Mettre à jour</span>
                            </>
                          )}
                        </button>
                        <button 
                          onClick={handleDeleteProfilePicture}
                          disabled={isUploadingPicture || !profilePicture}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors min-h-[44px] sm:min-h-0 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nom */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Nom</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                    />
                  </div>

                  {/* Prénom */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Prénom</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                    />
                  </div>

                  {/* Date de naissance */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Date de naissance</label>
                    <p className="text-[10px] sm:text-sm text-slate-600 mb-2 sm:mb-3">Vous devez avoir au moins 18 ans pour créer un compte sur RENTTOALL.COM. Votre date de naissance ne sera pas partagée avec d&apos;autres utilisateurs.</p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <select 
                        value={birthDay || ''}
                        onChange={(e) => setBirthDay(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                      >
                        <option value="">Jour</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <select 
                        value={birthMonth || ''}
                        onChange={(e) => setBirthMonth(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                      >
                        <option value="">Mois</option>
                        {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((month, i) => (
                          <option key={month} value={i + 1}>{month}</option>
                        ))}
                      </select>
                      <select 
                        value={birthYear || ''}
                        onChange={(e) => setBirthYear(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                      >
                        <option value="">Année</option>
                        {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Adresse e-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                    />
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Numéro de téléphone</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        // N'accepter que les chiffres et le signe +
                        const value = e.target.value;
                        // Filtrer pour ne garder que les chiffres et le +
                        let filteredValue = value.replace(/[^0-9+]/g, '');
                        // S'assurer que le + n'apparaît qu'au début
                        if (filteredValue.includes('+')) {
                          const plusIndex = filteredValue.indexOf('+');
                          if (plusIndex === 0) {
                            // Le + est au début, garder le + et limiter à 12 chiffres après
                            const digitsOnly = filteredValue.replace(/\+/g, '');
                            if (digitsOnly.length <= 12) {
                              setPhoneNumber('+' + digitsOnly);
                            } else {
                              setPhoneNumber('+' + digitsOnly.slice(0, 12));
                            }
                          } else {
                            // Le + n'est pas au début, le retirer et limiter à 12 chiffres
                            const digitsOnly = filteredValue.replace(/\+/g, '');
                            setPhoneNumber(digitsOnly.slice(0, 12));
                          }
                        } else {
                          // Pas de +, limiter à 12 chiffres
                          setPhoneNumber(filteredValue.slice(0, 12));
                        }
                      }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                    />
                  </div>

                  {/* Adresse */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Adresse</label>
                    <AddressAutocomplete
                      value={address}
                      onChange={(value) => setAddress(value)}
                      onSelect={(suggestion) => {
                        // Remplir automatiquement la ville et le code postal
                        if (suggestion.city) {
                          setCity(suggestion.city);
                        }
                        if (suggestion.postcode) {
                          setZipCode(suggestion.postcode);
                        }
                      }}
                      onCityChange={(city) => setCity(city)}
                      onZipCodeChange={(zipCode) => setZipCode(zipCode)}
                      placeholder="Saisissez une adresse..."
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors mb-2 sm:mb-3"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <input
                        type="text"
                        placeholder="Code postal"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Ville"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Langue */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Langue préférée</label>
                    <select 
                      value={language}
                      onChange={(e) => {
                        const newLanguageName = e.target.value;
                        setLanguage(newLanguageName);
                        
                        // Mettre à jour immédiatement le contexte de langue global
                        const newLanguageCode = LANGUAGE_NAME_TO_CODE[newLanguageName] || newLanguageName;
                        let languageToSet: 'fr' | 'en' = 'fr';
                        if (newLanguageCode === 'fr' || newLanguageCode === 'en') {
                          languageToSet = newLanguageCode as 'fr' | 'en';
                        } else if (newLanguageCode === 'es' || newLanguageCode === 'de') {
                          // Pour l'instant, mapper espagnol et allemand vers français
                          // Vous pouvez ajuster cette logique selon vos besoins
                          languageToSet = 'fr';
                        }
                        
                        // Mettre à jour le contexte de langue et localStorage immédiatement
                        setGlobalLanguage(languageToSet);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('language', languageToSet);
                        }
                      }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                    >
                      <option>Français</option>
                      <option>English</option>
                      <option>Español</option>
                      <option>Deutsch</option>
                    </select>
                  </div>

                  {/* Informations d'entreprise - Affichées uniquement si l'utilisateur a une organisation */}
                  {(userProfile?.organization || companyName || siret || vatNumber) && (
                    <div className="pt-4 sm:pt-8 border-t border-slate-200">
                      <div className="mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5 sm:mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          Informations d'entreprise
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600">Gérez les informations de votre entreprise ou organisation.</p>
                      </div>

                      {/* Nom de l'entreprise */}
                      <div className="mb-4 sm:mb-6">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Nom de l'entreprise</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ex: Ma Société SARL"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                        />
                      </div>

                      {/* Adresse de l'entreprise */}
                      <div className="mb-4 sm:mb-6">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Adresse de l'entreprise</label>
                        <AddressAutocomplete
                          value={companyAddress}
                          onChange={(value) => setCompanyAddress(value)}
                          placeholder="Saisissez une adresse..."
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                        />
                      </div>

                      {/* SIRET */}
                      <div className="mb-4 sm:mb-6">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Numéro SIRET</label>
                        <input
                          type="text"
                          value={siret}
                          onChange={(e) => setSiret(e.target.value)}
                          placeholder="Ex: 12345678901234"
                          maxLength={14}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                        />
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-1">14 chiffres</p>
                      </div>

                      {/* Numéro de TVA */}
                      <div className="mb-4 sm:mb-6">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Numéro de TVA intracommunautaire</label>
                        <input
                          type="text"
                          value={vatNumber}
                          onChange={(e) => setVatNumber(e.target.value)}
                          placeholder="Ex: FR12345678901"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                        />
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Format: FR + 11 chiffres</p>
                      </div>
                    </div>
                  )}

                  {/* Informations de parrainage */}
                  <div className="pt-4 sm:pt-8 border-t border-slate-200">
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5 sm:mb-2 flex items-center gap-2">
                        <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                        Parrainage
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600">Votre code de parrainage et votre solde de crédit.</p>
                    </div>

                    {/* Code de parrainage */}
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Code de parrainage</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                          <code className="text-sm sm:text-base font-mono font-semibold text-slate-900">{referralCode || 'Chargement...'}</code>
                        </div>
                        <button
                          onClick={() => {
                            if (referralCode) {
                              navigator.clipboard.writeText(referralCode);
                              setShowSuccess(true);
                              setTimeout(() => setShowSuccess(false), 2000);
                            }
                          }}
                          className="px-3 sm:px-4 py-2 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Copier</span>
                        </button>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Partagez ce code pour gagner 5€ par filleul (bon à chaque palier de 200€ d&apos;achats)</p>
                    </div>

                    {/* Lien d'inscription (partage direct) */}
                    {referralCode && (
                      <div className="mb-4 sm:mb-6">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Lien à partager</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0 bg-slate-50 border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                            <p className="text-xs sm:text-sm text-slate-900 truncate" title={typeof window !== 'undefined' ? `${window.location.origin}/auth/signup?ref=${referralCode}` : ''}>
                              {typeof window !== 'undefined' ? `${window.location.origin}/auth/signup?ref=${referralCode}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const link = typeof window !== 'undefined' ? `${window.location.origin}/auth/signup?ref=${referralCode}` : '';
                              if (link) {
                                navigator.clipboard.writeText(link);
                                setCopiedLink(true);
                                setTimeout(() => setCopiedLink(false), 2000);
                              }
                            }}
                            className="px-3 sm:px-4 py-2 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{copiedLink ? 'Copié' : 'Copier le lien'}</span>
                          </button>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Envoyez ce lien par message : la personne s&apos;inscrit et votre code est appliqué automatiquement.</p>
                      </div>
                    )}

                    {/* Solde de crédit */}
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Solde de crédit</label>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          <Euro className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                          <span className="text-lg sm:text-xl font-bold text-emerald-700">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(creditBalance)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Crédit gagné grâce à vos parrainages</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 sm:pt-4 border-t border-slate-200">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 sm:gap-2"
                    >
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Login & Security Tab */}
              {activeTab === 'login' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-1 sm:mb-2">Connexion et sécurité</h2>
                    <p className="text-xs sm:text-sm text-slate-600">Gérez votre mot de passe et vos méthodes de connexion.</p>
                  </div>

                  {/* Mot de passe */}
                  <div className="pb-4 sm:pb-6 md:pb-8 border-b border-slate-200">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Mot de passe</h3>
                    
                    {passwordSuccess && (
                      <div className="flex items-center gap-2 p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 mb-3 sm:mb-4">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-medium">Mot de passe modifié avec succès</span>
                      </div>
                    )}

                    {passwordError && (
                      <div className="flex items-center gap-2 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-3 sm:mb-4">
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-medium">{passwordError}</span>
                      </div>
                    )}

                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Mot de passe actuel</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Nouveau mot de passe</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-1.5 sm:mb-2">Confirmer le nouveau mot de passe</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={handleChangePassword}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isSaving ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                      </button>
                    </div>
                  </div>

                  {/* Authentification à deux facteurs */}
                  <div className="pb-8 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">Authentification à deux facteurs</h3>
                        <p className="text-sm text-slate-600 mb-4">Ajoutez une couche de sécurité supplémentaire à votre compte en activant l&apos;authentification à deux facteurs avec Google Authenticator ou une application similaire.</p>
                        {userProfile?.email && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                            <Mail className="w-4 h-4" />
                            <span>{userProfile.email}</span>
                          </div>
                        )}
                        {twoFactorEnabled && (
                          <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                            <Check className="w-4 h-4" />
                            <span>2FA activé</span>
                          </div>
                        )}
                        {twoFactorError && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {twoFactorError}
                          </div>
                        )}
                      </div>
                      {twoFactorEnabled ? (
                        <button 
                          onClick={() => setShow2FADisableModal(true)}
                          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors ml-4"
                        >
                          Désactiver
                        </button>
                      ) : (
                        <button 
                          onClick={handleStart2FASetup}
                          disabled={isLoading2FA}
                          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading2FA ? 'Chargement...' : 'Activer'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Méthodes de connexion */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Méthodes de connexion</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-slate-600" />
                          <div>
                            <p className="font-semibold text-slate-900">E-mail</p>
                            <p className="text-sm text-slate-600">{email || 'Non renseigné'}</p>
                          </div>
                        </div>
                        {email && (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">Actif</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-1 sm:mb-2">Confidentialité et partage</h2>
                    <p className="text-xs sm:text-sm text-slate-600">Gérez vos informations personnelles et vos préférences de partage.</p>
                  </div>

                  {/* Affichage des commentaires */}
                  <div className="pb-4 sm:pb-6 md:pb-8 border-b border-slate-200">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Affichage des commentaires</h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-start justify-between p-3 sm:p-4 border border-slate-200 rounded-lg">
                        <div className="flex-1 pr-2">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 mb-1">Afficher la ville et le pays</p>
                          <p className="text-[10px] sm:text-sm text-slate-600">Votre ville et votre pays seront visibles sur vos commentaires publics.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-10 h-5 sm:w-11 sm:h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                        </label>
                      </div>
                      <div className="flex items-start justify-between p-3 sm:p-4 border border-slate-200 rounded-lg">
                        <div className="flex-1 pr-2">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 mb-1">Afficher uniquement le pays</p>
                          <p className="text-[10px] sm:text-sm text-slate-600">Seul votre pays sera visible sur vos commentaires publics.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-10 h-5 sm:w-11 sm:h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* RGPD */}
                  <div className="pb-4 sm:pb-6 md:pb-8 border-b border-slate-200">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Règlement Général sur la Protection des Données (RGPD)</h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-xs sm:text-sm text-slate-700 mb-3 sm:mb-4">
                          Conformément au RGPD, vous avez le droit d&apos;accéder, de rectifier, de supprimer vos données personnelles, 
                          de vous opposer à leur traitement, de demander la portabilité de vos données et de définir des directives 
                          concernant le sort de vos données après votre décès.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <button className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-white transition-colors cursor-pointer">
                            Télécharger mes données
                          </button>
                          <button 
                            onClick={() => {
                              setShowDeleteConfirm(true);
                              setDeleteConfirmText('');
                              setDeleteError(null);
                            }}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            Supprimer mon compte
                          </button>
                        </div>
                        
                        {/* Modal de confirmation de suppression */}
                        {showDeleteConfirm && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                              className="absolute inset-0 bg-black/50"
                              onClick={() => {
                                if (!isDeleting) {
                                  setShowDeleteConfirm(false);
                                  setDeleteError(null);
                                  setDeleteConfirmText('');
                                }
                              }}
                              aria-hidden="true"
                            />
                            <div className="relative bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-red-100 rounded-full">
                                  <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Supprimer mon compte</h3>
                              </div>
                              
                              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm font-semibold text-amber-900 mb-2">Vous êtes sur le point de supprimer définitivement votre compte.</p>
                                <p className="text-xs sm:text-sm text-amber-800 mb-2">
                                  Cette action est <strong>irréversible</strong>. Toutes vos données seront définitivement supprimées&nbsp;: profil, annonces, réservations, messages et historique.
                                </p>
                                <p className="text-xs sm:text-sm text-amber-800">
                                  Si vous êtes sûr de vouloir continuer, tapez <strong>SUPPRIMER</strong> ci-dessous puis validez.
                                </p>
                              </div>
                              
                              <p className="text-slate-600 mb-3">
                                Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données seront définitivement supprimées.
                              </p>

                              <div className="mb-4">
                                <label htmlFor="delete-confirm-input" className="block text-sm font-semibold text-slate-700 mb-2">
                                  Tapez SUPPRIMER pour confirmer
                                </label>
                                <input
                                  id="delete-confirm-input"
                                  type="text"
                                  value={deleteConfirmText}
                                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                                  placeholder="SUPPRIMER"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none text-sm"
                                  disabled={isDeleting}
                                  autoComplete="off"
                                />
                              </div>
                              
                              {deleteError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                                  <X className="w-4 h-4" />
                                  <span className="text-sm">{deleteError}</span>
                                </div>
                              )}
                              
                              <div className="flex gap-3 justify-end">
                                <button
                                  onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteError(null);
                                    setDeleteConfirmText('');
                                  }}
                                  disabled={isDeleting}
                                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={handleDeleteAccount}
                                  disabled={isDeleting || deleteConfirmText !== 'SUPPRIMER'}
                                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                                >
                                  {isDeleting ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Suppression...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4" />
                                      Supprimer définitivement
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 sm:pt-4 border-t border-slate-200">
                    <button
                      id="btn-save-privacy-settings"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 sm:gap-2"
                    >
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-1 sm:mb-2">Notifications</h2>
                    <p className="text-xs sm:text-sm text-slate-600">Choisissez comment vous souhaitez être notifié.</p>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-slate-600" />
                        E-mail
                      </h3>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-lg">
                          <div className="flex-1 pr-2">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900">Réservations</p>
                            <p className="text-[10px] sm:text-sm text-slate-600">Notifications de réservation par email</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input 
                              id="checkbox-email-notification-booking-settings"
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={emailNotificationBooking}
                              onChange={(e) => setEmailNotificationBooking(e.target.checked)}
                            />
                            <div className="w-10 h-5 sm:w-11 sm:h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-lg">
                          <div className="flex-1 pr-2">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900">Messages</p>
                            <p className="text-[10px] sm:text-sm text-slate-600">Notifications de nouveaux messages par email</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input 
                              id="checkbox-email-notification-message-settings"
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={emailNotificationMessage}
                              onChange={(e) => setEmailNotificationMessage(e.target.checked)}
                            />
                            <div className="w-10 h-5 sm:w-11 sm:h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-lg">
                          <div className="flex-1 pr-2">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900">Promotions</p>
                            <p className="text-[10px] sm:text-sm text-slate-600">Offres promotionnelles et actualités par email</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input 
                              id="checkbox-email-notification-promotion-settings"
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={emailNotificationPromotion}
                              onChange={(e) => setEmailNotificationPromotion(e.target.checked)}
                            />
                            <div className="w-10 h-5 sm:w-11 sm:h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-slate-600" />
                        Push
                      </h3>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-lg">
                          <div className="flex-1 pr-2">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900">Réservations</p>
                            <p className="text-[10px] sm:text-sm text-slate-600">Notifications de réservation via Push</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input 
                              id="checkbox-push-notification-booking-settings"
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={pushNotificationBooking}
                              onChange={(e) => setPushNotificationBooking(e.target.checked)}
                            />
                            <div className="w-10 h-5 sm:w-11 sm:h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-lg">
                          <div className="flex-1 pr-2">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900">Messages</p>
                            <p className="text-[10px] sm:text-sm text-slate-600">Notifications de nouveaux messages via Push</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input 
                              id="checkbox-push-notification-message-settings"
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={pushNotificationMessage}
                              onChange={(e) => setPushNotificationMessage(e.target.checked)}
                            />
                            <div className="w-10 h-5 sm:w-11 sm:h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 sm:pt-4 border-t border-slate-200">
                    <button
                      id="btn-save-notifications-settings"
                      onClick={handleSaveNotificationPreferences}
                      disabled={isSaving}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 sm:gap-2"
                    >
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Contact Tab */}
              {activeTab === 'contact' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-1 sm:mb-2">Nous contacter</h2>
                    <p className="text-xs sm:text-sm text-slate-600">Envoyez-nous un message pour toute question ou demande d'assistance.</p>
                  </div>

                  {contactSuccess && (
                    <div className="flex items-center gap-2 p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      <p className="text-xs sm:text-sm">Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.</p>
                    </div>
                  )}

                  {contactError && (
                    <div className="flex items-center gap-2 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <p className="text-xs sm:text-sm">{contactError}</p>
                    </div>
                  )}

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!contactTitle.trim() || !contactDescription.trim()) {
                        setContactError('Veuillez remplir tous les champs');
                        return;
                      }

                      try {
                        setIsSendingContact(true);
                        setContactError(null);
                        setContactSuccess(false);

                        const userId = localStorage.getItem('userId');
                        await contactAPI.sendContactRequest({
                          title: contactTitle.trim(),
                          description: contactDescription.trim(),
                          userId: userId ? parseInt(userId, 10) : undefined,
                        });
                        
                        setContactSuccess(true);
                        setContactTitle('');
                        setContactDescription('');
                        
                        // Masquer le message de succès après 5 secondes
                        setTimeout(() => {
                          setContactSuccess(false);
                        }, 5000);
                      } catch (error: any) {
                        console.error('Erreur lors de l\'envoi du message:', error);
                        setContactError(error.response?.data?.message || 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.');
                      } finally {
                        setIsSendingContact(false);
                      }
                    }}
                    className="space-y-4 sm:space-y-6"
                  >
                    <div>
                      <label htmlFor="contact-title" className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                        Titre *
                      </label>
                      <input
                        id="contact-title"
                        type="text"
                        value={contactTitle}
                        onChange={(e) => setContactTitle(e.target.value)}
                        placeholder="Ex: Question sur ma réservation"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors text-xs sm:text-sm"
                        required
                        disabled={isSendingContact}
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-description" className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                        Description *
                      </label>
                      <textarea
                        id="contact-description"
                        value={contactDescription}
                        onChange={(e) => setContactDescription(e.target.value)}
                        placeholder="Décrivez votre question ou votre problème en détail..."
                        rows={6}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors text-xs sm:text-sm resize-y"
                        required
                        disabled={isSendingContact}
                      />
                    </div>

                    <div className="flex justify-end pt-3 sm:pt-4 border-t border-slate-200">
                      <button
                        id="btn-send-contact-settings"
                        type="submit"
                        disabled={isSendingContact || !contactTitle.trim() || !contactDescription.trim()}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
                      >
                        {isSendingContact ? (
                          <>
                            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Envoi en cours...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Envoyer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Taxes Tab - visible uniquement en mode hôte */}
              {activeTab === 'taxes' && userMode === 'host' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-1 sm:mb-2">Taxes</h2>
                    <p className="text-xs sm:text-sm text-slate-600">Gérez vos informations fiscales.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Numéro de TVA intracommunautaire</h3>
                      <p className="text-sm text-slate-600 mb-4">Si vous êtes un professionnel, vous pouvez ajouter votre numéro de TVA intracommunautaire.</p>
                      <input
                        id="input-tax-vat-number-settings"
                        type="text"
                        placeholder="FR12345678901"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                      />
                    </div>

                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Informations fiscales</h3>
                      <p className="text-sm text-slate-600 mb-4">Téléchargez vos documents fiscaux et déclarations.</p>
                      <div className="flex gap-3">
                        <button id="btn-download-tax-documents-settings" className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-white transition-colors flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Télécharger mes documents
                        </button>
                        <button id="btn-upload-tax-document-settings" className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-white transition-colors flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Envoyer un document
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-200">
                    <button
                      id="btn-save-taxes-settings"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Payouts Tab - visible uniquement en mode hôte */}
              {activeTab === 'payouts' && userMode === 'host' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-1 sm:mb-2">Versements</h2>
                    <p className="text-xs sm:text-sm text-slate-600">Gérez vos méthodes de versement et consultez votre historique.</p>
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Méthode de versement</h3>
                    <p className="text-sm text-slate-600 mb-4">Configurez votre compte bancaire pour recevoir vos paiements via Stripe.</p>
                    
                    {/* Statut Stripe */}
                    {(stripeOnboardingStatus || (userProfile && (userProfile as any).stripeAccountId)) && (
                      <div className="mb-4 p-3 rounded-lg bg-white border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">Statut Stripe Connect</p>
                            <p className="text-xs text-slate-600 mt-1">
                              {((stripeOnboardingStatus === 'COMPLETE' && stripePayoutsEnabled) || (userProfile && (userProfile as any).stripeAccountId))
                                ? '✅ Compte configuré - Vous pouvez recevoir vos paiements'
                                : stripeOnboardingStatus === 'COMPLETE'
                                ? '⚠️ Configuration en cours - Finalisez votre compte'
                                : stripeOnboardingStatus === 'PENDING'
                                ? '⏳ Configuration en attente'
                                : '❌ Non configuré'}
                            </p>
                          </div>
                          {((stripeOnboardingStatus === 'COMPLETE' && stripePayoutsEnabled) || (userProfile && (userProfile as any).stripeAccountId)) && (
                            <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                              Actif
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Message d'erreur */}
                    {stripeError && (
                      <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-sm text-red-700">{stripeError}</p>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {((stripeOnboardingStatus === 'COMPLETE' && stripePayoutsEnabled) || (userProfile && (userProfile as any).stripeAccountId)) ? (
                        <div className="flex items-center justify-between p-4 border border-emerald-200 rounded-lg bg-emerald-50">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="font-semibold text-slate-900">Compte Stripe Connect</p>
                              <p className="text-sm text-slate-600">Votre compte est configuré et prêt à recevoir les paiements</p>
                            </div>
                          </div>
                          <button
                            id="btn-update-stripe-settings"
                            onClick={handleStripeUpdate}
                            disabled={isLoadingStripeLink}
                            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingStripeLink ? 'Chargement...' : 'Mettre à jour'}
                          </button>
                        </div>
                      ) : (
                        <button
                          id="btn-setup-stripe-settings"
                          onClick={handleStripeOnboarding}
                          disabled={isLoadingStripeLink}
                          className="w-full p-4 border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-xl text-emerald-700 hover:border-emerald-500 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CreditCard className="w-5 h-5" />
                          <span className="font-medium">
                            {isLoadingStripeLink ? 'Création du lien...' : 'Configurer mon compte bancaire (Stripe Connect)'}
                          </span>
                        </button>
                      )}
                      
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>Comment ça fonctionne :</strong> Vous serez redirigé vers Stripe pour saisir votre IBAN et vos informations d'identité. 
                          Une fois configuré, vos revenus seront automatiquement transférés sur votre compte bancaire 24h après la fin de chaque réservation.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bloc Informations bancaires (IBAN / BIC) — branché sur GET/PUT /api/users/{id}/bank-info */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Informations bancaires (IBAN / BIC)</h3>
                    <p className="text-sm text-slate-600 mb-2">
                      <strong>Pour les affiliateurs et ambassadeurs :</strong> renseignez votre IBAN et BIC ci-dessous pour recevoir vos commissions (parrainage, etc.). Les données sont enregistrées sur le serveur.
                    </p>
                    <div className="mb-4 p-3 bg-slate-100 border border-slate-200 rounded-lg">
                      <p className="text-sm text-slate-700">
                        <strong>Pour les hôtes (versements des locations) :</strong> les versements passent par <strong>Stripe Connect</strong>. Configurez votre compte bancaire via le bloc «&nbsp;Configurer mon compte bancaire (Stripe Connect)&nbsp;» ci-dessus ; inutile de renseigner l’IBAN/BIC dans cette section.
                      </p>
                    </div>
                    {bankingError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{bankingError}</p>
                      </div>
                    )}
                    {bankingSuccess && (
                      <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm text-emerald-700">Informations bancaires enregistrées.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="parametres-iban" className="block text-sm font-medium text-slate-700 mb-1">
                          IBAN
                        </label>
                        <input
                          id="parametres-iban"
                          type="text"
                          value={iban}
                          onChange={(e) => { setIban(e.target.value); setBankingError(null); setBankingSuccess(false); }}
                          placeholder="FR76 1234 5678 9012 3456 7890 123"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Format : 2 lettres + 2 chiffres + 20 caractères</p>
                      </div>
                      <div>
                        <label htmlFor="parametres-bic" className="block text-sm font-medium text-slate-700 mb-1">
                          BIC / SWIFT
                        </label>
                        <input
                          id="parametres-bic"
                          type="text"
                          value={bic}
                          onChange={(e) => { setBic(e.target.value); setBankingError(null); setBankingSuccess(false); }}
                          placeholder="BNPAFRPPXXX"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Code banque (8 à 11 caractères)</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isSavingBanking}
                        onClick={async () => {
                          const userId = localStorage.getItem('userId');
                          if (!userId) {
                            setBankingError('Utilisateur non connecté');
                            return;
                          }
                          setBankingError(null);
                          setBankingSuccess(false);
                          setIsSavingBanking(true);
                          try {
                            await rentoallUsersAPI.updateBankInfo(parseInt(userId, 10), {
                              iban: iban.trim(),
                              bic: bic.trim(),
                            });
                            setBankingSuccess(true);
                            window.dispatchEvent(new Event('bankingInfoUpdated'));
                          } catch (err: unknown) {
                            const message = err && typeof err === 'object' && 'response' in err && typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
                              ? (err as { response: { data: { message: string } } }).response.data.message
                              : 'Erreur lors de l\'enregistrement des informations bancaires.';
                            setBankingError(message);
                          } finally {
                            setIsSavingBanking(false);
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isSavingBanking ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Historique des versements</h3>
                    
                    {isLoadingPayouts ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-6">
                        <LoadingLogo size="xl" />
                        <div className="text-center">
                          <AnimatedLoadingText
                            label="Chargement des versements..."
                            className="text-lg"
                          />
                          <p className="text-sm text-emerald-500 mt-2">
                            Veuillez patienter
                          </p>
                        </div>
                      </div>
                    ) : payoutsError ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{payoutsError}</p>
                      </div>
                    ) : payouts.length === 0 ? (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <p className="text-sm text-slate-600">Aucun versement pour le moment.</p>
                      </div>
                    ) : (
                      <>
                      <div className="space-y-3">
                        {payouts
                          .slice((payoutsPage - 1) * PAYOUTS_PER_PAGE, payoutsPage * PAYOUTS_PER_PAGE)
                          .map((payout) => {
                          // Formater les dates
                          const formatDate = (dateString: string) => {
                            const date = new Date(dateString);
                            return date.toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            });
                          };

                          // Formater les montants (centimes vers euros)
                          const formatAmount = (cents: number) => {
                            return (cents / 100).toFixed(2).replace('.', ',') + ' €';
                          };

                          // Obtenir le libellé et la couleur du statut
                          const getStatusInfo = (status: string) => {
                            switch (status) {
                              case 'SENT':
                                return { label: 'Envoyé', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
                              case 'PENDING':
                                return { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
                              case 'FAILED':
                                return { label: 'Échec', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
                              case 'BLOCKED_OWNER_NOT_READY':
                                return { label: 'Bloqué', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' };
                              default:
                                return { label: status, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' };
                            }
                          };

                          const statusInfo = getStatusInfo(payout.status);
                          const releaseDate = formatDate(payout.releaseAt);
                          const sentDate = payout.sentAt ? formatDate(payout.sentAt) : null;
                          const displayDate = sentDate || releaseDate;

                          return (
                            <div key={payout.id} className={`p-4 border ${statusInfo.border} rounded-lg ${statusInfo.bg}`}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900 mb-1">{payout.placeTitle}</p>
                                  <p className="text-xs text-slate-600 mb-1">
                                    Réservation #{payout.reservationId}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    {payout.status === 'SENT' && sentDate
                                      ? `Envoyé le ${sentDate}`
                                      : payout.status === 'PENDING'
                                      ? `Libération prévue le ${releaseDate}`
                                      : `Créé le ${formatDate(payout.createdAt)}`}
                                  </p>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="font-semibold text-slate-900 mb-1">{formatAmount(payout.netAmountCents)}</p>
                                  <div className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.color} ${statusInfo.bg} border ${statusInfo.border}`}>
                                    {statusInfo.label}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-slate-200/50">
                                <div className="flex justify-between text-xs text-slate-600">
                                  <span>Montant brut: {formatAmount(payout.grossAmountCents)}</span>
                                  <span>Commission: {formatAmount(payout.platformFeeCents)}</span>
                                </div>
                                {payout.transferId && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Transfert: {payout.transferId}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {payouts.length > PAYOUTS_PER_PAGE && (
                        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <p className="text-sm text-slate-600">
                            Versements {(payoutsPage - 1) * PAYOUTS_PER_PAGE + 1}-{Math.min(payoutsPage * PAYOUTS_PER_PAGE, payouts.length)} sur {payouts.length}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPayoutsPage((p) => Math.max(1, p - 1))}
                              disabled={payoutsPage <= 1}
                              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                              aria-label="Page précédente"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Précédent
                            </button>
                            <span className="text-sm text-slate-600 px-2">
                              Page {payoutsPage} sur {Math.ceil(payouts.length / PAYOUTS_PER_PAGE)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPayoutsPage((p) => Math.min(Math.ceil(payouts.length / PAYOUTS_PER_PAGE), p + 1))}
                              disabled={payoutsPage >= Math.ceil(payouts.length / PAYOUTS_PER_PAGE)}
                              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                              aria-label="Page suivante"
                            >
                              Suivant
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                    )}
                  </div>
                </div>
              )}

              {/* Menu Tab - Tous les éléments du menu mobile */}
              {activeTab === 'menu' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-1 sm:mb-2">Menu</h2>
                    <p className="text-xs sm:text-sm text-slate-600">Accès rapide à toutes les fonctionnalités</p>
                  </div>

                  <div className="space-y-2">
                    {userMode === 'host' && (
                      <>
                        <Link
                          href={isMobileOrCapacitor() ? "/host/my-places" : "/home"}
                          prefetch={false}
                          onClick={(e) => handleCapacitorLinkClick(e, isMobileOrCapacitor() ? "/host/my-places" : "/home", router)}
                          className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3.5 min-h-[48px] sm:min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg sm:rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                        >
                          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-sm sm:text-lg">Tableau de bord</span>
                        </Link>
                        <Link
                          href="/host/my-places"
                          prefetch={false}
                          onClick={(e) => handleCapacitorLinkClick(e, "/host/my-places", router)}
                          className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3.5 min-h-[48px] sm:min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg sm:rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                        >
                          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-sm sm:text-lg">Mes annonces</span>
                        </Link>
                        <Link
                          href="/host/referrals"
                          prefetch={false}
                          onClick={(e) => handleCapacitorLinkClick(e, "/host/referrals", router)}
                          className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3.5 min-h-[48px] sm:min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg sm:rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                        >
                          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                            <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-sm sm:text-lg">Parrainages & Affiliations</span>
                        </Link>
                        <Link
                          href="/mon-calendrier"
                          prefetch={false}
                          onClick={(e) => handleCapacitorLinkClick(e, "/mon-calendrier", router)}
                          className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3.5 min-h-[48px] sm:min-h-[52px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg sm:rounded-xl transition-all cursor-pointer touch-manipulation group border border-transparent hover:border-emerald-200"
                        >
                          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-slate-100 group-hover:bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-sm sm:text-lg">Mon calendrier</span>
                        </Link>
                        <Link
                          href="/host/create"
                          prefetch={false}
                          onClick={(e) => {
                            if (typeof window !== 'undefined') {
                              localStorage.removeItem('host_create_draft');
                            }
                            handleCapacitorLinkClick(e, '/host/create', router);
                          }}
                          className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3.5 min-h-[48px] sm:min-h-[52px] text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg sm:rounded-xl transition-all cursor-pointer touch-manipulation font-bold shadow-lg hover:shadow-xl group"
                        >
                          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
                          </div>
                          <span className="text-sm sm:text-lg">Mettre mon espace en ligne</span>
                        </Link>
                      </>
                    )}
                    
                    <div className="border-t border-slate-200 my-3 sm:my-4" />
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        authAPI.logout();
                        if (typeof window !== 'undefined') localStorage.removeItem('userMode');
                        if (isCapacitor()) { capacitorNavigate('/search-parkings'); } else { router.push('/'); }
                      }}
                      data-testid="logout-button"
                      className="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3.5 min-h-[48px] sm:min-h-[52px] text-red-600 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all cursor-pointer touch-manipulation text-left group border border-transparent hover:border-red-200"
                    >
                      <div className="w-9 h-9 sm:w-11 sm:h-11 bg-red-50 group-hover:bg-red-100 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                        <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" strokeWidth={2.5} />
                      </div>
                      <span className="font-semibold text-sm sm:text-lg">Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <FooterNavigation />
      
      {/* Bouton flottant de basculement mode client/hôte - Mobile uniquement */}
      <div className="lg:hidden fixed bottom-20 left-0 right-0 z-[9998] px-3 pointer-events-none flex justify-center" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
        <button
          onClick={toggleUserMode}
          className="w-2/3 max-w-sm bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl p-3 shadow-2xl transition-all touch-manipulation active:scale-95 pointer-events-auto"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white/30">
              {userMode === 'client' ? (
                <Users className="w-4 h-4 text-white" strokeWidth={2.5} />
              ) : (
                <UserCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold text-white leading-tight">
                {userMode === 'client' ? 'Mode Client' : 'Mode Hôte'}
              </p>
              <p className="text-[10px] text-white/90 font-medium leading-tight">
                Basculer vers {userMode === 'client' ? 'Mode Hôte' : 'Mode Client'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
          </div>
        </button>
      </div>
      
      {/* Footer Mobile */}
      <div className="md:hidden">
        <MobileFooter />
      </div>

      {/* Modal de configuration 2FA */}
      {show2FASetupModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setShow2FASetupModal(false);
              setTwoFactorError(null);
              setTwoFactorVerificationCode('');
            }}
          />
          <div className="fixed inset-0 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
            <div 
              className="bg-white rounded-t-2xl md:rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">Configurer l'authentification à deux facteurs</h3>
                <button
                  id="btn-close-2fa-setup-modal-settings"
                  onClick={() => {
                    setShow2FASetupModal(false);
                    setTwoFactorError(null);
                    setTwoFactorVerificationCode('');
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation rounded-lg -mr-2"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  1. Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)
                </p>

                {/* QR Code */}
                {twoFactorOtpAuthUrl && (
                  <div className="flex justify-center p-4 bg-white border-2 border-slate-200 rounded-lg">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFactorOtpAuthUrl)}`}
                      alt="QR Code 2FA"
                      className="w-48 h-48"
                    />
                  </div>
                )}

                <p className="text-sm text-slate-600">
                  2. Entrez le code à 6 chiffres généré par votre application pour activer le 2FA
                </p>

                {twoFactorError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {twoFactorError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Code de vérification</label>
                  <input
                    id="input-2fa-verification-code-settings"
                    type="text"
                    value={twoFactorVerificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setTwoFactorVerificationCode(value);
                      setTwoFactorError(null);
                    }}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-3 text-lg text-center tracking-widest border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors font-mono"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    id="btn-cancel-2fa-setup-settings"
                    onClick={() => {
                      setShow2FASetupModal(false);
                      setTwoFactorError(null);
                      setTwoFactorVerificationCode('');
                    }}
                    className="flex-1 px-4 py-2 min-h-[44px] border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors touch-manipulation"
                  >
                    Annuler
                  </button>
                  <button
                    id="btn-activate-2fa-settings"
                    onClick={handleVerify2FASetup}
                    disabled={isLoading2FA || twoFactorVerificationCode.length !== 6}
                    className="flex-1 px-4 py-2 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {isLoading2FA ? 'Vérification...' : 'Activer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal des codes de secours 2FA */}
      {show2FABackupCodesModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShow2FABackupCodesModal(false)}
          />
          <div className="fixed inset-0 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
            <div
              className="bg-white rounded-t-2xl md:rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">Codes de secours</h3>
                <button
                  id="btn-close-2fa-backup-codes-modal-settings"
                  onClick={() => setShow2FABackupCodesModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation rounded-lg -mr-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-semibold mb-2">⚠️ Important</p>
                  <p className="text-sm text-amber-700">
                    Notez ces codes de secours dans un endroit sûr. Vous pourrez les utiliser pour accéder à votre compte si vous perdez l'accès à votre application d'authentification.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {twoFactorBackupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-center"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <button
                  id="btn-copy-2fa-backup-codes-settings"
                  onClick={() => {
                    twoFactorBackupCodes.forEach(code => {
                      navigator.clipboard.writeText(code);
                    });
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 2000);
                  }}
                  className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copier tous les codes
                </button>

                <button
                  id="btn-confirm-2fa-backup-codes-settings"
                  onClick={() => setShow2FABackupCodesModal(false)}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  J'ai noté les codes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de désactivation 2FA */}
      {show2FADisableModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setShow2FADisableModal(false);
              setTwoFactorError(null);
              setTwoFactorDisablePassword('');
              setTwoFactorDisableCode('');
            }}
          />
          <div className="fixed inset-0 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
            <div
              className="bg-white rounded-t-2xl md:rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">Désactiver l'authentification à deux facteurs</h3>
                <button
                  id="btn-close-2fa-disable-modal-settings"
                  onClick={() => {
                    setShow2FADisableModal(false);
                    setTwoFactorError(null);
                    setTwoFactorDisablePassword('');
                    setTwoFactorDisableCode('');
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation rounded-lg -mr-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Pour désactiver le 2FA, veuillez entrer votre mot de passe et un code de vérification.
                </p>

                {twoFactorError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {twoFactorError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Mot de passe</label>
                  <input
                    id="input-2fa-disable-password-settings"
                    type="password"
                    value={twoFactorDisablePassword}
                    onChange={(e) => {
                      setTwoFactorDisablePassword(e.target.value);
                      setTwoFactorError(null);
                    }}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Code de vérification</label>
                  <input
                    id="input-2fa-disable-code-settings"
                    type="text"
                    value={twoFactorDisableCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setTwoFactorDisableCode(value);
                      setTwoFactorError(null);
                    }}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-3 text-lg text-center tracking-widest border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">Code à 6 chiffres de votre application ou code de secours</p>
                </div>

                <div className="flex gap-3">
                  <button
                    id="btn-cancel-disable-2fa-settings"
                    onClick={() => {
                      setShow2FADisableModal(false);
                      setTwoFactorError(null);
                      setTwoFactorDisablePassword('');
                      setTwoFactorDisableCode('');
                    }}
                    className="flex-1 px-4 py-2 min-h-[44px] border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors touch-manipulation"
                  >
                    Annuler
                  </button>
                  <button
                    id="btn-confirm-disable-2fa-settings"
                    onClick={handleDisable2FA}
                    disabled={isLoading2FA || !twoFactorDisablePassword || !twoFactorDisableCode}
                    className="flex-1 px-4 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {isLoading2FA ? 'Désactivation...' : 'Désactiver'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </ProtectedRoute>
  );
}
