import React, { useState, useEffect } from 'react';
import { Search, Send, Euro, Clock, FileText, User, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { quotesAPI, QuoteDTO, usersAPI, UserDTO } from '../services/api';
import { getDisplayFirstName } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  company: string;
  avatar: string;
  lastMessage: string;
}

interface QuoteToEdit {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  client: string;
  clientAvatar?: string;
  clientId?: string;
}

interface NewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendQuote: (quote: {
    title: string;
    description: string;
    price: number;
    duration: string;
    clientId: string;
  }) => void;
  editingQuote?: QuoteToEdit | null;
}

// Plus de mockClients - les clients seront récupérés depuis l'API

export default function NewQuoteModal({ isOpen, onClose, onSendQuote, editingQuote }: NewQuoteModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    clientId: ''
  });
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Récupérer le userId depuis localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      setUserId(storedUserId);
    }
  }, []);

  // Charger tous les utilisateurs depuis l'API
  useEffect(() => {
    const loadUsers = async () => {
      if (!isOpen) return; // Ne charger que si le modal est ouvert

      setIsLoadingClients(true);
      try {
        console.log('🔵 [NEW QUOTE MODAL] Chargement des utilisateurs depuis l\'API...');
        const users = await usersAPI.getAllUsers();
        console.log('✅ [NEW QUOTE MODAL] Utilisateurs récupérés:', {
          count: users.length,
          users
        });

        // Filtrer et mapper les utilisateurs vers des clients
        // Le backend peut retourner différents types : CLIENT, ROLE_CLIENT, etc.
        const clientUsers = users.filter((user: UserDTO) => {
          const userType = user.type?.toUpperCase() || '';
          return userType.includes('CLIENT') || userType === 'CLIENT';
        });

        console.log('🔵 [NEW QUOTE MODAL] Clients filtrés:', {
          totalUsers: users.length,
          clientCount: clientUsers.length,
          clientUsers
        });

        // Mapper UserDTO vers Client
        const mappedClients: Client[] = clientUsers.map((user: UserDTO) => {
          const displayName = getDisplayFirstName(user, 'Utilisateur');
          const avatarUrl = user.photo?.url || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

          return {
            id: String(user.id || ''),
            name: displayName,
            company: user.email || 'Sans entreprise', // Utiliser email comme fallback pour company
            avatar: avatarUrl,
            lastMessage: ''
          };
        });

        console.log('✅ [NEW QUOTE MODAL] Clients mappés:', {
          count: mappedClients.length,
          mappedClients
        });

        setClients(mappedClients);
      } catch (err: unknown) {
        console.error('❌ [NEW QUOTE MODAL] Erreur lors du chargement des utilisateurs:', err);
        setError('Impossible de charger la liste des clients. Veuillez réessayer.');
        setClients([]);
      } finally {
        setIsLoadingClients(false);
      }
    };

    loadUsers();
  }, [isOpen]);

  // Pré-remplir les champs si on est en mode édition
  useEffect(() => {
    if (!isOpen) {
      // Réinitialiser quand la modal est fermée
      setFormData({
        title: '',
        description: '',
        price: '',
        duration: '',
        clientId: ''
      });
      setSelectedClient(null);
      setClientSearch('');
      setShowClientDropdown(false);
      return;
    }

    if (editingQuote) {
      setFormData({
        title: editingQuote.title || '',
        description: editingQuote.description || '',
        price: editingQuote.price?.toString() || '',
        duration: editingQuote.duration || '',
        clientId: editingQuote.clientId || ''
      });
      
      // Si un clientId est fourni, trouver le client correspondant
      if (editingQuote.clientId) {
        const client = clients.find(c => c.id === editingQuote.clientId);
        if (client) {
          setSelectedClient(client);
          setClientSearch(client.name);
        }
      } else if (editingQuote.client) {
        // Sinon, chercher par nom ou entreprise (plus flexible)
        const client = clients.find(c => {
          const searchTerm = editingQuote.client.toLowerCase();
          return (
            c.name.toLowerCase().includes(searchTerm) ||
            c.company.toLowerCase().includes(searchTerm) ||
            searchTerm.includes(c.name.toLowerCase()) ||
            searchTerm.includes(c.company.toLowerCase())
          );
        });
        if (client) {
          setSelectedClient(client);
          setClientSearch(client.name);
          setFormData(prev => ({ ...prev, clientId: client.id }));
        } else {
          // Si le client n'est pas trouvé, afficher juste le nom et créer un client temporaire
          setClientSearch(editingQuote.client);
          // Créer un client temporaire pour permettre la validation
          const tempClient: Client = {
            id: `temp-${editingQuote.id}`,
            name: editingQuote.client,
            company: editingQuote.client,
            avatar: editingQuote.clientAvatar || '',
            lastMessage: ''
          };
          setSelectedClient(tempClient);
          setFormData(prev => ({ ...prev, clientId: tempClient.id }));
        }
      }
    }
  }, [editingQuote, isOpen, clients]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setFormData(prev => ({
      ...prev,
      clientId: client.id
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation : vérifier que tous les champs obligatoires sont remplis
    if (!formData.title || !formData.price || !formData.duration) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Pour le client, vérifier soit clientId soit selectedClient
    if (!formData.clientId && !selectedClient) {
      setError('Veuillez sélectionner un client');
      return;
    }

    // Utiliser le clientId du selectedClient si formData.clientId est vide
    const finalClientId = formData.clientId || selectedClient?.id || '';
    
    if (!finalClientId) {
      setError('Veuillez sélectionner un client');
      return;
    }

    if (!userId) {
      setError('Vous devez être connecté pour créer un devis');
      return;
    }

    setIsSubmitting(true);
    try {
      // Construire le payload selon le format QuoteDTO du backend
      const quotePayload: Omit<QuoteDTO, 'id' | 'createdAt' | 'updatedAt' | 'acceptedAt'> = {
        title: formData.title,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        deliveryTime: formData.duration, // Backend utilise deliveryTime
        duration: formData.duration, // Garder pour compatibilité
        createdById: userId || undefined, // Backend utilise createdById
        creatorId: userId || undefined, // Garder pour compatibilité
        recipientId: finalClientId
      };

      console.log('🔵 [NEW QUOTE MODAL] Envoi de la requête:', quotePayload);
      const createdQuote = await quotesAPI.create(quotePayload);
      console.log('✅ [NEW QUOTE MODAL] Devis créé avec succès:', createdQuote);
      
      // Afficher la popup de succès
      setShowSuccessModal(true);
      
      // Appeler le callback parent pour mettre à jour l'UI
      onSendQuote({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        duration: formData.duration,
        clientId: finalClientId
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        price: '',
        duration: '',
        clientId: ''
      });
      setSelectedClient(null);
      setClientSearch('');
      
      // Fermer le modal après 2 secondes
      setTimeout(() => {
        setShowSuccessModal(false);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('❌ [NEW QUOTE MODAL] Erreur lors de la création:', err);
      setError(
        errorObj.response?.data?.message || 
        errorObj.message || 
        'Une erreur est survenue lors de la création du devis. Veuillez réessayer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.company.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingQuote ? "Modifier un devis" : "Nouveau devis"}
      size="lg"
      className="relative"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recherche de client */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client *
          </label>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${editingQuote ? 'text-gray-300' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder={editingQuote ? "Client déjà assigné" : "Rechercher un client..."}
              value={clientSearch}
              onChange={(e) => {
                if (!editingQuote) {
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                  if (!e.target.value) {
                    setSelectedClient(null);
                    setFormData(prev => ({ ...prev, clientId: '' }));
                  }
                }
              }}
              onFocus={() => {
                if (!editingQuote) {
                  setShowClientDropdown(true);
                }
              }}
              disabled={!!editingQuote}
              className={`w-full pl-10 pr-4 py-3 min-h-[44px] md:min-h-0 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${
                editingQuote 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                  : 'bg-white cursor-pointer'
              }`}
              required={!editingQuote}
            />
            {showClientDropdown && !editingQuote && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[100] max-h-48 overflow-y-auto">
                {isLoadingClients ? (
                  <div className="px-4 py-3 text-center text-gray-500">
                    Chargement des clients...
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="px-4 py-3 text-center text-gray-500">
                    {clientSearch ? 'Aucun client trouvé' : 'Aucun client disponible'}
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleClientSelect(client)}
                      className="w-full text-left px-4 py-3 min-h-[44px] md:min-h-0 hover:bg-orange-50 flex items-center space-x-3 cursor-pointer touch-manipulation"
                    >
                      <img
                        src={client.avatar}
                        alt={client.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.company}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Titre du devis */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titre du devis *
          </label>
          <input
            type="text"
            placeholder="Ex: Collaboration 3 stories + 1 post"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-4 py-3 min-h-[44px] md:min-h-0 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            required
          />
        </div>

        {/* Prix et durée */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix (€) *
            </label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                placeholder="2000"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className="w-full pl-10 pr-4 py-3 min-h-[44px] md:min-h-0 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Délai de livraison *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ex: 7 jours"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className="w-full pl-10 pr-4 py-3 min-h-[44px] md:min-h-0 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (optionnel)
          </label>
          <textarea
            placeholder="Ex: Délai 7 jours, visibilité en story + post, contenu premium..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 min-h-[120px] md:min-h-0 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
          />
        </div>

        {/* Client sélectionné */}
        {selectedClient && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <img
                src={selectedClient.avatar}
                alt={selectedClient.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <div className="font-medium text-gray-900">{selectedClient.name}</div>
                <div className="text-sm text-gray-600">{selectedClient.company}</div>
              </div>
            </div>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={Send}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Envoi...' : editingQuote ? "Modifier le devis" : "Envoyer le devis"}
          </Button>
        </div>
      </form>

      {/* Modal de succès - Overlay sur le modal existant */}
      {showSuccessModal && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-green-200 animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Devis créé avec succès !
              </h3>
              <p className="text-gray-600 mb-6">
                Votre devis a été envoyé au client.
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
