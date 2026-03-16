'use client';

import { useState } from 'react';
import { 
  CreditCard, 
  Building2, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  X
} from 'lucide-react';

interface BankingInfo {
  iban: string;
  bic: string;
  bankName: string;
  accountHolder: string;
  isVerified: boolean;
}

const emptyBankingInfo: BankingInfo = {
  iban: '',
  bic: '',
  bankName: '',
  accountHolder: '',
  isVerified: false
};

export default function BankingInfo() {
  const [bankingInfo, setBankingInfo] = useState<BankingInfo>(emptyBankingInfo);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<BankingInfo>(bankingInfo);

  const handleSave = () => {
    setBankingInfo(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(bankingInfo);
    setIsEditing(false);
  };

  const maskIban = (iban: string) => {
    return iban.replace(/(.{4})/g, '$1 ').replace(/(.{4})/g, (match, offset) => {
      if (offset < 4) return match;
      return match.replace(/[0-9]/g, '*');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Informations bancaires</h2>
          <p className="text-gray-600 mt-2">
            Configurez vos informations bancaires pour recevoir vos paiements.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <Edit className="w-5 h-5" />
            <span>Modifier</span>
          </button>
        )}
      </div>

      {/* Verification Status */}
      <div className={`p-4 rounded-lg border ${
        bankingInfo.isVerified 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center space-x-3">
          {bankingInfo.isVerified ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          )}
          <div>
            <h3 className={`font-semibold ${
              bankingInfo.isVerified ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {bankingInfo.isVerified ? 'Informations vérifiées' : 'En attente de vérification'}
            </h3>
            <p className={`text-sm ${
              bankingInfo.isVerified ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {bankingInfo.isVerified 
                ? 'Vos informations bancaires ont été vérifiées et sont prêtes à recevoir des paiements.'
                : 'Vos informations sont en cours de vérification. Cela peut prendre 1-2 jours ouvrés.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Banking Information Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {isEditing ? (
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du titulaire du compte
                </label>
                <input
                  type="text"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({...formData, accountHolder: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Nom complet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la banque
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Nom de la banque"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IBAN
              </label>
              <input
                type="text"
                value={formData.iban}
                onChange={(e) => setFormData({...formData, iban: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="FR76 1234 5678 9012 3456 7890 123"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: 2 lettres + 2 chiffres + 20 caractères
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                BIC / SWIFT
              </label>
              <input
                type="text"
                value={formData.bic}
                onChange={(e) => setFormData({...formData, bic: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="BNPAFRPPXXX"
              />
              <p className="text-xs text-gray-500 mt-1">
                Code d&apos;identification de la banque (8-11 caractères)
              </p>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
                <span>Annuler</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Save className="w-5 h-5" />
                <span>Enregistrer</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Titulaire du compte
                </label>
                <p className="text-lg font-semibold text-gray-900">{bankingInfo.accountHolder}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Banque
                </label>
                <p className="text-lg font-semibold text-gray-900">{bankingInfo.bankName}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                IBAN
              </label>
              <div className="flex items-center space-x-3">
                <p className="text-lg font-mono text-gray-900">{bankingInfo.iban}</p>
                <Shield className="w-5 h-5 text-green-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                BIC / SWIFT
              </label>
              <p className="text-lg font-mono text-gray-900">{bankingInfo.bic}</p>
            </div>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-1">Sécurité de vos données</h4>
            <p className="text-sm text-blue-700">
              Vos informations bancaires sont chiffrées et stockées de manière sécurisée. 
              Elles ne sont utilisées que pour les virements de paiement et ne sont jamais partagées avec des tiers.
            </p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Historique des paiements</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {[
            { id: 1, amount: '€450', date: '15 Jan 2024', status: 'completed', description: 'Restaurant Le Gourmet' },
            { id: 2, amount: '€800', date: '12 Jan 2024', status: 'completed', description: 'Hôtel Le Grand' },
            { id: 3, amount: '€300', date: '10 Jan 2024', status: 'pending', description: 'Café Central' }
          ].map((payment) => (
            <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{payment.description}</p>
                <p className="text-sm text-gray-500">{payment.date}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold text-gray-900">{payment.amount}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  payment.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {payment.status === 'completed' ? 'Reçu' : 'En attente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
