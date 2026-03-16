'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { useFavorites, FavoriteType } from '../contexts/FavoritesContext';

interface FavoriteButtonProps {
  id: string;
  type: FavoriteType;
  name: string;
  image?: string;
  avatar?: string;
  rating?: number;
  location?: string;
  category?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function FavoriteButton({
  id,
  type,
  name,
  image,
  avatar,
  rating,
  location,
  category,
  size = 'md',
  className = '',
  showLabel = false,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);
  const favorited = isFavorite(id, type);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      await toggleFavorite({
        id,
        type,
        name,
        image,
        avatar,
        rating,
        location,
        category,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const iconSize = sizeClasses[size];

  return (
    <button
      onClick={handleClick}
      disabled={isToggling}
      className={`flex items-center gap-2 transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
        favorited
          ? 'text-yellow-500'
          : 'text-gray-400 hover:text-yellow-500'
      } ${className}`}
      aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      title={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      {isToggling ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : (
        <Star
          className={`${iconSize} transition-all ${
            favorited ? 'fill-current' : ''
          }`}
        />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {favorited ? 'En favoris' : 'Ajouter aux favoris'}
        </span>
      )}
    </button>
  );
}
