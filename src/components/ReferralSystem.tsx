'use client';

import { useState } from 'react';
import { 
  Users, 
  Gift, 
  Copy, 
  CheckCircle,
  Share2,
  MessageSquare,
  Mail,
  ExternalLink,
  Crown,
  TrendingUp
} from 'lucide-react';

interface Referral {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  status: 'pending' | 'active' | 'completed';
  reward: number;
}

// Composant non utilisé dans l'app (la page /host/referrals utilise l'API). Si réutilisé, brancher referralsAPI.
const initialReferrals: Referral[] = [];

export default function ReferralSystem() {
  const [referrals, setReferrals] = useState<Referral[]>(initialReferrals);
  const [copied, setCopied] = useState(false);
  const [referralCode] = useState('');

  const totalEarnings = referrals
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.reward, 0);

  const pendingEarnings = referrals
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + r.reward, 0);

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = (platform: string) => {
    const message = `Rejoignez InfluConnect avec mon code de parrainage ${referralCode} et bénéficiez d'avantages exclusifs !`;
    const url = `https://influconnect.com/signup?ref=${referralCode}`;
    
    switch (platform) {
      case 'email':
        window.open(`mailto:?subject=Rejoignez InfluConnect&body=${message} ${url}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message + ' ' + url)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`);
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complété';
      case 'active':
        return 'Actif';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Système de parrainage</h2>
        <p className="text-gray-600 mt-2">
          Invitez vos amis et collègues à rejoindre InfluConnect et gagnez des récompenses !
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Total des gains</p>
              <p className="text-2xl font-bold text-orange-700">€{totalEarnings}</p>
            </div>
            <Gift className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Filleuls actifs</p>
              <p className="text-2xl font-bold text-blue-700">{referrals.filter(r => r.status === 'active').length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">En attente</p>
              <p className="text-2xl font-bold text-green-700">€{pendingEarnings}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Referral Code Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Crown className="w-6 h-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Votre code de parrainage</h3>
        </div>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <code className="text-lg font-mono text-gray-900">{referralCode}</code>
          </div>
          <button
            onClick={copyReferralCode}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
              copied 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Copier</span>
              </>
            )}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Partagez ce code avec vos amis pour qu&apos;ils puissent s&apos;inscrire et vous faire gagner des récompenses !
        </p>

        {/* Share Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => shareReferral('email')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </button>
          <button
            onClick={() => shareReferral('whatsapp')}
            className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => shareReferral('twitter')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Twitter</span>
          </button>
        </div>
      </div>

      {/* Referral Rules */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-800 mb-3">Comment ça marche ?</h4>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Partagez votre code de parrainage avec vos amis</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Ils s&apos;inscrivent en utilisant votre code</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Vous gagnez €50 dès qu&apos;ils complètent leur profil</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Vous gagnez €50 supplémentaires à leur première prestation</span>
          </li>
        </ul>
      </div>

      {/* Referrals List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Mes filleuls</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {referrals.map((referral) => (
            <div key={referral.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{referral.name}</p>
                  <p className="text-sm text-gray-500">{referral.email}</p>
                  <p className="text-xs text-gray-400">
                    Inscrit le {new Date(referral.joinedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold text-gray-900">€{referral.reward}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                  {getStatusText(referral.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
