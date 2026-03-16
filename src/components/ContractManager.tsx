'use client';

import { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Download, 
  Send, 
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Contract {
  id: string;
  title: string;
  client: string;
  influencer: string;
  status: 'draft' | 'sent' | 'signed' | 'expired';
  createdAt: string;
  signedAt?: string;
  expiresAt: string;
  value: number;
  description: string;
  clauses: string[];
}

const mockContracts: Contract[] = [
  {
    id: '1',
    title: 'Contrat de collaboration - Restaurant Le Gourmet',
    client: 'Restaurant Le Gourmet',
    influencer: 'Sophie Martinez',
    status: 'signed',
    createdAt: '2024-01-10',
    signedAt: '2024-01-12',
    expiresAt: '2024-02-10',
    value: 800,
    description: 'Session photo pour le nouveau menu du restaurant',
    clauses: [
      'Prestation de 2 heures maximum',
      'Photos haute qualité requises',
      'Publication sur Instagram obligatoire',
      'Mention du restaurant dans le post'
    ]
  },
  {
    id: '2',
    title: 'Contrat vidéo promotionnelle - Hôtel Le Grand',
    client: 'Hôtel Le Grand',
    influencer: 'Marc Dubois',
    status: 'sent',
    createdAt: '2024-01-15',
    expiresAt: '2024-01-25',
    value: 1500,
    description: 'Création d\'une vidéo de présentation de l\'hôtel',
    clauses: [
      'Vidéo de 60 secondes minimum',
      'Qualité 4K requise',
      'Publication sur TikTok et Instagram',
      'Hashtags spécifiques à utiliser'
    ]
  }
];

export default function ContractManager() {
  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [showNewContract, setShowNewContract] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'sent':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'sent':
        return 'Envoyé';
      case 'signed':
        return 'Signé';
      case 'expired':
        return 'Expiré';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des contrats</h2>
          <p className="text-gray-600 mt-2">
            Créez, modifiez et gérez vos contrats de collaboration avec les influenceurs.
          </p>
        </div>
        <button
          onClick={() => setShowNewContract(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau contrat</span>
        </button>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Mes contrats</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {contracts.map((contract) => (
            <div key={contract.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{contract.title}</h4>
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                      {getStatusIcon(contract.status)}
                      <span>{getStatusText(contract.status)}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Client</p>
                      <p className="font-medium text-gray-900">{contract.client}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Influenceur</p>
                      <p className="font-medium text-gray-900">{contract.influencer}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valeur</p>
                      <p className="font-medium text-gray-900">€{contract.value}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">{contract.description}</p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Créé le {new Date(contract.createdAt).toLocaleDateString('fr-FR')}</span>
                    {contract.signedAt && (
                      <span>Signé le {new Date(contract.signedAt).toLocaleDateString('fr-FR')}</span>
                    )}
                    <span>Expire le {new Date(contract.expiresAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setEditingContract(contract)}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  {contract.status === 'draft' && (
                    <button
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Envoyer"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Contract Modal */}
      {showNewContract && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowNewContract(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Nouveau contrat</h3>
              <button
                onClick={() => setShowNewContract(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre du contrat
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Contrat de collaboration - Restaurant Le Gourmet"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Nom du client"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Influenceur
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Nom de l'influenceur"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Description de la prestation"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valeur (€)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d&apos;expiration
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clauses particulières
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Clause 1"
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Clause 2"
                  />
                  <button
                    type="button"
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                  >
                    + Ajouter une clause
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewContract(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Créer le contrat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
