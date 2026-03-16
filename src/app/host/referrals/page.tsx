'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import {
  Gift,
  Users,
  Euro,
  Share2,
  Copy,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Plus,
  Search,
  Building,
  User,
  Loader2,
  X,
  Ticket,
  Crown
} from 'lucide-react';
import { referralsAPI, rentoallUsersAPI, UserDTO, AffiliationStatsDTO, AffiliationCodeDTO, DiscountBonusDTO } from '@/services/api';
import { getDisplayFirstName } from '@/lib/utils';
import CopyToast from '@/components/ui/copy-toast';

// Types are now imported from API

export default function HostReferralsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'referrals' | 'affiliations' | 'bonuses' | 'comment'>('referrals');
  const [referrals, setReferrals] = useState<UserDTO[]>([]);
  const [affiliates, setAffiliates] = useState<UserDTO[]>([]);
  const [affiliationCodes, setAffiliationCodes] = useState<AffiliationCodeDTO[]>([]);
  const [discountBonuses, setDiscountBonuses] = useState<DiscountBonusDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Le filtre par statut n'est plus nécessaire car l'API retourne UserDTO[]
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  /** Montant total gagné en bons de parrainage (cumul historique) - GET /api/users/{id} */
  const [totalEarnedReferralAmount, setTotalEarnedReferralAmount] = useState<number>(0);
  /** Montant des bons actuellement utilisables (non utilisés, non expirés) - GET /api/users/{id} */
  const [pendingReferralAmount, setPendingReferralAmount] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [affiliationStats, setAffiliationStats] = useState<AffiliationStatsDTO | null>(null);
  const [showNewCodeModal, setShowNewCodeModal] = useState(false);
  const [newCodeDescription, setNewCodeDescription] = useState('');
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [newCodeError, setNewCodeError] = useState<string | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);


  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.error('User ID not found');
          setIsLoading(false);
          return;
        }

        const userIdNum = parseInt(userId, 10);

        // Méthode recommandée : récupérer le profil utilisateur (GET /api/users/{userId}) pour referralCode et affiliationCodes
        // + en parallèle les listes et statistiques
        const [profile, referralsData, affiliatesData, stats, bonusesData] = await Promise.all([
          rentoallUsersAPI.getProfile(userIdNum),
          referralsAPI.getMyReferrals(userIdNum),
          referralsAPI.getMyAffiliates(userIdNum),
          referralsAPI.getAffiliationStats(userIdNum),
          referralsAPI.getDiscountBonuses(userIdNum)
        ]);

        setReferrals(referralsData);
        setAffiliates(affiliatesData);
        setAffiliationStats(stats);
        setDiscountBonuses(Array.isArray(bonusesData) ? bonusesData : []);

        // Codes : priorité au profil (UserDTO.referralCode et UserDTO.affiliationCodes), sinon fallback sur stats
        const code = (profile.referralCode ?? stats.referralCode) || '';
        const rawCodes = Array.isArray(profile.affiliationCodes) ? profile.affiliationCodes : (stats.affiliationCodes || []);
        const codesList: AffiliationCodeDTO[] = rawCodes.map((c: { id: number; code: string; description: string; userId?: number }) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          userId: c.userId ?? userIdNum
        }));

        setReferralCode(code);
        setAffiliationCodes(codesList);
        setTotalEarnedReferralAmount(Number(profile.totalEarnedReferralAmount) || 0);
        setPendingReferralAmount(Number(profile.pendingReferralAmount) || 0);
        setReferralLink(`${typeof window !== 'undefined' ? window.location.origin : 'https://rentoall.fr'}/auth/signup?ref=${code}`);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setReferralCode('');
        setTotalEarnedReferralAmount(0);
        setPendingReferralAmount(0);
        setReferralLink('');
        setReferrals([]);
        setAffiliates([]);
        setAffiliationCodes([]);
        setDiscountBonuses([]);
        setAffiliationStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  // Fonction pour copier le code de parrainage
  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Fonction pour copier le lien de parrainage
  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Fonction pour générer un nouveau code d'affiliation
  const generateAffiliationCode = () => {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `AFF${randomPart}`;
  };

  // Fonction pour créer un nouveau code d'affiliation (ouverte par la modale)
  const createNewAffiliationCode = async (description: string) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const code = generateAffiliationCode();
    if (!description || !description.trim()) return;

    try {
      setIsCreatingCode(true);
      setNewCodeError(null);
      const userIdNum = parseInt(userId, 10);
      const newCode = await referralsAPI.createAffiliationCode(userIdNum, code, description.trim());
      setAffiliationCodes(prev => [...prev, newCode]);
      const stats = await referralsAPI.getAffiliationStats(userIdNum);
      setAffiliationStats(stats);
      setShowNewCodeModal(false);
      setNewCodeDescription('');
    } catch (error) {
      console.error('Erreur lors de la création du code d\'affiliation:', error);
      setNewCodeError('Erreur lors de la création. Veuillez réessayer.');
    } finally {
      setIsCreatingCode(false);
    }
  };

  const openNewCodeModal = () => {
    setNewCodeDescription('');
    setNewCodeError(null);
    setShowNewCodeModal(true);
  };

  // Fonction pour supprimer un code d'affiliation
  const deleteAffiliationCode = async (codeId: number) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code d\'affiliation ?')) return;

    try {
      const userIdNum = parseInt(userId, 10);
      await referralsAPI.deleteAffiliationCode(userIdNum, codeId);
      setAffiliationCodes(prev => prev.filter(code => code.id !== codeId));
      
      // Recharger les statistiques pour mettre à jour le nombre de codes
      const stats = await referralsAPI.getAffiliationStats(userIdNum);
      setAffiliationStats(stats);
    } catch (error) {
      console.error('Erreur lors de la suppression du code d\'affiliation:', error);
      alert('Erreur lors de la suppression du code d\'affiliation. Veuillez réessayer.');
    }
  };

  // Filtrer les filleuls selon la recherche
  const filteredReferrals = referrals.filter(user => {
    // Filtrer par recherche (par nom, prénom, email)
    const matchesSearch = !searchQuery || 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id?.toString().includes(searchQuery);
    
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'ACTIVE': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Terminé';
      case 'ACTIVE': return 'Actif';
      case 'PENDING': return 'En attente';
      case 'CANCELLED': return 'Annulé';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getBonusReasonLabel = (reason: string | undefined) => {
    if (!reason) return 'Bonus parrainage';
    const labels: Record<string, string> = {
      PARRAINAGE_PREMIERE_RESA: 'Première réservation d\'un filleul',
      ACHAT_VOLUME_200: 'Palier 200 € d\'achats (filleul/affilié)',
      AFFILIATION: 'Affiliation',
    };
    return labels[reason] || reason.replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HeaderNavigation />
        <main className="pt-4 sm:pt-6 md:pt-24 pb-20 md:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 4.5rem), 4.5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Chargement des données de parrainage...</p>
            </div>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNavigation />

      <main className="pt-20 sm:pt-24 pb-20 md:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 4.5rem), 4.5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                Parrainages & Affiliations
              </h1>
              <p className="text-sm text-slate-600">
                Gérez vos programmes de parrainage et d&apos;affiliation
              </p>
            </div>

            {/* Statistiques - grille centrée, cartes compactes et élégantes */}
            <div className="max-w-4xl mx-auto mt-5 sm:mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-slate-200/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                      <Euro className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Gains totaux</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {formatCurrency((affiliationStats?.referralEarnings ?? 0) + (affiliationStats?.commissionEarnings ?? 0))}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-slate-200/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-sky-50 flex items-center justify-center">
                      <Gift className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Bons utilisables</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {formatCurrency(pendingReferralAmount)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Total gagné (bons) : {formatCurrency(totalEarnedReferralAmount)}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-slate-200/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                      <Gift className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Parrainage</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {formatCurrency(affiliationStats?.referralEarnings || 0)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {affiliationStats?.totalReferrals ?? 0} filleul{(affiliationStats?.totalReferrals ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-slate-200/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Commissions</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {formatCurrency(affiliationStats?.commissionEarnings || 0)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {affiliationStats?.totalAffiliates ?? 0} affilié{(affiliationStats?.totalAffiliates ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-slate-200/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-sky-50 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Filleuls</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {affiliationStats?.totalReferrals ?? 0}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-slate-200/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center">
                      <Building className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Affiliés</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {affiliationStats?.totalAffiliates ?? 0}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-slate-200/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                      <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Codes</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {affiliationStats?.affiliationCodes?.length ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section Code de parrainage - plus compacte sur mobile */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-3 sm:p-4 md:p-6 mb-3 sm:mb-5">
            <div className="flex flex-col sm:flex-row items-start gap-3 mb-3 sm:mb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">Votre code de parrainage</h2>
                  <p className="text-[11px] sm:text-sm text-slate-600 hidden sm:block">Partagez votre code pour gagner des commissions</p>
                </div>
              </div>
              {/* Solde crédit / Bons utilisables */}
              <div className="bg-white rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border border-emerald-200 w-full sm:w-auto shrink-0">
                <div className="flex items-center gap-1.5">
                  <Euro className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Bons utilisables</p>
                    <p className="text-sm sm:text-base font-bold text-emerald-700 leading-tight">{formatCurrency(pendingReferralAmount)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
              {/* Code de parrainage */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Code</label>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex-1 min-w-0 bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2">
                    <code className="text-xs sm:text-base font-bold text-slate-900 font-mono truncate block">{referralCode || '…'}</code>
                  </div>
                  <button
                    onClick={copyReferralCode}
                    className={`shrink-0 p-2 sm:px-3 sm:py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                      copiedCode
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {copiedCode ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Lien de parrainage */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Lien</label>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex-1 min-w-0 bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 overflow-hidden">
                    <p className="text-[11px] sm:text-sm font-medium text-slate-900 truncate">{referralLink || '…'}</p>
                  </div>
                  <button
                    onClick={copyReferralLink}
                    className={`shrink-0 p-2 sm:px-3 sm:py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs">Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  const message = `Rejoignez Rentoall avec mon code de parrainage ${referralCode} ! ${referralLink}`;
                  window.open(`mailto:?subject=Rejoignez Rentoall&body=${encodeURIComponent(message)}`);
                }}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1.5 text-[11px] sm:text-xs font-medium"
              >
                <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                Email
              </button>
              <button
                onClick={() => {
                  const message = `Rejoignez Rentoall avec mon code de parrainage ${referralCode} ! ${referralLink}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                }}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1.5 text-[11px] sm:text-xs font-medium"
              >
                <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                WhatsApp
              </button>
            </div>
          </div>

          {/* Tabs - plus compacts sur mobile */}
          <div className="mb-3 sm:mb-5">
            <div className="border-b border-slate-200 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto">
              <nav className="flex space-x-4 sm:space-x-6 min-w-max sm:min-w-0">
                <button
                  onClick={() => setActiveTab('referrals')}
                  className={`py-2.5 sm:py-3 px-1 border-b-2 font-medium text-[11px] sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === 'referrals'
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Parrainages ({referrals.length})
                </button>
                <button
                  onClick={() => setActiveTab('affiliations')}
                  className={`py-2.5 sm:py-3 px-1 border-b-2 font-medium text-[11px] sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === 'affiliations'
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Affiliés ({affiliationStats?.totalAffiliates ?? affiliates.length ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab('bonuses')}
                  className={`py-2.5 sm:py-3 px-1 border-b-2 font-medium text-[11px] sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === 'bonuses'
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Bons cadeaux ({discountBonuses.length})
                </button>
                <button
                  onClick={() => setActiveTab('comment')}
                  className={`py-2.5 sm:py-3 px-1 border-b-2 font-medium text-[11px] sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === 'comment'
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Comment ça marche
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'referrals' && (
            <div className="space-y-3 sm:space-y-5">
              {/* Header - compact sur mobile */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 sm:mb-3">
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">Mes filleuls</h2>
                  <p className="text-[11px] sm:text-sm text-slate-600 mt-0.5">
                    Liste des personnes que vous avez parrainées
                  </p>
                </div>
                {/* Statistiques rapides - plus compact sur mobile */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-right">
                    <p className="text-base sm:text-xl font-bold text-emerald-600">
                      {affiliationStats?.totalReferrals || referrals.length}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-600">Filleuls</p>
                  </div>
                  {affiliationStats && (
                    <div className="text-right border-l border-slate-200 pl-2 sm:pl-3">
                      <p className="text-sm sm:text-base font-semibold text-emerald-600">
                        {formatCurrency(affiliationStats.referralEarnings)}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-slate-600">Gains</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Filtres et recherche - compact */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between mb-2 sm:mb-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un filleul..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Liste des filleuls */}
              {filteredReferrals.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 text-center">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-2 sm:mb-3" />
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1 sm:mb-1.5">Aucun filleul</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">
                    {searchQuery
                      ? 'Aucun filleul ne correspond à vos critères de recherche.'
                      : 'Partagez votre code ou le lien ci-dessus pour inviter vos amis et gagner des récompenses !'}
                  </p>
                  {!searchQuery && (
                    <>
                      <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-4">
                        <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm font-medium">Partagez votre code ou le lien ci-dessus</span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 sm:p-5 text-left max-w-md mx-auto">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-2 sm:mb-3">Ce que vous pouvez gagner</h4>
                        <ul className="space-y-1.5 text-[11px] sm:text-xs text-slate-700">
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span><strong>Bonus fidélité :</strong> à chaque palier de <strong>200 €</strong> d&apos;achats cumulés de votre filleul, vous recevez un <strong>bon de réduction de 5 €</strong>, et votre filleul aussi.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>Les bons sont valables 1 an et utilisables sur les réservations.</span>
                          </li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="w-full min-w-[320px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Filleul
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider hidden sm:table-cell">
                            Date
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider hidden md:table-cell">
                            Montant dépensé par le filleul
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredReferrals.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2 sm:gap-2.5">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                                    {getDisplayFirstName(user, 'Utilisateur')}
                                  </p>
                                  <p className="text-[9px] sm:text-[10px] text-slate-500">
                                    ID: {user.id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap max-w-[120px] sm:max-w-none">
                              <div className="text-[11px] sm:text-sm text-slate-900 truncate" title={user.email || undefined}>
                                {user.email || 'N/A'}
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                              {user.createdAt ? (
                                <div className="text-xs sm:text-sm text-slate-900">
                                  {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Date inconnue</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden md:table-cell">
                              <span className="text-xs sm:text-sm font-medium text-slate-900">
                                {formatCurrency(user.cumulativePurchaseVolume ?? 0)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'affiliations' && (
            <div className="space-y-4 sm:space-y-5">
              {/* Header with Create Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">Mes codes d&apos;affiliation</h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Créez jusqu&apos;à 20 codes personnalisés pour attirer de nouveaux utilisateurs
                  </p>
                </div>
                <button
                  onClick={openNewCodeModal}
                  disabled={affiliationCodes.length >= 20}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs sm:text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nouveau code
                </button>
              </div>

              {/* Statistiques */}
              {affiliationStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-600">Affiliés</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                      {affiliationStats.totalAffiliates || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Euro className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-medium text-slate-600">Gains affiliation</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(affiliationStats.commissionEarnings || 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-medium text-slate-600">Codes créés</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                      {affiliationCodes.length} / 20
                    </p>
                  </div>
                </div>
              )}

              {/* Liste des affiliés */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3">Mes affiliés</h3>
                {affiliates.length === 0 ? (
                  <p className="text-sm text-slate-600 text-center py-6">Aucun affilié pour le moment</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Affilié
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Date d&apos;inscription
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Volume d&apos;achats
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {affiliates.map((affiliate) => (
                          <tr key={affiliate.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {getDisplayFirstName(affiliate, 'Utilisateur')}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-xs sm:text-sm text-slate-900">
                                {affiliate.email || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {affiliate.createdAt ? (
                                <div className="text-xs sm:text-sm text-slate-900">
                                  {new Date(affiliate.createdAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Date inconnue</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-xs sm:text-sm font-medium text-slate-900">
                                {formatCurrency(affiliate.cumulativePurchaseVolume ?? 0)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Codes d'affiliation List */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3">Mes codes d&apos;affiliation</h3>
                {affiliationCodes.length === 0 ? (
                  <div className="text-center py-6">
                    <Building className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600 mb-3">Aucun code d&apos;affiliation créé</p>
                    <button
                      onClick={openNewCodeModal}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs sm:text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Créer le premier code
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {affiliationCodes.map((code) => (
                      <div key={code.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <code className="px-2.5 py-1 bg-white border border-emerald-200 rounded text-xs sm:text-sm font-mono font-bold text-emerald-700">
                                {code.code}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(code.code);
                                  setShowCopiedToast(true);
                                }}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 mb-1.5">{code.description}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500">
                              Lien: {typeof window !== 'undefined' ? window.location.origin : 'https://rentoall.fr'}/auth/signup?ref={code.code}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteAffiliationCode(code.id)}
                            className="text-red-600 hover:text-red-700 p-1.5"
                            title="Supprimer ce code"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bonuses' && (
            <div className="space-y-4 sm:space-y-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Mes bons cadeaux</h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Bons de réduction gagnés via le parrainage et l&apos;affiliation. Utilisez-les lors d&apos;une réservation.
                </p>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-slate-400" />
                  Le bon ne peut pas dépasser 10 % du montant de la réservation.
                </p>
              </div>

              {discountBonuses.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">Aucun bon cadeau</h3>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto">
                    Partagez votre code de parrainage ou d&apos;affiliation : à chaque palier de 200 € d&apos;achats de vos filleuls ou affiliés, vous et eux recevez un bon de 5 €.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4">
                  {discountBonuses.map((bonus) => {
                    const isUsed = bonus.used === true || !!(bonus.usedAt);
                    const expiresAt = bonus.expiresAt ? new Date(bonus.expiresAt) : null;
                    const isExpired = expiresAt ? expiresAt < new Date() : false;
                    const amount = bonus.amount ?? 5;
                    const displayCode = bonus.uniqueCode ?? (bonus as { code?: string }).code;
                    const reasonLabel = getBonusReasonLabel(bonus.reason);
                    return (
                      <div
                        key={bonus.id ?? Math.random()}
                        className={`rounded-xl border p-4 sm:p-5 ${
                          isUsed || isExpired
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-white border-emerald-200 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isUsed || isExpired ? 'bg-slate-200' : 'bg-emerald-100'
                            }`}>
                              <Ticket className={`w-5 h-5 ${isUsed || isExpired ? 'text-slate-400' : 'text-emerald-600'}`} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{amount.toFixed(2)} €</p>
                              <p className="text-xs text-slate-600 mt-0.5">{reasonLabel}</p>
                              {displayCode && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="text-xs text-slate-500">Code :</span>
                                  <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{displayCode}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (displayCode) {
                                        navigator.clipboard.writeText(displayCode);
                                        setShowCopiedToast(true);
                                      }
                                    }}
                                    className="text-emerald-600 hover:text-emerald-700 p-0.5"
                                    title="Copier le code"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              {bonus.createdAt && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Créé le {new Date(bonus.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {isUsed ? (
                              <>
                                <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                                  Utilisé
                                </span>
                                {bonus.usedAt && (
                                  <p className="text-[10px] text-slate-500 mt-2">
                                    Le {new Date(bonus.usedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    {bonus.usedInReservationId != null && (
                                      <span> · Résa #{bonus.usedInReservationId}</span>
                                    )}
                                  </p>
                                )}
                              </>
                            ) : isExpired ? (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                                Expiré
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                À utiliser
                              </span>
                            )}
                            {!isUsed && expiresAt && (
                              <p className="text-xs text-slate-500 mt-2">
                                Expire le {expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'comment' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 md:p-6 shadow-sm">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Comment ça marche</h2>

                {/* Deux systèmes : Parrainage vs Affiliation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-slate-900">Parrainage</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mb-3">
                      Vous partagez votre <strong>code unique</strong> (généré à l&apos;inscription) avec vos amis. Ils l&apos;entrent à l&apos;inscription et sont liés à vous comme filleuls.
                    </p>
                    <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                      <p><strong>Récompenses :</strong></p>
                      <ul className="list-disc list-inside space-y-1 pl-1">
                        <li><strong>Bonus fidélité :</strong> pour chaque tranche de <strong>200 €</strong> d&apos;achats cumulés de votre filleul, vous recevez un <strong>bon de réduction de 5 €</strong>, et votre filleul aussi.</li>
                        <li>Pas de crédit à l&apos;inscription (0 €) pour éviter les abus.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <h3 className="font-bold text-slate-900">Affiliation</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mb-3">
                      Vous créez jusqu&apos;à <strong>20 codes personnalisés</strong> (ex. PROMO2026) et les diffusez. Les personnes qui s&apos;inscrivent avec l&apos;un de ces codes deviennent vos affiliés.
                    </p>
                    <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                      <p><strong>Récompenses (double gain) :</strong></p>
                      <ul className="list-disc list-inside space-y-1 pl-1">
                        <li><strong>Commission :</strong> vous gagnez <strong>1 %</strong> du montant de chaque réservation payée par vos affiliés. Le montant est crédité sur votre solde dès que le paiement Stripe est confirmé.</li>
                        <li><strong>Bonus fidélité :</strong> comme en parrainage, vous et l&apos;affilié recevez un bon de <strong>5 €</strong> à chaque palier de 200 € d&apos;achats cumulés de l&apos;affilié.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Étapes : partager → ils s'inscrivent → vous gagnez */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs sm:text-sm font-bold">1</div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">Partagez votre code</h3>
                    <p className="text-[11px] sm:text-sm text-slate-600">
                      Envoyez votre code ou lien (email, WhatsApp…) à vos proches ou à votre audience.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs sm:text-sm font-bold">2</div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">Ils s&apos;inscrivent</h3>
                    <p className="text-[11px] sm:text-sm text-slate-600">
                      Ils entrent votre code lors de l&apos;inscription. Ils sont alors liés à vous (filleul ou affilié).
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Euro className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                    </div>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-amber-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs sm:text-sm font-bold">3</div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">Vous gagnez</h3>
                    <p className="text-[11px] sm:text-sm text-slate-600">
                      <strong>Parrainage :</strong> 5 € de bon à chaque palier de 200 € d&apos;achats de votre filleul (pour vous et pour lui). <strong>Affiliation :</strong> 1 % de chaque réservation de vos affiliés + même bonus 5 € / 200 €.
                    </p>
                  </div>
                </div>

                {/* Vos récompenses en détail */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
                    <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    Récompenses en détail
                  </h3>
                  <div className="space-y-4 sm:space-y-5">
                    <div className="bg-white rounded-xl p-4 sm:p-5 border border-emerald-200">
                      <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        Parrainage
                      </h4>
                      <ul className="text-xs sm:text-sm text-slate-700 space-y-1.5 list-disc list-inside pl-1">
                        <li>À l&apos;inscription du filleul : aucun crédit (0 €), pour éviter les abus.</li>
                        <li>Dès que votre filleul a dépensé <strong>200 €</strong> en réservations (cumul) : vous recevez un <strong>bon de réduction de 5 €</strong> et votre filleul aussi.</li>
                        <li>Puis à chaque nouveau palier de 200 € (400 €, 600 €…) : nouveau bon de 5 € pour chacun.</li>
                        <li>Les bons sont valables <strong>1 an</strong> et utilisables sur une future réservation.</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-xl p-4 sm:p-5 border border-purple-200">
                      <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        Affiliation
                      </h4>
                      <ul className="text-xs sm:text-sm text-slate-700 space-y-1.5 list-disc list-inside pl-1">
                        <li><strong>Commission 1 % :</strong> sur chaque réservation payée par un de vos affiliés, vous recevez 1 % du montant. Ce montant est crédité sur votre <strong>solde</strong> dès que le paiement est confirmé (Stripe).</li>
                        <li><strong>Bonus fidélité :</strong> comme en parrainage, à chaque palier de 200 € d&apos;achats cumulés de l&apos;affilié, vous et l&apos;affilié recevez un bon de 5 € (valable 1 an).</li>
                        <li>Vous pouvez créer jusqu&apos;à <strong>20 codes</strong> d&apos;affiliation (ex. un par campagne ou partenaire).</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-xl p-4 sm:p-5 border border-amber-200">
                      <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-600" />
                        Ambassadeurs
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-700 mb-3">
                        Le rôle <strong>Ambassadeur</strong> est un niveau supérieur dans le système d&apos;affiliation : l&apos;ambassadeur recrute des affiliateurs (parrains) et touche une commission sur les réservations générées par leurs affiliés.
                      </p>
                      <ul className="text-xs sm:text-sm text-slate-700 space-y-1.5 list-disc list-inside pl-1">
                        <li><strong>Affiliateur seul :</strong> si un utilisateur a utilisé le code d&apos;un parrain <em>non</em> lié à un ambassadeur, le parrain reçoit <strong>1 %</strong> de commission sur les réservations.</li>
                        <li><strong>Affiliateur + Ambassadeur :</strong> si le parrain est sous un ambassadeur, la commission de 1 % est partagée : <strong>0,5 %</strong> pour l&apos;affiliateur (parrain direct) et <strong>0,5 %</strong> pour l&apos;ambassadeur.</li>
                        <li>L&apos;ambassadeur peut voir la liste de ses affiliateurs et les commissions d&apos;ambassadeur (0,5 %) apparaissent dans l&apos;historique des gains.</li>
                        <li>Devenir ambassadeur : le rôle est attribué par la plateforme et permet de recruter d&apos;autres parrains et de toucher une commission sur leurs performances.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Exemples concrets */}
                <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
                    <Euro className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    Exemples concrets
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Parrainage</p>
                      <p className="text-sm text-slate-700 mb-2">Votre filleul réserve pour 450 € sur l&apos;année.</p>
                      <p className="text-sm text-slate-700">→ Il franchit 2 paliers (200 € et 400 €). Vous recevez <strong>2 bons de 5 €</strong> (10 €) et lui aussi.</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Affiliation</p>
                      <p className="text-sm text-slate-700 mb-2">Un affilié fait une réservation de 80 €.</p>
                      <p className="text-sm text-slate-700">→ Vous recevez <strong>0,80 €</strong> (1 %) sur votre solde. S&apos;il cumule 200 €, 400 €… vous recevrez en plus les bons de 5 €.</p>
                    </div>
                  </div>
                </div>

                {/* Conditions / FAQ */}
                <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6">En résumé</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 text-sm sm:text-base">Les bons de 5 €</p>
                        <p className="text-xs sm:text-sm text-slate-600">Ils ont une durée de validité d&apos;un an et peuvent être utilisés pour réduire le prix d&apos;une prochaine réservation.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 text-sm sm:text-base">Solde (affiliation)</p>
                        <p className="text-xs sm:text-sm text-slate-600">Les 1 % de commission sont crédités sur votre solde et peuvent être utilisés ou retirés selon les conditions Rentoall.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 text-sm sm:text-base">Pas de limite</p>
                        <p className="text-xs sm:text-sm text-slate-600">Vous pouvez parrainer autant de personnes que vous voulez. Plus vos filleuls ou affiliés dépensent, plus vous gagnez (paliers 200 € et commissions).</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modale : description du nouveau code d'affiliation */}
      {showNewCodeModal && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50"
          onClick={() => !isCreatingCode && setShowNewCodeModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-code-modal-title"
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden max-h-[90vh] md:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 id="new-code-modal-title" className="text-lg font-bold text-slate-900">
                    Nouveau code d&apos;affiliation
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Donnez une description pour identifier ce code (ex. campagne, partenaire…)
                  </p>
                </div>
              </div>
              <label htmlFor="new-code-description" className="block text-sm font-semibold text-slate-700 mb-2">
                Description
              </label>
              <input
                id="new-code-description"
                type="text"
                value={newCodeDescription}
                onChange={(e) => setNewCodeDescription(e.target.value)}
                placeholder="Ex. Partenariat Instagram, Newsletter mars…"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                maxLength={120}
                autoFocus
                disabled={isCreatingCode}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newCodeDescription.trim()) createNewAffiliationCode(newCodeDescription);
                  }
                  if (e.key === 'Escape') setShowNewCodeModal(false);
                }}
              />
              {newCodeError && (
                <p className="mt-2 text-sm text-red-600">{newCodeError}</p>
              )}
            </div>
            <div className="flex gap-3 px-5 sm:px-6 pb-5 sm:pb-6 bg-slate-50/80">
              <button
                type="button"
                onClick={() => !isCreatingCode && setShowNewCodeModal(false)}
                disabled={isCreatingCode}
                className="flex-1 py-2.5 px-4 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 touch-manipulation"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => createNewAffiliationCode(newCodeDescription)}
                disabled={isCreatingCode || !newCodeDescription.trim()}
                className="flex-1 py-2.5 px-4 min-h-[44px] rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
              >
                {isCreatingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création…
                  </>
                ) : (
                  'Créer le code'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <CopyToast
        visible={showCopiedToast}
        message="Code copié !"
        onDismiss={() => setShowCopiedToast(false)}
      />
      <FooterNavigation />
    </div>
  );
}