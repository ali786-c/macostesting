'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { favoritesAPI, ProfessionalDTO } from '../services/api';
import { getDisplayFirstName } from '@/lib/utils';

export type FavoriteType = 'establishment' | 'influencer' | 'agent';

export interface Favorite {
  id: string;
  type: FavoriteType;
  name: string;
  image?: string;
  avatar?: string;
  rating?: number;
  location?: string;
  category?: string;
  addedAt: string;
}

interface FavoritesContextType {
  favorites: Favorite[];
  addFavorite: (favorite: Omit<Favorite, 'addedAt'>) => Promise<void>;
  removeFavorite: (id: string, type: FavoriteType) => Promise<void>;
  isFavorite: (id: string, type: FavoriteType) => boolean;
  toggleFavorite: (favorite: Omit<Favorite, 'addedAt'>) => Promise<void>;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'influconnect_favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les favoris depuis le backend au montage
  useEffect(() => {
    const loadFavorites = async () => {
      if (typeof window === 'undefined') return;

      const userId = localStorage.getItem('userId');
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Pour Rentoall, on utilise rentoallFavoritesAPI pour les places
        // Pour l'instant, on retourne un tableau vide car le système de favoris
        // pour les places n'est pas encore complètement intégré dans ce contexte
        // TODO: Intégrer rentoallFavoritesAPI.getFavorites pour charger les places favorites
        
        console.log('⚠️ [FAVORITES CONTEXT] Chargement des favoris - système Rentoall non encore intégré');
        
        // Pour l'instant, charger depuis localStorage uniquement
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setFavorites(JSON.parse(stored));
          } else {
            setFavorites([]);
          }
        } catch (e) {
          console.error('Error loading favorites from localStorage:', e);
          setFavorites([]);
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
        // Fallback sur localStorage en cas d'erreur
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setFavorites(JSON.parse(stored));
          } else {
            setFavorites([]);
          }
        } catch (e) {
          console.error('Error loading favorites from localStorage:', e);
          setFavorites([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, []);

  const addFavorite = async (favorite: Omit<Favorite, 'addedAt'>) => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    
    // Déterminer le type d'utilisateur
    const userType = typeof window !== 'undefined' 
      ? (localStorage.getItem('finalUserType') || localStorage.getItem('userType'))
      : null;
    const isClient = userType === 'entreprise' || userType === 'client' || userType === 'CLIENT' || userType === 'ENTERPRISE';
    
    // Mise à jour optimiste de l'UI
    setFavorites((prev) => {
      const exists = prev.some(
        (f) => f.id === favorite.id && f.type === favorite.type
      );
      if (exists) return prev;

      return [
        ...prev,
        {
          ...favorite,
          addedAt: new Date().toISOString(),
        },
      ];
    });

    // Synchroniser avec le backend si userId disponible
    if (userId) {
      try {
        // userId = utilisateur connecté (celui qui ajoute)
        // favorite.id = utilisateur qu'on veut mettre en favori
        // favorite.type = type du favori (pour validation côté backend)
        console.log('🔵 [FAVORITES] Ajout favori:', {
          utilisateurConnecte: userId,
          utilisateurFavori: favorite.id,
          nomFavori: favorite.name,
          typeFavori: favorite.type,
          typeUtilisateur: isClient ? 'client' : 'professionnel'
        });
        await favoritesAPI.addFavorite(userId, favorite.id, favorite.type, isClient);
        console.log('✅ [FAVORITES] Favori ajouté au backend');
      } catch (error) {
        console.error('❌ [FAVORITES] Erreur lors de l\'ajout au backend, annulation:', error);
        // Annuler la mise à jour optimiste en cas d'erreur
        setFavorites((prev) =>
          prev.filter((f) => !(f.id === favorite.id && f.type === favorite.type))
        );
        throw error;
      }
    }

    // Sauvegarder dans localStorage
    if (typeof window !== 'undefined') {
      try {
        const updated = [...favorites, { ...favorite, addedAt: new Date().toISOString() }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving favorites to localStorage:', error);
      }
    }
  };

  const removeFavorite = async (id: string, type: FavoriteType) => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    
    // Déterminer le type d'utilisateur
    const userType = typeof window !== 'undefined' 
      ? (localStorage.getItem('finalUserType') || localStorage.getItem('userType'))
      : null;
    const isClient = userType === 'entreprise' || userType === 'client' || userType === 'CLIENT' || userType === 'ENTERPRISE';
    
    // Mise à jour optimiste de l'UI
    setFavorites((prev) =>
      prev.filter((f) => !(f.id === id && f.type === type))
    );

    // Synchroniser avec le backend si userId disponible
    if (userId) {
      try {
        // userId = utilisateur connecté (celui qui retire)
        // id = utilisateur qu'on veut retirer des favoris
        // type = type du favori (pour validation côté backend)
        console.log('🔵 [FAVORITES] Retrait favori:', {
          utilisateurConnecte: userId,
          utilisateurFavori: id,
          typeFavori: type,
          typeUtilisateur: isClient ? 'client' : 'professionnel'
        });
        await favoritesAPI.removeFavorite(userId, id, type, isClient);
        console.log('✅ [FAVORITES] Favori supprimé du backend');
      } catch (error) {
        console.error('❌ [FAVORITES] Erreur lors de la suppression du backend:', error);
        // Recharger depuis le backend en cas d'erreur
        if (userId) {
          try {
            const professionals = await favoritesAPI.getFavorites(userId);
            const mappedFavorites: Favorite[] = professionals.map((pro: ProfessionalDTO) => {
              let favoriteType: FavoriteType = 'influencer';
              if (pro.type === 'CLIENT' || pro.type === 'ENTERPRISE') {
                favoriteType = 'establishment';
              } else if (pro.type === 'AGENCY') {
                favoriteType = 'agent';
              } else if (pro.type === 'PROFESSIONAL') {
                favoriteType = 'influencer';
              }

              const location =
                pro.address && typeof pro.address === 'object'
                  ? (pro.address as any).city
                  : undefined;

              return {
                id: String(pro.id || ''),
                type: favoriteType,
                name: getDisplayFirstName(pro, 'Utilisateur'),
                avatar: pro.photo?.url,
                rating: pro.reviewUser?.averageRating,
                location,
                category: typeof pro.category === 'string' ? pro.category : undefined,
                addedAt: pro.createdAt || new Date().toISOString(),
              };
            });
            setFavorites(mappedFavorites);
          } catch (reloadError) {
            console.error('Error reloading favorites:', reloadError);
          }
        }
        throw error;
      }
    }

    // Sauvegarder dans localStorage
    if (typeof window !== 'undefined') {
      try {
        const updated = favorites.filter((f) => !(f.id === id && f.type === type));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving favorites to localStorage:', error);
      }
    }
  };

  const isFavorite = (id: string, type: FavoriteType): boolean => {
    return favorites.some((f) => f.id === id && f.type === type);
  };

  const toggleFavorite = async (favorite: Omit<Favorite, 'addedAt'>) => {
    if (isFavorite(favorite.id, favorite.type)) {
      await removeFavorite(favorite.id, favorite.type);
    } else {
      await addFavorite(favorite);
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        toggleFavorite,
        isLoading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
